import { TurnbackData, TurnbackRecord, N6DPilotRecord } from "../types";

/**
 * Parses raw DECS / FOS HIHR Turnback List response.
 * Command syntax: HIHR/(START_DATE)/(END_DATE)^
 * Example: HIHR/19AUG/19AUG^
 */
export function parseTurnbackList(rawText: string): TurnbackData {
  const records: TurnbackRecord[] = [];
  const pilotIdentifiers: Set<string> = new Set();

  if (!rawText || rawText.trim().length === 0) {
    return {
      importedAt: new Date().toISOString(),
      records: [],
      pilotIdentifiers: [],
      rawText: rawText || "",
    };
  }

  const lines = rawText.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);

  // Extract Date Range from header if present
  let dateRange = "";
  const headerMatch = rawText.match(/HIHR\/?(\d{1,2}[A-Z]{3})?(?:\/(\d{1,2}[A-Z]{3}))?/i);
  if (headerMatch && headerMatch[1]) {
    dateRange = headerMatch[2] ? `${headerMatch[1]} – ${headerMatch[2]}` : headerMatch[1];
  }

  for (const line of lines) {
    // Skip command echoes or header markers
    const upper = line.toUpperCase();
    if (
      upper.startsWith("HIHR") ||
      upper.includes("TURNBACK") ||
      upper.includes("PAGE ") ||
      upper.includes("---") ||
      upper.includes("END OF DISP") ||
      upper.includes("BOTTOM OF") ||
      upper.startsWith("SEN ") ||
      upper.startsWith("NAME ")
    ) {
      continue;
    }

    // Match pilot record formats:
    // Format 1: 1234 SMITH J 908386 19AUG ...
    // Format 2: SMITH J 908386 19AUG ...
    // Format 3: 908386 SMITH JOHN 19AUG
    const empIdMatch = line.match(/\b(\d{6})\b/);
    const senMatch = line.match(/^\b(\d{4})\b/);
    const dateMatch = line.match(/\b(\d{1,2}[A-Z]{3}(?:\d{2})?)\b/i);

    let name = "";
    const cleanLine = line
      .replace(/\b\d{6}\b/, "")
      .replace(/^\d{4}\b/, "")
      .replace(/\b\d{1,2}[A-Z]{3}(?:\d{2})?\b/gi, "")
      .trim();

    const nameParts = cleanLine.split(/\s+/).filter((p) => /^[A-Z\-\.\'\/\,]+$/i.test(p));
    if (nameParts.length > 0) {
      name = nameParts.join(" ").toUpperCase();
    }

    const employeeId = empIdMatch ? empIdMatch[1] : undefined;
    const seniority = senMatch ? senMatch[1] : undefined;
    const date = dateMatch ? dateMatch[1].toUpperCase() : undefined;

    if (employeeId || seniority || name.length >= 2) {
      const record: TurnbackRecord = {
        employeeId,
        seniority,
        name: name || "UNKNOWN PILOT",
        date,
        rawText: line,
      };

      records.push(record);

      if (employeeId) pilotIdentifiers.add(employeeId);
      if (seniority) pilotIdentifiers.add(seniority);
      if (name) {
        pilotIdentifiers.add(name);
        const lastName = name.split(/\s+/)[0];
        if (lastName && lastName.length >= 3) {
          pilotIdentifiers.add(lastName);
        }
      }
    }
  }

  return {
    importedAt: new Date().toISOString(),
    dateRange,
    records,
    pilotIdentifiers: Array.from(pilotIdentifiers),
    rawText,
  };
}

/**
 * Checks if a given reserve pilot is on the Turnback List (HIHR).
 * Checks Employee ID, Seniority Number, Full Name, and Last Name.
 */
export function isPilotTurnback(pilot: N6DPilotRecord, turnbackData?: TurnbackData | null): boolean {
  if (!turnbackData || !turnbackData.pilotIdentifiers || turnbackData.pilotIdentifiers.length === 0) {
    return false;
  }

  const ids = turnbackData.pilotIdentifiers;

  // 1. Exact Employee ID (SC) match
  if (pilot.employeeId && ids.includes(pilot.employeeId)) {
    return true;
  }

  // 2. Exact Seniority match
  if (pilot.seniority && ids.includes(pilot.seniority)) {
    return true;
  }

  // 3. Name matching
  if (pilot.name) {
    const norm = pilot.name.toUpperCase().trim();
    if (ids.includes(norm)) {
      return true;
    }

    const lastName = norm.split(/\s+/)[0];
    if (lastName && lastName.length >= 3 && ids.includes(lastName)) {
      return true;
    }
  }

  return false;
}
