/**
 * FULL SCRAPER TEST SUITE (src/lib/testScraperFull.ts)
 * Exhaustively tests the Canvas Interceptor, Buffer Flushing, and CanvasBufferDecoder.
 */

import { CANVAS_INTERCEPTOR_SCRIPT } from "./canvasInterceptor";
import { CanvasBufferDecoder, CanvasCharacter, CanvasBuffer } from "./canvasDecoder";
import { executeCommand, waitForTerminalResponse } from "./macroEngine";
import { PFKeyMacroBuilder } from "./decsDictionary";

// Setup global mock DOM environment for Node testing if needed
if (typeof window === "undefined") {
  const globalAny: any = global;
  globalAny.window = globalAny;
  
  // Mock CanvasRenderingContext2D prototype
  function MockCanvasContext() {}
  MockCanvasContext.prototype.fillText = function(text: any, x: number, y: number, maxWidth?: number) {
    // Native canvas mock
  };
  globalAny.CanvasRenderingContext2D = MockCanvasContext;
}

async function runFullScraperTest() {
  console.log("===============================================================");
  console.log("🔥 FULL CANVAS SCRAPER ENGINE TEST SUITE");
  console.log("===============================================================\n");

  let totalTests = 0;
  let passed = 0;
  let failed = 0;

  function assertTest(name: string, condition: boolean, details?: string) {
    totalTests++;
    if (condition) {
      console.log(`✅ TEST ${totalTests}: [PASS] ${name}`);
      if (details) console.log(`   └─ ${details}`);
      passed++;
    } else {
      console.error(`❌ TEST ${totalTests}: [FAIL] ${name}`);
      if (details) console.error(`   └─ ${details}`);
      failed++;
    }
  }

  // 1. INJECT INTERCEPTOR SCRIPT
  console.log("--- 1. Injecting Canvas Interceptor Script into Environment ---");
  try {
    eval(CANVAS_INTERCEPTOR_SCRIPT);
    assertTest("Canvas Interceptor Script evaluation", typeof (window as any)._flushSabreBuffer === "function");
  } catch (err: any) {
    assertTest("Canvas Interceptor Script evaluation", false, err.message);
  }

  // 2. SIMULATE CANVAS FILLTEXT CALLS (WebSabre HI1 Screen Simulation)
  console.log("\n--- 2. Simulating Real WebSabre Canvas Rendering ---");

  const mockCtx = new (window as any).CanvasRenderingContext2D();
  mockCtx.font = "14px monospace";
  mockCtx.fillStyle = "#4ade80";

  // Render Line 1 (Header with reverse video black background)
  mockCtx.fillStyle = "#000000";
  mockCtx.fillText("HI1", 10, 24);

  // Render Line 2 (Trip Summary)
  mockCtx.fillStyle = "#4ade80";
  mockCtx.fillText("SEQ 17894  BASE ORD  SEL 502  ORG SCH DOM E75", 10, 44);

  // Render Line 3 (Duty Period 1)
  mockCtx.fillText("D/P 1  27JUL  ORD 1506 DTW 1741  DTW 1811 ORD 1858  ORD 2014 CAE 2319", 10, 64);

  // Render Line 4 (Layover Info in Amber with Italic Blink)
  mockCtx.font = "italic 14px monospace";
  mockCtx.fillStyle = "#fbbf24";
  mockCtx.fillText("LAYOVER CAE  Courtyard Columbia Downtown  TEL 803-799-7800", 10, 84);

  // 3. FLUSH BUFFER & CHECK CAPTURED 2D JSON ARRAY
  console.log("\n--- 3. Flushing Captured Canvas Buffer ---");
  const capturedBuffer: CanvasBuffer = (window as any)._flushSabreBuffer();

  assertTest(
    "Buffer capture length check",
    Array.isArray(capturedBuffer) && capturedBuffer.length >= 4,
    `Captured ${capturedBuffer?.length || 0} rows in 2D array`
  );

  // Verify Buffer Cleared after Flush
  const secondaryFlush = (window as any)._flushSabreBuffer();
  assertTest("Buffer auto-reset after flush", Array.isArray(secondaryFlush) && secondaryFlush.length === 0);

  // 4. DECODE CAPTURED BUFFER
  console.log("\n--- 4. Decoding Canvas Buffer via CanvasBufferDecoder ---");
  const decodedText = CanvasBufferDecoder.decode(capturedBuffer);

  console.log("\n--- DECODED TERMINAL SCREEN OUTPUT ---");
  console.log(decodedText);
  console.log("--------------------------------------\n");

  assertTest("Decoded text contains 'HI1'", decodedText.includes("HI1"));
  assertTest("Decoded text contains 'SEQ 17894'", decodedText.includes("SEQ 17894"));
  assertTest("Decoded text contains 'LAYOVER CAE'", decodedText.includes("LAYOVER CAE"));
  assertTest("Decoded text preserves line breaks (4 lines)", decodedText.split("\n").length === 4);

  // 5. TEST ATTRIBUTE SCRAPING (Reverse Video & Blink/Italic Detection)
  console.log("\n--- 5. Testing Character Attribute Extraction ---");
  const row0Char0 = capturedBuffer[1]?.[1]; // 'H' of HI1
  const row3Char0 = capturedBuffer[4]?.[1]; // 'L' of LAYOVER CAE

  assertTest(
    "Reverse attribute detection",
    row0Char0?.attr?.reverse === true,
    `Reverse flag on header char: ${row0Char0?.attr?.reverse}`
  );
  assertTest(
    "Blink/Italic attribute detection",
    row3Char0?.attr?.blink === true,
    `Blink/Italic flag on layover char: ${row3Char0?.attr?.blink}`
  );

  // 6. TEST EDGE CASES (Empty fills, trailing spaces, null text, rapid consecutive fills)
  console.log("\n--- 6. Testing Edge Cases & Robustness ---");
  mockCtx.font = "14px monospace";
  mockCtx.fillStyle = "#ffffff";
  mockCtx.fillText("", 10, 100);
  mockCtx.fillText("   ", 10, 120);
  mockCtx.fillText("EDGE CASE TEST  ", 10, 140);

  const edgeBuffer = (window as any)._flushSabreBuffer();
  const edgeDecoded = CanvasBufferDecoder.decode(edgeBuffer);

  assertTest(
    "Trailing whitespace trimming on rows",
    edgeDecoded === "EDGE CASE TEST",
    `Expected 'EDGE CASE TEST', got '${edgeDecoded}'`
  );

  // SUMMARY
  console.log("\n===============================================================");
  console.log(`📊 FINAL SCRAPER TEST SUMMARY: ${passed}/${totalTests} PASSED, ${failed} FAILED`);
  console.log("===============================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runFullScraperTest().catch((err) => {
  console.error("Scraper full test error:", err);
  process.exit(1);
});
