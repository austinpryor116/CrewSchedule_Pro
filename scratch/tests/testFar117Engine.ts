/**
 * 14 CFR PART 117 TABLE B (FDP) & TABLE A (FLIGHT TIME) ENGINE TEST SUITE
 */

import {
  FAR_117_TABLE_B,
  FAR_117_TABLE_A,
  getMaxFdpHours,
  getMaxFlightTimeHours,
  auditDutyPeriodFdp,
  auditSequenceFdp,
} from "./far117Engine";
import { DutyPeriod, SequenceTrip } from "../types";

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ TEST FAILED: ${msg}`);
    process.exit(1);
  } else {
    console.log(`✅ TEST: [PASS] ${msg}`);
  }
}

console.log("===============================================================");
console.log("✈️ 14 CFR PART 117 TABLE B FDP & TABLE A FLIGHT ENGINE TEST");
console.log("===============================================================\n");

console.log("--- 1. Testing Table B Report Window & Segment Combinations ---");

// Test Case 1: Early morning 0000-0359 window (Max 9.0h regardless of legs)
const fdp_0130_1leg = getMaxFdpHours("0130", 1);
assert(fdp_0130_1leg.maxFdpHours === 9.0, `0130 report with 1 leg = 9.0h FDP (got ${fdp_0130_1leg.maxFdpHours})`);
const fdp_0130_5leg = getMaxFdpHours("0130", 5);
assert(fdp_0130_5leg.maxFdpHours === 9.0, `0130 report with 5 legs = 9.0h FDP (got ${fdp_0130_5leg.maxFdpHours})`);

// Test Case 2: 0500-0559 window
const fdp_0515_2leg = getMaxFdpHours("0515", 2);
assert(fdp_0515_2leg.maxFdpHours === 12.0, `0515 report with 2 legs = 12.0h FDP (got ${fdp_0515_2leg.maxFdpHours})`);
const fdp_0515_6leg = getMaxFdpHours("0515", 6);
assert(fdp_0515_6leg.maxFdpHours === 11.0, `0515 report with 6 legs = 11.0h FDP (got ${fdp_0515_6leg.maxFdpHours})`);

// Test Case 3: Peak day window 0700-1159 (14.0h for 1-2 legs, 13.0h for 3-4 legs, 12.5h for 5 legs, 12.0h for 6 legs, 11.5h for 7+ legs)
const fdp_0730_1leg = getMaxFdpHours("0730", 1);
assert(fdp_0730_1leg.maxFdpHours === 14.0, `0730 report with 1 leg = 14.0h FDP (got ${fdp_0730_1leg.maxFdpHours})`);
const fdp_0730_3leg = getMaxFdpHours("0730", 3);
assert(fdp_0730_3leg.maxFdpHours === 13.0, `0730 report with 3 legs = 13.0h FDP (got ${fdp_0730_3leg.maxFdpHours})`);
const fdp_0730_5leg = getMaxFdpHours("0730", 5);
assert(fdp_0730_5leg.maxFdpHours === 12.5, `0730 report with 5 legs = 12.5h FDP (got ${fdp_0730_5leg.maxFdpHours})`);
const fdp_0730_7leg = getMaxFdpHours("0730", 7);
assert(fdp_0730_7leg.maxFdpHours === 11.5, `0730 report with 7 legs = 11.5h FDP (got ${fdp_0730_7leg.maxFdpHours})`);

// Test Case 4: Late evening 2200-2259 window (11.0h 1-2 legs, 10.0h 3-4 legs, 9.0h 5+ legs)
const fdp_2215_2leg = getMaxFdpHours("2215", 2);
assert(fdp_2215_2leg.maxFdpHours === 11.0, `2215 report with 2 legs = 11.0h FDP (got ${fdp_2215_2leg.maxFdpHours})`);
const fdp_2215_4leg = getMaxFdpHours("2215", 4);
assert(fdp_2215_4leg.maxFdpHours === 10.0, `2215 report with 4 legs = 10.0h FDP (got ${fdp_2215_4leg.maxFdpHours})`);
const fdp_2215_6leg = getMaxFdpHours("2215", 6);
assert(fdp_2215_6leg.maxFdpHours === 9.0, `2215 report with 6 legs = 9.0h FDP (got ${fdp_2215_6leg.maxFdpHours})`);

console.log("\n--- 2. Testing Table A Daily Flight Time Limits ---");
const flt_0300 = getMaxFlightTimeHours("0300");
assert(flt_0300.maxFlightHours === 8.0, `0300 report max flight time = 8.0h (got ${flt_0300.maxFlightHours})`);
const flt_1200 = getMaxFlightTimeHours("1200");
assert(flt_1200.maxFlightHours === 9.0, `1200 report max flight time = 9.0h (got ${flt_1200.maxFlightHours})`);
const flt_2100 = getMaxFlightTimeHours("2100");
assert(flt_2100.maxFlightHours === 8.0, `2100 report max flight time = 8.0h (got ${flt_2100.maxFlightHours})`);

console.log("\n--- 3. Testing DutyPeriod FDP Auditing ---");
const legalDuty: DutyPeriod = {
  dayIndex: 0,
  reportTime: "0700",
  releaseTime: "1530", // 8h 30m duty (510 mins)
  dutyMinutes: 510,
  layoverCity: "DFW",
  layoverHotelInfo: "Grand Hyatt",
  legs: [
    { flightNumber: "AA101", depAirport: "ORD", arrAirport: "CLT", depTime: "0745", arrTime: "1030", blockMinutes: 165 },
    { flightNumber: "AA102", depAirport: "CLT", arrAirport: "DFW", depTime: "1130", arrTime: "1445", blockMinutes: 195 },
  ],
};

const legalAudit = auditDutyPeriodFdp(legalDuty);
assert(legalAudit.isOverallLegal === true, `Legal duty is marked legal (got ${legalAudit.isOverallLegal})`);
assert(legalAudit.maxFdpHours === 14.0, `Table B Max FDP is 14.0h for 0700 report with 2 legs (got ${legalAudit.maxFdpHours})`);
assert(legalAudit.fdpMarginMinutes === 330, `330m (5.5h) margin remaining (got ${legalAudit.fdpMarginMinutes})`);

// Test an Illegal Duty (FDP Exceeded)
const illegalDuty: DutyPeriod = {
  dayIndex: 0,
  reportTime: "2330", // Table B limit for 2300-2359 with 4 legs is 9.0h (540 mins)
  releaseTime: "1030", // 11h 00m duty (660 mins)
  dutyMinutes: 660,
  layoverCity: "MIA",
  layoverHotelInfo: "Airport Marriott",
  legs: [
    { flightNumber: "AA201", depAirport: "ORD", arrAirport: "CLT", depTime: "0015", arrTime: "0230", blockMinutes: 135 },
    { flightNumber: "AA202", depAirport: "CLT", arrAirport: "MIA", depTime: "0315", arrTime: "0530", blockMinutes: 135 },
    { flightNumber: "AA203", depAirport: "MIA", arrAirport: "MCO", depTime: "0615", arrTime: "0730", blockMinutes: 75 },
    { flightNumber: "AA204", depAirport: "MCO", arrAirport: "MIA", depTime: "0815", arrTime: "0945", blockMinutes: 90 },
  ],
};

const illegalAudit = auditDutyPeriodFdp(illegalDuty);
assert(illegalAudit.isFdpLegal === false, `Illegal duty is marked not legal (got isFdpLegal=${illegalAudit.isFdpLegal})`);
assert(illegalAudit.maxFdpHours === 9.0, `Table B max is 9.0h for 2330 report with 4 legs (got ${illegalAudit.maxFdpHours})`);
assert(illegalAudit.fdpMarginMinutes === -120, `Margin is -120m (2 hours exceedance) (got ${illegalAudit.fdpMarginMinutes})`);

console.log("\n===============================================================");
console.log("📊 ALL 14 CFR PART 117 ENGINE TESTS PASSED (16/16)");
console.log("===============================================================");
