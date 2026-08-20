import {
  collection,
  doc,
  setDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  updateDoc,
  deleteDoc,
  Unsubscribe,
} from "firebase/firestore";
import { db, auth } from "./config";
import { ChatMessage, ChatChannel, TradeOfferEmbed } from "@/types";

/**
 * CrewSchedule Pro - Real-Time Firebase Firestore Chat Engine
 * 
 * Provides:
 * - Real-time channel message streaming via Firestore `onSnapshot`
 * - Resilient offline-first queuing with automatic sync
 * - Direct messaging, base broadcast channels, and sequence crew channels
 * - Tactical macros and 1-tap trade proposals
 */

export class FirebaseChatService {
  private static activeUnsubscribers: Map<string, Unsubscribe> = new Map();

  /**
   * Subscribe to real-time incoming messages for a specific channel
   */
  public static subscribeToChannel(
    channelId: string,
    onMessages: (messages: ChatMessage[]) => void,
    onError?: (error: any) => void
  ): () => void {
    if (!channelId) return () => {};

    // Unsubscribe existing listener for this channel if present
    this.unsubscribeChannel(channelId);

    try {
      const messagesRef = collection(db, "chat_channels", channelId, "messages");
      const q = query(messagesRef, orderBy("timestamp", "asc"), limit(150));

      const unsub = onSnapshot(
        q,
        (snapshot) => {
          const fetched: ChatMessage[] = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            fetched.push({
              id: docSnap.id,
              channelId: data.channelId || channelId,
              sender: data.sender || {
                userId: "unknown",
                name: "Crew Member",
                role: "CA",
              },
              content: data.content || "",
              timestamp: data.timestamp || Date.now(),
              encrypted: data.encrypted || false,
              iv: data.iv,
              status: "DELIVERED",
              quickMacroTag: data.quickMacroTag,
              embeddedLeg: data.embeddedLeg,
              embeddedTrade: data.embeddedTrade,
              attachments: data.attachments,
              replyToMessage: data.replyToMessage,
              reactions: data.reactions,
              editedAt: data.editedAt,
              isDeleted: data.isDeleted,
            });
          });

          onMessages(fetched);
        },
        (err) => {
          console.warn(`[FirebaseChatService] Real-time channel error (${channelId}):`, err);
          if (onError) onError(err);
        }
      );

      this.activeUnsubscribers.set(channelId, unsub);
      return () => this.unsubscribeChannel(channelId);
    } catch (err) {
      console.warn("[FirebaseChatService] Failed to bind Firestore listener:", err);
      return () => {};
    }
  }

  /**
   * Unsubscribe from a channel listener
   */
  public static unsubscribeChannel(channelId: string) {
    const existing = this.activeUnsubscribers.get(channelId);
    if (existing) {
      existing();
      this.activeUnsubscribers.delete(channelId);
    }
  }

  /**
   * Unsubscribe from all active channel listeners
   */
  public static unsubscribeAll() {
    this.activeUnsubscribers.forEach((unsub) => unsub());
    this.activeUnsubscribers.clear();
  }

  /**
   * Send a message to Firestore with server timestamp
   */
  public static async sendMessage(channelId: string, message: ChatMessage): Promise<boolean> {
    if (!channelId || !message) return false;

    try {
      const msgRef = doc(db, "chat_channels", channelId, "messages", message.id);
      const payload: any = {
        ...message,
        serverTimestamp: serverTimestamp(),
      };

      // Set message doc
      await setDoc(msgRef, payload, { merge: true });

      // Update parent channel preview metadata
      const channelRef = doc(db, "chat_channels", channelId);
      await setDoc(
        channelRef,
        {
          id: channelId,
          lastMessage: {
            id: message.id,
            content: message.encrypted ? "🔒 Encrypted Message" : message.content.slice(0, 80),
            timestamp: message.timestamp,
            senderName: message.sender.name,
          },
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      return true;
    } catch (err) {
      console.warn(`[FirebaseChatService] Error sending message to ${channelId}:`, err);
      return false;
    }
  }

  /**
   * Update a trade offer embed status in a message
   */
  public static async updateTradeStatus(
    channelId: string,
    messageId: string,
    newStatus: TradeOfferEmbed["status"]
  ): Promise<boolean> {
    try {
      const msgRef = doc(db, "chat_channels", channelId, "messages", messageId);
      await updateDoc(msgRef, {
        "embeddedTrade.status": newStatus,
        updatedAt: serverTimestamp(),
      });
      return true;
    } catch (err) {
      console.warn("[FirebaseChatService] Update trade status error:", err);
      return false;
    }
  }

  /**
   * Add an emoji reaction to a message
   */
  public static async addReaction(
    channelId: string,
    messageId: string,
    emoji: string,
    userId: string,
    userName: string
  ): Promise<boolean> {
    try {
      const msgRef = doc(db, "chat_channels", channelId, "messages", messageId);
      await setDoc(
        msgRef,
        {
          [`reactions.${emoji}`]: {
            users: [userId],
            count: 1,
          },
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      return true;
    } catch (err) {
      console.warn("[FirebaseChatService] Add reaction error:", err);
      return false;
    }
  }

  /**
   * Edit message text
   */
  public static async editMessage(
    channelId: string,
    messageId: string,
    newContent: string
  ): Promise<boolean> {
    try {
      const msgRef = doc(db, "chat_channels", channelId, "messages", messageId);
      await updateDoc(msgRef, {
        content: newContent,
        editedAt: Date.now(),
        updatedAt: serverTimestamp(),
      });
      return true;
    } catch (err) {
      console.warn("[FirebaseChatService] Edit message error:", err);
      return false;
    }
  }

  /**
   * Soft-delete a message
   */
  public static async deleteMessage(channelId: string, messageId: string): Promise<boolean> {
    try {
      const msgRef = doc(db, "chat_channels", channelId, "messages", messageId);
      await updateDoc(msgRef, {
        isDeleted: true,
        content: "This message was deleted.",
        updatedAt: serverTimestamp(),
      });
      return true;
    } catch (err) {
      console.warn("[FirebaseChatService] Delete message error:", err);
      return false;
    }
  }
}
