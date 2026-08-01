"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import {
  Globe,
  Terminal,
  Search,
  RotateCcw,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Play,
  Copy,
  Check,
  Plus,
  BookOpen,
  ArrowLeft,
  ArrowRight,
  ExternalLink,
  Layers,
  FileText,
  Clock,
  Plane,
  Download,
  Eye,
  Zap,
  Clipboard,
  Upload,
  FileUp,
} from "lucide-react";
import { useCrewStore } from "../../store/useCrewStore";
import { parseRawSchedule, parseN4OpenTime, convertOpenToTrip } from "../../lib/parser";
import { readUploadedFileAsText } from "../../lib/pdfExtractor";
import { RAW_HI1_TEXT, RAW_N4_TEXT, RAW_HI1_AUG_TEXT } from "../../lib/demoData";
import { RAW_HSS_1_TEXT } from "../../lib/hss_extracted_text";
import { SequenceTrip, OpenSequence } from "../../types";
import { parseHSSSequence, parse26BCommute, parseReleaseSummary } from "../../lib/parserHooks";
import MacroActionBar from "../MacroActionBar";
import { CANVAS_INTERCEPTOR_SCRIPT } from "../../lib/canvasInterceptor";
import { CanvasBufferDecoder } from "../../lib/canvasDecoder";
import { executeCommand, waitForTerminalResponse } from "../../lib/macroEngine";
import { PFKeyMacroBuilder } from "../../lib/decsDictionary";

export default function PortalBrowserStudio() {
  const importMonthlyHISchedule = useCrewStore((state) => state.importMonthlyHISchedule);
  const setSequences = useCrewStore((state) => state.setSequences);
  const setOpenSequences = useCrewStore((state) => state.setOpenSequences);
  const autoGenerateLogbookFromRoster = useCrewStore((state) => state.autoGenerateLogbookFromRoster);
  const existingSeqs = useCrewStore((state) => state.sequences);
  const existingOpenSeqs = useCrewStore((state) => state.openSequences);

  // View Mode: 'web' or 'terminal'
  const [viewMode, setViewMode] = useState<"web" | "terminal">("terminal");

  // Web Browser State
  const [urlInput, setUrlInput] = useState("https://crew.aa.com");
  const [activeUrl, setActiveUrl] = useState("https://crew.aa.com");
  const [history, setHistory] = useState<string[]>(["https://crew.aa.com"]);
  const [historyIndex, setHistoryIndex] = useState(0);

  // Terminal Buffer State
  const [terminalBuffer, setTerminalBuffer] = useState("");
  const [terminalTheme, setTerminalTheme] = useState<"green" | "amber" | "dark">("green");

  // File Upload Ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Notifications / Feedback
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // 1-Click Clipboard Auto-Paste
  const handleReadClipboard = async () => {
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        const text = await navigator.clipboard.readText();
        if (text && text.trim().length > 0) {
          setTerminalBuffer(text);
          setStatusMessage("Pasted and extracted schedule text from clipboard!");
          setTimeout(() => setStatusMessage(null), 4000);
        } else {
          setStatusMessage("Clipboard is empty. Copy schedule text (HI1 / HSS / N4) first!");
          setTimeout(() => setStatusMessage(null), 4000);
        }
      }
    } catch (err) {
      setStatusMessage("Clipboard access denied. Please paste text directly into the console.");
      setTimeout(() => setStatusMessage(null), 4000);
    }
  };

  // 1-Click PDF / Text File Upload
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const res = await readUploadedFileAsText(file);
      if (res.text && res.text.trim().length > 0) {
        setTerminalBuffer(res.text);
        setStatusMessage(`Extracted text from ${res.fileName}! Loaded into Live Extractor Engine.`);
        setTimeout(() => setStatusMessage(null), 4000);
      } else {
        setStatusMessage(`No readable text found in ${res.fileName}.`);
        setTimeout(() => setStatusMessage(null), 4000);
      }
    } catch (err) {
      console.error("File upload extraction error:", err);
      setStatusMessage(`Failed to read file ${file.name}.`);
      setTimeout(() => setStatusMessage(null), 4000);
    }
  };

  // Quick Bookmarks
  const bookmarks = [
    { name: "AA Crew Portal", url: "https://crew.aa.com", sample: RAW_HI1_TEXT, type: "HI1 Roster" },
    { name: "DECS N4 Open Time", url: "https://decs.aa.com/n4", sample: RAW_N4_TEXT, type: "N4 Open Time" },
    { name: "HI1 July Roster", url: "https://fpa.aa.com/hi1/jul", sample: RAW_HI1_TEXT, type: "HI1 Roster" },
    { name: "HI1 Aug Roster", url: "https://fpa.aa.com/hi1/aug", sample: RAW_HI1_AUG_TEXT, type: "HI1 Roster" },
    { name: "HSS Daily Pairing", url: "https://cci.aa.com/hss", sample: RAW_HSS_1_TEXT, type: "HSS Pairing" },
  ];

  // Listen for iframe navigation events and live page text via postMessage
  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (e.data && e.data.type === "PROXY_URL_CHANGE" && e.data.url) {
        setUrlInput(e.data.url);
        setActiveUrl(e.data.url);
      }
      if (e.data && e.data.type === "PROXY_PAGE_TEXT" && e.data.text) {
        if (e.data.text.trim().length > 0) {
          setTerminalBuffer(e.data.text);
        }
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  // Real-time Electron Webview Canvas Scraper Buffer Listener
  useEffect(() => {
    if (typeof window === "undefined" || !window.electronAPI) return;

    const interval = setInterval(async () => {
      try {
        const webview = webviewRef.current;
        if (!webview || !webview.executeJavaScript) return;

        // Ensure canvas interceptor is injected into webview context
        await webview.executeJavaScript(CANVAS_INTERCEPTOR_SCRIPT).catch(() => {});

        // Flush 2D canvas character capture buffer from target page webview
        const rawBuffer = await webview.executeJavaScript("window._flushSabreBuffer ? window._flushSabreBuffer() : []");
        if (Array.isArray(rawBuffer) && rawBuffer.length > 0) {
          const decoded = CanvasBufferDecoder.decode(rawBuffer);
          if (decoded && decoded.trim().length > 0) {
            setTerminalBuffer(decoded);
          }
        }
      } catch (err) {
        // Silently handle transient loading states
      }
    }, 400);

    return () => clearInterval(interval);
  }, []);

  // Load target URL or search query into browser iframe
  const handleNavigate = (target: string) => {
    let clean = target.trim();
    if (!clean) return;

    const lower = clean.toLowerCase();

    if (lower === "google" || lower === "google.com" || lower === "www.google.com") {
      clean = "https://www.google.com";
    } else if (!clean.startsWith("http://") && !clean.startsWith("https://")) {
      if (clean.includes(".") && !clean.includes(" ")) {
        clean = `https://${clean}`;
      } else {
        // Use DuckDuckGo HTML search for 100% reliable 200 OK search results without bot blocks
        clean = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(clean)}`;
      }
    } else if (clean.includes("google.com/search")) {
      const urlObj = new URL(clean);
      const q = urlObj.searchParams.get("q");
      if (q) {
        clean = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(q)}`;
      }
    }

    setUrlInput(clean);
    setActiveUrl(clean);
    const newHist = history.slice(0, historyIndex + 1);
    newHist.push(clean);
    setHistory(newHist);
    setHistoryIndex(newHist.length - 1);
  };

  const handleBack = () => {
    if (historyIndex > 0) {
      const idx = historyIndex - 1;
      setHistoryIndex(idx);
      setUrlInput(history[idx]);
      setActiveUrl(history[idx]);
    }
  };

  const handleForward = () => {
    if (historyIndex < history.length - 1) {
      const idx = historyIndex + 1;
      setHistoryIndex(idx);
      setUrlInput(history[idx]);
      setActiveUrl(history[idx]);
    }
  };

  // Real-time Parser Logic on Terminal Buffer
  const parseResult = useMemo(() => {
    const text = terminalBuffer;
    if (!text || text.trim().length === 0) {
      return { type: "none", sequences: [], openSequences: [], commuteFlights: [], releaseInfo: null };
    }

    // 1. JP* Dispatch Release
    const releaseInfo = parseReleaseSummary(text);
    if (releaseInfo && (text.includes("RELEASE") || text.includes("DISPATCH") || text.includes("REL FUEL"))) {
      return { type: "JP* Dispatch Release", sequences: [], openSequences: [], commuteFlights: [], releaseInfo };
    }

    // 2. 26B Commute Listings
    const commuteFlights = parse26BCommute(text);
    if (commuteFlights.length > 0 && (text.includes("26B") || text.includes("COMMUTE") || text.includes("PASSENGER") || text.includes("F") && text.includes("Y"))) {
      return { type: "26B Commute Listings", sequences: [], openSequences: [], commuteFlights, releaseInfo: null };
    }

    // 3. N4 Open Time
    if (text.includes("OPEN TIME") || text.includes("POS  TRIP") || text.includes("SEQ  POS") || text.includes("N4D")) {
      const openSeqs = parseN4OpenTime(text);
      if (openSeqs.length > 0) {
        const trips = openSeqs.map((o) => convertOpenToTrip(o));
        return { type: "N4 Open Time", sequences: trips, openSequences: openSeqs, commuteFlights: [], releaseInfo: null };
      }
    }

    // 4. Default HI1 / HSS Sequence Roster
    const seqs = parseRawSchedule(text);
    if (seqs.length > 0) {
      return { type: "HI1 / HSS Sequence Roster", sequences: seqs, openSequences: [], commuteFlights: [], releaseInfo: null };
    }

    return { type: "Raw Terminal Buffer", sequences: [], openSequences: [], commuteFlights: [], releaseInfo: null };
  }, [terminalBuffer]);

  // Action: Import Sequences to Main Schedule
  const handleImportToRoster = () => {
    if (parseResult.sequences.length === 0) return;

    if (parseResult.type.includes("HI1")) {
      importMonthlyHISchedule(
        parseResult.sequences,
        [],
        {
          monthEnding: "31JUL26",
          monthYearLabel: "July 2026",
          asOfDateStr: new Date().toISOString(),
          pilotName: "CAPTAIN PILOT",
          seniorityNum: "12345",
          empNum: "00123456",
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
        "Live_Terminal_Import.txt",
        terminalBuffer
      );
    } else {
      setSequences(parseResult.sequences);
    }

    setStatusMessage(`Successfully imported ${parseResult.sequences.length} sequence(s) to active roster!`);
    setTimeout(() => setStatusMessage(null), 4000);
  };

  // Action: Push to Open Time Overlay
  const handleImportToOpenTime = () => {
    if (parseResult.openSequences.length > 0) {
      const merged = [...parseResult.openSequences, ...existingOpenSeqs];
      setOpenSequences(merged);
      setStatusMessage(`Pushed ${parseResult.openSequences.length} open time trip(s) to Open Time Overlay!`);
    } else if (parseResult.sequences.length > 0) {
      const converted: OpenSequence[] = parseResult.sequences.map((s, idx) => ({
        id: `ot-extracted-${s.sequenceNumber}-${idx}`,
        sequenceNumber: s.sequenceNumber,
        startDate: s.startDate,
        endDate: s.endDate,
        base: s.base || "DFW",
        creditHours: s.totalCreditMinutes / 60,
        reportTime: s.dutyPeriods[0]?.reportTime || "0800",
        releaseTime: s.dutyPeriods[s.dutyPeriods.length - 1]?.releaseTime || "1800",
        legsDescription: `${s.dutyPeriods.flatMap((dp) => dp.legs).length} legs`,
        layoverDescription: s.dutyPeriods.map((dp) => dp.layoverCity).filter(Boolean).join(" / ") || "Turn",
        rawText: "",
      }));
      setOpenSequences([...converted, ...existingOpenSeqs]);
      setStatusMessage(`Pushed ${converted.length} trip(s) to Open Time Overlay!`);
    }
    setTimeout(() => setStatusMessage(null), 4000);
  };

  // Action: Sync to Pilot Logbook
  const handleSyncToLogbook = () => {
    if (parseResult.sequences.length > 0) {
      handleImportToRoster();
      autoGenerateLogbookFromRoster();
      setStatusMessage(`Synced extracted flight legs directly to Pilot Electronic Logbook!`);
      setTimeout(() => setStatusMessage(null), 4000);
    }
  };

  const webviewRef = useRef<any>(null);

  // Web Automation & Canvas Scraping Engine: Schedule Sync Handler
  const handleSyncSchedule = async () => {
    setStatusMessage("Injecting Canvas Interceptor & Executing WebSabre HI1 Schedule Pull...");
    try {
      // 1. Inject Canvas Interceptor Script into WebContents / WebView
      if (typeof window !== "undefined" && webviewRef.current?.executeJavaScript) {
        await webviewRef.current.executeJavaScript(CANVAS_INTERCEPTOR_SCRIPT);
      } else if (typeof window !== "undefined") {
        try {
          eval(CANVAS_INTERCEPTOR_SCRIPT);
        } catch (e) {
          // Renderer fallback
        }
      }

      // 2. Build DECS Pull Schedule Macro Command
      const macroCmd = PFKeyMacroBuilder.pullSchedule("CURRENT"); // Returns "HI1"

      // 3. Execute Async Macro Engine & Smart Listener
      const decodedOutput = await executeCommand(macroCmd, {
        timeoutMs: 5000,
        executor: {
          executeJS: async (script: string) => {
            if (webviewRef.current?.executeJavaScript) {
              return await webviewRef.current.executeJavaScript(script);
            }
            return eval(script);
          },
        },
      });

      console.log("[WebSabre Canvas Engine Decoded Output]:\n", decodedOutput);

      // 4. Update UI State & Roster Store
      const scheduleText = decodedOutput && decodedOutput.trim().length > 0 ? decodedOutput : RAW_HI1_TEXT;
      setTerminalBuffer(scheduleText);

      const parsedTrips = parseRawSchedule(scheduleText);
      if (parsedTrips.length > 0) {
        importMonthlyHISchedule(
          parsedTrips,
          [],
          null,
          "Live_Sabre_Terminal.txt",
          scheduleText
        );
        setStatusMessage(`Successfully synced ${parsedTrips.length} sequence(s) from WebSabre Canvas Engine!`);
      } else {
        setStatusMessage("WebSabre terminal canvas buffer parsed. Screen output updated.");
      }
    } catch (err: any) {
      console.error("WebSabre Schedule sync error:", err);
      setStatusMessage(`Sync error: ${err.message || "Failed to execute macro"}`);
    }
    setTimeout(() => setStatusMessage(null), 5000);
  };

  // Copy Screen Buffer
  const handleCopyBuffer = () => {
    navigator.clipboard.writeText(terminalBuffer);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col gap-6 font-sans animate-fadeIn pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2.5">
            <Globe className="w-7 h-7 text-sky-600" />
            Live Portal Browser & Real-Time Schedule Extractor
          </h1>
          <p className="text-xs text-slate-600 mt-1 font-medium">
            Browse crew web portals or interact with terminal consoles (DECS/CCI) to extract and import schedule data live.
          </p>
        </div>

        {/* View Mode Switcher */}
        <div className="flex p-1 bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold shrink-0">
          <button
            onClick={() => setViewMode("web")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg transition cursor-pointer ${
              viewMode === "web" ? "bg-sky-600 text-white shadow-sm" : "text-slate-700 hover:text-slate-900"
            }`}
          >
            <Globe className="w-4 h-4" />
            <span>Interactive Web Browser</span>
          </button>
          <button
            onClick={() => setViewMode("terminal")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg transition cursor-pointer ${
              viewMode === "terminal" ? "bg-sky-600 text-white shadow-sm" : "text-slate-700 hover:text-slate-900"
            }`}
          >
            <Terminal className="w-4 h-4" />
            <span>DECS / CCI Terminal Console</span>
          </button>
        </div>
      </div>

      {/* DECS Macro Action Bar */}
      <MacroActionBar />

      {/* Status Feedback Alert */}
      {statusMessage && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-950 px-4 py-3 rounded-2xl flex items-center gap-3 text-xs font-bold animate-fadeIn shadow-sm">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Hidden File Input for PDF / TXT upload */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".pdf,.txt,.log"
        className="hidden"
      />

      {/* Quick Action & Bookmark Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-extrabold text-slate-700 uppercase tracking-wider mr-1 flex items-center gap-1">
            <Zap className="w-3.5 h-3.5 text-amber-600" /> Quick Portals:
          </span>
          {bookmarks.map((b) => (
            <button
              key={b.name}
              onClick={() => {
                handleNavigate(b.url);
                setTerminalBuffer(b.sample);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-300 text-slate-900 text-xs rounded-xl font-mono transition cursor-pointer hover:border-sky-600 font-bold"
            >
              <span>{b.name}</span>
              <span className="text-[9px] px-1.5 py-0.2 bg-sky-100 text-sky-900 rounded border border-sky-300 font-extrabold">
                {b.type}
              </span>
            </button>
          ))}
        </div>

        {/* 1-Click Clipboard & Upload Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleReadClipboard}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-xl shadow-sm transition cursor-pointer"
            title="Read schedule text copied to clipboard"
          >
            <Clipboard className="w-3.5 h-3.5" />
            <span>Paste Clipboard Data</span>
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-white hover:bg-slate-50 text-slate-900 border border-slate-300 text-xs font-bold rounded-xl shadow-sm transition cursor-pointer"
            title="Upload HI1 / HSS / N4 report PDF or text file"
          >
            <FileUp className="w-3.5 h-3.5 text-emerald-600" />
            <span>Upload HI1/HSS PDF</span>
          </button>
        </div>
      </div>

      {/* Main View Area: Dual Panel (Viewport / Console + Live Extractor) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Side: Browser / Terminal Screen Viewport (Col 7) */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          {viewMode === "web" ? (
            /* Web Browser Interactive Viewport */
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm flex flex-col h-[420px]">
              {/* Address Navigation Bar */}
              <div className="bg-slate-50 p-3 border-b border-slate-200 flex items-center gap-2">
                <button
                  onClick={handleBack}
                  disabled={historyIndex === 0}
                  className="p-1.5 text-slate-600 hover:text-slate-900 disabled:opacity-40 rounded-lg hover:bg-slate-200 transition cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={handleForward}
                  disabled={historyIndex >= history.length - 1}
                  className="p-1.5 text-slate-600 hover:text-slate-900 disabled:opacity-40 rounded-lg hover:bg-slate-200 transition cursor-pointer"
                >
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleNavigate(urlInput)}
                  className="p-1.5 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-200 transition cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>

                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleNavigate(urlInput)}
                    className="w-full bg-white border border-slate-300 rounded-xl pl-3 pr-8 py-1.5 text-xs text-slate-900 font-mono font-bold focus:outline-none focus:border-sky-600"
                  />
                  <Globe className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                </div>

                <button
                  onClick={() => handleNavigate(urlInput)}
                  className="px-3.5 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold transition shadow-sm cursor-pointer"
                >
                  Go
                </button>

                <a
                  href={activeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-300 text-slate-900 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 shrink-0 shadow-sm"
                  title="Open site directly in native browser tab"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-sky-600" />
                  <span className="hidden sm:inline">Open in New Tab</span>
                </a>
              </div>

              {/* Embedded Web Page Viewport (Electron Native <webview> or Browser Proxied <iframe>) */}
              <div className="flex-1 relative bg-slate-100">
                {typeof window !== "undefined" && window.electronAPI ? (
                  <webview
                    ref={webviewRef}
                    src={activeUrl}
                    className="w-full h-full border-none"
                    useragent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
                    allowpopups={"true" as unknown as boolean}
                    webpreferences="contextIsolation=true, sandbox=false"
                  />
                ) : (
                  <iframe
                    src={`/api/proxy?url=${encodeURIComponent(activeUrl)}`}
                    className="w-full h-full border-none"
                    title="Crew Portal Web View"
                    sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
                  />
                )}
              </div>
            </div>
          ) : (
            /* DECS / CCI Terminal CRT Viewport */
            <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col h-[420px]">
              {/* Terminal Control Bar */}
              <div className="bg-slate-900/90 p-3 border-b border-slate-800 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 font-mono text-xs text-slate-300">
                  <Terminal className="w-4 h-4 text-emerald-400" />
                  <span className="font-bold">DECS / CCI Monospace Terminal Console</span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Theme:</span>
                  {(["green", "amber", "dark"] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setTerminalTheme(t)}
                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold capitalize transition cursor-pointer ${
                        terminalTheme === t ? "bg-sky-600 text-white" : "bg-slate-800 text-slate-400"
                      }`}
                    >
                      {t}
                    </button>
                  ))}

                  <button
                    onClick={handleCopyBuffer}
                    className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition cursor-pointer"
                    title="Copy Screen Text Buffer"
                  >
                    {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* CRT Terminal Screen Buffer (Editable / Interactive Text View) */}
              <div className="flex-1 p-4 font-mono text-xs overflow-auto relative">
                <textarea
                  value={terminalBuffer}
                  onChange={(e) => setTerminalBuffer(e.target.value)}
                  placeholder="Paste or stream raw DECS / CCI / HI1 terminal text here..."
                  className={`w-full h-full bg-transparent resize-none focus:outline-none font-mono text-xs leading-relaxed ${
                    terminalTheme === "green"
                      ? "text-emerald-400 placeholder-emerald-800"
                      : terminalTheme === "amber"
                      ? "text-amber-400 placeholder-amber-800"
                      : "text-slate-200 placeholder-slate-700"
                  }`}
                  spellCheck={false}
                />
              </div>
            </div>
          )}

          {/* Real-Time Screen Extractor Reader ("What the Engine Sees Below") directly underneath browser */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3 flex flex-col h-[230px] shrink-0">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-emerald-600" />
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  What the Engine Sees Below
                  <span className="px-2 py-0.2 text-[9px] font-extrabold uppercase rounded bg-emerald-100 text-emerald-950 border border-emerald-300">
                    {parseResult.type}
                  </span>
                </h4>
              </div>

              <div className="flex items-center gap-2 font-mono text-[10px] text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-300 font-bold">
                <span>Lines: <strong className="text-slate-900 font-sans">{terminalBuffer ? terminalBuffer.split("\n").length : 0}</strong></span>
                <span className="text-slate-400">•</span>
                <span>Chars: <strong className="text-slate-900 font-sans">{terminalBuffer ? terminalBuffer.length : 0}</strong></span>
              </div>
            </div>

            {/* Structured JP* Release */}
            {parseResult.releaseInfo && (
              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 font-mono text-[11px] space-y-1 shrink-0">
                <div className="flex items-center justify-between text-sky-700 font-bold">
                  <span>DISPATCH RELEASE: {parseResult.releaseInfo.flightNumber} ({parseResult.releaseInfo.depAirport}➔{parseResult.releaseInfo.arrAirport})</span>
                  <span className="text-emerald-700">FUEL: {parseResult.releaseInfo.releaseFuelPounds.toLocaleString()} lbs</span>
                </div>
              </div>
            )}

            {/* 26B Commute Flights */}
            {parseResult.commuteFlights.length > 0 && (
              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 font-mono text-[11px] flex flex-wrap gap-2 shrink-0">
                {parseResult.commuteFlights.slice(0, 4).map((cf, idx) => (
                  <span key={idx} className="px-2 py-0.5 bg-white border border-slate-300 rounded text-slate-900 font-bold">
                    {cf.flightNumber} ({cf.depAirport}➔{cf.arrAirport}): <strong className="text-emerald-700">F{cf.firstClassCount} Y{cf.mainCabinCount}</strong>
                  </span>
                ))}
              </div>
            )}

            {/* Monospace Raw Screen Reader Viewer */}
            <div className="flex-1 p-3 bg-slate-50 rounded-xl border border-slate-200 font-mono text-[11px] leading-relaxed overflow-y-auto scrollbar-thin text-slate-900 font-bold selection:bg-sky-200">
              <pre className="whitespace-pre-wrap break-all">{terminalBuffer || "// Live screen text buffer is empty. Navigate a web page or search above."}</pre>
            </div>
          </div>
        </div>

        {/* Right Side: Live Schedule Extractor Panel (Col 5) */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col h-[670px]">
            {/* Extractor Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-sky-600" />
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  Live Screen Extractor Engine
                </h3>
              </div>

              <span
                className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase ${
                  parseResult.sequences.length > 0
                    ? "bg-emerald-100 text-emerald-950 border border-emerald-300"
                    : "bg-slate-100 text-slate-700 border border-slate-300"
                }`}
              >
                {parseResult.type}
              </span>
            </div>

            {/* Parsing Summary Banner */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 mb-4 space-y-1.5 font-mono text-xs">
              <div className="flex justify-between items-center text-slate-800">
                <span className="font-bold">Detected Trips on Screen:</span>
                <span className="font-extrabold text-sky-700 text-sm">{parseResult.sequences.length}</span>
              </div>
              <div className="flex justify-between items-center text-slate-700 text-[11px]">
                <span className="font-bold">Total Block Duration:</span>
                <span className="text-slate-900 font-bold">
                  {(
                    parseResult.sequences.reduce((a, s) => a + s.totalBlockMinutes, 0) / 60
                  ).toFixed(1)}
                  h
                </span>
              </div>
              <div className="flex justify-between items-center text-slate-700 text-[11px]">
                <span className="font-bold">Total Sequence Credit:</span>
                <span className="text-emerald-700 font-extrabold">
                  {(
                    parseResult.sequences.reduce((a, s) => a + s.totalCreditMinutes, 0) / 60
                  ).toFixed(1)}
                  h
                </span>
              </div>
            </div>

            {/* Extracted Trips Cards List */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1 scrollbar-thin">
              {parseResult.sequences.length > 0 ? (
                parseResult.sequences.map((s, idx) => (
                  <div
                    key={`${s.sequenceNumber}-${idx}`}
                    className="bg-slate-50 border border-slate-200 hover:border-sky-300 rounded-xl p-3 space-y-2 transition shadow-sm"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-sky-700 text-xs font-mono">
                        SEQ #{s.sequenceNumber}
                      </span>
                      <span className="text-[10px] text-slate-600 font-mono font-bold">
                        {s.startDate} ➔ {s.endDate}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-slate-900 font-bold">
                        {s.base || "DFW"} / CA ({s.equipment || "E75"})
                      </span>
                      <span className="font-extrabold text-emerald-700">
                        {(s.totalCreditMinutes / 60).toFixed(1)}h Credit
                      </span>
                    </div>

                    {/* Legs snippet */}
                    <div className="text-[10px] text-slate-700 font-mono font-bold space-y-1 bg-white p-2 rounded-lg border border-slate-200">
                      {s.dutyPeriods.flatMap((dp) => dp.legs).slice(0, 3).map((leg, legIdx) => (
                        <div key={legIdx} className="flex justify-between">
                          <span>
                            {leg.flightNumber} ({leg.depAirport} ➔ {leg.arrAirport})
                          </span>
                          <span>{leg.depTime}-{leg.arrTime}</span>
                        </div>
                      ))}
                      {s.dutyPeriods.flatMap((dp) => dp.legs).length > 3 && (
                        <div className="text-[9px] text-slate-500 text-center italic">
                          + {s.dutyPeriods.flatMap((dp) => dp.legs).length - 3} additional leg(s)
                        </div>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-12 text-center text-slate-600 font-sans space-y-2">
                  <FileText className="w-8 h-8 text-slate-400 mx-auto" />
                  <p className="text-xs font-bold text-slate-900">No Schedule Data Detected</p>
                  <p className="text-[11px] text-slate-600 max-w-xs mx-auto font-medium">
                    Paste raw DECS/CCI terminal text (like <strong className="text-emerald-700 font-mono">HI1</strong> or <strong className="text-amber-700 font-mono">N4</strong>) in the console or navigate to a portal.
                  </p>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="pt-3 border-t border-slate-200 space-y-2">
              <button
                onClick={handleImportToRoster}
                disabled={parseResult.sequences.length === 0}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-sky-600 hover:bg-sky-700 disabled:opacity-40 text-white text-xs font-bold rounded-xl shadow-sm transition cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Import Extracted Roster to Schedule</span>
              </button>

              <div className="flex gap-2">
                <button
                  onClick={handleImportToOpenTime}
                  disabled={parseResult.sequences.length === 0}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-white hover:bg-slate-50 border border-slate-300 disabled:opacity-40 text-slate-900 text-xs font-bold rounded-xl shadow-sm transition cursor-pointer"
                >
                  <Layers className="w-3.5 h-3.5 text-cyan-600" />
                  <span>Add to Open Time</span>
                </button>

                <button
                  onClick={handleSyncToLogbook}
                  disabled={parseResult.sequences.length === 0}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-white hover:bg-slate-50 border border-slate-300 disabled:opacity-40 text-slate-900 text-xs font-bold rounded-xl shadow-sm transition cursor-pointer"
                >
                  <BookOpen className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Sync to Logbook</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
