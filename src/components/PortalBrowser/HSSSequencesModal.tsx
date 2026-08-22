"use client";

import { useState, useMemo } from "react";
import {
  X,
  Plane,
  Calendar as CalendarIcon,
  ChevronDown,
  ChevronUp,
  Clock,
  MapPin,
  Sparkles,
  Layers,
  ArrowRight,
  Clipboard,
  Check,
  Search,
  ExternalLink,
  Shield,
  FileText,
  Building,
  Zap,
} from "lucide-react";
import { SequenceTrip, DutyPeriod, FlightLeg } from "../../types";
import { useCrewStore } from "../../store/useCrewStore";
import { isRealHotelInfo } from "../../lib/parser";
import { parseHssSchedule } from "../../lib/parser";
import { parseHssText } from "../../lib/hssParser";
import { typeMacroOnDecsScreen } from "../../lib/keyboardSimEngine";

interface HSSSequencesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateToCalendar?: (dateStr?: string) => void;
}

export default function HSSSequencesModal({
  isOpen,
  onClose,
  onNavigateToCalendar,
}: HSSSequencesModalProps) {
  const sequences = useCrewStore((state) => state.sequences);
  const mergeHssIntoSequence = useCrewStore((state) => state.mergeHssIntoSequence);
  const addSequences = useCrewStore((state) => state.addSequences);
  const setActiveTab = useCrewStore((state) => state.setActiveTab);

  const [searchQuery, setSearchQuery] = useState("");
  const [expandedSeqId, setExpandedSeqId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedMonthFilter, setSelectedMonthFilter] = useState<string>("current"); // "prior" | "current" | "future" | "all"
  const [showHssPaste, setShowHssPaste] = useState(false);
  const [hssPasteText, setHssPasteText] = useState("");
  const [pasteSuccess, setPasteSuccess] = useState<string | null>(null);
  const [selectedSeqIds, setSelectedSeqIds] = useState<Set<string>>(new Set());

  // Month Keys: 2026-07 (Prior), 2026-08 (Current), 2026-09 (Future)
  const PRIOR_MONTH_KEY = "2026-07";
  const CURRENT_MONTH_KEY = "2026-08";
  const FUTURE_MONTH_KEY = "2026-09";

  // Toggle single selection
  const toggleSelect = (seqId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedSeqIds((prev) => {
      const next = new Set(prev);
      if (next.has(seqId)) {
        next.delete(seqId);
      } else {
        next.add(seqId);
      }
      return next;
    });
  };

  // Select all in active month
  const selectAllInActiveMonth = () => {
    const newSet = new Set(selectedSeqIds);
    displayedMonths.forEach((m) => {
      m.sequences.forEach((s) => newSet.add(s.id));
    });
    setSelectedSeqIds(newSet);
  };

  // Clear selection
  const clearSelection = () => {
    setSelectedSeqIds(new Set());
  };

  // Helper to toggle sequence detail
  const toggleSequence = (seqId: string) => {
    setExpandedSeqId((prev) => (prev === seqId ? null : seqId));
  };

  // Format month key "2026-08" to "August 2026"
  const formatMonthTitle = (monthKey: string) => {
    try {
      const [yearStr, monthStr] = monthKey.split("-");
      const year = parseInt(yearStr, 10);
      const month = parseInt(monthStr, 10) - 1;
      const date = new Date(year, month, 1);
      return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    } catch {
      return monthKey;
    }
  };

  // Group sequences by month
  const groupedSequences = useMemo(() => {
    const groups: Record<
      string,
      {
        monthKey: string;
        title: string;
        sequences: SequenceTrip[];
        totalBlockMins: number;
        totalCreditMins: number;
        totalTrips: number;
      }
    > = {
      [PRIOR_MONTH_KEY]: {
        monthKey: PRIOR_MONTH_KEY,
        title: "July 2026 (Month Prior)",
        sequences: [],
        totalBlockMins: 0,
        totalCreditMins: 0,
        totalTrips: 0,
      },
      [CURRENT_MONTH_KEY]: {
        monthKey: CURRENT_MONTH_KEY,
        title: "August 2026 (Current Month)",
        sequences: [],
        totalBlockMins: 0,
        totalCreditMins: 0,
        totalTrips: 0,
      },
      [FUTURE_MONTH_KEY]: {
        monthKey: FUTURE_MONTH_KEY,
        title: "September 2026 (Future Month)",
        sequences: [],
        totalBlockMins: 0,
        totalCreditMins: 0,
        totalTrips: 0,
      },
    };

    // Filter to only LIVE, non-dropped sequences
    const liveSequences = sequences.filter(
      (seq) =>
        !seq.isDropped &&
        !(seq as any).isDtsDropped &&
        (seq as any).status !== "DROPPED" &&
        seq.statusTag !== "DROP" &&
        seq.statusTag !== "DROPPED"
    );

    liveSequences.forEach((seq) => {
      if (!seq.startDate) return;
      const monthKey = seq.startDate.substring(0, 7); // "YYYY-MM"

      if (!groups[monthKey]) {
        groups[monthKey] = {
          monthKey,
          title: formatMonthTitle(monthKey),
          sequences: [],
          totalBlockMins: 0,
          totalCreditMins: 0,
          totalTrips: 0,
        };
      }

      groups[monthKey].sequences.push(seq);
      groups[monthKey].totalBlockMins += seq.totalBlockMinutes || 0;
      groups[monthKey].totalCreditMins += seq.totalCreditMinutes || seq.totalBlockMinutes || 0;
      groups[monthKey].totalTrips += 1;
    });

    // Sort sequences within each month by start date
    Object.values(groups).forEach((g) => {
      g.sequences.sort((a, b) => (a.startDate || "").localeCompare(b.startDate || ""));
    });

    return groups;
  }, [sequences]);

  // Filter groups according to selected tab and search query
  const displayedMonths = useMemo(() => {
    let keys: string[] = [];
    if (selectedMonthFilter === "prior") keys = [PRIOR_MONTH_KEY];
    else if (selectedMonthFilter === "current") keys = [CURRENT_MONTH_KEY];
    else if (selectedMonthFilter === "future") keys = [FUTURE_MONTH_KEY];
    else keys = [PRIOR_MONTH_KEY, CURRENT_MONTH_KEY, FUTURE_MONTH_KEY];

    const q = searchQuery.toLowerCase().trim();

    return keys
      .map((k) => {
        const group = groupedSequences[k] || {
          monthKey: k,
          title: formatMonthTitle(k),
          sequences: [],
          totalBlockMins: 0,
          totalCreditMins: 0,
          totalTrips: 0,
        };

        if (!q) return group;

        const filtered = group.sequences.filter((seq) => {
          const matchSeq = seq.sequenceNumber.toLowerCase().includes(q);
          const matchBase = seq.base?.toLowerCase().includes(q);
          const matchLayover = seq.layoverCities?.some((c) => c.toLowerCase().includes(q));
          const matchLegs = seq.dutyPeriods?.some((dp) =>
            dp.legs?.some(
              (l) =>
                l.flightNumber.toLowerCase().includes(q) ||
                l.depAirport.toLowerCase().includes(q) ||
                l.arrAirport.toLowerCase().includes(q)
            )
          );
          return matchSeq || matchBase || matchLayover || matchLegs;
        });

        return {
          ...group,
          sequences: filtered,
          totalTrips: filtered.length,
        };
      })
      .filter((g) => g.sequences.length > 0 || !q);
  }, [groupedSequences, selectedMonthFilter, searchQuery]);

  // Format minutes into hours/minutes (e.g., "12h 45m" or "12.75h")
  const formatMins = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h}h ${m > 0 ? `${m}m` : ""}`.trim();
  };

  // Copy DECS HSS Command
  const handleCopyDecsHss = (seq: SequenceTrip) => {
    const datePart = seq.startDate ? seq.startDate.substring(8, 10) : "";
    const monthLetters = seq.startDate
      ? new Date(seq.startDate + "T12:00:00").toLocaleDateString("en-US", { month: "short" }).toUpperCase()
      : "";
    const command = `HSS ${seq.sequenceNumber}/${datePart}${monthLetters}`;

    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(command);
      setCopiedId(seq.id);
      setTimeout(() => setCopiedId(null), 2500);
    }
  };

  // Type & Execute DECS HSS Command directly on DECS Terminal Screen
  const handleExecuteDecsHss = async (seq: SequenceTrip) => {
    let seat = "CA";
    const rankStr = (seq.rank || (seq as any).seat || (seq as any).role || "").toUpperCase();
    if (rankStr.includes("FA") || rankStr.includes("FLIGHT ATTENDANT") || rankStr.includes("ATTENDANT")) {
      seat = "FA";
    } else if (rankStr.includes("FO") || rankStr.includes("F/O") || rankStr.includes("FIRST OFFICER") || rankStr.includes("SIC")) {
      seat = "FO";
    }

    const datePart = seq.startDate ? seq.startDate.substring(8, 10) : "";
    const monthLetters = seq.startDate
      ? new Date(seq.startDate + "T12:00:00").toLocaleDateString("en-US", { month: "short" }).toUpperCase()
      : "";
    const command = `HSS/${seat}/${seq.sequenceNumber}/${datePart}${monthLetters}^`;

    // Type character by character into the active DECS terminal screen
    await typeMacroOnDecsScreen(command);

    if (typeof window !== "undefined" && (window as any).electronAPI?.sendMacro) {
      await (window as any).electronAPI.sendMacro(command);
    }

    setPasteSuccess(`⚡ Sent ${command} to WebSabre!`);
    setTimeout(() => {
      onClose();
    }, 600);
  };

  // Batch execute multiple HSS commands sequentially
  const handleBatchExecuteDecsHss = async (seqsToPull: SequenceTrip[]) => {
    if (!seqsToPull.length) return;
    setPasteSuccess(`⚡ Batch pulling ${seqsToPull.length} pairings from WebSabre...`);
    seqsToPull.forEach((seq, idx) => {
      setTimeout(() => {
        handleExecuteDecsHss(seq);
      }, idx * 1600);
    });
  };

  // Handle Quick HSS Text Parse & Merge
  const handleParseAndMergeHss = () => {
    if (!hssPasteText.trim()) return;

    try {
      const targetMonthKey =
        selectedMonthFilter === "prior"
          ? PRIOR_MONTH_KEY
          : selectedMonthFilter === "future"
          ? FUTURE_MONTH_KEY
          : CURRENT_MONTH_KEY;
      const parsedTrips = parseHssSchedule(hssPasteText, {
        targetMonthKey,
        existingSequences: sequences,
      });
      if (parsedTrips && parsedTrips.length > 0) {
        parsedTrips.forEach((trip) => {
          mergeHssIntoSequence(trip.sequenceNumber, trip);
        });
        const first = parsedTrips[0];
        const legsCount = first.dutyPeriods.reduce((acc, dp) => acc + dp.legs.length, 0);
        setPasteSuccess(
          `✓ Updated SEQ #${first.sequenceNumber} (${first.startDate} to ${first.endDate} • ${first.dutyPeriods.length} days • ${legsCount} legs)!`
        );
        setHssPasteText("");
        setTimeout(() => setPasteSuccess(null), 5000);
        return;
      }

      setPasteSuccess("⚠️ No valid HSS sequence patterns detected.");
      setTimeout(() => setPasteSuccess(null), 4000);
    } catch (err: any) {
      setPasteSuccess(`❌ Parse error: ${err.message || "Invalid format"}`);
      setTimeout(() => setPasteSuccess(null), 4000);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-[100000] animate-fadeIn"
        onClick={onClose}
      />
      <div className="fixed inset-x-0 bottom-0 z-[100001] w-full max-w-xl mx-auto bg-white border-t border-slate-200 rounded-t-3xl shadow-2xl flex flex-col animate-slideUp max-h-[90vh] overflow-hidden text-slate-900">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-4 flex items-center justify-between border-b border-indigo-500/20 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300 shadow-inner">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black tracking-tight text-white">HSS Pairings</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-400/20 text-amber-300 border border-amber-400/30">
                  3-Month Roster
                </span>
              </div>
              <p className="text-xs text-indigo-200/80 font-medium">
                Prior • Current • Future Month Sequences
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setShowHssPaste(!showHssPaste)}
              className={`p-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                showHssPaste
                  ? "bg-indigo-600 text-white"
                  : "bg-white/10 hover:bg-white/20 text-indigo-200"
              }`}
              title="Paste Raw HSS Text"
            >
              <FileText className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 3-Month Segmented Pill Selector Tabs */}
        <div className="p-2.5 bg-slate-100/80 border-b border-slate-200 grid grid-cols-4 gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => setSelectedMonthFilter("prior")}
            className={`py-2 px-1 rounded-xl text-xs font-black transition cursor-pointer flex flex-col items-center justify-center gap-0.5 ${
              selectedMonthFilter === "prior"
                ? "bg-indigo-600 text-white shadow-sm"
                : "bg-white text-slate-700 hover:bg-slate-50 border border-slate-200/60"
            }`}
          >
            <span className="text-[10px] uppercase font-bold tracking-wider opacity-80">Prior</span>
            <span className="text-xs font-black">July</span>
            <span className="text-[9.5px] opacity-75">
              {groupedSequences[PRIOR_MONTH_KEY]?.sequences.length || 0} Seq
            </span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedMonthFilter("current")}
            className={`py-2 px-1 rounded-xl text-xs font-black transition cursor-pointer flex flex-col items-center justify-center gap-0.5 relative ${
              selectedMonthFilter === "current"
                ? "bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-400/40"
                : "bg-white text-slate-700 hover:bg-slate-50 border border-slate-200/60"
            }`}
          >
            <span className="text-[10px] uppercase font-bold tracking-wider opacity-80">Current</span>
            <span className="text-xs font-black">August</span>
            <span className="text-[9.5px] opacity-75">
              {groupedSequences[CURRENT_MONTH_KEY]?.sequences.length || 0} Seq
            </span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedMonthFilter("future")}
            className={`py-2 px-1 rounded-xl text-xs font-black transition cursor-pointer flex flex-col items-center justify-center gap-0.5 ${
              selectedMonthFilter === "future"
                ? "bg-indigo-600 text-white shadow-sm"
                : "bg-white text-slate-700 hover:bg-slate-50 border border-slate-200/60"
            }`}
          >
            <span className="text-[10px] uppercase font-bold tracking-wider opacity-80">Future</span>
            <span className="text-xs font-black">Sept</span>
            <span className="text-[9.5px] opacity-75">
              {groupedSequences[FUTURE_MONTH_KEY]?.sequences.length || 0} Seq
            </span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedMonthFilter("all")}
            className={`py-2 px-1 rounded-xl text-xs font-black transition cursor-pointer flex flex-col items-center justify-center gap-0.5 ${
              selectedMonthFilter === "all"
                ? "bg-indigo-600 text-white shadow-sm"
                : "bg-white text-slate-700 hover:bg-slate-50 border border-slate-200/60"
            }`}
          >
            <span className="text-[10px] uppercase font-bold tracking-wider opacity-80">All 3</span>
            <span className="text-xs font-black">Months</span>
            <span className="text-[9.5px] opacity-75">{sequences.length} Total</span>
          </button>
        </div>

        {/* Quick HSS Raw Text Paste Accordion */}
        {showHssPaste && (
          <div className="p-3 bg-indigo-950 text-white border-b border-indigo-500/30 space-y-2.5 animate-fadeIn shrink-0">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-indigo-200 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                Quick HSS Text Importer & Updater
              </span>
              <span className="text-[10px] text-indigo-300 font-mono">DECS / FOS</span>
            </div>
            <textarea
              value={hssPasteText}
              onChange={(e) => setHssPasteText(e.target.value)}
              placeholder="Paste raw HSS sequence text (e.g. SEQ 14731 BASE ORD D/P 1 13AUG FLT 3602 ORD AVP...)"
              className="w-full h-20 p-2.5 bg-slate-900/90 border border-indigo-500/30 rounded-xl text-xs font-mono text-emerald-300 focus:outline-none focus:border-indigo-400 resize-none placeholder-slate-500"
            />
            <div className="flex items-center justify-between gap-2">
              {pasteSuccess ? (
                <span className="text-[11px] font-bold text-amber-300 truncate">{pasteSuccess}</span>
              ) : (
                <span className="text-[10px] text-indigo-300/80">
                  Auto-enriches duty periods and legs for matching sequence.
                </span>
              )}
              <button
                type="button"
                onClick={handleParseAndMergeHss}
                disabled={!hssPasteText.trim()}
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-black transition cursor-pointer active-press shrink-0 flex items-center gap-1.5 shadow-sm"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Merge HSS</span>
              </button>
            </div>
          </div>
        )}

        {/* Search Bar */}
        <div className="p-2.5 bg-white border-b border-slate-200 flex items-center gap-2 shrink-0">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter sequences (e.g. 14962, AVP, ORD)..."
              className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Multi-Selection Control Toolbar */}
        <div className="px-3 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={selectAllInActiveMonth}
              className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer active-press"
            >
              <Check className="w-3 h-3 text-indigo-600" />
              <span>Select All in Month</span>
            </button>
            <button
              type="button"
              onClick={clearSelection}
              className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 rounded-lg text-xs font-bold transition cursor-pointer active-press"
            >
              Clear
            </button>
          </div>
          <span className="text-xs font-black text-slate-700">
            {selectedSeqIds.size} Selected
          </span>
        </div>

        {/* Scrollable Month Sequences List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-4 scrollbar-thin">
          {displayedMonths.map((group) => (
            <div key={group.monthKey} className="space-y-2.5">
              {/* Month Header Banner */}
              <div className="bg-gradient-to-r from-slate-900 via-indigo-900 to-slate-900 text-white px-3.5 py-2.5 rounded-2xl flex items-center justify-between shadow-xs">
                <div className="flex items-center gap-2">
                  <CalendarIcon className="w-4 h-4 text-indigo-300" />
                  <span className="text-xs font-black tracking-tight">{group.title}</span>
                </div>
                <div className="text-[11px] font-bold text-indigo-200 flex items-center gap-2">
                  <span>{group.totalTrips} Trips</span>
                  <span>•</span>
                  <span>{formatMins(group.totalCreditMins)} Crd</span>
                </div>
              </div>

              {group.sequences.length === 0 ? (
                <div className="p-4 text-center bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-500 italic">
                  No sequences scheduled in this month.
                </div>
              ) : (
                <div className="space-y-2">
                  {group.sequences.map((seq) => {
                    const isSeqExpanded = expandedSeqId === seq.id;
                    const isSelected = selectedSeqIds.has(seq.id);
                    const durationDays = seq.dutyPeriods?.length || 1;

                    return (
                      <div
                        key={seq.id}
                        className={`rounded-2xl border transition overflow-hidden shadow-2xs ${
                          isSelected
                            ? "bg-indigo-50/50 border-indigo-400 ring-2 ring-indigo-500/20"
                            : "bg-white border-slate-200 hover:border-indigo-300"
                        }`}
                      >
                        {/* Sequence Card Header */}
                        <div
                          onClick={() => toggleSequence(seq.id)}
                          className="p-3 cursor-pointer flex flex-col gap-2 select-none hover:bg-slate-50/70 transition"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {/* Checkbox Pill */}
                              <button
                                type="button"
                                onClick={(e) => toggleSelect(seq.id, e)}
                                className={`px-2 py-0.5 rounded-md text-[10.5px] font-black uppercase tracking-wider transition cursor-pointer flex items-center gap-1 ${
                                  isSelected
                                    ? "bg-indigo-600 text-white shadow-xs"
                                    : "bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200"
                                }`}
                              >
                                {isSelected ? (
                                  <>
                                    <Check className="w-3 h-3 stroke-[3]" />
                                    <span>Selected</span>
                                  </>
                                ) : (
                                  <span>○ Select</span>
                                )}
                              </button>

                              <span className="px-2 py-0.5 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-700 font-black text-xs font-mono">
                                SEQ #{seq.sequenceNumber}
                              </span>
                              <span className="text-[11px] font-bold text-slate-500 font-mono">
                                {seq.base || "ORD"} • {durationDays}D
                              </span>
                            </div>

                            <div className="flex items-center gap-2">
                              <span className="text-xs font-black text-slate-900 px-2 py-0.5 bg-slate-100 rounded-lg">
                                {formatMins(seq.totalCreditMinutes || seq.totalBlockMinutes)} Credit
                              </span>
                              {isSeqExpanded ? (
                                <ChevronUp className="w-4 h-4 text-slate-400" />
                              ) : (
                                <ChevronDown className="w-4 h-4 text-slate-400" />
                              )}
                            </div>
                          </div>

                          {/* Dates & Layover summary */}
                          <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-1.5 text-slate-600 font-medium">
                              <Clock className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                              <span>
                                {seq.startDate} {seq.endDate && seq.endDate !== seq.startDate ? `→ ${seq.endDate}` : ""}
                              </span>
                            </div>

                            {seq.layoverCities && seq.layoverCities.length > 0 && (
                              <div className="flex items-center gap-1">
                                <MapPin className="w-3 h-3 text-amber-500" />
                                <span className="text-[11px] font-bold text-slate-700">
                                  {seq.layoverCities.join(" • ")}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Expanded Duty Periods & Legs Detail */}
                        {isSeqExpanded && (
                          <div className="border-t border-slate-100 bg-slate-50/80 p-3 space-y-3 animate-fadeIn">
                            <div className="space-y-2">
                              <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-wider text-slate-500">
                                <span className="flex items-center gap-1">
                                  <Layers className="w-3.5 h-3.5 text-indigo-500" />
                                  Duty Periods & Legs ({seq.dutyPeriods?.length || 0})
                                </span>
                                <span className="font-mono text-slate-400">
                                  TAFB: {seq.expTafbHours ? `${seq.expTafbHours}h` : "N/A"}
                                </span>
                              </div>

                              {seq.dutyPeriods && seq.dutyPeriods.length > 0 ? (
                                seq.dutyPeriods.map((dp: DutyPeriod, dpIdx: number) => (
                                  <div
                                    key={dpIdx}
                                    className="bg-white rounded-xl border border-slate-200 p-2.5 space-y-2 shadow-2xs"
                                  >
                                    <div className="flex items-center justify-between text-xs">
                                      <div className="flex items-center gap-2">
                                        <span className="w-5 h-5 rounded-md bg-indigo-100 text-indigo-700 font-black text-[10px] flex items-center justify-center">
                                          D{dpIdx + 1}
                                        </span>
                                        <span className="font-bold text-slate-800">
                                          {dp.layoverCity ? `Layover: ${dp.layoverCity}` : "Base Release"}
                                        </span>
                                      </div>

                                      <div className="text-[11px] text-slate-500 font-mono">
                                        Rpt {dp.reportTime || "---"} • Rls {dp.releaseTime || "---"}
                                        {dp.dutyMinutes ? ` (${formatMins(dp.dutyMinutes)})` : ""}
                                      </div>
                                    </div>

                                     {isRealHotelInfo(dp.layoverHotelInfo) && (
                                       <div className="text-[10.5px] text-slate-600 bg-amber-50/80 border border-amber-200/60 px-2 py-1 rounded-lg flex items-center gap-1.5">
                                         <Building className="w-3 h-3 text-amber-600 shrink-0" />
                                         <span className="truncate">{dp.layoverHotelInfo}</span>
                                       </div>
                                     )}

                                    {/* Flight Legs */}
                                    {dp.legs && dp.legs.length > 0 ? (
                                      <div className="space-y-1 pt-1">
                                        {dp.legs.map((leg: FlightLeg, legIdx: number) => (
                                          <div
                                            key={legIdx}
                                            className="flex items-center justify-between p-1.5 bg-slate-50 rounded-lg text-xs font-mono border border-slate-100"
                                          >
                                            <div className="flex items-center gap-2">
                                              <Plane
                                                className={`w-3.5 h-3.5 ${
                                                  leg.isDeadhead ? "text-amber-500" : "text-emerald-600"
                                                }`}
                                              />
                                              <span className="font-black text-slate-800">
                                                {leg.flightNumber}
                                              </span>
                                              {leg.isDeadhead && (
                                                <span className="px-1.5 py-0.2 rounded bg-amber-100 text-amber-700 font-bold text-[9px]">
                                                  DH
                                                </span>
                                              )}
                                            </div>

                                            <div className="flex items-center gap-1.5 text-slate-600">
                                              <span className="font-bold">{leg.depAirport}</span>
                                              <ArrowRight className="w-2.5 h-2.5 text-slate-400" />
                                              <span className="font-bold">{leg.arrAirport}</span>
                                              <span className="text-[10px] text-slate-400 ml-1">
                                                {leg.depTime} - {leg.arrTime}
                                              </span>
                                              <span className="text-[10px] font-bold text-indigo-600 ml-1">
                                                {formatMins(leg.blockMinutes)}
                                              </span>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    ) : null}
                                  </div>
                                ))
                              ) : (
                                <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-xl text-xs text-indigo-900 space-y-1">
                                  <div className="font-bold flex items-center gap-1.5 text-indigo-700">
                                    <Zap className="w-3.5 h-3.5 text-teal-600" />
                                    <span>Pairing Legs & Details Not Pulled Yet</span>
                                  </div>
                                  <p className="text-[11px] text-slate-600 leading-relaxed">
                                    Loaded from your calendar. Tap <strong className="text-teal-700">⚡ Pull HSS from WebSabre</strong> below to query DECS and auto-build the flight legs and layovers.
                                  </p>
                                </div>
                              )}
                            </div>

                            {/* 1-Tap Execution & Actions */}
                            <div className="pt-2 flex flex-wrap gap-2 border-t border-slate-200">
                              <button
                                type="button"
                                onClick={() => handleExecuteDecsHss(seq)}
                                className="flex-1 py-2 px-3 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 cursor-pointer active-press shadow-xs"
                                title="Pull this HSS pairing from WebSabre"
                              >
                                <Zap className="w-3.5 h-3.5 fill-white" />
                                <span>⚡ Pull HSS from WebSabre</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleCopyDecsHss(seq)}
                                className="py-2 px-2.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer active-press"
                              >
                                {copiedId === seq.id ? (
                                  <>
                                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                                    <span className="text-emerald-700">Copied!</span>
                                  </>
                                ) : (
                                  <>
                                    <Clipboard className="w-3.5 h-3.5 text-slate-400" />
                                    <span>Copy HSS</span>
                                  </>
                                )}
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  onClose();
                                  setActiveTab("calendar");
                                  if (onNavigateToCalendar && seq.startDate) {
                                    onNavigateToCalendar(seq.startDate);
                                  }
                                }}
                                className="py-2 px-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer active-press"
                              >
                                <CalendarIcon className="w-3.5 h-3.5 text-indigo-600" />
                                <span>Calendar</span>
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Sticky Batch Pull Action Footer */}
        <div className="p-3 bg-slate-900 border-t border-slate-800 flex flex-col gap-2 shrink-0">
          {(() => {
            const activeSeqs = displayedMonths.flatMap((m) => m.sequences);
            const selectedSeqs = activeSeqs.filter((s) => selectedSeqIds.has(s.id));
            const countToPull = selectedSeqs.length > 0 ? selectedSeqs.length : activeSeqs.length;

            return (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleBatchExecuteDecsHss(selectedSeqs.length > 0 ? selectedSeqs : activeSeqs)}
                  disabled={countToPull === 0}
                  className="flex-1 py-2.5 px-4 bg-teal-600 hover:bg-teal-500 disabled:bg-slate-700 text-white rounded-xl text-xs font-black transition flex items-center justify-center gap-2 cursor-pointer active-press shadow-md"
                >
                  <Zap className="w-4 h-4 fill-white" />
                  <span>
                    {selectedSeqs.length > 0
                      ? `⚡ Batch Pull (${selectedSeqs.length}) Selected Pairings`
                      : activeSeqs.length > 0
                      ? `⚡ Pull All (${activeSeqs.length}) in Month from WebSabre`
                      : "No Pairings to Pull"}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition cursor-pointer active-press"
                >
                  Close
                </button>
              </div>
            );
          })()}
        </div>
      </div>
    </>
  );
}
