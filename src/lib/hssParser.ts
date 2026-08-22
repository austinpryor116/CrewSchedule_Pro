import { SequenceTrip, DutyPeriod } from "../types";
import { parseHssSchedule } from "./parser";

/**
 * Parses raw HSS text into structured SequenceTrip objects containing rich flight legs and full pairing data.
 * Wraps the robust parseHssSchedule to maintain backward compatibility.
 */
export function parseHssText(rawText: string): (SequenceTrip & { tafb?: number }) | null {
  const sequences = parseHssSchedule(rawText);
  if (sequences && sequences.length > 0) {
    const seq = sequences[0];
    return {
      ...seq,
      tafb: seq.expTafbHours || 0,
    };
  }
  return null;
}
