"use client";

import React, { useRef, useEffect, useState } from "react";
import { Globe, Terminal as TerminalIcon, Play, RefreshCw, Layers } from "lucide-react";
import { CANVAS_INTERCEPTOR_SCRIPT } from "../lib/canvasInterceptor";
import { CanvasBufferDecoder } from "../lib/canvasDecoder";
import { executeCommand, waitForTerminalResponse } from "../lib/macroEngine";
import { PFKeyMacroBuilder } from "../lib/decsDictionary";
import { useCrewStore } from "../store/useCrewStore";
import { parseRawSchedule } from "../lib/parser";

export default function PortalTab() {
  const webviewRef = useRef<any>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [terminalOutput, setTerminalOutput] = useState<string>("");

  const importMonthlyHISchedule = useCrewStore((state) => state.importMonthlyHISchedule);

  // Inject canvas interceptor on WebView load
  const handleWebViewDomReady = () => {
    if (webviewRef.current && webviewRef.current.executeJavaScript) {
      webviewRef.current
        .executeJavaScript(CANVAS_INTERCEPTOR_SCRIPT)
        .then(() => {
          console.log("[PortalTab] Injected Canvas Interceptor Script into WebContentsView.");
        })
        .catch((err: any) => {
          console.error("[PortalTab] Failed to inject Canvas Interceptor:", err);
        });
    }
  };

  /**
   * Frontend function to sync schedule from WebSabre terminal.
   * Calls executeCommand(PFKeyMacroBuilder.pullSchedule('CURRENT')),
   * logs the decoded string to the console, and passes it to our UI state.
   */
  const handleSyncSchedule = async () => {
    setIsExecuting(true);
    setStatusMessage("Executing PFKeyMacroBuilder.pullSchedule('CURRENT') via MacroEngine...");

    try {
      // 1. Ensure Canvas Interceptor script is injected
      if (webviewRef.current && webviewRef.current.executeJavaScript) {
        await webviewRef.current.executeJavaScript(CANVAS_INTERCEPTOR_SCRIPT);
      } else if (typeof window !== "undefined") {
        try {
          eval(CANVAS_INTERCEPTOR_SCRIPT);
        } catch (e) {
          // Fallback context evaluation
        }
      }

      // 2. Build macro string: HI1
      const macroCmd = PFKeyMacroBuilder.pullSchedule("CURRENT");

      // Check if running inside Electron IPC Bridge
      if (typeof window !== "undefined" && window.electronAPI?.sendMacro) {
        console.log("[PortalTab] Executing macro via Electron Main Process IPC...");
        await window.electronAPI.sendMacro(macroCmd);
      }

      // 3. Execute command sequence using Async Macro Engine & Smart Listener
      const decodedOutput = await executeCommand(macroCmd, {
        timeoutMs: 5000,
        executor: {
          executeJS: async (script: string) => {
            if (webviewRef.current && webviewRef.current.executeJavaScript) {
              return await webviewRef.current.executeJavaScript(script);
            }
            if (typeof window !== "undefined" && window.electronAPI?.flushSabreBuffer) {
              return await window.electronAPI.flushSabreBuffer();
            }
            return eval(script);
          },
        },
      });

      // 4. Log the decoded string to console
      console.log("[WebSabre Canvas Engine Decoded Output]:\n", decodedOutput);

      // 5. Update UI state & CrewStore
      setTerminalOutput(decodedOutput);

      if (decodedOutput && decodedOutput.length > 0) {
        const parsedTrips = parseRawSchedule(decodedOutput);
        if (parsedTrips.length > 0) {
          importMonthlyHISchedule(parsedTrips, [], null, "Live_Sabre_Terminal.txt", decodedOutput);
          setStatusMessage(`Successfully synced ${parsedTrips.length} sequence(s) to UI roster state!`);
        } else {
          setStatusMessage("Decoded WebSabre canvas buffer. Buffer loaded into state.");
        }
      } else {
        setStatusMessage("Macro execution complete. Terminal canvas buffer captured.");
      }
    } catch (err: any) {
      console.error("[PortalTab] handleSyncSchedule error:", err);
      setStatusMessage(`Sync error: ${err.message || "Failed to execute macro"}`);
    } finally {
      setIsExecuting(false);
      setTimeout(() => setStatusMessage(null), 5000);
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-slate-950 text-slate-100 font-sans rounded-2xl overflow-hidden border border-slate-800 shadow-2xl">
      {/* Header Controls */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-900 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Globe className="w-5 h-5 text-sky-400" />
          <span className="font-extrabold text-sm text-white">WebSabre Corporate Portal</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleSyncSchedule}
            disabled={isExecuting}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-600 hover:bg-sky-500 active:bg-sky-700 disabled:opacity-50 text-white rounded-lg text-xs font-extrabold transition cursor-pointer"
          >
            {isExecuting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-current" />}
            Sync Schedule (HI1)
          </button>
        </div>
      </div>

      {/* Status Bar */}
      {statusMessage && (
        <div className="px-4 py-2 bg-sky-950/80 border-b border-sky-800 text-sky-200 text-xs font-mono flex items-center justify-between">
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Main Split View: WebContents Canvas Portal & Decoded Terminal Output */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-0 overflow-hidden">
        {/* Portal WebContents / WebView Viewport */}
        <div className="relative bg-slate-900 flex flex-col items-center justify-center border-r border-slate-800 p-4">
          <div className="w-full max-w-xl bg-black rounded-xl p-4 border border-slate-800 shadow-inner flex flex-col items-center gap-3">
            <div className="flex items-center justify-between w-full text-slate-400 text-xs font-mono pb-2 border-b border-slate-800">
              <span className="flex items-center gap-1.5"><TerminalIcon className="w-4 h-4 text-emerald-400" /> sabreTerm (&lt;canvas&gt;)</span>
              <span className="text-emerald-400 text-[10px] bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800">SignalR Active</span>
            </div>

            {/* Simulated WebContents Canvas Target */}
            <canvas id="sabreTerm" width="640" height="360" className="bg-black border border-emerald-950 rounded shadow-md w-full" />
            <input
              id="sabreInput"
              type="text"
              placeholder="Enter DECS command..."
              className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-xs text-emerald-400 font-mono focus:outline-none focus:border-sky-500"
            />
          </div>
        </div>

        {/* Decoded Monospaced Buffer Display */}
        <div className="bg-slate-950 p-4 flex flex-col overflow-hidden">
          <div className="text-xs font-bold text-slate-400 mb-2 flex items-center justify-between">
            <span className="flex items-center gap-1.5"><Layers className="w-4 h-4 text-sky-400" /> Decoded Terminal Screen Buffer</span>
            <span className="text-[10px] font-mono text-slate-500">CanvasBufferDecoder Output</span>
          </div>

          <pre className="flex-1 bg-black/90 text-emerald-400 p-4 rounded-xl border border-slate-800 font-mono text-xs overflow-auto whitespace-pre leading-relaxed select-all">
            {terminalOutput || "// Click 'Sync Schedule (HI1)' to execute macro and capture canvas buffer."}
          </pre>
        </div>
      </div>
    </div>
  );
}
