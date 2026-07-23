import { create } from "zustand";
import { SequenceTrip, PayRates, AutomationConfig, PayCalculations, OpenSequence, RosterMetrics, ScheduleSnapshot, ScheduleDiffItem, VacationPeriod, MonthlyHIMetadata, LogbookEntry } from "../types";
import { DEFAULT_PAY_RATES, RAW_HI1_TEXT, RAW_HI1_AUG_TEXT, RAW_N4_TEXT, RAW_N4_DFW_TEXT, MOCK_AUG_SEQUENCES, MOCK_VACATIONS } from "../lib/demoData";
import { RAW_HSS_1_TEXT, RAW_HSS_2_TEXT, RAW_HSS_3_TEXT, RAW_HSS_4_TEXT, RAW_HSS_5_TEXT, RAW_HSS_6_TEXT, RAW_HSS_7_TEXT } from "../lib/hss_extracted_text";
import { calculatePay, calculateSequenceTAFB, parseRawSchedule, parseN4OpenTime, convertOpenToTrip, computeRosterMetrics, diffScheduleSnapshots, timeToMinutes } from "../lib/parser";
export { convertOpenToTrip };

interface CrewState {
  sequences: SequenceTrip[];
  vacations: VacationPeriod[];
  monthlyHIMetadata: MonthlyHIMetadata | null;
  payRates: PayRates;
  selectedSequenceId: string | null;
  automationConfig: AutomationConfig;
  consoleLogs: string[];
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
  openTimeFilter: "all" | "fits" | "simulated" | "conflicts";

  // Station Turn Limits Settings
  stationTurnLimits: Record<string, number>;
  defaultTurnLimit: number;
  highCreditThresholdHours: number;
  
  // Actions
  hydrate: () => void;
  setSequences: (sequences: SequenceTrip[]) => void;
  addSequences: (newSeqs: SequenceTrip[]) => void;
  updateSequence: (updated: SequenceTrip) => void;
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
  setActiveTab: (tab: string) => void;
  loadDemoData: () => void;
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
  toggleSimulateSequence: (id: string) => void;
  clearSimulatedSequences: () => void;
  setShowOpenTimeOverlay: (val: boolean) => void;
  setOpenTimeFilter: (filter: "all" | "fits" | "simulated" | "conflicts") => void;

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
    if (s && s.sequenceNumber) {
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
  activeTab: "calendar",
  isHydrated: false,
  snapshots: [],
  activeSnapshotId: null,
  logbookEntries: [],
  openSequences: [],
  simulatedSequenceIds: [],
  showOpenTimeOverlay: false,
  openTimeFilter: "all",
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
            tailNumber: leg.tailNumber || "N405AA",
            aircraftType: seq.equipment || "E75",
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
    const updated = get().logbookEntries.map((e) => (e.id === updatedEntry.id ? updatedEntry : e));
    set({ logbookEntries: updated });
    if (typeof window !== "undefined") {
      localStorage.setItem("crewschedule_logbook", JSON.stringify(updated));
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
    const mergedSeqs = deduplicateSequences([...newSeqs]);
    
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

      const sanitizedSeqs = storedSeqs ? deduplicateSequences(JSON.parse(storedSeqs)) : [];
      const parsedSnaps: ScheduleSnapshot[] = storedSnaps ? JSON.parse(storedSnaps) : [];
      const parsedLogbook: LogbookEntry[] = storedLogbook ? JSON.parse(storedLogbook) : [];

      set({
        sequences: sanitizedSeqs,
        vacations: storedVacations ? JSON.parse(storedVacations) : MOCK_VACATIONS,
        monthlyHIMetadata: storedMeta ? JSON.parse(storedMeta) : null,
        snapshots: parsedSnaps,
        logbookEntries: parsedLogbook,
        payRates: storedRates ? JSON.parse(storedRates) : DEFAULT_PAY_RATES,
        automationConfig: storedConfig ? JSON.parse(storedConfig) : DEFAULT_AUTOMATION_CONFIG,
        openSequences: storedOpen ? JSON.parse(storedOpen) : [],
        simulatedSequenceIds: storedSim ? JSON.parse(storedSim) : [],
        showOpenTimeOverlay: storedOverlay ? JSON.parse(storedOverlay) : false,
        openTimeFilter: storedFilter ? (JSON.parse(storedFilter) as CrewState["openTimeFilter"]) : "all",
        stationTurnLimits: storedTurnLimits ? JSON.parse(storedTurnLimits) : DEFAULT_STATION_TURN_LIMITS,
        defaultTurnLimit: storedDefaultTurn ? JSON.parse(storedDefaultTurn) : DEFAULT_TURN_LIMIT,
        highCreditThresholdHours: storedHighCredit ? JSON.parse(storedHighCredit) : 15.0,
        isHydrated: true,
      });

      if (!storedSnaps || parsedSnaps.length === 0) {
        get().loadDemoData();
      }

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
  },

  addSequences: (newSeqs) => {
    const clean = deduplicateSequences([...get().sequences, ...newSeqs]);
    set({ sequences: clean });
    if (typeof window !== "undefined") {
      localStorage.setItem("crewschedule_sequences", JSON.stringify(clean));
    }
  },

  updateSequence: (updated) => {
    const seqs = get().sequences.map((s) => (s.id === updated.id ? updated : s));
    set({ sequences: seqs });
    if (typeof window !== "undefined") {
      localStorage.setItem("crewschedule_sequences", JSON.stringify(seqs));
    }
  },

  deleteSequence: (id) => {
    const seqs = get().sequences.filter((s) => s.id !== id);
    set({ sequences: seqs });
    if (typeof window !== "undefined") {
      localStorage.setItem("crewschedule_sequences", JSON.stringify(seqs));
    }
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

  addConsoleLog: (log) => {
    const time = new Date().toLocaleTimeString();
    set((state) => ({ consoleLogs: [...state.consoleLogs, `[${time}] ${log}`] }));
  },

  clearConsoleLogs: () => {
    set({ consoleLogs: [] });
  },

  setActiveTab: (activeTab) => {
    set({ activeTab });
  },

  loadDemoData: () => {
    // Parse the default roster (HI1 summary text)
    const baseSeqs = parseRawSchedule(RAW_HI1_TEXT);
    
    // Parse all detailed HSS texts
    const hssTexts = [
      RAW_HSS_1_TEXT,
      RAW_HSS_2_TEXT,
      RAW_HSS_3_TEXT,
      RAW_HSS_4_TEXT,
      RAW_HSS_5_TEXT,
      RAW_HSS_6_TEXT,
      RAW_HSS_7_TEXT
    ];
    
    const hssSeqs: SequenceTrip[] = [];
    hssTexts.forEach(text => {
      try {
        const parsed = parseRawSchedule(text);
        hssSeqs.push(...parsed);
      } catch (e) {
        console.error("Failed to parse HSS text:", e);
      }
    });
    
    // Merge: substitute summary-level sequences with detailed HSS versions
    const mergedSeqs = baseSeqs.map(s => {
      if (s.sequenceNumber === "17270") {
        return {
          ...s,
          statusTag: "TT",
          isDropped: true,
          dropReason: "Traded Off — Switched off schedule for Sequence 17894 starting July 27th",
        };
      }
      const detailed = hssSeqs.find(h => h.sequenceNumber === s.sequenceNumber);
      if (detailed) {
        return {
          ...detailed,
          id: s.id,
          isOvertime: s.isOvertime,
          statusTag: s.statusTag,
          actualBlockMinutes: s.actualBlockMinutes ?? detailed.actualBlockMinutes,
        };
      }
      return s;
    });

    // Add 2-day traded sequence 17894 starting July 27th
    const seqJul27: SequenceTrip = {
      id: "jul-17894",
      sequenceNumber: "17894",
      startDate: "2026-07-27",
      endDate: "2026-07-28",
      base: "ORD",
      equipment: "E75",
      totalBlockMinutes: 445,
      totalCreditMinutes: 627, // 10.45h
      layoverCities: ["AVL"],
      colorTag: "amber",
      statusTag: "TT",
      dutyPeriods: [
        {
          dayIndex: 0,
          reportTime: "1452",
          releaseTime: "2130",
          dutyMinutes: 398,
          legs: [
            { flightNumber: "AA3812", depAirport: "ORD", arrAirport: "AVL", depTime: "1530", arrTime: "1815", blockMinutes: 165, tailNumber: "N405AA" },
          ],
          layoverCity: "AVL",
          layoverHotelInfo: "The Omni Grove Park Inn Asheville (800-438-5800)",
        },
        {
          dayIndex: 1,
          reportTime: "0800",
          releaseTime: "1507",
          dutyMinutes: 427,
          legs: [
            { flightNumber: "AA3813", depAirport: "AVL", arrAirport: "ORD", depTime: "0845", arrTime: "1145", blockMinutes: 180, tailNumber: "N405AA" },
            { flightNumber: "AA4328", depAirport: "ORD", arrAirport: "SPI", depTime: "1300", arrTime: "1440", blockMinutes: 100, tailNumber: "N405AA" },
          ],
          layoverCity: "",
          layoverHotelInfo: "",
        },
      ],
    };


    const finalJulySeqs = [...mergedSeqs, seqJul27];

    // Create August 2026 Demo Sequences (HI1 (3).pdf) with complete duty periods
    const augSeqs: SequenceTrip[] = MOCK_AUG_SEQUENCES;

    // Snapshot 1: July 17 Base Schedule (HI1.pdf)
    const baseSnapshot: ScheduleSnapshot = {
      id: "snap-jul17",
      asOfDateStr: "17JUL26/2151",
      uploadedAt: "2026-07-17T21:51:00Z",
      sourceFileName: "HI1.pdf",
      monthLabel: "JUL26",
      sequences: finalJulySeqs.map((s) => (s.sequenceNumber === "17495" ? { ...s, statusTag: "SH" } : s)),
      rawText: RAW_HI1_TEXT,
      diffs: [],
      projectedCreditHours: 75.42,
      flownBlockHours: 64.48,
    };

    // Snapshot 2: July 22 Schedule with Reassignment on Seq 17495 (HI1 (1).pdf & HI1 (2).pdf)
    const reassignedSeqs = finalJulySeqs.map((s) =>
      s.sequenceNumber === "17495"
        ? { ...s, statusTag: "RA", totalCreditMinutes: 1172 } // 19.54h
        : s
    );
    const raDiffs = diffScheduleSnapshots(baseSnapshot.sequences, reassignedSeqs);

    const reassignmentSnapshot: ScheduleSnapshot = {
      id: "snap-jul22-ra",
      asOfDateStr: "22JUL26/1534",
      uploadedAt: "2026-07-22T15:34:00Z",
      sourceFileName: "HI1 (1).pdf / HI1 (2).pdf",
      monthLabel: "JUL26",
      sequences: reassignedSeqs,
      rawText: RAW_HI1_TEXT,
      diffs: raDiffs.length > 0 ? raDiffs : [
        {
          id: "diff-ra-17495",
          type: "REASSIGNMENT",
          sequenceNumber: "17495",
          description: "Reassignment (RA) flagged on Sequence 17495. Day 21 block changed (5.06h actual vs 7.45h credit). Total credit increased to 19.54h.",
          oldValue: "SH (Original Schedule)",
          newValue: "RA (Reassigned - 19.54h credit)",
          creditDeltaMinutes: 138, // +2.30h credit delta
          severity: "alert",
        },
      ],
      projectedCreditHours: 75.42,
      flownBlockHours: 68.44,
    };

    // Snapshot 3: August 2026 Schedule (HI1 (3).pdf)
    const augSnapshot: ScheduleSnapshot = {
      id: "snap-aug22",
      asOfDateStr: "22JUL26/1536",
      uploadedAt: "2026-07-22T15:36:00Z",
      sourceFileName: "HI1 (3).pdf",
      monthLabel: "AUG26",
      sequences: augSeqs,
      rawText: RAW_HI1_AUG_TEXT,
      diffs: [
        {
          id: "diff-aug-month",
          type: "TRIP_ADDED",
          sequenceNumber: "14731",
          description: "August 2026 monthly bid line loaded. Vacation on Aug 01-07. Dropped trip 15156 on Aug 06-09.",
          newValue: "75.76h projected credit",
          severity: "info",
        },
      ],
      projectedCreditHours: 75.76,
      flownBlockHours: 68.44,
    };

    const initialSnapshots = [augSnapshot, reassignmentSnapshot, baseSnapshot];

    // Combine demo sequences for July and August
    const allDemoSeqs = deduplicateSequences([...reassignedSeqs, ...augSeqs]);



    // Parse open sequences (N4 text for both ORD and DFW)
    const openSeqsORD = parseN4OpenTime(RAW_N4_TEXT);
    const openSeqsDFW = parseN4OpenTime(RAW_N4_DFW_TEXT);
    const openSeqs = [...openSeqsORD, ...openSeqsDFW];
    
    // Calculate total TAFB for rates
    const totalTafb = allDemoSeqs.reduce((acc, s) => acc + calculateSequenceTAFB(s), 0);
    const updatedRates = {
      ...DEFAULT_PAY_RATES,
      tafbHours: totalTafb,
    };
    
    // Select Sequence 17495 by default
    const targetSeq = allDemoSeqs.find(s => s.sequenceNumber === "17495") || allDemoSeqs[0];
    
    set({
      sequences: allDemoSeqs,
      vacations: MOCK_VACATIONS,
      snapshots: initialSnapshots,
      activeSnapshotId: reassignmentSnapshot.id,
      openSequences: openSeqs,
      payRates: updatedRates,
      selectedSequenceId: targetSeq ? targetSeq.id : null,
    });
    
    if (typeof window !== "undefined") {
      localStorage.setItem("crewschedule_sequences", JSON.stringify(allDemoSeqs));
      localStorage.setItem("crewschedule_vacations", JSON.stringify(MOCK_VACATIONS));
      localStorage.setItem("crewschedule_snapshots", JSON.stringify(initialSnapshots));
      localStorage.setItem("crewschedule_opensequences", JSON.stringify(openSeqs));
      localStorage.setItem("crewschedule_payrates", JSON.stringify(updatedRates));
    }


  },

  clearAll: () => {
    set({
      sequences: [],
      payRates: DEFAULT_PAY_RATES,
      selectedSequenceId: null,
      consoleLogs: [],
      simulatedSequenceIds: [],
    });
    if (typeof window !== "undefined") {
      localStorage.removeItem("crewschedule_sequences");
      localStorage.removeItem("crewschedule_payrates");
      localStorage.removeItem("crewschedule_simulatedids");
    }
  },

  setOpenSequences: (openSequences) => {
    set({ openSequences });
    if (typeof window !== "undefined") {
      localStorage.setItem("crewschedule_opensequences", JSON.stringify(openSequences));
    }
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
    return computeRosterMetrics(seqs, RAW_HI1_TEXT);
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
