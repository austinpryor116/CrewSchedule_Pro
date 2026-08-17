export interface LogicLogEntry {
  id: string;
  timestamp: string;
  category: "PARSER" | "DECS_API" | "CALENDAR" | "SYSTEM";
  message: string;
  details?: any;
}

export interface FlightLeg {
  flightNumber: string;
  depAirport: string;
  arrAirport: string;
  depTime: string; // HHMM format, e.g. "0800"
  arrTime: string; // HHMM format, e.g. "1430"
  blockMinutes: number;
  groundMinutes?: number; // Time on ground before NEXT flight
  tailNumber?: string;
  equipment?: string;
  actualBlockMinutes?: number;
  actualDepTime?: string;
  actualArrTime?: string;
  isDeadhead?: boolean;
  isOvertime?: boolean;
  isCancelled?: boolean;
  flightPrefix?: string; // "-", "D", "C", "*XX", "X"
}

export interface DutyPeriod {
  dayIndex: number; // 0-indexed day within the sequence
  reportTime: string; // HHMM format, e.g. "0715"
  releaseTime: string; // HHMM format, e.g. "1515"
  dutyMinutes: number;
  payCreditMinutes?: number; // Extracted from D/P SKD
  odlMinutes?: number; // Extracted from ODL 
  legs: FlightLeg[];
  layoverCity: string;
  layoverHotelInfo?: string;
  actualBlockMinutes?: number;
  actualDutyMinutes?: number;
  actualReportTime?: string;
  actualReleaseTime?: string;
  isOvertime?: boolean;
  removalCode?: string; // FOS RMV code, e.g. "VC", "SK", "FP"
  addCode?: string;     // FOS ADD code, e.g. "TF", "RA", "SH"
  payStatusCode?: string; // FOS ST code (1-17)
  miscCreditDescription?: string; // e.g. "Home Study Pay Credit"
}

export interface VacationPeriod {
  id: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  code: string;      // e.g. "VA"
  description: string;
  creditHours?: number;
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

export interface UserProfile {
  name: string;
  employeeId: string;
  seniorityNumber?: string;
  base: string;
  equipment: string;
  crewRole: "CA" | "FO" | "CHECK_PILOT" | "LFA" | "FA";
  hireDate?: string;
  hasCompleted750Sic?: boolean; // FO reaches 750 SIC before Dec 31, 2026 -> Captain Pay
  sic750DateReached?: string;   // Date 750 SIC was logged (YYYY-MM-DD)
  sic750PayStartsPeriod?: string; // Effective pay period (starts pay period after reaching 750 SIC)
  flowStatus?: "ACCEPT" | "DECLINE" | "BYPASS" | "PENDING"; // AA Flow Status (Declining flow reverts 5yr top scale to base longevity)
  isCaptainFlowTopScale?: boolean; // 5+ Year Captain receiving Step 20 top-of-scale pay ($228.75/hr)
  flowTopScaleDateReached?: string; // Date 5 years of service completed
  flowTopScalePayStartsPeriod?: string; // Effective pay period (starts pay period after 5th year)
  email?: string;
  phone?: string;
  theme?: "light" | "dark" | "system";
  accentColor?: string;
  notificationsEnabled?: boolean;
  syncCalendar?: boolean;
  autoSyncEnabled?: boolean;
  timezoneDisplay?: "LOCAL" | "BASE" | "ZULU";
}

export interface SequenceTrip {
  id: string;
  rank?: string; // Captured from HSS text (e.g. CAPT or FO) // Unique ID (e.g., UUID or custom string)
  sequenceNumber: string; // Sequence ID from text, e.g. "S8341"
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  base: string; // Base, e.g. "ORD", "MIA"
  equipment: string; // Equipment, e.g. "B737", "A321"
  totalBlockMinutes: number;
  totalCreditMinutes: number;
  layoverCities: string[];
  dutyPeriods: DutyPeriod[];
  colorTag?: string; // Tailwind color class suffix (e.g. "sky", "emerald", "amber")
  isOvertime?: boolean;
  statusTag?: string; // e.g. "OT", "TT", "RA", "DROP", "DTS"
  isDropped?: boolean;
  dropReason?: string;
  isSimulated?: boolean;
  actualBlockMinutes?: number;
  isGhost?: boolean;
  hasConflict?: boolean;
  conflictReason?: string;
  expTafbHours?: number; // Total EXP TAFB (Time Away From Base)
  hasContinuityIssue?: boolean; // Sequence continuity flag (*)
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
  overtimeMultiplier?: number; // e.g. 1.5x, 1.75x, 2.0x
  perDiemRate: number;
  intlPerDiemRate?: number; // International Per Diem $/hr
  minDailyGuaranteeMinutes: number; // e.g., 300 minutes (5.0 hours)
  monthlyGuaranteeHours?: number; // e.g., 75.0 hours MMG
  deadheadPayRatio?: number; // e.g., 1.0 (100%) or 0.75 (75%)
  holdingPayRate?: number; // e.g., 45.00 $/hr
  tafbHours: number; // Time Away From Base

  // Crew Profile & Role Settings
  crewRole?: "CA" | "FO" | "CHECK_PILOT" | "LFA" | "FA";
  equipment?: string;
  homeBase?: string;

  // FAR & Contract Legality Parameters
  legalityStandard?: "FAR117" | "FA_REST";
  minRestHours?: number; // e.g., 10.0 hours
  maxFdpHours?: number; // e.g., 13.0 hours
  maxDailyFlightHours?: number; // e.g., 9.0 hours
  max28DayFlightHours?: number; // e.g., 100.0 hours

  // Operational Buffer Parameters
  reportBufferMins?: number; // e.g., 45 mins
  releaseBufferMins?: number; // e.g., 15 mins
}

export interface OpenTimePreset {
  id: string;
  name: string; // e.g., "⚡ Morning Turns > 3.5h", "🌴 MIA/SAN Layovers"
  minCreditHours?: number; // e.g., 3.5
  maxCreditHours?: number;
  minBlockHours?: number;
  maxTripDays?: number; // 1 = Turns only, 2, 3, 4
  reportAfterTime?: string; // Typable string e.g. "06:00" or "0600"
  reportBeforeTime?: string; // Typable string e.g. "11:30" or "1130"
  reportWindow?: string; // Legacy or free-text report window
  releaseBeforeTime?: string; // Typable string e.g. "19:30" or "1930"
  maxLegsPerDay?: number;
  preferredLayoverCity?: string; // Typable free-text e.g. "MIA", "SAN", "BOS", "TURNS"
  fitsOnly?: boolean; // Only show 0 conflict trips
  baseFilter?: string; // "ALL", "ORD", "DFW", "MIA", "PHX"
  payMultiplier?: number;
}

export interface SubscribedCalendar {
  id: string;
  name: string; // e.g., "Spouse Flight Schedule", "Google Personal Calendar", "Pilot Contractual Bid Dates"
  url?: string; // webcal:// or https://...ics
  color: string; // "purple" | "rose" | "teal" | "amber" | "indigo" | "emerald"
  enabled: boolean;
  lastSyncedAt?: string;
  eventsCount: number;
  isPilotOnly?: boolean;
  targetRole?: "pilot" | "flight_attendant" | "all";
}

export interface PersonalCalendarEvent {
  id: string;
  calendarId: string;
  title: string;
  category?: "event" | "task" | "reminder" | "commute" | "medical" | "family" | "bidding" | "pilot_bidding";
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  startTime?: string; // HH:MM
  endTime?: string; // HH:MM
  isAllDay?: boolean;
  recurrence?: "none" | "daily" | "weekly" | "monthly" | "yearly";
  location?: string;
  notes?: string;
  url?: string;
  reminderMinutes?: number; // e.g. 10, 30, 60, 1440
  busyStatus?: "busy" | "free";
  guests?: string[];
  color: string;
  isPilotOnly?: boolean;
  targetRole?: "pilot" | "flight_attendant" | "all";
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
  noseNumber?: string; // e.g. "739"
  aircraftType: string;
  depAirport: string;
  arrAirport: string;
  outTime: string; // HHMM or HH:MM
  offTime?: string; // HHMM or HH:MM (Takeoff)
  onTime?: string; // HHMM or HH:MM (Landing)
  inTime: string; // HHMM or HH:MM
  blockMinutes: number;
  flightMinutes?: number; // Time from Off to On
  outFuel?: number; // Fuel at OUT (k lbs)
  offFuel?: number; // Fuel at OFF (k lbs)
  onFuel?: number; // Fuel at ON (k lbs)
  inFuel?: number; // Fuel at IN (k lbs)
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
  sourceScanType?: "QR_PLACARD" | "FMS_OOOI" | "ROSTER" | "MANUAL";
  createdAt: string;
}

export interface AircraftScanResult {
  tailNumber?: string; // e.g. "N739AE"
  noseNumber?: string; // e.g. "739"
  aircraftType?: string; // e.g. "E70F" or "E175"
  rawText: string;
  confidence: number;
  detectedAt: string;
}

export interface FmsOooiScanResult {
  flightNumber?: string; // e.g. "MQ3362" / "AA3362"
  depAirport?: string; // e.g. "AVP"
  arrAirport?: string; // e.g. "ORD"
  outTime?: string; // e.g. "23:27"
  offTime?: string; // e.g. "23:39"
  onTime?: string; // e.g. "01:27"
  inTime?: string; // e.g. "01:50"
  outFuel?: number; // e.g. 14.4
  offFuel?: number; // e.g. 13.9
  onFuel?: number; // e.g. 6.5
  inFuel?: number; // e.g. 6.2
  blockMinutes?: number; // e.g. 143 (2h 23m)
  flightMinutes?: number; // e.g. 108 (1h 48m)
  rawText: string;
  confidence: number;
  detectedAt: string;
}
export interface N6DPilotDayStatus {
  day: number;
  status: "RAP" | "SB" | "FLY" | "OFF" | "SK" | "VC" | "OT" | "OTHER";
  rapType?: "RAP1" | "RAP2" | "STANDBY" | "CUSTOM";
  rapWindow?: string; // e.g. "0400-1800" or "1200-2359"
  sequenceNumber?: string; // e.g. "06742"
  code?: string; // e.g. "24", "SK", "PW", "BK", "UM", "MV", "RD", "NR", "FLY", "SB"
  rawText?: string;
  isAvailable: boolean; // True if available on reserve eligible for callout
}

export interface N6DPilotRecord {
  seniority: string; // e.g. "2221"
  seniorityNum: number;
  name: string; // e.g. "GRANTHAM TK"
  employeeId: string; // SC e.g. "908386"
  projHours: number; // e.g. 41.28
  gtdHours: number; // e.g. 41.28
  actSkdHours: number; // e.g. 9.07
  days: Record<number, N6DPilotDayStatus>;
  rawBlock?: string;
}

export interface N6DDailySummary {
  day: number;
  totalAvailable: number;
  rap1Count: number;
  rap2Count: number;
  othersCount: number;
}

export interface N6DReservesData {
  base: string; // e.g. "ORD"
  equipment: string; // e.g. "E75"
  seat: "CAPT" | "FO";
  category: string; // e.g. "DOMESTIC"
  asOfDate: string; // e.g. "15AUG26"
  asOfTime: string; // e.g. "1718"
  displayDays: number[]; // e.g. [15, 16, 17, 18, 19, 20, 21]
  pilots: N6DPilotRecord[];
  dailySummaries: N6DDailySummary[];
  rawText: string;
  importedAt: string;
}
