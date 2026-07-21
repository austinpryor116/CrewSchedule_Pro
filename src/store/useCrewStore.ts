import { create } from "zustand";
import { SequenceTrip, PayRates, AutomationConfig, PayCalculations, OpenSequence, DutyPeriod, RosterMetrics } from "../types";
import { DEFAULT_PAY_RATES, MOCK_SEQUENCES, RAW_HI1_TEXT, RAW_N4_TEXT, RAW_N4_DFW_TEXT } from "../lib/demoData";
import { RAW_HSS_1_TEXT, RAW_HSS_2_TEXT, RAW_HSS_3_TEXT, RAW_HSS_4_TEXT, RAW_HSS_5_TEXT, RAW_HSS_6_TEXT, RAW_HSS_7_TEXT } from "../lib/hss_extracted_text";
import { calculatePay, calculateSequenceTAFB, parseRawSchedule, parseN4OpenTime, convertOpenToTrip, computeRosterMetrics } from "../lib/parser";
export { convertOpenToTrip };

interface CrewState {
  sequences: SequenceTrip[];
  payRates: PayRates;
  selectedSequenceId: string | null;
  automationConfig: AutomationConfig;
  consoleLogs: string[];
  activeTab: string;
  isHydrated: boolean;
  
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
  setPayRates: (rates: Partial<PayRates>) => void;
  setSelectedSequenceId: (id: string | null) => void;
  updateAutomationConfig: (cfg: Partial<AutomationConfig>) => void;
  addConsoleLog: (log: string) => void;
  clearConsoleLogs: () => void;
  setActiveTab: (tab: string) => void;
  loadDemoData: () => void;
  clearAll: () => void;
  
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
  payRates: DEFAULT_PAY_RATES,
  selectedSequenceId: null,
  automationConfig: DEFAULT_AUTOMATION_CONFIG,
  consoleLogs: [],
  activeTab: "calendar",
  isHydrated: false,
  openSequences: [],
  simulatedSequenceIds: [],
  showOpenTimeOverlay: false,
  openTimeFilter: "all",
  stationTurnLimits: DEFAULT_STATION_TURN_LIMITS,
  defaultTurnLimit: DEFAULT_TURN_LIMIT,
  highCreditThresholdHours: 15.0,

  hydrate: () => {
    if (typeof window === "undefined") return;
    try {
      const storedSeqs = localStorage.getItem("crewschedule_sequences");
      const storedRates = localStorage.getItem("crewschedule_payrates");
      const storedConfig = localStorage.getItem("crewschedule_autoconfig");
      const storedOpen = localStorage.getItem("crewschedule_opensequences");
      const storedSim = localStorage.getItem("crewschedule_simulatedids");
      const storedOverlay = localStorage.getItem("crewschedule_showoverlay");
      const storedFilter = localStorage.getItem("crewschedule_openfilter");
      const storedTurnLimits = localStorage.getItem("crewschedule_turnlimits");
      const storedDefaultTurn = localStorage.getItem("crewschedule_defaultturnlimit");
      const storedHighCredit = localStorage.getItem("crewschedule_highcreditthreshold");
      
      const sanitizedSeqs = storedSeqs ? deduplicateSequences(JSON.parse(storedSeqs)) : [];

      set({
        sequences: sanitizedSeqs,
        payRates: storedRates ? JSON.parse(storedRates) : DEFAULT_PAY_RATES,
        automationConfig: storedConfig ? JSON.parse(storedConfig) : DEFAULT_AUTOMATION_CONFIG,
        openSequences: storedOpen ? JSON.parse(storedOpen) : [],
        simulatedSequenceIds: storedSim ? JSON.parse(storedSim) : [],
        showOpenTimeOverlay: storedOverlay ? JSON.parse(storedOverlay) : false,
        openTimeFilter: storedFilter ? (JSON.parse(storedFilter) as any) : "all",
        stationTurnLimits: storedTurnLimits ? JSON.parse(storedTurnLimits) : DEFAULT_STATION_TURN_LIMITS,
        defaultTurnLimit: storedDefaultTurn ? JSON.parse(storedDefaultTurn) : DEFAULT_TURN_LIMIT,
        highCreditThresholdHours: storedHighCredit ? JSON.parse(storedHighCredit) : 15.0,
        isHydrated: true,
      });

      if (storedSeqs) {
        localStorage.setItem("crewschedule_sequences", JSON.stringify(sanitizedSeqs));
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
    
    // Merge: substitute the summary-level sequences with detailed HSS versions
    const mergedSeqs = baseSeqs.map(s => {
      const detailed = hssSeqs.find(h => h.sequenceNumber === s.sequenceNumber);
      if (detailed) {
        // Keep the original ID, preserve overtime status, and preserve actualBlockMinutes from HI1
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
    
    // Parse open sequences (N4 text for both ORD and DFW)
    const openSeqsORD = parseN4OpenTime(RAW_N4_TEXT);
    const openSeqsDFW = parseN4OpenTime(RAW_N4_DFW_TEXT);
    const openSeqs = [...openSeqsORD, ...openSeqsDFW];
    
    // Calculate total TAFB for rates
    const totalTafb = mergedSeqs.reduce((acc, s) => acc + calculateSequenceTAFB(s), 0);
    const updatedRates = {
      ...DEFAULT_PAY_RATES,
      tafbHours: totalTafb,
    };
    
    // Select Sequence 17495 by default
    const targetSeq = mergedSeqs.find(s => s.sequenceNumber === "17495");
    
    set({
      sequences: mergedSeqs,
      openSequences: openSeqs,
      payRates: updatedRates,
      selectedSequenceId: targetSeq ? targetSeq.id : (mergedSeqs[0]?.id || null),
    });
    
    if (typeof window !== "undefined") {
      localStorage.setItem("crewschedule_sequences", JSON.stringify(mergedSeqs));
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
