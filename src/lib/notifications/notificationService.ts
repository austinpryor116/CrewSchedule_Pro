/**
 * CREWSCHEDULE PRO // NATIVE PUSH & LOCAL NOTIFICATION ENGINE
 * Handles FCM tokens, Android Notification Channels, and heads-up banner alerts.
 */

import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db, auth, VAPID_PUBLIC_KEY } from "../firebase/config";
import { ChatMessage, TradeOfferEmbed } from "@/types";

export class NotificationService {
  private static isInitialized = false;
  private static hasPermission = false;

  /**
   * Initialize native notification channels and permissions
   */
  public static async init() {
    if (this.isInitialized) return;

    try {
      if (Capacitor.isNativePlatform()) {
        // 1. Create Android Notification Channels
        await LocalNotifications.createChannel({
          id: "crew_messages",
          name: "Crew Messages & DMs",
          description: "Real-time alerts for direct messages and sequence crew chats",
          importance: 5, // High priority / Heads-up banner
          visibility: 1,
          vibration: true,
        });

        await LocalNotifications.createChannel({
          id: "crew_trades",
          name: "Trip Trades & Open Time",
          description: "Alerts when sequences are posted, requested, or accepted",
          importance: 4,
          visibility: 1,
          vibration: true,
        });

        await LocalNotifications.createChannel({
          id: "crew_ops",
          name: "Flight Ops & Reassignments",
          description: "Critical notifications for HSS changes and gate delays",
          importance: 5,
          visibility: 1,
          vibration: true,
        });

        // 2. Request Permissions
        const permStatus = await LocalNotifications.requestPermissions();
        this.hasPermission = permStatus.display === "granted";

        // 3. Listen for Action Taps (Deep Linking into specific Chats/Trades)
        LocalNotifications.addListener("localNotificationActionPerformed", (action) => {
          console.log("[NotificationService] Local notification tapped:", action);
          const extra = action.notification.extra;
          if (extra?.channelId && typeof window !== "undefined") {
            const crewStore = (window as any).__CREW_STORE__;
            const messageStore = (window as any).__MESSAGE_STORE__;
            if (crewStore) crewStore.getState().setActiveTab("chat");
            if (messageStore) messageStore.getState().setActiveChannelId(extra.channelId);
          }
        });
      } else if (typeof window !== "undefined" && "Notification" in window) {
        // Web Platform fallback
        if (Notification.permission === "default") {
          const perm = await Notification.requestPermission();
          this.hasPermission = perm === "granted";
        } else {
          this.hasPermission = Notification.permission === "granted";
        }
      }

      this.isInitialized = true;
    } catch (err) {
      console.warn("[NotificationService] Init error:", err);
    }
  }

  /**
   * Save device FCM / Push token to user's Firestore profile
   */
  public static async saveDeviceToken(tokenValue: string) {
    const user = auth.currentUser;
    if (!user || !tokenValue) return;

    try {
      const userRef = doc(db, "users", user.uid);
      await setDoc(
        userRef,
        {
          fcmToken: tokenValue,
          vapidKey: VAPID_PUBLIC_KEY,
          devicePlatform: Capacitor.getPlatform(),
          lastTokenUpdate: serverTimestamp(),
        },
        { merge: true }
      );
      console.log("[NotificationService] FCM token saved to user profile.");
    } catch (err) {
      console.warn("[NotificationService] Failed to save FCM token to Firestore:", err);
    }
  }

  /**
   * Trigger native notification banner when a new chat message arrives
   */
  public static async notifyNewMessage(message: ChatMessage, channelTitle: string) {
    if (!this.hasPermission) {
      await this.init();
    }

    // Don't notify if the user themselves sent the message
    if (message.sender.userId === "user-current" || message.sender.userId === auth.currentUser?.uid) {
      return;
    }

    const title = `${message.sender.name} (${message.sender.role})`;
    let body = message.encrypted ? "🔒 Sent an encrypted message" : message.content;

    if (message.quickMacroTag === "CREW_VAN") {
      body = "🚐 CREW VAN: " + body;
    } else if (message.quickMacroTag === "GATE_HOLD") {
      body = "⏳ GATE HOLD: " + body;
    } else if (message.quickMacroTag === "REST_START") {
      body = "🌙 REST STARTED: " + body;
    }

    try {
      if (Capacitor.isNativePlatform()) {
        await LocalNotifications.schedule({
          notifications: [
            {
              id: Math.floor(Date.now() % 100000),
              title: `${channelTitle} • ${title}`,
              body,
              channelId: "crew_messages",
              smallIcon: "ic_launcher",
              largeIcon: "ic_launcher",
              iconColor: "#007AFF",
              isExactNotification: false,
              extra: {
                channelId: message.channelId,
                messageId: message.id,
              },
            },
          ],
        });
      } else if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
        new Notification(`${channelTitle} • ${title}`, {
          body,
          icon: "/icon.png",
        });
      }
    } catch (e) {
      console.warn("[NotificationService] Message notification error:", e);
    }
  }

  /**
   * Trigger native notification for a Trip Trade update
   */
  public static async notifyTradeUpdate(trade: TradeOfferEmbed, senderName: string) {
    if (!this.hasPermission) {
      await this.init();
    }

    const title = `Trip Trade: Seq #${trade.offeredSequenceNumber}`;
    const statusText = (trade.status || "UPDATED").toLowerCase();
    const body = `${senderName} ${statusText} the trip trade (${trade.offeredCreditHours || 0}h credit).`;

    try {
      if (Capacitor.isNativePlatform()) {
        await LocalNotifications.schedule({
          notifications: [
            {
              id: Math.floor(Date.now() % 100000),
              title,
              body,
              channelId: "crew_trades",
              smallIcon: "ic_launcher",
              largeIcon: "ic_launcher",
              iconColor: "#10B981",
              isExactNotification: false,
            },
          ],
        });
      } else if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
        new Notification(title, {
          body,
          icon: "/icon.png",
        });
      }
    } catch (e) {
      console.warn("[NotificationService] Trade notification error:", e);
    }
  }

  /**
   * Trigger alert for an HSS / Reassignment schedule change
   */
  public static async notifyScheduleChange(sequenceNumber: string, summary: string) {
    if (!this.hasPermission) {
      await this.init();
    }

    try {
      if (Capacitor.isNativePlatform()) {
        await LocalNotifications.schedule({
          notifications: [
            {
              id: Math.floor(Date.now() % 100000),
              title: `⚠️ Reassignment Alert: Seq #${sequenceNumber}`,
              body: summary,
              channelId: "crew_ops",
              smallIcon: "ic_launcher",
              largeIcon: "ic_launcher",
              iconColor: "#EF4444",
              isExactNotification: false,
            },
          ],
        });
      }
    } catch (e) {
      console.warn("[NotificationService] Schedule change notification error:", e);
    }
  }

  /**
   * Trigger test crew notification directly from app
   */
  public static async sendTestCrewNotification() {
    try {
      if (Capacitor.isNativePlatform()) {
        await LocalNotifications.schedule({
          notifications: [
            {
              id: 9999,
              title: "CrewSchedule Pro • FO Marcus Vance",
              body: "🚐 Crew van leaving hotel lobby in 2 minutes! Grab your bags Austin.",
              channelId: "crew_messages",
              smallIcon: "ic_launcher",
              largeIcon: "ic_launcher",
              iconColor: "#007AFF",
              isExactNotification: false,
              extra: {
                channelId: "direct-crew-fo-marcus",
              },
            },
          ],
        });
      } else if (typeof window !== "undefined" && "Notification" in window) {
        new Notification("CrewSchedule Pro • FO Marcus Vance", {
          body: "🚐 Crew van leaving hotel lobby in 2 minutes! Grab your bags Austin.",
          icon: "/icon.png",
        });
      }
    } catch (e) {
      console.warn("[NotificationService] Test notification error:", e);
    }
  }
}
