"use client";

import { useState, useMemo, useEffect } from "react";
import { useCrewStore } from "../../store/useCrewStore";
import { parseN6DReserves, DEFAULT_N6D_RAW_TEXT } from "../../lib/n6dParser";
import { isPilotTurnback, parseTurnbackList } from "../../lib/turnbackParser";
import { N6DPilotRecord, N6DPilotDayStatus } from "../../types";
import {
  Users,
  PhoneCall,
  Flame,
  ArrowDownUp,
  Search,
  Filter,
  Calendar,
  Clock,
  Plane,
  ShieldAlert,
  FileSpreadsheet,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  X,
  Upload,
  Sparkles,
  RefreshCw,
  Info,
  History,
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
    freshnessLabel = "Recent (<4h)";
  } else if (diffHour < 24) {
    freshness = "aged";
    freshnessLabel = "Needs Refresh (>4h)";
  } else {
    freshness = "stale";
    freshnessLabel = "Stale List (>24h)";
  }

  return {
    relative,
    absolute,
    freshness,
    freshnessLabel,
    ageMinutes: diffMin,
  };
}

export default function ReserveStudio() {
  const n6dReserves = useCrewStore((state) => state.n6dReserves);
  const setN6DReserves = useCrewStore((state) => state.setN6DReserves);
  const resetN6DReservesToDefault = useCrewStore((state) => state.resetN6DReservesToDefault);
  const userProfile = useCrewStore((state) => state.userProfile);
  const setActiveTab = useCrewStore((state) => state.setActiveTab);

  // Live timer tick for relative time auto-updates every 30s
  const [nowTick, setNowTick] = useState<number>(Date.now());
  useEffect(() => {
    const timer = setInterval(() => {
      setNowTick(Date.now());
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  // Show detailed timestamp breakdown modal/sheet
  const [showTimestampDetails, setShowTimestampDetails] = useState<boolean>(false);

  // Active viewing day (defaults to today's date if present in displayDays, otherwise first day)
  const displayDays = n6dReserves?.displayDays || [15, 16, 17, 18, 19, 20, 21];
  const todayDay = new Date().getDate();
  const initialDay = displayDays.includes(todayDay) ? todayDay : (displayDays[0] ?? todayDay);
  const [selectedDay, setSelectedDay] = useState<number>(initialDay);

  // Always keep selectedDay defaulted to today when reserve data updates
  useEffect(() => {
    const currentToday = new Date().getDate();
    if (displayDays.includes(currentToday)) {
      setSelectedDay(currentToday);
    } else if (!displayDays.includes(selectedDay) && displayDays.length > 0) {
      setSelectedDay(displayDays[0]);
    }
  }, [displayDays]);

  // Order mode: "reverse" (Junior first / Callout order) vs "seniority" (Senior first)
  const [orderMode, setOrderMode] = useState<"reverse" | "seniority">("reverse");

  // Status Filter: "ALL" | "AVAILABLE" | "RAP1" | "RAP2" | "SB" | "FLY" | "OFF"
  const [statusFilter, setStatusFilter] = useState<string>("AVAILABLE");

  // Search query
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Expanded card pilot seniority
  const [expandedPilotSen, setExpandedPilotSen] = useState<string | null>(null);

  // Turnback Data & Actions from Store
  const turnbackData = useCrewStore((state) => state.turnbackData);
  const setTurnbackData = useCrewStore((state) => state.setTurnbackData);
  const clearTurnbackData = useCrewStore((state) => state.clearTurnbackData);

  // Turnback Import Modal State
  const [isTurnbackModalOpen, setIsTurnbackModalOpen] = useState<boolean>(false);
  const [turnbackRawText, setTurnbackRawText] = useState<string>("");
  const [turnbackImportError, setTurnbackImportError] = useState<string | null>(null);

  // Import Modal State (N6D)
  const [isImportModalOpen, setIsImportModalOpen] = useState<boolean>(false);
  const [importRawText, setImportRawText] = useState<string>("");
  const [importError, setImportError] = useState<string | null>(null);

  // Count turnback pilots matching currently loaded N6D roster
  const turnbackPilotsCount = useMemo(() => {
    if (!n6dReserves || !n6dReserves.pilots || !turnbackData) return 0;
    return n6dReserves.pilots.filter((p) => isPilotTurnback(p, turnbackData)).length;
  }, [n6dReserves, turnbackData]);

  // Statistics for selected day
  const dayStats = useMemo(() => {
    if (!n6dReserves || !n6dReserves.pilots) {
      return { total: 0, available: 0, rap1: 0, rap2: 0, sb: 0, fly: 0, off: 0, other: 0 };
    }

    let available = 0;
    let rap1 = 0;
    let rap2 = 0;
    let sb = 0;
    let fly = 0;
    let off = 0;
    let other = 0;

    n6dReserves.pilots.forEach((p) => {
      const dayStatus = p.days[selectedDay];
      if (!dayStatus) return;

      if (dayStatus.isAvailable) {
        available++;
        if (dayStatus.rapType === "RAP1") rap1++;
        else if (dayStatus.rapType === "RAP2") rap2++;
        else if (dayStatus.rapType === "STANDBY") sb++;
      } else if (dayStatus.status === "FLY") {
        fly++;
      } else if (dayStatus.status === "OFF") {
        off++;
      } else {
        other++;
      }
    });

    return {
      total: n6dReserves.pilots.length,
      available,
      rap1,
      rap2,
      sb,
      fly,
      off,
      other,
    };
  }, [n6dReserves, selectedDay]);

  // Filtered & Sorted Pilots
  const processedPilots = useMemo(() => {
    if (!n6dReserves || !n6dReserves.pilots) return [];

    let list = [...n6dReserves.pilots];

    // Filter by status for selected day
    if (statusFilter === "AVAILABLE") {
      list = list.filter((p) => p.days[selectedDay]?.isAvailable);
    } else if (statusFilter === "TURNBACK") {
      list = list.filter((p) => isPilotTurnback(p, turnbackData));
    } else if (statusFilter === "RAP1") {
      list = list.filter((p) => p.days[selectedDay]?.rapType === "RAP1");
    } else if (statusFilter === "RAP2") {
      list = list.filter((p) => p.days[selectedDay]?.rapType === "RAP2");
    } else if (statusFilter === "SB") {
      list = list.filter((p) => p.days[selectedDay]?.rapType === "STANDBY");
    } else if (statusFilter === "FLY") {
      list = list.filter((p) => p.days[selectedDay]?.status === "FLY");
    } else if (statusFilter === "OFF") {
      list = list.filter((p) => p.days[selectedDay]?.status === "OFF");
    }

    // Filter by Search Query
    if (searchQuery.trim().length > 0) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.seniority.toLowerCase().includes(q) ||
          p.employeeId.toLowerCase().includes(q)
      );
    }

    // Sort Order
    if (orderMode === "reverse") {
      // Reverse Seniority: Highest seniority number (most junior) first!
      list.sort((a, b) => b.seniorityNum - a.seniorityNum);
    } else {
      // Standard Seniority: Lowest seniority number (most senior) first!
      list.sort((a, b) => a.seniorityNum - b.seniorityNum);
    }

    return list;
  }, [n6dReserves, selectedDay, statusFilter, searchQuery, orderMode, turnbackData]);

  const handleImportSubmit = () => {
    if (!importRawText.trim()) {
      setImportError("Please paste N6D text or upload a file.");
      return;
    }
    try {
      const parsed = parseN6DReserves(importRawText);
      if (!parsed.pilots || parsed.pilots.length === 0) {
        setImportError("Could not detect any pilot records in the text. Verify N6D format.");
        return;
      }
      setN6DReserves(parsed);
      setIsImportModalOpen(false);
      setImportRawText("");
      setImportError(null);
    } catch (e: any) {
      setImportError(e.message || "Failed to parse N6D text");
    }
  };

  const handleTurnbackImportSubmit = () => {
    if (!turnbackRawText.trim()) {
      setTurnbackImportError("Please paste HIHR Turnback text or upload a file.");
      return;
    }
    try {
      const parsed = parseTurnbackList(turnbackRawText);
      if (!parsed.records || parsed.records.length === 0) {
        setTurnbackImportError("Could not detect any pilot turnback records in the text. Verify HIHR format.");
        return;
      }
      setTurnbackData(parsed);
      setIsTurnbackModalOpen(false);
      setTurnbackRawText("");
      setTurnbackImportError(null);
    } catch (e: any) {
      setTurnbackImportError(e.message || "Failed to parse turnback list");
    }
  };

  const getStatusBadge = (status?: N6DPilotDayStatus) => {
    if (!status) {
      return <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 font-bold">UNKNOWN</span>;
    }

    if (status.rapType === "RAP1") {
      return (
        <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 font-black border border-emerald-500/30 flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          RAP 1 (04:00 - 18:00)
        </span>
      );
    }

    if (status.rapType === "RAP2") {
      return (
        <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-teal-500/15 text-teal-700 font-black border border-teal-500/30 flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse" />
          RAP 2 (12:00 - 23:59)
        </span>
      );
    }

    if (status.rapType === "STANDBY") {
      return (
        <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-700 font-black border border-amber-500/30 flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
          STANDBY (01:00 - 17:00)
        </span>
      );
    }

    if (status.status === "FLY") {
      return (
        <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-sky-500/15 text-sky-700 font-black border border-sky-500/30 flex items-center gap-1">
          <Plane className="w-2.5 h-2.5" />
          {status.sequenceNumber ? `SEQ ${status.sequenceNumber}` : "FLYING"}
        </span>
      );
    }

    if (status.status === "OFF") {
      return (
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-bold border border-slate-200">
          DAY OFF (24H)
        </span>
      );
    }

    if (status.status === "SK") {
      return (
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-700 font-black border border-rose-500/30">
          SICK (SK)
        </span>
      );
    }

    if (status.isAvailable) {
      return (
        <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 font-black border border-emerald-500/30 flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          AVAILABLE RSV
        </span>
      );
    }

    return (
      <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-bold border border-slate-200">
        {status.code || status.rawText || status.status}
      </span>
    );
  };

  const getMiniDayColor = (status?: N6DPilotDayStatus) => {
    if (!status) return "bg-slate-100 text-slate-400 border-slate-200";
    if (status.rapType === "RAP1") return "bg-emerald-500 text-white border-emerald-600 font-black shadow-xs";
    if (status.rapType === "RAP2") return "bg-teal-500 text-white border-teal-600 font-black shadow-xs";
    if (status.rapType === "STANDBY") return "bg-amber-500 text-white border-amber-600 font-black";
    if (status.status === "FLY") return "bg-sky-500 text-white border-sky-600 font-black";
    if (status.status === "SK") return "bg-rose-500 text-white border-rose-600 font-black";
    if (status.status === "OFF") return "bg-slate-100 text-slate-500 border-slate-200";
    if (status.isAvailable) return "bg-emerald-100 text-emerald-800 border-emerald-300 font-bold";
    return "bg-slate-200 text-slate-700 border-slate-300";
  };

  // Compute real-time timestamp status
  const timestampMeta = useMemo(
    () => getTimestampMeta(n6dReserves?.importedAt),
    [n6dReserves?.importedAt, nowTick]
  );

  const handleTriggerDecsPull = () => {
    if (typeof window !== "undefined") {
      // Check if native Android bridge is available
      if ((window as any).NativePortal && (window as any).NativePortal.open) {
        (window as any).NativePortal.open("https://webfos.aa.com/WebSabre/websabre");
        return;
      }
      // If web, switch to portal tab
      setActiveTab("portal");
    }
  };

  return (
    <div className="w-full flex flex-col gap-3 pb-8 text-slate-900">
      {/* Header Banner */}
      <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-4 sm:p-5 shadow-xl border border-indigo-500/20 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col gap-3 relative z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-400 shadow-inner">
                <PhoneCall className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-base sm:text-lg font-black tracking-tight flex items-center gap-2">
                  <span>Reserve Callout Queue</span>
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 uppercase tracking-wider">
                    N6D
                  </span>
                </h1>
                <p className="text-[11px] text-indigo-200/80 font-medium">
                  Reverse Seniority Callout Order • Bottom of List First
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setIsImportModalOpen(true)}
                className="px-2.5 py-1.5 rounded-xl bg-indigo-600/80 hover:bg-indigo-600 text-white text-xs font-bold transition flex items-center gap-1 border border-indigo-400/40 shadow-sm active-press cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Import N6D</span>
              </button>

              <button
                onClick={resetN6DReservesToDefault}
                title="Reset to live ORD default"
                className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs transition border border-white/10 active-press cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Metadata Badges */}
          <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-white/10 text-xs">
            <span className="px-2.5 py-1 rounded-lg bg-white/10 font-black text-amber-300 border border-amber-400/20">
              {n6dReserves?.base} • {n6dReserves?.equipment} • {n6dReserves?.seat}
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-white/10 font-bold text-slate-200">
              {n6dReserves?.category}
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-white/10 font-bold text-indigo-200 flex items-center gap-1">
              <Clock className="w-3 h-3 text-indigo-300" />
              HOST AS OF {n6dReserves?.asOfTime} ({n6dReserves?.asOfDate})
            </span>
            <span className="ml-auto text-[11px] font-bold text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {n6dReserves?.pilots?.length || 0} Pilots On Board
            </span>
          </div>
        </div>
      </div>

      {/* Live Sync Timestamp & Freshness Status Card */}
      <div className="bg-white rounded-2xl p-3 border border-slate-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5">
          <div
            className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${
              timestampMeta.freshness === "fresh"
                ? "bg-emerald-50 text-emerald-600 border-emerald-200"
                : timestampMeta.freshness === "recent"
                ? "bg-amber-50 text-amber-600 border-amber-200"
                : timestampMeta.freshness === "aged"
                ? "bg-orange-50 text-orange-600 border-orange-200"
                : "bg-rose-50 text-rose-600 border-rose-200"
            }`}
          >
            <History className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-black text-slate-900 flex items-center gap-1">
                <span>Last Updated:</span>
                <span className="text-indigo-600 font-extrabold">{timestampMeta.relative}</span>
              </span>
              <span
                className={`text-[9.5px] px-2 py-0.5 rounded-full font-black border flex items-center gap-1 ${
                  timestampMeta.freshness === "fresh"
                    ? "bg-emerald-500/15 text-emerald-700 border-emerald-500/30"
                    : timestampMeta.freshness === "recent"
                    ? "bg-amber-500/15 text-amber-700 border-amber-500/30"
                    : timestampMeta.freshness === "aged"
                    ? "bg-orange-500/15 text-orange-700 border-orange-500/30"
                    : "bg-rose-500/15 text-rose-700 border-rose-500/30"
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    timestampMeta.freshness === "fresh"
                      ? "bg-emerald-500 animate-pulse"
                      : timestampMeta.freshness === "recent"
                      ? "bg-amber-500"
                      : timestampMeta.freshness === "aged"
                      ? "bg-orange-500"
                      : "bg-rose-500"
                  }`}
                />
                {timestampMeta.freshnessLabel}
              </span>
            </div>
            <p className="text-[10.5px] text-slate-500 font-medium">
              Synced: {timestampMeta.absolute}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto justify-end pt-1 sm:pt-0 border-t sm:border-t-0 border-slate-100">
          <button
            onClick={() => setShowTimestampDetails(true)}
            className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer active-press border border-slate-200"
            title="View sync timestamp details"
          >
            <Info className="w-3.5 h-3.5 text-slate-500" />
            <span>Details</span>
          </button>

          <button
            onClick={handleTriggerDecsPull}
            className="flex-1 sm:flex-initial px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 shadow-xs cursor-pointer active-press"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Pull DECS Update</span>
          </button>
        </div>
      </div>

      {/* HIHR Turnback Status Card */}
      <div
        className={`rounded-2xl p-3 border shadow-xs flex items-center justify-between gap-2.5 ${
          turnbackData && turnbackData.records.length > 0
            ? "bg-rose-50/90 border-rose-200"
            : "bg-white border-slate-200"
        }`}
      >
        <div className="flex items-center gap-2.5">
          <div
            className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${
              turnbackData && turnbackData.records.length > 0
                ? "bg-rose-600 text-white border-rose-700 shadow-xs"
                : "bg-slate-100 text-slate-500 border-slate-200"
            }`}
          >
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-black text-slate-900">
                Turnback List (HIHR)
              </span>
              {turnbackData && turnbackData.records.length > 0 ? (
                <span className="px-2 py-0.5 rounded-full bg-rose-600 text-white text-[9.5px] font-black tracking-wider flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-300 animate-ping" />
                  {turnbackData.records.length} TB PILOTS
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[9.5px] font-bold border border-slate-200">
                  No Active Turnbacks
                </span>
              )}
            </div>
            <p className="text-[10.5px] text-slate-500 font-medium">
              {turnbackData && turnbackData.records.length > 0
                ? `${turnbackPilotsCount} matching reserve pilots tagged with TB badge on current roster.`
                : "Run HIHR from DECS Portal to highlight reserve turnbacks."}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {turnbackData && (
            <button
              onClick={() => clearTurnbackData()}
              className="px-2.5 py-1.5 bg-rose-100 hover:bg-rose-200 text-rose-800 rounded-xl text-xs font-black transition cursor-pointer active-press border border-rose-300"
              title="Clear active turnback list"
            >
              Clear TB
            </button>
          )}
          <button
            onClick={() => setIsTurnbackModalOpen(true)}
            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black transition flex items-center gap-1.5 cursor-pointer active-press shadow-xs"
          >
            <Upload className="w-3.5 h-3.5 text-rose-300" />
            <span>Import HIHR</span>
          </button>
        </div>
      </div>

      {/* 7-Day Interactive Date Selector Ribbon */}
      <div className="bg-white rounded-2xl p-2 sm:p-3 border border-slate-200 shadow-xs flex flex-col gap-2">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-black text-slate-700 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-indigo-600" />
            SELECT RESERVE DAY (AUG {displayDays[0]} – {displayDays[displayDays.length - 1]})
          </span>
          <span className="text-[11px] text-slate-500 font-bold">
            {dayStats.available} Available for Duty
          </span>
        </div>

        <div className="grid grid-cols-7 gap-1.5">
          {displayDays.map((d) => {
            const isSelected = selectedDay === d;
            const isToday = d === new Date().getDate();
            const dayAvailCount = n6dReserves?.pilots?.filter((p) => p.days[d]?.isAvailable).length || 0;
            return (
              <button
                key={d}
                onClick={() => setSelectedDay(d)}
                className={`relative flex flex-col items-center py-2 px-1 rounded-xl transition border cursor-pointer active-press ${
                  isSelected
                    ? "bg-indigo-600 text-white border-indigo-600 shadow-md font-black ring-2 ring-indigo-400/40"
                    : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 hover:border-slate-300"
                }`}
              >
                {isToday ? (
                  <span className={`text-[8px] font-black uppercase tracking-wider px-1 rounded-xs mb-0.5 ${
                    isSelected ? "bg-amber-400 text-slate-900" : "bg-indigo-100 text-indigo-700"
                  }`}>
                    TODAY
                  </span>
                ) : (
                  <span className="text-[10px] uppercase font-bold opacity-80">AUG</span>
                )}
                <span className="text-sm sm:text-base font-black leading-none my-0.5">{d}</span>
                <span
                  className={`text-[9px] px-1.5 py-0.2 rounded-full font-black mt-0.5 ${
                    isSelected ? "bg-white text-indigo-900" : "bg-emerald-100 text-emerald-800"
                  }`}
                >
                  {dayAvailCount} RSV
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Quick Metrics Breakdown for Selected Day */}
      <div className="grid grid-cols-4 gap-2">
        <div className="bg-emerald-50 border border-emerald-200/80 rounded-2xl p-2.5 flex flex-col items-center justify-center text-center">
          <span className="text-xs font-black text-emerald-800">{dayStats.available}</span>
          <span className="text-[10px] font-bold text-emerald-600">Available</span>
        </div>
        <div className="bg-teal-50 border border-teal-200/80 rounded-2xl p-2.5 flex flex-col items-center justify-center text-center">
          <span className="text-xs font-black text-teal-800">
            {dayStats.rap1 + dayStats.rap2}
          </span>
          <span className="text-[10px] font-bold text-teal-600">Active RAPs</span>
        </div>
        <div className="bg-sky-50 border border-sky-200/80 rounded-2xl p-2.5 flex flex-col items-center justify-center text-center">
          <span className="text-xs font-black text-sky-800">{dayStats.fly}</span>
          <span className="text-[10px] font-bold text-sky-600">Flying / Seq</span>
        </div>
        <div className="bg-slate-100 border border-slate-200 rounded-2xl p-2.5 flex flex-col items-center justify-center text-center">
          <span className="text-xs font-black text-slate-800">{dayStats.off}</span>
          <span className="text-[10px] font-bold text-slate-600">Days Off (24)</span>
        </div>
      </div>

      {/* Toolbar: Order Toggle + Search + Filter Pills */}
      <div className="bg-white rounded-2xl p-3 border border-slate-200 shadow-xs flex flex-col gap-2.5">
        {/* Order Mode Toggle */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 flex-1 min-w-[280px]">
            <button
              onClick={() => setOrderMode("reverse")}
              className={`flex-1 py-1.5 px-2.5 rounded-lg text-xs font-black transition flex items-center justify-center gap-1.5 cursor-pointer ${
                orderMode === "reverse"
                  ? "bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Flame className="w-3.5 h-3.5" />
              <span>Callout Order (Junior #1 First)</span>
            </button>
            <button
              onClick={() => setOrderMode("seniority")}
              className={`flex-1 py-1.5 px-2.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                orderMode === "seniority"
                  ? "bg-slate-900 text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <ArrowDownUp className="w-3.5 h-3.5" />
              <span>Seniority Order (Senior First)</span>
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search pilot name, seniority # (e.g. 2221), or staff ID..."
            className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              onTouchEnd={(e) => {
                e.preventDefault();
                setSearchQuery("");
              }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-slate-600 active:text-slate-900 cursor-pointer z-10"
              aria-label="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-0.5">
          {[
            { id: "AVAILABLE", label: `Available Reserves (${dayStats.available})` },
            { id: "TURNBACK", label: `Turnback TB (${turnbackPilotsCount})` },
            { id: "ALL", label: `All Pilots (${dayStats.total})` },
            { id: "RAP1", label: `RAP 1 Early (${dayStats.rap1})` },
            { id: "RAP2", label: `RAP 2 Late (${dayStats.rap2})` },
            { id: "SB", label: `Standby (${dayStats.sb})` },
            { id: "FLY", label: `Flying (${dayStats.fly})` },
            { id: "OFF", label: `Off (24H)` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1 rounded-xl text-[11px] font-extrabold whitespace-nowrap transition cursor-pointer active-press border ${
                statusFilter === tab.id
                  ? tab.id === "TURNBACK"
                    ? "bg-rose-600 text-white border-rose-600 shadow-xs ring-2 ring-rose-400/40"
                    : "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                  : tab.id === "TURNBACK" && turnbackPilotsCount > 0
                  ? "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100"
                  : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Pilots Callout Queue List */}
      <div className="flex flex-col gap-2.5">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            <Users className="w-4 h-4 text-indigo-600" />
            Showing {processedPilots.length} Pilots for AUG {selectedDay}
          </span>
          <span className="text-[11px] text-slate-500 font-bold">
            {orderMode === "reverse" ? "Junior → Senior" : "Senior → Junior"}
          </span>
        </div>

        {processedPilots.length === 0 ? (
          <div className="bg-white rounded-3xl p-8 border border-slate-200 text-center flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-800">No Pilots Match Filter</h3>
              <p className="text-xs text-slate-500 mt-1">
                Try switching the status filter to "All Pilots" or clearing your search.
              </p>
            </div>
            <button
              onClick={() => {
                setStatusFilter("ALL");
                setSearchQuery("");
              }}
              className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-xs font-black border border-indigo-200 hover:bg-indigo-100 transition cursor-pointer"
            >
              Show All Pilots
            </button>
          </div>
        ) : (
          processedPilots.map((pilot, index) => {
            const queueRank = index + 1;
            const isNextUp = orderMode === "reverse" && queueRank === 1 && statusFilter === "AVAILABLE";
            const dayStatus = pilot.days[selectedDay];
            const isExpanded = expandedPilotSen === pilot.seniority;
            const isUserProfileMatch =
              (userProfile?.seniorityNumber && pilot.seniority.includes(userProfile.seniorityNumber)) ||
              (userProfile?.employeeId && pilot.employeeId === userProfile.employeeId);
            const isTurnback = isPilotTurnback(pilot, turnbackData);

            return (
              <div
                key={pilot.seniority}
                className={`relative bg-white rounded-2xl border transition-all shadow-xs overflow-hidden ${
                  isTurnback
                    ? "border-rose-400 ring-2 ring-rose-400/40 bg-rose-50/15"
                    : isNextUp
                    ? "border-amber-400 ring-2 ring-amber-400/30 bg-amber-50/20"
                    : isUserProfileMatch
                    ? "border-sky-400 ring-2 ring-sky-400/30 bg-sky-50/20"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                {/* Big TB Corner Badge Identifier */}
                {isTurnback && (
                  <div className="absolute top-0 right-0 z-10 pointer-events-none">
                    <div className="bg-gradient-to-r from-rose-600 to-rose-700 text-white text-[10px] font-black px-2.5 py-0.5 rounded-bl-xl shadow-xs border-b border-l border-rose-800 tracking-wider flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-300 animate-ping" />
                      <span>TB</span>
                    </div>
                  </div>
                )}

                {/* Main Pilot Card Header */}
                <div
                  onClick={() => setExpandedPilotSen(isExpanded ? null : pilot.seniority)}
                  className="p-3.5 flex flex-col gap-2.5 cursor-pointer active-press"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      {/* Queue Rank Badge */}
                      <div
                        className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs shrink-0 shadow-xs border ${
                          isTurnback
                            ? "bg-rose-600 text-white border-rose-700 shadow-rose-500/20"
                            : isNextUp
                            ? "bg-amber-400 text-slate-950 border-amber-500 shadow-amber-400/30 animate-pulse"
                            : queueRank <= 3
                            ? "bg-indigo-600 text-white border-indigo-700"
                            : queueRank <= 10
                            ? "bg-slate-800 text-white border-slate-900"
                            : "bg-slate-100 text-slate-700 border-slate-200"
                        }`}
                      >
                        #{queueRank}
                      </div>

                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm font-black text-slate-900 tracking-tight leading-tight">
                            {pilot.name}
                          </h3>
                          {isTurnback && (
                            <span className="px-2 py-0.5 rounded-full bg-rose-600 text-white text-[9px] font-black uppercase tracking-wider border border-rose-700 shadow-xs flex items-center gap-1">
                              <AlertTriangle className="w-2.5 h-2.5 text-amber-300" />
                              TB
                            </span>
                          )}
                          {isNextUp && (
                            <span className="px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[9px] font-black uppercase tracking-wider">
                              🔥 NEXT TO CALL
                            </span>
                          )}
                          {isUserProfileMatch && (
                            <span className="px-2 py-0.5 rounded-full bg-sky-500 text-white text-[9px] font-black uppercase tracking-wider">
                              YOU
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-slate-500 font-bold mt-0.5">
                          <span className="text-slate-700">SEN {pilot.seniority}</span>
                          <span>•</span>
                          <span>SC {pilot.employeeId}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {getStatusBadge(dayStatus)}
                      <div className="text-slate-400 p-1">
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </div>
                    </div>
                  </div>

                  {/* 7-Day Mini Ribbon Strip */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 gap-1">
                    <div className="flex items-center gap-1 flex-1">
                      {displayDays.map((d) => {
                        const st = pilot.days[d];
                        const isCurrentDay = selectedDay === d;
                        return (
                          <div
                            key={d}
                            title={`Aug ${d}: ${st?.code || st?.status || "Off"}`}
                            className={`flex-1 py-1 rounded-lg border text-center text-[9.5px] transition ${getMiniDayColor(
                              st
                            )} ${isCurrentDay ? "ring-2 ring-indigo-500 font-black" : ""}`}
                          >
                            <span className="block leading-none font-extrabold">{d}</span>
                            <span className="block text-[8px] leading-none mt-0.5 truncate px-0.5 opacity-90">
                              {st?.rapType === "RAP1"
                                ? "R1"
                                : st?.rapType === "RAP2"
                                ? "R2"
                                : st?.rapType === "STANDBY"
                                ? "SB"
                                : st?.status === "FLY"
                                ? "FLY"
                                : st?.status === "SK"
                                ? "SK"
                                : st?.status === "OFF"
                                ? "24"
                                : st?.code || "—"}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    {/* Hours Summary */}
                    <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 pl-2 shrink-0 border-l border-slate-100">
                      <div className="flex flex-col items-end">
                        <span className="text-slate-400 text-[8.5px]">PROJ</span>
                        <span className="text-slate-800 font-black">{pilot.projHours.toFixed(1)}h</span>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="text-slate-400 text-[8.5px]">GTD</span>
                        <span className="text-slate-800 font-black">{pilot.gtdHours.toFixed(1)}h</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Expanded Detailed Breakdown Accordion */}
                {isExpanded && (
                  <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex flex-col gap-3 animate-fadeIn">
                    {/* Turnback Alert Notice */}
                    {isTurnback && (
                      <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 shadow-2xs">
                        <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                        <div>
                          <span className="text-xs font-black text-rose-900 block">
                            RESERVE TURNBACK LIST (HIHR)
                          </span>
                          <span className="text-[11px] text-rose-700 font-medium leading-tight block mt-0.5">
                            Pilot is currently identified on the DECS HIHR turnback roster.
                          </span>
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                      <div className="bg-white p-2 rounded-xl border border-slate-200">
                        <span className="text-[10px] text-slate-400 font-bold block">PROJECTED (PROJ)</span>
                        <span className="text-sm font-black text-slate-900">{pilot.projHours.toFixed(2)}h</span>
                      </div>
                      <div className="bg-white p-2 rounded-xl border border-slate-200">
                        <span className="text-[10px] text-slate-400 font-bold block">GREATER TO DATE (GTD)</span>
                        <span className="text-sm font-black text-slate-900">{pilot.gtdHours.toFixed(2)}h</span>
                      </div>
                      <div className="bg-white p-2 rounded-xl border border-slate-200">
                        <span className="text-[10px] text-slate-400 font-bold block">ACTUAL / SCHED (ACT)</span>
                        <span className="text-sm font-black text-slate-900">{pilot.actSkdHours.toFixed(2)}h</span>
                      </div>
                    </div>

                    {/* 7-Day Table */}
                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                      <div className="bg-slate-100 px-3 py-1.5 text-[10px] font-black text-slate-600 uppercase tracking-wider border-b border-slate-200 flex justify-between">
                        <span>Day</span>
                        <span>Status & Times</span>
                        <span>Availability</span>
                      </div>
                      <div className="divide-y divide-slate-100 text-xs font-bold">
                        {displayDays.map((d) => {
                          const st = pilot.days[d];
                          const isCurrent = selectedDay === d;
                          return (
                            <div
                              key={d}
                              className={`px-3 py-2 flex items-center justify-between ${
                                isCurrent ? "bg-indigo-50/60 font-black" : ""
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <span
                                  className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black ${
                                    isCurrent ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-700"
                                  }`}
                                >
                                  {d}
                                </span>
                                <span className="text-slate-700">AUG {d}</span>
                              </div>

                              <div className="flex items-center gap-2">
                                {st?.rapWindow && (
                                  <span className="text-slate-600 font-mono text-[11px]">{st.rapWindow}</span>
                                )}
                                {st?.sequenceNumber && (
                                  <span className="text-sky-600 font-mono text-[11px]">SEQ {st.sequenceNumber}</span>
                                )}
                                {getStatusBadge(st)}
                              </div>

                              <div>
                                {st?.isAvailable ? (
                                  <span className="text-emerald-600 text-[11px] font-black flex items-center gap-1">
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    Available
                                  </span>
                                ) : (
                                  <span className="text-slate-400 text-[11px]">Unavailable</span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Raw N6D Import / Paste Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-[100000] flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fadeIn">
          <div className="bg-white w-full max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-slideUp">
            {/* Modal Header */}
            <div className="flex justify-between items-center px-5 py-4 border-b border-slate-200 bg-slate-50/80">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
                  <FileSpreadsheet className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">Import N6D Reserves List</h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Paste raw text from DECS / FOS N6D display
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsImportModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 flex flex-col gap-3 overflow-y-auto flex-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black text-slate-700">Raw N6D Text</label>
                <button
                  onClick={() => setImportRawText(DEFAULT_N6D_RAW_TEXT)}
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Load Sample ORD E75 CAPT
                </button>
              </div>

              <textarea
                rows={10}
                value={importRawText}
                onChange={(e) => {
                  setImportRawText(e.target.value);
                  setImportError(null);
                }}
                placeholder="ORD    E75   CAPT  RESERVES DISPLAY  15AUG AS OF 1718  15AUG26..."
                className="w-full p-3 font-mono text-[11px] bg-slate-900 text-emerald-400 rounded-xl border border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none scrollbar-thin"
              />

              {importError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-bold text-rose-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{importError}</span>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex gap-2">
              <button
                onClick={() => setIsImportModalOpen(false)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer active-press"
              >
                Cancel
              </button>
              <button
                onClick={handleImportSubmit}
                className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 shadow-md cursor-pointer active-press"
              >
                <CheckCircle2 className="w-4 h-4" />
                Apply N6D Data
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Timestamp & Sync Status Details Modal */}
      {showTimestampDetails && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-[100000] flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fadeIn">
          <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-slideUp">
            {/* Modal Header */}
            <div className="flex justify-between items-center px-5 py-4 border-b border-slate-200 bg-slate-50/80">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
                  <History className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">DECS Sync Timestamp</h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Data freshness & host verification
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowTimestampDetails(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 flex flex-col gap-3.5 overflow-y-auto">
              {/* Freshness Banner */}
              <div
                className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 ${
                  timestampMeta.freshness === "fresh"
                    ? "bg-emerald-50 border-emerald-200"
                    : timestampMeta.freshness === "recent"
                    ? "bg-amber-50 border-amber-200"
                    : timestampMeta.freshness === "aged"
                    ? "bg-orange-50 border-orange-200"
                    : "bg-rose-50 border-rose-200"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-3 h-3 rounded-full ${
                      timestampMeta.freshness === "fresh"
                        ? "bg-emerald-500 animate-pulse ring-4 ring-emerald-400/20"
                        : timestampMeta.freshness === "recent"
                        ? "bg-amber-500"
                        : timestampMeta.freshness === "aged"
                        ? "bg-orange-500"
                        : "bg-rose-500"
                    }`}
                  />
                  <div>
                    <span className="text-xs font-black text-slate-900 block leading-tight">
                      {timestampMeta.freshnessLabel}
                    </span>
                    <span className="text-[11px] text-slate-600 font-medium">
                      Updated {timestampMeta.relative}
                    </span>
                  </div>
                </div>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-white text-slate-700 border border-slate-200 shadow-2xs">
                  N6D QUEUE
                </span>
              </div>

              {/* Exact Timestamps Grid */}
              <div className="flex flex-col gap-2 bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200/80">
                  <span className="text-slate-500 font-bold flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-indigo-600" />
                    Local Device Sync
                  </span>
                  <span className="font-mono font-black text-slate-900 text-right text-[11px]">
                    {timestampMeta.absolute}
                  </span>
                </div>

                <div className="flex items-center justify-between pb-2 border-b border-slate-200/80">
                  <span className="text-slate-500 font-bold flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                    DECS Host As-Of
                  </span>
                  <span className="font-mono font-black text-slate-900 text-[11px]">
                    {n6dReserves?.asOfTime} ({n6dReserves?.asOfDate})
                  </span>
                </div>

                <div className="flex items-center justify-between pb-2 border-b border-slate-200/80">
                  <span className="text-slate-500 font-bold">Roster Scope</span>
                  <span className="font-bold text-slate-800">
                    {n6dReserves?.base} • {n6dReserves?.equipment} • {n6dReserves?.seat} ({n6dReserves?.category})
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-bold">Pilots & Window</span>
                  <span className="font-bold text-emerald-700">
                    {n6dReserves?.pilots?.length || 0} Pilots • {displayDays.length} Days (AUG {displayDays[0]}–{displayDays[displayDays.length - 1]})
                  </span>
                </div>
              </div>

              {/* Info Note */}
              <div className="p-3 bg-indigo-50/60 rounded-xl border border-indigo-100 flex items-start gap-2.5">
                <Info className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                <p className="text-[11px] text-indigo-950/80 leading-relaxed font-medium">
                  The N6D list updates dynamically in DECS as Crew Scheduling assigns airport standbys (SB), RAP callouts, and open time pairings. Pulling an update refreshes your exact place in the callout queue.
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex gap-2">
              <button
                onClick={() => {
                  setShowTimestampDetails(false);
                  setIsImportModalOpen(true);
                }}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer active-press border border-slate-200"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Paste N6D</span>
              </button>

              <button
                onClick={() => {
                  setShowTimestampDetails(false);
                  handleTriggerDecsPull();
                }}
                className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 shadow-md cursor-pointer active-press"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Pull from DECS</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HIHR Turnback Import Modal */}
      {isTurnbackModalOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-[100000] flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fadeIn">
          <div className="bg-white w-full max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-slideUp">
            {/* Modal Header */}
            <div className="flex justify-between items-center px-5 py-4 border-b border-slate-200 bg-slate-50/80">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">Import Turnback List (HIHR)</h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Paste raw DECS HIHR turnback output
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsTurnbackModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 flex flex-col gap-3.5 overflow-y-auto">
              <div className="text-xs text-slate-600 leading-relaxed">
                Paste the terminal text from DECS command <code className="px-1.5 py-0.5 rounded bg-slate-100 font-mono text-slate-900 font-bold">HIHR/(DATE)/(DATE)^</code> to automatically tag turnback pilots on your reserve callout queue.
              </div>

              {turnbackImportError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-bold text-rose-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{turnbackImportError}</span>
                </div>
              )}

              <textarea
                value={turnbackRawText}
                onChange={(e) => setTurnbackRawText(e.target.value)}
                placeholder="Paste raw HIHR turnback terminal text here..."
                rows={8}
                className="w-full p-3 font-mono text-xs bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500 text-slate-800"
              />
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex gap-2">
              <button
                onClick={() => setIsTurnbackModalOpen(false)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer active-press"
              >
                Cancel
              </button>
              <button
                onClick={handleTurnbackImportSubmit}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 shadow-md cursor-pointer active-press"
              >
                <CheckCircle2 className="w-4 h-4" />
                Apply Turnback Data
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
