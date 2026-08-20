/**
 * OFFICIAL PILOT COLLECTIVE BARGAINING AGREEMENT (CBA) PAY & EXPENSES ENGINE (src/lib/cbaPayScale.ts)
 * Source Document: Pilot_Contract_(CBA)-ENY-AUTO-C6EBBFF87-1-20260720-214022.pdf
 * - Section 3: Compensation & PSP 50% Tables
 * - Section 5: Expenses Away From Domicile / Per Diem ($2.00/hr + $5.00 intl bonus)
 * - Letter 22-06 Section G: Pay Rate Adjustment for Delayed Flow (5+ Year Captains -> Step 20 Top of Scale $228.75/hr)
 * - Pilot Supply LOA / 750 SIC Provision: FOs with 750+ SIC qualify for Captain Pay
 */

export interface CbaPayStep {
  year: number; // Completed years of service (1-indexed longevity year)
  label: string;
  caHourlyRate: number;       // Captain hourly rate (including 50% PSP under Sec. 3.D.1)
  foHourlyRate: number;       // First Officer hourly rate (including 50% PSP under Sec. 3.D.1)
  checkPilotHourlyRate: number; // Line Check Airman / Evaluator rate
  domesticPerDiem: number;    // Sec. 5.B Hourly per diem ($2.00/hr)
  intlPerDiem: number;        // Sec. 5.B Hourly per diem ($2.00/hr)
  intlPerDiemBonus: number;   // Sec. 5.B.2 International overnight bonus ($5.00 flat)
  lineholderGuarantee: number; // Sec. 3.E.1 Minimum Monthly Guarantee for Lineholders (72.0h)
  reserveGuarantee: number;    // Sec. 3.E.2 Minimum Monthly Guarantee for Reserve (75.0h)
  valueOfDay: number;          // Sec. 3.F.1 Value of the Day (3.7h / 3:42)
}

/**
 * 2026 Official CBA Pay Rate Scale (Including 50% Pilot Supply Premium under Section 3.D)
 * Reference: CBA Section 3.D.1 Captain & First Officer Rate Tables
 */
export const CBA_AIRLINE_PAY_SCALE: CbaPayStep[] = [
  { year: 1, label: "Year 1 (0-11 mos)", caHourlyRate: 161.25, foHourlyRate: 102.00, checkPilotHourlyRate: 185.00, domesticPerDiem: 2.00, intlPerDiem: 2.00, intlPerDiemBonus: 5.00, lineholderGuarantee: 72.0, reserveGuarantee: 75.0, valueOfDay: 3.7 },
  { year: 2, label: "Year 2", caHourlyRate: 165.00, foHourlyRate: 109.50, checkPilotHourlyRate: 190.00, domesticPerDiem: 2.00, intlPerDiem: 2.00, intlPerDiemBonus: 5.00, lineholderGuarantee: 72.0, reserveGuarantee: 75.0, valueOfDay: 3.7 },
  { year: 3, label: "Year 3", caHourlyRate: 168.75, foHourlyRate: 117.00, checkPilotHourlyRate: 195.00, domesticPerDiem: 2.00, intlPerDiem: 2.00, intlPerDiemBonus: 5.00, lineholderGuarantee: 72.0, reserveGuarantee: 75.0, valueOfDay: 3.7 },
  { year: 4, label: "Year 4", caHourlyRate: 172.50, foHourlyRate: 120.75, checkPilotHourlyRate: 200.00, domesticPerDiem: 2.00, intlPerDiem: 2.00, intlPerDiemBonus: 5.00, lineholderGuarantee: 72.0, reserveGuarantee: 75.0, valueOfDay: 3.7 },
  { year: 5, label: "Year 5", caHourlyRate: 176.25, foHourlyRate: 120.75, checkPilotHourlyRate: 205.00, domesticPerDiem: 2.00, intlPerDiem: 2.00, intlPerDiemBonus: 5.00, lineholderGuarantee: 72.0, reserveGuarantee: 75.0, valueOfDay: 3.7 },
  { year: 6, label: "Year 6", caHourlyRate: 180.00, foHourlyRate: 120.75, checkPilotHourlyRate: 210.00, domesticPerDiem: 2.00, intlPerDiem: 2.00, intlPerDiemBonus: 5.00, lineholderGuarantee: 72.0, reserveGuarantee: 75.0, valueOfDay: 3.7 },
  { year: 7, label: "Year 7", caHourlyRate: 183.75, foHourlyRate: 120.75, checkPilotHourlyRate: 215.00, domesticPerDiem: 2.00, intlPerDiem: 2.00, intlPerDiemBonus: 5.00, lineholderGuarantee: 72.0, reserveGuarantee: 75.0, valueOfDay: 3.7 },
  { year: 8, label: "Year 8", caHourlyRate: 187.50, foHourlyRate: 120.75, checkPilotHourlyRate: 220.00, domesticPerDiem: 2.00, intlPerDiem: 2.00, intlPerDiemBonus: 5.00, lineholderGuarantee: 72.0, reserveGuarantee: 75.0, valueOfDay: 3.7 },
  { year: 9, label: "Year 9", caHourlyRate: 191.25, foHourlyRate: 120.75, checkPilotHourlyRate: 225.00, domesticPerDiem: 2.00, intlPerDiem: 2.00, intlPerDiemBonus: 5.00, lineholderGuarantee: 72.0, reserveGuarantee: 75.0, valueOfDay: 3.7 },
  { year: 10, label: "Year 10", caHourlyRate: 195.00, foHourlyRate: 120.75, checkPilotHourlyRate: 230.00, domesticPerDiem: 2.00, intlPerDiem: 2.00, intlPerDiemBonus: 5.00, lineholderGuarantee: 72.0, reserveGuarantee: 75.0, valueOfDay: 3.7 },
  { year: 11, label: "Year 11", caHourlyRate: 198.75, foHourlyRate: 120.75, checkPilotHourlyRate: 235.00, domesticPerDiem: 2.00, intlPerDiem: 2.00, intlPerDiemBonus: 5.00, lineholderGuarantee: 72.0, reserveGuarantee: 75.0, valueOfDay: 3.7 },
  { year: 12, label: "Year 12", caHourlyRate: 202.50, foHourlyRate: 120.75, checkPilotHourlyRate: 240.00, domesticPerDiem: 2.00, intlPerDiem: 2.00, intlPerDiemBonus: 5.00, lineholderGuarantee: 72.0, reserveGuarantee: 75.0, valueOfDay: 3.7 },
  { year: 13, label: "Year 13", caHourlyRate: 206.25, foHourlyRate: 120.75, checkPilotHourlyRate: 245.00, domesticPerDiem: 2.00, intlPerDiem: 2.00, intlPerDiemBonus: 5.00, lineholderGuarantee: 72.0, reserveGuarantee: 75.0, valueOfDay: 3.7 },
  { year: 14, label: "Year 14", caHourlyRate: 210.00, foHourlyRate: 120.75, checkPilotHourlyRate: 250.00, domesticPerDiem: 2.00, intlPerDiem: 2.00, intlPerDiemBonus: 5.00, lineholderGuarantee: 72.0, reserveGuarantee: 75.0, valueOfDay: 3.7 },
  { year: 15, label: "Year 15", caHourlyRate: 213.75, foHourlyRate: 120.75, checkPilotHourlyRate: 255.00, domesticPerDiem: 2.00, intlPerDiem: 2.00, intlPerDiemBonus: 5.00, lineholderGuarantee: 72.0, reserveGuarantee: 75.0, valueOfDay: 3.7 },
  { year: 16, label: "Year 16", caHourlyRate: 217.50, foHourlyRate: 120.75, checkPilotHourlyRate: 260.00, domesticPerDiem: 2.00, intlPerDiem: 2.00, intlPerDiemBonus: 5.00, lineholderGuarantee: 72.0, reserveGuarantee: 75.0, valueOfDay: 3.7 },
  { year: 17, label: "Year 17", caHourlyRate: 221.25, foHourlyRate: 120.75, checkPilotHourlyRate: 265.00, domesticPerDiem: 2.00, intlPerDiem: 2.00, intlPerDiemBonus: 5.00, lineholderGuarantee: 72.0, reserveGuarantee: 75.0, valueOfDay: 3.7 },
  { year: 18, label: "Year 18", caHourlyRate: 225.00, foHourlyRate: 120.75, checkPilotHourlyRate: 270.00, domesticPerDiem: 2.00, intlPerDiem: 2.00, intlPerDiemBonus: 5.00, lineholderGuarantee: 72.0, reserveGuarantee: 75.0, valueOfDay: 3.7 },
  { year: 19, label: "Year 19", caHourlyRate: 228.75, foHourlyRate: 120.75, checkPilotHourlyRate: 275.00, domesticPerDiem: 2.00, intlPerDiem: 2.00, intlPerDiemBonus: 5.00, lineholderGuarantee: 72.0, reserveGuarantee: 75.0, valueOfDay: 3.7 },
  { year: 20, label: "Year 20+", caHourlyRate: 228.75, foHourlyRate: 120.75, checkPilotHourlyRate: 275.00, domesticPerDiem: 2.00, intlPerDiem: 2.00, intlPerDiemBonus: 5.00, lineholderGuarantee: 72.0, reserveGuarantee: 75.0, valueOfDay: 3.7 },
];

function parseFlexibleDate(dateStr?: string): { year: number; month: number; day: number } | null {
  if (!dateStr) return null;
  const cleaned = dateStr.trim();
  if (cleaned.includes("/")) {
    const parts = cleaned.split("/").map((p) => parseInt(p, 10));
    if (parts.length >= 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
      if (parts[0] > 1900) {
        return { year: parts[0], month: parts[1], day: parts[2] };
      } else {
        return { year: parts[2], month: parts[0], day: parts[1] };
      }
    }
  }
  const parts = cleaned.split("-").map((p) => parseInt(p, 10));
  if (parts.length >= 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
    return { year: parts[0], month: parts[1], day: parts[2] };
  }
  return null;
}

/**
 * Calculates the start date and label for the next airline semi-monthly pay period.
 * Pay period rule: Pay adjustments take effect on the 1st or 16th of the month following the event date.
 */
export function calculateNextPayPeriodDate(dateStr?: string): { nextPeriodDate: string; nextPeriodLabel: string } {
  const parsed = parseFlexibleDate(dateStr);
  if (!parsed) {
    return { nextPeriodDate: "", nextPeriodLabel: "Next Pay Period" };
  }
  const { year, month, day } = parsed;

  if (day <= 15) {
    // Current period is 1st - 15th; next pay period starts 16th of current month
    const mStr = String(month).padStart(2, "0");
    return { nextPeriodDate: `${year}-${mStr}-16`, nextPeriodLabel: `${month}/16 Pay Period` };
  } else {
    // Current period is 16th - end of month; next pay period starts 1st of next month
    let nextYear = year;
    let nextMonth = month + 1;
    if (nextMonth > 12) {
      nextMonth = 1;
      nextYear++;
    }
    const nmStr = String(nextMonth).padStart(2, "0");
    return { nextPeriodDate: `${nextYear}-${nmStr}-01`, nextPeriodLabel: `${nextMonth}/01 Pay Period` };
  }
}

/**
 * Calculates completed longevity years and months from official Date of Hire (DOH).
 */
export function calculateLongevityYears(
  hireDateStr?: string,
  referenceDate = new Date()
): { years: number; months: number; payStepYear: number; longevityFormatted: string } {
  const parsed = parseFlexibleDate(hireDateStr);
  if (!parsed) {
    return { years: 0, months: 0, payStepYear: 1, longevityFormatted: "1st Year (0 mos)" };
  }

  const hireYear = parsed.year;
  const hireMonth = parsed.month - 1; // 0-indexed month
  const hireDay = parsed.day;

  const hireDate = new Date(hireYear, hireMonth, hireDay);
  if (isNaN(hireDate.getTime())) {
    return { years: 0, months: 0, payStepYear: 1, longevityFormatted: "1st Year (0 mos)" };
  }

  let years = referenceDate.getFullYear() - hireYear;
  let months = referenceDate.getMonth() - hireMonth;

  if (referenceDate.getDate() < hireDay) {
    months--;
  }

  if (months < 0) {
    years--;
    months += 12;
  }

  years = Math.max(0, years);
  months = Math.max(0, months);

  // Pay Step Year is 1-indexed: 0 completed years = Year 1 Step, 1 completed year = Year 2 Step, etc.
  const payStepYear = Math.min(20, Math.max(1, years + 1));

  let longevityFormatted = "";
  if (years === 0) {
    longevityFormatted = `${months} Month${months === 1 ? "" : "s"} (Step Year 1)`;
  } else {
    longevityFormatted = `${years} Yr${years === 1 ? "" : "s"} ${months} Mo${months === 1 ? "" : "s"} (Step Year ${payStepYear})`;
  }

  return { years, months, payStepYear, longevityFormatted };
}

export interface CbaRatesOptions {
  hireDateStr?: string;
  role?: "CA" | "FO" | "CHECK_PILOT" | string;
  hasCompleted750Sic?: boolean;
  flowStatus?: "ACCEPT" | "DECLINE" | "BYPASS" | "PENDING";
  isCaptainFlowTopScale?: boolean;
  referenceDate?: Date;
}

/**
 * Returns contractual CBA pay scale and per diem rates for a pilot profile based on:
 * - Date of Hire (DOH) longevity
 * - Seat / Role (Captain, First Officer, Check Airman)
 * - 750 SIC Captain Pay Provision (Before Dec 31, 2026)
 * - 5-Year Captain Delayed Flow Top-of-Scale Pay (Letter 22-06 Sec. G -> Step 20 $228.75/hr)
 */
export function getCbaRatesForProfile(
  optionsOrHireDate?: CbaRatesOptions | string,
  legacyRole: "CA" | "FO" | "CHECK_PILOT" | string = "CA",
  legacyRefDate = new Date()
): {
  longevityYears: number;
  longevityMonths: number;
  payStepYear: number;
  longevityFormatted: string;
  stepLabel: string;
  hourlyRate: number;
  baseHourlyRate: number;
  is750SicActive: boolean;
  isFlowTopScaleActive: boolean;
  isFlowDeclined: boolean;
  domesticPerDiem: number;
  intlPerDiem: number;
  intlPerDiemBonus: number;
  lineholderGuarantee: number;
  reserveGuarantee: number;
  valueOfDay: number;
  cbaCitation: string;
  nextPayPeriodNote?: string;
} {
  let hireDateStr: string | undefined;
  let role: string = "CA";
  let hasCompleted750Sic: boolean = false;
  let flowStatus: "ACCEPT" | "DECLINE" | "BYPASS" | "PENDING" = "ACCEPT";
  let isCaptainFlowTopScale: boolean = false;
  let referenceDate: Date = new Date();

  if (typeof optionsOrHireDate === "object" && optionsOrHireDate !== null) {
    hireDateStr = optionsOrHireDate.hireDateStr;
    role = optionsOrHireDate.role || "CA";
    hasCompleted750Sic = !!optionsOrHireDate.hasCompleted750Sic;
    flowStatus = optionsOrHireDate.flowStatus || "ACCEPT";
    isCaptainFlowTopScale = !!optionsOrHireDate.isCaptainFlowTopScale;
    referenceDate = optionsOrHireDate.referenceDate || new Date();
  } else {
    hireDateStr = optionsOrHireDate;
    role = legacyRole;
    referenceDate = legacyRefDate;
  }

  const { years, months, payStepYear, longevityFormatted } = calculateLongevityYears(hireDateStr, referenceDate);
  const stepConfig = CBA_AIRLINE_PAY_SCALE.find((s) => s.year === payStepYear) || CBA_AIRLINE_PAY_SCALE[CBA_AIRLINE_PAY_SCALE.length - 1];

  let hourlyRate = stepConfig.caHourlyRate;
  let baseHourlyRate = stepConfig.caHourlyRate;
  let is750SicActive = false;
  let isFlowTopScaleActive = false;
  let isFlowDeclined = false;
  let cbaCitation = "";

  if (role === "FO") {
    baseHourlyRate = stepConfig.foHourlyRate;
    if (hasCompleted750Sic) {
      // FO qualified with 750+ hours SIC before Dec 31, 2026 -> Placed on Captain pay
      hourlyRate = stepConfig.caHourlyRate;
      is750SicActive = true;
      cbaCitation = `CBA 750 SIC Provision: Paid at Captain Step ${payStepYear} Rate ($${hourlyRate.toFixed(2)}/hr w/ 50% PSP)`;
    } else {
      hourlyRate = stepConfig.foHourlyRate;
      cbaCitation = `CBA Sec. 3.D.1 (First Officer Step ${payStepYear}, 2026 Rate Table w/ 50% PSP)`;
    }
  } else if (role === "CHECK_PILOT") {
    baseHourlyRate = stepConfig.checkPilotHourlyRate;
    hourlyRate = stepConfig.checkPilotHourlyRate;
    cbaCitation = `CBA Sec. 25 & Letter 22-07 (Check Airman Step ${payStepYear}: $${hourlyRate.toFixed(2)}/hr)`;
  } else {
    // Captain (CA)
    baseHourlyRate = stepConfig.caHourlyRate;
    const isCompleted5Years = years >= 5 || isCaptainFlowTopScale;

    if (isCompleted5Years) {
      if (flowStatus === "DECLINE" || flowStatus === "BYPASS") {
        // Pilot declined or bypassed flow -> Reverts to base longevity step pay
        hourlyRate = stepConfig.caHourlyRate;
        isFlowDeclined = true;
        cbaCitation = `CBA Sec. 3.D.1 (Flow Declined/Bypassed: Reverted to Base Longevity Step ${payStepYear} Rate: $${hourlyRate.toFixed(2)}/hr)`;
      } else {
        // Delayed Flow Top-of-Scale (Letter 22-06 Section G) -> Step 20 ($228.75/hr)
        hourlyRate = 228.75;
        isFlowTopScaleActive = true;
        cbaCitation = `CBA Letter 22-06 Sec. G: 5+ Yr Captain Delayed Flow Top-of-Scale (Step 20: $228.75/hr)`;
      }
    } else {
      hourlyRate = stepConfig.caHourlyRate;
      cbaCitation = `CBA Sec. 3.D.1 (Captain Step ${payStepYear}, 2026 Rate Table w/ 50% PSP)`;
    }
  }

  return {
    longevityYears: years,
    longevityMonths: months,
    payStepYear,
    longevityFormatted,
    stepLabel: stepConfig.label,
    hourlyRate,
    baseHourlyRate,
    is750SicActive,
    isFlowTopScaleActive,
    isFlowDeclined,
    domesticPerDiem: stepConfig.domesticPerDiem,
    intlPerDiem: stepConfig.intlPerDiem,
    intlPerDiemBonus: stepConfig.intlPerDiemBonus,
    lineholderGuarantee: stepConfig.lineholderGuarantee,
    reserveGuarantee: stepConfig.reserveGuarantee,
    valueOfDay: stepConfig.valueOfDay,
    cbaCitation,
    nextPayPeriodNote: "Pay rate adjustments become active in the pay period immediately following qualification.",
  };
}
