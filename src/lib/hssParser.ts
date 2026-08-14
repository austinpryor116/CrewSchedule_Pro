import { DutyPeriod } from "../types";
import { parseHssSchedule } from "./parser";

/**
 * Parses raw HSS text into partial DutyPeriod objects containing rich flight legs.
 * Wraps the robust parseHssSchedule to maintain backward compatibility.
 */
export function parseHssText(rawText: string): { sequenceNumber: string; dutyPeriods: DutyPeriod[]; totalBlockMinutes: number; tafb: number; rank?: string; startDate?: string; endDate?: string } | null {
  const sequences = parseHssSchedule(rawText);
  if (sequences && sequences.length > 0) {
    const seq = sequences[0];
    return {
      sequenceNumber: seq.sequenceNumber,
      dutyPeriods: seq.dutyPeriods,
      totalBlockMinutes: seq.totalBlockMinutes,
      tafb: 0, // parseHssSchedule doesn't compute tafb, but it's not strictly required here
      rank: seq.rank,
      startDate: seq.startDate,
      endDate: seq.endDate,
    };
  }
  return null;
}
