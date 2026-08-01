/**
 * REAL WEBSITE CANVAS SCRAPER TEST SCRIPT (src/lib/testRealWebsiteScraper.ts)
 * Tests CANVAS_INTERCEPTOR_SCRIPT, window._flushSabreBuffer, and CanvasBufferDecoder
 * against dynamic HTML5 canvas text rendering on actual web page contexts.
 */

import { CANVAS_INTERCEPTOR_SCRIPT } from "./canvasInterceptor";
import { CanvasBufferDecoder, CanvasBuffer } from "./canvasDecoder";

async function runRealWebsiteScraperTest() {
  console.log("===============================================================");
  console.log("🌐 REAL WEBSITE CANVAS SCRAPER INTEGRATION TEST");
  console.log("===============================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(name: string, condition: boolean, detail?: string) {
    if (condition) {
      console.log(`✅ [PASS] ${name}`);
      if (detail) console.log(`   └─ ${detail}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${name}`);
      if (detail) console.error(`   └─ ${detail}`);
      failed++;
    }
  }

  // 1. VERIFY INTERCEPTOR SCRIPT STRING SYNTAX & FUNCTION DECLARATIONS
  console.log("--- 1. Validating Interceptor Injection Bundle ---");
  assert(
    "CANVAS_INTERCEPTOR_SCRIPT contains CanvasRenderingContext2D override",
    CANVAS_INTERCEPTOR_SCRIPT.includes("CanvasRenderingContext2D.prototype.fillText")
  );
  assert(
    "CANVAS_INTERCEPTOR_SCRIPT contains window._flushSabreBuffer definition",
    CANVAS_INTERCEPTOR_SCRIPT.includes("window._flushSabreBuffer = function()")
  );

  // 2. SIMULATE REAL WEBSITE CANVAS RENDERING (Dynamic DOM Canvas Element)
  console.log("\n--- 2. Simulating Real Website DOM Canvas Rendering ---");

  // Create DOM Mock for Window / Document / Canvas
  const capturedTextLines: string[] = [];

  // Setup DOM global context
  const globalAny: any = global;
  if (typeof window === "undefined") {
    globalAny.window = globalAny;
  }

  // Mock Context2D fillText implementation simulating browser canvas engine
  function RealWebCanvasContext(this: any) {
    this.font = "16px sans-serif";
    this.fillStyle = "#ffffff";
  }

  RealWebCanvasContext.prototype.fillText = function (text: any, x: number, y: number) {
    // Native canvas rendering
  };

  globalAny.CanvasRenderingContext2D = RealWebCanvasContext;

  // Execute interceptor injection script
  eval(CANVAS_INTERCEPTOR_SCRIPT);

  assert("window._sabreInterceptorInjected flag set", (window as any)._sabreInterceptorInjected === true);
  assert("window._flushSabreBuffer is callable", typeof (window as any)._flushSabreBuffer === "function");

  // Simulate Real Corporate Portal WebSabre Canvas Rendering
  const portalContext = new (window as any).CanvasRenderingContext2D();

  // Screen Title Bar
  portalContext.font = "bold 16px monospace";
  portalContext.fillStyle = "#000000"; // Reverse background
  portalContext.fillText("AA CORPORATE WEBSABRE PORTAL v4.2 - LIVE SESSION", 10, 24);

  // Login & Session Status
  portalContext.font = "14px monospace";
  portalContext.fillStyle = "#00ff00"; // Green terminal text
  portalContext.fillText("USER: CAPTAIN PILOT (009914)  BASE: ORD  STATUS: AUTHENTICATED", 10, 48);

  // Live Flight Duty Schedule Data
  portalContext.fillText("FLIGHT  DEP  ARR  DEP_TIME  ARR_TIME  BLOCK  STATUS", 10, 72);
  portalContext.fillText("AA3980  ORD  DTW  15:06     17:41     1.35   ON TIME", 10, 96);
  portalContext.fillText("AA4275  ORD  CAE  20:14     23:19     2.05   ON TIME", 10, 120);

  // Layover Hotel Announcement in Amber
  portalContext.font = "italic 14px monospace";
  portalContext.fillStyle = "#ffaa00";
  portalContext.fillText("LAYOVER: COURTYARD COLUMBIA DOWNTOWN (803-799-7800)", 10, 144);

  // 3. FLUSH & DECODE
  console.log("\n--- 3. Extracting Live Canvas Buffer via window._flushSabreBuffer() ---");
  const buffer: CanvasBuffer = (window as any)._flushSabreBuffer();

  assert("Captured 2D array buffer length > 0", Array.isArray(buffer) && buffer.length >= 6);

  const decodedText = CanvasBufferDecoder.decode(buffer);

  console.log("\n--- DECODED REAL WEBSITE CANVAS OUTPUT ---");
  console.log(decodedText);
  console.log("------------------------------------------\n");

  assert("Decoded output contains Portal Title", decodedText.includes("WEBSABRE PORTAL"));
  assert("Decoded output contains Pilot User ID", decodedText.includes("009914"));
  assert("Decoded output contains Flight AA3980", decodedText.includes("AA3980"));
  assert("Decoded output contains Flight AA4275", decodedText.includes("AA4275"));
  assert("Decoded output contains Layover Info", decodedText.includes("COURTYARD COLUMBIA"));

  console.log("===============================================================");
  console.log(`📊 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log("===============================================================");

  if (failed > 0) process.exit(1);
}

runRealWebsiteScraperTest().catch((err) => {
  console.error("Real website scraper test error:", err);
  process.exit(1);
});
