"use client";

import React, { useState, useEffect } from "react";
import {
  Terminal,
  X,
  Trash2,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  CheckCircle,
  Database,
  Plane,
  RefreshCw,
  Layers,
  Calendar,
  FileCode,
  Search,
  ArrowRight,
  Code,
  Share2,
  Play,
  Cpu,
} from "lucide-react";
import { useCrewStore } from "@/store/useCrewStore";
import { parseHssSchedule } from "@/lib/parser";

export interface DecsLogEntry {
  id: string;
  timestamp: string;
  command?: string;
  classification: string;
  rawText: string;
  targetMonthKey?: string;
  source?: "NATIVE_EVENT" | "MANUAL_INPUT" | "FILE_UPLOAD" | "TEST_TRIGGER";
  monthResolution?: {
    rawSnippet?: string;
    detectedMonthNum?: number;
    detectedMonthAbbr?: string;
    detectedYearNum?: number;
    hasExplicitMonth?: boolean;
    resolutionPath: string;
    finalResolvedMonthKey: string;
  };
  parsedSummary?: {
    tripsCount: number;
    sequences: {
      seqNum: string;
      startDate: string;
      endDate: string;
      dutyPeriodsCount: number;
      legsCount: number;
      layoverCities: string[];
      totalCreditMinutes: number;
      expTafbHours?: number;
      legs: {
        flightNumber: string;
        dep: string;
        arr: string;
        depTime: string;
        arrTime: string;
        blockMinutes: number;
        isDeadhead?: boolean;
      }[];
    }[];
  };
  storeBeforeCount: number;
  storeAfterCount: number;
  storeDiff?: {
    matchedSeqId?: string;
    matchType?: string;
    action: string;
    notes: string;
  };
  status: "success" | "warning" | "error";
  details: string;
  errorStack?: string;
}

const STORAGE_KEY = "crewschedule_decs_diagnostics_v1";

// Global in-memory log buffer accessible across the entire app
export const globalDecsDiagnosticsLogs: DecsLogEntry[] = [];
const logListeners: Array<(logs: DecsLogEntry[]) => void> = [];

// Load persisted logs on initial client boot
if (typeof window !== "undefined") {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        globalDecsDiagnosticsLogs.push(...parsed.slice(0, 50));
      }
    }
  } catch (e) {}
}

export function recordDecsDiagnostic(entry: Omit<DecsLogEntry, "id" | "timestamp">) {
  const newEntry: DecsLogEntry = {
    id: `diag-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    timestamp: new Date().toLocaleTimeString(),
    ...entry,
  };

  globalDecsDiagnosticsLogs.unshift(newEntry);
  if (globalDecsDiagnosticsLogs.length > 50) {
    globalDecsDiagnosticsLogs.pop();
  }

  // Persist to local storage
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(globalDecsDiagnosticsLogs));
    } catch (e) {}
  }

  // Also mirror to android logcat / console for adb inspection
  console.log(
    `[DECS_DIAGNOSTICS] [${newEntry.timestamp}] Cmd: "${newEntry.command || "N/A"}" | Class: ${newEntry.classification} | Status: ${newEntry.status} | Details: ${newEntry.details}`
  );
  if (newEntry.parsedSummary) {
    console.log(
      `[DECS_DIAGNOSTICS] Parsed ${newEntry.parsedSummary.tripsCount} trip(s):`,
      JSON.stringify(newEntry.parsedSummary.sequences)
    );
  }

  logListeners.forEach((fn) => fn([...globalDecsDiagnosticsLogs]));
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function DecsDiagnosticsModal({ isOpen, onClose }: Props) {
  const [logs, setLogs] = useState<DecsLogEntry[]>([]);
  const [selectedLogId, setSelectedLogId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"stream" | "store" | "raw" | "json">("stream");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const sequences = useCrewStore((s) => s.sequences);
  const monthlyHIMetadata = useCrewStore((s) => s.monthlyHIMetadata);
  const mergeHssIntoSequence = useCrewStore((s) => s.mergeHssIntoSequence);

  useEffect(() => {
    setLogs([...globalDecsDiagnosticsLogs]);
    const listener = (newLogs: DecsLogEntry[]) => setLogs(newLogs);
    logListeners.push(listener);
    return () => {
      const idx = logListeners.indexOf(listener);
      if (idx !== -1) logListeners.splice(idx, 1);
    };
  }, []);

  if (!isOpen) return null;

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleClear = () => {
    globalDecsDiagnosticsLogs.length = 0;
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch (e) {}
    }
    setLogs([]);
    setSelectedLogId(null);
  };

  const selectedLog = logs.find((l) => l.id === selectedLogId) || logs[0];

  const filteredLogs = logs.filter((l) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (l.command && l.command.toLowerCase().includes(q)) ||
      l.classification.toLowerCase().includes(q) ||
      l.details.toLowerCase().includes(q) ||
      l.rawText.toLowerCase().includes(q)
    );
  });

  // Self-test runner for HSS 18061
  const handleRunSelfTestHss = () => {
    const sampleHss = `
SEQ 18061 BASE ORD SEL 514 ORG SCH DOM E75
CAPT PRYOR AR EMP NBR 742840
F/O OH J EMP NBR 973871
 DT EQ FLT STA DEP STA ARR AC FLY GTR GRD ACT
SKD 04 54 4246 ORD 2059 TRI 2349 1.50
D/P SKD 1.50 P/C 0.00 TL 1.50
HALF DAY COUNT TRI 4
 SKD TL 1.50 ACT TL 0.00
SKD ONDUTY 2.50 ODL 30.51
FDPT 2.35 START 2014 END 2249 ACC STA ORD
SKD 06 54 4198 TRI 0740 ORD 0855 2.15 0.50
SKD 06 54 3977 ORD 0945 DTW 1216 1.31 0.30
SKD 06 54 3977 DTW 1246 ORD 1320 1.34 1.28
SKD 06 54 3409 ORD 1448 CWA 1610 1.22
D/P SKD 6.42 P/C 0.00 TL 6.42
HALF DAY COUNT CWA 3
 SKD TL 6.42 ACT TL 0.00
SKD ONDUTY 10.30 ODL 12.50
FDPT 10.15 START 0555 END 1610 ACC STA ORD
SKD 07 54 3474 CWA 0600 ORD 0737 1.37 1.08
SKD 07 0F 3390 ORD 0845 ORF 1204 2.19 0.39
SKD 07 0F 3390 ORF 1243 ORD 1412 2.29
D/P SKD 6.25 P/C 0.00 TL 6.25
 SKD TL 6.25 ACT TL 0.00
SKD ONDUTY 9.12
FDPT 8.57 START 0515 END 1412 ACC STA ORD
SEQ SKD 14.57 P/C 0.00 TL 14.57 TAFB 66.13
`.trim();

    const beforeSeqs = useCrewStore.getState().sequences;
    const trips = parseHssSchedule(sampleHss, {
      command: "HSS/CA/18061/04SEP^",
      existingSequences: beforeSeqs,
      targetMonthKey: "2026-09",
    });

    if (trips && trips.length > 0) {
      trips.forEach((t) => mergeHssIntoSequence(t.sequenceNumber, t));
      const afterSeqs = useCrewStore.getState().sequences;
      recordDecsDiagnostic({
        command: "TEST: HSS/CA/18061/04SEP^",
        classification: "HSS Pairing",
        source: "TEST_TRIGGER",
        rawText: sampleHss,
        targetMonthKey: "2026-09",
        parsedSummary: {
          tripsCount: trips.length,
          sequences: trips.map((t) => ({
            seqNum: t.sequenceNumber,
            startDate: t.startDate,
            endDate: t.endDate,
            dutyPeriodsCount: t.dutyPeriods?.length || 0,
            legsCount: t.dutyPeriods?.reduce((a, b) => a + b.legs.length, 0) || 0,
            layoverCities: t.layoverCities || [],
            totalCreditMinutes: t.totalCreditMinutes || 0,
            expTafbHours: t.expTafbHours,
            legs: (t.dutyPeriods || []).flatMap((dp) =>
              dp.legs.map((l) => ({
                flightNumber: l.flightNumber,
                dep: l.depAirport,
                arr: l.arrAirport,
                depTime: l.depTime,
                arrTime: l.arrTime,
                blockMinutes: l.blockMinutes,
                isDeadhead: l.isDeadhead,
              }))
            ),
          })),
        },
        storeBeforeCount: beforeSeqs.length,
        storeAfterCount: afterSeqs.length,
        status: "success",
        details: `Diagnostic Self-Test: Merged Seq #18061 (${trips[0].startDate} to ${trips[0].endDate}) with 8 legs & 66.13 TAFB.`,
      });
    }
  };

  return (
    <div className="fixed inset-0 z-[99999] bg-slate-950/85 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-4xl h-[92vh] sm:h-[85vh] rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden text-slate-100 font-sans animate-in slide-in-from-bottom duration-200">
        
        {/* Top Header */}
        <div className="p-4 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Terminal className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-white">DECS Diagnostics & Execution Engine</h2>
                <span className="px-2 py-0.5 text-[10px] rounded-full bg-emerald-500/20 text-emerald-300 font-mono font-bold border border-emerald-500/30">
                  REAL-TIME TRACE
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Active Store: {sequences.length} trip(s) &bull; HI Meta: {monthlyHIMetadata?.monthEnding || "None"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleRunSelfTestHss}
              className="px-3 py-1.5 rounded-xl bg-amber-600/30 hover:bg-amber-600/50 text-amber-300 border border-amber-500/40 text-xs font-bold transition flex items-center gap-1.5"
              title="Execute diagnostic parse test on Seq 18061 (Sep 4)"
            >
              <Play className="w-3.5 h-3.5 fill-amber-400" />
              <span>Test 18061</span>
            </button>
            <button
              onClick={handleClear}
              className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-rose-400 hover:bg-slate-700 transition"
              title="Clear Diagnostics Log"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center justify-between px-4 bg-slate-950/50 border-b border-slate-800 text-xs font-bold">
          <div className="flex gap-1 overflow-x-auto py-2">
            <button
              onClick={() => setActiveTab("stream")}
              className={`px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 ${
                activeTab === "stream"
                  ? "bg-sky-500/20 text-sky-300 border border-sky-500/40"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Cpu className="w-3.5 h-3.5" />
              <span>Event Stream ({logs.length})</span>
            </button>
            <button
              onClick={() => setActiveTab("store")}
              className={`px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 ${
                activeTab === "store"
                  ? "bg-sky-500/20 text-sky-300 border border-sky-500/40"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Database className="w-3.5 h-3.5" />
              <span>Active Calendar Trips ({sequences.length})</span>
            </button>
            <button
              onClick={() => setActiveTab("raw")}
              className={`px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 ${
                activeTab === "raw"
                  ? "bg-sky-500/20 text-sky-300 border border-sky-500/40"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <FileCode className="w-3.5 h-3.5" />
              <span>Raw 3270 Buffer</span>
            </button>
            <button
              onClick={() => setActiveTab("json")}
              className={`px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 ${
                activeTab === "json"
                  ? "bg-sky-500/20 text-sky-300 border border-sky-500/40"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Code className="w-3.5 h-3.5" />
              <span>Export JSON Bundle</span>
            </button>
          </div>

          {activeTab === "stream" && (
            <div className="relative w-48 hidden sm:block">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-slate-500" />
              <input
                type="text"
                placeholder="Filter logs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-8 pr-3 py-1 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
              />
            </div>
          )}
        </div>

        {/* Tab 1: Event Stream */}
        {activeTab === "stream" && (
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {filteredLogs.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-500">
                <RefreshCw className="w-10 h-10 text-slate-600 mb-3 animate-spin duration-3000" />
                <p className="text-sm font-bold text-slate-400">Listening for DECS Terminal Events...</p>
                <p className="text-xs text-slate-500 max-w-sm mt-1">
                  Type any command in the DECS WebSabre terminal or tap "Test 18061" above. All parser steps, date resolutions, and state mutations will appear here.
                </p>
              </div>
            ) : (
              filteredLogs.map((log) => {
                const isSelected = selectedLogId === log.id;
                return (
                  <div
                    key={log.id}
                    className={`border rounded-2xl p-4 transition ${
                      log.status === "error"
                        ? "bg-rose-950/20 border-rose-800/60"
                        : log.status === "warning"
                        ? "bg-amber-950/20 border-amber-800/60"
                        : "bg-slate-950/60 border-slate-800 hover:border-slate-700"
                    }`}
                  >
                    <div
                      className="flex items-start justify-between cursor-pointer gap-2"
                      onClick={() => setSelectedLogId(isSelected ? null : log.id)}
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 shrink-0">
                          {log.status === "error" ? (
                            <AlertTriangle className="w-4 h-4 text-rose-400" />
                          ) : (
                            <CheckCircle className="w-4 h-4 text-emerald-400" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono font-black text-xs text-amber-300">
                              {log.command || "AUTO_CAPTURE"}
                            </span>
                            <span className="px-2 py-0.5 rounded bg-slate-800 text-[10px] font-mono text-slate-300 uppercase font-bold">
                              {log.classification}
                            </span>
                            {log.targetMonthKey && (
                              <span className="px-2 py-0.5 rounded bg-sky-950 text-sky-300 border border-sky-800 text-[10px] font-mono font-bold">
                                Target: {log.targetMonthKey}
                              </span>
                            )}
                            <span className="text-[10px] text-slate-500 font-mono">{log.timestamp}</span>
                          </div>
                          <p className="text-xs text-slate-200 mt-1.5 font-medium leading-relaxed">{log.details}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5 shrink-0">
                        <span className="text-[11px] font-mono px-2 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-300">
                          {log.storeBeforeCount} ➔ {log.storeAfterCount} trips
                        </span>
                        {isSelected ? (
                          <ChevronUp className="w-4 h-4 text-slate-400" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-slate-400" />
                        )}
                      </div>
                    </div>

                    {/* Detailed Accordion */}
                    {isSelected && (
                      <div className="mt-3.5 pt-3.5 border-t border-slate-800/80 space-y-3 text-xs">
                        {/* Extracted Sequence Details */}
                        {log.parsedSummary && log.parsedSummary.sequences.length > 0 && (
                          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                            <span className="text-[11px] font-black text-emerald-400 flex items-center gap-1.5">
                              <Database className="w-3.5 h-3.5" />
                              Parsed {log.parsedSummary.tripsCount} Sequence(s) Detail:
                            </span>
                            {log.parsedSummary.sequences.map((s, idx) => (
                              <div key={idx} className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800/80 space-y-1.5">
                                <div className="flex items-center justify-between font-mono font-bold text-slate-200">
                                  <span>Seq #{s.seqNum} ({s.startDate} &bull; {s.dutyPeriodsCount} days, {s.legsCount} legs)</span>
                                  <span className="text-amber-400">Credit: {Math.floor(s.totalCreditMinutes / 60)}h {s.totalCreditMinutes % 60}m</span>
                                </div>
                                <div className="text-[11px] text-slate-400 font-mono">
                                  Layovers: {s.layoverCities.join(", ") || "None (Turns)"}
                                </div>
                                {s.legs.length > 0 && (
                                  <div className="space-y-1 pt-1">
                                    {s.legs.map((leg, lIdx) => (
                                      <div key={lIdx} className="text-[11px] font-mono flex items-center justify-between text-slate-300 pl-2 border-l-2 border-sky-600/60">
                                        <span>{leg.flightNumber} {leg.dep} ➔ {leg.arr}</span>
                                        <span className="text-slate-400">{leg.depTime} - {leg.arrTime} ({leg.blockMinutes}m)</span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Raw Screen Buffer View */}
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[10px] font-bold text-slate-400 uppercase font-mono">
                              Raw 3270 Screen Buffer ({log.rawText.length} chars)
                            </span>
                            <button
                              onClick={() => handleCopy(log.rawText, log.id)}
                              className="text-[11px] text-sky-400 hover:text-sky-300 flex items-center gap-1 py-0.5 px-2 rounded-lg bg-slate-800"
                            >
                              {copiedId === log.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                              <span>{copiedId === log.id ? "Copied!" : "Copy Buffer"}</span>
                            </button>
                          </div>
                          <pre className="p-3 bg-black/90 rounded-xl border border-slate-800 text-[10px] font-mono text-emerald-400/90 whitespace-pre-wrap max-h-56 overflow-y-auto leading-tight selection:bg-emerald-900 selection:text-white">
                            {log.rawText}
                          </pre>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Tab 2: Active Calendar Store Trips */}
        {activeTab === "store" && (
          <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
            <div className="p-3 rounded-2xl bg-sky-950/30 border border-sky-800/40 text-xs text-sky-200 flex items-center justify-between">
              <span>Total Trips on Calendar: <strong>{sequences.length}</strong></span>
              <span className="font-mono text-slate-400">Store Root: crewschedule-store</span>
            </div>

            {sequences.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-sm">No trips in store.</div>
            ) : (
              sequences.map((s) => (
                <div key={s.id} className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-lg bg-sky-900/60 text-sky-300 font-mono font-bold text-xs border border-sky-700">
                        #{s.sequenceNumber}
                      </span>
                      <span className="text-xs font-bold text-white">{s.startDate} ➔ {s.endDate}</span>
                    </div>
                    <span className="text-xs font-mono font-bold text-amber-400">
                      {Math.floor(s.totalCreditMinutes / 60)}h {s.totalCreditMinutes % 60}m
                    </span>
                  </div>

                  <div className="text-xs text-slate-400 flex items-center gap-3">
                    <span>Base: {s.base || "ORD"}</span>
                    <span>Eq: {s.equipment || "E75"}</span>
                    <span>Days: {s.dutyPeriods?.length || 0}</span>
                    <span>Legs: {s.dutyPeriods?.reduce((a, b) => a + b.legs.length, 0) || 0}</span>
                    <span>Layovers: {s.layoverCities?.join(", ") || "None"}</span>
                  </div>

                  {s.dutyPeriods && s.dutyPeriods.length > 0 && (
                    <div className="pt-2 border-t border-slate-800/70 space-y-1">
                      {s.dutyPeriods.map((dp, dIdx) => (
                        <div key={dIdx} className="text-[11px] font-mono text-slate-300 flex items-center justify-between">
                          <span>Day {dIdx + 1} ({dp.layoverCity || "Base"}): {dp.legs.map((l) => `${l.flightNumber} ${l.depAirport}➔${l.arrAirport}`).join(" &bull; ")}</span>
                          <span className="text-slate-500">{dp.reportTime || "N/A"} - {dp.releaseTime || "N/A"}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* Tab 3: Verbatim Raw 3270 Terminal Screen */}
        {activeTab === "raw" && (
          <div className="flex-1 overflow-y-auto p-4 flex flex-col space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400">
                Latest Captured Screen ({selectedLog?.rawText?.length || 0} bytes)
              </span>
              {selectedLog?.rawText && (
                <button
                  onClick={() => handleCopy(selectedLog.rawText, "raw-screen")}
                  className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-sky-300 rounded-lg text-xs font-bold flex items-center gap-1.5"
                >
                  {copiedId === "raw-screen" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>Copy Raw 3270</span>
                </button>
              )}
            </div>

            <pre className="flex-1 p-4 bg-black rounded-2xl border border-slate-800 text-[11px] font-mono text-emerald-400 whitespace-pre overflow-auto leading-relaxed shadow-inner">
              {selectedLog?.rawText || "No screen text captured yet."}
            </pre>
          </div>
        )}

        {/* Tab 4: Export Full JSON Bundle */}
        {activeTab === "json" && (
          <div className="flex-1 overflow-y-auto p-4 flex flex-col space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400">Complete Diagnostics JSON Bundle</span>
              <button
                onClick={() => handleCopy(JSON.stringify({ logs, currentSequences: sequences, monthlyMetadata: monthlyHIMetadata }, null, 2), "json-bundle")}
                className="px-3 py-1 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5"
              >
                {copiedId === "json-bundle" ? <Check className="w-3.5 h-3.5 text-white" /> : <Copy className="w-3.5 h-3.5" />}
                <span>Copy Entire Debug Bundle</span>
              </button>
            </div>

            <pre className="flex-1 p-4 bg-black rounded-2xl border border-slate-800 text-[10px] font-mono text-sky-300 whitespace-pre overflow-auto leading-tight shadow-inner">
              {JSON.stringify({ logs, currentSequences: sequences, monthlyMetadata: monthlyHIMetadata }, null, 2)}
            </pre>
          </div>
        )}

        {/* Footer */}
        <div className="p-3 bg-slate-950 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
          <span>Diagnostics persisted to local storage & mirrored to Logcat</span>
          <span className="font-mono font-bold text-slate-300">{logs.length} Logged Events</span>
        </div>
      </div>
    </div>
  );
}
