"use client";

import { useState, useRef, useEffect } from "react";
import {
  Globe,
  RotateCcw,
  ArrowLeft,
  ArrowRight,
  ExternalLink,
  Clipboard,
  FileUp,
  Minimize2,
  Maximize2,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Plane,
  ChevronDown,
  ChevronUp,
  FileText,
  Trash2,
  Shield,
  Layers,
  Terminal
} from "lucide-react";
import { useCrewStore } from "../../store/useCrewStore";
import { 
  parseRawSchedule,
  parseMonthlyHIMetadata,
  detectMonthFromText,
  convertOpenToTrip,
  parseN4OpenTime,
  parseHssSchedule
} from "../../lib/parser";
import { readUploadedFileAsText } from "../../lib/pdfExtractor";
import { Browser } from "@capacitor/browser";
import { Capacitor } from "@capacitor/core";
import HSSSequencesModal from "./HSSSequencesModal";

export default function PortalBrowserStudio() {
  const isNative = typeof window !== "undefined" && Capacitor.isNativePlatform();
  const importMonthlyHISchedule = useCrewStore((state) => state.importMonthlyHISchedule);
  const setOpenSequences = useCrewStore((state) => state.setOpenSequences);
  const existingOpenSeqs = useCrewStore((state) => state.openSequences);
  const sequences = useCrewStore((state) => state.sequences);

  // Quick Bookmark Portals
  const QUICK_BOOKMARKS = [
    { name: "WebSabre / DECS", url: "https://webfos.aa.com/WebSabre/websabre", icon: "🔵", desc: "Main DECS host terminal" },
    { name: "CCI Crew Portal", url: "https://cci.aa.com", icon: "✈️", desc: "Check-in & flight status" },
    { name: "AAPILOT Mobile", url: "https://aapilot.aa.com", icon: "📱", desc: "Pilot mobile portal" },
    { name: "MyCrew Portal", url: "https://mycrew.aa.com", icon: "👤", desc: "Crew resources & bidding" },
    { name: "Jetnet Travel", url: "https://jetnet.aa.com", icon: "🛫", desc: "Pass bureau & listing" },
  ];

  const setIsHssModalOpen = useCrewStore((state) => state.setIsHssModalOpen);
  const TARGET_URL = "https://webfos.aa.com/WebSabre/websabre";
  const [activeUrl, setActiveUrl] = useState(TARGET_URL);
  const [manualText, setManualText] = useState("");
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: "success" | "error" | "info" } | null>(null);

  // File Upload Ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Listen for Native Android Schedule Import Events from MainActivity
  useEffect(() => {
    const handleNativeImport = (e: any) => {
      const text = e.detail;
      if (text && typeof text === "string") {
        console.log("[PortalBrowser] Received native schedule text event!");
        processAndImportText(text, "WebFOS_Live_Screen.txt");
      }
    };

    window.addEventListener("nativeScheduleImport", handleNativeImport);
    return () => {
      window.removeEventListener("nativeScheduleImport", handleNativeImport);
    };
  }, []);

  // Launch Native In-App Browser (Desktop User-Agent + Full Top-Level Window)
  const handleLaunchNativeBrowser = (urlToLaunch?: string) => {
    const target = urlToLaunch || activeUrl || TARGET_URL;
    setActiveUrl(target);

    // 1. Try Native Android Top-Level WebView Bridge
    if (typeof window !== "undefined" && (window as any).NativePortal) {
      try {
        (window as any).NativePortal.open(target);
        return;
      } catch (err) {
        console.warn("NativePortal bridge error:", err);
      }
    }

    // 2. Fallback to Capacitor Browser
    try {
      if (typeof window !== "undefined") {
        Browser.open({
          url: target,
          toolbarColor: "#0A192F",
          presentationStyle: "popover",
        });
        setStatusMessage({
          text: "Opened AA Portal in native browser. Copy your HI1 and tap Done!",
          type: "info",
        });
        setTimeout(() => setStatusMessage(null), 5000);
        return;
      }
    } catch (e) {
      if (typeof window !== "undefined") {
        (window as any).open(target, "_blank", "noopener,noreferrer");
      }
    }
  };

  // Parse Text and populate Store
  const processAndImportText = (text: string, sourceName = "Portal_Schedule.txt") => {
    if (!text || text.trim().length === 0) {
      setStatusMessage({ text: "No schedule text found to parse.", type: "error" });
      setTimeout(() => setStatusMessage(null), 4000);
      return;
    }

    try {
      // 1. Check for N4 Open Time
      if (text.includes("OPEN TIME") || text.includes("POSSIBLE TRIPS") || text.includes("SEQ/DATE") || text.includes("N4/")) {
        const parsedOpen = parseN4OpenTime(text);
        if (parsedOpen && parsedOpen.length > 0) {
          const merged = [...existingOpenSeqs];
          parsedOpen.forEach((ot) => {
            if (!merged.some((m) => m.id === ot.id)) {
              merged.push(ot);
            }
          });
          setOpenSequences(merged);
          setStatusMessage({
            text: `✓ Successfully imported ${parsedOpen.length} Open Time trip(s)!`,
            type: "success",
          });
          setTimeout(() => setStatusMessage(null), 5000);
          return;
        }
      }

      // 2. Parse Regular HI1 Schedule
      const parsedSeqs = parseRawSchedule(text);
      if (parsedSeqs && parsedSeqs.length > 0) {
        const meta = parseMonthlyHIMetadata(text);
        importMonthlyHISchedule(parsedSeqs, [], meta, sourceName, text);
        setStatusMessage({
          text: `✓ Successfully imported ${parsedSeqs.length} trip(s) into your Calendar!`,
          type: "success",
        });
        setManualText("");
        setTimeout(() => setStatusMessage(null), 5000);
      } else {
        setStatusMessage({
          text: "Could not find sequence patterns in text. Paste raw HI1 or HSS text.",
          type: "error",
        });
        setTimeout(() => setStatusMessage(null), 5000);
      }
    } catch (err: any) {
      console.error("Parse error:", err);
      setStatusMessage({
        text: `Import failed: ${err.message || "Invalid text format"}`,
        type: "error",
      });
      setTimeout(() => setStatusMessage(null), 5000);
    }
  };

  // 1-Click Clipboard Reader
  const handleReadClipboard = async () => {
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        const text = await navigator.clipboard.readText();
        if (text && text.trim().length > 0) {
          processAndImportText(text, "Clipboard_HI1.txt");
        } else {
          setStatusMessage({ text: "Clipboard is empty. Copy your HI1 text first!", type: "info" });
          setTimeout(() => setStatusMessage(null), 4000);
        }
      }
    } catch (err) {
      setStatusMessage({ text: "Clipboard permission denied. Paste text below instead.", type: "error" });
      setTimeout(() => setStatusMessage(null), 4000);
    }
  };

  // 1-Click File/PDF Upload
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const res = await readUploadedFileAsText(file);
      if (res.text && res.text.trim().length > 0) {
        processAndImportText(res.text, res.fileName);
      } else {
        setStatusMessage({ text: `No readable text found in ${res.fileName}.`, type: "error" });
        setTimeout(() => setStatusMessage(null), 4000);
      }
    } catch (err) {
      setStatusMessage({ text: `Failed to read file ${file.name}.`, type: "error" });
      setTimeout(() => setStatusMessage(null), 4000);
    }
  };

  return (
    <div className="flex flex-col w-full font-sans select-none space-y-4 pb-12">
      {/* Hidden File Input for PDF/Text Uploads */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".pdf,.txt,.html,.csv"
        className="hidden"
      />

      {/* Floating Status Notification Toast */}
      {statusMessage && (
        <div className="fixed top-14 left-4 right-4 z-[99999] max-w-md mx-auto animate-slideDown">
          <div
            className={`p-3.5 rounded-2xl shadow-xl border flex items-center gap-3 backdrop-blur-md ${
              statusMessage.type === "success"
                ? "bg-emerald-950/95 text-emerald-100 border-emerald-500/50 shadow-emerald-950/40"
                : statusMessage.type === "error"
                ? "bg-rose-950/95 text-rose-100 border-rose-500/50 shadow-rose-950/40"
                : "bg-slate-900/95 text-sky-200 border-sky-500/50 shadow-slate-950/40"
            }`}
          >
            {statusMessage.type === "success" ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            ) : statusMessage.type === "error" ? (
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
            ) : (
              <Sparkles className="w-5 h-5 text-sky-400 shrink-0" />
            )}
            <span className="text-xs font-bold flex-1 leading-snug">{statusMessage.text}</span>
            <button onClick={() => setStatusMessage(null)} className="text-slate-400 hover:text-white text-xs px-1 cursor-pointer">
              ✕
            </button>
          </div>
        </div>
      )}

      {/* 1. Hero Action Banner: Launch Native WebFOS Browser */}
      <div className="bg-gradient-to-br from-slate-900 via-sky-950 to-slate-900 rounded-3xl p-5 text-white shadow-xl border border-sky-900/40 space-y-4 relative overflow-hidden">
        <div className="absolute -right-8 -bottom-8 w-40 h-40 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-sky-500/20 text-sky-300 border border-sky-400/30 font-mono">
                Desktop Chrome 124 Mode
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 font-mono">
                Duo 2FA SSO Ready
              </span>
            </div>
            <h2 className="text-xl font-black text-white tracking-tight">American Airlines WebFOS & DECS</h2>
            <p className="text-xs text-slate-300 font-medium max-w-md">
              Secure in-app browser with desktop User-Agent, multi-window Duo 2FA SSO support, and 1-tap HI1 schedule importer.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2.5 pt-1">
          <button
            onClick={() => handleLaunchNativeBrowser("https://webfos.aa.com/WebSabre/websabre")}
            className="flex-1 sm:flex-initial px-4 py-3 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white rounded-2xl text-xs font-black transition cursor-pointer active-press shadow-lg shadow-sky-500/20 flex items-center justify-center gap-2"
          >
            <Globe className="w-4 h-4" />
            <span>Launch WebFOS / DECS</span>
          </button>

          <button
            type="button"
            onClick={() => setIsHssModalOpen(true)}
            className="px-4 py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-white rounded-2xl text-xs font-black transition cursor-pointer active-press shadow-md shadow-amber-500/20 flex items-center justify-center gap-2"
            title="View HSS Sequences Breakdown by Month"
          >
            <Layers className="w-4 h-4" />
            <span>⚡ HSS Sequences</span>
          </button>

          <button
            type="button"
            onClick={handleReadClipboard}
            className="px-4 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl text-xs font-black transition cursor-pointer active-press shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2"
            title="Read Copied HI1 text from Clipboard"
          >
            <Clipboard className="w-4 h-4" />
            <span>📋 Paste HI1</span>
          </button>
        </div>
      </div>

      {/* 2. Quick Bookmarks Grid */}
      <div className="space-y-2">
        <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 px-1">Quick AA Portals & Resources</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {/* HSS Sequence Roster Card */}
          <button
            type="button"
            onClick={() => setIsHssModalOpen(true)}
            className="p-3.5 bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-900 text-white border border-indigo-500/30 rounded-2xl transition cursor-pointer active-press shadow-2xs flex items-center justify-between text-left group"
          >
            <div className="flex items-center gap-3 min-w-0">
              <span className="text-2xl p-2 bg-indigo-500/20 rounded-xl border border-indigo-400/30 shrink-0">📋</span>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-black text-white block truncate group-hover:text-amber-400 transition">
                    HSS Sequences
                  </span>
                  <span className="px-1.5 py-0.2 rounded bg-amber-400/20 text-amber-300 text-[9px] font-black font-mono">
                    MONTHS
                  </span>
                </div>
                <span className="text-[11px] text-indigo-200/80 font-medium block truncate">
                  Monthly sequence legs & DECS roster
                </span>
              </div>
            </div>
            <Layers className="w-4 h-4 text-indigo-300 group-hover:text-amber-400 shrink-0 ml-2" />
          </button>

          {QUICK_BOOKMARKS.map((bm) => (
            <button
              key={bm.name}
              onClick={() => handleLaunchNativeBrowser(bm.url)}
              className="p-3.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-2xl transition cursor-pointer active-press shadow-2xs flex items-center justify-between text-left group"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-2xl p-2 bg-slate-50 rounded-xl border border-slate-100 shrink-0">{bm.icon}</span>
                <div className="min-w-0">
                  <span className="text-xs font-black text-slate-900 block truncate group-hover:text-sky-600 transition">
                    {bm.name}
                  </span>
                  <span className="text-[11px] text-slate-500 font-medium block truncate">{bm.desc}</span>
                </div>
              </div>
              <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-sky-600 shrink-0 ml-2" />
            </button>
          ))}
        </div>
      </div>

      {/* 3. Manual Paste & File Importer Box */}
      <div className="bg-white border border-slate-200 rounded-3xl p-4 sm:p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-sky-600" />
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">
              Manual Schedule Text & PDF Importer
            </h3>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 active-press"
            >
              <FileUp className="w-3.5 h-3.5 text-sky-600" />
              <span>Upload PDF / File</span>
            </button>
            {manualText && (
              <button
                onClick={() => setManualText("")}
                className="p-1.5 text-slate-400 hover:text-rose-600 rounded-xl hover:bg-rose-50 transition cursor-pointer"
                title="Clear Text"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        <textarea
          value={manualText}
          onChange={(e) => setManualText(e.target.value)}
          placeholder="Paste raw HI1 monthly schedule text, HSS sequence details, or N4 Open Time listings here..."
          className="w-full h-32 p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-mono font-medium text-slate-900 focus:outline-none focus:border-sky-600 focus:bg-white resize-none"
        />

        <div className="flex items-center justify-between gap-2 pt-1">
          <span className="text-[11px] text-slate-500 font-medium">
            Auto-detects month, sequences, pairings, block hours, and credit.
          </span>
          <button
            onClick={() => processAndImportText(manualText, "Manual_Paste.txt")}
            disabled={!manualText.trim()}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-2xl text-xs font-black transition cursor-pointer active-press shadow-xs flex items-center gap-2 shrink-0"
          >
            <Sparkles className="w-4 h-4" />
            <span>Parse & Populate Calendar</span>
          </button>
        </div>
      </div>
    </div>
  );
}
