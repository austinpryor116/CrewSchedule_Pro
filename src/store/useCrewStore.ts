import { create } from "zustand";
import { SequenceTrip, PayRates, AutomationConfig, PayCalculations, OpenSequence, RosterMetrics, ScheduleSnapshot, VacationPeriod, MonthlyHIMetadata, LogbookEntry, OpenTimePreset, SubscribedCalendar, PersonalCalendarEvent, LogicLogEntry, UserProfile, N6DReservesData, TurnbackData, OpenTimeSniperConfig, DEFAULT_OPEN_TIME_SNIPER_CONFIG, HssAuditRecord } from "@/types";
import { DEFAULT_PAY_RATES, DEFAULT_LOGBOOK_ENTRIES, MOCK_VACATIONS, DEFAULT_SUBSCRIBED_CALENDARS, DEFAULT_PERSONAL_EVENTS } from "@/lib/demoData";
import { USER_LIVE_SEQUENCES, USER_LIVE_VACATIONS, USER_LIVE_OPEN_SEQUENCES } from "@/lib/userScheduleData";
import { PILOT_BIDDING_CALENDAR, DEFAULT_PILOT_BIDDING_EVENTS, isPilotRole } from "@/lib/pilotBiddingDates";
import { DEFAULT_N6D_DATA } from "@/lib/n6dParser";
import { parseTurnbackList } from "@/lib/turnbackParser";
import { HssDiffEngine } from "@/lib/hssDiffEngine";
import { isOpenSequenceInPast, reconcileOpenSequences } from "@/lib/openTimeUtils";

import { calculatePay, calculateSequenceTAFB, parseN4OpenTime, convertOpenToTrip, computeRosterMetrics, diffScheduleSnapshots, timeToMinutes, isCaptainRank, isFlightAttendantRole, isFirstOfficerRole, sanitizeSequenceTrip, sanitizeFlightLeg, detectMonthFromText } from "@/lib/parser";
import { getCbaRatesForProfile } from "@/lib/cbaPayScale";
import { StorageAdapter, safeLocalStorageSet } from "@/lib/storage";
export { convertOpenToTrip, isPilotRole, sanitizeSequenceTrip, sanitizeFlightLeg, isOpenSequenceInPast, reconcileOpenSequences };

export const DEFAULT_USER_PROFILE: UserProfile = {
  name: "Austin Pryor",
  employeeId: "742840",
  seniorityNumber: "01361",
  base: "ORD",
  equipment: "E175",
  crewRole: "CA",
  hireDate: "2015-08-15",
  email: "austin.pryor@envoyair.com",
  phone: "(812) 399-2574",
  airline: "Envoy Air (AA Eagle)",
  notificationsEnabled: true,
  syncCalendar: true,
  autoSyncEnabled: true,
  timezoneDisplay: "LOCAL",
  hasCompletedOnboarding: true,
};

export const DEFAULT_OPEN_TIME_PRESETS: OpenTimePreset[] = [
  { id: "all", name: "All Open Trips" },
  { id: "fits", name: "Fits Schedule Only", fitsOnly: true },
  { id: "turns-3h", name: "⚡ Turns > 3.0h Credit", minCreditHours: 3.0, maxTripDays: 1 },
  { id: "turns-only", name: "☀️ 1-Day Turns Only", maxTripDays: 1 },
  { id: "layovers-2d", name: "🌙 2-Day Trips", maxTripDays: 2 },
  { id: "high-credit", name: "🚀 Credit > 8.0h", minCreditHours: 8.0 },
];

interface CrewState {
  userProfile: UserProfile;
  updateUserProfile: (profile: Partial<UserProfile>) => void;
  sequences: SequenceTrip[];
  vacations: VacationPeriod[];
  monthlyHIMetadata: MonthlyHIMetadata | null;
  payRates: PayRates;
  selectedSequenceId: string | null;
  automationConfig: AutomationConfig;
  consoleLogs: string[];
  logicLogs: LogicLogEntry[];
  activeTab: string;
  isHydrated: boolean;
  
  // Schedule Versioning & Audit Trail
  snapshots: ScheduleSnapshot[];
  activeSnapshotId: string | null;

  // Electronic Logbook
  logbookEntries: LogbookEntry[];


  // Open Time state
  openSequences: OpenSequence[];
  openTimeLastUpdated?: string;
  setOpenTimeLastUpdated: (ts: string) => void;
  simulatedSequenceIds: string[];
  showOpenTimeOverlay: boolean;
  openTimeFilter: string;
  openTimePresets: OpenTimePreset[];
  addOpenTimePreset: (preset: OpenTimePreset) => void;
  removeOpenTimePreset: (id: string) => void;

  // Calendar Subscription & External Personal Events
  subscribedCalendars: SubscribedCalendar[];
  personalEvents: PersonalCalendarEvent[];
  addSubscribedCalendar: (cal: SubscribedCalendar, events?: PersonalCalendarEvent[]) => void;
  removeSubscribedCalendar: (id: string) => void;
  toggleSubscribedCalendar: (id: string) => void;
  updateSubscribedCalendarColor: (id: string, color: string) => void;

  // DTS / Dropped Sequences Visibility State
  showDtsDropped: boolean;
  setShowDtsDropped: (val: boolean) => void;
  toggleShowDtsDropped: () => void;

  // Calendar Tools Modal State
  isCalendarToolsOpen: boolean;
  setIsCalendarToolsOpen: (val: boolean) => void;

  // HSS Sequences Monthly Modal State
  isHssModalOpen: boolean;
  setIsHssModalOpen: (val: boolean) => void;

  // HSS Granular Audit Log & Change Tracking
  hssAudits: HssAuditRecord[];
  addHssAudit: (audit: HssAuditRecord) => void;
  clearHssAudits: () => void;

  // Hotel Request Modal State
  isHotelRequestModalOpen: boolean;
  setIsHotelRequestModalOpen: (val: boolean) => void;

  // Open Time Pickup Engine State
  selectedOpenTimeForPickup: OpenSequence | null;
  isPickupModalOpen: boolean;
  setIsPickupModalOpen: (val: boolean) => void;
  setSelectedOpenTimeForPickup: (seq: OpenSequence | null) => void;
  openTimeSniperConfig: OpenTimeSniperConfig;
  setOpenTimeSniperConfig: (cfg: Partial<OpenTimeSniperConfig>) => void;

  // Live DECS Screen Terminal State
  decsScreenOutput: string;
  decsCurrentInput: string;
  isTypingOnDecs: boolean;
  setDecsScreenOutput: (output: string | ((prev: string) => string)) => void;
  setDecsCurrentInput: (input: string) => void;
  setIsTypingOnDecs: (isTyping: boolean) => void;
  appendDecsTerminalLine: (line: string) => void;
  clearDecsScreenOutput: () => void;

  // Station Turn Limits Settings
  stationTurnLimits: Record<string, number>;
  defaultTurnLimit: number;
  highCreditThresholdHours: number;
  
  // Actions
  hydrate: () => void;
  setSequences: (sequences: SequenceTrip[]) => void;
  addSequences: (newSeqs: SequenceTrip[]) => void;
  resetScheduleToDefaults: () => void;
  updateSequence: (updated: SequenceTrip) => void;
  mergeHssIntoSequence: (sequenceNumber: string, hssData: any) => void;
  deleteSequence: (id: string) => void;
  setMonthlyHIMetadata: (meta: MonthlyHIMetadata | null) => void;
  importMonthlyHISchedule: (
    newSeqs: SequenceTrip[],
    newVacs: VacationPeriod[],
    metadata: MonthlyHIMetadata | null,
    sourceFileName: string,
    rawText: string
  ) => void;
  setPayRates: (rates: Partial<PayRates>) => void;
  setSelectedSequenceId: (id: string | null) => void;
  updateAutomationConfig: (cfg: Partial<AutomationConfig>) => void;
  addConsoleLog: (log: string) => void;
  clearConsoleLogs: () => void;
  addLogicLog: (entry: Omit<LogicLogEntry, "id" | "timestamp">) => void;
  clearLogicLogs: () => void;
  setActiveTab: (tab: string) => void;

  clearAll: () => void;
  
  // Snapshot Actions
  addSnapshot: (snapshot: ScheduleSnapshot) => void;
  setActiveSnapshotId: (id: string | null) => void;
  setVacations: (vacations: VacationPeriod[]) => void;

  // Logbook Actions
  autoGenerateLogbookFromRoster: () => void;
  addLogbookEntry: (entry: LogbookEntry) => void;
  updateLogbookEntry: (entry: LogbookEntry) => void;
  deleteLogbookEntry: (id: string) => void;
  clearLogbook: () => void;
  exportLogbookCsv: (format: "logten" | "foreflight" | "standard_faa") => string;


  // Calendar & Personal Event Actions
  addPersonalEvent: (event: PersonalCalendarEvent) => void;
  updatePersonalEvent: (event: PersonalCalendarEvent) => void;
  deletePersonalEvent: (id: string) => void;
  publishScheduleToFamilyFeed: () => Promise<boolean>;

  // Open Time Actions
  setOpenSequences: (seqs: OpenSequence[]) => void;
  importN4OpenTime: (rawN4Text: string) => void;
  toggleSimulateSequence: (id: string) => void;
  clearSimulatedSequences: () => void;
  setShowOpenTimeOverlay: (val: boolean) => void;
  setOpenTimeFilter: (filter: string) => void;

  // Station Turn Limits Actions
  setStationTurnLimit: (station: string, limitMinutes: number) => void;
  removeStationTurnLimit: (station: string) => void;
  setDefaultTurnLimit: (limitMinutes: number) => void;
  resetStationTurnLimits: () => void;
  setHighCreditThresholdHours: (hours: number) => void;

  // N6D Reserves Display State & Actions
  n6dReserves: N6DReservesData;
  setN6DReserves: (data: N6DReservesData) => void;
  resetN6DReservesToDefault: () => void;

  // HIHR Turnback List State & Actions
  turnbackData: TurnbackData | null;
  setTurnbackData: (data: TurnbackData | null) => void;
  importTurnbackList: (rawText: string) => void;
  clearTurnbackData: () => void;

  // Derivations
  getEffectiveSequences: () => SequenceTrip[];
  getPayCalculations: () => PayCalculations;
  getTotalTafbHours: () => number;
  getBlockAndOtStats: () => BlockAndOtStats;
  getRosterMetrics: () => RosterMetrics;
}

export interface BlockAndOtStats {
  currentFlownBlockHours: number;
  remainingBlockHours: number;
  projectedTotalBlockHours: number;
  overtimeTripsCount: number;
  overtimeCreditHours: number;
  overtimeProjectedPay: number;
}

const DEFAULT_AUTOMATION_CONFIG: AutomationConfig = {
  targetUrl: "https://example.com",
  userAgentProfile: "chrome-windows",
  commandInputSelector: "#bid-injector-input",
  submitButtonSelector: "#submit-bid-btn",
  delayMs: 1500,
  scriptQueue: [],
};

const DEFAULT_STATION_TURN_LIMITS: Record<string, number> = {
  ORD: 40,
  DFW: 40,
  MIA: 40,
  PHX: 40,
  DCA: 40,
};

const DEFAULT_TURN_LIMIT = 40;

const deduplicateSequences = (seqs: SequenceTrip[]): SequenceTrip[] => {
  if (!Array.isArray(seqs)) return [];
  const map = new Map<string, SequenceTrip>();
  seqs.forEach((s) => {
    if (!s) return;

    // Purge corrupted sequences from previous test runs:
    // 1. Any non-vacation sequence spanning more than 5 days
    if (!(s as any).isVacation && s.statusTag !== "VA" && s.startDate && s.endDate) {
      const pS = s.startDate.split("-").map(Number);
      const pE = s.endDate.split("-").map(Number);
      const dS = new Date(pS[0], pS[1] - 1, pS[2]);
      const dE = new Date(pE[0], pE[1] - 1, pE[2]);
      const spanDays = Math.round((dE.getTime() - dS.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      if (spanDays > 5) return; // Discard corrupted mega-trips
    }

    const clean = sanitizeSequenceTrip(s);
    if (clean.sequenceNumber && clean.startDate) {
      const key = `${clean.sequenceNumber}-${clean.startDate}`;
      map.set(key, clean);
    } else if (clean.id) {
      map.set(clean.id, clean);
    } else if (clean.sequenceNumber) {
      map.set(clean.sequenceNumber, clean);
    }
  });
  return Array.from(map.values()).map(sanitizeSequenceTrip);
};

export const useCrewStore = create<CrewState>((set, get) => ({
  userProfile: DEFAULT_USER_PROFILE,
  updateUserProfile: (profileUpdates) => {
    const current = get().userProfile;
    const updated = { ...current, ...profileUpdates };
    set({ userProfile: updated });

    const payRatesUpdates: Partial<PayRates> = {};
    if (profileUpdates.crewRole !== undefined) payRatesUpdates.crewRole = profileUpdates.crewRole;
    if (profileUpdates.equipment !== undefined) payRatesUpdates.equipment = profileUpdates.equipment;
    if (profileUpdates.base !== undefined) payRatesUpdates.homeBase = profileUpdates.base;

    // Automatically lookup CBA pay scale and per diem when hireDate, crewRole, 750 SIC, or Flow status changes
    if (
      profileUpdates.hireDate !== undefined ||
      profileUpdates.crewRole !== undefined ||
      profileUpdates.hasCompleted750Sic !== undefined ||
      profileUpdates.flowStatus !== undefined ||
      profileUpdates.isCaptainFlowTopScale !== undefined
    ) {
      const cbaRates = getCbaRatesForProfile({
        hireDateStr: updated.hireDate,
        role: updated.crewRole,
        hasCompleted750Sic: updated.hasCompleted750Sic,
        flowStatus: updated.flowStatus,
        isCaptainFlowTopScale: updated.isCaptainFlowTopScale,
      });
      payRatesUpdates.hourlyRate = cbaRates.hourlyRate;
      payRatesUpdates.perDiemRate = cbaRates.domesticPerDiem;
      payRatesUpdates.intlPerDiemRate = cbaRates.intlPerDiem;
    }

    if (Object.keys(payRatesUpdates).length > 0) {
      get().setPayRates(payRatesUpdates);
    }

    // Sync monthlyHIMetadata
    const currentMeta = get().monthlyHIMetadata;
    if (currentMeta) {
      const updatedMeta: MonthlyHIMetadata = {
        ...currentMeta,
        pilotName: profileUpdates.name || currentMeta.pilotName,
        empNum: profileUpdates.employeeId || currentMeta.empNum,
        seniorityNum: profileUpdates.seniorityNumber || currentMeta.seniorityNum,
        base: profileUpdates.base || currentMeta.base,
        equipment: profileUpdates.equipment || currentMeta.equipment,
        rank: profileUpdates.crewRole || currentMeta.rank,
      };
      set({ monthlyHIMetadata: updatedMeta });
    }

    if (typeof window !== "undefined") {
      localStorage.setItem("crewschedule_userprofile", JSON.stringify(updated));
    }
  },

  sequences: USER_LIVE_SEQUENCES,
  vacations: USER_LIVE_VACATIONS,
  monthlyHIMetadata: null,
  payRates: DEFAULT_PAY_RATES,
  selectedSequenceId: null,
  automationConfig: DEFAULT_AUTOMATION_CONFIG,
  consoleLogs: [],
  logicLogs: [],
  activeTab: "calendar",
  isHydrated: false,
  snapshots: [],
  activeSnapshotId: null,
  logbookEntries: DEFAULT_LOGBOOK_ENTRIES,
  openSequences: USER_LIVE_OPEN_SEQUENCES.filter((s) => !isOpenSequenceInPast(s)),
  openTimeLastUpdated: "2026-08-19T12:18:00.000Z",
  setOpenTimeLastUpdated: (ts: string) => {
    set({ openTimeLastUpdated: ts });
    safeLocalStorageSet("crewschedule_opentime_last_updated", ts);
  },
  simulatedSequenceIds: [],
  showOpenTimeOverlay: false,
  openTimeFilter: "all",
  openTimePresets: DEFAULT_OPEN_TIME_PRESETS,
  subscribedCalendars: DEFAULT_SUBSCRIBED_CALENDARS,
  personalEvents: DEFAULT_PERSONAL_EVENTS,
  showDtsDropped: true, // Default to true so all roster trips and trades remain visible on calendar
  setShowDtsDropped: (val: boolean) => set({ showDtsDropped: val }),
  toggleShowDtsDropped: () => set((state) => ({ showDtsDropped: !state.showDtsDropped })),
  isCalendarToolsOpen: false,
  setIsCalendarToolsOpen: (val: boolean) => set({ isCalendarToolsOpen: val }),
  isHssModalOpen: false,
  setIsHssModalOpen: (val: boolean) => set({ isHssModalOpen: val }),
  hssAudits: [],
  addHssAudit: (audit: HssAuditRecord) => {
    set((state) => {
      const updated = [audit, ...state.hssAudits.filter((a) => a.auditId !== audit.auditId)].slice(0, 100);
      safeLocalStorageSet("crewschedule_hss_audits", updated);
      return { hssAudits: updated };
    });
  },
  clearHssAudits: () => {
    set({ hssAudits: [] });
    safeLocalStorageSet("crewschedule_hss_audits", []);
  },
  isHotelRequestModalOpen: false,
  setIsHotelRequestModalOpen: (val: boolean) => set({ isHotelRequestModalOpen: val }),

  selectedOpenTimeForPickup: null,
  isPickupModalOpen: false,
  setIsPickupModalOpen: (val: boolean) => set({ isPickupModalOpen: val }),
  setSelectedOpenTimeForPickup: (selectedOpenTimeForPickup) =>
    set({ selectedOpenTimeForPickup, isPickupModalOpen: selectedOpenTimeForPickup !== null }),
  openTimeSniperConfig: DEFAULT_OPEN_TIME_SNIPER_CONFIG,
  setOpenTimeSniperConfig: (cfg) =>
    set((state) => ({
      openTimeSniperConfig: { ...state.openTimeSniperConfig, ...cfg },
    })),

  decsScreenOutput: "",
  decsCurrentInput: "",
  isTypingOnDecs: false,
  setDecsScreenOutput: (output) =>
    set((state) => ({
      decsScreenOutput: typeof output === "function" ? output(state.decsScreenOutput) : output,
    })),
  setDecsCurrentInput: (decsCurrentInput) => set({ decsCurrentInput }),
  setIsTypingOnDecs: (isTypingOnDecs) => set({ isTypingOnDecs }),
  appendDecsTerminalLine: (line) =>
    set((state) => ({
      decsScreenOutput: state.decsScreenOutput ? state.decsScreenOutput + "\n" + line : line,
    })),
  clearDecsScreenOutput: () =>
    set({ decsScreenOutput: "" }),

  stationTurnLimits: DEFAULT_STATION_TURN_LIMITS,
  defaultTurnLimit: DEFAULT_TURN_LIMIT,
  highCreditThresholdHours: 15.0,

  n6dReserves: DEFAULT_N6D_DATA,
  setN6DReserves: (data: N6DReservesData) => {
    set({ n6dReserves: data });
    safeLocalStorageSet("crewschedule_n6d_reserves", data);
  },
  resetN6DReservesToDefault: () => {
    set({ n6dReserves: DEFAULT_N6D_DATA });
    safeLocalStorageSet("crewschedule_n6d_reserves", DEFAULT_N6D_DATA);
  },

  turnbackData: null,
  setTurnbackData: (data: TurnbackData | null) => {
    set({ turnbackData: data });
    safeLocalStorageSet("crewschedule_turnback_data", data);
  },
  importTurnbackList: (rawText: string) => {
    const parsed = parseTurnbackList(rawText);
    set({ turnbackData: parsed });
    safeLocalStorageSet("crewschedule_turnback_data", parsed);
    get().addLogicLog({
      category: "DECS_API",
      message: `Imported Turnback List with ${parsed.records.length} pilots`,
      details: { recordsCount: parsed.records.length },
    });
  },
  clearTurnbackData: () => {
    set({ turnbackData: null });
    safeLocalStorageSet("crewschedule_turnback_data", null);
  },

  autoGenerateLogbookFromRoster: () => {
    const sequences = get().sequences;
    const existing = get().logbookEntries;
    const existingMap = new Map(existing.map((e) => [`${e.date}-${e.flightNumber}-${e.depAirport}-${e.arrAirport}`, e]));

    const generated: LogbookEntry[] = [];

    sequences.forEach((seq) => {
      if (seq.isDropped || seq.statusTag === "DROP" || seq.statusTag === "DTS DROP") return;

      const dateParts = seq.startDate.split("-").map(Number);
      const startYear = dateParts[0] || new Date().getFullYear();
      const startMonth = (dateParts[1] || 1) - 1;
      const startDay = dateParts[2] || 1;

      seq.dutyPeriods.forEach((dp, dpIdx) => {
        const offset = dp.dayIndex !== undefined ? dp.dayIndex : dpIdx;
        const targetDate = new Date(startYear, startMonth, startDay + offset);
        const dateStr = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, "0")}-${String(targetDate.getDate()).padStart(2, "0")}`;

        dp.legs.forEach((leg, legIdx) => {
          const key = `${dateStr}-${leg.flightNumber}-${leg.depAirport}-${leg.arrAirport}`;
          
          const blockMins = leg.actualBlockMinutes ?? leg.blockMinutes;
          const depMins = timeToMinutes(leg.depTime);
          const arrMins = timeToMinutes(leg.arrTime);
          const isNightFlight = depMins >= 1200 || depMins <= 360 || arrMins >= 1200 || arrMins <= 360;
          const nightMins = isNightFlight ? Math.round(blockMins * 0.6) : 0;
          const instMins = Math.round(blockMins * 0.15);
          // Determine PIC/SIC/FA role
          const effectiveRank = seq.rank || get().payRates?.crewRole || get().userProfile?.crewRole || get().monthlyHIMetadata?.rank || "CAPT";
          const isFa = isFlightAttendantRole(effectiveRank);
          const isPic = !isFa && isCaptainRank(effectiveRank);
          const isSic = !isFa && (isFirstOfficerRole(effectiveRank) || !isPic);

          if (existingMap.has(key)) {
            const existingEntry = existingMap.get(key)!;
            // Only update if it was auto-generated. Don't overwrite manual edits.
            if (existingEntry.isAutoFilled) {
              existingEntry.tailNumber = leg.tailNumber || existingEntry.tailNumber;
              existingEntry.outTime = leg.actualDepTime || existingEntry.outTime;
              existingEntry.inTime = leg.actualArrTime || existingEntry.inTime;
              
              // Always refresh these calculated fields to respect the latest rank or actual block times
              existingEntry.blockMinutes = blockMins;
              existingEntry.crossCountryMinutes = blockMins;
              existingEntry.nightMinutes = nightMins;
              existingEntry.instrumentMinutes = 0; // Instrument removed per spec
              existingEntry.picMinutes = isPic ? blockMins : 0;
              existingEntry.sicMinutes = isSic ? blockMins : 0;
              existingEntry.landingsDay = isFa ? 0 : (isNightFlight ? 0 : 1);
              existingEntry.landingsNight = isFa ? 0 : (isNightFlight ? 1 : 0);
              existingEntry.approaches = 0;
            }
            return;
          }

          const entry: LogbookEntry = {
            id: `log-${dateStr}-${leg.flightNumber}-${legIdx}-${Math.floor(Math.random() * 1000)}`,
            date: dateStr,
            flightNumber: leg.flightNumber,
            tailNumber: leg.tailNumber || "Pending",
            aircraftType: seq.equipment || "",
            depAirport: leg.depAirport,
            arrAirport: leg.arrAirport,
            outTime: leg.actualDepTime || leg.depTime,
            inTime: leg.actualArrTime || leg.arrTime,
            blockMinutes: blockMins,
            nightMinutes: nightMins,
            instrumentMinutes: 0,
            crossCountryMinutes: blockMins,
            picMinutes: isPic ? blockMins : 0,
            sicMinutes: isSic ? blockMins : 0,
            dualReceivedMinutes: 0,
            landingsDay: isFa ? 0 : (isNightFlight ? 0 : 1),
            landingsNight: isFa ? 0 : (isNightFlight ? 1 : 0),
            approaches: 0,
            remarks: `Auto-populated from Sequence ${seq.sequenceNumber} (Leg ${legIdx + 1}).`,
            isAutoFilled: true,
            sourceSequenceNumber: seq.sequenceNumber,
            createdAt: new Date().toISOString(),
          };

          generated.push(entry);
        });
      });
    });

    const updated = [...generated, ...existing];
    set({ logbookEntries: updated });
    StorageAdapter.saveLogbookEntries(updated);
    safeLocalStorageSet("crewschedule_logbook", updated);
  },

  addLogbookEntry: (entry) => {
    const updated = [entry, ...get().logbookEntries];
    set({ logbookEntries: updated });
    StorageAdapter.saveLogbookEntries(updated);
    safeLocalStorageSet("crewschedule_logbook", updated);
  },

  updateLogbookEntry: (updatedEntry) => {
    const logbookEntries = get().logbookEntries.map((e) => (e.id === updatedEntry.id ? updatedEntry : e));
    
    // Two-way sync: Update matching leg in sequences
    let targetSeqId: string | null = null;
    const sequences = get().sequences.map((seq) => {
      if (updatedEntry.sourceSequenceNumber && seq.sequenceNumber !== updatedEntry.sourceSequenceNumber) {
        return seq;
      }
      let seqModified = false;
      const updatedDPs = seq.dutyPeriods.map((dp) => {
        const updatedLegs = dp.legs.map((leg) => {
          if (
            leg.flightNumber === updatedEntry.flightNumber &&
            leg.depAirport === updatedEntry.depAirport &&
            leg.arrAirport === updatedEntry.arrAirport
          ) {
            seqModified = true;
            targetSeqId = seq.id;
            return {
              ...leg,
              actualDepTime: updatedEntry.outTime,
              actualArrTime: updatedEntry.inTime,
              actualBlockMinutes: updatedEntry.blockMinutes,
              tailNumber: updatedEntry.tailNumber,
              remarks: updatedEntry.remarks,
            };
          }
          return leg;
        });
        return { ...dp, legs: updatedLegs };
      });
      return seqModified ? { ...seq, dutyPeriods: updatedDPs } : seq;
    });

    set({ logbookEntries, sequences });
    if (targetSeqId) {
      set({ selectedSequenceId: targetSeqId });
    }
    StorageAdapter.saveLogbookEntries(logbookEntries);
    StorageAdapter.saveSequences(sequences);
    safeLocalStorageSet("crewschedule_logbook", logbookEntries);
    safeLocalStorageSet("crewschedule_sequences", sequences);
  },

  deleteLogbookEntry: (id) => {
    const updated = get().logbookEntries.filter((e) => e.id !== id);
    set({ logbookEntries: updated });
    StorageAdapter.saveLogbookEntries(updated);
    safeLocalStorageSet("crewschedule_logbook", updated);
  },

  clearLogbook: () => {
    set({ logbookEntries: [] });
    StorageAdapter.saveLogbookEntries([]);
    if (typeof window !== "undefined") {
      localStorage.removeItem("crewschedule_logbook");
    }
  },

  exportLogbookCsv: (format) => {
    const entries = get().logbookEntries;
    const effectiveRank = get().payRates?.crewRole || get().userProfile?.crewRole || get().monthlyHIMetadata?.rank || "CAPT";
    const isFa = isFlightAttendantRole(effectiveRank);
    const isPic = !isFa && isCaptainRank(effectiveRank);

    if (isFa) {
      // Flight Attendant Inflight Log Format
      const headers = [
        "Date", "Flight #", "Aircraft ID", "Type", "From", "To", "Out", "In",
        "Flight Time", "Night", "Remarks"
      ];
      const rows = entries.map((e) => [
        e.date,
        e.flightNumber,
        e.tailNumber,
        e.aircraftType,
        e.depAirport,
        e.arrAirport,
        e.outTime,
        e.inTime,
        (e.blockMinutes / 60).toFixed(1),
        (e.nightMinutes / 60).toFixed(1),
        `"${(e.remarks || "").replace(/"/g, '""')}"`
      ]);
      return [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    }

    if (format === "logten") {
      const headers = [
        "Date", "Flight #", "Aircraft ID", "Type", "From", "To", "Out", "In",
        "Total Time", isPic ? "PIC" : "SIC", "Night", "Cross Country",
        "Landings Day", "Landings Night", "Remarks"
      ];
      const rows = entries.map((e) => [
        e.date,
        e.flightNumber,
        e.tailNumber,
        e.aircraftType,
        e.depAirport,
        e.arrAirport,
        e.outTime,
        e.inTime,
        (e.blockMinutes / 60).toFixed(1),
        isPic ? (e.picMinutes / 60).toFixed(1) : (e.sicMinutes / 60).toFixed(1),
        (e.nightMinutes / 60).toFixed(1),
        (e.crossCountryMinutes / 60).toFixed(1),
        e.landingsDay,
        e.landingsNight,
        `"${(e.remarks || "").replace(/"/g, '""')}"`
      ]);
      return [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    } else if (format === "foreflight") {
      const headers = [
        "Date", "Text", "AircraftID", "EquipmentType", "From", "To", "Out", "In",
        "TotalTime", isPic ? "PIC" : "SIC", "Night", "CrossCountry",
        "DayLandings", "NightLandings", "Comments"
      ];
      const rows = entries.map((e) => [
        e.date,
        e.flightNumber,
        e.tailNumber,
        e.aircraftType,
        e.depAirport,
        e.arrAirport,
        e.outTime,
        e.inTime,
        (e.blockMinutes / 60).toFixed(1),
        isPic ? (e.picMinutes / 60).toFixed(1) : (e.sicMinutes / 60).toFixed(1),
        (e.nightMinutes / 60).toFixed(1),
        (e.crossCountryMinutes / 60).toFixed(1),
        e.landingsDay,
        e.landingsNight,
        `"${(e.remarks || "").replace(/"/g, '""')}"`
      ]);
      return [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    } else {
      const headers = [
        "Date", "FlightNumber", "AircraftTail", "AircraftType", "DepAirport", "ArrAirport",
        "OutTime", "InTime", "BlockHours", isPic ? "PICHours" : "SICHours", "NightHours",
        "CrossCountryHours", "DayLandings", "NightLandings", "Remarks"
      ];
      const rows = entries.map((e) => [
        e.date,
        e.flightNumber,
        e.tailNumber,
        e.aircraftType,
        e.depAirport,
        e.arrAirport,
        e.outTime,
        e.inTime,
        (e.blockMinutes / 60).toFixed(1),
        isPic ? (e.picMinutes / 60).toFixed(1) : (e.sicMinutes / 60).toFixed(1),
        (e.nightMinutes / 60).toFixed(1),
        (e.crossCountryMinutes / 60).toFixed(1),
        e.landingsDay,
        e.landingsNight,
        `"${(e.remarks || "").replace(/"/g, '""')}"`
      ]);
      return [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    }
  },

  setMonthlyHIMetadata: (meta) => {
    set({ monthlyHIMetadata: meta });
    StorageAdapter.saveSetting("crewschedule_hi_metadata", meta);
    if (meta) {
      safeLocalStorageSet("crewschedule_hi_metadata", meta);
    } else if (typeof window !== "undefined") {
      localStorage.removeItem("crewschedule_hi_metadata");
    }
  },

  importMonthlyHISchedule: (newSeqs, newVacs, metadata, sourceFileName, rawText) => {
    if (!newSeqs || newSeqs.length === 0) {
      console.warn("[useCrewStore] importMonthlyHISchedule called with 0 sequences - aborting to preserve existing calendar.");
      return;
    }
    const state = get();
    
    // 1. Identify target month prefix (e.g. "2026-09")
    const targetMonthPrefixes = new Set<string>();
    if (metadata?.monthEnding) {
      const d = detectMonthFromText(`MONTH ENDING ${metadata.monthEnding}`);
      if (d && d.monthEnding) {
        targetMonthPrefixes.add(`${d.yearNum}-${String(d.monthNum + 1).padStart(2, "0")}`);
      }
    }
    newSeqs.forEach((s) => {
      if (s.startDate) {
        targetMonthPrefixes.add(s.startDate.substring(0, 7));
      }
    });

    const existingSeqs = [...state.sequences];

    // 2. Keep all sequences from OTHER months completely untouched
    const otherMonthSeqs = targetMonthPrefixes.size > 0
      ? existingSeqs.filter((s) => !s.startDate || !targetMonthPrefixes.has(s.startDate.substring(0, 7)))
      : [];

    // 3. In the target month(s), index existing sequences to preserve HSS legs if matching
    const existingTargetMap = new Map<string, SequenceTrip>();
    if (targetMonthPrefixes.size > 0) {
      existingSeqs
        .filter((s) => s.startDate && targetMonthPrefixes.has(s.startDate.substring(0, 7)))
        .forEach((s) => {
          const key = `${(s.sequenceNumber || "").replace(/^[A-Za-z]+/, "")}_${s.startDate}`;
          existingTargetMap.set(key, s);
        });
    }

    // 4. Build authoritative sequences for target month
    const mergedTargetSeqs: SequenceTrip[] = [];
    newSeqs.forEach((newSeq) => {
      const cleanNum = (newSeq.sequenceNumber || "").replace(/^[A-Za-z]+/, "");
      const key = `${cleanNum}_${newSeq.startDate || ""}`;
      const existing = existingTargetMap.get(key);

      if (existing) {
        const existingHasHss = (existing.dutyPeriods?.length || 0) > (newSeq.dutyPeriods?.length || 0);
        const merged: SequenceTrip = {
          ...existing,
          ...newSeq,
          startDate: existingHasHss ? existing.startDate : (newSeq.startDate || existing.startDate),
          endDate: existingHasHss ? existing.endDate : (newSeq.endDate || existing.endDate),
          dutyPeriods: existingHasHss
            ? existing.dutyPeriods
            : (newSeq.dutyPeriods && newSeq.dutyPeriods.length > 0 ? newSeq.dutyPeriods : existing.dutyPeriods || []),
          totalBlockMinutes: existingHasHss ? existing.totalBlockMinutes : (newSeq.totalBlockMinutes || existing.totalBlockMinutes),
          totalCreditMinutes: existingHasHss ? existing.totalCreditMinutes : (newSeq.totalCreditMinutes || existing.totalCreditMinutes),
          layoverCities: (existing.layoverCities && existing.layoverCities.length > 0) ? existing.layoverCities : (newSeq.layoverCities || []),
        };
        mergedTargetSeqs.push(merged);
      } else {
        mergedTargetSeqs.push(newSeq);
      }
    });

    const mergedSeqs = deduplicateSequences([...otherMonthSeqs, ...mergedTargetSeqs]);
    
    // Merge vacations across months
    const mergedVacs = [...state.vacations];
    if (newVacs && newVacs.length > 0) {
      newVacs.forEach((nv) => {
        if (!mergedVacs.some((ev) => ev.startDate === nv.startDate && ev.endDate === nv.endDate)) {
          mergedVacs.push(nv);
        }
      });
    }
    
    set({ 
      monthlyHIMetadata: metadata || state.monthlyHIMetadata,
      sequences: mergedSeqs,
      vacations: mergedVacs
    });

    StorageAdapter.saveSequences(mergedSeqs);
    StorageAdapter.saveVacations(mergedVacs);
    if (metadata) StorageAdapter.saveSetting("crewschedule_hi_metadata", metadata);

    safeLocalStorageSet("crewschedule_sequences", mergedSeqs);
    safeLocalStorageSet("crewschedule_vacations", mergedVacs);
    if (metadata) {
      safeLocalStorageSet("crewschedule_hi_metadata", metadata);
    }

    // Auto-update logbook with newly imported sequences
    get().autoGenerateLogbookFromRoster();

    const currentActiveSnap = state.snapshots.find((s) => s.id === state.activeSnapshotId) || state.snapshots[0];
    const diffs = currentActiveSnap ? diffScheduleSnapshots(currentActiveSnap.sequences, mergedSeqs) : [];

    const snapId = `snap-${Date.now()}`;
    const projectedCreditHours = metadata?.bidSelProjHours || mergedSeqs.reduce((acc, s) => acc + (s.isDropped ? 0 : s.totalCreditMinutes / 60), 0);
    const flownBlockHours = mergedSeqs.reduce((acc, s) => acc + ((s.actualBlockMinutes || 0) / 60), 0);

    const newSnapshot: ScheduleSnapshot = {
      id: snapId,
      asOfDateStr: metadata?.asOfDateStr || new Date().toISOString(),
      uploadedAt: new Date().toISOString(),
      sourceFileName: sourceFileName || "Monthly_HI.pdf",
      monthLabel: metadata?.monthEnding || "SCHEDULE",
      sequences: mergedSeqs,
      rawText: rawText,
      diffs: diffs,
      projectedCreditHours,
      flownBlockHours,
    };

    const updatedSnapshots = [newSnapshot, ...state.snapshots.filter((s) => s.id !== snapId)];
    set({ snapshots: updatedSnapshots, activeSnapshotId: snapId });
    StorageAdapter.saveSnapshots(updatedSnapshots);
    safeLocalStorageSet("crewschedule_snapshots", updatedSnapshots);

    get().addConsoleLog(`Imported ${sourceFileName}: ${mergedSeqs.length} sequence(s), ${newVacs.length} vacation block(s), ${diffs.length} diff(s).`);
  },

  addSnapshot: (snapshot) => {
    const existing = get().snapshots;
    const updated = [snapshot, ...existing.filter((s) => s.id !== snapshot.id)];
    set({ snapshots: updated });
    StorageAdapter.saveSnapshots(updated);
    safeLocalStorageSet("crewschedule_snapshots", updated);
  },

  setActiveSnapshotId: (id) => {
    set({ activeSnapshotId: id });
    if (id) {
      const snap = get().snapshots.find((s) => s.id === id);
      if (snap) {
        set({ sequences: snap.sequences });
      }
    }
  },

  setVacations: (vacations) => {
    set({ vacations });
    StorageAdapter.saveVacations(vacations);
    safeLocalStorageSet("crewschedule_vacations", vacations);
  },


  hydrate: () => {
    if (typeof window === "undefined") return;
    try {
      // 1. Instant initial sync read from localStorage for zero-flicker UI render
      const storedSeqs = localStorage.getItem("crewschedule_sequences");
      const storedVacations = localStorage.getItem("crewschedule_vacations");
      const storedRates = localStorage.getItem("crewschedule_payrates");
      const storedConfig = localStorage.getItem("crewschedule_autoconfig");
      const storedOpen = localStorage.getItem("crewschedule_opensequences");
      const storedSim = localStorage.getItem("crewschedule_simulatedids");
      const storedOverlay = localStorage.getItem("crewschedule_showoverlay");
      const storedFilter = localStorage.getItem("crewschedule_openfilter");
      const storedTurnLimits = localStorage.getItem("crewschedule_turnlimits");
      const storedDefaultTurn = localStorage.getItem("crewschedule_defaultturnlimit");
      const storedHighCredit = localStorage.getItem("crewschedule_highcreditthreshold");
      const storedSnaps = localStorage.getItem("crewschedule_snapshots");
      const storedMeta = localStorage.getItem("crewschedule_hi_metadata");
      const storedLogbook = localStorage.getItem("crewschedule_logbook");
      const storedProfile = localStorage.getItem("crewschedule_userprofile");
      const storedN6D = localStorage.getItem("crewschedule_n6d_reserves");
      const storedTurnback = localStorage.getItem("crewschedule_turnback_data");

      let sanitizedSeqs = USER_LIVE_SEQUENCES;
      if (storedSeqs) {
        try {
          const parsed = JSON.parse(storedSeqs);
          if (Array.isArray(parsed) && parsed.length > 0) {
            sanitizedSeqs = deduplicateSequences(parsed);
          }
        } catch {}
      }
      safeLocalStorageSet("crewschedule_sequences", sanitizedSeqs);

      const parsedSnaps: ScheduleSnapshot[] = storedSnaps ? JSON.parse(storedSnaps) : [];
      let parsedLogbook: LogbookEntry[] = storedLogbook ? JSON.parse(storedLogbook) : [];
      if (!parsedLogbook || parsedLogbook.length === 0) {
        parsedLogbook = DEFAULT_LOGBOOK_ENTRIES;
      }
      let activeOpenSeqs: OpenSequence[] = storedOpen ? JSON.parse(storedOpen) : [];
      if (!activeOpenSeqs || activeOpenSeqs.length === 0) {
        activeOpenSeqs = USER_LIVE_OPEN_SEQUENCES.filter((s) => !isOpenSequenceInPast(s));
      } else {
        activeOpenSeqs = activeOpenSeqs.filter((s) => !isOpenSequenceInPast(s));
      }

      const storedPresets = localStorage.getItem("crewschedule_openpresets");
      const storedCals = localStorage.getItem("crewschedule_subscribedcals");
      const storedEvents = localStorage.getItem("crewschedule_personalevents");

      const activeCals: SubscribedCalendar[] = storedCals ? JSON.parse(storedCals) : [];
      const mergedCals = [
        PILOT_BIDDING_CALENDAR,
        ...activeCals.filter((c) => c.id !== PILOT_BIDDING_CALENDAR.id),
      ];

      const activeEvents: PersonalCalendarEvent[] = storedEvents ? JSON.parse(storedEvents) : [];
      const eventMap = new Map<string, PersonalCalendarEvent>();
      DEFAULT_PILOT_BIDDING_EVENTS.forEach((e) => eventMap.set(e.id, e));
      activeEvents.forEach((e) => eventMap.set(e.id, e));
      const mergedEvents = Array.from(eventMap.values());

      let hydratedProfile = DEFAULT_USER_PROFILE;
      if (storedProfile) {
        try {
          hydratedProfile = { ...DEFAULT_USER_PROFILE, ...JSON.parse(storedProfile) };
        } catch {}
      }

      let parsedVacations: VacationPeriod[] = storedVacations ? JSON.parse(storedVacations) : [];
      if (!parsedVacations || parsedVacations.length === 0) {
        parsedVacations = USER_LIVE_VACATIONS;
      } else {
        parsedVacations = parsedVacations.map((v) => {
          if (v.startDate === "2026-08-01" && (v.endDate === "2026-08-05" || v.endDate === "2026-08-06")) {
            return { ...v, endDate: "2026-08-07", description: "Scheduled Vacation Block (01AUG26 to 07AUG26)", creditHours: 35.0 };
          }
          return v;
        });
      }

      const storedOpenLastUpdated = localStorage.getItem("crewschedule_opentime_last_updated");
      const storedHssAudits = localStorage.getItem("crewschedule_hss_audits");
      let parsedHssAudits: HssAuditRecord[] = [];
      try {
        if (storedHssAudits) parsedHssAudits = JSON.parse(storedHssAudits);
      } catch {}

      set({
        userProfile: hydratedProfile,
        sequences: sanitizedSeqs,
        vacations: parsedVacations,
        monthlyHIMetadata: storedMeta ? JSON.parse(storedMeta) : null,
        snapshots: parsedSnaps,
        hssAudits: parsedHssAudits,
        logbookEntries: parsedLogbook,
        payRates: storedRates ? JSON.parse(storedRates) : DEFAULT_PAY_RATES,
        automationConfig: storedConfig ? JSON.parse(storedConfig) : DEFAULT_AUTOMATION_CONFIG,
        openSequences: activeOpenSeqs,
        openTimeLastUpdated: storedOpenLastUpdated || (activeOpenSeqs.length > 0 ? "2026-08-19T12:18:00.000Z" : undefined),
        simulatedSequenceIds: storedSim ? JSON.parse(storedSim) : [],
        showOpenTimeOverlay: false,
        openTimeFilter: storedFilter ? JSON.parse(storedFilter) : "all",
        openTimePresets: storedPresets ? JSON.parse(storedPresets) : DEFAULT_OPEN_TIME_PRESETS,
        subscribedCalendars: mergedCals,
        personalEvents: mergedEvents,
        stationTurnLimits: storedTurnLimits ? JSON.parse(storedTurnLimits) : DEFAULT_STATION_TURN_LIMITS,
        defaultTurnLimit: storedDefaultTurn ? JSON.parse(storedDefaultTurn) : DEFAULT_TURN_LIMIT,
        highCreditThresholdHours: storedHighCredit ? JSON.parse(storedHighCredit) : 15.0,
        n6dReserves: storedN6D ? JSON.parse(storedN6D) : DEFAULT_N6D_DATA,
        turnbackData: storedTurnback ? JSON.parse(storedTurnback) : null,
        isHydrated: true,
      });

      // 2. Asynchronous IndexedDB Migration & Rehydration
      (async () => {
        try {
          await StorageAdapter.migrateFromLocalStorage();
          const idbState = await StorageAdapter.loadState();
          if (idbState) {
            const updates: Partial<CrewState> = {};
            if (idbState.sequences && idbState.sequences.length > 0) {
              updates.sequences = deduplicateSequences([
                ...USER_LIVE_SEQUENCES,
                ...idbState.sequences,
              ]);
            } else {
              updates.sequences = sanitizedSeqs;
            }
            if (idbState.snapshots && idbState.snapshots.length > 0) {
              updates.snapshots = idbState.snapshots;
            }
            if (idbState.logbookEntries && idbState.logbookEntries.length > 0) {
              updates.logbookEntries = idbState.logbookEntries;
            }
            if (idbState.vacations && idbState.vacations.length > 0) {
              updates.vacations = idbState.vacations.map((v) => {
                if (v.startDate === "2026-08-01" && (v.endDate === "2026-08-05" || v.endDate === "2026-08-06")) {
                  return { ...v, endDate: "2026-08-07", description: "Scheduled Vacation Block (01AUG26 to 07AUG26)", creditHours: 35.0 };
                }
                return v;
              });
            } else {
              updates.vacations = parsedVacations;
            }
            if (idbState.openSequences && idbState.openSequences.length > 0) {
              updates.openSequences = idbState.openSequences.filter((s) => !isOpenSequenceInPast(s));
            } else {
              updates.openSequences = activeOpenSeqs;
            }
            if (idbState.subscribedCalendars && idbState.subscribedCalendars.length > 0) {
              updates.subscribedCalendars = [
                PILOT_BIDDING_CALENDAR,
                ...idbState.subscribedCalendars.filter((c) => c.id !== PILOT_BIDDING_CALENDAR.id),
              ];
            } else {
              updates.subscribedCalendars = mergedCals;
            }
            if (idbState.personalEvents && idbState.personalEvents.length > 0) {
              const idbEventMap = new Map<string, PersonalCalendarEvent>();
              DEFAULT_PILOT_BIDDING_EVENTS.forEach((e) => idbEventMap.set(e.id, e));
              idbState.personalEvents.forEach((e) => idbEventMap.set(e.id, e));
              updates.personalEvents = Array.from(idbEventMap.values());
            } else {
              updates.personalEvents = mergedEvents;
            }
            if (Object.keys(updates).length > 0) {
              set(updates);
            }
          }
        } catch (e) {
          console.warn("[CrewStore] IndexedDB rehydration error:", e);
        }
      })();

      if (!storedLogbook || parsedLogbook.length === 0) {
        get().autoGenerateLogbookFromRoster();
      }

    } catch (e) {
      console.error("Failed to hydrate localStorage state", e);
      set({ isHydrated: true });
    }
  },

  setStationTurnLimit: (station, limitMinutes) => {
    const uppercaseStation = station.toUpperCase().trim();
    if (!uppercaseStation) return;
    const updated = { ...get().stationTurnLimits, [uppercaseStation]: limitMinutes };
    set({ stationTurnLimits: updated });
    StorageAdapter.saveSetting("crewschedule_turnlimits", updated);
    safeLocalStorageSet("crewschedule_turnlimits", updated);
  },

  removeStationTurnLimit: (station) => {
    const uppercaseStation = station.toUpperCase().trim();
    const updated = { ...get().stationTurnLimits };
    delete updated[uppercaseStation];
    set({ stationTurnLimits: updated });
    StorageAdapter.saveSetting("crewschedule_turnlimits", updated);
    safeLocalStorageSet("crewschedule_turnlimits", updated);
  },

  setDefaultTurnLimit: (limitMinutes) => {
    set({ defaultTurnLimit: limitMinutes });
    StorageAdapter.saveSetting("crewschedule_defaultturnlimit", limitMinutes);
    safeLocalStorageSet("crewschedule_defaultturnlimit", limitMinutes);
  },

  resetStationTurnLimits: () => {
    set({
      stationTurnLimits: DEFAULT_STATION_TURN_LIMITS,
      defaultTurnLimit: DEFAULT_TURN_LIMIT,
      highCreditThresholdHours: 15.0,
    });
    StorageAdapter.saveSetting("crewschedule_turnlimits", DEFAULT_STATION_TURN_LIMITS);
    StorageAdapter.saveSetting("crewschedule_defaultturnlimit", DEFAULT_TURN_LIMIT);
    StorageAdapter.saveSetting("crewschedule_highcreditthreshold", 15.0);
    safeLocalStorageSet("crewschedule_turnlimits", DEFAULT_STATION_TURN_LIMITS);
    safeLocalStorageSet("crewschedule_defaultturnlimit", DEFAULT_TURN_LIMIT);
    safeLocalStorageSet("crewschedule_highcreditthreshold", 15.0);
  },

  setHighCreditThresholdHours: (hours) => {
    const val = Math.max(1, Math.min(100, hours));
    set({ highCreditThresholdHours: val });
    StorageAdapter.saveSetting("crewschedule_highcreditthreshold", val);
    safeLocalStorageSet("crewschedule_highcreditthreshold", val);
  },

  setSequences: (sequences) => {
    const clean = deduplicateSequences(sequences);
    set({ sequences: clean });
    StorageAdapter.saveSequences(clean);
    safeLocalStorageSet("crewschedule_sequences", clean);
    get().autoGenerateLogbookFromRoster();
  },

  addSequences: (newSeqs) => {
    const clean = deduplicateSequences([...get().sequences, ...newSeqs]);
    set({ sequences: clean });
    StorageAdapter.saveSequences(clean);
    safeLocalStorageSet("crewschedule_sequences", clean);
    get().autoGenerateLogbookFromRoster();
  },

  resetScheduleToDefaults: () => {
    const cleanSeqs = deduplicateSequences(USER_LIVE_SEQUENCES);
    set({
      sequences: cleanSeqs,
      vacations: USER_LIVE_VACATIONS,
      monthlyHIMetadata: null,
      showOpenTimeOverlay: false,
    });
    StorageAdapter.saveSequences(cleanSeqs);
    StorageAdapter.saveVacations(USER_LIVE_VACATIONS);
    safeLocalStorageSet("crewschedule_sequences", cleanSeqs);
    safeLocalStorageSet("crewschedule_vacations", USER_LIVE_VACATIONS);
    safeLocalStorageSet("crewschedule_showoverlay", false);
    get().autoGenerateLogbookFromRoster();
  },

  updateSequence: (updated) => {
    const cleanUpdated = sanitizeSequenceTrip(updated);
    const seqs = get().sequences.map((s) => (s.id === cleanUpdated.id ? cleanUpdated : s));
    const cleanSeqs = deduplicateSequences(seqs);
    set({ sequences: cleanSeqs });
    StorageAdapter.saveSequences(cleanSeqs);
    safeLocalStorageSet("crewschedule_sequences", cleanSeqs);
    get().autoGenerateLogbookFromRoster();
  },

  mergeHssIntoSequence: (sequenceNumber: string, hssData: any) => {
    const existingSeqs = get().sequences;
    const cleanSeqNum = (sequenceNumber || hssData?.sequenceNumber || "").replace(/^[A-Za-z]+/, "");

    // 1. Identify all existing sequences that match this specific pairing
    let bestMatchIndex = -1;
    let fallbackMatchIndex = -1;

    const hssStartMonth = hssData?.startDate ? hssData.startDate.slice(0, 7) : "";
    const hssEndMonth = hssData?.endDate ? hssData.endDate.slice(0, 7) : "";
    const hssDay = hssData?.startDate ? parseInt(hssData.startDate.substring(8, 10), 10) : -1;

    existingSeqs.forEach((s, idx) => {
      const sClean = (s.sequenceNumber || "").replace(/^[A-Za-z]+/, "");
      const isSameSeqNum = sClean.length > 0 && cleanSeqNum.length > 0 && sClean === cleanSeqNum;
      if (!isSameSeqNum) return;

      const sMonth = s.startDate ? s.startDate.slice(0, 7) : "";
      const sDay = s.startDate ? parseInt(s.startDate.substring(8, 10), 10) : -1;

      // Strict Month matching: A sequence in August must NEVER match a sequence in September
      const isSameMonth = (sMonth && hssStartMonth && sMonth === hssStartMonth) || (sMonth && hssEndMonth && sMonth === hssEndMonth);
      if (!isSameMonth && hssStartMonth) {
        // Different month: Do not match, this is a separate trip in a different bid month
        return;
      }

      const isSameDay = sDay > 0 && hssDay > 0 && Math.abs(sDay - hssDay) <= 1;

      if (isSameMonth && isSameDay) {
        bestMatchIndex = idx;
      } else if (isSameMonth && bestMatchIndex === -1) {
        bestMatchIndex = idx;
      }
    });

    const targetIndex = bestMatchIndex;

    let mergedSeq: SequenceTrip;
    let newSeqsList: SequenceTrip[];

    if (targetIndex !== -1) {
      const existingPrimary = existingSeqs[targetIndex];

      // Perform granular HSS audit diff before mutating
      try {
        const audit = HssDiffEngine.computeDiff(existingPrimary, hssData, "DECS_HSS_IMPORT");
        if (audit && audit.changesDetected.length > 0) {
          get().addHssAudit(audit);
        }
      } catch (e) {
        console.warn("[useCrewStore] HSS diff audit exception:", e);
      }

      const targetStartDate = hssData?.startDate || existingPrimary.startDate;
      const targetEndDate = hssData?.endDate || existingPrimary.endDate;

      mergedSeq = sanitizeSequenceTrip({
        ...existingPrimary,
        sequenceNumber: sequenceNumber || hssData?.sequenceNumber || existingPrimary.sequenceNumber,
        dutyPeriods: (hssData?.dutyPeriods && hssData.dutyPeriods.length > 0) ? hssData.dutyPeriods : existingPrimary.dutyPeriods,
        totalBlockMinutes: hssData?.totalBlockMinutes || existingPrimary.totalBlockMinutes,
        totalCreditMinutes: hssData?.totalCreditMinutes || existingPrimary.totalCreditMinutes,
        startDate: targetStartDate,
        endDate: targetEndDate,
        ...(hssData?.expTafbHours && { expTafbHours: hssData.expTafbHours }),
        ...(hssData?.rank && { rank: hssData.rank }),
        ...(hssData?.base && { base: hssData.base }),
        ...(hssData?.equipment && { equipment: hssData.equipment }),
        ...(hssData?.layoverCities && hssData.layoverCities.length > 0 && { layoverCities: hssData.layoverCities }),
      });

      // Surgically update ONLY targetIndex to preserve all other multi-month sequences
      newSeqsList = existingSeqs.map((s, idx) => (idx === targetIndex ? mergedSeq : s));
    } else {
      // No existing sequence found in this month: Create and append new authoritative SequenceTrip directly from HSS
      const colors = ["sky", "emerald", "amber", "rose", "cyan", "sky"];
      const colorTag = colors[parseInt(cleanSeqNum || "0", 10) % colors.length];

      mergedSeq = sanitizeSequenceTrip({
        id: `${sequenceNumber || hssData?.sequenceNumber || "hss"}-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        sequenceNumber: sequenceNumber || hssData?.sequenceNumber || "10001",
        rank: hssData?.rank || get().monthlyHIMetadata?.rank || get().userProfile?.crewRole || "CA",
        startDate: hssData?.startDate || new Date().toISOString().split("T")[0],
        endDate: hssData?.endDate || hssData?.startDate || new Date().toISOString().split("T")[0],
        base: hssData?.base || "ORD",
        equipment: hssData?.equipment || "E75",
        totalBlockMinutes: hssData?.totalBlockMinutes || 0,
        totalCreditMinutes: hssData?.totalCreditMinutes || Math.max(hssData?.totalBlockMinutes || 0, (hssData?.dutyPeriods?.length || 1) * 300),
        expTafbHours: hssData?.expTafbHours,
        layoverCities: hssData?.layoverCities || [],
        dutyPeriods: hssData?.dutyPeriods || [],
        statusTag: ["21514", "21614", "21566"].includes(cleanSeqNum) ? "OT" : (cleanSeqNum === "21649" ? "TT" : "SKD"),
        colorTag: ["21514", "21614", "21566"].includes(cleanSeqNum) ? "amber" : colorTag,
        isOvertime: ["21514", "21614", "21566"].includes(cleanSeqNum),
        isDropped: false,
      });

      newSeqsList = [...existingSeqs, mergedSeq];
    }

    const finalSeqs = deduplicateSequences(newSeqsList);

    // Also enrich openSequences so Open Time cards get exact flight legs & layover hotels
    const existingOpen = get().openSequences;
    let updatedOpen = existingOpen;
    if (existingOpen && existingOpen.length > 0) {
      updatedOpen = existingOpen.map((ot) => {
        const otClean = (ot.sequenceNumber || "").replace(/^[A-Za-z]+/, "");
        if (
          ot.sequenceNumber.toLowerCase() === (sequenceNumber || "").toLowerCase() ||
          (cleanSeqNum.length > 0 && cleanSeqNum === otClean)
        ) {
          let legsDesc = ot.legsDescription;
          if (hssData?.dutyPeriods && hssData.dutyPeriods.length > 0) {
            const legStrs: string[] = [];
            hssData.dutyPeriods.forEach((dp: any) => {
              if (dp.legs) {
                dp.legs.forEach((l: any) => {
                  legStrs.push(`${l.flightNumber} ${l.depAirport}-${l.arrAirport}`);
                });
              }
            });
            if (legStrs.length > 0) legsDesc = legStrs.join(" • ");
          }

          let layoverDesc = ot.layoverDescription;
          if (hssData?.layoverCities && hssData.layoverCities.length > 0) {
            layoverDesc = hssData.layoverCities.join(" • ");
          }

          return {
            ...ot,
            legsDescription: legsDesc || ot.legsDescription,
            layoverDescription: layoverDesc || ot.layoverDescription,
            dutyPeriods: hssData?.dutyPeriods || (ot as any).dutyPeriods,
            ...(hssData?.totalCreditMinutes && { creditHours: hssData.totalCreditMinutes / 60.0 }),
            ...(hssData?.base && { base: hssData.base }),
            ...(hssData?.equipment && { equipment: hssData.equipment }),
            ...(hssData?.reportTime && { reportTime: hssData.reportTime }),
            ...(hssData?.releaseTime && { releaseTime: hssData.releaseTime }),
          };
        }
        return ot;
      });
      safeLocalStorageSet("crewschedule_opensequences", updatedOpen);
    }

    set({ sequences: finalSeqs, openSequences: updatedOpen });
    StorageAdapter.saveSequences(finalSeqs);
    safeLocalStorageSet("crewschedule_sequences", finalSeqs);
    get().autoGenerateLogbookFromRoster();
  },

  deleteSequence: (id) => {
    const seqs = get().sequences.filter((s) => s.id !== id);
    set({ sequences: seqs });
    StorageAdapter.saveSequences(seqs);
    safeLocalStorageSet("crewschedule_sequences", seqs);
    get().autoGenerateLogbookFromRoster();
  },

  setPayRates: (rates) => {
    const updated = { ...get().payRates, ...rates };
    set({ payRates: updated });
    StorageAdapter.saveSetting("crewschedule_payrates", updated);
    safeLocalStorageSet("crewschedule_payrates", updated);
    if (rates.crewRole !== undefined) {
      get().autoGenerateLogbookFromRoster();
    }
  },

  setSelectedSequenceId: (id) => {
    set({ selectedSequenceId: id });
  },

  updateAutomationConfig: (cfg) => {
    const updated = { ...get().automationConfig, ...cfg };
    set({ automationConfig: updated });
    StorageAdapter.saveSetting("crewschedule_autoconfig", updated);
    safeLocalStorageSet("crewschedule_autoconfig", updated);
  },

  addConsoleLog: (log) =>
    set((state) => ({
      consoleLogs: [...state.consoleLogs, `[${new Date().toLocaleTimeString()}] ${log}`].slice(-200),
    })),
  clearConsoleLogs: () => set({ consoleLogs: [] }),

  addLogicLog: (entry) =>
    set((state) => {
      const newEntry: LogicLogEntry = {
        ...entry,
        id: Math.random().toString(36).substring(2, 9),
        timestamp: new Date().toISOString()
      };
      return { logicLogs: [...state.logicLogs, newEntry].slice(-1000) };
    }),
  clearLogicLogs: () => set({ logicLogs: [] }),

  setActiveTab: (tab) => set({ activeTab: tab }),

  clearAll: () => {
    set({
      sequences: [],
      logbookEntries: [],
      payRates: DEFAULT_PAY_RATES,
      selectedSequenceId: null,
      consoleLogs: [],
      simulatedSequenceIds: [],
      openSequences: [],
      vacations: [],
      snapshots: [],
      monthlyHIMetadata: null,
    });
    StorageAdapter.clearAll();
    if (typeof window !== "undefined") {
      localStorage.removeItem("crewschedule_sequences");
      localStorage.removeItem("crewschedule_logbook");
      localStorage.removeItem("crewschedule_payrates");
      localStorage.removeItem("crewschedule_simulatedids");
      localStorage.removeItem("crewschedule_opensequences");
      localStorage.removeItem("crewschedule_vacations");
      localStorage.removeItem("crewschedule_snapshots");
      localStorage.removeItem("crewschedule_hi_metadata");
      localStorage.removeItem("crewschedule_subscribedcals");
      localStorage.removeItem("crewschedule_personalevents");
    }
  },

  setOpenSequences: (newOpenSeqs) => {
    const existing = get().openSequences;
    const { reconciled, deletedCount } = reconcileOpenSequences(existing, newOpenSeqs);
    const ts = new Date().toISOString();
    set({ openSequences: reconciled, openTimeLastUpdated: ts });
    StorageAdapter.saveOpenSequences(reconciled);
    safeLocalStorageSet("crewschedule_opensequences", reconciled);
    safeLocalStorageSet("crewschedule_opentime_last_updated", ts);
    get().addConsoleLog(`[OpenTime] Synced: ${reconciled.length} active trip(s). Removed ${deletedCount} unlisted/past trip(s).`);
  },

  importN4OpenTime: (rawN4Text) => {
    const parsedNew = parseN4OpenTime(rawN4Text);
    const existing = get().openSequences;
    const { reconciled, deletedCount } = reconcileOpenSequences(existing, parsedNew);
    const ts = new Date().toISOString();

    set({ openSequences: reconciled, openTimeLastUpdated: ts });
    StorageAdapter.saveOpenSequences(reconciled);
    safeLocalStorageSet("crewschedule_opensequences", reconciled);
    safeLocalStorageSet("crewschedule_opentime_last_updated", ts);
    get().addConsoleLog(`[OpenTime] N4 Sync: ${reconciled.length} active trip(s). Removed ${deletedCount} unlisted/past trip(s).`);
  },

  toggleSimulateSequence: (id) => {
    const current = get().simulatedSequenceIds;
    const updated = current.includes(id) 
      ? current.filter((x) => x !== id) 
      : [...current, id];
    
    set({ simulatedSequenceIds: updated });
    StorageAdapter.saveSetting("crewschedule_simulatedids", updated);
    safeLocalStorageSet("crewschedule_simulatedids", updated);
  },

  clearSimulatedSequences: () => {
    set({ simulatedSequenceIds: [] });
    StorageAdapter.saveSetting("crewschedule_simulatedids", []);
    safeLocalStorageSet("crewschedule_simulatedids", []);
  },

  setShowOpenTimeOverlay: (showOpenTimeOverlay) => {
    set({ showOpenTimeOverlay });
    StorageAdapter.saveSetting("crewschedule_showoverlay", showOpenTimeOverlay);
    safeLocalStorageSet("crewschedule_showoverlay", showOpenTimeOverlay);
  },

  setOpenTimeFilter: (openTimeFilter) => {
    set({ openTimeFilter });
    StorageAdapter.saveSetting("crewschedule_openfilter", openTimeFilter);
    safeLocalStorageSet("crewschedule_openfilter", openTimeFilter);
  },

  addOpenTimePreset: (preset) => {
    const updated = [...get().openTimePresets.filter((p) => p.id !== preset.id), preset];
    set({ openTimePresets: updated, openTimeFilter: preset.id });
    StorageAdapter.saveSetting("crewschedule_openpresets", updated);
    StorageAdapter.saveSetting("crewschedule_openfilter", preset.id);
    safeLocalStorageSet("crewschedule_openpresets", updated);
    safeLocalStorageSet("crewschedule_openfilter", preset.id);
  },

  removeOpenTimePreset: (id) => {
    const updated = get().openTimePresets.filter((p) => p.id !== id);
    const nextFilter = get().openTimeFilter === id ? "all" : get().openTimeFilter;
    set({ openTimePresets: updated, openTimeFilter: nextFilter });
    StorageAdapter.saveSetting("crewschedule_openpresets", updated);
    StorageAdapter.saveSetting("crewschedule_openfilter", nextFilter);
    safeLocalStorageSet("crewschedule_openpresets", updated);
    safeLocalStorageSet("crewschedule_openfilter", nextFilter);
  },

  addSubscribedCalendar: (cal, newEvents = []) => {
    const updatedCals = [...get().subscribedCalendars.filter((c) => c.id !== cal.id), cal];
    const updatedEvents = [...get().personalEvents.filter((e) => e.calendarId !== cal.id), ...newEvents];
    set({ subscribedCalendars: updatedCals, personalEvents: updatedEvents });
    StorageAdapter.saveSubscribedCalendars(updatedCals);
    StorageAdapter.savePersonalEvents(updatedEvents);
    safeLocalStorageSet("crewschedule_subscribedcals", updatedCals);
    safeLocalStorageSet("crewschedule_personalevents", updatedEvents);
  },

  removeSubscribedCalendar: (id) => {
    const updatedCals = get().subscribedCalendars.filter((c) => c.id !== id);
    const updatedEvents = get().personalEvents.filter((e) => e.calendarId !== id);
    set({ subscribedCalendars: updatedCals, personalEvents: updatedEvents });
    StorageAdapter.saveSubscribedCalendars(updatedCals);
    StorageAdapter.savePersonalEvents(updatedEvents);
    safeLocalStorageSet("crewschedule_subscribedcals", updatedCals);
    safeLocalStorageSet("crewschedule_personalevents", updatedEvents);
  },

  toggleSubscribedCalendar: (id) => {
    const updatedCals = get().subscribedCalendars.map((c) =>
      c.id === id ? { ...c, enabled: !c.enabled } : c
    );
    set({ subscribedCalendars: updatedCals });
    StorageAdapter.saveSubscribedCalendars(updatedCals);
    safeLocalStorageSet("crewschedule_subscribedcals", updatedCals);
  },

  addPersonalEvent: (event) => {
    const updated = [event, ...get().personalEvents];
    set({ personalEvents: updated });
    StorageAdapter.savePersonalEvents(updated);
    safeLocalStorageSet("crewschedule_personalevents", updated);
  },

  updatePersonalEvent: (updatedEvent) => {
    const updated = get().personalEvents.map((e) => (e.id === updatedEvent.id ? updatedEvent : e));
    set({ personalEvents: updated });
    StorageAdapter.savePersonalEvents(updated);
    safeLocalStorageSet("crewschedule_personalevents", updated);
  },

  deletePersonalEvent: (id) => {
    const updated = get().personalEvents.filter((e) => e.id !== id);
    set({ personalEvents: updated });
    StorageAdapter.savePersonalEvents(updated);
    safeLocalStorageSet("crewschedule_personalevents", updated);
  },

  publishScheduleToFamilyFeed: async () => {
    try {
      const state = get();
      const token = `crew-${state.userProfile.employeeId || "742840"}`;
      const payload = {
        token,
        sequences: state.sequences,
        personalEvents: state.personalEvents,
        userProfile: state.userProfile,
        payRates: state.payRates,
      };

      const res = await fetch("/api/calendar/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      return res.ok;
    } catch (e) {
      console.warn("Could not publish schedule to family feed", e);
      return false;
    }
  },

  updateSubscribedCalendarColor: (id, color) => {
    const updatedCals = get().subscribedCalendars.map((c) =>
      c.id === id ? { ...c, color } : c
    );
    const updatedEvents = get().personalEvents.map((e) =>
      e.calendarId === id ? { ...e, color } : e
    );
    set({ subscribedCalendars: updatedCals, personalEvents: updatedEvents });
    StorageAdapter.saveSubscribedCalendars(updatedCals);
    StorageAdapter.savePersonalEvents(updatedEvents);
    safeLocalStorageSet("crewschedule_subscribedcals", updatedCals);
    safeLocalStorageSet("crewschedule_personalevents", updatedEvents);
  },

  getEffectiveSequences: () => {
    const seqs = get().sequences;
    const ots = get().openSequences;
    const simIds = get().simulatedSequenceIds;
    const simulatedTrips = ots
      .filter((ot) => simIds.includes(ot.id))
      .map((ot) => ({ ...convertOpenToTrip(ot), isSimulated: true }));
    
    const combined = [...seqs, ...simulatedTrips];
    const uniqueMap = new Map<string, SequenceTrip>();
    combined.forEach((s) => {
      // Key by sequenceNumber + startDate (or unique id) so repeat trips in different weeks are preserved
      const key = s.startDate ? `${s.sequenceNumber}-${s.startDate}` : (s.id || s.sequenceNumber);
      uniqueMap.set(key, s);
    });
    return Array.from(uniqueMap.values());
  },

  getTotalTafbHours: () => {
    const seqs = get().getEffectiveSequences();
    return seqs.reduce((acc, s) => acc + calculateSequenceTAFB(s), 0);
  },

  getPayCalculations: () => {
    const seqs = get().getEffectiveSequences();
    const rates = get().payRates;
    return calculatePay(seqs, rates);
  },

  getRosterMetrics: () => {
    const seqs = get().getEffectiveSequences();
    const rawText = get().snapshots[0]?.rawText || "";
    return computeRosterMetrics(seqs, rawText);
  },

  getBlockAndOtStats: () => {
    const m = get().getRosterMetrics();
    const rates = get().payRates;
    return {
      currentFlownBlockHours: m.flownBlockHours,
      remainingBlockHours: m.toBeFlownBlockHours,
      projectedTotalBlockHours: m.totalBlockHours,
      overtimeTripsCount: m.overtimeTripsCount,
      overtimeCreditHours: m.overtimeCreditHours,
      overtimeProjectedPay: m.overtimeCreditHours * rates.hourlyRate,
    };
  },
}));

if (typeof window !== "undefined") {
  (window as any).__CREW_STORE__ = useCrewStore;
}

