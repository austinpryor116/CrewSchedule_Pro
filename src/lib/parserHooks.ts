/**
 * Advanced Parser Hooks for DECS Terminal Output Parsing
 */

import { SequenceTrip } from "../types";
import { HSSParsedLeg, CommuteFlightInfo, ReleaseSummaryInfo } from "../types/decs";
import { parseN4OpenTime } from "./parser";

/**
 * 1. Parses HSS sequence text into structured HSSParsedLeg array
 */
export function parseHSSSequence(rawText: string): HSSParsedLeg[] {
  if (!rawText) return [];
  const legs: HSSParsedLeg[] = [];
  const lines = rawText.split(/\r?\n/);
  let currentDay = 0;

  lines.forEach((line) => {
    // Check for day index header, e.g. "DAY 1" or "DAY 01" or "DAY 2"
    const dayMatch = line.match(/\bDAY\s*(\d{1,2})\b/i);
    if (dayMatch) {
      currentDay = Math.max(0, parseInt(dayMatch[1], 10) - 1);
    }

    // Flight leg pattern: e.g. "3625 ORD LIT 0800 1015" or "FLT 1234 DFW MIA 1400 1730"
    const legMatch = line.match(
      /(?:\bFLT\b\s*)?(\d{1,4}[A-Z]?)\s+([A-Z]{3})\s+([A-Z]{3})\s+(\d{2}:?\d{2})\s+(\d{2}:?\d{2})/i
    );

    if (legMatch) {
      const fltNum = legMatch[1];
      const dep = legMatch[2].toUpperCase();
      const arr = legMatch[3].toUpperCase();
      const depTime = legMatch[4].replace(":", "");
      const arrTime = legMatch[5].replace(":", "");

      // Calculate block time in minutes
      const depMins = parseInt(depTime.substring(0, 2), 10) * 60 + parseInt(depTime.substring(2, 4), 10);
      const arrMins = parseInt(arrTime.substring(0, 2), 10) * 60 + parseInt(arrTime.substring(2, 4), 10);
      let blockMins = arrMins - depMins;
      if (blockMins < 0) blockMins += 1440;

      const isDeadhead = /^[Dd]|DH|MQ/i.test(fltNum);
      const formattedFlt = /^[A-Z]{2}/i.test(fltNum) ? fltNum.toUpperCase() : `AA${fltNum}`;

      legs.push({
        dayIndex: currentDay,
        flightNumber: formattedFlt,
        depAirport: dep,
        arrAirport: arr,
        depTime,
        arrTime,
        blockMinutes: blockMins > 0 ? blockMins : 120,
        isDeadhead,
      });
    }
  });

  return legs;
}

/**
 * 2. Parses N4D open time listings into SequenceTrip arrays
 */
export function parseN4DOpenTime(rawText: string): SequenceTrip[] {
  if (!rawText) return [];
  const openSeqs = parseN4OpenTime(rawText);
  return openSeqs.map((ot) => ({
    id: `n4d-${ot.id}`,
    sequenceNumber: ot.sequenceNumber,
    startDate: ot.startDate,
    endDate: ot.endDate,
    base: "ORD",
    equipment: "B737",
    totalBlockMinutes: Math.round(ot.creditHours * 60),
    totalCreditMinutes: Math.round(ot.creditHours * 60),
    layoverCities: ot.layoverDescription ? [ot.layoverDescription] : [],
    dutyPeriods: [
      {
        dayIndex: 0,
        reportTime: ot.reportTime,
        releaseTime: ot.releaseTime,
        dutyMinutes: 480,
        legs: [],
        layoverCity: ot.layoverDescription || "",
        layoverHotelInfo: "",
      },
    ],
    colorTag: "cyan",
    isGhost: true,
  }));
}

/**
 * 3. Parses 26B commute listings with First/Main cabin passenger counts (F[count] Y[count])
 */
export function parse26BCommute(rawText: string): CommuteFlightInfo[] {
  if (!rawText) return [];
  const list: CommuteFlightInfo[] = [];
  const lines = rawText.split(/\r?\n/);

  lines.forEach((line) => {
    // E.g. "AA 1234 ORD MIA 0800 1130 F3 Y42" or "1234 DFW ORD 1200 1430 F0 Y12"
    const match = line.match(
      /(?:\bAA\b\s*)?(\d{1,4}[A-Z]?)\s+([A-Z]{3})\s+([A-Z]{3})\s+(\d{2}:?\d{2})\s+(\d{2}:?\d{2})\s+F(\d+)\s+Y(\d+)/i
    );

    if (match) {
      const fltNum = match[1];
      const dep = match[2].toUpperCase();
      const arr = match[3].toUpperCase();
      const depTime = match[4].replace(":", "");
      const arrTime = match[5].replace(":", "");
      const firstCount = parseInt(match[6], 10) || 0;
      const mainCount = parseInt(match[7], 10) || 0;

      list.push({
        flightNumber: /^[A-Z]{2}/i.test(fltNum) ? fltNum.toUpperCase() : `AA${fltNum}`,
        depAirport: dep,
        arrAirport: arr,
        depTime,
        arrTime,
        firstClassCount: firstCount,
        mainCabinCount: mainCount,
        availableSeats: Math.max(0, 16 - firstCount) + Math.max(0, 150 - mainCount),
      });
    }
  });

  return list;
}

/**
 * 4. Parses JP* Dispatch Release output into structured ReleaseSummaryInfo
 */
export function parseReleaseSummary(rawText: string): ReleaseSummaryInfo | null {
  if (!rawText) return null;

  // Flight match: e.g. "RELEASE FLT AA1234" or "DISPATCH RELEASE AA 3625"
  const fltMatch = rawText.match(/(?:FLT|RELEASE)\s+(?:AA\s*)?(\d{1,4})/i);
  const tailMatch = rawText.match(/(?:TAIL|A\/C|AIRCRAFT)\s*#?:?\s*([N\d][A-Z0-9]+)/i);
  const fuelMatch = rawText.match(/(?:RELEASE FUEL|REL FUEL|FOB)\s*:?\s*(\d{4,6})/i);
  const routeMatch = rawText.match(/(?:ROUTE|RTE):?\s*([^\n\r]+)/i);
  const stationsMatch = rawText.match(/\b([A-Z]{3})\s*[-/➔]\s*([A-Z]{3})\b/);

  if (!fltMatch && !fuelMatch) return null;

  return {
    flightNumber: fltMatch ? `AA${fltMatch[1]}` : "AA1234",
    tailNumber: tailMatch ? tailMatch[1] : "N372AA",
    releaseFuelPounds: fuelMatch ? parseInt(fuelMatch[1], 10) : 18500,
    routeSummary: routeMatch ? routeMatch[1].trim() : "ORD DNV J143 LAX",
    depAirport: stationsMatch ? stationsMatch[1] : "ORD",
    arrAirport: stationsMatch ? stationsMatch[2] : "LAX",
  };
}
