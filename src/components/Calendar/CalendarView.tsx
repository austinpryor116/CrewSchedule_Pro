"use client";

import { useState, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import { useCrewStore, convertOpenToTrip } from "../../store/useCrewStore";
import { SequenceTrip, DutyPeriod } from "../../types";
import { checkOpenSequenceConflict } from "../../lib/parser";
import { Calendar as CalendarIcon, Clock, ChevronLeft, ChevronRight, Info, Plane, Sun, Moon, Eye, EyeOff, ShoppingBag } from "lucide-react";

export default function CalendarView() {
  const [currentDate, setCurrentDate] = useState(new Date(2026, 6, 20)); // Centered on July 20, 2026
  const [viewMode, setViewMode] = useState<"month" | "week">("month");
  const [filterMode, setFilterMode] = useState<"all" | "trips" | "off" | "high-credit">("all");
  const [hoveredSeqId, setHoveredSeqId] = useState<string | null>(null);
  const [hoveredPosition, setHoveredPosition] = useState<{ x: number; y: number } | null>(null);

  const [isMobile, setIsMobile] = useState(() => typeof window !== "undefined" && window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const rawSequences = useCrewStore((state) => state.sequences);
  const vacations = useCrewStore((state) => state.vacations);
  const openSequences = useCrewStore((state) => state.openSequences);
  const showOpenTimeOverlay = useCrewStore((state) => state.showOpenTimeOverlay);
  const setShowOpenTimeOverlay = useCrewStore((state) => state.setShowOpenTimeOverlay);
  const simulatedIds = useCrewStore((state) => state.simulatedSequenceIds);
  const toggleSimulate = useCrewStore((state) => state.toggleSimulateSequence);
  const openTimeFilter = useCrewStore((state) => state.openTimeFilter);
  const setSelectedSequenceId = useCrewStore((state) => state.setSelectedSequenceId);
  const selectedSequenceId = useCrewStore((state) => state.selectedSequenceId);
  const showDtsDropped = useCrewStore((state) => state.showDtsDropped);
  const toggleShowDtsDropped = useCrewStore((state) => state.toggleShowDtsDropped);
  const stationTurnLimits = useCrewStore((state) => state.stationTurnLimits);
  const defaultTurnLimit = useCrewStore((state) => state.defaultTurnLimit);
  const highCreditThresholdHours = useCrewStore((state) => state.highCreditThresholdHours);


  const sequences = useMemo(() => {
    const simulatedTrips = openSequences
      .filter((ot) => simulatedIds.includes(ot.id))
      .map(convertOpenToTrip);
    let list = [...rawSequences, ...simulatedTrips];
    if (!showDtsDropped) {
      list = list.filter((s) => !s.isDropped && s.statusTag !== "DROP" && s.statusTag !== "DTS DROP");
    }
    return list;
  }, [rawSequences, openSequences, simulatedIds, showDtsDropped]);

  // Helper: check if a date is within a sequence
  const getSequenceForDate = (date: Date): SequenceTrip | null => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    const dateStr = `${y}-${m}-${d}`;
    const match = sequences.find((seq) => {
      return dateStr >= seq.startDate && dateStr <= seq.endDate;
    });
    return match || null;
  };

  // Helper: get duty period for a specific date
  const getDutyPeriodForDate = (seq: SequenceTrip, date: Date): DutyPeriod | undefined => {
    const parts = seq.startDate.split("-").map(Number);
    const seqStart = new Date(parts[0], parts[1] - 1, parts[2]);
    const dateObj = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    
    const diffDays = Math.round((dateObj.getTime() - seqStart.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 0 || diffDays >= seq.dutyPeriods.length) return undefined;
    
    return seq.dutyPeriods.find((dp) => dp.dayIndex === diffDays) || seq.dutyPeriods[diffDays];
  };

  // Helper: get RON (Remain OverNight) layover city for a specific date
  const getRonForDate = (seq: SequenceTrip, date: Date): string | null => {
    if (seq.isDropped) return null;
    const dp = getDutyPeriodForDate(seq, date);
    const parts = seq.startDate.split("-").map(Number);
    const seqStart = new Date(parts[0], parts[1] - 1, parts[2]);
    const dateObj = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const diffDays = Math.round((dateObj.getTime() - seqStart.getTime()) / (1000 * 60 * 60 * 24));

    if (dp && dp.layoverCity && dp.layoverCity !== seq.base) {
      return dp.layoverCity;
    }
    if (seq.layoverCities && seq.layoverCities[diffDays] && seq.layoverCities[diffDays] !== seq.base) {
      return seq.layoverCities[diffDays];
    }
    return null;
  };

  // Helper: check if a sequence is high credit
  const isHighCredit = (seq: SequenceTrip) => {
    return seq.totalCreditMinutes >= highCreditThresholdHours * 60;
  };

  // Calendar dates generation (memoized by currentDate)
  const monthDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const startOfWeek = firstDay.getDay(); // 0 is Sunday
    
    const days: Date[] = [];
    
    // Previous month padding days
    for (let i = startOfWeek - 1; i >= 0; i--) {
      days.push(new Date(year, month, -i));
    }
    
    // Active month days
    const totalDays = new Date(year, month + 1, 0).getDate();
    for (let i = 1; i <= totalDays; i++) {
      days.push(new Date(year, month, i));
    }
    
    // Next month padding days to complete 5 or 6 rows
    const totalRowsNeeded = Math.ceil(days.length / 7);
    const remaining = totalRowsNeeded * 7 - days.length;
    for (let i = 1; i <= remaining; i++) {
      days.push(new Date(year, month + 1, i));
    }
    
    return days;
  }, [currentDate]);

  // Weekly View Day List (centered around the currentDate week, memoized)
  const weekDays = useMemo(() => {
    const days: Date[] = [];
    const firstOfCurrentWeek = new Date(currentDate);
    firstOfCurrentWeek.setDate(currentDate.getDate() - currentDate.getDay());
    for (let i = 0; i < 7; i++) {
      const d = new Date(firstOfCurrentWeek);
      d.setDate(firstOfCurrentWeek.getDate() + i);
      days.push(d);
    }
    return days;
  }, [currentDate]);

  // Memoize sequence segments calculation so mouse hover and selection do not trigger recalculations
  const sequenceSegments = useMemo(() => {
    const days = monthDays;
    const segments: {
      seq: SequenceTrip & { isGhost?: boolean; hasConflict?: boolean; isVacation?: boolean };
      row: number;
      startCol: number;
      endCol: number;
      isRealStart?: boolean;
      isRealEnd?: boolean;
      isDayOt?: boolean;
      isOtAddon?: boolean;
      originalSeqId?: string;
    }[] = [];

    const vacationTrips: SequenceTrip[] = vacations.map((v) => ({
      id: v.id,
      sequenceNumber: "VACATION",
      startDate: v.startDate,
      endDate: v.endDate,
      base: "ORD",
      equipment: "VAC",
      totalBlockMinutes: 0,
      totalCreditMinutes: 0,
      layoverCities: [],
      dutyPeriods: [],
      colorTag: "emerald",
      statusTag: "VA",
      isVacation: true,
    }));

    const allTripsToRender = [...sequences, ...vacationTrips];

    if (showOpenTimeOverlay) {
      openSequences.forEach((ot) => {
        if (simulatedIds.includes(ot.id)) return; // already rendered as simulated
        
        const conflict = checkOpenSequenceConflict(ot, rawSequences, stationTurnLimits, defaultTurnLimit);
        
        // Apply openTimeFilter
        if (openTimeFilter === "fits" && conflict.hasConflict) return;
        if (openTimeFilter === "conflicts" && !conflict.hasConflict) return;
        if (openTimeFilter === "simulated") return;

        const otTrip = convertOpenToTrip(ot);
        otTrip.isGhost = true;
        otTrip.hasConflict = conflict.hasConflict;
        allTripsToRender.push(otTrip);
      });
    }


    allTripsToRender.forEach((seq) => {
      const seqStartObj = new Date(seq.startDate + "T00:00:00");
      const seqEndObj = new Date(seq.endDate + "T00:00:00");

      let startIdx = days.findIndex(
        (d) => d.getFullYear() === seqStartObj.getFullYear() &&
               d.getMonth() === seqStartObj.getMonth() &&
               d.getDate() === seqStartObj.getDate()
      );
      let endIdx = days.findIndex(
        (d) => d.getFullYear() === seqEndObj.getFullYear() &&
               d.getMonth() === seqEndObj.getMonth() &&
               d.getDate() === seqEndObj.getDate()
      );

      if (startIdx === -1 && endIdx === -1) return;

      if (startIdx === -1) {
        if (seqStartObj < days[0]) {
          startIdx = 0;
        } else {
          return;
        }
      }

      if (endIdx === -1) {
        if (seqEndObj > days[days.length - 1]) {
          endIdx = days.length - 1;
        } else {
          return;
        }
      }

      const getDayOtStatus = (s: SequenceTrip, dIdx: number, start: number): boolean => {
        if (s.isOvertime || s.statusTag === "OT") return true;
        const dp = s.dutyPeriods[dIdx - start];
        if (dp) {
          return !!(dp.isOvertime || dp.legs.some((l) => l.isOvertime));
        }
        return false;
      };

      let currentStart = startIdx;
      while (currentStart <= endIdx) {
        const row = Math.floor(currentStart / 7) + 1; // row 1 starts at top of grid
        const startCol = (currentStart % 7) + 1;

        const endOfWeekIdx = Math.floor(currentStart / 7) * 7 + 6;
        const currentEnd = Math.min(endOfWeekIdx, endIdx);
        const endCol = (currentEnd % 7) + 1;

        segments.push({
          seq,
          row,
          startCol,
          endCol,
          isRealStart: currentStart === startIdx,
          isRealEnd: currentEnd === endIdx,
          isDayOt: seq.isOvertime || seq.statusTag === "OT",
          originalSeqId: seq.id,
        });

        currentStart = currentEnd + 1;
      }

      // Check if any individual duty periods contain OT legs (e.g. FLT 3453 OT turn on day 1 of Seq 21649)
      if (!seq.isOvertime && seq.statusTag !== "OT") {
        seq.dutyPeriods.forEach((dp) => {
          const otLegs = dp.legs.filter((l) => l.isOvertime);
          if (otLegs.length > 0) {
            const dayIdx = startIdx + dp.dayIndex;
            if (dayIdx >= 0 && dayIdx < days.length) {
              const otMins = otLegs.reduce((sum, l) => sum + l.blockMinutes, 0);
              const otFlt = otLegs[0]?.flightNumber.replace(/^[A-Z]{2}/i, "") || "3453";
              const otRow = Math.floor(dayIdx / 7) + 1;
              const otCol = (dayIdx % 7) + 1;

              const otAddonTrip: SequenceTrip = {
                ...seq,
                id: `${seq.id}-ot-add-${dp.dayIndex}`,
                sequenceNumber: `OT ${otFlt}`,
                totalCreditMinutes: otMins > 0 ? otMins : 288,
                totalBlockMinutes: otMins > 0 ? otMins : 288,
                isOvertime: true,
                statusTag: "OT",
              };

              segments.push({
                seq: otAddonTrip,
                row: otRow,
                startCol: otCol,
                endCol: otCol,
                isRealStart: true,
                isRealEnd: true,
                isDayOt: true,
                isOtAddon: true,
                originalSeqId: seq.id,
              });
            }
          }
        });
      }
    });

    // Group segments by row
    const rowSegments: Record<number, typeof segments> = {};
    segments.forEach((seg) => {
      if (!rowSegments[seg.row]) rowSegments[seg.row] = [];
      rowSegments[seg.row].push(seg);
    });

    interface SequenceSegment {
      seq: SequenceTrip;
      row: number;
      startCol: number;
      endCol: number;
      slot: number;
      isRealStart?: boolean;
      isRealEnd?: boolean;
      isDayOt?: boolean;
      isOtAddon?: boolean;
      originalSeqId?: string;
    }

    const segmentsWithSlots: SequenceSegment[] = [];

    Object.keys(rowSegments).forEach((rowStr) => {
      const row = Number(rowStr);
      const rowSegs = rowSegments[row];

      // Sort: OT add-on turns first (since they report earlier in day), then longer span, then earlier startCol
      rowSegs.sort((a, b) => {
        if (a.isOtAddon && !b.isOtAddon) return -1;
        if (!a.isOtAddon && b.isOtAddon) return 1;
        const spanA = a.endCol - a.startCol;
        const spanB = b.endCol - b.startCol;
        if (spanA !== spanB) return spanB - spanA;
        return a.startCol - b.startCol;
      });

      // Track slot usage for each column (1 to 7)
      const colOccupied: Record<number, boolean[]> = {};
      for (let c = 1; c <= 7; c++) {
        colOccupied[c] = [];
      }

      rowSegs.forEach((seg) => {
        let slot = 0;
        while (true) {
          let occupied = false;
          for (let col = seg.startCol; col <= seg.endCol; col++) {
            if (colOccupied[col][slot]) {
              occupied = true;
              break;
            }
          }
          if (!occupied) {
            break;
          }
          slot++;
        }

        for (let col = seg.startCol; col <= seg.endCol; col++) {
          colOccupied[col][slot] = true;
        }

        segmentsWithSlots.push({
          ...seg,
          slot,
        });
      });
    });

    return segmentsWithSlots;
  }, [
    sequences,
    openSequences,
    simulatedIds,
    showOpenTimeOverlay,
    openTimeFilter,
    monthDays,
    rawSequences,
    stationTurnLimits,
    defaultTurnLimit,
  ]);

  // Navigation handlers
  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  // Color mapping utility
  const getColorClasses = (colorTag: string, isSelected: boolean) => {
    const maps: Record<string, { bg: string; border: string; text: string; glow: string; hover: string; subtext: string }> = {
      indigo: {
        bg: "bg-sky-950/90 backdrop-blur-md",
        border: isSelected ? "border-sky-400 ring-2 ring-sky-400/50" : "border-sky-500/50",
        text: "text-sky-100 font-bold",
        glow: "shadow-[0_0_12px_rgba(14,165,233,0.25)]",
        hover: "hover:bg-sky-900/90 hover:border-sky-400",
        subtext: "text-sky-300 font-semibold",
      },
      emerald: {
        bg: "bg-emerald-950/90 backdrop-blur-md",
        border: isSelected ? "border-emerald-400 ring-2 ring-emerald-400/50" : "border-emerald-500/50",
        text: "text-emerald-100 font-bold",
        glow: "shadow-[0_0_12px_rgba(16,185,129,0.25)]",
        hover: "hover:bg-emerald-900/90 hover:border-emerald-400",
        subtext: "text-emerald-300 font-semibold",
      },
      amber: {
        bg: "bg-amber-950/90 backdrop-blur-md",
        border: isSelected ? "border-amber-400 ring-2 ring-amber-400/50" : "border-amber-500/50",
        text: "text-amber-100 font-bold",
        glow: "shadow-[0_0_12px_rgba(245,158,11,0.25)]",
        hover: "hover:bg-amber-900/90 hover:border-amber-400",
        subtext: "text-amber-300 font-semibold",
      },
      rose: {
        bg: "bg-rose-950/90 backdrop-blur-md",
        border: isSelected ? "border-rose-400 ring-2 ring-rose-400/50" : "border-rose-500/50",
        text: "text-rose-100 font-bold",
        glow: "shadow-[0_0_12px_rgba(244,63,94,0.25)]",
        hover: "hover:bg-rose-900/90 hover:border-rose-400",
        subtext: "text-rose-300 font-semibold",
      },
      cyan: {
        bg: "bg-cyan-950/90 backdrop-blur-md",
        border: isSelected ? "border-cyan-400 ring-2 ring-cyan-400/50" : "border-cyan-500/50",
        text: "text-cyan-100 font-bold",
        glow: "shadow-[0_0_12px_rgba(6,182,212,0.25)]",
        hover: "hover:bg-cyan-900/90 hover:border-cyan-400",
        subtext: "text-cyan-300 font-semibold",
      },
      violet: {
        bg: "bg-purple-950/90 backdrop-blur-md",
        border: isSelected ? "border-purple-400 ring-2 ring-purple-400/50" : "border-purple-500/50",
        text: "text-purple-100 font-bold",
        glow: "shadow-[0_0_12px_rgba(168,85,247,0.25)]",
        hover: "hover:bg-purple-900/90 hover:border-purple-400",
        subtext: "text-purple-300 font-semibold",
      },
    };
    
    return maps[colorTag] || maps.indigo;
  };

  const handleMouseEnter = (e: React.MouseEvent, id: string) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setHoveredSeqId(id);
    setHoveredPosition({
      x: rect.left + rect.width / 2,
      y: rect.top - 10,
    });
  };

  const getSegmentBackground = (seg: { seq: SequenceTrip; startCol: number; endCol: number; row: number }) => {
    const isSim = seg.seq.isSimulated;
    const isGhost = seg.seq.isGhost;
    
    if (isSim || isGhost) return undefined;
    
    const totalDays = seg.endCol - seg.startCol + 1;
    if (totalDays <= 1) return undefined;
    
    const dayOts: boolean[] = [];
    for (let col = seg.startCol; col <= seg.endCol; col++) {
      const dayIdx = (seg.row - 1) * 7 + (col - 1);
      const date = monthDays[dayIdx];
      const dp = date ? getDutyPeriodForDate(seg.seq, date) : undefined;
      dayOts.push(!!dp?.isOvertime);
    }
    
    const hasOt = dayOts.some(x => x);
    const hasNonOt = dayOts.some(x => !x);
    if (hasOt && hasNonOt) {
      const pctPerDay = 100 / totalDays;
      const stops: string[] = [];
      dayOts.forEach((isDayOt, idx) => {
        const startPct = idx * pctPerDay;
        const endPct = (idx + 1) * pctPerDay;
        const color = isDayOt 
          ? "rgba(217, 119, 6, 0.45)"
          : "rgba(30, 27, 75, 0.6)";
        stops.push(`${color} ${startPct.toFixed(1)}%`);
        stops.push(`${color} ${endPct.toFixed(1)}%`);
      });
      return `linear-gradient(to right, ${stops.join(", ")})`;
    }
    return undefined;
  };

  const handleMouseLeave = () => {
    setHoveredSeqId(null);
    setHoveredPosition(null);
  };

  const monthName = currentDate.toLocaleString("default", { month: "long" });
  const activeYear = currentDate.getFullYear();

  return (
    <div className="space-y-6 relative animate-fadeIn pb-20">
      {/* Calendar Controls / Filter bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-2.5">
            <CalendarIcon className="w-8 h-8 text-sky-400" />
            Schedule & Roster Grid
          </h1>
          <p className="mt-1 text-sm text-slate-300 font-medium">
            View sequence roster schedules, monthly assignments, duty lines, and layover rests.
          </p>
        </div>

        {/* Filters and View Toggles */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Filters dropdown */}
          <div className="flex bg-[#151c2c] p-1 rounded-xl border border-slate-700/80 text-xs shadow-md">
            <button
              onClick={() => setFilterMode("all")}
              className={`px-3 py-1.5 rounded-lg font-bold transition duration-150 cursor-pointer ${
                filterMode === "all" ? "bg-sky-600 text-white shadow-md shadow-sky-600/30" : "text-slate-300 hover:text-white"
              }`}
            >
              All Days
            </button>
            <button
              onClick={() => setFilterMode("trips")}
              className={`px-3 py-1.5 rounded-lg font-bold transition duration-150 cursor-pointer ${
                filterMode === "trips" ? "bg-sky-600 text-white shadow-md shadow-sky-600/30" : "text-slate-300 hover:text-white"
              }`}
            >
              Trips Only
            </button>
            <button
              onClick={() => setFilterMode("off")}
              className={`px-3 py-1.5 rounded-lg font-bold transition duration-150 cursor-pointer ${
                filterMode === "off" ? "bg-sky-600 text-white shadow-md shadow-sky-600/30" : "text-slate-300 hover:text-white"
              }`}
            >
              DFP / Off Days
            </button>
            <button
              onClick={() => setFilterMode("high-credit")}
              className={`px-3 py-1.5 rounded-lg font-bold transition duration-150 cursor-pointer ${
                filterMode === "high-credit" ? "bg-sky-600 text-white shadow-md shadow-sky-600/30" : "text-slate-300 hover:text-white"
              }`}
            >
              High Credit
            </button>
          </div>

          {/* Monthly / Weekly mode */}
          <div className="flex bg-[#151c2c] p-1 rounded-xl border border-slate-700/80 text-xs shadow-md">
            <button
              onClick={() => setViewMode("month")}
              className={`px-3 py-1.5 rounded-lg font-bold transition duration-150 cursor-pointer ${
                viewMode === "month" ? "bg-slate-700 text-white font-extrabold" : "text-slate-300 hover:text-white"
              }`}
            >
              Month
            </button>
            <button
              onClick={() => setViewMode("week")}
              className={`px-3 py-1.5 rounded-lg font-bold transition duration-150 cursor-pointer ${
                viewMode === "week" ? "bg-slate-700 text-white font-extrabold" : "text-slate-300 hover:text-white"
              }`}
            >
              Week
            </button>
          </div>

          {/* Open Time Overlay & DTS Toggles */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* DTS Dropped Sequences Toggle */}
            <button
              onClick={toggleShowDtsDropped}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition duration-150 select-none cursor-pointer ${
                showDtsDropped
                  ? "bg-amber-950/80 border-amber-500/60 text-amber-300 font-bold"
                  : "bg-[#151c2c] border-slate-700/80 text-slate-300 hover:text-white shadow-md"
              }`}
              title="Toggle visibility of DTS dropped sequences on your schedule"
            >
              {showDtsDropped ? <Eye className="w-3.5 h-3.5 text-amber-400" /> : <EyeOff className="w-3.5 h-3.5 text-slate-400" />}
              <span>{showDtsDropped ? "Showing DTS Dropped" : "DTS Dropped Hidden"}</span>
            </button>

            <button
              onClick={() => setShowOpenTimeOverlay(!showOpenTimeOverlay)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition duration-150 select-none cursor-pointer ${
                showOpenTimeOverlay
                  ? "bg-sky-950/80 border-sky-500/60 text-sky-300 font-bold"
                  : "bg-[#151c2c] border-slate-700/80 text-slate-300 hover:text-white shadow-md"
              }`}
              title="Toggle ghost sequences overlay"
            >
              {showOpenTimeOverlay ? <Eye className="w-3.5 h-3.5 text-sky-400" /> : <EyeOff className="w-3.5 h-3.5 text-slate-400" />}
              <span>Overlay Open</span>
            </button>

            {isMobile && (
              <button
                onClick={() => setSelectedSequenceId("open-time")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition duration-150 select-none cursor-pointer bg-amber-500/10 border-amber-500/20 text-amber-400 hover:bg-amber-500/20`}
              >
                <ShoppingBag className="w-3.5 h-3.5" />
                <span>Open Market</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Date Header Selector */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#151c2c] border border-slate-700/80 p-4 rounded-2xl shadow-xl">
        <div className="flex items-center gap-3">
          <button
            onClick={handlePrevMonth}
            className="p-2 hover:bg-slate-800 text-slate-300 hover:text-white rounded-xl border border-slate-700 transition duration-150 cursor-pointer"
            title="Previous Month"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
            {viewMode === "month" ? `${monthName} ${activeYear}` : `Week of ${weekDays[0].toLocaleDateString("en-US", { month: "short", day: "numeric" })}`}
          </h2>

          <button
            onClick={handleNextMonth}
            className="p-2 hover:bg-slate-800 text-slate-300 hover:text-white rounded-xl border border-slate-700 transition duration-150 cursor-pointer"
            title="Next Month"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Month Jump Pills */}
        <div className="flex items-center gap-1.5 bg-[#0b0f17] p-1.5 rounded-xl border border-slate-700/80 text-xs">
          <span className="text-slate-400 font-semibold px-2 hidden sm:inline">Jump:</span>
          {[
            { label: "Jul '26", year: 2026, month: 6, day: 20 },
            { label: "Aug '26", year: 2026, month: 7, day: 15 },
          ].map((m) => {

            const isActive = currentDate.getFullYear() === m.year && currentDate.getMonth() === m.month;
            return (
              <button
                key={m.label}
                onClick={() => setCurrentDate(new Date(m.year, m.month, m.day))}
                className={`px-3 py-1.5 rounded-lg font-bold transition duration-150 cursor-pointer ${
                  isActive
                    ? "bg-sky-600 text-white shadow-md shadow-sky-600/30 border border-sky-400/30"
                    : "text-slate-300 hover:text-white hover:bg-slate-800/80"
                }`}
              >
                {m.label}
              </button>
            );
          })}
        </div>
      </div>


      {/* View Grid */}
      {viewMode === "month" ? (
        /* Month Grid View */
        <div className="bg-[#151c2c] border border-slate-700/80 rounded-3xl overflow-hidden shadow-2xl">
          {/* Weekday headers */}
          <div className="grid grid-cols-7 border-b border-slate-700/80 text-center py-3 bg-[#1a2336]">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <span key={day} className="text-xs font-extrabold text-slate-300 uppercase tracking-wider">
                {day}
              </span>
            ))}
          </div>

          {/* Days */}
          <div className="grid grid-cols-7 bg-[#0b0f17]/40" style={{ gridTemplateRows: `repeat(${monthDays.length / 7}, minmax(${isMobile ? "75px" : "130px"}, auto))` }}>
            {monthDays.map((date, idx) => {
              const seq = getSequenceForDate(date);
              const isCurrentMonth = date.getMonth() === currentDate.getMonth();
              const isToday = new Date().toDateString() === date.toDateString();
              const dp = seq ? getDutyPeriodForDate(seq, date) : undefined;
              
              // Apply filters
              let hide = false;
              if (filterMode === "trips" && !seq) hide = true;
              if (filterMode === "off" && seq) hide = true;
              if (filterMode === "high-credit" && (!seq || !isHighCredit(seq))) hide = true;

              const isDfp = !seq && isCurrentMonth;
              const row = Math.floor(idx / 7) + 1;
              const col = (idx % 7) + 1;

              const isVacationDay = vacations.some((v) => {
                const y = date.getFullYear();
                const m = String(date.getMonth() + 1).padStart(2, "0");
                const d = String(date.getDate()).padStart(2, "0");
                const dateStr = `${y}-${m}-${d}`;
                return dateStr >= v.startDate && dateStr <= v.endDate;
              });

              return (
                <div
                  key={idx}
                  style={{ gridRow: row, gridColumn: col }}
                  className={`relative p-3 border-r border-b border-slate-800/80 flex flex-col justify-between transition-all duration-200 ${
                    isVacationDay
                      ? "bg-emerald-950/30 border-emerald-500/30"
                      : isCurrentMonth
                      ? "bg-[#151c2c]"
                      : "bg-[#0b0f17]/80 opacity-30 pointer-events-none"
                  } ${hide ? "opacity-10" : ""}`}
                >
                  {/* Date cell header bar: Date on top-left, RON badge on top-right */}
                  <div className="flex items-center justify-between w-full z-20">
                    <span
                      className={`text-xs font-bold font-mono px-2 py-0.5 rounded-full ${
                        isToday
                          ? "bg-sky-600 text-white font-black shadow-md shadow-sky-600/30"
                          : isCurrentMonth
                          ? "text-slate-300 font-extrabold"
                          : "text-slate-500"
                      }`}
                    >
                      {date.getDate()}
                    </span>

                    {/* Overnight layover (RON) badge at top-right next to date */}
                    {seq && getRonForDate(seq, date) && (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 text-[8px] font-extrabold text-amber-300 bg-amber-950/80 border border-amber-500/40 rounded-md tracking-tight uppercase z-20">
                        <Moon className="w-2 h-2 fill-amber-400 text-amber-300 shrink-0" />
                        <span>{getRonForDate(seq, date)}</span>
                      </span>
                    )}

                    {/* DFP label */}
                    {isDfp && !isVacationDay && !seq && filterMode !== "trips" && (
                      <span className="text-[8px] sm:text-[9px] font-bold text-slate-400 tracking-wide uppercase px-1.5 py-0.5 rounded bg-slate-800/80 border border-slate-700/60">
                        DFP
                      </span>
                    )}
                  </div>

                  {/* Off day visual indicator (striped background) */}
                  {isDfp && !isVacationDay && (
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900/10 via-transparent to-transparent pointer-events-none opacity-20" />
                  )}
                </div>
              );
            })}

            {/* Combined Multi-Day Sequence Banners */}
            {sequenceSegments
              .filter((seg) => {
                if (filterMode === "off") return false;
                if (filterMode === "high-credit" && !isHighCredit(seg.seq)) return false;
                return true;
              })
              .map((seg, idx) => {
                const isOt = seg.isDayOt !== undefined ? seg.isDayOt : (seg.seq.isOvertime || seg.seq.statusTag === "OT");
                const isSim = seg.seq.isSimulated;
                const isGhost = seg.seq.isGhost;
                const isDropped = seg.seq.isDropped || seg.seq.statusTag === "DROP" || seg.seq.statusTag === "DTS DROP";
                const isVacation = seg.seq.statusTag === "VA" || !!(seg.seq as any).isVacation;
                const hasConflict = seg.seq.hasConflict;
                const isMultiDay = seg.endCol - seg.startCol >= 1;

                let cardStyle = "";
                let subtextColor = "text-slate-400/90";
                
                if (isVacation) {
                  cardStyle = `bg-gradient-to-r from-emerald-950/90 via-teal-950/90 to-emerald-950/90 border-2 border-emerald-400/80 text-emerald-100 shadow-[0_0_15px_-3px_rgba(16,185,129,0.4)] font-bold backdrop-blur-md opacity-95 hover:border-emerald-300 hover:shadow-[0_0_20px_-3px_rgba(16,185,129,0.6)]`;
                  subtextColor = "text-emerald-300/90";
                } else if (isDropped) {
                  cardStyle = `bg-[repeating-linear-gradient(45deg,rgba(244,63,94,0.18),rgba(244,63,94,0.18)_10px,rgba(15,23,42,0.85)_10px,rgba(15,23,42,0.85)_20px)] border-2 border-dashed border-rose-500/70 text-slate-300 opacity-80 hover:opacity-100 hover:border-rose-400`;
                  subtextColor = "text-rose-300/80";
                } else if (isSim) {
                  const simColor = getColorClasses("cyan", seg.seq.id === selectedSequenceId);
                  cardStyle = `${simColor.bg} ${simColor.border} ${simColor.text} ${simColor.glow} ${simColor.hover} border-dashed`;
                  subtextColor = simColor.subtext;
                } else if (isGhost) {
                  if (hasConflict) {
                    const roseColor = getColorClasses("rose", seg.seq.id === selectedSequenceId);
                    cardStyle = `${roseColor.bg} ${roseColor.border} ${roseColor.text} ${roseColor.glow} ${roseColor.hover} opacity-60 cursor-not-allowed`;
                    subtextColor = roseColor.subtext;
                  } else {
                    const emeraldColor = getColorClasses("emerald", seg.seq.id === selectedSequenceId);
                    cardStyle = `${emeraldColor.bg} ${emeraldColor.border} ${emeraldColor.text} ${emeraldColor.glow} ${emeraldColor.hover} border-dashed`;
                    subtextColor = emeraldColor.subtext;
                  }
                } else if (isOt) {
                  const amberColor = getColorClasses("amber", seg.seq.id === selectedSequenceId);
                  cardStyle = `${amberColor.bg} ${amberColor.border} ${amberColor.text} ${amberColor.glow} ${amberColor.hover}`;
                  subtextColor = amberColor.subtext;
                } else {
                  const skyColor = getColorClasses("indigo", seg.seq.id === selectedSequenceId);
                  cardStyle = `${skyColor.bg} ${skyColor.border} ${skyColor.text} ${skyColor.glow} ${skyColor.hover}`;
                  subtextColor = skyColor.subtext;
                }

                // Parse report and release times for visual timeline mapping
                const reportTime = seg.seq.dutyPeriods[0]?.reportTime || "0800";
                const reportMins = parseInt(reportTime.substring(0, 2), 10) * 60 + parseInt(reportTime.substring(2, 4), 10);
                
                const lastDP = seg.seq.dutyPeriods[seg.seq.dutyPeriods.length - 1];
                const releaseTime = lastDP?.releaseTime || "1700";
                const releaseMins = parseInt(releaseTime.substring(0, 2), 10) * 60 + parseInt(releaseTime.substring(2, 4), 10);
                
                const isRealStart = seg.isRealStart;
                const isRealEnd = seg.isRealEnd;
                const N = seg.endCol - seg.startCol + 1;
                
                const sFrac = isRealStart ? reportMins / 1440 : 0;
                const eFrac = isRealEnd ? releaseMins / 1440 : 1;
                
                let leftPct = (sFrac / N) * 100;
                const rightPct = (1 - (N - 1 + eFrac) / N) * 100;
                
                // Enforce a minimum width percentage so the block text is visible.
                // 1-day turns (N === 1) get min 75% width, multi-day segments get min 55%.
                const minWidthPct = N === 1 ? 75 : 55;
                let widthPct = 100 - leftPct - rightPct;
                
                if (widthPct < minWidthPct) {
                  widthPct = minWidthPct;
                  if (leftPct + widthPct > 100) {
                    leftPct = 100 - widthPct;
                  }
                }

                return (
                  <div
                    key={`seg-${idx}`}
                    onClick={() => {
                      if (!isVacation) {
                        setSelectedSequenceId(seg.originalSeqId || seg.seq.id);
                      }
                    }}
                    onDoubleClick={() => {
                      if (isGhost && !hasConflict) {
                        toggleSimulate(seg.seq.id);
                      } else if (isSim) {
                        toggleSimulate(seg.seq.id);
                      }
                    }}
                    onMouseEnter={(e) => {
                      if (!isVacation) {
                        handleMouseEnter(e, seg.seq.id);
                      }
                    }}
                    onMouseLeave={handleMouseLeave}
                    style={{
                      gridRow: seg.row,
                      gridColumnStart: seg.startCol,
                      gridColumnEnd: seg.endCol + 1,
                      alignSelf: "start",
                      marginTop: `${isMobile ? 22 + seg.slot * 25 : 42 + seg.slot * 46}px`,
                      height: isMobile ? "20px" : (isMultiDay ? "42px" : "26px"),
                      zIndex: 10,
                      position: "relative",
                      left: "0%",
                      width: "100%",
                      background: getSegmentBackground(seg),
                    }}
                    className={`mx-0.5 sm:mx-1 py-0.5 px-1 sm:px-2.5 border rounded-lg sm:rounded-xl text-left cursor-pointer transition duration-150 select-none flex flex-col justify-center gap-0.5 ${cardStyle}`}
                  >
                    <div className="flex items-center justify-between text-[8px] sm:text-[10px] font-black tracking-wide leading-none">
                      <span className="flex items-center gap-1 sm:gap-1.5 truncate">
                        {isVacation ? (
                          <span className="px-1 py-0.2 bg-emerald-950 border border-emerald-400/60 text-emerald-300 font-black text-[8px] rounded uppercase shrink-0 flex items-center gap-1">
                            <Sun className="w-2.5 h-2.5 text-emerald-400" /> VACATION
                          </span>
                        ) : isDropped ? (
                          <span className="px-0.5 sm:px-1 py-0.1 bg-rose-950 border border-rose-500/60 text-rose-300 font-extrabold text-[8px] rounded uppercase shrink-0">
                            {isMobile ? "DRP" : "DTS DROP"}
                          </span>
                        ) : isSim ? (
                          <span className="px-0.5 sm:px-1 py-0.1 bg-cyan-950 border border-cyan-500/60 text-cyan-400 font-extrabold text-[8px] rounded uppercase shrink-0">
                            {isMobile ? "SM" : "SIM"}
                          </span>
                        ) : isGhost ? (
                          <span className={`px-0.5 sm:px-1 py-0.1 border text-[8px] rounded uppercase shrink-0 ${
                            hasConflict 
                              ? "bg-rose-950 border-rose-500/40 text-rose-400"
                              : "bg-emerald-950 border-emerald-500/60 text-emerald-400"
                          }`}>
                            {isMobile ? (hasConflict ? "CF" : "OP") : (hasConflict ? "CONFL" : "OPEN")}
                          </span>
                        ) : seg.seq.statusTag === "RA" ? (
                          <span className="px-0.5 sm:px-1 py-0.1 bg-rose-950 border border-rose-500/60 text-rose-400 font-extrabold text-[8px] rounded uppercase shrink-0">
                            RA
                          </span>
                        ) : isOt && seg.seq.statusTag === "TT" ? (
                          <span className="px-0.5 sm:px-1 py-0.1 bg-amber-950 border border-amber-500/60 text-amber-300 font-extrabold text-[8px] rounded uppercase shrink-0">
                            TT/OT
                          </span>
                        ) : isOt ? (
                          <span className="px-0.5 sm:px-1 py-0.1 bg-amber-950 border border-amber-500/60 text-amber-400 font-extrabold text-[8px] rounded uppercase shrink-0">
                            OT
                          </span>
                        ) : seg.seq.statusTag === "TT" ? (
                          <span className="px-0.5 sm:px-1 py-0.1 bg-amber-950/80 border border-amber-500/50 text-amber-300 font-extrabold text-[8px] rounded uppercase shrink-0">
                            TT
                          </span>
                        ) : null}
                        <span className={`truncate ${isDropped ? "line-through opacity-75" : ""}`}>
                          {isVacation ? "VACATION BLOCK (01-07AUG)" : isMobile ? seg.seq.sequenceNumber : `Seq ${seg.seq.sequenceNumber}`}
                        </span>
                        {!isMultiDay && !isVacation && (
                          <span className={`text-[8px] sm:text-[9px] font-semibold ml-0.5 sm:ml-1 shrink-0 ${subtextColor}`}>
                            {isDropped ? "(0.0h DTS)" : `(${(seg.seq.totalCreditMinutes / 60).toFixed(isMobile ? 0 : 1)}h)`}
                          </span>
                        )}
                      </span>
                    </div>

                    {/* Show sub-details if segment spans at least 2 days */}
                    {isMultiDay && !isMobile && (
                      <div className={`text-[9px] font-semibold leading-none truncate flex justify-between items-center font-sans ${subtextColor}`}>
                        <span className="flex items-center gap-0.5">
                          {isVacation ? (
                            <span className="text-emerald-300 font-bold">Scheduled Annual Vacation (7 Days Paid)</span>
                          ) : (
                            <>
                              <Clock className="w-2.5 h-2.5 shrink-0" />
                              <span>{isDropped ? "0.0h cr (Dropped)" : `${(seg.seq.totalCreditMinutes / 60).toFixed(1)}h cr`}</span>
                            </>
                          )}
                        </span>
                        {!isVacation && seg.seq.layoverCities.length > 0 && (
                          <span className="truncate ml-1.5 flex items-center gap-0.5">
                            <Moon className="w-2.5 h-2.5 shrink-0" />
                            <span>RON: {seg.seq.layoverCities.join("→")}</span>
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

          </div>
        </div>


      ) : (
        /* Weekly Row-Based View */
        <div className="space-y-4">
          {weekDays.map((date, idx) => {
            const seq = getSequenceForDate(date);
            const isToday = new Date().toDateString() === date.toDateString();
            const dutyPeriod = seq ? getDutyPeriodForDate(seq, date) : undefined;
            const isSelected = seq ? seq.id === selectedSequenceId : false;

            return (
              <div
                key={idx}
                onClick={() => seq && setSelectedSequenceId(seq.id)}
                className={`p-4 bg-[#151c2c] border rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition duration-200 shadow-md ${
                  isSelected ? "border-sky-400 ring-2 ring-sky-500/40" : isToday ? "border-sky-500/50 bg-sky-950/20" : "border-slate-700/80"
                } ${seq ? "cursor-pointer hover:border-slate-600" : ""}`}
              >
                {/* Date display */}
                <div className="flex items-center gap-4">
                  <div className="text-center w-14 py-2 rounded-xl bg-[#0b0f17] border border-slate-700 font-mono">
                    <p className="text-[10px] text-slate-400 uppercase font-black">
                      {date.toLocaleString("default", { weekday: "short" })}
                    </p>
                    <p className="text-lg font-bold text-white">{date.getDate()}</p>
                  </div>

                  <div>
                    {seq ? (
                      <div>
                        <div className="flex items-center gap-2.5">
                          <span className="text-md font-bold text-white">
                            Sequence {seq.sequenceNumber}
                          </span>
                          <span className="px-2 py-0.5 bg-sky-950/80 border border-sky-500/40 text-sky-300 font-mono text-[10px] font-bold rounded-lg">
                            {seq.base}
                          </span>
                        </div>
                        <p className="text-xs text-slate-300 mt-0.5 flex items-center gap-2 font-medium">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          Duty credit: {Math.floor(seq.totalCreditMinutes / 60)}h {seq.totalCreditMinutes % 60}m
                        </p>
                      </div>
                    ) : (
                      <div>
                        <span className="text-md font-bold text-slate-300 flex items-center gap-2">
                          <Sun className="w-4 h-4 text-emerald-400" />
                          Duty-Free Period (DFP)
                        </span>
                        <p className="text-xs text-slate-400 mt-0.5">Off Day - Rest Period</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Flights timeline on this day */}
                {seq && dutyPeriod && (
                  <div className="flex-grow flex flex-col md:flex-row md:justify-end gap-3 w-full md:w-auto">
                    {dutyPeriod.legs.length > 0 ? (
                      <div className="flex flex-wrap items-center gap-2.5">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wide mr-1.5">
                          Flights:
                        </span>
                        {dutyPeriod.legs.map((leg) => (
                          <div
                            key={leg.flightNumber}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono font-bold text-slate-300"
                          >
                            <Plane className="w-3 h-3 text-sky-400" />
                            <span>{leg.flightNumber}</span>
                            <span className="text-slate-500">({leg.depAirport}→{leg.arrAirport})</span>
                            <span className="text-[10px] text-slate-400">{leg.depTime}-{leg.arrTime}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-slate-500 italic">No flights scheduled today.</span>
                    )}

                    {dutyPeriod.layoverCity && (
                      <div className="px-3 py-1.5 bg-amber-500/10 border border-amber-500/20 text-amber-300 rounded-xl text-xs font-bold flex items-center gap-1.5">
                        <Moon className="w-3.5 h-3.5 fill-amber-300/20" />
                        Layover: {dutyPeriod.layoverCity}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Schedule Footer Bar & Roster Legend */}
      <div className="bg-[#151c2c] border border-slate-700/80 rounded-2xl p-4 shadow-xl flex flex-col md:flex-row items-center justify-between gap-4 mt-6 mb-8">
        {/* Roster Legend */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">Roster Legend:</span>
          
          <span className="px-2.5 py-1 rounded-lg bg-sky-950/80 border border-sky-500/50 text-sky-300 text-[10px] font-bold flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-sky-400" /> Line Sequence
          </span>
          
          <span className="px-2.5 py-1 rounded-lg bg-amber-950/80 border border-amber-500/50 text-amber-300 text-[10px] font-bold flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-400" /> Overtime / High Credit
          </span>

          <span className="px-2.5 py-1 rounded-lg bg-rose-950/80 border border-rose-500/50 text-rose-300 text-[10px] font-bold flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-rose-400" /> Traded / DTS Drop
          </span>

          <span className="px-2.5 py-1 rounded-lg bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 text-[10px] font-bold flex items-center gap-1">
            <Sun className="w-3 h-3 text-emerald-400" /> Paid Vacation Block
          </span>

          <span className="px-2.5 py-1 rounded-lg bg-cyan-950/80 border border-cyan-500/50 text-cyan-300 text-[10px] font-bold flex items-center gap-1">
            <ShoppingBag className="w-3 h-3 text-cyan-400" /> Open Time Pickup
          </span>

          <span className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 text-amber-300 text-[10px] font-bold flex items-center gap-1">
            <Moon className="w-3 h-3 fill-amber-400 text-amber-300" /> RON Layover
          </span>
        </div>

        {/* Schedule Summary Indicator */}
        <div className="flex items-center gap-3 text-xs font-mono text-slate-400 bg-slate-950/80 px-3.5 py-2 rounded-xl border border-slate-800 shrink-0">
          <span>Roster: <strong className="text-white font-sans">{sequences.length} Active Sequences</strong></span>
          <span className="text-slate-600">•</span>
          <span>Status: <strong className="text-emerald-400 font-sans">Synced</strong></span>
        </div>
      </div>

      {/* Floating Tooltip Component */}
      {typeof document !== "undefined" && hoveredSeqId && hoveredPosition
        ? createPortal(
            <div
              style={{
                position: "fixed",
                left: hoveredPosition.x,
                top: hoveredPosition.y,
                transform: "translate(-50%, -100%)",
                zIndex: 100,
              }}
              className="w-80 bg-[#151c2c] border border-slate-700/80 rounded-2xl p-4 shadow-2xl pointer-events-none animate-scaleIn"
            >
              {(() => {
                let seq = sequences.find((s) => s.id === hoveredSeqId);
                if (!seq) {
                  const openSeq = openSequences.find((s) => s.id === hoveredSeqId);
                  if (openSeq) {
                    seq = convertOpenToTrip(openSeq);
                    const conflict = checkOpenSequenceConflict(openSeq, rawSequences, stationTurnLimits, defaultTurnLimit);
                    seq.isGhost = true;
                    seq.hasConflict = conflict.hasConflict;
                    seq.conflictReason = conflict.reason;
                  }
                }
                if (!seq) return null;

                const isGhost = seq.isGhost;
                const hasConflict = seq.hasConflict;

                return (
                  <div className="space-y-3">
                    <div className="flex justify-between items-center pb-2 border-b border-slate-700/80">
                      <span className="text-sm font-black text-white flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${
                          isGhost 
                            ? (hasConflict ? "bg-rose-500" : "bg-emerald-500 animate-pulse")
                            : "bg-sky-400"
                        }`} />
                        Seq {seq.sequenceNumber}
                      </span>
                      <div className="flex items-center gap-1.5">
                        {isGhost && (
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            hasConflict
                              ? "bg-rose-950/80 border border-rose-500/40 text-rose-300"
                              : "bg-emerald-950/80 border border-emerald-500/40 text-emerald-300"
                          }`}>
                            {hasConflict ? "CONFLICT" : "OPEN TIME"}
                          </span>
                        )}
                        <span className="text-[10px] bg-sky-950/80 border border-sky-500/40 font-bold px-1.5 py-0.5 rounded text-sky-300">
                          {seq.base}
                        </span>
                      </div>
                    </div>

                    {hasConflict && (
                      <div className="p-2.5 bg-rose-950/40 border border-rose-500/40 rounded-xl text-[10px] text-rose-300 font-sans leading-relaxed">
                        <strong>Conflict:</strong> {seq.conflictReason}
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                      <div className="bg-[#0b0f17] p-2 rounded-lg border border-slate-700/80">
                        <p className="text-[10px] text-slate-400 font-sans">Block Hours</p>
                        <p className="font-bold text-white mt-0.5">
                          {Math.floor(seq.totalBlockMinutes / 60)}h {seq.totalBlockMinutes % 60}m
                        </p>
                      </div>
                      <div className="bg-[#0b0f17] p-2 rounded-lg border border-slate-700/80">
                        <p className="text-[10px] text-slate-400 font-sans">Credit Hours</p>
                        <p className="font-bold text-emerald-400 mt-0.5">
                          {Math.floor(seq.totalCreditMinutes / 60)}h {seq.totalCreditMinutes % 60}m
                        </p>
                      </div>
                    </div>

                    {seq.layoverCities.length > 0 && (
                      <div className="text-xs">
                        <p className="text-[10px] text-slate-500 mb-1 font-bold">RON Layovers:</p>
                        <div className="flex flex-wrap gap-1">
                          {seq.layoverCities.map((city) => (
                            <span
                              key={city}
                              className="px-2 py-0.5 bg-slate-800 text-slate-300 rounded font-bold border border-slate-700 text-[10px]"
                            >
                              {city}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="text-[10px] text-sky-400 font-semibold flex items-center gap-1">
                      <Info className="w-3.5 h-3.5 shrink-0" />
                      {isGhost 
                        ? (hasConflict ? "Select to inspect details in sidebar" : "Double-click to Simulate Pickup (+1.5x)")
                        : "Click to open detailed schedule inspector"}
                    </div>
                  </div>
                );
              })()}
            </div>,
            document.body
          )
        : null}
    </div>
  );
}
