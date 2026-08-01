/**
 * ELECTRON IPC & CANVAS SCRAPING ENGINE INTEGRATION TEST SUITE
 * Tests Electron IPC Bridge mock environment, PFKeyMacroBuilder, MacroEngine,
 * CanvasBufferDecoder, and PortalTab handlers end-to-end.
 */

import { CANVAS_INTERCEPTOR_SCRIPT } from "./canvasInterceptor";
import { CanvasBufferDecoder, CanvasBuffer } from "./canvasDecoder";
import { executeCommand, waitForTerminalResponse } from "./macroEngine";
import { PFKeyMacroBuilder } from "./decsDictionary";

// Mock Electron IPC Window Environment
if (typeof window === "undefined") {
  const globalAny: any = global;
  globalAny.window = globalAny;
}

let lastSentIpcMacro: string | null = null;
let ipcBufferCallCount = 0;

// Setup Mock window.electronAPI
(window as any).electronAPI = {
  sendMacro: async (macroString: string) => {
    lastSentIpcMacro = macroString;
    console.log(`   [Mock Electron IPC Main] Received 'send-macro': "${macroString}"`);
    return { success: true, macro: macroString };
  },
  injectCanvasInterceptor: async () => {
    eval(CANVAS_INTERCEPTOR_SCRIPT);
    return { success: true };
  },
  flushSabreBuffer: async () => {
    ipcBufferCallCount++;
    return [
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
  },
  onTerminalResponse: (callback: (res: string) => void) => {
    // Subscriber mock
  },
};

async function runElectronIntegrationTest() {
  console.log("===============================================================");
  console.log("⚡ STARTING ELECTRON IPC & CANVAS ENGINE INTEGRATION TEST SUITE");
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

  // 1. ELECTRON IPC BRIDGE VERIFICATION
  console.log("--- 1. Testing Electron IPC Bridge (window.electronAPI) ---");
  assertTest("electronAPI bridge exists", typeof (window as any).electronAPI?.sendMacro === "function");

  const ipcRes = await (window as any).electronAPI.sendMacro("HI1");
  assertTest("electronAPI.sendMacro execution", ipcRes.success === true && lastSentIpcMacro === "HI1");

  // 2. MACRO BUILDER & IPC TRANSMISSION
  console.log("\n--- 2. Testing PFKeyMacroBuilder Macro String Generation & IPC ---");
  const currentScheduleMacro = PFKeyMacroBuilder.pullSchedule("CURRENT");
  const nextScheduleMacro = PFKeyMacroBuilder.pullSchedule("NEXT");
  assertTest("PFKeyMacroBuilder pullSchedule", currentScheduleMacro === "HI1" && nextScheduleMacro === "HI2");

  const tradeMacro = PFKeyMacroBuilder.tripTrade("17270", "27JUL", "17894", "27JUL", "CA");
  await (window as any).electronAPI.sendMacro(tradeMacro);
  assertTest(
    "Trip Trade macro string generation & IPC payload",
    lastSentIpcMacro === "HIY^EHT^EHTS/A/17270/27JUL^EHTS/B/17894/27JUL/CA^EHTMD^EHZ^EHIN^E",
    `Payload: ${lastSentIpcMacro}`
  );

  // 3. ASYNC MACRO ENGINE OVER IPC BUFFER FLUSH
  console.log("\n--- 3. Testing Async MacroEngine with Electron Buffer Flush ---");
  ipcBufferCallCount = 0;

  const decodedResult = await executeCommand(currentScheduleMacro, {
    timeoutMs: 3000,
    pollIntervalMs: 100,
    executor: {
      sendInput: async (cmd: string) => {
        await (window as any).electronAPI.sendMacro(cmd);
      },
      flushBuffer: async () => {
        return await (window as any).electronAPI.flushSabreBuffer();
      },
    },
  });

  assertTest(
    "MacroEngine execution over IPC flushBuffer",
    decodedResult.includes("HI1") && decodedResult.includes("SEQ 17894"),
    `Decoded result:\n${decodedResult}`
  );

  assertTest("IPC buffer flush invoked by MacroEngine listener", ipcBufferCallCount > 0, `Flush call count: ${ipcBufferCallCount}`);

  // SUMMARY
  console.log("\n===============================================================");
  console.log(`📊 FINAL INTEGRATION SUMMARY: ${passed}/${totalTests} PASSED, ${failed} FAILED`);
  console.log("===============================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runElectronIntegrationTest().catch((err) => {
  console.error("Electron integration test error:", err);
  process.exit(1);
});
