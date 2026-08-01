/**
 * CANVAS ENGINE UNIT & INTEGRATION TEST SCRIPT
 * Tests canvasInterceptor, canvasDecoder, macroEngine, and decsDictionary end-to-end.
 */

import { CANVAS_INTERCEPTOR_SCRIPT } from "./canvasInterceptor";
import { CanvasBufferDecoder, CanvasCharacter, CanvasBuffer } from "./canvasDecoder";
import { executeCommand, waitForTerminalResponse } from "./macroEngine";
import { PFKeyMacroBuilder } from "./decsDictionary";

async function runTests() {
  console.log("==================================================");
  console.log("🧪 STARTING WEB SABRE CANVAS ENGINE INTEGRATION TESTS");
  console.log("==================================================\n");

  let passedCount = 0;
  let failedCount = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      if (detail) console.log(`   └─ ${detail}`);
      passedCount++;
    } else {
      console.error(`❌ [FAIL] ${testName}`);
      if (detail) console.error(`   └─ ${detail}`);
      failedCount++;
    }
  }

  // TEST 1: PFKeyMacroBuilder Methods
  console.log("--- TEST SUITE 1: DECS Dictionary & PFKeyMacroBuilder ---");
  const fitCmd = PFKeyMacroBuilder.fitForDuty("17894", "27JUL", "ORD");
  assert(fitCmd === "HIFIT/17894/27JUL/ORD", "fitForDuty macro builder", `Result: ${fitCmd}`);

  const tradeCmd = PFKeyMacroBuilder.tripTrade("17270", "27JUL", "17894", "27JUL", "CA");
  assert(
    tradeCmd === "HIY^EHT^EHTS/A/17270/27JUL^EHTS/B/17894/27JUL/CA^EHTMD^EHZ^EHIN^E",
    "tripTrade macro builder",
    `Result: ${tradeCmd}`
  );

  const otCmd = PFKeyMacroBuilder.openTimePickup("21510", "29JUL", "FO");
  assert(
    otCmd === "HIY^EHT^EHTO/B/21510/29JUL/FO^EHTMD^EHZ^EHIN^E",
    "openTimePickup macro builder",
    `Result: ${otCmd}`
  );

  const pullCurrent = PFKeyMacroBuilder.pullSchedule("CURRENT");
  const pullNext = PFKeyMacroBuilder.pullSchedule("NEXT");
  assert(pullCurrent === "HI1" && pullNext === "HI2", "pullSchedule macro builder", `HI1=${pullCurrent}, HI2=${pullNext}`);

  // TEST 2: CanvasBufferDecoder
  console.log("\n--- TEST SUITE 2: Canvas Buffer Decoder ---");
  const mockBuffer: CanvasBuffer = [
    [
      { chr: "H", col: 0, row: 0 },
      { chr: "I", col: 1, row: 0 },
      { chr: "1", col: 2, row: 0, CR: true },
    ],
    [
      { chr: "S", col: 0, row: 1 },
      { chr: "E", col: 1, row: 1 },
      { chr: "Q", col: 2, row: 1 },
      { chr: " ", col: 3, row: 1 },
      { chr: "1", col: 4, row: 1 },
      { chr: "7", col: 5, row: 1 },
      { chr: "8", col: 6, row: 1 },
      { chr: "9", col: 7, row: 1 },
      { chr: "4", col: 8, row: 1, CR: true },
    ],
  ];

  const decodedText = CanvasBufferDecoder.decode(mockBuffer);
  const expectedText = "HI1\nSEQ 17894";
  assert(decodedText === expectedText, "CanvasBufferDecoder flat text decoding", `Decoded:\n${decodedText}`);

  // TEST 3: Interceptor Script Evaluation & Execution
  console.log("\n--- TEST SUITE 3: Canvas Interceptor Script & Buffer Flush ---");
  assert(typeof CANVAS_INTERCEPTOR_SCRIPT === "string" && CANVAS_INTERCEPTOR_SCRIPT.includes("_flushSabreBuffer"), "CANVAS_INTERCEPTOR_SCRIPT structure check");

  // TEST 4: End-to-End Macro Engine Step Execution with Simulated Canvas Buffer
  console.log("\n--- TEST SUITE 4: Async Macro Engine & Smart Listener ---");
  let simulatedStep = 0;
  const simulatedResponses: CanvasBuffer[] = [
    [
      [{ chr: "H", col: 0, row: 0 }, { chr: "I", col: 1, row: 0 }, { chr: "1", col: 2, row: 0, CR: true }],
      [{ chr: "O", col: 0, row: 1 }, { chr: "R", col: 1, row: 1 }, { chr: "D", col: 2, row: 1 }, { chr: " ", col: 3, row: 1 }, { chr: "E", col: 4, row: 1 }, { chr: "7", col: 5, row: 1 }, { chr: "5", col: 6, row: 1, CR: true }]
    ]
  ];

  const macroResult = await executeCommand("HI1", {
    timeoutMs: 2000,
    pollIntervalMs: 50,
    executor: {
      sendInput: async (cmd: string) => {
        console.log(`   [Simulated Input Inject]: "${cmd}"`);
      },
      flushBuffer: async () => {
        return simulatedResponses[0];
      }
    }
  });

  assert(macroResult.includes("HI1") && macroResult.includes("ORD E75"), "MacroEngine end-to-end execution & decoding", `Output:\n${macroResult}`);

  console.log("\n==================================================");
  console.log(`📊 TEST RESULTS: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log("==================================================");

  if (failedCount > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Test execution error:", err);
  process.exit(1);
});
