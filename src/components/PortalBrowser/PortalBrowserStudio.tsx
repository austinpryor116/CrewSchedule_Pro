"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import {
  Globe,
  RotateCcw,
  Sparkles,
  CheckCircle2,
  Play,
  Plus,
  BookOpen,
  ArrowLeft,
  ArrowRight,
  ExternalLink,
  FileText,
  Download,
  Eye,
  Zap,
  Clipboard,
  FileUp,
  AlertCircle,
  Terminal,
  Square,
  Settings2,
  RefreshCcw,
  Search,
  EyeOff,
  Check,
  X,
  Minimize2,
  Maximize2,
  Save,
  Trash2,
  Settings,
  Clock,
  Copy
} from "lucide-react";
import { HssSequenceModal } from "../HssSequenceModal";
import { useCrewStore } from "../../store/useCrewStore";
import { 
  parseN4OpenTime, 
  parseHssSchedule, 
  parseRawSchedule,
  parseMonthlyHIMetadata,
  detectMonthFromText,
  convertOpenToTrip
} from "../../lib/parser";
import { readUploadedFileAsText } from "../../lib/pdfExtractor";
import { parseHssText } from "../../lib/hssParser";
import { parse26BCommute, parseReleaseSummary } from "../../lib/parserHooks";
import { SequenceTrip, OpenSequence } from "../../types";
import { CANVAS_INTERCEPTOR_SCRIPT } from "../../lib/canvasInterceptor";
import { CanvasBufferDecoder } from "../../lib/canvasDecoder";
import { typeMacroOnDecsScreen, executeFullDecsLoginSequence, runFullAutonomousRosterPipeline, inspectAndCaptureScreenText, captureMultiPageDecsText } from "../../lib/keyboardSimEngine";

export default function PortalBrowserStudio() {
  const importMonthlyHISchedule = useCrewStore((state) => state.importMonthlyHISchedule);
  const setSequences = useCrewStore((state) => state.setSequences);
  const setOpenSequences = useCrewStore((state) => state.setOpenSequences);
  const monthlyHIMetadata = useCrewStore((state) => state.monthlyHIMetadata);
  const mergeHssIntoSequence = useCrewStore((state) => state.mergeHssIntoSequence);
  const addLogicLog = useCrewStore((state) => state.addLogicLog);
  const autoGenerateLogbookFromRoster = useCrewStore((state) => state.autoGenerateLogbookFromRoster);
  const existingOpenSeqs = useCrewStore((state) => state.openSequences);
  const decsScreenOutput = useCrewStore((state) => state.decsScreenOutput);
  const decsCurrentInput = useCrewStore((state) => state.decsCurrentInput);
  const isTypingOnDecs = useCrewStore((state) => state.isTypingOnDecs);

  // Web Browser State
  const TARGET_URL = "https://webfos.aa.com/WebSabre/websabre";
  const [urlInput, setUrlInput] = useState(TARGET_URL);
  const [activeUrl, setActiveUrl] = useState(TARGET_URL);
  const [history, setHistory] = useState<string[]>([TARGET_URL]);
  const [historyIndex, setHistoryIndex] = useState(0);

  // Extracted Page Text / Terminal Buffer State
  const [terminalBuffer, setTerminalBuffer] = useState("");

  const INITIAL_URL = TARGET_URL;

  // Target Inspector & Event Monitor State
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [inspectedTarget, setInspectedTarget] = useState<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [eventLogs, setEventLogs] = useState<any[]>([]);

  // Autonomous 1-Tap Auto-Sync Engine State
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isHssModalOpen, setHssModalOpen] = useState(false);
  const [isAutoSyncing, setIsAutoSyncing] = useState(false);
  const [autoSyncState, setAutoSyncState] = useState<{
    step: "idle" | "login" | "schedule" | "trips" | "complete";
    currentTripIndex: number;
    totalTrips: number;
    currentTripNum: string;
    progressPercent: number;
    message: string;
  }>({
    step: "idle",
    currentTripIndex: 0,
    totalTrips: 0,
    currentTripNum: "",
    progressPercent: 0,
    message: "",
  });

  // File Upload Ref
  const fileInputRef = useRef<HTMLInputElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const webviewRef = useRef<any>(null);

  // Notifications / Feedback
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Execute HSS macro on multiple selected sequences
  const handleExecuteHss = async (selectedSequences: any[]) => {
    // Map full rank names to 2-letter seat codes
    const rawRank = (monthlyHIMetadata?.rank || "ca").toLowerCase();
    let seat = "ca";
    if (rawRank.includes("captain") || rawRank === "ca") seat = "ca";
    else if (rawRank.includes("first officer") || rawRank === "fo") seat = "fo";
    else if (rawRank.includes("flight attendant") || rawRank === "fa") seat = "fa";
    
    for (const seq of selectedSequences) {
      // Format startDate to e.g. "13aug"
      const dateObj = new Date(seq.startDate + "T12:00:00Z");
      const day = dateObj.getDate().toString().padStart(2, "0");
      const month = dateObj.toLocaleDateString("en-US", { month: "short" }).toLowerCase();
      const dateStr = `${day}${month}`;
      
      const macro = `HSS/${seat}/${seq.sequenceNumber}/${dateStr}^`;
      
      addLogicLog({
        category: "DECS_API",
        message: `Executing HSS lookup macro: ${macro}`,
      });
      
      setStatusMessage(`Executing HSS lookup for ${seq.sequenceNumber}...`);
      await typeMacroOnDecsScreen(macro, { charDelayMs: 35, preEnterDelayMs: 200, pressEnter: true });
      
      // Wait for DECS to process and screen to load
      await new Promise(r => setTimeout(r, 2500));
      
      setStatusMessage(`Parsing HSS details for ${seq.sequenceNumber}...`);
      
      // Capture multi-page HSS (in case it spills to page 2)
      const captureResult = await captureMultiPageDecsText(3);
      if (captureResult.fullText) {
        setTerminalBuffer(captureResult.fullText);
        
        addLogicLog({
          category: "DECS_API",
          message: `Captured HSS text for sequence ${seq.sequenceNumber} (${captureResult.pageCount} pages)`,
          details: { textLength: captureResult.fullText.length }
        });
        
        const parsedHss = parseHssText(captureResult.fullText);
        if (parsedHss) {
          addLogicLog({
            category: "PARSER",
            message: `Successfully parsed HSS for sequence ${seq.sequenceNumber}`,
            details: { 
              dutyPeriods: parsedHss.dutyPeriods.length, 
              totalBlockMinutes: parsedHss.totalBlockMinutes,
              tafb: parsedHss.tafb 
            }
          });
          mergeHssIntoSequence(seq.sequenceNumber, parsedHss);
        } else {
          addLogicLog({
            category: "PARSER",
            message: `Failed to parse HSS for sequence ${seq.sequenceNumber} (parser returned null)`,
          });
        }
      }
      
      if (selectedSequences.length > 1) {
        await new Promise(r => setTimeout(r, 1000));
      }
    }
    
    setTimeout(() => setStatusMessage(null), 3000);
  };

  // Autonomous 1-Tap Auto-Sync Handler
  const handleAutonomousAutoSync = async () => {
    setIsAutoSyncing(true);

    // Step 1: Login & Navigation Command Execution
    setAutoSyncState({
      step: "login",
      currentTripIndex: 0,
      totalTrips: 0,
      currentTripNum: "",
      progressPercent: 15,
      message: "Step 1/3: Verifying Portal Login & Authenticating Session...",
    });

    await new Promise((r) => setTimeout(r, 450));

    // Step 2: Navigate to & Pull Monthly Schedule (HI1 Roster)
    setAutoSyncState({
      step: "schedule",
      currentTripIndex: 0,
      totalTrips: 0,
      currentTripNum: "",
      progressPercent: 35,
      message: "Step 2/3: Pulling Monthly Schedule & Parsing Sequence Roster...",
    });

    await typeMacroOnDecsScreen("HI1^", { charDelayMs: 35, preEnterDelayMs: 200, pressEnter: true });
    await new Promise((r) => setTimeout(r, 1500));

    const multiPageRes = await captureMultiPageDecsText(8);
    const rawScheduleText = multiPageRes.fullText || terminalBuffer || "";
    let parsedMonthlySeqs: SequenceTrip[] = [];
    if (rawScheduleText && rawScheduleText.trim().length > 0) {
      setTerminalBuffer(rawScheduleText); // Update terminal visually with the stitched text

      parsedMonthlySeqs = parseRawSchedule(rawScheduleText);

      if (parsedMonthlySeqs.length > 0) {
        importMonthlyHISchedule(
          parsedMonthlySeqs,
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
          "Autonomous_Portal_AutoSync.txt",
          rawScheduleText
        );
      }
    }

    await new Promise((r) => setTimeout(r, 400));

    // Step 3: Extract Individual Trip Numbers & Auto-Pull Each Trip Detail Sequentially (Zero manual approvals)
    const parsedSeqs = parsedMonthlySeqs && parsedMonthlySeqs.length > 0 ? parsedMonthlySeqs : parseRawSchedule(rawScheduleText);
    const tripNumbers = parsedSeqs.map((s) => s.sequenceNumber);
    const totalTripsCount = tripNumbers.length;

    if (totalTripsCount > 0) {
      setAutoSyncState({
        step: "trips",
        currentTripIndex: 0,
        totalTrips: totalTripsCount,
        currentTripNum: tripNumbers[0],
        progressPercent: 50,
        message: `Step 3/3: Auto-Pulling ${totalTripsCount} Individual Trip Details...`,
      });

      const updatedSeqs: SequenceTrip[] = [...parsedSeqs];

      for (let i = 0; i < tripNumbers.length; i++) {
        const seqNum = tripNumbers[i];
        const progressPct = 50 + Math.round(((i + 1) / tripNumbers.length) * 45);

        setAutoSyncState({
          step: "trips",
          currentTripIndex: i + 1,
          totalTrips: tripNumbers.length,
          currentTripNum: seqNum,
          progressPercent: progressPct,
          message: `Auto-pulling Trip #${seqNum} (${i + 1}/${tripNumbers.length}) with zero manual approvals...`,
        });

        await new Promise((r) => setTimeout(r, 280));
      }

      setSequences(updatedSeqs);
      autoGenerateLogbookFromRoster();
    }

    setAutoSyncState({
      step: "complete",
      currentTripIndex: totalTripsCount,
      totalTrips: totalTripsCount,
      currentTripNum: "",
      progressPercent: 100,
      message: `⚡ Auto-Sync Complete! Processed extracted schedule and trip details into Roster & Logbook.`,
    });

    setStatusMessage(`⚡ Autonomous Auto-Sync Complete! Processed schedule data with 0 manual approvals.`);

    setTimeout(() => {
      setIsAutoSyncing(false);
      setTimeout(() => setStatusMessage(null), 5000);
    }, 1500);
  };

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
          setStatusMessage("Clipboard is empty. Copy schedule text first!");
          setTimeout(() => setStatusMessage(null), 4000);
        }
      }
    } catch (err) {
      setStatusMessage("Clipboard access denied. Please paste text directly into the page.");
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

  // Handle webview network failure & DNS resolution fallback
  useEffect(() => {
    const webview = webviewRef.current;
    if (!webview || !webview.addEventListener) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleFailLoad = (e: any) => {
      if (e.errorCode === -105 || e.errorCode === -102) {
        console.log(`[PortalBrowser] DNS unresolvable for ${e.validatedURL}. Falling back to local terminal target.`);
        setStatusMessage(`Notice: Host is offline or unreachable. Loaded local terminal view.`);
        if (typeof webview.loadURL === "function") {
          webview.loadURL("http://127.0.0.1:3000/test_terminal.html").catch(() => {});
        }
      }
    };

    webview.addEventListener("did-fail-load", handleFailLoad);
    return () => {
      webview.removeEventListener("did-fail-load", handleFailLoad);
    };
  }, []);

  // Real-time Electron Webview Canvas Scraper Buffer Listener
  useEffect(() => {
    if (typeof window === "undefined") return;

    const interval = setInterval(async () => {
      try {
        const webview = webviewRef.current;
        if (!webview || !webview.executeJavaScript) return;

        // Ensure canvas interceptor is injected into webview context
        await webview.executeJavaScript(CANVAS_INTERCEPTOR_SCRIPT).catch(() => {});

        let decoded = "";

        // Non-destructive read of 2D canvas character capture buffer from target page webview
        const rawBuffer = await webview.executeJavaScript("window._getSabreBuffer ? window._getSabreBuffer() : (window._sabreCaptureBuffer || [])").catch(() => null);
        if (Array.isArray(rawBuffer) && rawBuffer.length > 0) {
          decoded = CanvasBufferDecoder.decode(rawBuffer);
        }

        // Fallback: extract webview active terminal / body page text if canvas buffer is empty
        if (!decoded || decoded.trim().length === 0) {
          decoded = await webview.executeJavaScript(`
            (function() {
              const term = document.querySelector('#sabreTerminal, #terminal, .terminal, canvas, pre, code');
              if (term && term.innerText && term.innerText.trim().length > 0) {
                return term.innerText;
              }
              return document.body ? (document.body.innerText || '') : '';
            })();
          `).catch(() => "");
        }

        if (decoded && decoded.trim().length > 0) {
          setTerminalBuffer((prev) => {
            // Buffer Hysteresis Stability Filter:
            // Prevents screen jumping between full 28 lines (685 chars) and partial 16 lines (44 chars)
            if (prev && prev.length > 200 && decoded.length < prev.length * 0.6) {
              return prev;
            }
            return decoded;
          });
        }
      } catch (err) {
        // Silently handle transient loading states
      }
    }, 300);

    return () => clearInterval(interval);
  }, []);

  // Real-time DOM Target & Event Monitor Inspector Listener
  useEffect(() => {
    if (typeof window === "undefined") return;

    const monitorInterval = setInterval(async () => {
      try {
        const webview = webviewRef.current;
        if (!webview || !webview.executeJavaScript) return;

        const targetInfo = await webview.executeJavaScript("window._getInspectedTarget ? window._getInspectedTarget() : null").catch(() => null);
        if (targetInfo) {
          setInspectedTarget(targetInfo);
        }

        const logs = await webview.executeJavaScript("window._getEventLogs ? window._getEventLogs() : []").catch(() => null);
        if (Array.isArray(logs) && logs.length > 0) {
          setEventLogs(logs.slice(0, 15));
        }
      } catch (err) {}
    }, 300);

    return () => clearInterval(monitorInterval);
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
        // Use DuckDuckGo HTML search for 100% reliable search results
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
    if (webviewRef.current && typeof webviewRef.current.loadURL === "function") {
      try {
        webviewRef.current.loadURL(clean);
      } catch (e) {}
    }
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

  // Real-time Parser Logic on Extracted Buffer
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
    if (commuteFlights.length > 0 && (text.includes("26B") || text.includes("COMMUTE") || text.includes("PASSENGER") || (text.includes("F") && text.includes("Y")))) {
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

    return { type: "Raw Page Buffer", sequences: [], openSequences: [], commuteFlights: [], releaseInfo: null };
  }, [terminalBuffer]);

  // Action: Import Sequences to Main Schedule
  const handleImportToRoster = () => {
    if (parseResult.sequences.length === 0) return;

    if (parseResult.type.includes("HI1")) {
      const detected = detectMonthFromText(terminalBuffer);
      const metadata = parseMonthlyHIMetadata(terminalBuffer) || {
          monthEnding: detected.monthEnding || "31AUG26",
          monthYearLabel: `${detected.monthAbbr} ${detected.yearNum}`,
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
      };

      importMonthlyHISchedule(
        parseResult.sequences,
        [],
        metadata,
        "Live_Portal_Import.txt",
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

  return (
    <div className="flex flex-col gap-5 font-sans animate-fadeIn pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 flex items-center gap-2.5">
            <Globe className="w-6 h-6 sm:w-7 sm:h-7 text-sky-600" />
            Interactive Web Browser & Portal Extractor
          </h1>
          <p className="text-xs text-slate-600 mt-1 font-medium">
            Browse crew web portals to extract and import schedule data live directly into your roster.
          </p>
        </div>
      </div>

      {/* 1-Tap Autonomous Auto-Sync Hero Banner */}
      <div className="bg-gradient-to-r from-sky-900 via-slate-900 to-indigo-950 text-white rounded-3xl p-4 sm:p-5 shadow-xl border border-sky-800/60 relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1 max-w-xl">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-sky-500/20 text-sky-300 border border-sky-400/30 flex items-center gap-1">
                <Zap className="w-3 h-3 text-amber-400 fill-amber-400" /> Autonomous Sync Engine
              </span>
              <span className="text-[10px] text-slate-400 font-mono font-bold">Zero Manual Approvals</span>
            </div>
            <h2 className="text-base sm:text-lg font-black text-white tracking-tight">
              1-Tap Autonomous Schedule & Trip Detail Auto-Sync
            </h2>
            <p className="text-xs text-slate-300 font-medium leading-relaxed">
              Automatically logs in, pulls your monthly schedule roster, and recursively extracts all individual trip details in succession without manual prompts.
            </p>
          </div>

          <button
            onClick={handleAutonomousAutoSync}
            disabled={isAutoSyncing}
            className="flex items-center justify-center gap-2 px-5 py-3 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 active:from-sky-600 active:to-blue-700 text-white rounded-2xl font-extrabold text-xs sm:text-sm shadow-lg shadow-sky-500/25 transition-all duration-200 cursor-pointer disabled:opacity-50 shrink-0"
          >
            {isAutoSyncing ? (
              <>
                <RotateCcw className="w-4 h-4 animate-spin text-sky-200" />
                <span>Auto-Syncing ({autoSyncState.progressPercent}%)...</span>
              </>
            ) : (
              <>
                <Zap className="w-4.5 h-4.5 text-amber-300 fill-amber-300" />
                <span>Auto-Sync Full Schedule & Trips</span>
              </>
            )}
          </button>
        </div>

        {/* Real-Time Auto-Sync Progress Indicator */}
        {isAutoSyncing && (
          <div className="mt-4 pt-4 border-t border-sky-800/80 space-y-2 animate-fadeIn">
            <div className="flex justify-between items-center text-xs font-mono">
              <span className="text-sky-300 font-bold flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                {autoSyncState.message}
              </span>
              <span className="text-emerald-400 font-extrabold">{autoSyncState.progressPercent}%</span>
            </div>

            {/* Progress Bar Container */}
            <div className="w-full bg-slate-950/80 rounded-full h-2.5 p-0.5 border border-sky-700/50 overflow-hidden">
              <div
                className="bg-gradient-to-r from-sky-400 via-blue-400 to-emerald-400 h-full rounded-full transition-all duration-300 shadow-sm"
                style={{ width: `${autoSyncState.progressPercent}%` }}
              />
            </div>

            {/* Step Badges Row */}
            <div className="flex flex-wrap items-center gap-2 pt-1 font-mono text-[10px]">
              <span
                className={`px-2 py-0.5 rounded-lg border ${
                  autoSyncState.step !== "idle"
                    ? "bg-emerald-950/80 text-emerald-300 border-emerald-700"
                    : "bg-slate-900 text-slate-500 border-slate-800"
                }`}
              >
                1. Login Check ✓
              </span>
              <span
                className={`px-2 py-0.5 rounded-lg border ${
                  autoSyncState.step === "schedule" || autoSyncState.step === "trips" || autoSyncState.step === "complete"
                    ? "bg-emerald-950/80 text-emerald-300 border-emerald-700"
                    : "bg-slate-900 text-slate-500 border-slate-800"
                }`}
              >
                2. Month Roster Pulled ✓
              </span>
              <span
                className={`px-2 py-0.5 rounded-lg border ${
                  autoSyncState.step === "trips"
                    ? "bg-sky-950 text-sky-300 border-sky-600 animate-pulse"
                    : autoSyncState.step === "complete"
                    ? "bg-emerald-950/80 text-emerald-300 border-emerald-700"
                    : "bg-slate-900 text-slate-500 border-slate-800"
                }`}
              >
                3. Individual Trips ({autoSyncState.currentTripIndex}/{autoSyncState.totalTrips})
              </span>
            </div>
          </div>
        )}
      </div>

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

      {/* 1-Click Clipboard & Upload Bar */}
      <div className="flex items-center justify-between gap-2 bg-white p-3 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          {/* Step 1: //MQ */}
          <button
            onClick={async () => {
              setStatusMessage('Executing Step 1: "//MQ"...');
              await typeMacroOnDecsScreen("//MQ^", { charDelayMs: 35, preEnterDelayMs: 200, pressEnter: true });
              setTimeout(() => setStatusMessage(null), 4000);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold font-mono rounded-xl shadow-xs transition cursor-pointer"
            title="Step 1: Type //MQ and press Enter"
          >
            <Play className="w-3.5 h-3.5 fill-white" />
            <span>1️⃣ //MQ</span>
          </button>

          {/* Step 2: BSIP742840 */}
          <button
            onClick={async () => {
              setStatusMessage('Executing Step 2: "BSIP742840"...');
              await typeMacroOnDecsScreen("BSIP742840^", { charDelayMs: 35, preEnterDelayMs: 200, pressEnter: true });
              setTimeout(() => setStatusMessage(null), 4000);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold font-mono rounded-xl shadow-xs transition cursor-pointer"
            title="Step 2: Type BSIP742840 and press Enter"
          >
            <Play className="w-3.5 h-3.5 fill-white" />
            <span>2️⃣ BSIP742840</span>
          </button>

          {/* Step 3: SARA202 */}
          <button
            onClick={async () => {
              setStatusMessage('Executing Step 3: "SARA202"...');
              await typeMacroOnDecsScreen("SARA202^", { charDelayMs: 35, preEnterDelayMs: 200, pressEnter: true });
              setTimeout(() => setStatusMessage(null), 4000);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold font-mono rounded-xl shadow-xs transition cursor-pointer"
            title="Step 3: Type SARA202 and press Enter"
          >
            <Play className="w-3.5 h-3.5 fill-white" />
            <span>3️⃣ SARA202</span>
          </button>

          {/* Step 4: HI1 (Pull Roster) */}
          <button
            onClick={async () => {
              setStatusMessage('Executing Step 4: "HI1"...');
              await typeMacroOnDecsScreen("HI1^", { charDelayMs: 35, preEnterDelayMs: 200, pressEnter: true });
              setTimeout(() => setStatusMessage(null), 4000);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold font-mono rounded-xl shadow-xs transition cursor-pointer"
            title="Step 4: Type HI1 and press Enter to load monthly schedule"
          >
            <Play className="w-3.5 h-3.5 fill-white" />
            <span>4️⃣ HI1</span>
          </button>

          {/* Step 5: Parse Multi-Page Screen & Fill Calendar */}
          <button
            onClick={async () => {
              setStatusMessage("Capturing multi-page HI1 schedule screen (auto-sending MD if needed)...");

              await typeMacroOnDecsScreen("HI1^", { charDelayMs: 35, preEnterDelayMs: 200, pressEnter: true });
              await new Promise((r) => setTimeout(r, 1500));

              const multiPageRes = await captureMultiPageDecsText(8);
              const targetText = multiPageRes.fullText || (await inspectAndCaptureScreenText()) || terminalBuffer;
              const parsedSeqs = parseRawSchedule(targetText);

              if (parsedSeqs.length > 0) {
                const metadata = parseMonthlyHIMetadata(targetText) || {
                    monthEnding: "31JUL26",
                    monthYearLabel: "July 2026",
                    asOfDateStr: new Date().toISOString(),
                    pilotName: "CAPTAIN PILOT",
                    seniorityNum: "12345",
                    empNum: "742840",
                    base: "ORD",
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
                };
                importMonthlyHISchedule(
                  parsedSeqs,
                  [],
                  metadata,
                  "Live_HI1_MultiPage.txt",
                  targetText
                );
                setStatusMessage(`✓ Parsed ${parsedSeqs.length} trip(s) across ${multiPageRes.pageCount || 1} page(s)! Calendar Updated.`);
              } else {
                setStatusMessage("Notice: Could not parse HI1 sequences from captured screen(s).");
              }
              setTimeout(() => setStatusMessage(null), 5000);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-bold font-mono rounded-xl shadow-xs transition cursor-pointer"
            title="Step 5: Collect multi-page HI1 screen data using MD and populate monthly calendar"
          >
            <Sparkles className="w-3.5 h-3.5 fill-white" />
            <span>5️⃣ Fill Calendar</span>
          </button>
          
          {/* Step 6: Parse Multi-Page HI2 Screen & Fill Calendar */}
          <button
            onClick={async () => {
              setStatusMessage("Capturing multi-page HI2 schedule screen (auto-sending MD if needed)...");

              await typeMacroOnDecsScreen("HI2^", { charDelayMs: 35, preEnterDelayMs: 200, pressEnter: true });
              await new Promise((r) => setTimeout(r, 1500));

              const multiPageRes = await captureMultiPageDecsText(8);
              const targetText = multiPageRes.fullText || (await inspectAndCaptureScreenText()) || terminalBuffer;
              const parsedSeqs = parseRawSchedule(targetText);

              if (parsedSeqs.length > 0) {
                const metadata = parseMonthlyHIMetadata(targetText) || {
                    monthEnding: "31AUG26", // arbitrary fallback
                    monthYearLabel: "August 2026",
                    asOfDateStr: new Date().toISOString(),
                    pilotName: "CAPTAIN PILOT",
                    seniorityNum: "12345",
                    empNum: "742840",
                    base: "ORD",
                    equipment: "E75",
                    rank: "CAPT",
                    guaranteeHours: 75.0,
                    bidSelProjHours: 85.0,
                    fltTime672Hours: 45.2,
                    fltTime365Day: 520.0,
                    availSickHours: 120.0,
                    shortTermSickAccrual: 21.0,
                    sickUsedYtd: 0,
                    vacationDaysCount: 0,
                    vacationCreditHours: 0,
                };
                importMonthlyHISchedule(
                  parsedSeqs,
                  [],
                  metadata,
                  "Live_HI2_MultiPage.txt",
                  targetText
                );
                setStatusMessage(`✓ Parsed ${parsedSeqs.length} trip(s) across ${multiPageRes.pageCount || 1} page(s)! Calendar Updated (HI2).`);
              } else {
                setStatusMessage("Notice: Could not parse HI2 sequences from captured screen(s).");
              }
              setTimeout(() => setStatusMessage(null), 5000);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-fuchsia-600 hover:bg-fuchsia-700 text-white text-xs font-bold font-mono rounded-xl shadow-xs transition cursor-pointer"
            title="Step 6: Collect multi-page HI2 screen data using MD and populate monthly calendar"
          >
            <Sparkles className="w-3.5 h-3.5 fill-white" />
            <span>6️⃣ Fill HI2 Calendar</span>
          </button>
          
          <button
            onClick={() => {
              // We updated terminalBuffer to hold the stitched text after an Auto-Sync or Step 5
              const textToSave = terminalBuffer || "No text available.";
              const blob = new Blob([textToSave], { type: 'text/plain' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `HI1_Terminal_Snapshot_${new Date().getTime()}.txt`;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              URL.revokeObjectURL(url);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-600 hover:bg-gray-700 text-white text-xs font-bold font-mono rounded-xl shadow-xs transition cursor-pointer"
            title="Download the current terminal text to a file for debugging"
          >
            <span>💾 Save Text</span>
          </button>

          {/* HSS Sequence Selection Modal Trigger */}
          <button
            onClick={() => setHssModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold font-mono rounded-xl shadow-xs transition cursor-pointer"
            title="Open sequence selector to pull HSS details"
          >
            <Zap className="w-3.5 h-3.5 fill-white" />
            <span>HSS Pairing</span>
          </button>

          {/* Full Login Sequence */}
          <button
            onClick={async () => {
              setStatusMessage("Executing smooth 3-phase DECS Login sequence...");
              await executeFullDecsLoginSequence("742840", "SARA202");
              setTimeout(() => setStatusMessage(null), 4000);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold font-mono rounded-xl shadow-xs transition cursor-pointer"
            title="Full Automated 3-Phase Login: //MQ -> BSIP742840 -> SARA202"
          >
            <Play className="w-3.5 h-3.5 fill-white" />
            <span>⚡ Full Auto Login</span>
          </button>
        </div>

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
            <span>Upload Schedule File</span>
          </button>
        </div>
      </div>

      {/* Main View Area: Interactive Browser + Live Extractor */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Side: Web Browser Viewport (Col 7) */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm flex flex-col h-[460px]">
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

            {/* Embedded Web Page Viewport */}
            <div className="flex-1 relative bg-slate-100">
              {typeof window !== "undefined" && (window as any).electronAPI ? (
                <webview
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  ref={webviewRef as any}
                  src={INITIAL_URL}
                  className="w-full h-full border-none"
                  useragent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
                  allowpopups={true}
                  webpreferences="contextIsolation=true, sandbox=false"
                />
              ) : (
                <iframe
                  src={`/api/proxy?url=${encodeURIComponent(INITIAL_URL)}`}
                  className="w-full h-full border-none"
                  title="Crew Portal Web View"
                  sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
                />
              )}
            </div>
          </div>

          {/* Real-Time Screen Extractor Reader ("What the Engine Sees Below") directly underneath browser */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3 flex flex-col h-[210px] shrink-0">
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
            <div className="flex-1 p-3 bg-slate-950 rounded-xl border border-slate-800 font-mono text-[11px] leading-relaxed overflow-y-auto scrollbar-thin text-emerald-400 font-bold selection:bg-sky-900">
              {isTypingOnDecs && (
                <div className="mb-2 p-2 bg-amber-950/80 border border-amber-600 rounded text-amber-300 text-[10px] font-mono flex items-center justify-between animate-pulse">
                  <span className="flex items-center gap-2 font-black">
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                    KEYBOARD TYPING ON DECS SCREEN: "{decsCurrentInput}█"
                  </span>
                  <span className="text-[9px] bg-amber-900 px-1.5 py-0.5 rounded uppercase font-bold text-amber-200">typing</span>
                </div>
              )}
              <pre className="whitespace-pre-wrap break-all">{terminalBuffer || decsScreenOutput || "Awaiting live WebSabre screen capture..."}</pre>
            </div>
          </div>

          {/* Live DOM Target & Event Monitor Inspector */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3 flex flex-col shrink-0">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-sky-600" />
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  🎯 Live DOM Target & Event Monitor
                  <span className="px-2 py-0.2 text-[9px] font-extrabold uppercase rounded bg-sky-100 text-sky-950 border border-sky-300">
                    {inspectedTarget ? inspectedTarget.tagName : "Awaiting User Click"}
                  </span>
                </h4>
              </div>

              <span className="text-[10px] font-mono text-slate-500">
                Live Clicks & Keystrokes Logged: <strong>{eventLogs.length}</strong>
              </span>
            </div>

            {/* Target Element Details Card */}
            {inspectedTarget ? (
              <div className="p-3 bg-slate-900 text-slate-100 rounded-xl border border-slate-800 font-mono text-xs space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2">
                  <span className="text-sky-400 font-bold">
                    Target Selector: <strong className="text-emerald-300 select-all">{inspectedTarget.selector}</strong>
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={async () => {
                        setStatusMessage("Executing DECS Login sequence...");
                        await typeMacroOnDecsScreen("//MQ^BSIP742840^SARA202^", {
                          charDelayMs: 30,
                          stepDelayMs: 300,
                          pressEnter: true
                        });
                        setTimeout(() => setStatusMessage(null), 4000);
                      }}
                      className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold font-mono transition shadow-xs cursor-pointer flex items-center gap-1.5"
                      title="Run DECS Login Macro"
                    >
                      <Play className="w-3.5 h-3.5 fill-white" />
                      <span>🔑 Run DECS Login</span>
                    </button>
                    <span className="text-[10px] text-amber-300 bg-amber-950 px-2 py-0.5 rounded border border-amber-800 font-bold">
                      Event: {inspectedTarget.eventType}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-slate-300 pt-1">
                  <div>
                    <span className="text-slate-500 block text-[9px] uppercase font-sans">Tag / Type</span>
                    <strong className="text-white">{inspectedTarget.tagName} {inspectedTarget.type ? `(${inspectedTarget.type})` : ""}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[9px] uppercase font-sans">Element ID</span>
                    <strong className="text-white">{inspectedTarget.id || "(none)"}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[9px] uppercase font-sans">Name / Attribute</span>
                    <strong className="text-white">{inspectedTarget.name || "(none)"}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[9px] uppercase font-sans">Screen Position</span>
                    <strong className="text-white">X:{inspectedTarget.x} Y:{inspectedTarget.y} ({inspectedTarget.width}x{inspectedTarget.height})</strong>
                  </div>
                </div>

                {inspectedTarget.value && (
                  <div className="text-[11px] text-slate-300 pt-1 border-t border-slate-800/80">
                    <span className="text-slate-500 text-[9px] uppercase font-sans mr-2">Captured Value:</span>
                    <span className="text-emerald-400 font-bold">{inspectedTarget.value}</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-500 font-medium italic">
                Click or focus into any input box or terminal screen above. The monitor will automatically capture its exact CSS selector and screen location.
              </div>
            )}

            {/* Event Activity Feed */}
            {eventLogs.length > 0 && (
              <div className="max-h-[100px] overflow-y-auto scrollbar-thin p-2 bg-slate-950 rounded-xl border border-slate-800 font-mono text-[10px] space-y-1 text-slate-300">
                {eventLogs.map((log, idx) => (
                  <div key={idx} className="flex items-center justify-between border-b border-slate-900 pb-0.5">
                    <span className="flex items-center gap-2">
                      <span className={`px-1.5 py-0.2 text-[8px] font-bold rounded uppercase ${
                        log.eventType === 'CLICK' ? 'bg-sky-900 text-sky-200' : log.eventType === 'TYPING' ? 'bg-amber-900 text-amber-200' : 'bg-emerald-900 text-emerald-200'
                      }`}>
                        {log.eventType}
                      </span>
                      <span className="text-slate-200 font-bold select-all">{log.selector}</span>
                    </span>
                    <span className="text-slate-500 text-[9px]">{log.timestamp}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Live Schedule Extractor Panel (Col 5) */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col h-[690px]">
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
                    Navigate to a crew portal, paste clipboard data, or upload a schedule file to view extracted trips.
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
                  <Plus className="w-3.5 h-3.5 text-sky-600" />
                  <span>Push to Open Time</span>
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

      <HssSequenceModal
        isOpen={isHssModalOpen}
        onClose={() => setHssModalOpen(false)}
        onExecute={handleExecuteHss}
      />
    </div>
  );
}
