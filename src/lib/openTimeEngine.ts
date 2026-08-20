import {
  OpenSequence,
  SequenceTrip,
  UserProfile,
  PayRates,
  PickupLegalityAudit,
  PickupFinancialImpact,
  OpenTimeSniperConfig,
  OpenTimePickupMode,
} from "@/types";
import { checkOpenSequenceConflict, timeToMinutes, formatAviationHours } from "./parser";
import { getCbaRatesForProfile } from "./cbaPayScale";

// ============================================================================
// ENVOY AIR CONSTANTS
// ============================================================================
export const ENVOY_DOMICILE_BASES = ["ORD", "DFW", "MIA", "PHX"] as const;
export const ENVOY_FLEET_TYPES = ["E175", "E170", "E75", "E70"] as const;
export const ENVOY_PER_DIEM_RATE = 2.4; // $2.40/hr TAFB

/**
 * Returns the DECS in-base hotel suffix character
 * ORD -> C, DFW -> D, MIA -> M, PHX -> P
 */
export function getDecsBaseCode(base: string): string {
  const b = (base || "ORD").trim().toUpperCase();
  if (b === "DFW") return "D";
  if (b === "MIA") return "M";
  if (b === "PHX") return "P";
  return "C"; // Default ORD
}

/**
 * Parses military time string "0830" or "08:30" to minutes from midnight
 */
export function parseTimeToMinutes(timeStr?: string): number {
  if (!timeStr) return 0;
  const clean = timeStr.replace(":", "").trim();
  if (clean.length >= 4) {
    const hh = parseInt(clean.slice(0, 2), 10) || 0;
    const mm = parseInt(clean.slice(2, 4), 10) || 0;
    return hh * 60 + mm;
  }
  return 0;
}

/**
 * Default Open Time Sniper Settings
 */
export const DEFAULT_OPEN_TIME_SNIPER_CONFIG: OpenTimeSniperConfig = {
  enabled: false,
  minCreditHours: 12.0,
  maxTripDays: 4,
  preferredBases: ["ORD", "DFW"],
  preferredLayovers: [],
  avoidLayovers: [],
  maxLegsPerDay: 4,
  earliestReport: "06:00",
  latestRelease: "22:00",
  autoExecuteDecs: false,
  notificationsEnabled: true,
};

// ============================================================================
// CORE OPEN TIME ENGINE
// ============================================================================
export class OpenTimeEngine {
  /**
   * Evaluates legality and rest compliance for picking up an open sequence
   */
  static evaluatePickupLegality(
    openSeq: OpenSequence,
    activeSchedule: SequenceTrip[],
    userProfile?: UserProfile | null
  ): PickupLegalityAudit {
    const reasons: string[] = [];
    const warnings: string[] = [];
    let score = 85;

    // 1. Direct Schedule Overlap Conflict Check
    const conflictResult = checkOpenSequenceConflict(openSeq, activeSchedule);
    const overlapConflict = conflictResult.hasConflict;

    if (overlapConflict) {
      score -= 50;
      reasons.push(`Direct schedule conflict: ${conflictResult.reason}`);
    } else {
      reasons.push("Verified: Zero calendar and duty overlap with active schedule.");
    }

    // 2. Base & Fleet Compatibility Check
    const userBase = (userProfile?.base || "ORD").trim().toUpperCase();
    const tripBase = (openSeq.base || "ORD").trim().toUpperCase();
    const isBaseCompatible = tripBase === userBase || ENVOY_DOMICILE_BASES.includes(tripBase as any);

    if (tripBase !== userBase) {
      warnings.push(`Trip base (${tripBase}) differs from domicile (${userBase}) - TDY / Out-of-base pickup.`);
      score -= 10;
    }

    // 3. Fleet Compatibility (Envoy E175/E170 Only)
    const tripEquip = (openSeq.equipment || "E75").trim().toUpperCase();
    const isFleetCompatible = ENVOY_FLEET_TYPES.some((f) => tripEquip.includes(f));
    if (!isFleetCompatible) {
      reasons.push(`Incompatible fleet: ${tripEquip}. Envoy operates Embraer 170/175 only.`);
      score -= 40;
    }

    // 4. Seat / Crew Position Compatibility
    const userRole = (userProfile?.crewRole || "CA").toUpperCase();
    const tripPos = (openSeq.position || "CA").toUpperCase();
    const isPositionCompatible =
      userRole === tripPos ||
      (userRole === "CHECK_PILOT" && tripPos === "CA") ||
      (userRole === "CA" && tripPos === "CA") ||
      (userRole === "FO" && tripPos === "FO") ||
      (userRole === "FA" && tripPos === "FA");

    if (!isPositionCompatible) {
      reasons.push(`Seat mismatch: Your profile is ${userRole}, but trip is listed for ${tripPos}.`);
      score -= 40;
    }

    // 5. Rest Evaluation (Pre-Duty & Post-Duty)
    // Find closest preceding duty and closest subsequent duty
    const openStart = new Date(openSeq.startDate);
    const openEnd = new Date(openSeq.endDate);

    let preDutyRestHours = 72; // Default assume ample rest
    let postDutyRestHours = 72;

    const priorTrips = activeSchedule.filter((s) => new Date(s.endDate) <= openStart && !s.isSimulated);
    const subsequentTrips = activeSchedule.filter((s) => new Date(s.startDate) >= openEnd && !s.isSimulated);

    if (priorTrips.length > 0) {
      const lastTrip = priorTrips.sort((a, b) => new Date(b.endDate).getTime() - new Date(a.endDate).getTime())[0];
      const diffMs = openStart.getTime() - new Date(lastTrip.endDate).getTime();
      preDutyRestHours = Math.max(0, Math.round((diffMs / (1000 * 60 * 60)) * 10) / 10);
    }

    if (subsequentTrips.length > 0) {
      const nextTrip = subsequentTrips.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())[0];
      const diffMs = new Date(nextTrip.startDate).getTime() - openEnd.getTime();
      postDutyRestHours = Math.max(0, Math.round((diffMs / (1000 * 60 * 60)) * 10) / 10);
    }

    const minRestRequired = userRole === "FA" ? 9.0 : 10.0;
    const isPreDutyRestLegal = preDutyRestHours >= minRestRequired;
    const isPostDutyRestLegal = postDutyRestHours >= minRestRequired;

    if (!isPreDutyRestLegal) {
      reasons.push(`Insufficient pre-duty rest: ${preDutyRestHours}h available (min ${minRestRequired}h required).`);
      score -= 30;
    } else {
      reasons.push(`Pre-duty rest legal: ${preDutyRestHours}h available before report.`);
    }

    if (!isPostDutyRestLegal) {
      reasons.push(`Insufficient post-duty rest: ${postDutyRestHours}h available before next trip.`);
      score -= 30;
    } else {
      reasons.push(`Post-duty rest legal: ${postDutyRestHours}h available after release.`);
    }

    // 6. 30-in-7 Rest Requirement (FAR 117.25(b))
    const has30in7Rest = preDutyRestHours >= 30 || postDutyRestHours >= 30;
    if (has30in7Rest) {
      reasons.push("30-in-7 Rest Satisfied: Continuous 30+ hour rest period present.");
    } else {
      warnings.push("Verify 30 consecutive hours of rest within the 168-hour rolling window.");
    }

    // Determine overall status
    const isLegal = !overlapConflict && isPreDutyRestLegal && isPostDutyRestLegal && isPositionCompatible && isFleetCompatible;
    let overallStatus: "LEGAL" | "WARNING" | "ILLEGAL" = "LEGAL";
    if (!isLegal) {
      overallStatus = "ILLEGAL";
    } else if (warnings.length > 0) {
      overallStatus = "WARNING";
    }

    score = Math.max(0, Math.min(100, score));

    return {
      isLegal,
      score,
      overallStatus,
      overlapConflict,
      overlapDetails: conflictResult.reason,
      preDutyRestHours,
      isPreDutyRestLegal,
      postDutyRestHours,
      isPostDutyRestLegal,
      has30in7Rest,
      isBaseCompatible,
      isPositionCompatible,
      isFleetCompatible,
      reasons,
      warnings,
    };
  }

  /**
   * Evaluates exact contractual CBA or custom pay rates for user profile
   */
  static getEffectivePayRates(
    payRates?: PayRates | null,
    userProfile?: UserProfile | null
  ): { hourlyRate: number; perDiemRate: number; role: string; cbaRates: any } {
    let hourlyRate = payRates?.hourlyRate || 0;
    let perDiemRate = payRates?.perDiemRate || 0;

    const cbaRates = getCbaRatesForProfile({
      hireDateStr: userProfile?.hireDate,
      role: userProfile?.crewRole || payRates?.crewRole || "CA",
      hasCompleted750Sic: userProfile?.hasCompleted750Sic,
      flowStatus: userProfile?.flowStatus,
      isCaptainFlowTopScale: userProfile?.isCaptainFlowTopScale,
    });

    if (!hourlyRate || hourlyRate <= 0) {
      hourlyRate = cbaRates.hourlyRate;
    }

    if (!perDiemRate || perDiemRate <= 0) {
      perDiemRate = cbaRates.domesticPerDiem;
    }

    const role = (userProfile?.crewRole || payRates?.crewRole || "CA").toUpperCase();

    return {
      hourlyRate,
      perDiemRate,
      role,
      cbaRates,
    };
  }

  /**
   * Calculates earnings and credit impact for picking up a sequence
   */
  static calculatePickupEarnings(
    openSeq: OpenSequence,
    currentMonthlyCredit: number = 75.0,
    payRates?: PayRates | null,
    userProfile?: UserProfile | null
  ): PickupFinancialImpact {
    const { hourlyRate, perDiemRate } = this.getEffectivePayRates(payRates, userProfile);

    const addedCreditHours = openSeq.creditHours || 0;
    const estimatedGrossPay = Math.round(addedCreditHours * hourlyRate * 100) / 100;

    const sDate = new Date(openSeq.startDate);
    const eDate = new Date(openSeq.endDate);
    const daySpan = Math.max(1, Math.round((eDate.getTime() - sDate.getTime()) / (1000 * 60 * 60 * 24)) + 1);
    const estTafbHours = daySpan * 18.5;
    const estimatedPerDiem = Math.round(estTafbHours * perDiemRate * 100) / 100;

    const newProjectedMonthlyCredit = Math.round((currentMonthlyCredit + addedCreditHours) * 100) / 100;
    const newProjectedGrossPay = Math.round(newProjectedMonthlyCredit * hourlyRate * 100) / 100;

    const isOvertimeEligible = newProjectedMonthlyCredit > 80.0;
    const overtimeHours = isOvertimeEligible ? Math.min(addedCreditHours, newProjectedMonthlyCredit - 80.0) : 0;
    const overtimeBonusEst = Math.round(overtimeHours * (hourlyRate * 0.5) * 100) / 100;

    return {
      addedCreditHours,
      hourlyRate,
      estimatedGrossPay,
      estimatedPerDiem,
      newProjectedMonthlyCredit,
      newProjectedGrossPay,
      isOvertimeEligible,
      overtimeBonusEst,
    };
  }

  /**
   * Calculates comprehensive money breakdown for any SequenceTrip or OpenSequence
   */
  static calculateSequenceMoney(
    seq: SequenceTrip | OpenSequence,
    payRates?: PayRates | null,
    userProfile?: UserProfile | null
  ) {
    const seqNum = seq.sequenceNumber || "SEQ";
    const { hourlyRate, perDiemRate, role } = this.getEffectivePayRates(payRates, userProfile);

    // 1. Extract exact trip credit hours
    let creditHours = 0;
    if ("totalCreditMinutes" in seq && seq.totalCreditMinutes > 0) {
      creditHours = seq.totalCreditMinutes / 60;
    } else if ("creditHours" in seq && seq.creditHours > 0) {
      creditHours = seq.creditHours;
    } else if ("dutyPeriods" in seq && seq.dutyPeriods && seq.dutyPeriods.length > 0) {
      const totalLegsBlock = seq.dutyPeriods.reduce((sum, dp) => {
        const dpBlock = dp.legs ? dp.legs.reduce((lSum, l) => lSum + (l.blockMinutes || 0), 0) : 0;
        return sum + Math.max(dp.payCreditMinutes || 0, dpBlock || 0);
      }, 0);
      creditHours = totalLegsBlock / 60;
    }
    if (creditHours <= 0) creditHours = 15.5;

    // 2. Extract or estimate TAFB
    let tafbHours = 0;
    if ("expTafbHours" in seq && seq.expTafbHours && seq.expTafbHours > 0) {
      tafbHours = seq.expTafbHours;
    } else if ("actualTafbHours" in seq && seq.actualTafbHours && seq.actualTafbHours > 0) {
      tafbHours = seq.actualTafbHours;
    } else {
      const numDays = Math.max(1, ("dutyPeriods" in seq && seq.dutyPeriods?.length) || 1);
      tafbHours = numDays * 18.5;
    }

    // 3. Calculations
    const grossPay = Math.round(creditHours * hourlyRate * 100) / 100;
    const perDiemPay = Math.round(tafbHours * perDiemRate * 100) / 100;
    const totalTripValue = Math.round((grossPay + perDiemPay) * 100) / 100;

    return {
      seqNum,
      creditHours,
      creditFormatted: formatAviationHours(Math.round(creditHours * 60), "dot"),
      tafbHours,
      hourlyRate,
      perDiemRate,
      grossPay,
      perDiemPay,
      totalTripValue,
      role,
    };
  }

  /**
   * Generates the DECS WebSabre macro keystroke string for picking up or trading an open sequence
   */
  static generateDecsPickupMacro(
    openSeq: OpenSequence,
    mode: OpenTimePickupMode = "STRAIGHT_HTO",
    userProfile?: UserProfile | null,
    dropSeq?: SequenceTrip | null
  ): string {
    const seq = openSeq.sequenceNumber.trim().toUpperCase();
    const d = new Date(openSeq.startDate);
    const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
    const day = String(d.getDate()).padStart(2, "0");
    const mStr = months[d.getMonth()] || "AUG";
    const startDateFormatted = `${day}${mStr}`;

    const seat = (userProfile?.crewRole || openSeq.position || "CA").toUpperCase() === "FO" ? "FO" : "CA";

    if (mode === "SWAP_HTS" && dropSeq) {
      const dropNum = dropSeq.sequenceNumber.trim().toUpperCase();
      const dropD = new Date(dropSeq.startDate);
      const dropDay = String(dropD.getDate()).padStart(2, "0");
      const dropM = months[dropD.getMonth()] || "AUG";
      const dropDateFormatted = `${dropDay}${dropM}`;

      // Trade/Swap Sequence Macro (Give A, Take B)
      return `HIY^HT^HTS/A/${dropNum}/${dropDateFormatted}^HTS/B/${seq}/${startDateFormatted}/${seat}^HTMD^HZ^HIN^`;
    }

    if (mode === "DROP_BOARD_HTD" || openSeq.isDropBoard) {
      // Drop Board Pickup Macro
      return `HIY^HT^HTD/B/${seq}/${startDateFormatted}/${seat}^HTMD^HZ^HIN^`;
    }

    // Straight Open Time Pickup Macro (HTO)
    return `HIY^HT^HTO/B/${seq}/${startDateFormatted}/${seat}^HTMD^HZ^HIN^`;
  }

  /**
   * Ranks open time trips by efficiency and earnings potential
   */
  static rankOpenTimeTrips(
    openSequences: OpenSequence[],
    activeSchedule: SequenceTrip[],
    userProfile?: UserProfile | null
  ): (OpenSequence & { audit: PickupLegalityAudit; earnings: PickupFinancialImpact })[] {
    return openSequences
      .map((seq) => {
        const audit = this.evaluatePickupLegality(seq, activeSchedule, userProfile);
        const earnings = this.calculatePickupEarnings(seq, 75.0, null, userProfile);
        return {
          ...seq,
          audit,
          earnings,
        };
      })
      .sort((a, b) => {
        // Legal trips first
        if (a.audit.isLegal && !b.audit.isLegal) return -1;
        if (!a.audit.isLegal && b.audit.isLegal) return 1;

        // Higher credit first
        return b.creditHours - a.creditHours;
      });
  }

  /**
   * Tests if an open sequence matches the user's Open Time Sniper criteria
   */
  static matchSniperCriteria(seq: OpenSequence, config: OpenTimeSniperConfig): boolean {
    if (!config.enabled) return false;

    // Minimum credit check
    if (seq.creditHours < config.minCreditHours) return false;

    // Base filter
    if (config.preferredBases.length > 0 && seq.base) {
      const match = config.preferredBases.some((b) => b.toUpperCase() === seq.base?.toUpperCase());
      if (!match) return false;
    }

    // Layover preferences
    if (config.preferredLayovers.length > 0 && seq.layoverDescription) {
      const match = config.preferredLayovers.some((city) =>
        seq.layoverDescription.toUpperCase().includes(city.toUpperCase())
      );
      if (!match) return false;
    }

    // Avoid layovers
    if (config.avoidLayovers.length > 0 && seq.layoverDescription) {
      const matchAvoid = config.avoidLayovers.some((city) =>
        seq.layoverDescription.toUpperCase().includes(city.toUpperCase())
      );
      if (matchAvoid) return false;
    }

    return true;
  }
}
