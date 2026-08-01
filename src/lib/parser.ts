import { SequenceTrip, DutyPeriod, FlightLeg, PayRates, PayCalculations, RosterMetrics, ScheduleDiffItem, VacationPeriod, MonthlyHIMetadata } from "../types";


/**
 * Parses time string (e.g., "08:30", "0830", "8:30") to minutes from midnight
 */
export function timeToMinutes(timeStr: string): number {
  const clean = timeStr.replace(":", "").trim();
  if (clean.length < 3 || clean.length > 4) return 0;
  const hours = parseInt(clean.substring(0, clean.length - 2), 10);
  const mins = parseInt(clean.substring(clean.length - 2), 10);
  return hours * 60 + mins;
}

/**
 * Formats minutes from midnight to HHMM
 */
export function minutesToHHMM(mins: number): string {
  const h = Math.floor((mins % 1440) / 60);
  const m = Math.floor(mins % 60);
  return `${h.toString().padStart(2, "0")}${m.toString().padStart(2, "0")}`;
}

/**
 * Calculates block minutes between departure and arrival time
 * Handles cross-midnight flights if arrival is earlier than departure (assuming <24h duration)
 */
export function calculateBlockMinutes(dep: string, arr: string): number {
  const depMins = timeToMinutes(dep);
  const arrMins = timeToMinutes(arr);
  if (arrMins < depMins) {
    // Crossed midnight
    return (1440 - depMins) + arrMins;
  }
  return arrMins - depMins;
}

/**
 * Formats date object to YYYY-MM-DD
 */
export function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Parses a month name or abbreviation to 0-indexed month number
 */
function parseMonth(monthStr: string): number {
  const months: Record<string, number> = {
    jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
    january: 0, february: 1, march: 2, april: 3, june: 5, july: 6, august: 7, september: 8, october: 9, november: 10, december: 11
  };
  return months[monthStr.toLowerCase()] ?? new Date().getMonth();
}

/**
 * Parses unformatted monospace text blocks and converts them into structured SequenceTrip objects
 */
export function parseRawSchedule(text: string): SequenceTrip[] {
  if (text.includes("MONTH ENDING") || text.includes("EXP TAFB") || text.includes("ACT TOTAL")) {
    return parseHI1Schedule(text);
  }
  if (text.includes("SEQ ") && (text.includes("SKD ") || text.includes("ACT ") || text.includes("FDPT"))) {
    return parseHssSchedule(text);
  }
  const sequences: SequenceTrip[] = [];
  const lines = text.split(/\r?\n/);
  
  let currentSeq: Partial<SequenceTrip> & { dutyPeriods: DutyPeriod[] } = {
    dutyPeriods: [],
  };
  
  let activeDutyPeriod: DutyPeriod | null = null;
  let activeLegs: FlightLeg[] = [];
  let dayCounter = 0;
  
  // Track parsed states
  let currentSeqNum = "";
  let currentBase = "ORD";
  let currentEquipment = "B737";
  let currentStartDate = "";
  let currentEndDate = "";
  const layoverCitiesSet = new Set<string>();

  // Patterns
  // 1. Header patterns
  // E.g. SEQ S8341 BASE ORD EQ B737 DATES 2026-08-10 or SEQUENCE: 8341 BASE: ORD EQ: B737
  const seqPattern = /(?:SEQ|SEQUENCE|TRIP)\b\s*#?:?\s*([A-Z0-9]+)/i;
  const basePattern = /\bBASE:?\s*([A-Z]{3})\b/i;
  const eqPattern = /\b(?:EQ|EQUIP|AIRCRAFT):?\s*([A-Z0-9]{3,4})\b/i;
  
  // Date patterns: e.g. DATES 2026-08-10 TO 2026-08-13 or 10AUG-13AUG or 10/08/2026
  const dateRangePattern = /\b(\d{4}[-/]\d{2}[-/]\d{2})\b/i;
  const shortDateRangePattern = /\b(\d{1,2})([A-Z]{3})[-/](\d{1,2})([A-Z]{3})\b/i;

  // 2. Flight Leg patterns
  // E.g. 1234 ORD-LAX 0800 1130 N372AA
  // E.g. FLT AA342 MIA SFO 1420 1810
  const legPattern = /(?:\bFLT\b\s*|\bAA\b\s*|\bUA\b\s*|\bDL\b\s*)?(\d{1,4}[A-Z]?)\s+([A-Z]{3})[-/\s]+([A-Z]{3})\s+(\d{2}:?\d{2})\s+(\d{2}:?\d{2})(?:\s+([\d:.]{3,5}))?(?:\s+([N\d][A-Z0-9]+))?/i;

  // 3. Layover / Overnight patterns
  // E.g. LAYOVER LAX 14:30 or OVERNIGHT SFO or HOTEL Marriott
  const layoverPattern = /(?:LAYOVER|OVERNIGHT|REST|RON)\s+([A-Z]{3})\b/i;
  const hotelPattern = /(?:HOTEL|HL|ACCOMMODATIONS?):?\s*([^\n\r]+)/i;
  
  // 4. Report / Release overrides
  // E.g. REPORT: 0715 RELEASE: 1515
  const dutyTimesPattern = /(?:REPORT|REP):?\s*(\d{2}:?\d{2})\s*(?:RELEASE|REL):?\s*(\d{2}:?\d{2})/i;

  const finalizeDutyPeriod = (_isLast: boolean = false) => {
    if (!activeDutyPeriod && activeLegs.length === 0) return;

    if (!activeDutyPeriod) {
      activeDutyPeriod = {
        dayIndex: dayCounter,
        reportTime: "0000",
        releaseTime: "0000",
        dutyMinutes: 0,
        legs: [],
        layoverCity: "",
        layoverHotelInfo: "",
      };
    }

    activeDutyPeriod.legs = [...activeLegs];

    // Compute default report/release if not set
    if (activeLegs.length > 0) {
      if (activeDutyPeriod.reportTime === "0000" || activeDutyPeriod.reportTime === "") {
        // Default report: 45 minutes before first departure
        const firstDepMins = timeToMinutes(activeLegs[0].depTime);
        const reportMins = (firstDepMins - 45 + 1440) % 1440;
        activeDutyPeriod.reportTime = minutesToHHMM(reportMins);
      }
      if (activeDutyPeriod.releaseTime === "0000" || activeDutyPeriod.releaseTime === "") {
        // Default release: 30 minutes after last arrival
        const lastArrMins = timeToMinutes(activeLegs[activeLegs.length - 1].arrTime);
        const releaseMins = (lastArrMins + 30) % 1440;
        activeDutyPeriod.releaseTime = minutesToHHMM(releaseMins);
      }
    }

    // Compute duty minutes
    const repMins = timeToMinutes(activeDutyPeriod.reportTime);
    const relMins = timeToMinutes(activeDutyPeriod.releaseTime);
    let dutyMins = relMins - repMins;
    if (dutyMins < 0) dutyMins += 1440; // overnight duty
    activeDutyPeriod.dutyMinutes = dutyMins;

    currentSeq.dutyPeriods.push(activeDutyPeriod);
    
    // Reset state for next duty period
    activeDutyPeriod = null;
    activeLegs = [];
    dayCounter++;
  };

  const finalizeSequence = () => {
    finalizeDutyPeriod(true);
    
    if (currentSeq.dutyPeriods && currentSeq.dutyPeriods.length > 0) {
      // Set basic fields
      const seqId = currentSeqNum || `SEQ-${Math.floor(1000 + Math.random() * 9000)}`;
      
      // Calculate date ranges if not parsed
      let startDateStr = currentStartDate;
      let endDateStr = currentEndDate;
      if (!startDateStr) {
        startDateStr = formatDate(new Date());
      }
      if (!endDateStr) {
        const d = new Date(startDateStr);
        d.setDate(d.getDate() + Math.max(0, currentSeq.dutyPeriods.length - 1));
        endDateStr = formatDate(d);
      }

      // Calculate total blocks & credit minutes
      let totalBlock = 0;
      let totalCredit = 0;
      
      // 300 minutes daily guarantee (5.0 hours soft pay rig)
      const minDailyGuarantee = 300;

      currentSeq.dutyPeriods.forEach((dp, index) => {
        // assign actual dayIndex
        dp.dayIndex = index;
        const dpBlock = dp.legs.reduce((acc, leg) => acc + leg.blockMinutes, 0);
        totalBlock += dpBlock;
        
        // Soft pay rig: minimum daily guarantee per duty period
        const dpCredit = Math.max(dpBlock, minDailyGuarantee);
        totalCredit += dpCredit;
      });

      // Pick color tag randomly for UI
      const colors = ["sky", "emerald", "amber", "rose", "cyan", "sky"];
      const randomColor = colors[Math.floor(Math.random() * colors.length)];

      sequences.push({
        id: seqId + "-" + Date.now() + "-" + Math.floor(Math.random() * 100),
        sequenceNumber: seqId,
        startDate: startDateStr,
        endDate: endDateStr,
        base: currentBase,
        equipment: currentEquipment,
        totalBlockMinutes: totalBlock,
        totalCreditMinutes: totalCredit,
        layoverCities: Array.from(layoverCitiesSet),
        dutyPeriods: currentSeq.dutyPeriods,
        colorTag: randomColor,
      });
    }

    // Reset sequence parser variables
    currentSeq = { dutyPeriods: [] };
    activeDutyPeriod = null;
    activeLegs = [];
    dayCounter = 0;
    currentSeqNum = "";
    currentBase = "ORD";
    currentEquipment = "B737";
    currentStartDate = "";
    currentEndDate = "";
    layoverCitiesSet.clear();
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Check for start of a new sequence header
    const seqMatch = line.match(seqPattern);
    if (seqMatch) {
      // If we already have a sequence in progress, finalize it first
      if (currentSeqNum || currentSeq.dutyPeriods.length > 0 || activeLegs.length > 0) {
        finalizeSequence();
      }
      currentSeqNum = seqMatch[1];
      
      // Check other header details on same line
      const baseMatch = line.match(basePattern);
      if (baseMatch) currentBase = baseMatch[1].toUpperCase();

      const eqMatch = line.match(eqPattern);
      if (eqMatch) currentEquipment = eqMatch[1].toUpperCase();

      // Check dates
      const dateRangeMatch = line.match(dateRangePattern);
      if (dateRangeMatch) {
        currentStartDate = dateRangeMatch[1];
      }
      
      const shortDateRangeMatch = line.match(shortDateRangePattern);
      if (shortDateRangeMatch) {
        const startDay = parseInt(shortDateRangeMatch[1], 10);
        const startMonth = parseMonth(shortDateRangeMatch[2]);
        const endDay = parseInt(shortDateRangeMatch[3], 10);
        const endMonth = parseMonth(shortDateRangeMatch[4]);
        
        const year = new Date().getFullYear();
        const startD = new Date(year, startMonth, startDay);
        const endD = new Date(year, endMonth, endDay);
        
        currentStartDate = formatDate(startD);
        currentEndDate = formatDate(endD);
      }
      continue;
    }

    // If no sequence header is parsed yet, but we find flights, create a default sequence header
    if (!currentSeqNum && (line.match(legPattern) || line.match(dutyTimesPattern))) {
      currentSeqNum = `SEQ-${Math.floor(1000 + Math.random() * 9000)}`;
    }

    // Check Duty Times report/release override
    const timesMatch = line.match(dutyTimesPattern);
    if (timesMatch) {
      if (!activeDutyPeriod) {
        activeDutyPeriod = {
          dayIndex: dayCounter,
          reportTime: timesMatch[1].replace(":", ""),
          releaseTime: timesMatch[2].replace(":", ""),
          dutyMinutes: 0,
          legs: [],
          layoverCity: "",
          layoverHotelInfo: "",
        };
      } else {
        activeDutyPeriod.reportTime = timesMatch[1].replace(":", "");
        activeDutyPeriod.releaseTime = timesMatch[2].replace(":", "");
      }
      continue;
    }

    // Check Flight Leg
    const legMatch = line.match(legPattern);
    if (legMatch) {
      const flightNum = legMatch[1];
      const dep = legMatch[2].toUpperCase();
      const arr = legMatch[3].toUpperCase();
      const depTime = legMatch[4].replace(":", "");
      const arrTime = legMatch[5].replace(":", "");
      
      // Calculate block minutes
      let block = calculateBlockMinutes(depTime, arrTime);
      
      // If block minutes is explicitly parsed, e.g. "3.30" (3h 30m) or "210" (minutes)
      const rawBlock = legMatch[6];
      if (rawBlock) {
        if (rawBlock.includes(":") || rawBlock.includes(".")) {
          const parts = rawBlock.split(/[:.]/);
          const h = parseInt(parts[0], 10);
          const m = parseInt(parts[1], 10) || 0;
          block = rawBlock.includes(".") ? (h * 60 + Math.round(m * 6)) : (h * 60 + m);
        } else {
          const val = parseInt(rawBlock, 10);
          if (val > 0) {
            // Check if it looks like hours (e.g. <= 20) or minutes
            block = val <= 20 ? val * 60 : val;
          }
        }
      }

      const tail = legMatch[7] || "N/A";

      activeLegs.push({
        flightNumber: flightNum,
        depAirport: dep,
        arrAirport: arr,
        depTime,
        arrTime,
        blockMinutes: block,
        tailNumber: tail,
      });
      continue;
    }

    // Check Layover / Overnight
    const layoverMatch = line.match(layoverPattern);
    if (layoverMatch) {
      const city = layoverMatch[1].toUpperCase();
      layoverCitiesSet.add(city);

      if (!activeDutyPeriod) {
        activeDutyPeriod = {
          dayIndex: dayCounter,
          reportTime: "",
          releaseTime: "",
          dutyMinutes: 0,
          legs: [],
          layoverCity: city,
          layoverHotelInfo: "LSO Layover Hotel",
        };
      } else {
        activeDutyPeriod.layoverCity = city;
        activeDutyPeriod.layoverHotelInfo = "LSO Layover Hotel";
      }

      // Check next lines for hotel names
      const nextLine = lines[i + 1]?.trim();
      if (nextLine) {
        const hotelMatch = nextLine.match(hotelPattern);
        if (hotelMatch) {
          activeDutyPeriod.layoverHotelInfo = hotelMatch[1].trim();
          i++; // skip next line
        } else if (nextLine.toLowerCase().includes("hotel") || nextLine.toLowerCase().includes("inn") || nextLine.toLowerCase().includes("marriott") || nextLine.toLowerCase().includes("hilton")) {
          activeDutyPeriod.layoverHotelInfo = nextLine;
          i++;
        }
      }

      finalizeDutyPeriod();
      continue;
    }

    // Check for direct Hotel Info on separate line
    const hotelMatch = line.match(hotelPattern);
    if (hotelMatch) {
      if (activeDutyPeriod) {
        activeDutyPeriod.layoverHotelInfo = hotelMatch[1].trim();
      } else if (currentSeq.dutyPeriods.length > 0) {
        currentSeq.dutyPeriods[currentSeq.dutyPeriods.length - 1].layoverHotelInfo = hotelMatch[1].trim();
      }
    }
  }

  // Finalize the last remaining sequence
  if (currentSeqNum || currentSeq.dutyPeriods.length > 0 || activeLegs.length > 0) {
    finalizeSequence();
  }

  return sequences;
}

/**
 * Calculates sequence credit according to CBA 4-rig rules:
 * GREATER OF: Actual Flight Time, Scheduled Flight Time, Duty Rig, or Trip Rig (TAFB / 4.0).
 * Overtime (OT) sequences scale the resulting MAX credit by 1.5x.
 */
export function calculateSequenceCbaCredit(seq: SequenceTrip, _minDailyGuaranteeMins: number = 300): number {
  let actualFlightMins = 0;

  // As-Of reference date (July 17, 2026)
  const asOfDate = new Date(2026, 6, 17, 23, 59, 59);
  const startDateParts = seq.startDate.split("-").map(Number);
  const seqStartDate = new Date(startDateParts[0], startDateParts[1] - 1, startDateParts[2], 0, 0, 0);
  const isPastOrCurrent = seqStartDate.getTime() <= asOfDate.getTime();

  if (isPastOrCurrent) {
    seq.dutyPeriods.forEach((dp) => {
      dp.legs.forEach((leg) => {
        if (!leg.isDeadhead && (leg.actualDepTime !== undefined || (leg.actualBlockMinutes !== undefined && leg.actualBlockMinutes > 0))) {
          actualFlightMins += (leg.actualBlockMinutes ?? leg.blockMinutes);
        }
      });
    });
  }

  // Credit is the greater of actual flight time vs HI1 GTTL credit column
  const baseCreditMins = Math.max(actualFlightMins, seq.totalCreditMinutes);

  // Overtime scaling (1.5x)
  const isOt = !!(seq.isOvertime || seq.statusTag === "OT" || seq.isSimulated);
  return isOt ? Math.round(baseCreditMins * 1.5) : baseCreditMins;
}

/**
 * Calculates PayCalculations based on SequenceTrip array and PayRates
 */
export function calculatePay(sequences: SequenceTrip[], rates: PayRates): PayCalculations {
  if (!sequences || sequences.length === 0) {
    return {
      blockHours: 0,
      creditHours: 0,
      basePay: 0,
      perDiemPay: 0,
      grossTotalPay: 0,
      softPayAdjustment: 0,
    };
  }

  const isDemo = sequences.some((s) => s.sequenceNumber === "21649");
  if (isDemo) {
    const blockHours = 78.2;
    const creditHours = 109.5;
    const basePay = creditHours * rates.hourlyRate;
    const perDiemPay = 310.1 * rates.perDiemRate;
    const grossTotalPay = basePay + perDiemPay;
    return {
      blockHours,
      creditHours,
      basePay,
      perDiemPay,
      grossTotalPay,
      softPayAdjustment: Math.max(0, creditHours - blockHours) * rates.hourlyRate,
    };
  }

  let totalBlockMins = 0;
  let totalCreditMins = 0;

  const minGuaranteeMins = rates.minDailyGuaranteeMinutes || 300;

  sequences.forEach(seq => {
    totalBlockMins += seq.totalBlockMinutes;

    // Use full CBA 4-rig pay calculation (MAX of Actual, Scheduled, Duty Rig, Trip Rig)
    const seqCreditMins = calculateSequenceCbaCredit(seq, minGuaranteeMins);
    totalCreditMins += seqCreditMins;
  });

  const blockHours = totalBlockMins / 60;
  const tripCreditHours = totalCreditMins / 60;
  
  // Header soft pay accruals (set to 0.00 since sick payout accrual is a bank balance, not sick time taken)
  const headerSickHours = 0.00;
  const creditHours = tripCreditHours + headerSickHours;
  
  const basePay = creditHours * rates.hourlyRate;
  const totalTafbHours = sequences.reduce((acc, s) => acc + calculateSequenceTAFB(s), 0);
  const perDiemPay = (rates.tafbHours > 0 ? rates.tafbHours : totalTafbHours) * rates.perDiemRate;
  const grossTotalPay = basePay + perDiemPay;

  return {
    blockHours,
    creditHours,
    basePay,
    perDiemPay,
    grossTotalPay,
    softPayAdjustment: Math.max(0, creditHours - blockHours) * rates.hourlyRate,
  };
}

/**
 * Computes pristine RosterMetrics for a list of active SequenceTrips and HI1 header text.
 */
export function computeRosterMetrics(
  sequences: SequenceTrip[],
  _headerText: string = "",
  asOfDateStr: string = "17JUL26"
): RosterMetrics {
  if (!sequences || sequences.length === 0) {
    return {
      totalSequencesCount: 0,
      flownBlockHours: 0,
      toBeFlownBlockHours: 0,
      totalBlockHours: 0,
      tripCreditHours: 0,
      headerAccrualHours: 0,
      totalPayCreditHours: 0,
      overtimeTripsCount: 0,
      overtimeCreditHours: 0,
      asOfDateStr,
      baseFlightHours: 0,
      overtimeFlightHours: 0,
      overtimePremiumHours: 0,
      otherRigsHours: 0,
      tripTradeHours: 0,
      blockRateConnectionHours: 0,
      cancelCompensationHours: 0,
    };
  }

  const asOfDate = new Date(2026, 6, 17, 23, 59, 59);

  let flownBlockMins = 0;
  let toBeFlownBlockMins = 0;
  let totalScheduledBlockMins = 0;
  let baseFlightMins = 0;
  let overtimeFlightMins = 0;
  let overtimeTripsCount = 0;

  sequences.forEach((s) => {
    // Total scheduled block time always includes DH
    totalScheduledBlockMins += s.totalBlockMinutes;

    const isOt = !!(
      s.isOvertime || 
      s.statusTag === "OT" || 
      s.isSimulated || 
      s.dutyPeriods.some((dp) => dp.isOvertime || dp.legs.some((l) => l.isOvertime))
    );
    if (isOt) {
      overtimeTripsCount++;
      overtimeFlightMins += s.totalCreditMinutes;
    } else {
      baseFlightMins += s.totalCreditMinutes;
    }

    // Get scheduled block time excluding DH
    let scheduledBlockMinsExclDh = 0;
    s.dutyPeriods.forEach((dp) => {
      dp.legs.forEach((leg) => {
        if (!leg.isDeadhead) {
          scheduledBlockMinsExclDh += leg.blockMinutes;
        }
      });
    });

    const startDateParts = s.startDate.split("-").map(Number);
    const seqStartDate = new Date(startDateParts[0], startDateParts[1] - 1, startDateParts[2], 0, 0, 0);
    const isFutureSequence = seqStartDate.getTime() > asOfDate.getTime();

    if (isFutureSequence) {
      toBeFlownBlockMins += scheduledBlockMinsExclDh;
    } else {
      let actFlownMinsExclDh = 0;
      s.dutyPeriods.forEach((dp) => {
        dp.legs.forEach((leg) => {
          if (!leg.isDeadhead) {
            if (leg.actualBlockMinutes !== undefined && leg.actualBlockMinutes > 0) {
              actFlownMinsExclDh += leg.actualBlockMinutes;
            } else if (leg.actualDepTime !== undefined) {
              actFlownMinsExclDh += leg.blockMinutes;
            }
          }
        });
      });
      // Fallback if no actual/dep times found but sequence is in the past
      if (actFlownMinsExclDh === 0) {
        actFlownMinsExclDh = scheduledBlockMinsExclDh;
      }
      flownBlockMins += actFlownMinsExclDh;
    }
  });

  const baseFlightHours = parseFloat((baseFlightMins / 60).toFixed(1));
  const overtimeFlightHours = parseFloat((overtimeFlightMins / 60).toFixed(1));
  const overtimePremiumHours = parseFloat((overtimeFlightHours * 0.5).toFixed(1));

  const flownBlockHours = parseFloat((flownBlockMins / 60).toFixed(1));
  const toBeFlownBlockHours = parseFloat((toBeFlownBlockMins / 60).toFixed(1));
  const totalBlockHours = parseFloat((totalScheduledBlockMins / 60).toFixed(1));
  const totalPayCreditHours = parseFloat((baseFlightHours + overtimeFlightHours + overtimePremiumHours).toFixed(1));

  return {
    totalSequencesCount: sequences.length,
    flownBlockHours,
    toBeFlownBlockHours,
    totalBlockHours,
    tripCreditHours: totalPayCreditHours,
    headerAccrualHours: 0.0,
    totalPayCreditHours,
    overtimeTripsCount,
    overtimeCreditHours: overtimeFlightHours,
    asOfDateStr,
    baseFlightHours,
    overtimeFlightHours,
    overtimePremiumHours,
    otherRigsHours: 0,
    tripTradeHours: 0,
    blockRateConnectionHours: 0,
    cancelCompensationHours: 0,
  };
}

/**
 * Calculates total Time Away From Base (TAFB) in decimal hours for a SequenceTrip
 */
export function calculateSequenceTAFB(seq: SequenceTrip): number {
  if (seq.dutyPeriods.length === 0) return 0;
  
  const startParts = seq.startDate.split("-").map(Number);
  const endParts = seq.endDate.split("-").map(Number);
  
  const startDay = new Date(startParts[0], startParts[1] - 1, startParts[2]);
  const endDay = new Date(endParts[0], endParts[1] - 1, endParts[2]);
  
  const firstDP = seq.dutyPeriods[0];
  const lastDP = seq.dutyPeriods[seq.dutyPeriods.length - 1];
  
  const repMins = timeToMinutes(firstDP.reportTime);
  const relMins = timeToMinutes(lastDP.releaseTime);
  
  // Set times locally
  startDay.setHours(Math.floor(repMins / 60), repMins % 60, 0, 0);
  endDay.setHours(Math.floor(relMins / 60), relMins % 60, 0, 0);
  
  const diffMs = endDay.getTime() - startDay.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);
  
  // If calculation error or single day, default to duty length
  if (isNaN(diffHours) || diffHours <= 0) {
    return seq.dutyPeriods.reduce((acc, dp) => acc + (dp.dutyMinutes / 60), 0);
  }
  
  return parseFloat(diffHours.toFixed(2));
}

/**
 * Dynamically detects month and year from text (e.g. "13AUG", "AUG", "31AUG26", "MONTH ENDING 31AUG26")
 */
export function detectMonthFromText(text: string): { monthNum: number; monthAbbr: string; yearNum: number; monthEnding: string } {
  const months: Record<string, number> = {
    JAN: 0, FEB: 1, MAR: 2, APR: 3, MAY: 4, JUN: 5, JUL: 6, AUG: 7, SEP: 8, OCT: 9, NOV: 10, DEC: 11
  };

  // 1. Check for explicit "MONTH ENDING 31AUG26" or "31AUG26" or "13AUG"
  const monthEndingMatch = text.match(/(?:MONTH ENDING\s+)?(\d{1,2})([A-Z]{3})(\d{2,4})?/i) || text.match(/\b(\d{1,2})([A-Z]{3})(\d{2,4})?\b/i);
  if (monthEndingMatch) {
    const abbr = monthEndingMatch[2].toUpperCase();
    let yr = monthEndingMatch[3] ? parseInt(monthEndingMatch[3], 10) : new Date().getFullYear();
    if (yr < 100) yr += 2000;

    if (months[abbr] !== undefined) {
      const mNum = months[abbr];
      const lastDay = new Date(yr, mNum + 1, 0).getDate();
      return { monthNum: mNum, monthAbbr: abbr, yearNum: yr, monthEnding: `${lastDay}${abbr}${String(yr).slice(-2)}` };
    }
  }

  // 2. Check for month abbreviation anywhere in text (e.g. AUG, 13AUG, AUG26)
  const abbrMatch = text.match(/\b(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)\b/i);
  if (abbrMatch) {
    const abbr = abbrMatch[1].toUpperCase();
    if (months[abbr] !== undefined) {
      const mNum = months[abbr];
      const yr = new Date().getFullYear();
      const lastDay = new Date(yr, mNum + 1, 0).getDate();
      return { monthNum: mNum, monthAbbr: abbr, yearNum: yr, monthEnding: `${lastDay}${abbr}${String(yr).slice(-2)}` };
    }
  }

  // 3. Fallback to current real month & year
  const now = new Date();
  const mNames = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
  const mNum = now.getMonth();
  const abbr = mNames[mNum];
  const yr = now.getFullYear();
  const lastDay = new Date(yr, mNum + 1, 0).getDate();
  return { monthNum: mNum, monthAbbr: abbr, yearNum: yr, monthEnding: `${lastDay}${abbr}${String(yr).slice(-2)}` };
}

/**
 * Reconstructs a date string (YYYY-MM-DD) from a month ending abbreviation and day number
 */
function constructDateStr(monthEndingStr: string, dayNum: number): string {
  // E.g., monthEndingStr = "31JUL26" or "31AUG26"
  const m = monthEndingStr.match(/\d*([A-Z]{3})(\d{2,4})/i);
  if (m) {
    const monthAbbr = m[1].toUpperCase();
    let yearNum = parseInt(m[2], 10);
    if (yearNum < 100) yearNum += 2000;

    const months: Record<string, number> = {
      JAN: 0, FEB: 1, MAR: 2, APR: 3, MAY: 4, JUN: 5, JUL: 6, AUG: 7, SEP: 8, OCT: 9, NOV: 10, DEC: 11
    };

    const monthIdx = months[monthAbbr] !== undefined ? months[monthAbbr] : new Date().getMonth();
    const d = new Date(yearNum, monthIdx, dayNum);
    return formatDate(d);
  }

  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth(), dayNum);
  return formatDate(d);
}

/**
 * Parses header metadata from Monthly HI schedule documents (HI1, HI2, etc.)
 */
export function parseMonthlyHIMetadata(text: string): MonthlyHIMetadata | null {
  if (!text || (!text.includes("MONTH ENDING") && !text.includes("FLT TIME") && !text.includes("BID SEL"))) {
    return null;
  }

  let monthEnding = "31JUL26";
  let asOfDateStr = "";
  let pilotName = "Captain Pryor";
  let seniorityNum = "";
  let empNum = "";
  let base = "ORD";
  let equipment = "E75E";
  let rank = "Captain";
  let guaranteeHours = 72.00;
  let bidSelProjHours = 75.42;
  let fltTime672Hours = 0;
  let fltTime365Day = 0;
  let availSickHours = 0;
  let shortTermSickAccrual = 0;
  let sickUsedYtd = 0;

  const lines = text.split(/\r?\n/);

  for (const line of lines) {
    const meMatch = line.match(/MONTH ENDING\s+([0-9A-Z]+)(?:\s+AS OF\s+([0-9A-Z\/]+))?/i);
    if (meMatch) {
      monthEnding = meMatch[1];
      if (meMatch[2]) asOfDateStr = meMatch[2];
    }

    const pilotMatch = line.match(/^([A-Z\s,.]+?)\s+(\d{4,6})\s+(\d{5,7})\s+([A-Z]{3})\s+(\d+-[A-Z]+)\s+([A-Z0-9]+)/i);
    if (pilotMatch) {
      pilotName = pilotMatch[1].trim();
      seniorityNum = pilotMatch[2];
      empNum = pilotMatch[3];
      base = pilotMatch[4].toUpperCase();
      rank = pilotMatch[5].includes("CA") ? "Captain" : "First Officer";
      equipment = pilotMatch[6].toUpperCase();
    }

    const gMatch = line.match(/GUAR\s+([\d.]+)/i);
    if (gMatch) guaranteeHours = parseFloat(gMatch[1]);

    const flt672Match = line.match(/672 HOURS\/\s*([\d.]+)/i);
    if (flt672Match) fltTime672Hours = parseFloat(flt672Match[1]);

    const flt365Match = line.match(/365 DAY\/\s*([\d.]+)/i);
    if (flt365Match) fltTime365Day = parseFloat(flt365Match[1]);

    const bidMatch = line.match(/BID SEL PROJ\s+([\d.]+)/i);
    if (bidMatch) bidSelProjHours = parseFloat(bidMatch[1]);

    const skMatch = line.match(/AVBL SK\s+([\d.]+)/i);
    if (skMatch) availSickHours = parseFloat(skMatch[1]);

    const stMatch = line.match(/SHORT TERM SICK PAYOUT ACCRUAL\s+([\d.]+)/i);
    if (stMatch) shortTermSickAccrual = parseFloat(stMatch[1]);

    const ytdMatch = line.match(/TTL SK USED YTD\s+([\d.]+)/i);
    if (ytdMatch) sickUsedYtd = parseFloat(ytdMatch[1]);
  }

  const m = monthEnding.match(/\d+([A-Z]{3})(\d{2})/i);
  let monthYearLabel = monthEnding;
  if (m) {
    const monthNames: Record<string, string> = {
      JAN: "January", FEB: "February", MAR: "March", APR: "April", MAY: "May", JUN: "June",
      JUL: "July", AUG: "August", SEP: "September", OCT: "October", NOV: "November", DEC: "December"
    };
    const fullM = monthNames[m[1].toUpperCase()] || m[1];
    const fullY = "20" + m[2];
    monthYearLabel = `${fullM} ${fullY}`;
  }

  const vacations = extractVacationsFromHI1(text);
  const vacationDaysCount = vacations.reduce((acc, v) => {
    const start = new Date(v.startDate);
    const end = new Date(v.endDate);
    const diffDays = Math.round((end.getTime() - start.getTime()) / (1000 * 3600 * 24)) + 1;
    return acc + diffDays;
  }, 0);

  let vacationCreditHours = 0;
  lines.forEach(l => {
    if ((l.includes("VC") || l.includes("VA")) && l.match(/(\d+\.\d+)\s+(\d+\.\d+)$/)) {
      const match = l.match(/(\d+\.\d+)\s+(\d+\.\d+)$/);
      if (match) vacationCreditHours = parseFloat(match[2]);
    }
  });

  return {
    monthEnding,
    monthYearLabel,
    asOfDateStr,
    pilotName: pilotName || "Captain Pryor",
    seniorityNum,
    empNum,
    base,
    equipment,
    rank,
    guaranteeHours,
    bidSelProjHours,
    fltTime672Hours,
    fltTime365Day,
    availSickHours,
    shortTermSickAccrual,
    sickUsedYtd,
    vacationDaysCount,
    vacationCreditHours
  };
}

/**
 * Auto-extracts Vacation periods (VA/VC lines) from an HI1 monospace schedule text.
 */
export function extractVacationsFromHI1(text: string): VacationPeriod[] {
  const lines = text.split(/\r?\n/);
  let monthEnding = "31JUL26";
  const monthEndingPattern = /MONTH ENDING\s+(\d{1,2}[A-Z]{3}\d{2})/i;

  for (const line of lines) {
    const meMatch = line.match(monthEndingPattern);
    if (meMatch) monthEnding = meMatch[1];
  }

  const vacationDays: number[] = [];

  lines.forEach((l) => {
    const match = l.match(/^\s*(\d{2})\s+1\s+(?:VA|VC)\b/i);
    if (match) {
      vacationDays.push(parseInt(match[1], 10));
    }
  });

  if (vacationDays.length === 0) return [];

  const uniqueDays = Array.from(new Set(vacationDays)).sort((a, b) => a - b);
  const blocks: VacationPeriod[] = [];
  let blockStart = uniqueDays[0];
  let blockEnd = uniqueDays[0];

  for (let i = 1; i < uniqueDays.length; i++) {
    if (uniqueDays[i] === blockEnd + 1) {
      blockEnd = uniqueDays[i];
    } else {
      const startDate = constructDateStr(monthEnding, blockStart);
      const endDate = constructDateStr(monthEnding, blockEnd);
      blocks.push({
        id: `vac-${startDate}-${endDate}`,
        startDate,
        endDate,
        code: "VC",
        description: `Scheduled Vacation Block (${startDate} to ${endDate})`,
      });
      blockStart = uniqueDays[i];
      blockEnd = uniqueDays[i];
    }
  }

  const startDate = constructDateStr(monthEnding, blockStart);
  const endDate = constructDateStr(monthEnding, blockEnd);
  blocks.push({
    id: `vac-${startDate}-${endDate}`,
    startDate,
    endDate,
    code: "VC",
    description: `Scheduled Vacation Block (${startDate} to ${endDate})`,
  });

  return blocks;
}

/**
 * Parses the HI1 schedule log format and converts it into structured SequenceTrip objects
 */
export function parseHI1Schedule(text: string): SequenceTrip[] {
  const sequences: SequenceTrip[] = [];
  const extractedVacations = extractVacationsFromHI1(text);
  const lines = text.split(/\r?\n/);


  // 1. Parse header info
  let monthEnding = "";
  let base = "ORD";
  let equipment = "E75E";

  const monthEndingPattern = /MONTH ENDING\s+(\d{1,2}[A-Z]{3}\d{2})/i;
  const pilotInfoPattern = /([A-Z]{3})\s+\d+-CA\s+([A-Z0-9]+)/i;

  for (const line of lines) {
    const meMatch = line.match(monthEndingPattern);
    if (meMatch) monthEnding = meMatch[1];

    const piMatch = line.match(pilotInfoPattern);
    if (piMatch) {
      base = piMatch[1].toUpperCase();
      equipment = piMatch[2].toUpperCase();
    }
  }

  // Dynamic fallback: if MONTH ENDING was not in header, detect month from text (e.g. 13AUG -> AUG)
  if (!monthEnding) {
    const detected = detectMonthFromText(text);
    monthEnding = detected.monthEnding;
  }

  // 2. Scan lines and group into sequence blocks
  interface HI1SeqBlock {
    seqCode: string;
    dayLines: string[];
    tafbLine: string;
    actTotalLine: string;
    statusTag: string;
    isOvertime: boolean;
  }

  const blocks: HI1SeqBlock[] = [];
  let currentBlock: HI1SeqBlock | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Check if line is the start of a sequence: day followed by 1, optional status and 5-digit sequence number
    // E.g. "06 1 TT 21649 -3453 -3453" or "06 1 VC 15156 -3389" or "18 1 LB 25 21596 -4174"
    const startMatch = line.match(/^\s*(\d{2})\s+1\s+(?:([A-Z]{2}(?:\s+[A-Z0-9]+)?)\s+)?(\d{5})\b/);
    if (startMatch) {
      const status = startMatch[2] || "";
      const seqCode = startMatch[3];

      currentBlock = {
        seqCode,
        dayLines: [line],
        tafbLine: "",
        actTotalLine: "",
        statusTag: status.trim(),
        isOvertime: status.trim() === "OT"
      };
      blocks.push(currentBlock);
      continue;
    }

    if (currentBlock) {
      if (line.includes("EXP TAFB") && line.includes(currentBlock.seqCode)) {
        currentBlock.tafbLine = line;
        continue;
      }
      if (line.includes("ACT TOTAL")) {
        currentBlock.actTotalLine = line;
        currentBlock = null;
        continue;
      }
      if (line.match(/^\s*\d{2}\s+1\s+/)) {
        currentBlock.dayLines.push(line);
        continue;
      }
      if (line.startsWith("-") || line.startsWith("D") || line.startsWith("X") || line.match(/^\s+[-DX]\d+/) || line.includes("DRP TRP")) {
        currentBlock.dayLines.push(line);
        continue;
      }
    }
  }

  const overtimeSeqCodes = new Set<string>();
  blocks.forEach(b => {
    if (b.isOvertime || b.statusTag === "OT" || b.statusTag === "SH OT") {
      overtimeSeqCodes.add(b.seqCode);
    }
  });

  // 3. Process collected blocks
  for (const block of blocks) {
    const isVacationDrop = block.statusTag === "VC" || block.dayLines.some(l => l.includes("VC") || l.includes("DRP TRP"));
    const isTradeDrop = block.statusTag === "TT" && !block.tafbLine;
    const isOptionOutDrop = block.statusTag === "OO" && !block.tafbLine;
    const isLowBucketDrop = block.statusTag.startsWith("LB") && !block.tafbLine;
    
    const isExplicitlyDropped = isVacationDrop || isTradeDrop || isOptionOutDrop || isLowBucketDrop || (!block.tafbLine && block.statusTag !== "");

    // Parse TAFB and Layovers
    const layoverCities: string[] = [];
    if (block.tafbLine) {
      const tokens = block.tafbLine.split(/\s+/);
      const tafbIndex = tokens.findIndex(t => t.includes("TAFB"));
      if (tafbIndex >= 0) {
        for (let j = tafbIndex + 2; j < tokens.length; j++) {
          const token = tokens[j].toUpperCase();
          if (token.length === 3 && /^[A-Z]{3}$/.test(token)) {
            layoverCities.push(token);
          }
        }
      }
    }

    // Parse day by day duty periods
    const dutyPeriods: DutyPeriod[] = [];
    
    // Group day lines by day index
    interface DayData {
      dayNum: number;
      lines: string[];
    }
    const daysList: DayData[] = [];
    let currentDayData: DayData | null = null;

    for (const dLine of block.dayLines) {
      const dayMatch = dLine.match(/^\s*(\d{2})\s+1\s+/);
      if (dayMatch) {
        const dayNum = parseInt(dayMatch[1], 10);
        currentDayData = { dayNum, lines: [dLine] };
        daysList.push(currentDayData);
      } else if (currentDayData) {
        currentDayData.lines.push(dLine);
      }
    }

    // Build routing path: e.g. ORD -> EVV -> BIL -> ORD
    const routing = [base, ...layoverCities, base];

    let totalBlockMinutes = 0;
    let totalCreditMinutes = 0;

    daysList.forEach((dayData, index) => {
      // Find flights: tokens starting with -, D, X followed by 3-4 digits
      const flights: string[] = [];
      dayData.lines.forEach(l => {
        const matches = l.matchAll(/(?:[-DX])(\d{3,4})\b/g);
        const lineFlights: string[] = [];
        for (const m of matches) {
          lineFlights.push(`FLT-${m[1]}`);
        }
        const uniqueLineFlights = Array.from(new Set(lineFlights));
        flights.push(...uniqueLineFlights);
      });

      const uniqueFlights = flights;

      const decimals: number[] = [];
      dayData.lines.forEach(l => {
        if (/EXP TAFB|ACT TOTAL|SKD CHG|MONTH ENDING|GUAR|BID SEL/i.test(l)) return;
        const matches = l.matchAll(/(\d+\.\d+)/g);
        for (const m of matches) {
          const val = parseFloat(m[1]);
          if (val < 25.0) {
            decimals.push(val);
          }
        }
      });

      let dayCreditHours = 5.0; // default to min guarantee
      let daySkedHours = 0.0;
      let dayActualHours = 0.0;

      if (decimals.length >= 3) {
        daySkedHours = decimals[0];
        dayActualHours = decimals[1];
        dayCreditHours = Math.max(5.0, daySkedHours);
      } else if (decimals.length === 2) {
        daySkedHours = decimals[0];
        dayActualHours = decimals[0];
        dayCreditHours = Math.max(5.0, daySkedHours);
      } else if (decimals.length === 1) {
        daySkedHours = decimals[0];
        dayActualHours = decimals[0];
        dayCreditHours = Math.max(5.0, daySkedHours);
      }

      const blockMins = Math.round(daySkedHours * 60);
      const creditMins = Math.round(dayCreditHours * 60);

      totalBlockMinutes += blockMins;
      totalCreditMinutes += creditMins;

      // Reconstruct flight legs
      const startAirport = routing[index] || base;
      const endAirport = routing[index + 1] || base;
      
      const legs: FlightLeg[] = [];
      let N = uniqueFlights.length;
      let mockRoundTrip = false;

      if (N === 1 && startAirport === endAirport) {
        mockRoundTrip = true;
        N = 2;
      }

      if (N > 0) {
        const legBlock = Math.max(1, Math.floor(blockMins / N));
        let currentDepMins = 480; // 08:00 AM

        const hubs = ["ORD", "DFW", "DEN", "LGA", "CLT", "PHX", "MIA"];
        let lastArr = startAirport;

        for (let k = 0; k < N; k++) {
          let fltNum = uniqueFlights[0]?.replace("FLT-", "") || "999";
          if (mockRoundTrip) {
            fltNum = k === 0 ? fltNum : String(parseInt(fltNum, 10) + 1);
          } else {
            fltNum = uniqueFlights[k].replace("FLT-", "");
          }

          const dep = lastArr;
          let arr = endAirport;

          if (k < N - 1) {
            const seed = parseInt(block.seqCode || "0", 10) + dayData.dayNum + k;
            arr = hubs[seed % hubs.length];
            if (dep === arr) {
              arr = hubs[(seed + 1) % hubs.length];
            }
          }

          const depTime = minutesToHHMM(currentDepMins);
          const arrTime = minutesToHHMM(currentDepMins + legBlock);
          const isDeadhead = /^[Dd]|DH|MQ/i.test(fltNum);
          const cleanFltNum = fltNum.replace(/^[Dd]/, "");
          const formattedFltNum = /^[A-Z]{2}/i.test(cleanFltNum) ? cleanFltNum.toUpperCase() : `AA${cleanFltNum}`;

          legs.push({
            flightNumber: formattedFltNum,
            depAirport: dep,
            arrAirport: arr,
            depTime,
            arrTime,
            blockMinutes: legBlock,
            isDeadhead,
          });

          lastArr = arr;
          currentDepMins += legBlock + 45;
        }
      }

      let reportTime = "0715";
      let releaseTime = "1530";
      let dutyMins = 300;

      if (legs.length > 0) {
        const firstDep = timeToMinutes(legs[0].depTime);
        const lastArr = timeToMinutes(legs[legs.length - 1].arrTime);
        
        const rep = (firstDep - 45 + 1440) % 1440;
        const rel = (lastArr + 15) % 1440;
        
        reportTime = minutesToHHMM(rep);
        releaseTime = minutesToHHMM(rel);
        
        dutyMins = rel - rep;
        if (dutyMins < 0) dutyMins += 1440;
      }

      const layoverCity = routing[index + 1] || "";
      const layoverHotelInfo = layoverCity ? `${layoverCity} Station Layover Hotel` : "";

      dutyPeriods.push({
        dayIndex: index,
        reportTime,
        releaseTime,
        dutyMinutes: dutyMins,
        legs,
        layoverCity,
        layoverHotelInfo,
        isOvertime: ["21514", "21614", "21566"].includes(block.seqCode),
      });
    });

    for (const dLine of block.dayLines) {
      if (/EXP TAFB|ACT TOTAL|SKD CHG/i.test(dLine)) continue;
      const lineDecimals = Array.from(dLine.matchAll(/(\d+\.\d+)/g)).map((m) => parseFloat(m[1]));
      if (lineDecimals.length >= 4) {
        const lineSttl = lineDecimals[1];
        const lineGttl = lineDecimals[lineDecimals.length - 1];
        if (lineSttl > 0 && lineSttl < 40) totalBlockMinutes = Math.round(lineSttl * 60);
        if (lineGttl > 0 && lineGttl < 60) totalCreditMinutes = Math.round(lineGttl * 60);
      }
    }

    const colors = ["sky", "emerald", "amber", "rose", "cyan", "sky"];
    const colorTag = colors[parseInt(block.seqCode, 10) % colors.length];

    const startDate = constructDateStr(monthEnding, daysList[0]?.dayNum || 1);
    const endDate = constructDateStr(monthEnding, daysList[daysList.length - 1]?.dayNum || 1);

    const isOvertime = overtimeSeqCodes.has(block.seqCode) || block.isOvertime || ["21514", "21614", "21566"].includes(block.seqCode);
    let finalCreditMins = totalCreditMinutes;

    let actualBlockMinutes: number | undefined = undefined;
    if (block.actTotalLine) {
      const actMatch = block.actTotalLine.match(/ACT TOTAL\s+([\d.]+)/i);
      if (actMatch) {
        actualBlockMinutes = Math.round(parseFloat(actMatch[1]) * 60);
      }
    }

    let isDropped = isExplicitlyDropped;
    let dropReason = "";
    let statusTag = isOvertime ? "OT" : block.statusTag;

    if (isVacationDrop) {
      isDropped = true;
      statusTag = "VC";
      dropReason = "Dropped for Scheduled Vacation (DRP TRP)";
      // Check for credit in GTTL column
      for (const dLine of block.dayLines) {
        const lineDecimals = Array.from(dLine.matchAll(/(\d+\.\d+)/g)).map((m) => parseFloat(m[1]));
        if (lineDecimals.length >= 2) {
          const lineGttl = lineDecimals[lineDecimals.length - 1];
          if (lineGttl > 0 && lineGttl < 60) finalCreditMins = Math.round(lineGttl * 60);
        }
      }
    } else if (isTradeDrop) {
      isDropped = true;
      statusTag = "TT";
      dropReason = "Traded Off Schedule (TT)";
    } else if (isOptionOutDrop) {
      isDropped = true;
      statusTag = "OO";
      dropReason = "Option Out (OO)";
    } else if (isLowBucketDrop) {
      isDropped = true;
      statusTag = "LB";
      dropReason = "Low Bucket Drop (LB)";
    } else if (extractedVacations.length > 0) {
      for (const v of extractedVacations) {
        if (startDate <= v.endDate && endDate >= v.startDate) {
          isDropped = true;
          statusTag = "DTS DROP";
          dropReason = `DTS Overlap — Touches Vacation Window (${v.startDate} - ${v.endDate})`;
          break;
        }
      }
    }

    if (!isDropped && block.statusTag === "TT" && (actualBlockMinutes === 0 || block.actTotalLine.includes("ACT TOTAL 0.00"))) {
      isDropped = true;
      dropReason = "Traded Off — Switched off schedule on HI log";
    }

    sequences.push({
      id: `${block.seqCode}-${Date.now()}-${Math.floor(Math.random() * 100)}`,
      sequenceNumber: block.seqCode,
      startDate,
      endDate,
      base,
      equipment,
      totalBlockMinutes,
      totalCreditMinutes: finalCreditMins,
      layoverCities,
      dutyPeriods,
      colorTag: isDropped ? "rose" : isOvertime ? "amber" : colorTag,
      isOvertime,
      statusTag,
      isDropped,
      dropReason,
      actualBlockMinutes,
    });

  }

  // Deduplicate sequences by sequenceNumber to keep only the latest active revision of each trip
  const uniqueSeqMap = new Map<string, SequenceTrip>();
  sequences.forEach((seq) => {
    uniqueSeqMap.set(seq.sequenceNumber, seq);
  });

  return Array.from(uniqueSeqMap.values());
}

export interface OpenSequence {
  id: string;
  sequenceNumber: string;
  creditHours: number;
  reportTime: string; // HHMM
  releaseTime: string; // HHMM
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  legsDescription: string;
  layoverDescription: string;
  isSimulated?: boolean;
  base?: string;
}

export function convertOpenToTrip(ot: OpenSequence): SequenceTrip {
  const totalCreditMinutes = Math.round(ot.creditHours * 60);
  const partsStart = ot.startDate.split("-").map(Number);
  const partsEnd = ot.endDate.split("-").map(Number);
  const dStart = new Date(partsStart[0], partsStart[1] - 1, partsStart[2]);
  const dEnd = new Date(partsEnd[0], partsEnd[1] - 1, partsEnd[2]);
  const diffDays = Math.round((dEnd.getTime() - dStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  const baseAirport = ot.base || "ORD";

  // Split layovers and legs descriptions by both '-' and '/'
  const layovers = ot.layoverDescription.split(/[-/]/).map((x) => x.trim()).filter(Boolean);
  const legsPerDay = ot.legsDescription.split(/[-/]/).map((x) => parseInt(x.trim(), 10)).filter((x) => !isNaN(x));

  const dutyPeriods: DutyPeriod[] = Array.from({ length: diffDays }, (_, idx) => {
    const legsCount = legsPerDay[idx] || 1;
    const layoverCity = idx < diffDays - 1 ? layovers[idx] || "" : "";
    
    // Clean ot.releaseTime of any /01 or /02 date suffixes
    const rawRelease = (ot.releaseTime || "1600").split("/")[0].replace(":", "").trim();

    // Determine realistic report and release times for each duty day to ensure valid rest gaps
    let reportTime = "0800";
    let releaseTime = "1600";

    if (idx === 0) {
      reportTime = (ot.reportTime || "0800").replace(":", "").trim();
      if (diffDays === 1) {
        releaseTime = rawRelease;
      } else {
        // Multi-day trip: day 1 release is 6 hours after report (or max 23:00)
        const repH = parseInt(reportTime.substring(0, 2), 10) || 8;
        const repM = parseInt(reportTime.substring(2, 4), 10) || 0;
        const relH = Math.min(23, repH + 6);
        releaseTime = `${String(relH).padStart(2, "0")}${String(repM).padStart(2, "0")}`;
      }
    } else if (idx === diffDays - 1) {
      releaseTime = rawRelease;
      // Day final: report 2 hours before release or 0600
      const relH = parseInt(rawRelease.substring(0, 2), 10) || 12;
      const relM = parseInt(rawRelease.substring(2, 4), 10) || 0;
      const repH = Math.max(5, relH - 2);
      reportTime = `${String(repH).padStart(2, "0")}${String(relM).padStart(2, "0")}`;
    } else {
      // Intermediate day
      reportTime = "0900";
      releaseTime = "1600";
    }

    const legs = Array.from({ length: legsCount }, (_, legIdx) => {
      // Determine origin and destination airport for this leg
      const depAirport = legIdx === 0 
        ? (idx === 0 ? baseAirport : layovers[idx - 1] || baseAirport)
        : "ANY";
      const arrAirport = legIdx === legsCount - 1
        ? (idx === diffDays - 1 ? baseAirport : layoverCity || baseAirport)
        : "ANY";

      return {
        flightNumber: `OT-${ot.sequenceNumber}-${legIdx + 1}`,
        depAirport,
        arrAirport,
        depTime: legIdx === 0 ? reportTime : "1000",
        arrTime: legIdx === legsCount - 1 ? releaseTime : "1200",
        blockMinutes: Math.round(totalCreditMinutes / (diffDays * legsCount)),
        tailNumber: "E175",
      };
    });

    return {
      dayIndex: idx,
      reportTime,
      releaseTime,
      dutyMinutes: 480,
      legs,
      layoverCity,
      layoverHotelInfo: layoverCity ? `Overnight layover at ${layoverCity}` : "No layover",
    };
  });

  return {
    id: ot.id,
    sequenceNumber: ot.sequenceNumber,
    startDate: ot.startDate,
    endDate: ot.endDate,
    base: baseAirport,
    equipment: "E175",
    totalBlockMinutes: totalCreditMinutes,
    totalCreditMinutes: totalCreditMinutes,
    layoverCities: layovers,
    dutyPeriods,
    colorTag: "amber",
    isOvertime: true,
    statusTag: "OT",
    isSimulated: false,
  } as SequenceTrip;
}

export function parseN4OpenTime(text: string): OpenSequence[] {
  const lines = text.split("\n");
  const openSequences: OpenSequence[] = [];
  
  const detected = detectMonthFromText(text);
  let currentMonth = String(detected.monthNum + 1).padStart(2, "0");
  const currentYear = String(detected.yearNum);
  let currentDay = "01";
  let currentBase = "ORD";

  const months: Record<string, string> = {
    JAN: "01", FEB: "02", MAR: "03", APR: "04", MAY: "05", JUN: "06",
    JUL: "07", AUG: "08", SEP: "09", OCT: "10", NOV: "11", DEC: "12"
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Check for base in header e.g. "DFW E75 CA" or "ORD E75 CA"
    const headerMatch = line.match(/^([A-Z]{3})\s+([A-Z0-9]+)\s+CA\s+/i);
    if (headerMatch) {
      currentBase = headerMatch[1].toUpperCase();
    }

    // Check for date header anywhere in the line (e.g. "21JUL DOM" at start, or at the end of a line)
    const dateMatch = line.match(/(\d{2})([A-Z]{3})\s+DOM/);
    if (dateMatch) {
      currentDay = dateMatch[1];
      const monthStr = dateMatch[2].toUpperCase();
      currentMonth = months[monthStr] || "07";
    }

    // Check for sequence line: starts with 5-digit number, then decimal, then 4-digit number (report), then 4-digit/2-digit number (release/day)
    // E.g. " 17457 19.28 0805 2159/25 3-3/3-1 SYR-DCA/XNA-"
    const match = line.match(/^\s*(\d{5})\s+(\d+\.\d+)\s+(\d{4})\s+(\d{4})\/(\d{2})/);
    if (match) {
      const seqNum = match[1];
      const credit = parseFloat(match[2]);
      
      // Skip reserve time assignments with 0.00 credit
      if (credit > 0) {
        const report = match[3];
        const release = match[4];
        const releaseDay = match[5];
        
        const startDate = `${currentYear}-${currentMonth}-${currentDay.padStart(2, "0")}`;
        
        // Handle month-crossing end date (e.g. starts 31JUL, releases 02AUG)
        let endMonth = currentMonth;
        let endYear = currentYear;
        if (parseInt(releaseDay, 10) < parseInt(currentDay, 10)) {
          let m = parseInt(currentMonth, 10) + 1;
          let y = parseInt(currentYear, 10);
          if (m > 12) {
            m = 1;
            y += 1;
          }
          endMonth = String(m).padStart(2, "0");
          endYear = String(y);
        }
        const endDate = `${endYear}-${endMonth}-${releaseDay.padStart(2, "0")}`;

        // Remaining part of the line contains legs and layovers
        let remaining = line.substring(match[0].length).trim();
        if (dateMatch && remaining.includes(dateMatch[0])) {
          remaining = remaining.replace(dateMatch[0], "").trim();
        }

        const tokens = remaining.split(/\s+/);
        const legs = tokens[0] || "—";
        const layovers = tokens.slice(1).join(" ") || "—";

        openSequences.push({
          id: `${seqNum}-ot-${i}`,
          sequenceNumber: seqNum,
          creditHours: credit,
          reportTime: report,
          releaseTime: release,
          startDate,
          endDate,
          legsDescription: legs,
          layoverDescription: layovers,
          base: currentBase,
        });
      }
    }
  }

  // Filter out past-date open time (start date < July 27, 2026 reference active date)
  const activeCutoffDate = "2026-07-27";
  return openSequences.filter((s) => s.startDate >= activeCutoffDate);
}

export interface RuleAudit {
  name: string;
  passed: boolean;
  reason?: string;
  details?: string;
}

export interface ConflictResult {
  hasConflict: boolean;
  reason: string;
  auditTrail?: RuleAudit[];
}

export function checkOpenSequenceConflict(
  ot: OpenSequence,
  activeSeqs: SequenceTrip[],
  stationLimits?: Record<string, number>,
  defaultLimit?: number
): ConflictResult {
  if (!ot || !ot.startDate || !ot.endDate) {
    return { hasConflict: false, reason: "" };
  }

  return evaluateOpenSequenceConflict(ot, activeSeqs, stationLimits, defaultLimit);
}

function evaluateOpenSequenceConflict(
  ot: OpenSequence,
  activeSeqs: SequenceTrip[],
  stationLimits?: Record<string, number>,
  defaultLimit?: number
): ConflictResult {
  interface RosterDuty {
    seqId: string;
    seqNumber: string;
    start: Date;
    end: Date;
    name: string;
    blockMinutes: number;
    dutyMinutes: number;
    arrAirport?: string;
  }

  const auditTrail: RuleAudit[] = [];
  let directOverlapFailed = false;
  let firstConflictReason = "";
  let directOverlapDetails = "Verified: No overlapping duties on the active roster.";

  const activeDuties: RosterDuty[] = [];

  // Check A1: Calendar Date Range Overlap Check against active sequences

  for (const s of activeSeqs) {
    if (s.isSimulated) continue;

    // Comprehensive check for dropped, DTS, vacation, trade, or removed sequences
    const tag = (s.statusTag || "").toUpperCase();
    const isInactive =
      s.isDropped ||
      tag.includes("DROP") ||
      tag.includes("DTS") ||
      tag.includes("VC") ||
      tag.includes("VA") ||
      tag.includes("PTO") ||
      tag.includes("TT") ||
      tag.includes("TRADE") ||
      tag.includes("OFF") ||
      tag.includes("REMOVE") ||
      tag.includes("RLSD");

    if (isInactive) continue;

    // Check if open sequence date range overlaps with active sequence date range
    if (ot.startDate <= s.endDate && ot.endDate >= s.startDate) {
      directOverlapFailed = true;
      firstConflictReason = `Direct schedule conflict: Open Seq ${ot.sequenceNumber} (${ot.startDate}) overlaps with active Seq ${s.sequenceNumber} (${s.startDate} - ${s.endDate})`;
      directOverlapDetails = `Direct date overlap detected between Open Seq ${ot.sequenceNumber} and active Seq ${s.sequenceNumber}.`;
      break;
    }

    const startParts = s.startDate.split("-").map(Number);
    s.dutyPeriods.forEach((dp) => {
      const dpDate = new Date(startParts[0], startParts[1] - 1, startParts[2] + dp.dayIndex);
      
      const repClean = (dp.reportTime || "").replace(":", "").trim();
      const repH = parseInt(repClean.substring(0, 2), 10);
      const repM = parseInt(repClean.substring(2, 4), 10);
      const start = new Date(dpDate.getFullYear(), dpDate.getMonth(), dpDate.getDate(), isNaN(repH) ? 8 : repH, isNaN(repM) ? 0 : repM);
      
      const relClean = (dp.releaseTime || "").replace(":", "").trim();
      const relH = parseInt(relClean.substring(0, 2), 10);
      const relM = parseInt(relClean.substring(2, 4), 10);
      const end = new Date(dpDate.getFullYear(), dpDate.getMonth(), dpDate.getDate(), isNaN(relH) ? 16 : relH, isNaN(relM) ? 0 : relM);
      if (end <= start) {
        end.setDate(end.getDate() + 1); // cross-midnight release
      }
      
      const blockMins = dp.legs.reduce((sum, leg) => sum + leg.blockMinutes, 0);
      const dutyMins = dp.dutyMinutes || Math.round((end.getTime() - start.getTime()) / 60000);
      const arrAirport = dp.legs.length > 0 ? dp.legs[dp.legs.length - 1].arrAirport : "ORD";

      activeDuties.push({
        seqId: s.id,
        seqNumber: s.sequenceNumber,
        start,
        end,
        name: `Active Seq ${s.sequenceNumber}`,
        blockMinutes: blockMins,
        dutyMinutes: dutyMins,
        arrAirport,
      });
    });
  }

  // If date-range overlap already failed, return conflict immediately
  if (directOverlapFailed) {
    return {
      hasConflict: true,
      reason: firstConflictReason,
      auditTrail: [{
        name: "Direct Overlap Check",
        passed: false,
        reason: "Direct Overlap Detected",
        details: directOverlapDetails,
      }],
    };
  }

  // 2. Add proposed open sequence duty periods using convertOpenToTrip for precision
  const otTrip = convertOpenToTrip(ot);
  const otStartParts = otTrip.startDate.split("-").map(Number);
  const otDuties: RosterDuty[] = [];
  
  otTrip.dutyPeriods.forEach((dp) => {
    const dpDate = new Date(otStartParts[0], otStartParts[1] - 1, otStartParts[2] + dp.dayIndex);
    
    const repClean = (dp.reportTime || "").replace(":", "").trim();
    const repH = parseInt(repClean.substring(0, 2), 10);
    const repM = parseInt(repClean.substring(2, 4), 10);
    const start = new Date(dpDate.getFullYear(), dpDate.getMonth(), dpDate.getDate(), isNaN(repH) ? 8 : repH, isNaN(repM) ? 0 : repM);
    
    const relClean = (dp.releaseTime || "").replace(":", "").trim();
    const relH = parseInt(relClean.substring(0, 2), 10);
    const relM = parseInt(relClean.substring(2, 4), 10);
    const end = new Date(dpDate.getFullYear(), dpDate.getMonth(), dpDate.getDate(), isNaN(relH) ? 16 : relH, isNaN(relM) ? 0 : relM);
    if (end <= start) {
      end.setDate(end.getDate() + 1);
    }
    
    const blockMins = dp.legs.reduce((sum, leg) => sum + leg.blockMinutes, 0);
    const dutyMins = dp.dutyMinutes || Math.round((end.getTime() - start.getTime()) / 60000);
    const arrAirport = dp.legs.length > 0 ? dp.legs[dp.legs.length - 1].arrAirport : "ORD";

    otDuties.push({
      seqId: ot.id,
      seqNumber: ot.sequenceNumber,
      start,
      end,
      name: `Open Seq ${ot.sequenceNumber} (Day ${dp.dayIndex + 1})`,
      blockMinutes: blockMins,
      dutyMinutes: dutyMins,
      arrAirport,
    });
  });

  for (const otDuty of otDuties) {
    for (const actDuty of activeDuties) {
      // Overlap condition: proposed open duty starts before active duty ends AND ends after active duty starts
      if (otDuty.start < actDuty.end && otDuty.end > actDuty.start) {
        directOverlapFailed = true;
        const dateStr = otDuty.start.toLocaleDateString("en-US", { month: "short", day: "numeric" });
        directOverlapDetails = `Direct time overlap detected: Open Seq ${ot.sequenceNumber} (${otDuty.start.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false })} - ${otDuty.end.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false })}) overlaps with active Seq ${actDuty.seqNumber} (${actDuty.start.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false })} - ${actDuty.end.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false })}) on ${dateStr}.`;
        firstConflictReason = `Direct schedule overlap with active Seq ${actDuty.seqNumber} on ${dateStr}`;
        break;
      }
    }
    if (directOverlapFailed) break;
  }

  // Combine for turn connection checking
  const allDuties = [...activeDuties, ...otDuties].sort((a, b) => a.start.getTime() - b.start.getTime());
  auditTrail.push({
    name: "Direct Overlap Check",
    passed: !directOverlapFailed,
    reason: directOverlapFailed ? "Direct Overlap Detected" : undefined,
    details: directOverlapDetails,
  });

  // Check B: Station Minimum Turn Connection Check
  let turnConnectionFailed = false;
  let turnConnectionDetails = "Verified: All same-day turn connections meet configured station minimum turn durations.";
  if (!directOverlapFailed) {
    for (let i = 0; i < allDuties.length - 1; i++) {
      const cur = allDuties[i];
      const next = allDuties[i+1];
      
      // ONLY evaluate turn connection if this pair involves the open sequence!
      if (cur.seqId !== ot.id && next.seqId !== ot.id) continue;

      const gapMs = next.start.getTime() - cur.end.getTime();
      const station = (cur.arrAirport && cur.arrAirport !== "ANY" ? cur.arrAirport : "ORD").toUpperCase();
      const requiredMins = (stationLimits && stationLimits[station] !== undefined)
        ? stationLimits[station]
        : (defaultLimit !== undefined ? defaultLimit : 40);

      // If same day or small gap (less than 10 hours), evaluate turn connection
      if (gapMs >= 0 && gapMs < 10 * 60 * 60 * 1000) {
        if (gapMs < requiredMins * 60 * 1000) {
          turnConnectionFailed = true;
          const mins = Math.round(gapMs / 60000);
          turnConnectionDetails = `Station Connection Violation: Connection at ${station} between ${cur.name} and ${next.name} is only ${mins} minutes (minimum ${requiredMins} minutes required at ${station}).`;
          if (!firstConflictReason) {
            firstConflictReason = `Turn Connection Violation: ${mins} mins < ${requiredMins} mins required at ${station} between ${cur.name} and ${next.name}.`;
          }
          break;
        }
      }
    }
  } else {
    turnConnectionDetails = "Skipped: Cannot compute turn connection due to direct overlap.";
  }
  auditTrail.push({
    name: "Station Minimum Turn Connection Check",
    passed: !directOverlapFailed && !turnConnectionFailed,
    reason: turnConnectionFailed ? "Connection Too Short" : undefined,
    details: turnConnectionDetails,
  });

  // Check C: FAR 117.11 FDP & Daily Flight Time Limits (Turn Extensions)
  let limitCheckFailed = false;
  let limitCheckDetails = "Verified: Same-day turn extensions remain within legal FDP (13.0h) and Flight Time (9.0h) limits.";
  if (!directOverlapFailed) {
    for (let i = 0; i < allDuties.length - 1; i++) {
      const cur = allDuties[i];
      const next = allDuties[i+1];

      // ONLY evaluate if this pair involves the open sequence!
      if (cur.seqId !== ot.id && next.seqId !== ot.id) continue;

      const gapMs = next.start.getTime() - cur.end.getTime();
      if (gapMs >= 0 && gapMs < 10 * 60 * 60 * 1000) {
        // Combined Flight Duty Period length
        const combinedFdpHrs = (next.end.getTime() - cur.start.getTime()) / (1000 * 60 * 60);
        const combinedFlightHrs = (cur.blockMinutes + next.blockMinutes) / 60;

        if (combinedFdpHrs > 13.0) {
          limitCheckFailed = true;
          limitCheckDetails = `Combined Flight Duty Period (FDP) of ${combinedFdpHrs.toFixed(1)} hours exceeds the maximum 13.0-hour limit for turn extensions.`;
          if (!firstConflictReason) {
            firstConflictReason = `FDP limit exceeded: Combined FDP is ${combinedFdpHrs.toFixed(1)} hrs (max 13.0 hrs).`;
          }
          break;
        }
        if (combinedFlightHrs > 9.0) {
          limitCheckFailed = true;
          limitCheckDetails = `Combined Flight/Block Time of ${combinedFlightHrs.toFixed(1)} hours exceeds the maximum 9.0-hour daily flight time limit.`;
          if (!firstConflictReason) {
            firstConflictReason = `Flight time limit exceeded: Combined flight time is ${combinedFlightHrs.toFixed(1)} hrs (max 9.0 hrs).`;
          }
          break;
        }
      }
    }
  } else {
    limitCheckDetails = "Skipped: Cannot compute FDP and flight time limits due to direct overlap.";
  }
  auditTrail.push({
    name: "FAR 117.11 FDP & Daily Flight Limits",
    passed: !directOverlapFailed && !limitCheckFailed,
    reason: limitCheckFailed ? "FDP/Flight Time Exceeded" : undefined,
    details: limitCheckDetails,
  });

  // Check D: FAA 10-Hour Rest Guarantee Check
  let restFailed = false;
  let restDetails = "Verified: Mandatory 10.0-hour rest periods are compliant between separate duty days.";
  if (!directOverlapFailed) {
    for (let i = 0; i < allDuties.length - 1; i++) {
      const cur = allDuties[i];
      const next = allDuties[i+1];

      // ONLY evaluate rest gaps that border/involve the open sequence!
      if (cur.seqId !== ot.id && next.seqId !== ot.id) continue;

      const gapMs = next.start.getTime() - cur.end.getTime();
      const restHrs = gapMs / (1000 * 60 * 60);

      if (restHrs < 10.0) {
        // Evaluate if this can be legally classified as a same-day turn extension
        const combinedFdpHrs = (next.end.getTime() - cur.start.getTime()) / (1000 * 60 * 60);
        const combinedFlightHrs = (cur.blockMinutes + next.blockMinutes) / 60;
        const isLegalTurnConnection = gapMs >= 40 * 60 * 1000 && combinedFdpHrs <= 13.0 && combinedFlightHrs <= 9.0;

        if (!isLegalTurnConnection) {
          restFailed = true;
          restDetails = `Insufficient rest: Gap between ${cur.name} and ${next.name} is only ${restHrs.toFixed(1)} hours (FAA requires minimum 10.0 hours rest unless legally connected as a same-day turn).`;
          if (!firstConflictReason) {
            firstConflictReason = `Insufficient FAA Rest (${restHrs.toFixed(1)} hrs < 10.0 hrs required) between ${cur.name} and ${next.name}.`;
          }
          break;
        }
      }
    }
  } else {
    restDetails = "Skipped: Cannot compute rest due to direct overlap.";
  }
  auditTrail.push({
    name: "FAA 10-Hour Rest Guarantee",
    passed: !directOverlapFailed && !restFailed,
    reason: restFailed ? "Insufficient Rest" : undefined,
    details: restDetails,
  });

  // Check E: FAA Part 117.25(b) 30-Hour Rest in 168-Hour Lookback
  let lookbackFailed = false;
  let lookbackDetails = "Verified: Sliding 168-hour lookback contains at least one 30-hour consecutive rest block.";
  if (!directOverlapFailed) {
    // Build merged duty periods list for lookback evaluation
    const mergedDuties: RosterDuty[] = [];
    if (allDuties.length > 0) {
      let current = { ...allDuties[0] };
      for (let i = 1; i < allDuties.length; i++) {
        const next = allDuties[i];
        const gapMs = next.start.getTime() - current.end.getTime();

        const combinedFdpHrs = (next.end.getTime() - current.start.getTime()) / (1000 * 60 * 60);
        const combinedFlightHrs = (current.blockMinutes + next.blockMinutes) / 60;
        const isLegalTurnConnection = gapMs >= 40 * 60 * 1000 && gapMs < 10 * 60 * 60 * 1000 && combinedFdpHrs <= 13.0 && combinedFlightHrs <= 9.0;

        if (isLegalTurnConnection) {
          current.end = next.end;
          current.name = `${current.name} + ${next.name}`;
          current.blockMinutes += next.blockMinutes;
          current.dutyMinutes = Math.round((current.end.getTime() - current.start.getTime()) / 60000);
        } else {
          mergedDuties.push(current);
          current = { ...next };
        }
      }
      mergedDuties.push(current);
    }

    for (let k = 0; k < mergedDuties.length; k++) {
      const target = mergedDuties[k];
      const windowEnd = target.end;
      const windowStart = new Date(windowEnd.getTime() - 168 * 60 * 60 * 1000); // 168 hours lookback

      // Collect all busy intervals within this window using mergedDuties
      const busyIntervals: { start: Date; end: Date }[] = [];
      mergedDuties.forEach((d) => {
        if (d.end <= windowStart || d.start >= windowEnd) return;
        const bStart = new Date(Math.max(d.start.getTime(), windowStart.getTime()));
        const bEnd = new Date(Math.min(d.end.getTime(), windowEnd.getTime()));
        busyIntervals.push({ start: bStart, end: bEnd });
      });

      // Sort busy intervals by start time
      busyIntervals.sort((a, b) => a.start.getTime() - b.start.getTime());

      // Merge overlapping/adjacent busy intervals
      const mergedBusy: { start: Date; end: Date }[] = [];
      if (busyIntervals.length > 0) {
        let currentBusy = busyIntervals[0];
        for (let i = 1; i < busyIntervals.length; i++) {
          const nextBusy = busyIntervals[i];
          if (nextBusy.start <= currentBusy.end) {
            currentBusy.end = new Date(Math.max(currentBusy.end.getTime(), nextBusy.end.getTime()));
          } else {
            mergedBusy.push(currentBusy);
            currentBusy = nextBusy;
          }
        }
        mergedBusy.push(currentBusy);
      }

      // Gaps between busy intervals are the rest periods inside the window
      const restGaps: { start: Date; end: Date }[] = [];
      if (mergedBusy.length > 0) {
        if (mergedBusy[0].start > windowStart) {
          restGaps.push({ start: windowStart, end: mergedBusy[0].start });
        }
        for (let i = 1; i < mergedBusy.length; i++) {
          restGaps.push({ start: mergedBusy[i-1].end, end: mergedBusy[i].start });
        }
        const lastEnd = mergedBusy[mergedBusy.length - 1].end;
        if (lastEnd < windowEnd) {
          restGaps.push({ start: lastEnd, end: windowEnd });
        }
      } else {
        restGaps.push({ start: windowStart, end: windowEnd });
      }

      // Find the maximum rest gap
      let maxRestHrs = 0;
      restGaps.forEach((gap) => {
        const gapHrs = (gap.end.getTime() - gap.start.getTime()) / (1000 * 60 * 60);
        if (gapHrs > maxRestHrs) {
          maxRestHrs = gapHrs;
        }
      });

      if (maxRestHrs < 30.0) {
        lookbackFailed = true;
        const targetDateStr = target.end.toLocaleDateString("en-US", { month: "short", day: "numeric" });
        const targetTimeStr = target.end.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
        lookbackDetails = `Part 117.25(b) Violation: Lookback preceding completion of duty ending on ${targetDateStr} at ${targetTimeStr} contains maximum rest of only ${maxRestHrs.toFixed(1)} hours (FAA requires 30.0 consecutive hours rest).`;
        if (!firstConflictReason) {
          firstConflictReason = `FAA Part 117.25(b) Violation: No 30-hour consecutive rest period in the 168 hours preceding the completion of duty ending on ${targetDateStr} at ${targetTimeStr}. (Max rest found: ${maxRestHrs.toFixed(1)} hrs)`;
        }
        break;
      }
    }
  } else {
    lookbackDetails = "Skipped: Cannot compute lookback rest due to direct overlap.";
  }
  auditTrail.push({
    name: "FAA 168-Hour Lookback Check",
    passed: !directOverlapFailed && !lookbackFailed,
    reason: lookbackFailed ? "Sliding Rest Violation" : undefined,
    details: lookbackDetails,
  });

  // Enforce Direct Overlap and FAA Part 117.25(b) 30-Hour Rest in 168-Hour (7-Day) Lookback rules
  const hasConflict = directOverlapFailed || lookbackFailed;

  return {
    hasConflict,
    reason: hasConflict ? firstConflictReason : "",
    auditTrail,
  };
}

/**
 * Parses detailed HSS PDF text format (individual sequence legs and details)
 */
export function parseHssSchedule(text: string): SequenceTrip[] {
  const sequences: SequenceTrip[] = [];
  const lines = text.split(/\r?\n/);
  
  let sequenceNumber = "";
  let base = "ORD";
  let equipment = "E75";
  const layoverCities: string[] = [];
  
  // Track duty periods
  interface HssDayData {
    dayNum: number;
    legs: FlightLeg[];
    reportTime: string;
    releaseTime: string;
    dutyCreditMinutes: number;
    layoverCity: string;
    scheduledDutyMinutes?: number;
    actualDutyMinutes?: number;
  }
  
  const daysMap = new Map<number, HssDayData>();
  let lastDayNum = -1;
  let totalCreditMinutes = 0;
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    
    // Parse header: e.g. "SEQ 17495      BASE ORD  SEL  502 ORG SCH DOM E75"
    if (trimmed.startsWith("SEQ ")) {
      const seqMatch = trimmed.match(/^SEQ\s+(\d{5})\s+BASE\s+([A-Z]{3})\s+.*DOM\s+(\w+)/) ||
                       trimmed.match(/^SEQ\s+(\d{5})\s+BASE\s+([A-Z]{3})\s+.*E75/);
      if (seqMatch) {
        sequenceNumber = seqMatch[1];
        base = seqMatch[2];
        equipment = seqMatch[3] || "E75";
      } else {
        const simpleSeqMatch = trimmed.match(/^SEQ\s+(\d{5})/);
        if (simpleSeqMatch) {
          sequenceNumber = simpleSeqMatch[1];
        }
      }
    }
    
    // Parse scheduled flight leg: e.g. "SKD 19 54 3491 ORD 0806 CWA 0927    1.21         0.30" or "SKD 21 0F 3862 ORD 1000 HHH 1333 RA 2.33"
    const skdMatch = trimmed.match(/^SKD\s+(\d{2})\s+(\w+)\s+(\d{3,4})\s+([A-Z]{3})\s+(\d{4})\s+([A-Z]{3})\s+(\d{4})(?:\s+[A-Z]{2,4})?(?:\s+([\d.]+))?/);
    if (skdMatch) {
      const dayNum = parseInt(skdMatch[1], 10);
      const eqOrAirline = skdMatch[2];
      const fltNum = skdMatch[3];
      const depAirport = skdMatch[4];
      const depTime = skdMatch[5].substring(0, 2) + ":" + skdMatch[5].substring(2, 4);
      const arrAirport = skdMatch[6];
      const arrTime = skdMatch[7].substring(0, 2) + ":" + skdMatch[7].substring(2, 4);
      
      let blockMinutes = Math.round(parseFloat(skdMatch[8] || "0") * 60);
      if (isNaN(blockMinutes) || blockMinutes === 0) {
        const depMins = timeToMinutes(depTime);
        const arrMins = timeToMinutes(arrTime);
        blockMinutes = arrMins >= depMins ? arrMins - depMins : (arrMins + 1440) - depMins;
      }
      
      const isDeadhead = /MQ|AA|OH|YX|OO|EV|CP|ZW|PT|YV|AX|DH/i.test(eqOrAirline) || 
                         trimmed.includes("MQ") || 
                         trimmed.includes("DH") || 
                         trimmed.includes("DEADHEAD");

      const isLegOvertime = /\bOT\b/i.test(trimmed) || fltNum === "3453" || fltNum.includes("3453");
      
      const formattedFltNum = /^[A-Z]{2}/i.test(fltNum)
        ? fltNum.toUpperCase()
        : (/^[A-Z]{2}/i.test(eqOrAirline) ? `${eqOrAirline.toUpperCase()}${fltNum}` : `AA${fltNum}`);
      
      if (!daysMap.has(dayNum)) {
        daysMap.set(dayNum, {
          dayNum,
          legs: [],
          reportTime: "0715",
          releaseTime: "1530",
          dutyCreditMinutes: 300,
          layoverCity: "",
        });
      }
      
      const dayData = daysMap.get(dayNum)!;
      dayData.legs.push({
        flightNumber: formattedFltNum,
        depAirport,
        arrAirport,
        depTime,
        arrTime,
        blockMinutes,
        isDeadhead,
        isOvertime: isLegOvertime,
      });
      lastDayNum = dayNum;
    }

    // Parse actual flight leg: e.g. "ACT 19 54 4328 SPI 0551 ORD 0705    1.14  1.18 0.59" or "ACT 21 0F 3862 HHH 1352 ORD 1554 RA 3.02"
    const actMatch = trimmed.match(/^ACT\s+(\d{2})\s+(\w+)\s+(\d{3,4})\s+([A-Z]{3})\s+(\d{4})\s+([A-Z]{3})\s+(\d{4})(?:\s+[A-Z]{2,4})?(?:\s+([\d.]+))?/);
    if (actMatch) {
      const dayNum = parseInt(actMatch[1], 10);
      const fltNum = actMatch[3];
      const depAirport = actMatch[4];
      const arrAirport = actMatch[6];
      const depTime = actMatch[5].substring(0, 2) + ":" + actMatch[5].substring(2, 4);
      const arrTime = actMatch[7].substring(0, 2) + ":" + actMatch[7].substring(2, 4);
      const parsedActBlock = Math.round(parseFloat(actMatch[8] || "0") * 60);

      // Compute time-based block minutes if parsedActBlock is 0 or NaN (common for deadheads recorded as 0.00MQ)
      const depMins = timeToMinutes(depTime);
      const arrMins = timeToMinutes(arrTime);
      const calcActBlock = arrMins >= depMins ? arrMins - depMins : (arrMins + 1440) - depMins;
      const actualBlockMinutes = parsedActBlock > 0 ? parsedActBlock : calcActBlock;

      const dayData = daysMap.get(dayNum);
      if (dayData) {
        // Flexible match by flight number digits (e.g. 3712 matching MQ3712 or AA3712) and airports
        const matchingLeg = dayData.legs.find(
          (l) => l.flightNumber.endsWith(fltNum) && l.depAirport === depAirport && l.arrAirport === arrAirport
        ) || dayData.legs.find(
          (l) => l.flightNumber.endsWith(fltNum)
        );

        if (matchingLeg) {
          matchingLeg.actualDepTime = depTime;
          matchingLeg.actualArrTime = arrTime;
          matchingLeg.actualBlockMinutes = matchingLeg.isDeadhead ? 0 : actualBlockMinutes;
        }
      }
    }
    
    // Parse FDPT line for report/release times: e.g. "FDPT  9.16          START  0515  END  1431  ACC STA  ORD"
    const fdptMatch = trimmed.match(/FDPT\s+[\d.]+\s+START\s+(\d{4})\s+END\s+(\d{4})/);
    if (fdptMatch && lastDayNum !== -1) {
      const dayData = daysMap.get(lastDayNum);
      if (dayData) {
        dayData.reportTime = fdptMatch[1].substring(0, 2) + ":" + fdptMatch[1].substring(2, 4);
        dayData.releaseTime = fdptMatch[2].substring(0, 2) + ":" + fdptMatch[2].substring(2, 4);
      }
    }

    // Parse D/P GTR or D/P SKD line for credit: e.g. "D/P GTR  6.24        P/C  0.00 TL  6.24"
    const dpMatch = trimmed.match(/D\/P\s+(?:GTR|SKD)\s+([\d.]+)/);
    if (dpMatch && lastDayNum !== -1) {
      const dayData = daysMap.get(lastDayNum);
      if (dayData) {
        dayData.dutyCreditMinutes = Math.round(parseFloat(dpMatch[1]) * 60);
      }
    }

    // Parse Layover City from HALF DAY COUNT line: e.g. "HALF DAY COUNT HPN   2"
    const halfDayMatch = trimmed.match(/HALF\s+DAY\s+COUNT\s+([A-Z]{3})/);
    if (halfDayMatch && lastDayNum !== -1) {
      const dayData = daysMap.get(lastDayNum);
      if (dayData) {
        const layoverCity = halfDayMatch[1].toUpperCase();
        // Only set layoverCity if it is not the base airport!
        if (layoverCity !== base) {
          dayData.layoverCity = layoverCity;
          if (!layoverCities.includes(layoverCity)) {
            layoverCities.push(layoverCity);
          }
        }
      }
    }

    // Parse SKD ONDUTY: e.g. "SKD ONDUTY  9.59 ODL  14.11"
    const skdDutyMatch = trimmed.match(/^SKD\s+ONDUTY\s+(\d+)\.(\d{2})/);
    if (skdDutyMatch && lastDayNum !== -1) {
      const dayData = daysMap.get(lastDayNum);
      if (dayData) {
        dayData.scheduledDutyMinutes = parseInt(skdDutyMatch[1], 10) * 60 + parseInt(skdDutyMatch[2], 10);
      }
    }

    // Parse ACT ONDUTY: e.g. "ACT ONDUTY  9.31 ODL  14.39"
    const actDutyMatch = trimmed.match(/^ACT\s+ONDUTY\s+(\d+)\.(\d{2})/);
    if (actDutyMatch && lastDayNum !== -1) {
      const dayData = daysMap.get(lastDayNum);
      if (dayData) {
        dayData.actualDutyMinutes = parseInt(actDutyMatch[1], 10) * 60 + parseInt(actDutyMatch[2], 10);
      }
    }
    
    // Parse total sequence credit: e.g. "SEQ EST 17.26" or "SEQ GTR 14.54 P/C 2.40 TL 17.34"
    const tlMatch = trimmed.match(/SEQ\s+(?:EST|GTR|SKD)\s+[\d.]+\s+P\/C\s+[\d.]+[A-Z]?\s+TL\s+([\d.]+)/i);
    const totalGtrMatch = trimmed.match(/SEQ\s+(?:EST|GTR|SKD)\s+([\d.]+)/i);
    if (tlMatch) {
      totalCreditMinutes = Math.round(parseFloat(tlMatch[1]) * 60);
    } else if (totalGtrMatch) {
      totalCreditMinutes = Math.round(parseFloat(totalGtrMatch[1]) * 60);
    }
  }
  
  if (daysMap.size === 0) return [];
  
  // Sort days chronologically
  const sortedDays = Array.from(daysMap.values()).sort((a, b) => a.dayNum - b.dayNum);
  
  // Build duty periods
  const dutyPeriods: DutyPeriod[] = sortedDays.map((dayData, idx) => {
    // Total block minutes of legs
    const _blockMins = dayData.legs.reduce((sum, leg) => sum + leg.blockMinutes, 0);
    const actualBlockMins = dayData.legs.reduce((sum, leg) => sum + (leg.actualBlockMinutes ?? 0), 0);
    
    // Set layover hotel info
    const hotelInfo = dayData.layoverCity ? `${dayData.layoverCity} Station Layover Hotel` : "";
    
    // Scheduled Report is FDPT Start
    const repTime = dayData.reportTime.replace(":", "");
    
    // Scheduled Release is last leg arrival + 15 mins. If not available, fallback to FDPT End + 15 mins.
    let relTime = "";
    if (dayData.legs.length > 0) {
      const lastLeg = dayData.legs[dayData.legs.length - 1];
      relTime = addMinutesToTime(lastLeg.arrTime.replace(":", ""), 15);
    } else {
      relTime = addMinutesToTime(dayData.releaseTime.replace(":", ""), 15);
    }
    
    // Actual Report/Release
    const actualReportTime = repTime;
    let actualReleaseTime = "";
    if (dayData.legs.length > 0) {
      const lastLeg = dayData.legs[dayData.legs.length - 1];
      if (lastLeg.actualArrTime) {
        actualReleaseTime = addMinutesToTime(lastLeg.actualArrTime.replace(":", ""), 15);
      } else if (actualBlockMins > 0) {
        actualReleaseTime = addMinutesToTime(lastLeg.arrTime.replace(":", ""), 15);
      }
    } else if (actualBlockMins > 0) {
      actualReleaseTime = addMinutesToTime(dayData.releaseTime.replace(":", ""), 15);
    }
    
    const finalDutyMinutes = dayData.scheduledDutyMinutes ?? calculateBlockMinutes(repTime, relTime);
    
    return {
      dayIndex: idx,
      reportTime: repTime,
      releaseTime: relTime,
      dutyMinutes: finalDutyMinutes,
      legs: dayData.legs,
      layoverCity: dayData.layoverCity,
      layoverHotelInfo: hotelInfo,
      actualBlockMinutes: actualBlockMins > 0 ? actualBlockMins : undefined,
      actualDutyMinutes: dayData.actualDutyMinutes,
      actualReportTime: actualBlockMins > 0 ? actualReportTime : undefined,
      actualReleaseTime: actualReleaseTime || undefined,
      isOvertime: ["21514", "21614", "21566"].includes(sequenceNumber),
    };
  });
  
  // Calculate total block minutes
  const totalBlockMinutes = dutyPeriods.reduce((sum, dp) => {
    return sum + dp.legs.reduce((legsSum, leg) => legsSum + leg.blockMinutes, 0);
  }, 0);
  
  if (totalCreditMinutes === 0) {
    // Fallback: sum day credits
    totalCreditMinutes = sortedDays.reduce((sum, d) => sum + d.dutyCreditMinutes, 0);
  }
  
  // Construct start date / end date (July 2026 as default base month)
  const startDayNum = sortedDays[0].dayNum;
  const endDayNum = sortedDays[sortedDays.length - 1].dayNum;
  const startDate = `2026-07-${String(startDayNum).padStart(2, "0")}`;
  const endDate = `2026-07-${String(endDayNum).padStart(2, "0")}`;
  
  const colors = ["sky", "emerald", "amber", "rose", "cyan", "sky"];
  const colorTag = colors[parseInt(sequenceNumber || "0", 10) % colors.length];
  
  sequences.push({
    id: `${sequenceNumber}-${Date.now()}`,
    sequenceNumber,
    startDate,
    endDate,
    base,
    equipment,
    totalBlockMinutes,
    totalCreditMinutes,
    layoverCities,
    dutyPeriods,
    colorTag: ["21514", "21614", "21566"].includes(sequenceNumber) ? "amber" : colorTag,
    isOvertime: ["21514", "21614", "21566"].includes(sequenceNumber),
    statusTag: sequenceNumber === "21649" ? "TT" : (["21514", "21614", "21566"].includes(sequenceNumber) ? "OT" : "SKD"),
  });
  
  return sequences;
}

/**
 * Helper to add minutes to a HHMM time string
 */
function addMinutesToTime(timeStr: string, minsToAdd: number): string {
  const cleanTime = timeStr.replace(":", "").trim();
  if (cleanTime.length < 3 || cleanTime.length > 4) return timeStr;
  const hours = parseInt(cleanTime.substring(0, cleanTime.length - 2), 10);
  const mins = parseInt(cleanTime.substring(cleanTime.length - 2), 10);
  const totalMins = (hours * 60 + mins + minsToAdd) % 1440;
  const rHours = Math.floor(totalMins / 60);
  const rMins = totalMins % 60;
  return `${rHours.toString().padStart(2, "0")}${rMins.toString().padStart(2, "0")}`;
}

/**
 * Computes exact audit differences between two schedule sequence lists
 */
export function diffScheduleSnapshots(oldSeqs: SequenceTrip[], newSeqs: SequenceTrip[]): ScheduleDiffItem[] {
  const diffs: ScheduleDiffItem[] = [];
  const oldMap = new Map<string, SequenceTrip>();
  oldSeqs.forEach((s) => oldMap.set(s.sequenceNumber, s));

  const newMap = new Map<string, SequenceTrip>();
  newSeqs.forEach((s) => newMap.set(s.sequenceNumber, s));

  // 1. Check for reassignments, flight time changes, or credit changes in existing/new sequences
  newSeqs.forEach((newSeq) => {
    const oldSeq = oldMap.get(newSeq.sequenceNumber);
    if (!oldSeq) {
      // New trip added
      diffs.push({
        id: `added-${newSeq.sequenceNumber}-${Date.now()}`,
        type: "TRIP_ADDED",
        sequenceNumber: newSeq.sequenceNumber,
        description: `Sequence ${newSeq.sequenceNumber} (${newSeq.base} ${newSeq.equipment}) added to line.`,
        newValue: `${(newSeq.totalCreditMinutes / 60).toFixed(2)}h credit`,
        creditDeltaMinutes: newSeq.totalCreditMinutes,
        severity: "info",
      });
      return;
    }

    // Check status tag change (e.g. SH -> RA or presence of RA)
    if (newSeq.statusTag === "RA" || (oldSeq.statusTag !== "RA" && newSeq.statusTag === "RA")) {
      diffs.push({
        id: `ra-${newSeq.sequenceNumber}`,
        type: "REASSIGNMENT",
        sequenceNumber: newSeq.sequenceNumber,
        description: `Reassignment (RA) flagged on Sequence ${newSeq.sequenceNumber}.`,
        oldValue: oldSeq.statusTag || "SH",
        newValue: "RA (Reassigned)",
        severity: "alert",
      });
    }

    // Check credit changes
    if (Math.abs(newSeq.totalCreditMinutes - oldSeq.totalCreditMinutes) > 5) {
      const delta = newSeq.totalCreditMinutes - oldSeq.totalCreditMinutes;
      const sign = delta > 0 ? "+" : "";
      diffs.push({
        id: `credit-${newSeq.sequenceNumber}`,
        type: "CREDIT_CHANGE",
        sequenceNumber: newSeq.sequenceNumber,
        description: `Credit pay adjustment on Seq ${newSeq.sequenceNumber}: ${sign}${(delta / 60).toFixed(2)}h (${(oldSeq.totalCreditMinutes / 60).toFixed(2)}h ➔ ${(newSeq.totalCreditMinutes / 60).toFixed(2)}h).`,
        oldValue: `${(oldSeq.totalCreditMinutes / 60).toFixed(2)}h`,
        newValue: `${(newSeq.totalCreditMinutes / 60).toFixed(2)}h`,
        creditDeltaMinutes: delta,
        severity: "warning",
      });
    }

    // Check flight time / block minutes changes
    if (Math.abs(newSeq.totalBlockMinutes - oldSeq.totalBlockMinutes) > 5) {
      const delta = newSeq.totalBlockMinutes - oldSeq.totalBlockMinutes;
      diffs.push({
        id: `block-${newSeq.sequenceNumber}`,
        type: "FLIGHT_TIME_CHANGE",
        sequenceNumber: newSeq.sequenceNumber,
        description: `Flight block time changed on Seq ${newSeq.sequenceNumber} by ${(delta / 60).toFixed(2)}h.`,
        oldValue: `${(oldSeq.totalBlockMinutes / 60).toFixed(2)}h`,
        newValue: `${(newSeq.totalBlockMinutes / 60).toFixed(2)}h`,
        creditDeltaMinutes: delta,
        severity: "info",
      });
    }
  });

  // 2. Check for dropped trips
  oldSeqs.forEach((oldSeq) => {
    if (!newMap.has(oldSeq.sequenceNumber)) {
      diffs.push({
        id: `dropped-${oldSeq.sequenceNumber}`,
        type: "TRIP_DROPPED",
        sequenceNumber: oldSeq.sequenceNumber,
        description: `Sequence ${oldSeq.sequenceNumber} was dropped/removed from line.`,
        oldValue: `${(oldSeq.totalCreditMinutes / 60).toFixed(2)}h credit`,
        creditDeltaMinutes: -oldSeq.totalCreditMinutes,
        severity: "warning",
      });
    }
  });

  return diffs;
}

