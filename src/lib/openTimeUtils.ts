import { OpenSequence } from "@/types";

/**
 * Evaluates whether an open time sequence starts in the past or has already departed/closed.
 */
export function isOpenSequenceInPast(seq: OpenSequence): boolean {
  if (!seq || !seq.startDate) return false;
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const todayStr = `${y}-${m}-${d}`;

  // Past date check:
  if (seq.startDate < todayStr) return true;

  // Today check: if report time was > 15m ago, it has already departed / closed
  if (seq.startDate === todayStr && seq.reportTime) {
    const cleanReport = seq.reportTime.replace(/\D/g, "");
    if (cleanReport.length === 4) {
      const repM = parseInt(cleanReport.substring(0, 2), 10) * 60 + parseInt(cleanReport.substring(2, 4), 10);
      const currentM = now.getHours() * 60 + now.getMinutes();
      if (repM + 15 < currentM) return true;
    }
  }
  return false;
}

/**
 * Reconciles newly pulled Open Time sequences against existing Open Time:
 * 1. Automatically purges all past-date sequences.
 * 2. Scopes by base & position of the newly fetched data: any existing trip in that scope that is NOT on the new list is deleted.
 * 3. Preserves active trips from other bases/positions.
 * 4. Returns the clean authoritative list.
 */
export function reconcileOpenSequences(
  existingOpen: OpenSequence[],
  newlyFetched: OpenSequence[],
  forcedScope?: { bases?: string[]; positions?: string[] }
): { reconciled: OpenSequence[]; deletedCount: number; addedCount: number } {
  // 1. Purge all past sequences from new fetch
  const cleanNew = (newlyFetched || []).filter((s) => !isOpenSequenceInPast(s));

  // Determine scope of the pull
  const basesInPull = forcedScope?.bases && forcedScope.bases.length > 0 
    ? forcedScope.bases.map((b) => b.toUpperCase())
    : Array.from(new Set(cleanNew.map((s) => s.base?.toUpperCase()).filter(Boolean) as string[]));

  const positionsInPull = forcedScope?.positions && forcedScope.positions.length > 0
    ? forcedScope.positions.map((p) => p.toUpperCase())
    : Array.from(new Set(cleanNew.map((s) => s.position?.toUpperCase()).filter(Boolean) as string[]));

  // 2. Filter existing: remove past items and items in scope that are no longer present
  const cleanExisting = (existingOpen || []).filter((s) => !isOpenSequenceInPast(s));

  const newKeys = new Set(cleanNew.map((s) => `${s.sequenceNumber}_${s.startDate}_${s.base || ""}_${s.position || ""}`));

  let deletedCount = 0;
  const preservedExisting: OpenSequence[] = [];

  cleanExisting.forEach((s) => {
    const sBase = s.base?.toUpperCase() || "";
    const sPos = s.position?.toUpperCase() || "";
    const inScope = (basesInPull.length === 0 || basesInPull.includes(sBase)) &&
                    (positionsInPull.length === 0 || positionsInPull.includes(sPos));

    const key = `${s.sequenceNumber}_${s.startDate}_${s.base || ""}_${s.position || ""}`;

    if (inScope) {
      if (!newKeys.has(key)) {
        // No longer on the board! It was assigned, picked up, or expired.
        deletedCount++;
      } else {
        // Replaced by new entry in cleanNew
      }
    } else {
      // Out of scope (e.g. from another base): keep it
      preservedExisting.push(s);
    }
  });

  // 3. Combine preserved + fresh
  const map = new Map<string, OpenSequence>();
  preservedExisting.forEach((s) => map.set(`${s.sequenceNumber}_${s.startDate}_${s.base || ""}_${s.position || ""}`, s));
  cleanNew.forEach((s) => map.set(`${s.sequenceNumber}_${s.startDate}_${s.base || ""}_${s.position || ""}`, s));

  const reconciled = Array.from(map.values()).sort((a, b) => (a.startDate || "").localeCompare(b.startDate || ""));

  return {
    reconciled,
    deletedCount,
    addedCount: cleanNew.length,
  };
}
