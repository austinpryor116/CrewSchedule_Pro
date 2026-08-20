/**
 * LOGBOOK PIC/SIC DETERMINATION TEST SUITE (src/lib/testLogbookPicFix.ts)
 * Verifies that Captain rank (from HSS, HI1, or user profile) correctly populates
 * PIC hours instead of defaulting to SIC.
 */

import { isCaptainRank } from "./parser";
import { useCrewStore } from "../store/useCrewStore";

async function runLogbookTest() {
  console.log("===============================================================");
  console.log("✈️ LOGBOOK PIC VS SIC CALCULATION TEST");
  console.log("===============================================================\n");

  let total = 0;
  let passed = 0;
  let failed = 0;

  function assert(name: string, condition: boolean, detail?: string) {
    total++;
    if (condition) {
      console.log(`✅ TEST ${total}: [PASS] ${name}`);
      if (detail) console.log(`   └─ ${detail}`);
      passed++;
    } else {
      console.error(`❌ TEST ${total}: [FAIL] ${name}`);
      if (detail) console.error(`   └─ ${detail}`);
      failed++;
    }
  }

  // 1. TEST isCaptainRank Helper
  console.log("--- 1. Testing isCaptainRank Helper ---");
  assert("isCaptainRank('CAPT') is true", isCaptainRank("CAPT") === true);
  assert("isCaptainRank('CA') is true", isCaptainRank("CA") === true);
  assert("isCaptainRank('Captain') is true", isCaptainRank("Captain") === true);
  assert("isCaptainRank('CHECK_PILOT') is true", isCaptainRank("CHECK_PILOT") === true);
  assert("isCaptainRank('FO') is false", isCaptainRank("FO") === false);
  assert("isCaptainRank('First Officer') is false", isCaptainRank("First Officer") === false);
  assert("isCaptainRank('SIC') is false", isCaptainRank("SIC") === false);
  assert("isCaptainRank(undefined) defaults to true (Captain)", isCaptainRank(undefined) === true);

  // 2. TEST Store autoGenerateLogbookFromRoster with Captain Profile
  console.log("\n--- 2. Testing Store autoGenerateLogbookFromRoster as Captain ---");

  const store = useCrewStore.getState();
  
  // Set user role to Captain (CA)
  store.setPayRates({ crewRole: "CA" });
  
  // Set sample sequence
  store.setSequences([
    {
      id: "seq-test-14731",
      sequenceNumber: "14731",
      startDate: "2026-08-13",
      endDate: "2026-08-14",
      base: "ORD",
      equipment: "E75",
      rank: "CAPT",
      totalBlockMinutes: 180,
      totalCreditMinutes: 240,
      layoverCities: ["FAR"],
      dutyPeriods: [
        {
          dayIndex: 0,
          reportTime: "07:15",
          releaseTime: "12:00",
          dutyMinutes: 285,
          layoverCity: "FAR",
          layoverHotelInfo: "FAR Layover Hotel",
          legs: [
            {
              flightNumber: "AA3602",
              depAirport: "ORD",
              arrAirport: "FAR",
              depTime: "08:00",
              arrTime: "09:30",
              blockMinutes: 90,
              isDeadhead: false,
              isOvertime: false,
              isCancelled: false,
            },
            {
              flightNumber: "AA3484",
              depAirport: "FAR",
              arrAirport: "ORD",
              depTime: "10:00",
              arrTime: "11:30",
              blockMinutes: 90,
              isDeadhead: false,
              isOvertime: false,
              isCancelled: false,
            }
          ]
        }
      ],
      colorTag: "sky",
      statusTag: "SKD"
    }
  ]);

  store.autoGenerateLogbookFromRoster();

  const entries = useCrewStore.getState().logbookEntries;
  assert("Logbook entries generated > 0", entries.length > 0, `Generated ${entries.length} entries`);

  const leg1 = entries.find((e) => e.flightNumber === "AA3602");
  assert("Leg AA3602 exists", !!leg1);
  if (leg1) {
    assert("Leg AA3602 picMinutes is 90", leg1.picMinutes === 90, `Expected 90, got ${leg1.picMinutes}`);
    assert("Leg AA3602 sicMinutes is 0", leg1.sicMinutes === 0, `Expected 0, got ${leg1.sicMinutes}`);
  }

  // 3. TEST Dynamic Switch to First Officer (FO)
  console.log("\n--- 3. Testing Dynamic Switch to FO Role ---");
  store.setPayRates({ crewRole: "FO" });
  
  // Set sequence without explicit sequence rank override to test profile fallback
  store.setSequences([
    {
      ...useCrewStore.getState().sequences[0],
      rank: undefined, // no HSS override, rely on profile role
    }
  ]);
  store.autoGenerateLogbookFromRoster();

  const foEntries = useCrewStore.getState().logbookEntries;
  const foLeg1 = foEntries.find((e) => e.flightNumber === "AA3602");
  if (foLeg1) {
    assert("FO Leg AA3602 picMinutes is 0", foLeg1.picMinutes === 0, `Expected 0, got ${foLeg1.picMinutes}`);
    assert("FO Leg AA3602 sicMinutes is 90", foLeg1.sicMinutes === 90, `Expected 90, got ${foLeg1.sicMinutes}`);
  }

  // 4. TEST Dynamic Switch back to Captain (CA)
  console.log("\n--- 4. Testing Dynamic Switch back to CA Role ---");
  store.setPayRates({ crewRole: "CA" });
  const caEntries = useCrewStore.getState().logbookEntries;
  const caLeg1 = caEntries.find((e) => e.flightNumber === "AA3602");
  if (caLeg1) {
    assert("CA Leg AA3602 picMinutes recalculated to 90", caLeg1.picMinutes === 90, `Expected 90, got ${caLeg1.picMinutes}`);
    assert("CA Leg AA3602 sicMinutes recalculated to 0", caLeg1.sicMinutes === 0, `Expected 0, got ${caLeg1.sicMinutes}`);
  }

  console.log("\n===============================================================");
  console.log(`📊 FINAL TEST RESULTS: ${passed}/${total} PASSED, ${failed} FAILED`);
  console.log("===============================================================\n");

  if (failed > 0) process.exit(1);
}

runLogbookTest().catch((err) => {
  console.error("Logbook test error:", err);
  process.exit(1);
});
