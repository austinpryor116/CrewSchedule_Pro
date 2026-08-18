import Dexie, { Table } from 'dexie';
import { 
  SequenceTrip, 
  OpenSequence, 
  VacationPeriod, 
  ScheduleSnapshot, 
  LogbookEntry,
  SubscribedCalendar,
  PersonalCalendarEvent,
  ChatMessage,
  ChatChannel
} from '../types';

export interface AppSettings {
  key: string;
  value: any;
}

export class CrewScheduleDB extends Dexie {
  sequences!: Table<SequenceTrip, string>;
  openSequences!: Table<OpenSequence, string>;
  vacations!: Table<VacationPeriod, string>;
  snapshots!: Table<ScheduleSnapshot, string>;
  logbookEntries!: Table<LogbookEntry, string>;
  subscribedCalendars!: Table<SubscribedCalendar, string>;
  personalEvents!: Table<PersonalCalendarEvent, string>;
  settings!: Table<AppSettings, string>;
  messages!: Table<ChatMessage, string>;
  channels!: Table<ChatChannel, string>;

  constructor() {
    super('CrewScheduleDB');
    this.version(1).stores({
      sequences: 'id',
      openSequences: 'id, startDate',
      vacations: 'id',
      snapshots: 'id',
      logbookEntries: 'id, date',
      subscribedCalendars: 'id',
      personalEvents: 'id',
      settings: 'key'
    });

    this.version(2).stores({
      sequences: 'id',
      openSequences: 'id, startDate',
      vacations: 'id',
      snapshots: 'id',
      logbookEntries: 'id, date',
      subscribedCalendars: 'id',
      personalEvents: 'id',
      settings: 'key',
      messages: 'id, channelId, timestamp, status, [channelId+timestamp]',
      channels: 'id, type, base, sequenceNumber, updatedAt'
    });
  }
}

export const db = new CrewScheduleDB();

