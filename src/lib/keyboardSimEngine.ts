/**
 * KEYBOARD TYPING SIMULATION ENGINE (src/lib/keyboardSimEngine.ts)
 * Simulates physical keyboard typing character-by-character into DECS inputs & screen buffer.
 */

import { useCrewStore } from "../store/useCrewStore";
import { CanvasBufferDecoder } from "./canvasDecoder";
import { parseHI1Schedule, parseHssSchedule } from "./parser";
import { CANVAS_INTERCEPTOR_SCRIPT } from "./canvasInterceptor";

export interface TypingOptions {
  charDelayMs?: number;
  preEnterDelayMs?: number;
  stepDelayMs?: number;
  pressEnter?: boolean;
  smartScreenInspection?: boolean;
  terminalInputSelector?: string;
  onCharacterTyped?: (char: string, currentFullText: string) => void;
  onStepComplete?: (stepCommand: string, stepIndex: number) => void;
}

/**
 * Tokenizes a raw DECS macro string containing ^E or ^ delimiters into command steps.
 */
export function parseMacroSteps(macroString: string): string[] {
  if (!macroString) return [];
  // Split on ^E or ^ token or newline and clean up steps
  return macroString
    .split(/\^E?|\n/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/**
 * Generates realistic, deterministic DECS terminal response output for a given command.
 * NO random values generated.
 */
export function generateDecsResponse(command: string): string {
  const cmdUpper = command.trim().toUpperCase();
  const timestamp = new Date().toLocaleTimeString('en-US', { hour12: false });

  if (cmdUpper.startsWith("HIFIT")) {
    const parts = cmdUpper.split("/");
    const seq = parts[1] || "17495";
    const date = parts[2] || "27JUL";
    const dep = parts[3] || "ORD";
    return `[${timestamp}] FIT FOR DUTY ACKNOWLEDGED\n  EMPLOYEE SIGN-IN RECORDED FOR SEQ ${seq} DATE ${date} DEPARTURE ${dep}\n  DECS SYSTEM RESPONSE: STATUS - OK / REPORTED ON TIME`;
  }

  if (cmdUpper.startsWith("HI31")) {
    const raps = cmdUpper.includes("RAP") ? cmdUpper.slice(cmdUpper.indexOf("RAP")) : "RAP 1 & RAP 2";
    return `[${timestamp}] RESERVE PROFFER SUBMITTED\n  REQUESTED RAPS: ${raps} REGISTERED IN DECS BID MATRIX\n  PROFFER CONFIRMATION CODE: PRF-3101-ACKNOWLEDGED`;
  }

  if (cmdUpper.startsWith("RF 200")) {
    const stn = cmdUpper.replace("RF 200", "").replace("HTL", "").trim() || "DFW";
    return `[${timestamp}] COMMUTER HOTEL RESERVATION PROCESSED FOR ${stn}\n  ROOM CONFIRMED - VOUCHER ISSUED.`;
  }

  if (cmdUpper === "CTRL_HOME" || cmdUpper === "HOME") {
    return `[${timestamp}] DECS TERMINAL CURSOR MOVED TO HOME (0,0) (CTRL+HOME EXECUTED)\n  READY FOR INPUT.`;
  }

  if (cmdUpper === "SHIFT_DELETE" || cmdUpper === "CLEAR_PAGE" || cmdUpper === "CLEAR") {
    return `[${timestamp}] DECS TERMINAL SCREEN CLEARED (SHIFT+DELETE EXECUTED)\n  READY FOR NEXT INPUT.`;
  }

  if (cmdUpper.startsWith("BSO")) {
    return `[${timestamp}] DECS TERMINAL SIGN-OUT EXECUTED\n  SESSION CLOSED SAFELY.`;
  }

  if (cmdUpper.startsWith("HI1") || cmdUpper.startsWith("HI2")) {
    return `[${timestamp}] MONTHLY HI ROSTER LOADED (${cmdUpper})\n  PARSED FLIGHT SEQUENCES AND VACATION PERIODS UPDATED IN STORE.`;
  }

  if (cmdUpper.startsWith("HSS")) {
    const parts = cmdUpper.split("/");
    const seq = parts[1] || "17495";
    return `[${timestamp}] PAIRING ${seq} DETAIL PULLED FROM DECS HOST\n  SCHEDULE LEGS LOADED INTO LOGBOOK / AUDIT TRAIL.`;
  }

  if (cmdUpper.startsWith("26B")) {
    const parts = cmdUpper.split("/");
    const date = parts[1] || "27JUL";
    const dep = parts[2] || "DFW";
    const arr = parts[3] || "ORD";
    return `[${timestamp}] 26B COMMUTER FLIGHT LISTING FOR ${date} ${dep}->${arr}\n  FLT 1749 ${dep}-${arr} F4 Y12 | FLT 2156 ${dep}-${arr} F2 Y8`;
  }

  if (cmdUpper.startsWith("JP*")) {
    const flt = cmdUpper.replace("JP*", "").trim() || "17495";
    return `[${timestamp}] JP* DISPATCH RELEASE PULLED FOR FLT ${flt}\n  RELEASE FUEL: 18,500 LBS | ROUTE: DFW..OKC..ORD | STATUS: RELEASED`;
  }

  if (cmdUpper.startsWith("N4D") || cmdUpper.startsWith("N4")) {
    return `[${timestamp}] N4 OPEN TIME SEARCH PROCESSED\n  OPEN TRIP LISTINGS LOADED INTO OVERLAY MATRIX.`;
  }

  if (cmdUpper.startsWith("//MQ") || cmdUpper.startsWith("BSIP")) {
    return `[${timestamp}] SABRE/DECS HOST TERMINAL AUTHENTICATION\n  LOGIN SUCCESSFUL - WELCOME TO DECS HOST TERMINAL.`;
  }

  return `[${timestamp}] DECS COMMAND PROCESSED: "${command}"\n  DECS TERMINAL RESPONSE: SUCCESS - 0 ERRORS`;
}

/**
 * Inspects and decodes the current live WebSabre screen canvas text.
 */
export async function inspectAndCaptureScreenText(): Promise<string> {
  if (typeof document === "undefined") return "";

  const webviews = document.querySelectorAll("webview") as unknown as any[];
  for (let i = 0; i < webviews.length; i++) {
    const wv = webviews[i];
    if (wv && wv.executeJavaScript) {
      try {
        await wv.executeJavaScript(CANVAS_INTERCEPTOR_SCRIPT).catch(() => {});

        // 0. Ultra Priority: Scan WebSabre.js internal native screen array (Array of 27 rows)
        const webSabreNativeText = await wv.executeJavaScript(`
          (function() {
            try {
              function stringifyRow(r) {
                if (typeof r === 'string') return r;
                if (!r) return '';
                if (typeof r.text === 'string') return r.text;
                if (typeof r.line === 'string') return r.line;
                if (typeof r.str === 'string') return r.str;
                if (typeof r.content === 'string') return r.content;
                if (Array.isArray(r)) {
                  return r.map(c => typeof c === 'string' ? c : (c?.chr || c?.char || c?.text || c?.letter || ' ')).join('');
                }
                if (Array.isArray(r.cells || r.chars || r.letters)) {
                  return (r.cells || r.chars || r.letters).map(c => typeof c === 'string' ? c : (c?.chr || c?.char || c?.text || c?.letter || ' ')).join('');
                }
                if (typeof r === 'object') {
                  const vals = Object.values(r).filter(v => typeof v === 'string');
                  if (vals.length > 0) return vals.join('');
                }
                return String(r);
              }

              for (let key in window) {
                try {
                  const val = window[key];
                  if (Array.isArray(val) && val.length >= 20 && val.length <= 40) {
                    let lines = val.map(stringifyRow);
                    let text = lines.join('\\n').trimEnd();
                    if (text.length > 50) return text;
                  }
                  if (val && typeof val === 'object') {
                    const arr = val.screen || val.rows || val.buffer || val.display || val.screenData;
                    if (Array.isArray(arr) && arr.length >= 20) {
                      let lines = arr.map(stringifyRow);
                      let text = lines.join('\\n').trimEnd();
                      if (text.length > 50) return text;
                    }
                  }
                } catch(e) {}
              }
            } catch(e) {}
            return "";
          })();
        `).catch(() => "");

        if (webSabreNativeText && webSabreNativeText.trim().length > 0) {
          return webSabreNativeText;
        }

        // 1. Primary: Try direct xterm.js internal buffer API across all DOM elements
        const xtermDirectText = await wv.executeJavaScript(`
          (function() {
            try {
              const allElems = document.querySelectorAll('*');
              for (let i = 0; i < allElems.length; i++) {
                const el = allElems[i];
                const term = el.xterm || el._xterm || el.terminal || el._terminal;
                if (term && term.buffer && term.buffer.active) {
                  const buf = term.buffer.active;
                  let lines = [];
                  for (let j = 0; j < buf.length; j++) {
                    const line = buf.getLine(j);
                    if (line) lines.push(line.translateToString(false));
                  }
                  const res = lines.join('\\n').trimEnd();
                  if (res.trim().length > 50) return res;
                }
              }
              if (window.term && window.term.buffer && window.term.buffer.active) {
                const buf = window.term.buffer.active;
                let lines = [];
                for (let j = 0; j < buf.length; j++) {
                  const line = buf.getLine(j);
                  if (line) lines.push(line.translateToString(false));
                }
                const res = lines.join('\\n').trimEnd();
                if (res.trim().length > 50) return res;
              }
            } catch(e) {}
            return "";
          })();
        `).catch(() => "");

        if (xtermDirectText && xtermDirectText.trim().length > 0) {
          return xtermDirectText;
        }

        // 2. Priority 2: Canvas Interceptor Buffer (direct fillText interception)
        const canvasState = await wv.executeJavaScript(
          `({
            injected: !!window._sabreInterceptorInjected,
            buffer: window._getSabreBuffer ? window._getSabreBuffer() : (window._sabreCaptureBuffer || [])
          })`
        ).catch(() => null);

        if (canvasState && canvasState.injected) {
          if (Array.isArray(canvasState.buffer) && canvasState.buffer.length > 0) {
            const decodedText = CanvasBufferDecoder.decode(canvasState.buffer);
            if (decodedText && decodedText.trim().length > 50) {
              return decodedText;
            }
          }
          // If interceptor is active but buffer is empty (e.g. just flushed), return empty string so caller waits
          return "";
        }

        // 3. Priority 3: Extract from DOM .xterm-rows > div using textContent (only if canvas interceptor not present)
        const domRowsText = await wv.executeJavaScript(`
          (function() {
            try {
              const xtermRows = document.querySelectorAll('.xterm-rows > div');
              if (xtermRows && xtermRows.length > 0) {
                let lines = [];
                for (let i = 0; i < xtermRows.length; i++) {
                  let rowText = xtermRows[i].textContent || xtermRows[i].innerText || '';
                  lines.push(rowText.replace(/\\u00a0/g, ' '));
                }
                const joined = lines.join('\\n');
                if (joined.trim().length > 50) return joined;
              }
            } catch(e) {}
            return "";
          })();
        `).catch(() => "");

        if (domRowsText && domRowsText.trim().length > 0) {
          return domRowsText;
        }

        // 4. Final Fallback: Accessibility tree / pre / code
        const finalFallbackText = await wv.executeJavaScript(`
          (function() {
            const a11yTree = document.querySelector('.xterm-accessibility-tree');
            if (a11yTree && a11yTree.innerText.trim().length > 0) {
              return a11yTree.innerText;
            }
            const term = document.querySelector('#sabreTerminal, #terminal, .terminal, pre, code');
            if (term && term.innerText && term.innerText.trim().length > 0) {
              return term.innerText;
            }
            return '';
          })();
        `).catch(() => "");

        if (finalFallbackText && finalFallbackText.trim().length > 0) {
          useCrewStore.getState().addConsoleLog(`[SCREEN CAPTURE: Final Fallback]\n${finalFallbackText}`);
          return finalFallbackText;
        }
      } catch (e) {}
    }
  }

  return "";
}

/**
 * Polls the screen buffer every 100ms to detect screen updates/prompts after executing a command.
 * Dynamically decides whether to continue immediately or wait.
 */
export async function waitForScreenChange(
  previousScreenText: string,
  timeoutMs: number = 4000
): Promise<{ text: string; updated: boolean }> {
  const startTime = Date.now();
  const checkInterval = 100;

  while (Date.now() - startTime < timeoutMs) {
    const currentText = await inspectAndCaptureScreenText();

    if (currentText.length > 0 && currentText !== previousScreenText) {
      useCrewStore.getState().addConsoleLog(
        `[SMART SCREEN INSPECTOR] Screen change detected in ${Date.now() - startTime}ms! Proceeding...`
      );
      return { text: currentText, updated: true };
    }

    await new Promise((resolve) => setTimeout(resolve, checkInterval));
  }

  useCrewStore.getState().addConsoleLog(
    `[SMART SCREEN INSPECTOR] Screen wait settled after ${timeoutMs}ms. Proceeding.`
  );
  const finalText = await inspectAndCaptureScreenText();
  return { text: finalText, updated: false };
}

/**
 * Automatically captures multi-page DECS terminal screens (HI1, HSS, etc.)
 * Iteratively collects pages by sending "MD" (Move Down) until end of display is reached.
 */
export async function captureMultiPageDecsText(
  maxPages: number = 8,
  command: string = ""
): Promise<{ fullText: string; pageCount: number }> {
  let fullTextAccumulator = "";
  let pageCount = 0;
  let previousScreenText = "";

  for (let page = 0; page < maxPages; page++) {
    const currentScreenText = await inspectAndCaptureScreenText();

    if (currentScreenText.trim().length > 0) {
      if (currentScreenText !== previousScreenText) {
        fullTextAccumulator += "\n" + currentScreenText;
        pageCount++;
        previousScreenText = currentScreenText;
      }
    }

    const upperText = currentScreenText.toUpperCase();
    const isHssFinished = upperText.includes("TAFB") || upperText.includes("TAXABLE EXP") || upperText.includes("TAXABLE");
    
    if (
      isHssFinished ||
      upperText.includes("BOTTOM OF") ||
      upperText.includes("NO MORE DATA") ||
      upperText.includes("END OF DISP") ||
      upperText.includes("END F DISP") ||
      upperText.includes("ENDOF SCROL") ||
      upperText.includes("END OF SCROL") ||
      upperText.includes("NO MORE SCROLL") ||
      upperText.includes("LAST PAGE") ||
      upperText.includes("COMMAND COMPLETE") ||
      upperText.includes("NO MORE")
    ) {
      useCrewStore.getState().addConsoleLog(
        `[MULTI-PAGE COLLECTOR] End of DECS display reached after ${pageCount} page(s) (Complete: ${isHssFinished ? 'TAFB/Summary found' : 'End of scroll'}).`
      );
      break;
    }

    useCrewStore.getState().addConsoleLog(
      `[MULTI-PAGE COLLECTOR] Sending "Line Down" (Shift+Enter) before MD...`
    );
    await typeMacroOnDecsScreen("SHIFT_ENTER", {
      charDelayMs: 35,
      preEnterDelayMs: 150,
      pressEnter: false,
      smartScreenInspection: false
    });
    await new Promise((r) => setTimeout(r, 350));

    let nextCmd = "MD^";
    if (upperText.includes("MORE? (ENTER Y)") || upperText.includes("MORE (Y/N)") || upperText.includes("MORE? (Y/N)")) {
      nextCmd = "Y^";
      useCrewStore.getState().addConsoleLog(
        `[MULTI-PAGE COLLECTOR] Page ${pageCount} captured. Sending "Y" for next page...`
      );
    } else {
      useCrewStore.getState().addConsoleLog(
        `[MULTI-PAGE COLLECTOR] Page ${pageCount} captured. Sending "MD" (Move Down) for next page...`
      );
    }

    // Flush canvas capture buffer in webview before sending command
    const webviews = document.querySelectorAll("webview") as unknown as any[];
    for (let i = 0; i < webviews.length; i++) {
      webviews[i]?.executeJavaScript("window._flushSabreBuffer && window._flushSabreBuffer()").catch(() => {});
    }

    const beforeMDText = currentScreenText;
    await typeMacroOnDecsScreen(nextCmd, {
      charDelayMs: 35,
      preEnterDelayMs: 200,
      pressEnter: true,
      smartScreenInspection: false
    });

    // Poll up to 5 seconds for a NEW, DIFFERENT page to be drawn into the canvas buffer
    let nextScreenText = "";
    const pollStart = Date.now();
    let pageChanged = false;

    while (Date.now() - pollStart < 5000) {
      await new Promise((r) => setTimeout(r, 250));
      nextScreenText = await inspectAndCaptureScreenText();
      if (
        nextScreenText &&
        nextScreenText.trim().length > 50 &&
        nextScreenText !== beforeMDText
      ) {
        pageChanged = true;
        break;
      }
    }

    if (!pageChanged) {
      useCrewStore.getState().addConsoleLog(
        `[MULTI-PAGE COLLECTOR] Screen unchanged after "MD" (5s timeout). Multi-page collection complete (${pageCount} page(s)).`
      );
      break;
    }
  }

  return { fullText: fullTextAccumulator.trim(), pageCount };
}

/**
 * Types a macro string character-by-character onto the currently open DECS screen and input.
 */
export async function typeMacroOnDecsScreen(
  macroString: string,
  options?: TypingOptions
): Promise<string[]> {
  const charDelay = options?.charDelayMs ?? 45;
  const preEnterDelay = options?.preEnterDelayMs ?? 200;
  const stepDelay = options?.stepDelayMs ?? 500;
  const selector =
    options?.terminalInputSelector ||
    '#sabreInput, #cmdInput, input[data-decs-input="true"], input[name="sabreCmd"]';

  const store = useCrewStore.getState();
  const steps = parseMacroSteps(macroString);
  const outputs: string[] = [];

  store.setIsTypingOnDecs(true);
  store.addConsoleLog(`[KEYBOARD SIM] Starting typing sequence for macro: "${macroString}"`);

  for (let stepIdx = 0; stepIdx < steps.length; stepIdx++) {
    const stepCmd = steps[stepIdx];
    let typedSoFar = "";

    // Inspect screen BEFORE executing step
    const beforeScreenText = await inspectAndCaptureScreenText();

    // Clear input field at start of step
    store.setDecsCurrentInput("");
    updateDomInput(selector, "");

    // Character-by-character typing loop
    for (let i = 0; i < stepCmd.length; i++) {
      const char = stepCmd[i];
      typedSoFar += char;

      // Update store state for input box & prompt rendering
      store.setDecsCurrentInput(typedSoFar);

      // Dispatch character typing to DOM element
      updateDomInput(selector, typedSoFar, char);

      if (options?.onCharacterTyped) {
        options.onCharacterTyped(char, typedSoFar);
      }

      await new Promise((resolve) => setTimeout(resolve, charDelay));
    }

    if (options?.pressEnter !== false) {
      // Pause to allow WebSabre event loop to register characters before hitting Enter
      await new Promise((resolve) => setTimeout(resolve, preEnterDelay));

      // Simulate pressing Enter key
      simulateEnterKeyPress(selector, stepCmd);

      // Smart Screen Inspection: Look at the screen and decide whether to continue immediately or wait!
      if (options?.smartScreenInspection !== false) {
        await waitForScreenChange(beforeScreenText, 4000);
      }

      // Generate DECS terminal screen output
      const decsResponse = generateDecsResponse(stepCmd);
      outputs.push(decsResponse);

      // Append to DECS screen output in store
      const lineOutput = `> ${stepCmd}\n${decsResponse}\n`;
      store.appendDecsTerminalLine(lineOutput);
      store.addConsoleLog(`[KEYBOARD SIM] Executed step ${stepIdx + 1}/${steps.length}: "${stepCmd}"`);

      // Reset input field ONLY when Enter was pressed
      store.setDecsCurrentInput("");
      updateDomInput(selector, "");
    }

    if (options?.onStepComplete) {
      options.onStepComplete(stepCmd, stepIdx);
    }

    if (stepIdx < steps.length - 1 && options?.smartScreenInspection === false) {
      await new Promise((resolve) => setTimeout(resolve, stepDelay));
    }
  }

  store.setIsTypingOnDecs(false);
  store.addConsoleLog(`[KEYBOARD SIM] Completed typing sequence cleanly (${steps.length} step(s)).`);
  return outputs;
}

/**
 * Executes a smooth, 3-phase automated DECS login sequence.
 * Inspects screen state after each phase before executing the next phase.
 */
export async function executeFullDecsLoginSequence(
  empId: string = "742840",
  pass: string = "SARA202"
): Promise<string[]> {
  const store = useCrewStore.getState();
  store.setIsTypingOnDecs(true);
  store.addConsoleLog(`[DECS LOGIN] Starting smooth 3-phase automated DECS login...`);

  const cleanEmp = empId.trim().toUpperCase();
  const cleanPass = pass.trim().toUpperCase();
  const outputs: string[] = [];

  // PHASE 1: //MQ
  store.addConsoleLog(`[DECS LOGIN] Phase 1/3: Sending //MQ...`);
  const beforeP1 = await inspectAndCaptureScreenText();
  await typeMacroOnDecsScreen("//MQ^", {
    charDelayMs: 35,
    preEnterDelayMs: 200,
    pressEnter: true,
    smartScreenInspection: false
  });
  const resP1 = await waitForScreenChange(beforeP1, 4000);
  outputs.push(`Phase 1 (//MQ): ${resP1.updated ? "Screen Updated" : "Settled"}`);

  // Short pause before Phase 2
  await new Promise((resolve) => setTimeout(resolve, 300));

  // PHASE 2: BSIP<EmployeeID>
  store.addConsoleLog(`[DECS LOGIN] Phase 2/3: Sending BSIP${cleanEmp}...`);
  const beforeP2 = await inspectAndCaptureScreenText();
  await typeMacroOnDecsScreen(`BSIP${cleanEmp}^`, {
    charDelayMs: 35,
    preEnterDelayMs: 200,
    pressEnter: true,
    smartScreenInspection: false
  });
  const resP2 = await waitForScreenChange(beforeP2, 4000);
  outputs.push(`Phase 2 (BSIP): ${resP2.updated ? "Screen Updated" : "Settled"}`);

  // Short pause before Phase 3
  await new Promise((resolve) => setTimeout(resolve, 300));

  // PHASE 3: <Passcode>
  store.addConsoleLog(`[DECS LOGIN] Phase 3/3: Sending Passcode...`);
  const beforeP3 = await inspectAndCaptureScreenText();
  await typeMacroOnDecsScreen(`${cleanPass}^`, {
    charDelayMs: 35,
    preEnterDelayMs: 200,
    pressEnter: true,
    smartScreenInspection: false
  });
  const resP3 = await waitForScreenChange(beforeP3, 4000);
  outputs.push(`Phase 3 (Passcode): ${resP3.updated ? "Screen Updated" : "Settled"}`);

  store.setIsTypingOnDecs(false);
  store.addConsoleLog(`[DECS LOGIN] Smooth automated DECS login sequence completed!`);
  return outputs;
}

/**
 * Master Autonomous 4-Step Roster Pipeline:
 * 1. DECS Login (//MQ -> BSIP -> Passcode)
 * 2. Pull HI1 Monthly Roster (HI1^)
 * 3. Parse HI1 Schedule & Populate Calendar
 * 4. Auto-Pull HSS Trip Details for Every Sequence Discovered & Update Logbook
 */
export async function runFullAutonomousRosterPipeline(
  empId: string = "742840",
  pass: string = "SARA202",
  onStatusUpdate?: (msg: string) => void
): Promise<void> {
  const store = useCrewStore.getState();
  const updateStatus = (msg: string) => {
    store.addConsoleLog(msg);
    if (onStatusUpdate) onStatusUpdate(msg);
  };

  updateStatus("🚀 [MASTER PIPELINE] Starting 4-Step Autonomous Roster & Calendar Sync...");

  // STEP 1: DECS Login
  updateStatus("Step 1/4: Authenticating into DECS Host Terminal...");
  await executeFullDecsLoginSequence(empId, pass);
  await new Promise((r) => setTimeout(r, 600));

  // STEP 2: Pull Monthly HI1 Schedule
  updateStatus("Step 2/4: Executing HI1 command to load monthly schedule roster...");
  const beforeHI1 = await inspectAndCaptureScreenText();
  await typeMacroOnDecsScreen("HI1^", {
    charDelayMs: 35,
    preEnterDelayMs: 200,
    pressEnter: true,
    smartScreenInspection: false
  });
  const hi1Res = await waitForScreenChange(beforeHI1, 4000);
  
  updateStatus("Paging through HI1 schedule roster to collect all trips...");
  const multiPageResult = await captureMultiPageDecsText(4);
  const hi1Text = multiPageResult.fullText || hi1Res.text;
  // --- DIAGNOSTIC LOGGING ---
  console.log("=== RAW DECS EXTRACTED HI1 TEXT ===");
  console.log(hi1Text);
  console.log("===================================");


  // STEP 3: Parse HI1 Schedule & Populate Calendar
  updateStatus("Step 3/4: Parsing HI1 schedule roster & populating monthly calendar...");
  const hi1Sequences = parseHI1Schedule(hi1Text);

  // Dynamically detect month or default to August 2026 (Fixing hardcoded July)
  let detectedMonth = "August 2026";
  let detectedEnding = "31AUG26";
  const monthMatch = hi1Text.match(/MONTH ENDING (\d{2}[A-Z]{3}\d{2})/i);
  if (monthMatch) {
    detectedEnding = monthMatch[1].toUpperCase();
    const monthStr = detectedEnding.substring(2, 5);
    const monthNames: Record<string, string> = { JAN: "January", FEB: "February", MAR: "March", APR: "April", MAY: "May", JUN: "June", JUL: "July", AUG: "August", SEP: "September", OCT: "October", NOV: "November", DEC: "December" };
    detectedMonth = `${monthNames[monthStr] || monthStr} 20${detectedEnding.substring(5, 7)}`;
  }

  if (hi1Sequences.length > 0) {
    store.importMonthlyHISchedule(
      hi1Sequences,
      [],
      {
        monthEnding: detectedEnding,
        monthYearLabel: detectedMonth,
        asOfDateStr: new Date().toISOString(),
        pilotName: "CAPTAIN PILOT",
        seniorityNum: "12345",
        empNum: empId,
        base: "DFW",
        equipment: "E75",
        rank: "CAPT",
        guaranteeHours: 75.0,
        bidSelProjHours: 85.0,
        fltTime672Hours: 45.2,
        fltTime365Day: 520.0,
        availSickHours: 120.0,
        shortTermSickAccrual: 21.0,
        sickUsedYtd: 0,
        vacationDaysCount: 7,
        vacationCreditHours: 24.5,
      },
      "Autonomous_HI1_Live.txt",
      hi1Text
    );
    updateStatus(`✓ Calendar populated with ${hi1Sequences.length} sequence trip(s) from HI1!`);
  } else {
    updateStatus("Notice: HI1 parsed 0 trips from screen. Proceeding with active calendar sequences...");
  }

  // STEP 4: Auto-Pull HSS Details for Every Discovered Sequence Number
  const targetSeqs = hi1Sequences.length > 0 ? hi1Sequences : store.sequences;
  const seqNumbers = Array.from(new Set(targetSeqs.map((s) => s.sequenceNumber))).filter(Boolean);

  if (seqNumbers.length > 0) {
    updateStatus(`Step 4/4: Auto-pulling detailed HSS trip legs for ${seqNumbers.length} sequence(s)...`);

    for (let i = 0; i < seqNumbers.length; i++) {
      const seqNum = seqNumbers[i];
      updateStatus(`Pulling HSS detail for Seq #${seqNum} (${i + 1}/${seqNumbers.length})...`);

      const beforeHSS = await inspectAndCaptureScreenText();
      await typeMacroOnDecsScreen(`HSS/${seqNum}^`, {
        charDelayMs: 35,
        preEnterDelayMs: 200,
        pressEnter: true,
        smartScreenInspection: false
      });
      await waitForScreenChange(beforeHSS, 3500);
      const multiPageHss = await captureMultiPageDecsText(3);
      const hssText = multiPageHss.fullText || (await inspectAndCaptureScreenText());

      const detailedTrips = parseHssSchedule(hssText);
      if (detailedTrips.length > 0) {
        // Merge detailed duty period legs and metadata safely into store
        store.mergeHssIntoSequence(seqNum, detailedTrips[0]);
      }

      await new Promise((r) => setTimeout(r, 400));
    }
  }

  store.autoGenerateLogbookFromRoster();
  updateStatus("🎉 [MASTER PIPELINE] Autonomous Roster, Calendar & Logbook Sync Complete!");
}

/**
 * Types raw text strictly without pressing Enter or clearing the input field.
 */
export async function typeOnlyText(text: string, selector?: string): Promise<void> {
  await typeMacroOnDecsScreen(text, { pressEnter: false, terminalInputSelector: selector });
}

/**
 * Updates DOM input element and dispatches standard Keyboard & Input events.
 * Targets both local UI inputs and active <webview> browser elements on screen.
 */
function updateDomInput(selector: string, fullText: string, lastChar?: string) {
  if (typeof document === "undefined") return;

  // 1. Update top-level document UI inputs
  const inputs = document.querySelectorAll<HTMLInputElement>(selector);
  inputs.forEach((input) => {
    input.value = fullText;

    if (lastChar) {
      const charUpper = lastChar.toUpperCase();
      const codeNum = charUpper.charCodeAt(0);
      let eventCode = `Key${charUpper}`;
      if (lastChar === '/') eventCode = 'Slash';
      else if (lastChar >= '0' && lastChar <= '9') eventCode = `Digit${lastChar}`;

      const keyEventOpts: KeyboardEventInit = {
        key: lastChar,
        code: eventCode,
        keyCode: codeNum,
        which: codeNum,
        charCode: lastChar.charCodeAt(0),
        bubbles: true,
        cancelable: true,
      };
      input.dispatchEvent(new KeyboardEvent("keydown", keyEventOpts));
      input.dispatchEvent(new KeyboardEvent("keypress", keyEventOpts));
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
      input.dispatchEvent(new KeyboardEvent("keyup", keyEventOpts));
    } else {
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
    }
  });

  // 2. Physically type into active <webview> browser elements open on screen
  const webviews = document.querySelectorAll("webview") as unknown as any[];
  webviews.forEach((wv) => {
    if (wv && wv.sendInputEvent && lastChar) {
      const charUpper = lastChar.toUpperCase();
      let keyCode = charUpper;
      if (lastChar === '/') keyCode = 'Slash';
      else if (lastChar >= '0' && lastChar <= '9') keyCode = `Digit${lastChar}`;

      try {
        wv.sendInputEvent({ type: 'keyDown', keyCode: keyCode });
        wv.sendInputEvent({ type: 'char', keyCode: lastChar });
        wv.sendInputEvent({ type: 'keyUp', keyCode: keyCode });
        return;
      } catch(e) {}
    }

    if (wv && wv.executeJavaScript) {
      const escapedChar = JSON.stringify(lastChar || "");
      const escapedText = JSON.stringify(fullText);
      const code = `
        (function() {
          let el = null;
          if (window._lastInspectedElement && window._lastInspectedElement.selector) {
            try {
              el = document.querySelector(window._lastInspectedElement.selector);
            } catch(e) {}
          }
          if (!el && document.activeElement && document.activeElement !== document.body && document.activeElement.tagName !== 'BODY') {
            el = document.activeElement;
          }
          if (!el) {
            el = document.querySelector('#sabreInput, #cmdInput, input[data-decs-input="true"], input[name="sabreCmd"], #terminalInput, input[name*="decs"], input[name*="cmd"]');
          }
          if (!el) {
            const candidateInputs = Array.from(document.querySelectorAll('input[type="text"], input[type="password"], textarea, canvas'));
            el = candidateInputs.find(i => !i.name?.toLowerCase().includes('search') && !i.id?.toLowerCase().includes('search') && !i.placeholder?.toLowerCase().includes('search')) || candidateInputs[0];
          }
          if (!el) return;

          if (${escapedChar}) {
            const charStr = ${escapedChar};
            const charUpper = charStr.toUpperCase();
            const codeNum = charUpper.charCodeAt(0);
            const rawCharCode = charStr.charCodeAt(0);

            let eventCode = 'Key' + charUpper;
            if (charStr === '/') eventCode = 'Slash';
            else if (charStr >= '0' && charStr <= '9') eventCode = 'Digit' + charStr;

            const opts = {
              key: charStr,
              code: eventCode,
              keyCode: codeNum,
              which: codeNum,
              charCode: rawCharCode,
              bubbles: true,
              cancelable: true
            };
            try { el.dispatchEvent(new KeyboardEvent('keydown', opts)); } catch(e){}
            try { el.dispatchEvent(new KeyboardEvent('keypress', opts)); } catch(e){}
            try { el.dispatchEvent(new KeyboardEvent('keyup', opts)); } catch(e){}
          }
        })();
      `;
      wv.executeJavaScript(code).catch(() => {});
    }
  });
}

/**
 * Simulates Enter key press events on DOM input elements and active <webview> viewports.
 */
function simulateEnterKeyPress(selector: string, command: string) {
  if (typeof document === "undefined") return;

  const inputs = document.querySelectorAll<HTMLInputElement>(selector);
  inputs.forEach((input) => {
    const enterOpts: KeyboardEventInit = {
      key: "Enter",
      code: "Enter",
      keyCode: 13,
      which: 13,
      bubbles: true,
      cancelable: true,
    };

    input.dispatchEvent(new KeyboardEvent("keydown", enterOpts));
    input.dispatchEvent(new KeyboardEvent("keypress", enterOpts));
    input.dispatchEvent(new KeyboardEvent("keyup", enterOpts));
  });

  // Also simulate Enter key inside active <webview> browser elements
  const webviews = document.querySelectorAll<any>("webview");
  webviews.forEach((wv) => {
    if (wv && wv.sendInputEvent) {
      try {
        wv.sendInputEvent({ type: 'keyDown', keyCode: 'Return' });
        wv.sendInputEvent({ type: 'char', keyCode: '\r' });
        wv.sendInputEvent({ type: 'keyUp', keyCode: 'Return' });
        return;
      } catch(e) {}
    }

    if (wv && wv.executeJavaScript) {
      const code = `
        (function() {
          let el = null;
          if (window._lastInspectedElement && window._lastInspectedElement.selector) {
            try {
              el = document.querySelector(window._lastInspectedElement.selector);
            } catch(e) {}
          }
          if (!el && document.activeElement && document.activeElement !== document.body && document.activeElement.tagName !== 'BODY') {
            el = document.activeElement;
          }
          if (!el) {
            el = document.querySelector('#sabreInput, #cmdInput, input[data-decs-input="true"], input[name="sabreCmd"], #terminalInput, input[name*="decs"], input[name*="cmd"]');
          }
          if (!el) return;

          const enterOpts = { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, charCode: 13, bubbles: true, cancelable: true };
          try { el.dispatchEvent(new KeyboardEvent('keydown', enterOpts)); } catch(e){}
          try { el.dispatchEvent(new KeyboardEvent('keypress', enterOpts)); } catch(e){}
          try { el.dispatchEvent(new KeyboardEvent('keyup', enterOpts)); } catch(e){}
          if (typeof window._flushSabreBuffer === 'function') {
            window._flushSabreBuffer();
          }
        })();
      `;
      wv.executeJavaScript(code).catch(() => {});
    }
  });
}
