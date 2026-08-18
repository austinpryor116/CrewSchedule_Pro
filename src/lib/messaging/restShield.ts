/**
 * CREWSCHEDULE PRO // FAR PART 117 SLEEP SHIELD
 * 14 CFR § 117.25 Rest Period Notification & Chime Interceptor
 * Suppresses audio/vibrations during 10.0h contractual and legal rest windows.
 */

import { SequenceTrip, DutyPeriod } from "../../types";

export interface RestShieldStatus {
  isSleepShieldActive: boolean;
  suppressAlerts: boolean;
  restStart?: number; // epoch ms
  restEnd?: number;   // epoch ms
  remainingRestMinutes: number;
  activeSequenceId?: string;
  dutyDayIndex?: number;
  hotelOrBase?: string;
  reason: string;
}

/**
 * Helper: Parse sequence date + duty HHMM into unix timestamp in ms.
 */
function parseDutyDateTime(startDateStr: string, dayIndex: number, hhmm: string): number {
  // startDateStr format: YYYY-MM-DD
  const [yearStr, monthStr, dayStr] = startDateStr.split("-");
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10) - 1;
  const day = parseInt(dayStr, 10) + dayIndex;

  const hours = parseInt(hhmm.slice(0, 2), 10);
  const minutes = parseInt(hhmm.slice(2, 4), 10);

  const date = new Date(year, month, day, hours, minutes, 0, 0);
  return date.getTime();
}

/**
 * Computes all FAR 117 10-hour rest blocks for given sequence trips.
 */
export function getSequenceRestBlocks(sequences: SequenceTrip[]): Array<{
  sequenceId: string;
  dayIndex: number;
  restStart: number;
  restEnd: number;
  location: string;
}> {
  const restBlocks: Array<{
    sequenceId: string;
    dayIndex: number;
    restStart: number;
    restEnd: number;
    location: string;
  }> = [];

  for (const seq of sequences) {
    if (seq.isDropped || !seq.dutyPeriods || seq.dutyPeriods.length === 0) continue;

    // 1. Pre-Trip Legal Rest: 10 hours immediately prior to Day 1 Report
    const firstDuty = seq.dutyPeriods[0];
    const firstReportTime = parseDutyDateTime(seq.startDate, 0, firstDuty.reportTime);
    const preTripRestStart = firstReportTime - 10 * 60 * 60 * 1000;
    restBlocks.push({
      sequenceId: seq.id,
      dayIndex: 0,
      restStart: preTripRestStart,
      restEnd: firstReportTime,
      location: seq.base || "Base",
    });

    // 2. Layover Legal Rest between Duty Periods
    for (let i = 0; i < seq.dutyPeriods.length - 1; i++) {
      const currentDuty = seq.dutyPeriods[i];
      const nextDuty = seq.dutyPeriods[i + 1];

      const releaseTime = parseDutyDateTime(seq.startDate, currentDuty.dayIndex, currentDuty.releaseTime);
      const nextReportTime = parseDutyDateTime(seq.startDate, nextDuty.dayIndex, nextDuty.reportTime);

      // Contractual & FAR 117 Minimum 10.0h Rest window
      if (nextReportTime > releaseTime) {
        restBlocks.push({
          sequenceId: seq.id,
          dayIndex: currentDuty.dayIndex,
          restStart: releaseTime,
          restEnd: nextReportTime,
          location: currentDuty.layoverCity || currentDuty.layoverHotelInfo || "Layover",
        });
      }
    }
  }

  return restBlocks;
}

/**
 * Evaluate active rest shield status against active sequences and manual DND setting.
 */
export function evaluateRestShield(
  sequences: SequenceTrip[],
  manualDndUntil?: number,
  nowMs: number = Date.now()
): RestShieldStatus {
  // Check manual DND first
  if (manualDndUntil && manualDndUntil > nowMs) {
    const diffMin = Math.ceil((manualDndUntil - nowMs) / 60000);
    return {
      isSleepShieldActive: true,
      suppressAlerts: true,
      restEnd: manualDndUntil,
      remainingRestMinutes: diffMin,
      reason: `Manual Rest DND active (${diffMin}m remaining)`,
    };
  }

  // Check FAR 117 rest blocks
  const blocks = getSequenceRestBlocks(sequences);
  for (const block of blocks) {
    if (nowMs >= block.restStart && nowMs < block.restEnd) {
      const diffMin = Math.ceil((block.restEnd - nowMs) / 60000);
      return {
        isSleepShieldActive: true,
        suppressAlerts: true,
        restStart: block.restStart,
        restEnd: block.restEnd,
        remainingRestMinutes: diffMin,
        activeSequenceId: block.sequenceId,
        dutyDayIndex: block.dayIndex,
        hotelOrBase: block.location,
        reason: `FAR 117 Legal Rest Active in ${block.location} (${diffMin}m until duty report)`,
      };
    }
  }

  return {
    isSleepShieldActive: false,
    suppressAlerts: false,
    remainingRestMinutes: 0,
    reason: "On Duty or Normal Standby — Alerts Enabled",
  };
}

/**
 * Check whether an incoming chat message should trigger audio/haptic chimes or be silenced.
 */
export function shouldMuteNotification(
  sequences: SequenceTrip[],
  manualDndUntil?: number,
  nowMs: number = Date.now()
): { mute: boolean; reason: string } {
  const status = evaluateRestShield(sequences, manualDndUntil, nowMs);
  return {
    mute: status.suppressAlerts,
    reason: status.reason,
  };
}

/**
 * Formats minutes into human-readable HH:MM countdown.
 */
export function formatRestCountdown(minutes: number): string {
  if (minutes <= 0) return "0h 00m";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${m.toString().padStart(2, "0")}m`;
}
