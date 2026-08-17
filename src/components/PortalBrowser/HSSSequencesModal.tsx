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
  Info
} from "lucide-react";
import { SequenceTrip, DutyPeriod, FlightLeg } from "../../types";
import { useCrewStore } from "../../store/useCrewStore";
import { parseHssSchedule } from "../../lib/parser";
import { parseHssText } from "../../lib/hssParser";

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
  console.log("[HSSSequencesModal] Render, isOpen =", isOpen);
  const sequences = useCrewStore((state) => state.sequences);
  const mergeHssIntoSequence = useCrewStore((state) => state.mergeHssIntoSequence);
  const addSequences = useCrewStore((state) => state.addSequences);
  const setActiveTab = useCrewStore((state) => state.setActiveTab);

  const [searchQuery, setSearchQuery] = useState("");
  const [expandedSeqId, setExpandedSeqId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showHssPaste, setShowHssPaste] = useState(false);
  const [hssPasteText, setHssPasteText] = useState("");
  const [pasteSuccess, setPasteSuccess] = useState<string | null>(null);

  // Determine current active month key (e.g., "2026-08")
  const currentMonthKey = useMemo(() => {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, "0");
    const todayKey = `${y}-${m}`;

    // If we have sequences for this month, use it; otherwise find the latest month in sequences
    const hasTodayMonth = sequences.some((s) => s.startDate?.startsWith(todayKey));
    if (hasTodayMonth) return todayKey;

    if (sequences.length > 0) {
      const sortedDates = [...sequences]
        .map((s) => s.startDate?.substring(0, 7))
        .filter(Boolean)
        .sort();
      return sortedDates[sortedDates.length - 1] || "2026-08";
    }

    return "2026-08";
  }, [sequences]);

  // Expanded months state: defaults to current active month being open
  const [expandedMonths, setExpandedMonths] = useState<Record<string, boolean>>(() => ({
    [currentMonthKey]: true,
  }));

  // Helper to toggle month
  const toggleMonth = (monthKey: string) => {
    setExpandedMonths((prev) => ({
      ...prev,
      [monthKey]: !prev[monthKey],
    }));
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
    > = {};

    sequences.forEach((seq) => {
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

    // Sort months descending (latest first)
    return Object.values(groups).sort((a, b) => b.monthKey.localeCompare(a.monthKey));
  }, [sequences]);

  // Filter sequences by search query
  const filteredGroups = useMemo(() => {
    if (!searchQuery.trim()) return groupedSequences;
    const q = searchQuery.toLowerCase().trim();

    return groupedSequences
      .map((group) => {
        const filteredSeqs = group.sequences.filter((seq) => {
          const matchSeq = seq.sequenceNumber.toLowerCase().includes(q);
          const matchBase = seq.base?.toLowerCase().includes(q);
          const matchEq = seq.equipment?.toLowerCase().includes(q);
          const matchRank = seq.rank?.toLowerCase().includes(q);
          const matchLayover = seq.layoverCities?.some((c) => c.toLowerCase().includes(q));
          const matchLegs = seq.dutyPeriods?.some((dp) =>
            dp.legs?.some(
              (l) =>
                l.flightNumber.toLowerCase().includes(q) ||
                l.depAirport.toLowerCase().includes(q) ||
                l.arrAirport.toLowerCase().includes(q)
            )
          );
          return matchSeq || matchBase || matchEq || matchRank || matchLayover || matchLegs;
        });

        return {
          ...group,
          sequences: filteredSeqs,
          totalTrips: filteredSeqs.length,
        };
      })
      .filter((group) => group.sequences.length > 0);
  }, [groupedSequences, searchQuery]);

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

  // Handle Quick HSS Text Parse & Merge
  const handleParseAndMergeHss = () => {
    if (!hssPasteText.trim()) return;

    try {
      // 1. Try single sequence text parser
      const singleHss = parseHssText(hssPasteText);
      if (singleHss && singleHss.sequenceNumber) {
        mergeHssIntoSequence(singleHss.sequenceNumber, singleHss);
        setPasteSuccess(`✓ Successfully updated SEQ #${singleHss.sequenceNumber} with live HSS legs!`);
        setHssPasteText("");
        setTimeout(() => setPasteSuccess(null), 4000);
        return;
      }

      // 2. Try multi-sequence HSS schedule parser
      const parsedTrips = parseHssSchedule(hssPasteText);
      if (parsedTrips && parsedTrips.length > 0) {
        addSequences(parsedTrips);
        setPasteSuccess(`✓ Successfully imported ${parsedTrips.length} HSS sequence(s)!`);
        setHssPasteText("");
        setTimeout(() => setPasteSuccess(null), 4000);
        return;
      }

      setPasteSuccess("⚠️ No valid HSS sequence patterns detected in text.");
      setTimeout(() => setPasteSuccess(null), 4000);
    } catch (err: any) {
      setPasteSuccess(`❌ Parse error: ${err.message || "Invalid HSS format"}`);
      setTimeout(() => setPasteSuccess(null), 4000);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[100000] animate-fadeIn"
        onClick={onClose}
      />
      <div className="fixed inset-x-0 bottom-0 z-[100001] w-full max-w-xl mx-auto bg-white border-t border-slate-200 rounded-t-3xl shadow-2xl flex flex-col animate-slideUp max-h-[88vh] overflow-hidden text-slate-900">
        {/* Sticky Modal Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-4 sm:p-5 flex items-center justify-between border-b border-indigo-500/20 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300 shadow-inner">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black tracking-tight text-white">HSS Sequences</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-400/20 text-amber-300 border border-amber-400/30">
                  DECS Host Roster
                </span>
              </div>
              <p className="text-xs text-indigo-200/80 font-medium">
                {sequences.length} Sequences on Calendar • Grouped by Month
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
              title="Paste & Update HSS Text"
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

        {/* Search & Filter Bar */}
        <div className="p-3 bg-slate-50 border-b border-slate-200 flex flex-col gap-2 shrink-0">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search sequence # (e.g. 14731), airport (AVP), flight #..."
              className="w-full pl-9 pr-8 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
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

          {/* Quick HSS Raw Text Paste Accordion */}
          {showHssPaste && (
            <div className="bg-indigo-950 text-white p-3 rounded-2xl border border-indigo-500/30 space-y-2.5 animate-fadeIn">
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
                className="w-full h-24 p-2.5 bg-slate-900/90 border border-indigo-500/30 rounded-xl text-xs font-mono text-emerald-300 focus:outline-none focus:border-indigo-400 resize-none placeholder-slate-500"
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
        </div>

        {/* Scrollable Month Groups and Sequences */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 scrollbar-thin">
          {filteredGroups.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mx-auto">
                <Plane className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-slate-800">No Sequences Found</h4>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                {searchQuery
                  ? "No sequences matched your search criteria."
                  : "No calendar sequences currently loaded. Paste your HI1 or HSS schedule to populate."}
              </p>
            </div>
          ) : (
            filteredGroups.map((group) => {
              const isMonthExpanded = !!expandedMonths[group.monthKey];
              const isCurrentMonth = group.monthKey === currentMonthKey;

              return (
                <div
                  key={group.monthKey}
                  className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden transition"
                >
                  {/* Month Accordion Header */}
                  <button
                    type="button"
                    onClick={() => toggleMonth(group.monthKey)}
                    className={`w-full p-3.5 flex items-center justify-between text-left transition cursor-pointer select-none ${
                      isMonthExpanded
                        ? "bg-slate-900 text-white"
                        : "bg-slate-50 hover:bg-slate-100 text-slate-900"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs ${
                          isMonthExpanded
                            ? "bg-indigo-600 text-white"
                            : "bg-slate-200 text-slate-700"
                        }`}
                      >
                        <CalendarIcon className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-black tracking-tight">{group.title}</span>
                          {isCurrentMonth && (
                            <span className="px-2 py-0.2 rounded-full text-[9.5px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-400/40">
                              Current Month
                            </span>
                          )}
                        </div>
                        <div
                          className={`text-[11px] font-medium flex items-center gap-2 mt-0.5 ${
                            isMonthExpanded ? "text-slate-300" : "text-slate-500"
                          }`}
                        >
                          <span>{group.totalTrips} {group.totalTrips === 1 ? "Trip" : "Trips"}</span>
                          <span>•</span>
                          <span>{formatMins(group.totalBlockMins)} Blk</span>
                          <span>•</span>
                          <span>{formatMins(group.totalCreditMins)} Crd</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs font-bold px-2.5 py-1 rounded-lg ${
                          isMonthExpanded
                            ? "bg-white/10 text-white"
                            : "bg-slate-200/80 text-slate-700"
                        }`}
                      >
                        {group.sequences.length}
                      </span>
                      {isMonthExpanded ? (
                        <ChevronUp className="w-4 h-4 text-slate-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-400" />
                      )}
                    </div>
                  </button>

                  {/* Month Sequences List */}
                  {isMonthExpanded && (
                    <div className="p-3 space-y-2.5 bg-slate-50/50 divide-y divide-slate-100">
                      {group.sequences.map((seq) => {
                        const isSeqExpanded = expandedSeqId === seq.id;
                        const durationDays = seq.dutyPeriods?.length || 1;
                        const hasLegDetails =
                          seq.dutyPeriods &&
                          seq.dutyPeriods.some((dp) => dp.legs && dp.legs.length > 0);

                        return (
                          <div
                            key={seq.id}
                            className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs hover:border-indigo-300 transition"
                          >
                            {/* Sequence Card Header */}
                            <div
                              onClick={() => toggleSequence(seq.id)}
                              className="p-3 cursor-pointer flex flex-col gap-2 select-none hover:bg-slate-50/70 transition"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className="px-2.5 py-1 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-700 font-black text-xs font-mono">
                                    SEQ #{seq.sequenceNumber}
                                  </span>
                                  {seq.rank && (
                                    <span className="px-1.5 py-0.5 rounded-md bg-amber-50 border border-amber-200 text-amber-700 font-black text-[10px]">
                                      {seq.rank}
                                    </span>
                                  )}
                                  <span className="text-[11px] font-bold text-slate-500 font-mono">
                                    {seq.base || "ORD"} • {seq.equipment || "E75"}
                                  </span>
                                </div>

                                <div className="flex items-center gap-1.5">
                                  <span className="text-xs font-black text-slate-800">
                                    {formatMins(seq.totalCreditMinutes || seq.totalBlockMinutes)}
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
                                  <span className="text-slate-400">•</span>
                                  <span className="text-[11px] font-bold text-slate-500">
                                    {durationDays === 1 ? "1-Day Turn" : `${durationDays}-Day Trip`}
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
                                {/* Duty Periods */}
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1">
                                      <Layers className="w-3 h-3 text-indigo-500" />
                                      Duty Periods & Legs ({seq.dutyPeriods?.length || 0})
                                    </span>
                                    <span className="text-[10px] font-mono text-slate-400">
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

                                        {dp.layoverHotelInfo && (
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
                                                  {leg.isCancelled && (
                                                    <span className="px-1.5 py-0.2 rounded bg-rose-100 text-rose-700 font-bold text-[9px]">
                                                      CXL
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
                                        ) : (
                                          <div className="text-[10.5px] text-slate-400 italic py-0.5">
                                            No flight legs registered for this duty period.
                                          </div>
                                        )}
                                      </div>
                                    ))
                                  ) : (
                                    <div className="bg-white p-3 rounded-xl border border-slate-200 text-xs text-slate-500 italic text-center">
                                      No duty period leg details parsed yet. Paste raw HSS to populate.
                                    </div>
                                  )}
                                </div>

                                {/* Sequence Action Buttons */}
                                <div className="pt-2 flex flex-wrap gap-2 border-t border-slate-200">
                                  <button
                                    type="button"
                                    onClick={() => handleCopyDecsHss(seq)}
                                    className="flex-1 py-2 px-2.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer active-press"
                                  >
                                    {copiedId === seq.id ? (
                                      <>
                                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                                        <span className="text-emerald-700">Copied HSS Query!</span>
                                      </>
                                    ) : (
                                      <>
                                        <Clipboard className="w-3.5 h-3.5 text-slate-400" />
                                        <span>Copy DECS Macro</span>
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
                                    className="py-2 px-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer active-press"
                                  >
                                    <CalendarIcon className="w-3.5 h-3.5 text-indigo-600" />
                                    <span>View on Schedule</span>
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
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3.5 bg-white border-t border-slate-200 flex items-center justify-between shrink-0">
          <span className="text-xs text-slate-500 font-medium">
            {sequences.length} sequences across {groupedSequences.length} month(s)
          </span>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black transition cursor-pointer active-press shadow-sm"
          >
            Close
          </button>
        </div>
      </div>
    </>
  );
}
