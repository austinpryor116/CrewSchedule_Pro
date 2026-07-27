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

  // Copy Screen Buffer
  const handleCopyBuffer = () => {
    navigator.clipboard.writeText(terminalBuffer);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col gap-6 font-sans animate-fadeIn pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-extrabold text-white flex items-center gap-2.5">
            <Globe className="w-7 h-7 text-sky-400" />
            Live Portal Browser & Real-Time Schedule Extractor
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Browse crew web portals or interact with terminal consoles (DECS/CCI) to extract and import schedule data live.
          </p>
        </div>

        {/* View Mode Switcher */}
        <div className="flex p-1 bg-slate-900 border border-slate-800 rounded-xl text-xs font-bold shrink-0">
          <button
            onClick={() => setViewMode("web")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg transition cursor-pointer ${
              viewMode === "web" ? "bg-sky-600 text-white shadow-sm" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Globe className="w-4 h-4" />
            <span>Interactive Web Browser</span>
          </button>
          <button
            onClick={() => setViewMode("terminal")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg transition cursor-pointer ${
              viewMode === "terminal" ? "bg-sky-600 text-white shadow-sm" : "text-slate-400 hover:text-slate-200"
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
        <div className="bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 px-4 py-3 rounded-2xl flex items-center gap-3 text-xs font-bold animate-fadeIn">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
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
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-2xl border border-slate-800/80 backdrop-blur-md">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1 flex items-center gap-1">
            <Zap className="w-3.5 h-3.5 text-amber-400" /> Quick Portals:
          </span>
          {bookmarks.map((b) => (
            <button
              key={b.name}
              onClick={() => {
                handleNavigate(b.url);
                setTerminalBuffer(b.sample);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-950/80 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs rounded-xl font-mono transition cursor-pointer hover:border-sky-500/50"
            >
              <span>{b.name}</span>
              <span className="text-[9px] px-1.5 py-0.2 bg-sky-950 text-sky-300 rounded border border-sky-500/30">
                {b.type}
              </span>
            </button>
          ))}
        </div>

        {/* 1-Click Clipboard & Upload Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleReadClipboard}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-sky-600 to-cyan-600 hover:from-sky-500 hover:to-cyan-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-sky-600/20 transition cursor-pointer"
            title="Read schedule text copied to clipboard"
          >
            <Clipboard className="w-3.5 h-3.5" />
            <span>Paste Clipboard Data</span>
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
            title="Upload HI1 / HSS / N4 report PDF or text file"
          >
            <FileUp className="w-3.5 h-3.5 text-emerald-400" />
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
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col h-[420px]">
              {/* Address Navigation Bar */}
              <div className="bg-slate-950/90 p-3 border-b border-slate-800 flex items-center gap-2">
                <button
                  onClick={handleBack}
                  disabled={historyIndex === 0}
                  className="p-1.5 text-slate-400 hover:text-white disabled:opacity-40 rounded-lg hover:bg-slate-800 transition cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={handleForward}
                  disabled={historyIndex >= history.length - 1}
                  className="p-1.5 text-slate-400 hover:text-white disabled:opacity-40 rounded-lg hover:bg-slate-800 transition cursor-pointer"
                >
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleNavigate(urlInput)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>

                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleNavigate(urlInput)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-3 pr-8 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-sky-500"
                  />
                  <Globe className="w-3.5 h-3.5 text-slate-500 absolute right-3 top-1/2 -translate-y-1/2" />
                </div>

                <button
                  onClick={() => handleNavigate(urlInput)}
                  className="px-3.5 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold transition shadow-sm cursor-pointer"
                >
                  Go
                </button>

                <a
                  href={activeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 shrink-0"
                  title="Open site directly in native browser tab"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-sky-400" />
                  <span className="hidden sm:inline">Open in New Tab</span>
                </a>
              </div>

              {/* Proxied Web Page Frame */}
              <div className="flex-1 relative bg-slate-950">
                <iframe
                  src={`/api/proxy?url=${encodeURIComponent(activeUrl)}`}
                  className="w-full h-full border-none"
                  title="Crew Portal Web View"
                  sandbox="allow-scripts allow-same-origin allow-forms"
                />
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
          <div className="bg-[#151c2c] border border-slate-700/80 rounded-2xl p-4 shadow-xl space-y-3 flex flex-col h-[230px] shrink-0">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-emerald-400" />
                <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  What the Engine Sees Below
                  <span className="px-2 py-0.2 text-[9px] font-extrabold uppercase rounded bg-emerald-950 text-emerald-300 border border-emerald-500/30">
                    {parseResult.type}
                  </span>
                </h4>
              </div>

              <div className="flex items-center gap-2 font-mono text-[10px] text-slate-400 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
                <span>Lines: <strong className="text-white font-sans">{terminalBuffer ? terminalBuffer.split("\n").length : 0}</strong></span>
                <span className="text-slate-600">•</span>
                <span>Chars: <strong className="text-white font-sans">{terminalBuffer ? terminalBuffer.length : 0}</strong></span>
              </div>
            </div>

            {/* Structured JP* Release */}
            {parseResult.releaseInfo && (
              <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800 font-mono text-[11px] space-y-1 shrink-0">
                <div className="flex items-center justify-between text-sky-400 font-bold">
                  <span>DISPATCH RELEASE: {parseResult.releaseInfo.flightNumber} ({parseResult.releaseInfo.depAirport}➔{parseResult.releaseInfo.arrAirport})</span>
                  <span className="text-emerald-400">FUEL: {parseResult.releaseInfo.releaseFuelPounds.toLocaleString()} lbs</span>
                </div>
              </div>
            )}

            {/* 26B Commute Flights */}
            {parseResult.commuteFlights.length > 0 && (
              <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800 font-mono text-[11px] flex flex-wrap gap-2 shrink-0">
                {parseResult.commuteFlights.slice(0, 4).map((cf, idx) => (
                  <span key={idx} className="px-2 py-0.5 bg-slate-900 border border-slate-800 rounded text-slate-300">
                    {cf.flightNumber} ({cf.depAirport}➔{cf.arrAirport}): <strong className="text-emerald-400">F{cf.firstClassCount} Y{cf.mainCabinCount}</strong>
                  </span>
                ))}
              </div>
            )}

            {/* Monospace Raw Screen Reader Viewer */}
            <div className="flex-1 p-3 bg-slate-950 rounded-xl border border-slate-850 font-mono text-[11px] leading-relaxed overflow-y-auto scrollbar-thin text-emerald-400 selection:bg-emerald-900 selection:text-white">
              <pre className="whitespace-pre-wrap break-all">{terminalBuffer || "// Live screen text buffer is empty. Navigate a web page or search above."}</pre>
            </div>
          </div>
        </div>

        {/* Right Side: Live Schedule Extractor Panel (Col 5) */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 shadow-xl backdrop-blur-md flex flex-col h-[670px]">
            {/* Extractor Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-sky-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Live Screen Extractor Engine
                </h3>
              </div>

              <span
                className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase ${
                  parseResult.sequences.length > 0
                    ? "bg-emerald-950 text-emerald-400 border border-emerald-500/40"
                    : "bg-slate-800 text-slate-400"
                }`}
              >
                {parseResult.type}
              </span>
            </div>

            {/* Parsing Summary Banner */}
            <div className="bg-slate-950/80 border border-slate-850 rounded-xl p-3 mb-4 space-y-1.5 font-mono text-xs">
              <div className="flex justify-between items-center text-slate-300">
                <span>Detected Trips on Screen:</span>
                <span className="font-extrabold text-sky-400 text-sm">{parseResult.sequences.length}</span>
              </div>
              <div className="flex justify-between items-center text-slate-400 text-[11px]">
                <span>Total Block Duration:</span>
                <span className="text-slate-200">
                  {(
                    parseResult.sequences.reduce((a, s) => a + s.totalBlockMinutes, 0) / 60
                  ).toFixed(1)}
                  h
                </span>
              </div>
              <div className="flex justify-between items-center text-slate-400 text-[11px]">
                <span>Total Sequence Credit:</span>
                <span className="text-emerald-400 font-bold">
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
                    className="bg-slate-950/90 border border-slate-800 hover:border-sky-500/50 rounded-xl p-3 space-y-2 transition"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-sky-300 text-xs font-mono">
                        SEQ #{s.sequenceNumber}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {s.startDate} ➔ {s.endDate}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-slate-300">
                        {s.base || "DFW"} / CA ({s.equipment || "E75"})
                      </span>
                      <span className="font-extrabold text-emerald-400">
                        {(s.totalCreditMinutes / 60).toFixed(1)}h Credit
                      </span>
                    </div>

                    {/* Legs snippet */}
                    <div className="text-[10px] text-slate-400 font-mono space-y-1 bg-slate-900/60 p-2 rounded-lg">
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
                <div className="py-12 text-center text-slate-500 font-sans space-y-2">
                  <FileText className="w-8 h-8 text-slate-600 mx-auto" />
                  <p className="text-xs font-bold text-slate-400">No Schedule Data Detected</p>
                  <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
                    Paste raw DECS/CCI terminal text (like <strong className="text-emerald-400 font-mono">HI1</strong> or <strong className="text-amber-400 font-mono">N4</strong>) in the console or navigate to a portal.
                  </p>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="pt-3 border-t border-slate-800 space-y-2">
              <button
                onClick={handleImportToRoster}
                disabled={parseResult.sequences.length === 0}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-sky-600 to-cyan-600 hover:from-sky-500 hover:to-cyan-500 disabled:opacity-40 text-white text-xs font-bold rounded-xl shadow-lg shadow-sky-600/20 transition cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Import Extracted Roster to Schedule</span>
              </button>

              <div className="flex gap-2">
                <button
                  onClick={handleImportToOpenTime}
                  disabled={parseResult.sequences.length === 0}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 text-xs font-bold rounded-xl transition cursor-pointer"
                >
                  <Layers className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Add to Open Time</span>
                </button>

                <button
                  onClick={handleSyncToLogbook}
                  disabled={parseResult.sequences.length === 0}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 text-xs font-bold rounded-xl transition cursor-pointer"
                >
                  <BookOpen className="w-3.5 h-3.5 text-emerald-400" />
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
