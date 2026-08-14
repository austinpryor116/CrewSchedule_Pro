/**
 * 14 CFR PART 117 FLIGHT & DUTY LIMITATIONS ENGINE (src/lib/far117Engine.ts)
 * Comprehensive FAA Part 117 Table B (Unaugmented FDP) & Table A (Flight Time) Engine
 */

import { DutyPeriod, FlightLeg, SequenceTrip } from "../types";

export interface TableBRow {
  timeWindowLabel: string; // e.g. "0700-1159"
  startMinutes: number;    // inclusive minute of day, e.g. 7 * 60 = 420
  endMinutes: number;      // inclusive minute of day, e.g. 11 * 60 + 59 = 719
  limitsBySegments: number[]; // Index 0 = 1 leg, 1 = 2 legs, 2 = 3 legs, ..., 6 = 7+ legs (in hours)
}

/**
 * 14 CFR § 117.13 Table B — Flight Duty Period: Unaugmented Operations
 * Columns: 1 leg, 2 legs, 3 legs, 4 legs, 5 legs, 6 legs, 7+ legs
 */
export const FAR_117_TABLE_B: TableBRow[] = [
  {
    timeWindowLabel: "0000-0359",
    startMinutes: 0,
    endMinutes: 239,
    limitsBySegments: [9.0, 9.0, 9.0, 9.0, 9.0, 9.0, 9.0],
  },
  {
    timeWindowLabel: "0400-0459",
    startMinutes: 240,
    endMinutes: 299,
    limitsBySegments: [10.0, 10.0, 10.0, 10.0, 9.0, 9.0, 9.0],
  },
  {
    timeWindowLabel: "0500-0559",
    startMinutes: 300,
    endMinutes: 359,
    limitsBySegments: [12.0, 12.0, 12.0, 12.0, 11.5, 11.0, 10.5],
  },
  {
    timeWindowLabel: "0600-0659",
    startMinutes: 360,
    endMinutes: 419,
    limitsBySegments: [13.0, 13.0, 12.0, 12.0, 11.5, 11.0, 10.5],
  },
  {
    timeWindowLabel: "0700-1159",
    startMinutes: 420,
    endMinutes: 719,
    limitsBySegments: [14.0, 14.0, 13.0, 13.0, 12.5, 12.0, 11.5],
  },
  {
    timeWindowLabel: "1200-1259",
    startMinutes: 720,
    endMinutes: 779,
    limitsBySegments: [13.0, 13.0, 13.0, 13.0, 12.5, 12.0, 11.5],
  },
  {
    timeWindowLabel: "1300-1659",
    startMinutes: 780,
    endMinutes: 1019,
    limitsBySegments: [12.0, 12.0, 12.0, 12.0, 11.5, 11.0, 10.5],
  },
  {
    timeWindowLabel: "1700-2159",
    startMinutes: 1020,
    endMinutes: 1319,
    limitsBySegments: [12.0, 12.0, 11.0, 11.0, 10.0, 9.0, 9.0],
  },
  {
    timeWindowLabel: "2200-2259",
    startMinutes: 1320,
    endMinutes: 1379,
    limitsBySegments: [11.0, 11.0, 10.0, 10.0, 9.0, 9.0, 9.0],
  },
  {
    timeWindowLabel: "2300-2359",
    startMinutes: 1380,
    endMinutes: 1439,
    limitsBySegments: [10.0, 10.0, 10.0, 9.0, 9.0, 9.0, 9.0],
  },
];

/**
 * 14 CFR § 117.11 Table A — Maximum Daily Flight Time: Unaugmented Operations
 */
export const FAR_117_TABLE_A = [
  { timeWindowLabel: "0000-0459", startMinutes: 0, endMinutes: 299, maxFlightHours: 8.0 },
  { timeWindowLabel: "0500-1959", startMinutes: 300, endMinutes: 1199, maxFlightHours: 9.0 },
  { timeWindowLabel: "2000-2359", startMinutes: 1200, endMinutes: 1439, maxFlightHours: 8.0 },
];

/**
 * Helper to parse a time string ("0715", "07:15", "715") into minutes from midnight (0..1439).
 */
export function parseTimeToMinutes(timeStr?: string): number {
  if (!timeStr) return 420; // Default to 0700 if missing
  const clean = timeStr.replace(/[^0-9]/g, "");
  if (clean.length === 3) {
    const h = parseInt(clean.substring(0, 1), 10);
    const m = parseInt(clean.substring(1, 3), 10);
    return h * 60 + m;
  } else if (clean.length >= 4) {
    const h = parseInt(clean.substring(0, 2), 10);
    const m = parseInt(clean.substring(2, 4), 10);
    return (h % 24) * 60 + m;
  }
  return 420;
}

/**
 * Formats minutes into "Xh Ym" or decimal hours.
 */
export function formatMinutesToHoursMinutes(minutes: number): string {
  const h = Math.floor(Math.abs(minutes) / 60);
  const m = Math.round(Math.abs(minutes) % 60);
  return `${minutes < 0 ? "-" : ""}${h}h ${m.toString().padStart(2, "0")}m`;
}

/**
 * Looks up the dynamic maximum allowable Flight Duty Period (FDP) under 14 CFR Part 117 Table B.
 *
 * @param reportTimeStr Scheduled report time in acclimated time (e.g. "0715" or "07:15")
 * @param flightSegmentsCount Number of flight segments (legs) in the duty period (excluding post-duty deadheads)
 */
export function getMaxFdpHours(
  reportTimeStr?: string,
  flightSegmentsCount = 1
): {
  maxFdpHours: number;
  maxFdpMinutes: number;
  timeWindowLabel: string;
  segmentIndex: number;
  ruleCitation: string;
} {
  const reportMinutes = parseTimeToMinutes(reportTimeStr);
  const safeLegs = Math.max(1, flightSegmentsCount);
  const segmentIndex = Math.min(6, safeLegs - 1); // 0=1 leg ... 6=7+ legs

  const row = FAR_117_TABLE_B.find(
    (r) => reportMinutes >= r.startMinutes && reportMinutes <= r.endMinutes
  ) || FAR_117_TABLE_B[4]; // Default to 0700-1159 row

  const maxFdpHours = row.limitsBySegments[segmentIndex];
  const maxFdpMinutes = Math.round(maxFdpHours * 60);

  return {
    maxFdpHours,
    maxFdpMinutes,
    timeWindowLabel: row.timeWindowLabel,
    segmentIndex,
    ruleCitation: `14 CFR § 117.13 Table B (${row.timeWindowLabel}, ${safeLegs} leg${safeLegs === 1 ? "" : "s"})`,
  };
}

/**
 * Looks up the dynamic maximum daily flight time under 14 CFR Part 117 Table A.
 */
export function getMaxFlightTimeHours(reportTimeStr?: string): {
  maxFlightHours: number;
  maxFlightMinutes: number;
  timeWindowLabel: string;
  ruleCitation: string;
} {
  const reportMinutes = parseTimeToMinutes(reportTimeStr);
  const row = FAR_117_TABLE_A.find(
    (r) => reportMinutes >= r.startMinutes && reportMinutes <= r.endMinutes
  ) || FAR_117_TABLE_A[1];

  return {
    maxFlightHours: row.maxFlightHours,
    maxFlightMinutes: Math.round(row.maxFlightHours * 60),
    timeWindowLabel: row.timeWindowLabel,
    ruleCitation: `14 CFR § 117.11 Table A (${row.timeWindowLabel})`,
  };
}

export interface DutyPeriodFdpAudit {
  dayIndex: number;
  reportTime: string;
  releaseTime: string;
  scheduledDutyMinutes: number;
  scheduledFlightMinutes: number;
  segmentsCount: number;
  
  // Table B FDP
  maxFdpHours: number;
  maxFdpMinutes: number;
  fdpMarginMinutes: number;
  isFdpLegal: boolean;
  tableBCitation: string;

  // Table A Flight Time
  maxFlightHours: number;
  maxFlightMinutes: number;
  flightMarginMinutes: number;
  isFlightTimeLegal: boolean;
  tableACitation: string;

  isOverallLegal: boolean;
  statusText: string;
  violations: string[];
  warnings: string[];
}

/**
 * Audits an individual DutyPeriod against 14 CFR Part 117 Table B (FDP) and Table A (Flight Time).
 */
export function auditDutyPeriodFdp(duty: DutyPeriod): DutyPeriodFdpAudit {
  const operatingLegs = (duty.legs || []).filter((l) => !l.isDeadhead);
  const segmentsCount = Math.max(1, operatingLegs.length > 0 ? operatingLegs.length : (duty.legs?.length || 1));

  // Compute flight time
  const scheduledFlightMinutes = (duty.legs || []).reduce((acc, leg) => acc + (leg.blockMinutes || 0), 0);

  // Compute duty duration (FDP)
  let scheduledDutyMinutes = duty.dutyMinutes;
  if (!scheduledDutyMinutes || scheduledDutyMinutes <= 0) {
    const repM = parseTimeToMinutes(duty.reportTime);
    const relM = parseTimeToMinutes(duty.releaseTime);
    let diff = relM - repM;
    if (diff < 0) diff += 1440;
    scheduledDutyMinutes = diff;
  }

  // Lookup Table B and Table A limits
  const tableB = getMaxFdpHours(duty.reportTime, segmentsCount);
  const tableA = getMaxFlightTimeHours(duty.reportTime);

  const fdpMarginMinutes = tableB.maxFdpMinutes - scheduledDutyMinutes;
  const flightMarginMinutes = tableA.maxFlightMinutes - scheduledFlightMinutes;

  const isFdpLegal = fdpMarginMinutes >= 0;
  const isFlightTimeLegal = flightMarginMinutes >= 0;
  const isOverallLegal = isFdpLegal && isFlightTimeLegal;

  const violations: string[] = [];
  const warnings: string[] = [];

  if (!isFdpLegal) {
    violations.push(
      `FDP Limit Exceeded: Duty period is ${formatMinutesToHoursMinutes(scheduledDutyMinutes)} (${formatMinutesToHoursMinutes(Math.abs(fdpMarginMinutes))} over Table B max of ${tableB.maxFdpHours}h).`
    );
  } else if (fdpMarginMinutes < 45) {
    warnings.push(
      `Tight FDP Margin: Only ${fdpMarginMinutes}m buffer before exceeding Table B limit of ${tableB.maxFdpHours}h.`
    );
  }

  if (!isFlightTimeLegal) {
    violations.push(
      `Daily Flight Time Exceeded: Block time is ${formatMinutesToHoursMinutes(scheduledFlightMinutes)} (${formatMinutesToHoursMinutes(Math.abs(flightMarginMinutes))} over Table A max of ${tableA.maxFlightHours}h).`
    );
  } else if (flightMarginMinutes < 30) {
    warnings.push(
      `Tight Flight Time Margin: Only ${flightMarginMinutes}m buffer before exceeding Table A limit of ${tableA.maxFlightHours}h.`
    );
  }

  let statusText = "100% Legal under FAR Part 117";
  if (!isOverallLegal) {
    statusText = violations.join(" ");
  } else if (warnings.length > 0) {
    statusText = warnings.join(" ");
  }

  return {
    dayIndex: duty.dayIndex,
    reportTime: duty.reportTime,
    releaseTime: duty.releaseTime,
    scheduledDutyMinutes,
    scheduledFlightMinutes,
    segmentsCount,
    maxFdpHours: tableB.maxFdpHours,
    maxFdpMinutes: tableB.maxFdpMinutes,
    fdpMarginMinutes,
    isFdpLegal,
    tableBCitation: tableB.ruleCitation,
    maxFlightHours: tableA.maxFlightHours,
    maxFlightMinutes: tableA.maxFlightMinutes,
    flightMarginMinutes,
    isFlightTimeLegal,
    tableACitation: tableA.ruleCitation,
    isOverallLegal,
    statusText,
    violations,
    warnings,
  };
}

export interface SequenceFdpAudit {
  isLegal: boolean;
  dutyAudits: DutyPeriodFdpAudit[];
  violationsCount: number;
  warningsCount: number;
  summaryText: string;
}

/**
 * Audits an entire SequenceTrip's duty periods against 14 CFR Part 117 Table B & Table A.
 */
export function auditSequenceFdp(sequence: SequenceTrip): SequenceFdpAudit {
  const duties = sequence.dutyPeriods || [];
  const dutyAudits = duties.map(auditDutyPeriodFdp);

  const violations = dutyAudits.flatMap((a) => a.violations);
  const warnings = dutyAudits.flatMap((a) => a.warnings);
  const isLegal = violations.length === 0;

  let summaryText = `All ${duties.length} duty periods fully comply with 14 CFR Part 117 Table B FDP and Table A Flight Time limits.`;
  if (!isLegal) {
    summaryText = `${violations.length} FAR Part 117 violation(s) detected: ${violations.join("; ")}`;
  } else if (warnings.length > 0) {
    summaryText = `Legal with ${warnings.length} warning(s): ${warnings.join("; ")}`;
  }

  return {
    isLegal,
    dutyAudits,
    violationsCount: violations.length,
    warningsCount: warnings.length,
    summaryText,
  };
}
