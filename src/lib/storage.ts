import { db } from './db';
import { 
  SequenceTrip, 
  OpenSequence, 
  VacationPeriod, 
  ScheduleSnapshot, 
  LogbookEntry,
  SubscribedCalendar,
  PersonalCalendarEvent,
  PayRates,
  AutomationConfig,
  MonthlyHIMetadata,
  OpenTimePreset
} from '../types';

export function safeLocalStorageSet(key: string, value: any): boolean {
  if (typeof window === "undefined") return false;
  try {
    localStorage.setItem(key, typeof value === "string" ? value : JSON.stringify(value));
    return true;
  } catch (e) {
    console.warn(`[Storage] localStorage.setItem quota exceeded for key "${key}". Dexie IndexedDB preserves state.`, e);
    return false;
  }
}

export function safeLocalStorageGet<T = any>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (raw === null || raw === undefined) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export const StorageAdapter = {
  // Load entire state from IndexedDB
  async loadState() {
    try {
      const [
        sequences,
        openSequences,
        vacations,
        snapshots,
        logbookEntries,
        subscribedCalendars,
        personalEvents,
        settingsArray
      ] = await Promise.all([
        db.sequences.toArray(),
        db.openSequences.toArray(),
        db.vacations.toArray(),
        db.snapshots.toArray(),
        db.logbookEntries.toArray(),
        db.subscribedCalendars.toArray(),
        db.personalEvents.toArray(),
        db.settings.toArray()
      ]);

      const settings = settingsArray.reduce((acc, curr) => {
        acc[curr.key] = curr.value;
        return acc;
      }, {} as Record<string, any>);

      return {
        sequences,
        openSequences,
        vacations,
        snapshots,
        logbookEntries,
        subscribedCalendars,
        personalEvents,
        settings
      };
    } catch (err) {
      console.warn("[StorageAdapter] Error loading state from IndexedDB:", err);
      return null;
    }
  },

  async migrateFromLocalStorage() {
    if (typeof window === "undefined") return;
    try {
      const migratedStr = localStorage.getItem("crewschedule_migrated_to_dexie");
      if (migratedStr === "true") return; // Already migrated

      // Migrate Sequences
      const storedSeqs = localStorage.getItem("crewschedule_sequences");
      if (storedSeqs) await this.saveSequences(JSON.parse(storedSeqs));

      // Migrate Open Sequences
      const storedOpenSeqs = localStorage.getItem("crewschedule_opensequences");
      if (storedOpenSeqs) await this.saveOpenSequences(JSON.parse(storedOpenSeqs));

      // Migrate Vacations
      const storedVacations = localStorage.getItem("crewschedule_vacations");
      if (storedVacations) await this.saveVacations(JSON.parse(storedVacations));

      // Migrate Snapshots
      const storedSnaps = localStorage.getItem("crewschedule_snapshots");
      if (storedSnaps) await this.saveSnapshots(JSON.parse(storedSnaps));

      // Migrate Logbook
      const storedLogbook = localStorage.getItem("crewschedule_logbook");
      if (storedLogbook) await this.saveLogbookEntries(JSON.parse(storedLogbook));

      // Migrate Calendars & Events
      const storedCals = localStorage.getItem("crewschedule_subscribedcals");
      if (storedCals) await this.saveSubscribedCalendars(JSON.parse(storedCals));

      const storedEvents = localStorage.getItem("crewschedule_personalevents");
      if (storedEvents) await this.savePersonalEvents(JSON.parse(storedEvents));

      // Migrate Settings
      const settingsKeys = [
        "crewschedule_payrates",
        "crewschedule_simulatedids",
        "crewschedule_showoverlay",
        "crewschedule_openfilter",
        "crewschedule_turnlimits",
        "crewschedule_defaultturnlimit",
        "crewschedule_highcreditthreshold",
        "crewschedule_hi_metadata",
        "crewschedule_openpresets",
        "crewschedule_automation",
        "crewschedule_userprofile"
      ];

      for (const key of settingsKeys) {
        const val = localStorage.getItem(key);
        if (val) {
          try {
            await this.saveSetting(key, JSON.parse(val));
          } catch {}
        }
      }

      // Mark as migrated
      localStorage.setItem("crewschedule_migrated_to_dexie", "true");
      console.log("[StorageAdapter] Successfully migrated legacy localStorage to Dexie IndexedDB!");
    } catch (err) {
      console.warn("[StorageAdapter] Migration encountered an issue:", err);
    }
  },

  // Save specific collections
  async saveSequences(items: SequenceTrip[]) {
    try {
      await db.sequences.clear();
      if (items.length > 0) await db.sequences.bulkPut(items);
    } catch (e) {
      console.warn("[StorageAdapter] saveSequences error:", e);
    }
  },
  
  async saveOpenSequences(items: OpenSequence[]) {
    try {
      await db.openSequences.clear();
      if (items.length > 0) await db.openSequences.bulkPut(items);
    } catch (e) {
      console.warn("[StorageAdapter] saveOpenSequences error:", e);
    }
  },

  async saveVacations(items: VacationPeriod[]) {
    try {
      await db.vacations.clear();
      if (items.length > 0) await db.vacations.bulkPut(items);
    } catch (e) {
      console.warn("[StorageAdapter] saveVacations error:", e);
    }
  },

  async saveSnapshots(items: ScheduleSnapshot[]) {
    try {
      await db.snapshots.clear();
      if (items.length > 0) await db.snapshots.bulkPut(items);
    } catch (e) {
      console.warn("[StorageAdapter] saveSnapshots error:", e);
    }
  },

  async saveLogbookEntries(items: LogbookEntry[]) {
    try {
      await db.logbookEntries.clear();
      if (items.length > 0) await db.logbookEntries.bulkPut(items);
    } catch (e) {
      console.warn("[StorageAdapter] saveLogbookEntries error:", e);
    }
  },

  async saveSubscribedCalendars(items: SubscribedCalendar[]) {
    try {
      await db.subscribedCalendars.clear();
      if (items.length > 0) await db.subscribedCalendars.bulkPut(items);
    } catch (e) {
      console.warn("[StorageAdapter] saveSubscribedCalendars error:", e);
    }
  },

  async savePersonalEvents(items: PersonalCalendarEvent[]) {
    try {
      await db.personalEvents.clear();
      if (items.length > 0) await db.personalEvents.bulkPut(items);
    } catch (e) {
      console.warn("[StorageAdapter] savePersonalEvents error:", e);
    }
  },

  // Save Settings
  async saveSetting(key: string, value: any) {
    try {
      if (value === null || value === undefined) {
        await db.settings.delete(key);
      } else {
        await db.settings.put({ key, value });
      }
    } catch (e) {
      console.warn(`[StorageAdapter] saveSetting error for ${key}:`, e);
    }
  },

  async clearAll() {
    try {
      await Promise.all([
        db.sequences.clear(),
        db.openSequences.clear(),
        db.vacations.clear(),
        db.snapshots.clear(),
        db.logbookEntries.clear(),
        db.subscribedCalendars.clear(),
        db.personalEvents.clear(),
        db.settings.clear()
      ]);
    } catch (e) {
      console.warn("[StorageAdapter] clearAll error:", e);
    }
  }
};
