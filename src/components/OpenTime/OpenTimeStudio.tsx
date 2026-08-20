"use client";

import React, { useState, useMemo, useRef } from "react";
import { useCrewStore } from "../../store/useCrewStore";
import { parseN4OpenTime, checkOpenSequenceConflict } from "../../lib/parser";
import { OpenSequence } from "../../types";
import OpenTimePickupModal from "./OpenTimePickupModal";
import {
  Clock,
  Calendar,
  Plane,
  Search,
  Filter,
  Upload,
  FileText,
  RotateCcw,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  X,
  Layers,
  ChevronRight,
  ExternalLink,
  Flame,
  ArrowDownUp,
  MapPin,
  RefreshCw,
  Plus,
  Zap,
} from "lucide-react";

/**
 * Calculates human-readable relative time, exact timestamp, and freshness status.
 */
function getTimestampMeta(isoString?: string) {
  if (!isoString) {
    return {
      relative: "Never updated",
      absolute: "No sync timestamp recorded",
      freshness: "stale" as const,
      freshnessLabel: "No Timestamp",
      ageMinutes: Infinity,
    };
  }

  const date = new Date(isoString);
  if (isNaN(date.getTime())) {
    return {
      relative: "Unknown",
      absolute: "Invalid timestamp",
      freshness: "stale" as const,
      freshnessLabel: "Unknown",
      ageMinutes: Infinity,
    };
  }

  const now = new Date();
  const diffMs = Math.max(0, now.getTime() - date.getTime());
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  let relative = "Just now";
  if (diffSec < 45) {
    relative = "Just now";
  } else if (diffMin === 1) {
    relative = "1 min ago";
  } else if (diffMin < 60) {
    relative = `${diffMin} mins ago`;
  } else if (diffHour === 1) {
    relative = `1 hour ago`;
  } else if (diffHour < 24) {
    relative = `${diffHour}h ${diffMin % 60}m ago`;
  } else if (diffDay === 1) {
    relative = `Yesterday at ${date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
  } else {
    relative = `${diffDay} days ago (${date.toLocaleDateString([], { month: "short", day: "numeric" })})`;
  }

  const absolute = date.toLocaleString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  });

  let freshness: "fresh" | "recent" | "aged" | "stale" = "fresh";
  let freshnessLabel = "Live & Current";

  if (diffMin < 30) {
    freshness = "fresh";
    freshnessLabel = "Live & Current";
  } else if (diffHour < 4) {
    freshness = "recent";
    freshnessLabel = "Recent";
  } else if (diffDay < 1) {
    freshness = "aged";
    freshnessLabel = "Today";
  } else {
    freshness = "stale";
    freshnessLabel = "Older Sync";
  }

  return { relative, absolute, freshness, freshnessLabel, ageMinutes: diffMin };
}

export default function OpenTimeStudio() {
  const openSequences = useCrewStore((state) => state.openSequences);
  const openTimeLastUpdated = useCrewStore((state) => state.openTimeLastUpdated);
  const setOpenSequences = useCrewStore((state) => state.setOpenSequences);
  const sequences = useCrewStore((state) => state.sequences);
  const simulatedSequenceIds = useCrewStore((state) => state.simulatedSequenceIds);
  const toggleSimulateSequence = useCrewStore((state) => state.toggleSimulateSequence);
  const setSelectedOpenTimeForPickup = useCrewStore((state) => state.setSelectedOpenTimeForPickup);

  // Filter States
  const [searchTerm, setSearchTerm] = useState("");
  const [baseFilter, setBaseFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState<"ALL" | "OT" | "DROP">("ALL");
  const [legalOnlyFilter, setLegalOnlyFilter] = useState(false);
  const [sortBy, setSortBy] = useState<"date" | "credit" | "seq">("date");
  const [sortAsc, setSortAsc] = useState(true);

  // Modal / Import States
  const [showImportModal, setShowImportModal] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [selectedTrip, setSelectedTrip] = useState<OpenSequence | null>(null);
  const [statusBanner, setStatusBanner] = useState<{ text: string; type: "success" | "error" | "info" } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const timeMeta = useMemo(() => getTimestampMeta(openTimeLastUpdated), [openTimeLastUpdated]);

  // Counts
  const counts = useMemo(() => {
    let ot = 0;
    let drop = 0;
    openSequences.forEach((s) => {
      if (s.isDropBoard) drop++;
      else ot++;
    });
    return { total: openSequences.length, ot, drop };
  }, [openSequences]);

  // Filtered & Sorted Sequences
  const filteredSequences = useMemo(() => {
    return openSequences
      .filter((s) => {
        // Base filter
        if (baseFilter !== "ALL" && s.base !== baseFilter) return false;

        // Type filter
        if (typeFilter === "OT" && s.isDropBoard) return false;
        if (typeFilter === "DROP" && !s.isDropBoard) return false;

        // Legality filter
        if (legalOnlyFilter && checkOpenSequenceConflict(s, sequences).hasConflict) return false;

        // Search query
        if (searchTerm.trim()) {
          const q = searchTerm.trim().toUpperCase();
          const matchSeq = s.sequenceNumber.includes(q);
          const matchLayovers = (s.layoverDescription || "").toUpperCase().includes(q);
          const matchLegs = (s.legsDescription || "").toUpperCase().includes(q);
          const matchBase = (s.base || "").toUpperCase().includes(q);
          const matchDate = (s.startDate || "").includes(q);
          if (!matchSeq && !matchLayovers && !matchLegs && !matchBase && !matchDate) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === "credit") {
          return sortAsc ? a.creditHours - b.creditHours : b.creditHours - a.creditHours;
        }
        if (sortBy === "seq") {
          return sortAsc
            ? a.sequenceNumber.localeCompare(b.sequenceNumber)
            : b.sequenceNumber.localeCompare(a.sequenceNumber);
        }
        // Default: Date
        const dComp = a.startDate.localeCompare(b.startDate);
        if (dComp !== 0) return sortAsc ? dComp : -dComp;
        return a.reportTime.localeCompare(b.reportTime);
      });
  }, [openSequences, baseFilter, typeFilter, searchTerm, sortBy, sortAsc]);

  // Handle Text Import
  const handleParseAndImport = (text: string) => {
    if (!text || text.trim().length === 0) {
      setStatusBanner({ text: "Please enter or paste DECS N4 Open Time text.", type: "error" });
      return;
    }
    const parsed = parseN4OpenTime(text);
    if (!parsed || parsed.length === 0) {
      setStatusBanner({ text: "Could not parse open time. Ensure DECS N4 text format is valid.", type: "error" });
      return;
    }

    setOpenSequences(parsed);
    setShowImportModal(false);
    setPasteText("");
    setStatusBanner({
      text: `✓ Successfully loaded ${parsed.length} open sequences with live timestamp!`,
      type: "success",
    });
    setTimeout(() => setStatusBanner(null), 5000);
  };

  // Handle File Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      handleParseAndImport(text);
    };
    reader.onerror = () => {
      setStatusBanner({ text: "Failed to read uploaded file.", type: "error" });
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-4 pb-20 select-none animate-fadeIn">
      {/* Top Banner & Refresh Card */}
      <div className="bg-gradient-to-br from-slate-900 via-sky-950 to-slate-900 rounded-3xl p-4 sm:p-5 text-white shadow-xl border border-sky-800/40 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                <Plane className="w-3 h-3" /> N4D Open Time Studio
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-sky-500/20 text-sky-300 border border-sky-500/30">
                Fleet: E75
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
              Open Pairings & Drop Board
            </h1>
            <p className="text-xs text-sky-200/80 mt-0.5">
              Live DECS open time inventory for trades, pickups, and overtime simulation.
            </p>
          </div>

          {/* Timestamp Badge */}
          <div className="flex flex-col items-start sm:items-end bg-white/5 backdrop-blur-md rounded-2xl p-2.5 sm:p-3 border border-white/10 shrink-0">
            <div className="flex items-center gap-1.5 text-xs font-black">
              <span
                className={`w-2 h-2 rounded-full ${
                  timeMeta.freshness === "fresh"
                    ? "bg-emerald-400 animate-pulse"
                    : timeMeta.freshness === "recent"
                    ? "bg-sky-400"
                    : timeMeta.freshness === "aged"
                    ? "bg-amber-400"
                    : "bg-slate-400"
                }`}
              />
              <span className="text-white font-bold">{timeMeta.relative}</span>
              <span
                className={`text-[9px] px-1.5 py-0.5 rounded-md font-black uppercase tracking-wider ${
                  timeMeta.freshness === "fresh"
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                    : timeMeta.freshness === "recent"
                    ? "bg-sky-500/20 text-sky-300 border border-sky-500/30"
                    : "bg-slate-500/20 text-slate-300 border border-slate-500/30"
                }`}
              >
                {timeMeta.freshnessLabel}
              </span>
            </div>
            <span className="text-[10px] text-slate-300 mt-0.5 font-mono" title={timeMeta.absolute}>
              {openTimeLastUpdated
                ? new Date(openTimeLastUpdated).toLocaleTimeString([], { hour: "numeric", minute: "2-digit", second: "2-digit" }) +
                  " • " +
                  new Date(openTimeLastUpdated).toLocaleDateString([], { month: "short", day: "numeric" })
                : "No sync on file"}
            </span>
          </div>
        </div>

        {/* Quick Action Buttons & Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4 pt-3 border-t border-white/10 relative z-10">
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-2.5 border border-white/10">
            <span className="text-[10px] text-sky-200 uppercase font-black tracking-wider block">Total Available</span>
            <span className="text-lg font-black text-white">{counts.total} <span className="text-xs font-normal text-sky-300">Trips</span></span>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-2.5 border border-white/10">
            <span className="text-[10px] text-amber-200 uppercase font-black tracking-wider block">⚡ Open Time</span>
            <span className="text-lg font-black text-amber-300">{counts.ot} <span className="text-xs font-normal text-amber-200/80">OT</span></span>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-2.5 border border-white/10">
            <span className="text-[10px] text-cyan-200 uppercase font-black tracking-wider block">💎 Straight Pay Drops</span>
            <span className="text-lg font-black text-cyan-300">{counts.drop} <span className="text-xs font-normal text-cyan-200/80">Drops</span></span>
          </div>

          <div className="col-span-2 sm:col-span-4 flex items-center gap-2 pt-1">
            <button
              onClick={() => setShowImportModal(true)}
              className="flex-1 bg-sky-700/80 hover:bg-sky-600 active:scale-95 text-white font-bold text-xs rounded-xl p-2.5 border border-sky-400/30 shadow-md flex items-center justify-center gap-1.5 transition cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              <span>Upload / Paste N4</span>
            </button>

            <button
              onClick={() => {
                if (typeof window !== "undefined") {
                  if ((window as any).NativePortal) {
                    (window as any).NativePortal.open();
                  }
                  window.dispatchEvent(new CustomEvent("openOpenHssModal"));
                }
              }}
              className="flex-1 bg-emerald-700/90 hover:bg-emerald-600 active:scale-95 text-white font-bold text-xs rounded-xl p-2.5 border border-emerald-400/40 shadow-md flex items-center justify-center gap-1.5 transition cursor-pointer"
            >
              <Zap className="w-4 h-4 text-emerald-200" />
              <span>⚡ Pull HSS for Legal Pairings</span>
            </button>
          </div>
        </div>
      </div>

      {/* Status Banner */}
      {statusBanner && (
        <div
          className={`p-3 rounded-2xl border text-xs font-bold flex items-center justify-between animate-fadeIn ${
            statusBanner.type === "success"
              ? "bg-emerald-50 text-emerald-800 border-emerald-300"
              : statusBanner.type === "error"
              ? "bg-rose-50 text-rose-800 border-rose-300"
              : "bg-sky-50 text-sky-800 border-sky-300"
          }`}
        >
          <div className="flex items-center gap-2">
            {statusBanner.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : statusBanner.type === "error" ? (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            ) : (
              <Sparkles className="w-4 h-4 text-sky-600 shrink-0" />
            )}
            <span>{statusBanner.text}</span>
          </div>
          <button onClick={() => setStatusBanner(null)} className="text-slate-400 hover:text-slate-600 p-1">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Controls Bar: Search & Filter Chips */}
      <div className="bg-white rounded-2xl p-3 shadow-sm border border-slate-200 space-y-2.5">
        {/* Search & Sort Row */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by Seq # (14330), Layover (TPA), Leg count..."
              className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500 placeholder:text-slate-400"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <button
            onClick={() => setSortAsc(!sortAsc)}
            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl border border-slate-200 text-xs font-bold flex items-center gap-1 transition"
            title="Toggle sort direction"
          >
            <ArrowDownUp className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{sortAsc ? "Asc" : "Desc"}</span>
          </button>
        </div>

        {/* Filter Chips Rows */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100 text-xs">
          {/* Base Selector */}
          <div className="flex items-center gap-1">
            <span className="text-[10px] font-black text-slate-400 uppercase mr-1">Base:</span>
            {["ALL", "ORD", "DFW", "MIA", "PHX"].map((b) => (
              <button
                key={b}
                onClick={() => setBaseFilter(b)}
                className={`px-2.5 py-1 rounded-lg text-xs font-black transition cursor-pointer ${
                  baseFilter === b
                    ? "bg-sky-600 text-white shadow-sm"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {b}
              </button>
            ))}
          </div>

          {/* Type Filter */}
          <div className="flex items-center gap-1">
            <span className="text-[10px] font-black text-slate-400 uppercase mr-1">Type:</span>
            {[
              { id: "ALL", label: "All" },
              { id: "OT", label: "⚡ Open Time" },
              { id: "DROP", label: "💎 Straight Pay (Drops)" },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setTypeFilter(t.id as any)}
                className={`px-2.5 py-1 rounded-lg text-xs font-black transition cursor-pointer ${
                  typeFilter === t.id
                    ? "bg-slate-900 text-white shadow-sm"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {t.label}
              </button>
            ))}

            <button
              onClick={() => setLegalOnlyFilter(!legalOnlyFilter)}
              className={`px-2.5 py-1 rounded-lg text-xs font-black transition cursor-pointer flex items-center gap-1 ${
                legalOnlyFilter
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              <CheckCircle2 className="w-3 h-3" />
              <span>Legal Only</span>
            </button>
          </div>
        </div>
      </div>

      {/* Results Header */}
      <div className="flex items-center justify-between px-1 text-xs text-slate-500 font-bold">
        <span>Showing {filteredSequences.length} open pairings</span>
        {counts.total > 0 && (
          <button
            onClick={() => {
              if (confirm("Are you sure you want to clear all imported open time listings?")) {
                setOpenSequences([]);
              }
            }}
            className="text-rose-500 hover:text-rose-700 text-[11px] font-black flex items-center gap-1 cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" /> Clear Open Time
          </button>
        )}
      </div>

      {/* Open Time Sequence Cards Grid */}
      {filteredSequences.length === 0 ? (
        <div className="bg-white rounded-3xl p-8 text-center border border-dashed border-slate-300 space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-sky-50 text-sky-600 mx-auto flex items-center justify-center">
            <Plane className="w-6 h-6" />
          </div>
          <h3 className="text-base font-black text-slate-800">No Open Sequences Found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {openSequences.length === 0
              ? "Run the N4D command in DECS or upload an N4 schedule text/pdf file to verify available open time."
              : "No pairings match your active search and filter criteria."}
          </p>
          <div className="pt-2 flex justify-center gap-2">
            <button
              onClick={() => setShowImportModal(true)}
              className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white text-xs font-black rounded-xl shadow-md transition cursor-pointer flex items-center gap-1.5"
            >
              <Upload className="w-3.5 h-3.5" />
              Upload N4 Open Time
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filteredSequences.map((seq) => {
            const isSim = simulatedSequenceIds.includes(seq.id);
            const conflict = checkOpenSequenceConflict(seq, sequences);
            const layovers = seq.layoverDescription && seq.layoverDescription !== "—"
              ? seq.layoverDescription.split(/[-/]/).map((x) => x.trim()).filter(Boolean)
              : [];

            // Calculate duration in days
            const startD = new Date(seq.startDate);
            const endD = new Date(seq.endDate);
            const spanDays = Math.max(1, Math.round((endD.getTime() - startD.getTime()) / (1000 * 60 * 60 * 24)) + 1);

            return (
              <div
                key={seq.id}
                className={`rounded-2xl p-4 border transition shadow-sm hover:shadow-md relative overflow-hidden flex flex-col justify-between ${
                  conflict.hasConflict
                    ? "bg-rose-50/20 border-rose-300/80 hover:border-rose-400"
                    : seq.isDropBoard
                    ? "bg-white border-teal-200/80 hover:border-teal-400"
                    : "bg-white border-slate-200 hover:border-sky-300"
                }`}
              >
                {/* Top Row: Badges */}
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-base font-black text-slate-900 tracking-tight font-mono">
                        #{seq.sequenceNumber}
                      </span>
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-slate-100 text-slate-700 border border-slate-200">
                        {seq.base || "ORD"}
                      </span>
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-sky-50 text-sky-700 border border-sky-200">
                        {seq.position || "CA"}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      {conflict.hasConflict ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1">
                          🚫 NOT LEGAL
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                          ✓ LEGAL
                        </span>
                      )}

                      {seq.isDropBoard ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 text-teal-700 border border-teal-200 flex items-center gap-1">
                          💎 PICKUP
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
                          ⚡ OPEN TIME
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Date Range & Duration */}
                  <div className="text-xs font-bold text-slate-700 flex items-center gap-1.5 mb-2.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>
                      {new Date(seq.startDate + "T00:00:00").toLocaleDateString([], { month: "short", day: "numeric" })}
                      {seq.startDate !== seq.endDate && (
                        <> ➔ {new Date(seq.endDate + "T00:00:00").toLocaleDateString([], { month: "short", day: "numeric" })}</>
                      )}
                    </span>
                    <span className="text-slate-300">•</span>
                    <span className="text-slate-500">{spanDays} Day{spanDays > 1 ? "s" : ""}</span>
                  </div>

                  {/* Metrics Box */}
                  <div className="grid grid-cols-3 gap-1.5 bg-slate-50 rounded-xl p-2.5 border border-slate-100 mb-3 text-center">
                    <div>
                      <span className="text-[9px] text-slate-400 font-black uppercase block">Credit</span>
                      <span className="text-xs font-black text-slate-900 font-mono">
                        {seq.creditHours.toFixed(2)}h
                      </span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-400 font-black uppercase block">Report</span>
                      <span className="text-xs font-black text-slate-800 font-mono">{seq.reportTime}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-400 font-black uppercase block">Release</span>
                      <span className="text-xs font-black text-slate-800 font-mono">{seq.releaseTime}</span>
                    </div>
                  </div>

                  {/* Legs & Layovers */}
                  <div className="space-y-1 text-xs mb-3">
                    <div className="flex items-center gap-1.5 text-slate-600">
                      <Layers className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="font-bold">Legs:</span>
                      <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-[11px] font-bold text-slate-800">
                        {seq.legsDescription || "—"}
                      </span>
                    </div>

                    <div className="flex items-start gap-1.5 text-slate-600">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                      <span className="font-bold">Layovers:</span>
                      <div className="flex flex-wrap gap-1">
                        {layovers.length > 0 ? (
                          layovers.map((c, cIdx) => (
                            <span
                              key={cIdx}
                              className="bg-sky-50 text-sky-800 font-mono font-black text-[10px] px-1.5 py-0.2 rounded border border-sky-200"
                            >
                              {c}
                            </span>
                          ))
                        ) : (
                          <span className="text-slate-400 italic">Day Turn (No Overnight)</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Conflict / Legality Check Badge */}
                  {conflict.hasConflict ? (
                    <div className="p-2.5 rounded-xl bg-rose-50/70 border border-rose-200 text-xs text-rose-900 font-semibold space-y-1 mb-3">
                      <div className="flex items-center gap-1.5 text-rose-700 font-bold text-[11px] uppercase tracking-wider">
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                        <span>Not Legal to Pickup (Conflict)</span>
                      </div>
                      <p className="text-[11px] text-rose-800 leading-tight font-medium">
                        • {conflict.reason || "Direct schedule or FAA 117 legality conflict"}
                      </p>
                    </div>
                  ) : (
                    <div className="p-2 rounded-xl bg-emerald-50/70 border border-emerald-200 text-[11px] text-emerald-800 font-semibold flex items-center gap-1.5 mb-3">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>✓ 100% Legal Schedule Pickup (0 Conflicts)</span>
                    </div>
                  )}
                </div>

                {/* Card Action Buttons */}
                <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
                  <button
                    onClick={() => setSelectedOpenTimeForPickup(seq)}
                    className="flex-1 py-1.5 px-3 rounded-xl bg-sky-600 hover:bg-sky-700 active:scale-95 text-white text-xs font-black transition cursor-pointer flex items-center justify-center gap-1 shadow-sm"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span>⚡ Pick Up</span>
                  </button>

                  <button
                    onClick={() => toggleSimulateSequence(seq.id)}
                    className={`py-1.5 px-2.5 rounded-xl text-xs font-black transition cursor-pointer flex items-center justify-center gap-1 ${
                      isSim
                        ? "bg-amber-600 text-white shadow-sm"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                    title="Simulate on Calendar"
                  >
                    {isSim ? "✓ Simulated" : "+ Simulate"}
                  </button>

                  <button
                    onClick={() => setSelectedTrip(seq)}
                    className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
                    title="View Trip Details"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Import / Paste Modal */}
      {showImportModal && (
        <>
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[100010] animate-fadeIn"
            onClick={() => setShowImportModal(false)}
          />
          <div className="fixed inset-x-0 bottom-0 sm:inset-0 sm:flex sm:items-center sm:justify-center z-[100011] p-0 sm:p-4">
            <div className="w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-200 flex flex-col max-h-[85vh] overflow-hidden animate-slideUp">
              {/* Modal Header */}
              <div className="flex justify-between items-center px-5 py-4 border-b border-slate-200 bg-slate-50">
                <div className="flex items-center gap-2">
                  <Upload className="w-5 h-5 text-sky-600" />
                  <div>
                    <h3 className="text-sm font-black text-slate-900">Import N4 Open Time</h3>
                    <p className="text-[11px] text-slate-500 font-medium">Paste DECS output or upload file</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowImportModal(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-5 overflow-y-auto space-y-4 flex-1">
                <div>
                  <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">
                    Paste DECS Terminal Text:
                  </label>
                  <textarea
                    value={pasteText}
                    onChange={(e) => setPasteText(e.target.value)}
                    placeholder="ORD E75 CA   OPEN SEQUENCES&#10;20AUG DOM&#10; 14330  16.41 0655 2200/22 4/3-3    TPA/GRR-&#10; 14507  18.22 0700 0910/23 3-2-4-1  HPN-DAY-MHK-..."
                    rows={8}
                    className="w-full p-3 font-mono text-xs bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-sky-500 text-slate-800 leading-relaxed"
                  />
                </div>

                <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    accept=".txt,.pdf"
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 transition cursor-pointer flex items-center gap-1.5"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    Upload File (.txt / .pdf)
                  </button>

                  <button
                    onClick={() => {
                      setPasteText(`ORD E75 CA   OPEN SEQUENCES                    AS OF 19AUG/1218
20AUG DOM
SEQ     TIME ORIG TERM    LEGS     LAYOVER      NAV  DIVS
 14330  16.41 0655 2200/22 4/3-3    TPA/GRR-
 14507  18.22 0700 0910/23 3-2-4-1  HPN-DAY-MHK-
 06501   3.19 1729 2130/20 2
 15185  19.06 1959 2040/23 1-4-2-3  LIT-XNA-BIL-
 14834  15.30 2004 2029/23 1-2-2-3  GSO-COU-MSY-
21AUG DOM
 14345   4.13 0800 0820/22 1-1      TUL-
 14488  13.46 0805 0900/24 3-2/2-1  CMH-XNA/XNA-
 14305   7.33 0815 1409/22 1-3      MSN-
 06567   7.49 0825 1505/22 1-2      VPS-
***************************************************************
ORD E75 CA   CREWED SEQUENCES POSTED FOR DROP  AS OF 19AUG/1218
21AUG DOM
 14318   6.18 1651 1726/22 3-1      CLE-
23AUG DOM
 14337  13.56 0700 1549/25 3-2-3    XNA-MAF-
END`);
                    }}
                    className="text-[11px] text-sky-600 hover:text-sky-800 font-bold underline cursor-pointer"
                  >
                    Load Sample DECS Text
                  </button>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
                <button
                  onClick={() => setShowImportModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleParseAndImport(pasteText)}
                  className="px-5 py-2 bg-sky-600 hover:bg-sky-500 active:scale-95 text-white text-xs font-black rounded-xl shadow-md transition cursor-pointer flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Parse & Verify
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Trip Inspector Bottom Sheet / Modal */}
      {selectedTrip && (
        <>
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[100010] animate-fadeIn"
            onClick={() => setSelectedTrip(null)}
          />
          <div className="fixed inset-x-0 bottom-0 sm:inset-0 sm:flex sm:items-center sm:justify-center z-[100011] p-0 sm:p-4">
            <div className="w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-200 flex flex-col max-h-[85vh] overflow-hidden animate-slideUp">
              <div className="flex justify-between items-center px-5 py-4 border-b border-slate-200 bg-slate-900 text-white">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-base font-black flex items-center gap-2">
                      Sequence #{selectedTrip.sequenceNumber}
                      <span className="text-xs font-bold px-2 py-0.5 rounded bg-sky-600 text-white">
                        {selectedTrip.base} {selectedTrip.position || "CA"}
                      </span>
                    </h3>
                    {selectedTrip.isDropBoard ? (
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                        💎 Straight Pay Pickup
                      </span>
                    ) : (
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        ⚡ Company Open Time
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-sky-200/80 mt-0.5">
                    {selectedTrip.startDate} ➔ {selectedTrip.endDate}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedTrip(null)}
                  className="p-1 text-slate-400 hover:text-white rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-5 overflow-y-auto space-y-4">
                {/* Details Breakdown */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-400 font-black uppercase block">Credit</span>
                    <span className="text-base font-black text-slate-900 font-mono">{selectedTrip.creditHours.toFixed(2)}h</span>
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-400 font-black uppercase block">Report</span>
                    <span className="text-base font-black text-slate-900 font-mono">{selectedTrip.reportTime}</span>
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-400 font-black uppercase block">Release</span>
                    <span className="text-base font-black text-slate-900 font-mono">{selectedTrip.releaseTime}</span>
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-400 font-black uppercase block">Legs</span>
                    <span className="text-base font-black text-slate-900 font-mono">{selectedTrip.legsDescription}</span>
                  </div>
                </div>

                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-2">
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">Layover Cities</h4>
                  <p className="text-xs text-slate-600 font-medium">
                    {selectedTrip.layoverDescription || "No layovers (Turn sequence)"}
                  </p>
                </div>

                <div className="p-3 rounded-2xl bg-sky-50 border border-sky-200 text-xs text-sky-800 space-y-1">
                  <span className="font-black block">💡 Ready for Step 2 (HSS Flight Legs)</span>
                  <p className="text-[11px] leading-relaxed">
                    To pull the complete breakdown of flight leg numbers, tail numbers, and gate times for sequence #{selectedTrip.sequenceNumber}, run command:{" "}
                    <code className="font-mono font-bold bg-white px-1.5 py-0.5 rounded border border-sky-300">
                      HSS/{selectedTrip.sequenceNumber}/{selectedTrip.startDate.replace(/-/g, "").substring(4)}
                    </code>
                  </p>
                </div>
              </div>

              <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
                <button
                  onClick={() => setSelectedTrip(null)}
                  className="px-5 py-2 bg-slate-900 text-white text-xs font-black rounded-xl cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Open Time Pickup Inspector Modal */}
      <OpenTimePickupModal />
    </div>
  );
}
