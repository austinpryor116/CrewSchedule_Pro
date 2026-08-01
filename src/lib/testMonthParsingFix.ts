/**
 * MONTH DYNAMIC PARSING TEST SUITE (src/lib/testMonthParsingFix.ts)
 * Verifies that pulling August sequences (e.g. #14731 on Aug 13th) produces 2026-08-13
 * instead of defaulting to July.
 */

import { parseRawSchedule, parseHI1Schedule, detectMonthFromText } from "./parser";

async function runMonthParsingTest() {
  console.log("===============================================================");
  console.log("📅 MONTH DYNAMIC PARSING & DATE FIX TEST");
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

  // 1. TEST detectMonthFromText
  console.log("--- 1. Testing Month Detection Helper ---");
  const augDetect = detectMonthFromText("MONTH ENDING 31AUG26\nSEQ 14731  13 1 ORD");
  assert("Detect AUG from MONTH ENDING", augDetect.monthAbbr === "AUG" && augDetect.monthNum === 7, `Detected: ${augDetect.monthAbbr}`);

  const inlineAugDetect = detectMonthFromText("SEQ 14731  13AUG  ORD  D/P 1 13AUG");
  assert("Detect AUG from inline date 13AUG", inlineAugDetect.monthAbbr === "AUG" && inlineAugDetect.monthNum === 7, `Detected: ${inlineAugDetect.monthAbbr}`);

  // 2. TEST AUGUST FLIGHT #14731 PARSING
  console.log("\n--- 2. Testing Sequence #14731 August Roster Parsing ---");

  const sampleAugHI1 = `
MONTH ENDING 31AUG26
ORD 12345-CA E75E

13 1 14731 -3980 -4275
EXP TAFB 14731 ORD CAE ORD TAFB 28.15
ACT TOTAL 12.30 14.15
`;

  const parsedAugSeqs = parseHI1Schedule(sampleAugHI1);
  assert("Parsed August sequence count > 0", parsedAugSeqs.length > 0);

  if (parsedAugSeqs.length > 0) {
    const seq14731 = parsedAugSeqs[0];
    assert(
      "Sequence #14731 startDate is August 13th (2026-08-13)",
      seq14731.startDate === "2026-08-13",
      `Expected '2026-08-13', got '${seq14731.startDate}'`
    );
  }

  // 3. TEST JULY FLIGHT PARSING FOR COMPARISON
  console.log("\n--- 3. Testing July Roster Parsing Comparison ---");

  const sampleJulHI1 = `
MONTH ENDING 31JUL26
ORD 12345-CA E75E

13 1 17894 -1506 -1858
EXP TAFB 17894 ORD DTW ORD TAFB 24.15
ACT TOTAL 10.30 12.15
`;

  const parsedJulSeqs = parseHI1Schedule(sampleJulHI1);
  if (parsedJulSeqs.length > 0) {
    const seq17894 = parsedJulSeqs[0];
    assert(
      "July Sequence #17894 startDate is July 13th (2026-07-13)",
      seq17894.startDate === "2026-07-13",
      `Expected '2026-07-13', got '${seq17894.startDate}'`
    );
  }

  console.log("\n===============================================================");
  console.log(`📊 FINAL TEST RESULTS: ${passed}/${total} PASSED, ${failed} FAILED`);
  console.log("===============================================================\n");

  if (failed > 0) process.exit(1);
}

runMonthParsingTest().catch((err) => {
  console.error("Month parsing test error:", err);
  process.exit(1);
});
