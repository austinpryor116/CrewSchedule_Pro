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

export const StorageAdapter = {
  // Load entire state from IndexedDB
  async loadState() {
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
  },

  async migrateFromLocalStorage() {
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
      "crewschedule_automation"
    ];

    for (const key of settingsKeys) {
      const val = localStorage.getItem(key);
      if (val) {
        await this.saveSetting(key, JSON.parse(val));
      }
    }

    // Mark as migrated
    localStorage.setItem("crewschedule_migrated_to_dexie", "true");
  },

  // Save specific collections
  async saveSequences(items: SequenceTrip[]) {
    await db.sequences.clear();
    if (items.length > 0) await db.sequences.bulkPut(items);
  },
  
  async saveOpenSequences(items: OpenSequence[]) {
    await db.openSequences.clear();
    if (items.length > 0) await db.openSequences.bulkPut(items);
  },

  async saveVacations(items: VacationPeriod[]) {
    await db.vacations.clear();
    if (items.length > 0) await db.vacations.bulkPut(items);
  },

  async saveSnapshots(items: ScheduleSnapshot[]) {
    await db.snapshots.clear();
    if (items.length > 0) await db.snapshots.bulkPut(items);
  },

  async saveLogbookEntries(items: LogbookEntry[]) {
    await db.logbookEntries.clear();
    if (items.length > 0) await db.logbookEntries.bulkPut(items);
  },

  async saveSubscribedCalendars(items: SubscribedCalendar[]) {
    await db.subscribedCalendars.clear();
    if (items.length > 0) await db.subscribedCalendars.bulkPut(items);
  },

  async savePersonalEvents(items: PersonalCalendarEvent[]) {
    await db.personalEvents.clear();
    if (items.length > 0) await db.personalEvents.bulkPut(items);
  },

  // Save Settings
  async saveSetting(key: string, value: any) {
    if (value === null || value === undefined) {
      await db.settings.delete(key);
    } else {
      await db.settings.put({ key, value });
    }
  },

  async clearAll() {
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
  }
};
