/**
 * OFFICIAL PILOT CBA PAY SCALE & DATE OF HIRE (DOH) AUTOMATED LOOKUP TEST
 * Source: Pilot Agreement Section 3, Section 5, Letter 22-06 (Flow), and 750 SIC LOA
 */

import {
  calculateLongevityYears,
  getCbaRatesForProfile,
  calculateNextPayPeriodDate,
  CBA_AIRLINE_PAY_SCALE,
} from "./cbaPayScale";
import { useCrewStore } from "../store/useCrewStore";

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ TEST FAILED: ${msg}`);
    process.exit(1);
  } else {
    console.log(`✅ TEST: [PASS] ${msg}`);
  }
}

console.log("===============================================================");
console.log("✈️ OFFICIAL CBA LONGEVITY, 750 SIC & FLOW TOP-SCALE ENGINE TEST");
console.log("===============================================================\n");

// 1. Test calculateLongevityYears with explicit reference date
const refDate = new Date(2026, 7, 14); // Aug 14, 2026

console.log("--- 1. Testing Longevity Calculations ---");
const lon1 = calculateLongevityYears("2026-01-15", refDate);
assert(lon1.years === 0, `0 completed years for hire in same year (got ${lon1.years})`);
assert(lon1.payStepYear === 1, `Pay step 1 for first year pilot (got ${lon1.payStepYear})`);

const lon5 = calculateLongevityYears("2021-08-14", refDate);
assert(lon5.years === 5, `Exactly 5 completed years (got ${lon5.years})`);
assert(lon5.payStepYear === 6, `Pay step 6 for 5 completed years (got ${lon5.payStepYear})`);

const lon10 = calculateLongevityYears("2016-04-18", refDate);
assert(lon10.years === 10, `10 completed years for 2016 hire (got ${lon10.years})`);
assert(lon10.payStepYear === 11, `Pay step 11 for 10 completed years (got ${lon10.payStepYear})`);

console.log("\n--- 2. Testing Next Pay Period Calculations ---");
const period1 = calculateNextPayPeriodDate("2026-08-14");
assert(period1.nextPeriodDate === "2026-08-16", `Aug 14 qualification starts Aug 16 pay period (got ${period1.nextPeriodDate})`);

const period2 = calculateNextPayPeriodDate("2026-08-20");
assert(period2.nextPeriodDate === "2026-09-01", `Aug 20 qualification starts Sep 01 pay period (got ${period2.nextPeriodDate})`);

console.log("\n--- 3. Testing First Officer 750 SIC Captain Pay Provision ---");
// Standard FO (Year 2) without 750 SIC
const foStandard = getCbaRatesForProfile({
  hireDateStr: "2025-03-01",
  role: "FO",
  hasCompleted750Sic: false,
  referenceDate: refDate,
});
assert(foStandard.hourlyRate === 109.50, `Standard Year 2 FO rate is $109.50/hr (got ${foStandard.hourlyRate})`);
assert(foStandard.is750SicActive === false, `750 SIC is false (got ${foStandard.is750SicActive})`);

// FO (Year 2) who hits 750 SIC before Dec 31, 2026 -> Placed on Captain Pay
const fo750Sic = getCbaRatesForProfile({
  hireDateStr: "2025-03-01",
  role: "FO",
  hasCompleted750Sic: true,
  referenceDate: refDate,
});
assert(fo750Sic.hourlyRate === 165.00, `750 SIC Year 2 FO gets Step 2 Captain rate $165.00/hr (got ${fo750Sic.hourlyRate})`);
assert(fo750Sic.is750SicActive === true, `750 SIC is active (got ${fo750Sic.is750SicActive})`);

console.log("\n--- 4. Testing 5-Year Captain Delayed Flow Top-of-Scale Pay ---");
// Captain with < 5 years (e.g. 3 completed years -> Year 4 Step)
const caJunior = getCbaRatesForProfile({
  hireDateStr: "2023-01-15",
  role: "CA",
  flowStatus: "ACCEPT",
  referenceDate: refDate,
});
assert(caJunior.hourlyRate === 172.50, `Year 4 Captain gets standard Step 4 rate $172.50/hr (got ${caJunior.hourlyRate})`);
assert(caJunior.isFlowTopScaleActive === false, `Under 5 years is not flow top scale (got ${caJunior.isFlowTopScaleActive})`);

// Captain with 5+ years (10 completed years) with Flow Accepted -> Step 20 Top of Scale ($228.75/hr)
const caSeniorFlow = getCbaRatesForProfile({
  hireDateStr: "2016-04-18",
  role: "CA",
  flowStatus: "ACCEPT",
  referenceDate: refDate,
});
assert(caSeniorFlow.hourlyRate === 228.75, `5+ Yr Captain with Flow Accepted gets Step 20 Top of Scale $228.75/hr (got ${caSeniorFlow.hourlyRate})`);
assert(caSeniorFlow.isFlowTopScaleActive === true, `Flow top scale is active (got ${caSeniorFlow.isFlowTopScaleActive})`);

// Captain with 5+ years who declines/bypasses flow -> Reverts to base longevity step pay (Step 11: $198.75/hr)
const caSeniorDecline = getCbaRatesForProfile({
  hireDateStr: "2016-04-18",
  role: "CA",
  flowStatus: "DECLINE",
  referenceDate: refDate,
});
assert(caSeniorDecline.hourlyRate === 198.75, `5+ Yr Captain with Flow Declined reverts to Step 11 rate $198.75/hr (got ${caSeniorDecline.hourlyRate})`);
assert(caSeniorDecline.isFlowTopScaleActive === false, `Flow top scale is inactive when declined (got ${caSeniorDecline.isFlowTopScaleActive})`);
assert(caSeniorDecline.isFlowDeclined === true, `isFlowDeclined flag is true (got ${caSeniorDecline.isFlowDeclined})`);

console.log("\n--- 5. Testing Store Automated Rate Update on Profile State Changes ---");
const store = useCrewStore.getState();

// Case A: Set to FO with 750 SIC
store.updateUserProfile({
  hireDate: "2025-03-01",
  crewRole: "FO",
  hasCompleted750Sic: true,
  sic750DateReached: "2026-08-14",
});
let rates = useCrewStore.getState().payRates;
assert(rates.hourlyRate === 165.00, `Store payRates.hourlyRate auto-updated to 750 SIC Captain pay $165.00 (got ${rates.hourlyRate})`);

// Case B: Set to 5+ Year Captain with Flow Accepted
store.updateUserProfile({
  hireDate: "2016-04-18",
  crewRole: "CA",
  flowStatus: "ACCEPT",
});
rates = useCrewStore.getState().payRates;
assert(rates.hourlyRate === 228.75, `Store payRates.hourlyRate auto-updated to Step 20 Top of Scale $228.75 (got ${rates.hourlyRate})`);

// Case C: 5+ Year Captain declines flow
store.updateUserProfile({
  flowStatus: "DECLINE",
});
rates = useCrewStore.getState().payRates;
assert(rates.hourlyRate === 198.75, `Store payRates.hourlyRate reverted to Step 11 base rate $198.75 (got ${rates.hourlyRate})`);

console.log("\n===============================================================");
console.log("📊 ALL CBA LONGEVITY, 750 SIC & FLOW ENGINE TESTS PASSED (16/16)");
console.log("===============================================================");
