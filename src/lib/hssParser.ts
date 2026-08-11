import { FlightLeg, DutyPeriod, SequenceTrip } from "../types";


/**
 * Helper to convert DECS time like "1.59" into minutes (119).
 */
function decsDecimalToMinutes(val: string): number {
  if (!val) return 0;
  const parts = val.split(".");
  if (parts.length === 1) return parseInt(parts[0], 10) * 60;
  const hours = parseInt(parts[0], 10) || 0;
  const mins = parseInt(parts[1], 10) || 0;
  return hours * 60 + mins;
}

/**
 * Parses raw HSS text into partial DutyPeriod objects containing rich flight legs.
 */
export function parseHssText(rawText: string): { sequenceNumber: string; dutyPeriods: DutyPeriod[]; totalBlockMinutes: number; tafb: number } | null {
  const lines = rawText.split("\n").map(l => l.trim()).filter(Boolean);
  
  let sequenceNumber = "";
  const dutyPeriods: DutyPeriod[] = [];
  
  let currentLegs: FlightLeg[] = [];
  let currentDutyMins = 0;
  let totalBlockMins = 0;
  let tafbMins = 0;
  
  let currentLayover = "";
  
  const seenFlightLines = new Set<string>();
  const seenDutyLines = new Set<string>();
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Extract Sequence Number
    // e.g. "SEQ 14962      BASE ORD  SEL  441 ORG SCH DOM E75"
    if (line.startsWith("SEQ ")) {
      const match = line.match(/^SEQ\s+([A-Z0-9]+)/);
      if (match) sequenceNumber = match[1];
    }
    
    // Extract Flight Legs
    // Regex handles SKD/ACT, optional modifiers (OT/RA), optional deadhead suffixes (MQ/DH), and variable trailing numbers.
    // Importantly, it elegantly skips overnight/date-change indicators on arrival times (e.g. 0150#, 01501, 0150 25)
    // Also supports NSHW modifier for no-show deadheads
    const flightMatch = line.match(/^(SKD|ACT)\s+(\d{1,2})\s+([\w]{2,4})\s+(\d+)\s+([A-Z]{3})\s+(\d{4})(?:[#\*\+]?)\s+([A-Z]{3})\s+(\d{4})(?:[#\*\+]?)\s*(?:\d{1,2}\s+)?(?:(RA|OT)\s+)?([\d\.]+)\s*([A-Z]{2,4})?(?:\s+([\d\.]+))?(?:\s+([\d\.]+))?/);
    if (flightMatch && !line.includes("ONDUTY") && !line.includes("TL")) {
      const type = flightMatch[1]; // SKD or ACT
      const eqOrAirline = flightMatch[3];
      const fltNum = flightMatch[4];
      const depSta = flightMatch[5];
      const depTime = flightMatch[6];
      const arrSta = flightMatch[7];
      const arrTime = flightMatch[8];
      const modifier = flightMatch[9]; // e.g. OT or RA
      const flyStr = flightMatch[10];
      const deadheadCode = flightMatch[11]; // e.g. MQ or AA
      
      const flightKey = `${type}-${fltNum}-${depSta}-${depTime}`;
      if (seenFlightLines.has(flightKey)) continue;
      seenFlightLines.add(flightKey);
      
      const blockMins = decsDecimalToMinutes(flyStr);
      const isOvertime = modifier === "OT";
      // It's a deadhead if the airline column has a carrier code, a DH/MQ code was attached to the block time, OR if DH/NSHW appears at the absolute end of the line
      const isDeadhead = /MQ|AA|OH|YX|OO|EV|CP|ZW|PT|YV|AX|DH|NSHW/i.test(eqOrAirline) || !!deadheadCode || line.trim().endsWith("DH") || line.trim().endsWith("DEADHEAD") || line.includes("NSHW");
      const isCancelled = line.includes("CXLD");
      
      if (type === "SKD") {
        const grdStr = flightMatch[12] || "0.00";
        totalBlockMins += blockMins;
        
        currentLegs.push({
          flightNumber: fltNum,
          depAirport: depSta,
          arrAirport: arrSta,
          depTime: depTime,
          arrTime: arrTime,
          blockMinutes: blockMins,
          groundMinutes: decsDecimalToMinutes(grdStr),
          isOvertime: isOvertime,
          isDeadhead: isDeadhead,
          isCancelled: isCancelled,
        });
      } else if (type === "ACT" && currentLegs.length > 0) {
        // ACT row modifies the most recently added SKD leg
        const lastLeg = currentLegs[currentLegs.length - 1];
        lastLeg.actualDepTime = depTime;
        lastLeg.actualArrTime = arrTime;
        lastLeg.actualBlockMinutes = blockMins;
        if (isCancelled) lastLeg.isCancelled = true;
      }
    }
    
    // Extract Layover City
    // e.g. "HALF DAY COUNT RIC  2" or "HALF DAY COUNT FSM  2"
    if (line.includes("HALF DAY COUNT")) {
      const match = line.match(/COUNT\s+([A-Z]{3})/);
      if (match) {
        currentLayover = match[1];
      }
    }
    
    // Extract Duty Period Summary
    // e.g. "FDPT  8.46        START  1420  END  2306  ACC STA  ORD"
    if (line.startsWith("FDPT ") && line.includes("START")) {
      const startMatch = line.match(/START\s+(\d{4})/);
      const endMatch = line.match(/END\s+(\d{4})/);
      
      const startTime = startMatch ? startMatch[1] : "0000";
      const endTime = endMatch ? endMatch[1] : "0000";
      
      const dutyKey = `${startTime}-${endTime}`;
      if (seenDutyLines.has(dutyKey)) continue;
      seenDutyLines.add(dutyKey);
      
      // We calculate dutyMins basically as report to release, but we can just leave it to the app logic,
      // or we can parse ONDUTY from the previous line "SKD ONDUTY  9.01  ODL  10.37"
      let dutyMins = 0;
      let actualDutyMins = 0;
      let odlMins = 0;
      let payCreditMins = 0;
      
      // Look back a few lines to find ONDUTY, ACT ONDUTY, ODL, and D/P SKD (TL) / ACT TL
      for (let j = 1; j <= 6 && i - j >= 0; j++) {
        const prevLine = lines[i - j];
        if (prevLine.startsWith("SKD ONDUTY")) {
          const ondutyMatch = prevLine.match(/ONDUTY\s+([\d\.]+)/);
          if (ondutyMatch) dutyMins = decsDecimalToMinutes(ondutyMatch[1]);
          const odlMatch = prevLine.match(/ODL\s+([\d\.]+)/);
          if (odlMatch) odlMins = decsDecimalToMinutes(odlMatch[1]);
        }
        if (prevLine.startsWith("ACT ONDUTY")) {
          const actOndutyMatch = prevLine.match(/ONDUTY\s+([\d\.]+)/);
          if (actOndutyMatch) actualDutyMins = decsDecimalToMinutes(actOndutyMatch[1]);
        }
        if (prevLine.includes("SKD TL") || (prevLine.startsWith("D/P") && prevLine.includes("TL"))) {
          const payMatch = prevLine.match(/TL\s+([\d\.]+)/);
          if (payMatch && !payCreditMins) payCreditMins = decsDecimalToMinutes(payMatch[1]); // take first found (SKD TL)
        }
      }
      
      // Deduplicate to prevent multi-page scrape overlapping
      const isDuplicate = dutyPeriods.some(dp => 
        dp.reportTime === startTime && 
        dp.releaseTime === endTime && 
        dp.legs.length === currentLegs.length &&
        (dp.legs[0]?.flightNumber === currentLegs[0]?.flightNumber)
      );
      
      if (!isDuplicate) {
        dutyPeriods.push({
          dayIndex: dutyPeriods.length,
          reportTime: startTime,
          releaseTime: endTime,
          dutyMinutes: dutyMins,
          actualDutyMinutes: actualDutyMins > 0 ? actualDutyMins : undefined,
          payCreditMinutes: payCreditMins,
          odlMinutes: odlMins,
          legs: [...currentLegs],
          layoverCity: currentLayover,
          layoverHotelInfo: "",
        });
      }
      
      currentLegs = [];
      currentLayover = "";
    }
    
    // Final Sequence Totals
    // e.g. "SEQ SKD 22.29      P/C  0.00  TL 22.29 TAFB  73.44"
    if (line.startsWith("SEQ SKD") && line.includes("TAFB")) {
      const tafbMatch = line.match(/TAFB\s+([\d\.]+)/);
      if (tafbMatch) {
        tafbMins = decsDecimalToMinutes(tafbMatch[1]);
      }
    }
  }
  
  if (!sequenceNumber) return null;
  
  return {
    sequenceNumber,
    dutyPeriods,
    totalBlockMinutes: totalBlockMins,
    tafb: tafbMins,
  };
}
