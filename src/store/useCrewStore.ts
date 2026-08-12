import { create } from "zustand";
import { SequenceTrip, PayRates, AutomationConfig, PayCalculations, OpenSequence, RosterMetrics, ScheduleSnapshot, ScheduleDiffItem, VacationPeriod, MonthlyHIMetadata, LogbookEntry, OpenTimePreset, SubscribedCalendar, PersonalCalendarEvent, LogicLogEntry } from "../types";
import { DEFAULT_PAY_RATES } from "../lib/demoData";

import { calculatePay, calculateSequenceTAFB, parseRawSchedule, parseN4OpenTime, convertOpenToTrip, computeRosterMetrics, diffScheduleSnapshots, timeToMinutes } from "../lib/parser";
export { convertOpenToTrip };

export const DEFAULT_OPEN_TIME_PRESETS: OpenTimePreset[] = [
  { id: "all", name: "All Open Trips" },
  { id: "fits", name: "Fits Schedule Only", fitsOnly: true },
  { id: "turns-3h", name: "⚡ Turns > 3.0h Credit", minCreditHours: 3.0, maxTripDays: 1 },
  { id: "turns-only", name: "☀️ 1-Day Turns Only", maxTripDays: 1 },
  { id: "layovers-2d", name: "🌙 2-Day Trips", maxTripDays: 2 },
  { id: "high-credit", name: "🚀 Credit > 8.0h", minCreditHours: 8.0 },
];

interface CrewState {
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
    if (s && s.sequenceNumber && s.startDate) {
      const key = `${s.sequenceNumber}-${s.startDate}`;
      map.set(key, s);
    } else if (s && s.sequenceNumber) {
      map.set(s.sequenceNumber, s);
    }
  });
  return Array.from(map.values());
};

export const useCrewStore = create<CrewState>((set, get) => ({
  sequences: [],
  vacations: [],
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
  logbookEntries: [],
  openSequences: [],
  simulatedSequenceIds: [],
  showOpenTimeOverlay: false,
  openTimeFilter: "all",
  openTimePresets: DEFAULT_OPEN_TIME_PRESETS,
  subscribedCalendars: [],
  personalEvents: [],
  showDtsDropped: true, // Default to true so all roster trips and trades remain visible on calendar
  setShowDtsDropped: (val: boolean) => set({ showDtsDropped: val }),
  toggleShowDtsDropped: () => set((state) => ({ showDtsDropped: !state.showDtsDropped })),
  isCalendarToolsOpen: false,
  setIsCalendarToolsOpen: (val: boolean) => set({ isCalendarToolsOpen: val }),

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

  autoGenerateLogbookFromRoster: () => {
    const sequences = get().sequences;
    const existing = get().logbookEntries;
    const existingMap = new Map(existing.map((e) => [`${e.date}-${e.flightNumber}-${e.depAirport}-${e.arrAirport}`, e]));

    const generated: LogbookEntry[] = [];

    sequences.forEach((seq) => {
      if (seq.isDropped || seq.statusTag === "DROP" || seq.statusTag === "DTS DROP") return;

      const baseDate = new Date(seq.startDate);

      seq.dutyPeriods.forEach((dp, dpIdx) => {
        const legDate = new Date(baseDate);
        legDate.setDate(legDate.getDate() + dpIdx);
        const dateStr = legDate.toISOString().split("T")[0];

        dp.legs.forEach((leg, legIdx) => {
          const key = `${dateStr}-${leg.flightNumber}-${leg.depAirport}-${leg.arrAirport}`;
          if (existingMap.has(key)) return;

          const blockMins = leg.actualBlockMinutes ?? leg.blockMinutes;
          const depMins = timeToMinutes(leg.depTime);
          const arrMins = timeToMinutes(leg.arrTime);
          const isNightFlight = depMins >= 1200 || depMins <= 360 || arrMins >= 1200 || arrMins <= 360;
          const nightMins = isNightFlight ? Math.round(blockMins * 0.6) : 0;
          const instMins = Math.round(blockMins * 0.15);
          const isPic = get().monthlyHIMetadata?.rank === "CAPT" || get().monthlyHIMetadata?.rank === "CA";

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
            instrumentMinutes: instMins,
            crossCountryMinutes: blockMins,
            picMinutes: isPic ? blockMins : 0,
            sicMinutes: !isPic ? blockMins : 0,
            dualReceivedMinutes: 0,
            landingsDay: isNightFlight ? 0 : 1,
            landingsNight: isNightFlight ? 1 : 0,
            approaches: instMins > 0 ? 1 : 0,
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
    if (typeof window !== "undefined") {
      localStorage.setItem("crewschedule_logbook", JSON.stringify(updated));
    }
  },

  addLogbookEntry: (entry) => {
    const updated = [entry, ...get().logbookEntries];
    set({ logbookEntries: updated });
    if (typeof window !== "undefined") {
      localStorage.setItem("crewschedule_logbook", JSON.stringify(updated));
    }
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
    if (typeof window !== "undefined") {
      localStorage.setItem("crewschedule_logbook", JSON.stringify(logbookEntries));
      localStorage.setItem("crewschedule_sequences", JSON.stringify(sequences));
    }
  },

  deleteLogbookEntry: (id) => {
    const updated = get().logbookEntries.filter((e) => e.id !== id);
    set({ logbookEntries: updated });
    if (typeof window !== "undefined") {
      localStorage.setItem("crewschedule_logbook", JSON.stringify(updated));
    }
  },

  clearLogbook: () => {
    set({ logbookEntries: [] });
    if (typeof window !== "undefined") {
      localStorage.removeItem("crewschedule_logbook");
    }
  },

  exportLogbookCsv: (format) => {
    const entries = get().logbookEntries;
    if (format === "logten") {
      const headers = [
        "Date", "Flight #", "Aircraft ID", "Type", "From", "To", "Out", "In",
        "Total Time", "PIC", "SIC", "Night", "Instrument", "Cross Country",
        "Landings Day", "Landings Night", "Approaches", "Remarks"
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
        (e.picMinutes / 60).toFixed(1),
        (e.sicMinutes / 60).toFixed(1),
        (e.nightMinutes / 60).toFixed(1),
        (e.instrumentMinutes / 60).toFixed(1),
        (e.crossCountryMinutes / 60).toFixed(1),
        e.landingsDay,
        e.landingsNight,
        e.approaches,
        `"${(e.remarks || "").replace(/"/g, '""')}"`
      ]);
      return [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    } else if (format === "foreflight") {
      const headers = [
        "Date", "Text", "AircraftID", "EquipmentType", "From", "To", "Out", "In",
        "TotalTime", "PIC", "SIC", "Night", "ActualInstrument", "CrossCountry",
        "DayLandings", "NightLandings", "Approach1", "Comments"
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
        (e.picMinutes / 60).toFixed(1),
        (e.sicMinutes / 60).toFixed(1),
        (e.nightMinutes / 60).toFixed(1),
        (e.instrumentMinutes / 60).toFixed(1),
        (e.crossCountryMinutes / 60).toFixed(1),
        e.landingsDay,
        e.landingsNight,
        e.approaches > 0 ? "ILS" : "",
        `"${(e.remarks || "").replace(/"/g, '""')}"`
      ]);
      return [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    } else {
      const headers = [
        "Date", "FlightNumber", "AircraftTail", "AircraftType", "DepAirport", "ArrAirport",
        "OutTime", "InTime", "BlockHours", "PICHours", "SICHours", "NightHours",
        "InstrumentHours", "CrossCountryHours", "DayLandings", "NightLandings", "Approaches", "Remarks"
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
        (e.picMinutes / 60).toFixed(1),
        (e.sicMinutes / 60).toFixed(1),
        (e.nightMinutes / 60).toFixed(1),
        (e.instrumentMinutes / 60).toFixed(1),
        (e.crossCountryMinutes / 60).toFixed(1),
        e.landingsDay,
        e.landingsNight,
        e.approaches,
        `"${(e.remarks || "").replace(/"/g, '""')}"`
      ]);
      return [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    }
  },

  setMonthlyHIMetadata: (meta) => {
    set({ monthlyHIMetadata: meta });
    if (typeof window !== "undefined") {
      if (meta) {
        localStorage.setItem("crewschedule_hi_metadata", JSON.stringify(meta));
      } else {
        localStorage.removeItem("crewschedule_hi_metadata");
      }
    }
  },

  importMonthlyHISchedule: (newSeqs, newVacs, metadata, sourceFileName, rawText) => {
    const state = get();
    
    // Find the months covered by the new pull (YYYY-MM)
    const importedMonths = new Set<string>();
    newSeqs.forEach(s => {
      if (s.startDate) {
        importedMonths.add(s.startDate.substring(0, 7));
      }
    });

    // Keep existing sequences that are NOT in the imported months
    const preservedSeqs = state.sequences.filter(s => {
      if (!s.startDate) return false;
      return !importedMonths.has(s.startDate.substring(0, 7));
    });

    const mergedSeqs = deduplicateSequences([...preservedSeqs, ...newSeqs]);
    
    set({ monthlyHIMetadata: metadata });
    if (typeof window !== "undefined" && metadata) {
      localStorage.setItem("crewschedule_hi_metadata", JSON.stringify(metadata));
    }

    set({ sequences: mergedSeqs, vacations: newVacs.length > 0 ? newVacs : state.vacations });
    if (typeof window !== "undefined") {
      localStorage.setItem("crewschedule_sequences", JSON.stringify(mergedSeqs));
      if (newVacs.length > 0) {
        localStorage.setItem("crewschedule_vacations", JSON.stringify(newVacs));
      }
    }

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
    if (typeof window !== "undefined") {
      localStorage.setItem("crewschedule_snapshots", JSON.stringify(updatedSnapshots));
    }

    get().addConsoleLog(`Imported ${sourceFileName}: ${mergedSeqs.length} sequence(s), ${newVacs.length} vacation block(s), ${diffs.length} diff(s).`);
  },

  addSnapshot: (snapshot) => {
    const existing = get().snapshots;
    const updated = [snapshot, ...existing.filter((s) => s.id !== snapshot.id)];
    set({ snapshots: updated });
    if (typeof window !== "undefined") {
      localStorage.setItem("crewschedule_snapshots", JSON.stringify(updated));
    }
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
    if (typeof window !== "undefined") {
      localStorage.setItem("crewschedule_vacations", JSON.stringify(vacations));
    }
  },


  hydrate: () => {
    if (typeof window === "undefined") return;
    try {
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

      let sanitizedSeqs = storedSeqs ? deduplicateSequences(JSON.parse(storedSeqs)) : [];

      const parsedSnaps: ScheduleSnapshot[] = storedSnaps ? JSON.parse(storedSnaps) : [];
      const parsedLogbook: LogbookEntry[] = storedLogbook ? JSON.parse(storedLogbook) : [];
      const activeOpenSeqs: OpenSequence[] = [];

      const storedPresets = localStorage.getItem("crewschedule_openpresets");
      const storedCals = localStorage.getItem("crewschedule_subscribedcals");
      const storedEvents = localStorage.getItem("crewschedule_personalevents");

      let activeEvents: PersonalCalendarEvent[] = storedEvents ? JSON.parse(storedEvents) : [];
      const activeCals: SubscribedCalendar[] = storedCals ? JSON.parse(storedCals) : [];

      set({
        sequences: sanitizedSeqs,
        vacations: storedVacations ? JSON.parse(storedVacations) : [],
        monthlyHIMetadata: storedMeta ? JSON.parse(storedMeta) : null,
        snapshots: parsedSnaps,
        logbookEntries: parsedLogbook,
        payRates: storedRates ? JSON.parse(storedRates) : DEFAULT_PAY_RATES,
        automationConfig: storedConfig ? JSON.parse(storedConfig) : DEFAULT_AUTOMATION_CONFIG,
        openSequences: activeOpenSeqs,
        simulatedSequenceIds: storedSim ? JSON.parse(storedSim) : [],
        showOpenTimeOverlay: storedOverlay ? JSON.parse(storedOverlay) : false,
        openTimeFilter: storedFilter ? JSON.parse(storedFilter) : "all",
        openTimePresets: storedPresets ? JSON.parse(storedPresets) : DEFAULT_OPEN_TIME_PRESETS,
        subscribedCalendars: activeCals,
        personalEvents: activeEvents,
        stationTurnLimits: storedTurnLimits ? JSON.parse(storedTurnLimits) : DEFAULT_STATION_TURN_LIMITS,
        defaultTurnLimit: storedDefaultTurn ? JSON.parse(storedDefaultTurn) : DEFAULT_TURN_LIMIT,
        highCreditThresholdHours: storedHighCredit ? JSON.parse(storedHighCredit) : 15.0,
        isHydrated: true,
      });

      localStorage.setItem("crewschedule_sequences", JSON.stringify(sanitizedSeqs));
      localStorage.setItem("crewschedule_opensequences", JSON.stringify(activeOpenSeqs));
      localStorage.setItem("crewschedule_subscribedcals", JSON.stringify(activeCals));
      localStorage.setItem("crewschedule_personalevents", JSON.stringify(activeEvents));


      // Auto-generate logbook entries on initial hydration if logbook is empty
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
    if (typeof window !== "undefined") {
      localStorage.setItem("crewschedule_turnlimits", JSON.stringify(updated));
    }
  },

  removeStationTurnLimit: (station) => {
    const uppercaseStation = station.toUpperCase().trim();
    const updated = { ...get().stationTurnLimits };
    delete updated[uppercaseStation];
    set({ stationTurnLimits: updated });
    if (typeof window !== "undefined") {
      localStorage.setItem("crewschedule_turnlimits", JSON.stringify(updated));
    }
  },

  setDefaultTurnLimit: (limitMinutes) => {
    set({ defaultTurnLimit: limitMinutes });
    if (typeof window !== "undefined") {
      localStorage.setItem("crewschedule_defaultturnlimit", JSON.stringify(limitMinutes));
    }
  },

  resetStationTurnLimits: () => {
    set({
      stationTurnLimits: DEFAULT_STATION_TURN_LIMITS,
      defaultTurnLimit: DEFAULT_TURN_LIMIT,
      highCreditThresholdHours: 15.0,
    });
    if (typeof window !== "undefined") {
      localStorage.setItem("crewschedule_turnlimits", JSON.stringify(DEFAULT_STATION_TURN_LIMITS));
      localStorage.setItem("crewschedule_defaultturnlimit", JSON.stringify(DEFAULT_TURN_LIMIT));
      localStorage.setItem("crewschedule_highcreditthreshold", JSON.stringify(15.0));
    }
  },

  setHighCreditThresholdHours: (hours) => {
    const val = Math.max(1, Math.min(100, hours));
    set({ highCreditThresholdHours: val });
    if (typeof window !== "undefined") {
      localStorage.setItem("crewschedule_highcreditthreshold", JSON.stringify(val));
    }
  },

  setSequences: (sequences) => {
    const clean = deduplicateSequences(sequences);
    set({ sequences: clean });
    if (typeof window !== "undefined") {
      localStorage.setItem("crewschedule_sequences", JSON.stringify(clean));
    }
    get().autoGenerateLogbookFromRoster();
  },

  addSequences: (newSeqs) => {
    const clean = deduplicateSequences([...get().sequences, ...newSeqs]);
    set({ sequences: clean });
    if (typeof window !== "undefined") {
      localStorage.setItem("crewschedule_sequences", JSON.stringify(clean));
    }
    get().autoGenerateLogbookFromRoster();
  },

  updateSequence: (updated) => {
    const seqs = get().sequences.map((s) => (s.id === updated.id ? updated : s));
    set({ sequences: seqs });
    if (typeof window !== "undefined") {
      localStorage.setItem("crewschedule_sequences", JSON.stringify(seqs));
    }
    get().autoGenerateLogbookFromRoster();
  },

  mergeHssIntoSequence: (sequenceNumber: string, hssData: any) => {
    const seqs = get().sequences.map((s) => {
      // Find the matching sequence by sequenceNumber AND matching month/year if available
      const isSameSeqNum = s.sequenceNumber.toLowerCase() === sequenceNumber.toLowerCase();
      const isSameMonth = !hssData.startDate || !s.startDate || s.startDate.substring(0, 7) === hssData.startDate.substring(0, 7);
      
      if (isSameSeqNum && isSameMonth) {
        return {
          ...s,
          dutyPeriods: hssData.dutyPeriods, // Use rich duty periods parsed from HSS
          totalBlockMinutes: hssData.totalBlockMinutes, // Update exact block time
        };
      }
      return s;
    });

    set({ sequences: seqs });
    if (typeof window !== "undefined") {
      localStorage.setItem("crewschedule_sequences", JSON.stringify(seqs));
    }
    get().autoGenerateLogbookFromRoster();
  },

  deleteSequence: (id) => {
    const seqs = get().sequences.filter((s) => s.id !== id);
    set({ sequences: seqs });
    if (typeof window !== "undefined") {
      localStorage.setItem("crewschedule_sequences", JSON.stringify(seqs));
    }
    get().autoGenerateLogbookFromRoster();
  },

  setPayRates: (rates) => {
    const updated = { ...get().payRates, ...rates };
    set({ payRates: updated });
    if (typeof window !== "undefined") {
      localStorage.setItem("crewschedule_payrates", JSON.stringify(updated));
    }
  },

  setSelectedSequenceId: (id) => {
    set({ selectedSequenceId: id });
  },

  updateAutomationConfig: (cfg) => {
    const updated = { ...get().automationConfig, ...cfg };
    set({ automationConfig: updated });
    if (typeof window !== "undefined") {
      localStorage.setItem("crewschedule_autoconfig", JSON.stringify(updated));
    }
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

  setOpenSequences: (openSequences) => {
    const activeCutoffDate = "2026-07-27";
    const filtered = openSequences.filter((s) => s.startDate >= activeCutoffDate);
    set({ openSequences: filtered });
    if (typeof window !== "undefined") {
      localStorage.setItem("crewschedule_opensequences", JSON.stringify(filtered));
    }
  },

  importN4OpenTime: (rawN4Text) => {
    const parsedNew = parseN4OpenTime(rawN4Text);
    const basesInText = Array.from(new Set(parsedNew.map((s) => s.base)));
    const existingOtherBases = get().openSequences.filter((s) => !basesInText.includes(s.base));
    const merged = [...existingOtherBases, ...parsedNew];

    set({ openSequences: merged });
    if (typeof window !== "undefined") {
      localStorage.setItem("crewschedule_opensequences", JSON.stringify(merged));
    }
    get().addConsoleLog(`Imported N4 Open Time: Loaded ${parsedNew.length} active sequence(s). Past dates automatically purged.`);
  },

  toggleSimulateSequence: (id) => {
    const current = get().simulatedSequenceIds;
    const updated = current.includes(id) 
      ? current.filter((x) => x !== id) 
      : [...current, id];
    
    set({ simulatedSequenceIds: updated });
    if (typeof window !== "undefined") {
      localStorage.setItem("crewschedule_simulatedids", JSON.stringify(updated));
    }
  },

  clearSimulatedSequences: () => {
    set({ simulatedSequenceIds: [] });
    if (typeof window !== "undefined") {
      localStorage.setItem("crewschedule_simulatedids", JSON.stringify([]));
    }
  },

  setShowOpenTimeOverlay: (showOpenTimeOverlay) => {
    set({ showOpenTimeOverlay });
    if (typeof window !== "undefined") {
      localStorage.setItem("crewschedule_showoverlay", JSON.stringify(showOpenTimeOverlay));
    }
  },

  setOpenTimeFilter: (openTimeFilter) => {
    set({ openTimeFilter });
    if (typeof window !== "undefined") {
      localStorage.setItem("crewschedule_openfilter", JSON.stringify(openTimeFilter));
    }
  },

  addOpenTimePreset: (preset) => {
    const updated = [...get().openTimePresets.filter((p) => p.id !== preset.id), preset];
    set({ openTimePresets: updated, openTimeFilter: preset.id });
    if (typeof window !== "undefined") {
      localStorage.setItem("crewschedule_openpresets", JSON.stringify(updated));
      localStorage.setItem("crewschedule_openfilter", JSON.stringify(preset.id));
    }
  },

  removeOpenTimePreset: (id) => {
    const updated = get().openTimePresets.filter((p) => p.id !== id);
    const nextFilter = get().openTimeFilter === id ? "all" : get().openTimeFilter;
    set({ openTimePresets: updated, openTimeFilter: nextFilter });
    if (typeof window !== "undefined") {
      localStorage.setItem("crewschedule_openpresets", JSON.stringify(updated));
      localStorage.setItem("crewschedule_openfilter", JSON.stringify(nextFilter));
    }
  },

  addSubscribedCalendar: (cal, newEvents = []) => {
    const updatedCals = [...get().subscribedCalendars.filter((c) => c.id !== cal.id), cal];
    const updatedEvents = [...get().personalEvents.filter((e) => e.calendarId !== cal.id), ...newEvents];
    set({ subscribedCalendars: updatedCals, personalEvents: updatedEvents });
    if (typeof window !== "undefined") {
      localStorage.setItem("crewschedule_subscribedcals", JSON.stringify(updatedCals));
      localStorage.setItem("crewschedule_personalevents", JSON.stringify(updatedEvents));
    }
  },

  removeSubscribedCalendar: (id) => {
    const updatedCals = get().subscribedCalendars.filter((c) => c.id !== id);
    const updatedEvents = get().personalEvents.filter((e) => e.calendarId !== id);
    set({ subscribedCalendars: updatedCals, personalEvents: updatedEvents });
    if (typeof window !== "undefined") {
      localStorage.setItem("crewschedule_subscribedcals", JSON.stringify(updatedCals));
      localStorage.setItem("crewschedule_personalevents", JSON.stringify(updatedEvents));
    }
  },

  toggleSubscribedCalendar: (id) => {
    const updatedCals = get().subscribedCalendars.map((c) =>
      c.id === id ? { ...c, enabled: !c.enabled } : c
    );
    set({ subscribedCalendars: updatedCals });
    if (typeof window !== "undefined") {
      localStorage.setItem("crewschedule_subscribedcals", JSON.stringify(updatedCals));
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
    if (typeof window !== "undefined") {
      localStorage.setItem("crewschedule_subscribedcals", JSON.stringify(updatedCals));
      localStorage.setItem("crewschedule_personalevents", JSON.stringify(updatedEvents));
    }
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
      uniqueMap.set(s.sequenceNumber, s);
    });
    return Array.from(uniqueMap.values());
  },

  getTotalTafbHours: () => {
    const seqs = get().getEffectiveSequences();
    const isHi1Active = get().sequences.some((s) => s.sequenceNumber === "21649");
    
    if (isHi1Active) {
      const basePaycheckTafb = 310.10;
      const simIds = get().simulatedSequenceIds;
      const simOts = get().openSequences.filter((ot) => simIds.includes(ot.id));
      const simTafb = simOts.reduce((acc, ot) => {
        const partsStart = ot.startDate.split("-").map(Number);
        const partsEnd = ot.endDate.split("-").map(Number);
        const d1 = new Date(partsStart[0], partsStart[1] - 1, partsStart[2], parseInt(ot.reportTime.substring(0, 2)), parseInt(ot.reportTime.substring(2, 4)));
        const d2 = new Date(partsEnd[0], partsEnd[1] - 1, partsEnd[2], parseInt(ot.releaseTime.substring(0, 2)), parseInt(ot.releaseTime.substring(2, 4)));
        return acc + Math.max(0, (d2.getTime() - d1.getTime()) / (1000 * 60 * 60));
      }, 0);
      return basePaycheckTafb + simTafb;
    }
    
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
