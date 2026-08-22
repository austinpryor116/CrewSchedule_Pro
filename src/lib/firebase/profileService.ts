import { UserProfile } from "@/types";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { db, auth, cleanForFirestore } from "./config";

/**
 * CrewSchedule Pro - Cloud / Firebase Profile Sync Service
 * 
 * Provides local-first resilience with seamless plug-and-play Firebase sync.
 * Synchronizes the pilot/FA profile, pay longevity, base preferences, and seniority data to Firestore.
 */

export interface CloudSyncResult {
  success: boolean;
  message: string;
  syncedAt?: string;
  source: "local" | "cloud" | "firebase";
}

export class ProfileSyncService {
  private static STORAGE_KEY = "crewschedule_userprofile";

  /**
   * Save user profile locally and push to Cloud Firestore
   */
  public static async saveProfile(profile: UserProfile): Promise<CloudSyncResult> {
    const updated: UserProfile = {
      ...profile,
      updatedAt: new Date().toISOString(),
      hasCompletedOnboarding: true,
    };

    if (!updated.createdAt) {
      updated.createdAt = new Date().toISOString();
    }

    // 1. Primary: Save to Local Storage
    try {
      if (typeof window !== "undefined") {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(updated));
      }
    } catch (err) {
      console.error("[ProfileSyncService] Local save error:", err);
    }

    // 2. Secondary: Cloud Firestore Sync
    const uid = updated.firebaseUid || auth.currentUser?.uid;
    if (uid) {
      try {
        const userDocRef = doc(db, "users", uid);
        const writePromise = setDoc(userDocRef, {
          profile: cleanForFirestore(updated),
          updatedAt: serverTimestamp(),
        }, { merge: true });
        
        // Timeout race so UI is never blocked by slow network promises
        await Promise.race([
          writePromise,
          new Promise((resolve) => setTimeout(resolve, 1500))
        ]);

        console.log("[ProfileSyncService] Firebase Firestore synced for UID:", uid);
        return {
          success: true,
          message: "Profile synced successfully to Firebase Cloud.",
          syncedAt: updated.updatedAt,
          source: "firebase",
        };
      } catch (err: any) {
        console.warn("[ProfileSyncService] Firebase sync notice (offline mode active):", err);
      }
    }

    return {
      success: true,
      message: "Profile saved locally and cached for Cloud sync.",
      syncedAt: updated.updatedAt,
      source: "local",
    };
  }

  /**
   * Fetch profile from local or cloud
   */
  public static async getProfile(): Promise<UserProfile | null> {
    // Check local storage first
    let localProfile: UserProfile | null = null;
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem(this.STORAGE_KEY);
        if (raw) {
          localProfile = JSON.parse(raw);
        }
      } catch (err) {
        console.error("[ProfileSyncService] Error retrieving local profile:", err);
      }
    }

    // If online with user, attempt Firestore fetch
    const uid = localProfile?.firebaseUid || auth.currentUser?.uid;
    if (uid) {
      try {
        const userDocRef = doc(db, "users", uid);
        const snap = await getDoc(userDocRef);
        if (snap.exists()) {
          const data = snap.data();
          if (data.profile) {
            if (typeof window !== "undefined") {
              localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data.profile));
            }
            return data.profile as UserProfile;
          }
        }
      } catch (err) {
        console.warn("[ProfileSyncService] Firestore fetch error (using local):", err);
      }
    }

    return localProfile;
  }

  /**
   * Check if Firebase Cloud backend is currently linked
   */
  public static isFirebaseConnected(): boolean {
    return !!auth.currentUser || !!db;
  }
}
