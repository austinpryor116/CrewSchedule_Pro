export interface FlightLeg {
  flightNumber: string;
  depAirport: string;
  arrAirport: string;
  depTime: string; // HHMM format, e.g. "0800"
  arrTime: string; // HHMM format, e.g. "1430"
  blockMinutes: number;
  tailNumber?: string;
  actualBlockMinutes?: number;
  actualDepTime?: string;
  actualArrTime?: string;
  isDeadhead?: boolean;
  isOvertime?: boolean;
}

export interface DutyPeriod {
  dayIndex: number; // 0-indexed day within the sequence
  reportTime: string; // HHMM format, e.g. "0715"
  releaseTime: string; // HHMM format, e.g. "1515"
  dutyMinutes: number;
  legs: FlightLeg[];
  layoverCity: string;
  layoverHotelInfo: string;
  actualBlockMinutes?: number;
  actualDutyMinutes?: number;
  actualReportTime?: string;
  actualReleaseTime?: string;
  isOvertime?: boolean;
}

export interface VacationPeriod {
  id: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  code: string;      // e.g. "VA"
  description: string;
}

export interface MonthlyHIMetadata {
  monthEnding: string; // e.g. "31JUL26"
  monthYearLabel: string; // e.g. "July 2026"
  asOfDateStr: string; // e.g. "17JUL26/2151"
  pilotName: string;
  seniorityNum: string;
  empNum: string;
  base: string;
  equipment: string;
  rank: string;
  guaranteeHours: number;
  bidSelProjHours: number;
  fltTime672Hours: number;
  fltTime365Day: number;
  availSickHours: number;
  shortTermSickAccrual: number;
  sickUsedYtd: number;
  vacationDaysCount: number;
  vacationCreditHours: number;
}

export interface SequenceTrip {
  id: string; // Unique ID (e.g., UUID or custom string)
  sequenceNumber: string; // Sequence ID from text, e.g. "S8341"
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  base: string; // Base, e.g. "ORD", "MIA"
  equipment: string; // Equipment, e.g. "B737", "A321"
  totalBlockMinutes: number;
  totalCreditMinutes: number;
  layoverCities: string[];
  dutyPeriods: DutyPeriod[];
  colorTag: string; // Tailwind color class suffix (e.g. "indigo", "emerald", "amber")
  isOvertime?: boolean;
  statusTag?: string; // e.g. "OT", "TT", "RA", "DROP", "DTS"
  isDropped?: boolean;
  dropReason?: string;
  isSimulated?: boolean;
  actualBlockMinutes?: number;
  isGhost?: boolean;
  hasConflict?: boolean;
  conflictReason?: string;
}


export interface DaySegment {
  seq: SequenceTrip;
  dayIndexInSeq: number;
  totalSeqDays: number;
  isRealStart?: boolean;
  isRealEnd?: boolean;
  slot?: number;
}

export interface PayRates {
  hourlyRate: number;
  perDiemRate: number;
  minDailyGuaranteeMinutes: number; // e.g., 300 minutes (5.0 hours)
  tafbHours: number; // Time Away From Base
}

export interface PayCalculations {
  blockHours: number;
  creditHours: number;
  basePay: number;
  perDiemPay: number;
  grossTotalPay: number;
  softPayAdjustment: number; // credit hours - block hours in cash or hours
}

export interface AutomationConfig {
  targetUrl: string;
  userAgentProfile: string;
  commandInputSelector: string;
  submitButtonSelector: string;
  delayMs: number;
  scriptQueue: string[];
}

export interface OpenSequence {
  id: string;
  sequenceNumber: string;
  creditHours: number;
  reportTime: string; // HHMM
  releaseTime: string; // HHMM
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  legsDescription: string;
  layoverDescription: string;
  isSimulated?: boolean;
  base?: string;
}

export interface StationTurnLimits {
  limits: Record<string, number>;
  defaultLimit: number;
}

export interface RosterMetrics {
  totalSequencesCount: number;
  flownBlockHours: number;       // Actual flight time completed on/before cutoff date (34.8h)
  toBeFlownBlockHours: number;   // Scheduled flight time upcoming after cutoff date (43.4h)
  totalBlockHours: number;       // Total line block time (78.2h)
  tripCreditHours: number;       // Total active sequence trip credit (88.5h)
  headerAccrualHours: number;    // Line 342 Short Term Sick Payout Accrual (21.0h)
  totalPayCreditHours: number;   // Total line pay credit (109.5h)
  overtimeTripsCount: number;    // Count of OT trips
  overtimeCreditHours: number;   // OT credit hours
  asOfDateStr: string;           // Cutoff date ("17JUL26")
  
  // Rainmaker categories
  baseFlightHours: number;
  overtimeFlightHours: number;
  overtimePremiumHours: number;
  otherRigsHours: number;
  tripTradeHours: number;
  blockRateConnectionHours: number;
  cancelCompensationHours: number;
}

export interface ScheduleDiffItem {
  id: string;
  type: "REASSIGNMENT" | "FLIGHT_TIME_CHANGE" | "TRIP_ADDED" | "TRIP_DROPPED" | "CREDIT_CHANGE";
  sequenceNumber: string;
  description: string;
  oldValue?: string;
  newValue?: string;
  creditDeltaMinutes?: number;
  severity: "info" | "warning" | "alert";
}

export interface ScheduleSnapshot {
  id: string;
  asOfDateStr: string; // e.g. "22JUL26/1534"
  uploadedAt: string; // ISO date
  sourceFileName: string;
  monthLabel: string; // e.g. "JUL26" or "AUG26"
  sequences: SequenceTrip[];
  rawText: string;
  diffs: ScheduleDiffItem[];
  projectedCreditHours: number;
  flownBlockHours: number;
}

export interface LogbookEntry {
  id: string;
  date: string; // YYYY-MM-DD
  flightNumber: string;
  tailNumber: string;
  aircraftType: string;
  depAirport: string;
  arrAirport: string;
  outTime: string; // HHMM
  inTime: string; // HHMM
  blockMinutes: number;
  nightMinutes: number;
  instrumentMinutes: number;
  crossCountryMinutes: number;
  picMinutes: number;
  sicMinutes: number;
  dualReceivedMinutes: number;
  landingsDay: number;
  landingsNight: number;
  approaches: number;
  remarks: string;
  isAutoFilled: boolean;
  sourceSequenceNumber?: string;
  createdAt: string;
}


