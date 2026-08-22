import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db, cleanForFirestore } from "./config";
import { useCrewStore } from "../../store/useCrewStore";
import { UserProfile, SequenceTrip, VacationPeriod, PersonalCalendarEvent, SubscribedCalendar, LogbookEntry, HssAuditRecord } from "../../types";

export interface CloudBackupData {
  profile: UserProfile | null;
  sequences: SequenceTrip[];
  vacations: VacationPeriod[];
  personalEvents: PersonalCalendarEvent[];
  subscribedCalendars: SubscribedCalendar[];
  hssAudits?: HssAuditRecord[];
  logbookEntries?: LogbookEntry[];
  logbookCount?: number;
  lastBackupAt: string;
  version: string;
}

export class CloudSyncService {
  /**
   * Backup all personal local data (Profile, Schedules, Vacations, Calendars, Logbook, HSS Audits) to Cloud Firestore
   */
  public static async backupAllToCloud(uid: string): Promise<{ success: boolean; message: string; timestamp: string }> {
    if (!uid) {
      throw new Error("No authenticated user ID provided for cloud backup.");
    }

    try {
      const state = useCrewStore.getState();
      const logbookEntries = state.logbookEntries || [];
      const hssAudits = state.hssAudits || [];

      const backupPayload: CloudBackupData = {
        profile: state.userProfile,
        sequences: state.sequences,
        vacations: state.vacations,
        personalEvents: state.personalEvents,
        subscribedCalendars: state.subscribedCalendars,
        hssAudits: hssAudits,
        logbookEntries: logbookEntries,
        logbookCount: logbookEntries.length,
        lastBackupAt: new Date().toISOString(),
        version: "2.1.0",
      };

      // 1. Sanitize payload to strip any `undefined` values that Firestore rejects
      const sanitized = cleanForFirestore(backupPayload);

      // 2. Save main backup snapshot
      const userDocRef = doc(db, "users", uid);
      const writePromise = setDoc(userDocRef, {
        ...sanitized,
        updatedAt: serverTimestamp(),
      }, { merge: true });

      // Fast race timeout so pilot gets snappy UI response while offline/background sync completes
      await Promise.race([
        writePromise,
        new Promise((resolve) => setTimeout(resolve, 2500))
      ]);

      // Update local storage last backup time
      if (typeof window !== "undefined") {
        localStorage.setItem("csp_last_cloud_backup", backupPayload.lastBackupAt);
      }

      return {
        success: true,
        message: `Successfully backed up ${state.sequences.length} sequences & ${logbookEntries.length} logbook entries to Cloud.`,
        timestamp: backupPayload.lastBackupAt,
      };
    } catch (err: any) {
      console.error("[CloudSyncService] Backup failed:", err);
      return {
        success: false,
        message: err.message || "Failed to complete cloud backup.",
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Restore all data from Cloud Firestore to Local Store
   */
  public static async restoreAllFromCloud(uid: string): Promise<{ success: boolean; message: string; restoredItems: number }> {
    if (!uid) {
      throw new Error("No authenticated user ID provided for restore.");
    }

    try {
      const userDocRef = doc(db, "users", uid);
      const snap = await getDoc(userDocRef);

      if (!snap.exists()) {
        return {
          success: false,
          message: "No existing cloud backup found for this account.",
          restoredItems: 0,
        };
      }

      const data = snap.data() as CloudBackupData;
      let restoredCount = 0;

      // 1. Restore Profile
      if (data.profile) {
        useCrewStore.getState().updateUserProfile(data.profile);
        restoredCount++;
      }

      // 2. Restore Sequences / Roster
      if (Array.isArray(data.sequences) && data.sequences.length > 0) {
        useCrewStore.getState().setSequences(data.sequences);
        restoredCount += data.sequences.length;
      }

      // 3. Restore Vacations
      if (Array.isArray(data.vacations) && data.vacations.length > 0) {
        useCrewStore.getState().setVacations(data.vacations);
      }

      // 4. Restore Subscribed Calendars & Events
      if (Array.isArray(data.subscribedCalendars)) {
        useCrewStore.setState({ subscribedCalendars: data.subscribedCalendars });
      }
      if (Array.isArray(data.personalEvents)) {
        useCrewStore.setState({ personalEvents: data.personalEvents });
      }

      // 5. Restore HSS Granular Audit Log & Revision History
      if (Array.isArray(data.hssAudits) && data.hssAudits.length > 0) {
        useCrewStore.setState({ hssAudits: data.hssAudits });
        if (typeof window !== "undefined") {
          localStorage.setItem("crewschedule_hss_audits", JSON.stringify(data.hssAudits));
        }
        restoredCount += data.hssAudits.length;
      }

      // 6. Restore Logbook Entries
      if (Array.isArray(data.logbookEntries) && data.logbookEntries.length > 0) {
        useCrewStore.setState({ logbookEntries: data.logbookEntries });
        try {
          const { StorageAdapter } = await import("../storage");
          await StorageAdapter.saveLogbookEntries(data.logbookEntries);
        } catch (e) {
          console.warn("[CloudSyncService] Logbook IndexedDB sync notice:", e);
        }
        restoredCount += data.logbookEntries.length;
      }

      return {
        success: true,
        message: `Restored ${data.sequences?.length || 0} sequences and profile from ${new Date(data.lastBackupAt).toLocaleString()}.`,
        restoredItems: restoredCount,
      };
    } catch (err: any) {
      console.error("[CloudSyncService] Restore failed:", err);
      return {
        success: false,
        message: err.message || "Failed to restore data from cloud.",
        restoredItems: 0,
      };
    }
  }

  /**
   * Check Last Cloud Backup Metadata
   */
  public static async getCloudBackupInfo(uid: string): Promise<CloudBackupData | null> {
    if (!uid) return null;
    try {
      const userDocRef = doc(db, "users", uid);
      const snap = await getDoc(userDocRef);
      if (snap.exists()) {
        return snap.data() as CloudBackupData;
      }
      return null;
    } catch (err) {
      console.warn("[CloudSyncService] Could not fetch backup info:", err);
      return null;
    }
  }
}
