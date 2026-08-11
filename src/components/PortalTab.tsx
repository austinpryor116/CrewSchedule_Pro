"use client";

import React, { useRef, useEffect, useState } from "react";
import { Globe, Terminal as TerminalIcon, Play, RefreshCw, Layers, Keyboard } from "lucide-react";
import { CANVAS_INTERCEPTOR_SCRIPT } from "../lib/canvasInterceptor";
import { CanvasBufferDecoder } from "../lib/canvasDecoder";
import { executeCommand, waitForTerminalResponse } from "../lib/macroEngine";
import { PFKeyMacroBuilder } from "../lib/decsDictionary";
import { useCrewStore } from "../store/useCrewStore";
import { parseRawSchedule } from "../lib/parser";
import { typeMacroOnDecsScreen } from "../lib/keyboardSimEngine";
import MacroActionBar from "./MacroActionBar";

export default function PortalTab() {
  const webviewRef = useRef<any>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [terminalOutput, setTerminalOutput] = useState<string>("");

  const importMonthlyHISchedule = useCrewStore((state) => state.importMonthlyHISchedule);
  const decsScreenOutput = useCrewStore((state) => state.decsScreenOutput);
  const decsCurrentInput = useCrewStore((state) => state.decsCurrentInput);
  const setDecsCurrentInput = useCrewStore((state) => state.setDecsCurrentInput);
  const isTypingOnDecs = useCrewStore((state) => state.isTypingOnDecs);

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
   */
  const handleSyncSchedule = async () => {
    setIsExecuting(true);
    setStatusMessage("Executing PFKeyMacroBuilder.pullSchedule('CURRENT') via MacroEngine...");

    try {
      const macroCmd = PFKeyMacroBuilder.pullSchedule("CURRENT");

      // Type the command character by character onto the screen
      await typeMacroOnDecsScreen(macroCmd);

      // Check if running inside Electron IPC Bridge
      if (typeof window !== "undefined" && window.electronAPI?.sendMacro) {
        await window.electronAPI.sendMacro(macroCmd);
      }

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
    <div className="flex flex-col h-full w-full bg-slate-950 text-slate-100 font-sans rounded-2xl overflow-hidden border border-slate-800 shadow-2xl space-y-3 p-3">
      {/* Quick Action Macro Bar Embedded at top */}
      <MacroActionBar />

      {/* Header Controls */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-900 border border-slate-800 rounded-xl">
        <div className="flex items-center gap-2">
          <Globe className="w-5 h-5 text-sky-400" />
          <span className="font-extrabold text-sm text-white">WebSabre Corporate Portal & DECS Terminal</span>
          {isTypingOnDecs && (
            <span className="flex items-center gap-1 text-[10px] font-black uppercase text-amber-400 bg-amber-950 px-2.5 py-0.5 rounded border border-amber-700 animate-pulse">
              <Keyboard className="w-3 h-3" /> Keyboard Typing...
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleSyncSchedule}
            disabled={isExecuting || isTypingOnDecs}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-600 hover:bg-sky-500 active:bg-sky-700 disabled:opacity-50 text-white rounded-lg text-xs font-extrabold transition cursor-pointer"
          >
            {isExecuting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-current" />}
            Sync Schedule (HI1)
          </button>
        </div>
      </div>

      {/* Status Bar */}
      {statusMessage && (
        <div className="px-4 py-2 bg-sky-950/80 border border-sky-800 text-sky-200 text-xs font-mono rounded-xl flex items-center justify-between">
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Main Split View: WebContents Canvas Portal & Decoded Terminal Output */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-3 overflow-hidden min-h-[380px]">
        {/* Portal WebContents / WebView Viewport */}
        <div className="relative bg-slate-900 flex flex-col items-center justify-between border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between w-full text-slate-400 text-xs font-mono pb-2 border-b border-slate-800">
            <span className="flex items-center gap-1.5"><TerminalIcon className="w-4 h-4 text-emerald-400" /> sabreTerm (&lt;canvas&gt;) DECS Host</span>
            <span className="text-emerald-400 text-[10px] bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800">SignalR Active</span>
          </div>

          {/* Simulated WebContents Canvas Target */}
          <canvas id="sabreTerm" width="640" height="300" className="bg-black border border-emerald-950 rounded shadow-md w-full my-3 flex-1" />

          {/* Interactive DECS Keyboard Input Line */}
          <div className="w-full relative">
            <input
              id="sabreInput"
              type="text"
              value={decsCurrentInput}
              onChange={(e) => setDecsCurrentInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && decsCurrentInput.trim()) {
                  typeMacroOnDecsScreen(decsCurrentInput.trim());
                }
              }}
              placeholder={isTypingOnDecs ? "Keyboard typing on DECS screen..." : "Enter DECS command (e.g. HIFIT/17495/27JUL/ORD)..."}
              className={`w-full bg-slate-950 border rounded px-3 py-2 text-xs text-emerald-400 font-mono focus:outline-none transition ${
                isTypingOnDecs ? "border-amber-400 ring-1 ring-amber-400 bg-amber-950/20" : "border-slate-800 focus:border-sky-500"
              }`}
            />
            {isTypingOnDecs && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 w-2 h-4 bg-emerald-400 animate-ping inline-block" />
            )}
          </div>
        </div>

        {/* Live Monospaced DECS Screen Terminal Buffer Display */}
        <div className="bg-slate-950 p-4 flex flex-col overflow-hidden border border-slate-800 rounded-xl">
          <div className="text-xs font-bold text-slate-400 mb-2 flex items-center justify-between">
            <span className="flex items-center gap-1.5"><Layers className="w-4 h-4 text-sky-400" /> Live DECS Screen Terminal Output</span>
            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800">
              {isTypingOnDecs ? "Keyboard Input Active" : "Ready"}
            </span>
          </div>

          <pre className="flex-1 bg-black/90 text-emerald-400 p-4 rounded-xl border border-slate-800 font-mono text-xs overflow-auto whitespace-pre-wrap leading-relaxed select-all">
            {decsScreenOutput || terminalOutput || "// Click any Quick Command above to type on this DECS screen."}
          </pre>
        </div>
      </div>
    </div>
  );
}

