"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useCrewStore, convertOpenToTrip } from "../../store/useCrewStore";
import { SequenceTrip, DutyPeriod } from "../../types";
import { checkOpenSequenceConflict } from "../../lib/parser";
import { PersonalCalendarEvent } from "../../types";
import { Calendar as CalendarIcon, Clock, ChevronLeft, ChevronRight, Info, Plane, Sun, Moon, Eye, EyeOff, ShoppingBag, Rss, X, Globe, Plus, Maximize2, Minimize2, SlidersHorizontal } from "lucide-react";
import CalendarSyncModal from "./CalendarSyncModal";
import DayDetailModal from "./DayDetailModal";
import GridFilterModal from "./GridFilterModal";
import CalendarToolsModal from "./CalendarToolsModal";
import CalendarShareModal from "./CalendarShareModal";
import CalendarEventModal from "./CalendarEventModal";
import SequenceInspector from "../SequenceInspector/Inspector";

function parseLocalDateString(dateStr: string): Date {
  if (!dateStr) return new Date();
  const parts = dateStr.split("-").map(Number);
  if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
    return new Date(parts[0], parts[1] - 1, parts[2], 0, 0, 0);
  }
  return new Date(dateStr);
}

export default function CalendarView() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<"month" | "week">("month");
  const [filterMode, setFilterMode] = useState<"all" | "trips" | "off" | "high-credit">("all");
  const [hoveredSeqId, setHoveredSeqId] = useState<string | null>(null);
  const [hoveredPosition, setHoveredPosition] = useState<{ x: number; y: number } | null>(null);

  const [isMobile, setIsMobile] = useState(() => typeof window !== "undefined" && window.innerWidth < 768);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [selectedPersonalEvent, setSelectedPersonalEvent] = useState<PersonalCalendarEvent | null>(null);
  const [selectedDayDetail, setSelectedDayDetail] = useState<Date | null>(null);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [activeTimezone, setActiveTimezone] = useState("BASE");

  // Movable / Draggable FAB state
  const [fabPosition, setFabPosition] = useState<{ x: number; y: number } | null>(null);
  const [isDraggingFab, setIsDraggingFab] = useState(false);
  const dragStartRef = useRef<{ mouseX: number; mouseY: number; startX: number; startY: number } | null>(null);
  const fabRef = useRef<HTMLButtonElement | null>(null);
  const hasDraggedRef = useRef(false);

  const handleFabPointerDown = (clientX: number, clientY: number) => {
    if (!fabRef.current) return;
    const rect = fabRef.current.getBoundingClientRect();
    dragStartRef.current = {
      mouseX: clientX,
      mouseY: clientY,
      startX: rect.left,
      startY: rect.top,
    };
    hasDraggedRef.current = false;
  };

  useEffect(() => {
    const handlePointerMove = (e: MouseEvent | TouchEvent) => {
      if (!dragStartRef.current) return;
      const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
      const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;

      const deltaX = clientX - dragStartRef.current.mouseX;
      const deltaY = clientY - dragStartRef.current.mouseY;

      if (Math.abs(deltaX) > 3 || Math.abs(deltaY) > 3) {
        hasDraggedRef.current = true;
        setIsDraggingFab(true);
      }

      if (hasDraggedRef.current) {
        const buttonWidth = fabRef.current?.offsetWidth || 48;
        const buttonHeight = fabRef.current?.offsetHeight || 48;

        const newX = Math.max(10, Math.min(window.innerWidth - buttonWidth - 10, dragStartRef.current.startX + deltaX));
        const newY = Math.max(10, Math.min(window.innerHeight - buttonHeight - 10, dragStartRef.current.startY + deltaY));

        setFabPosition({ x: newX, y: newY });
      }
    };

    const handlePointerUp = () => {
      if (dragStartRef.current) {
        dragStartRef.current = null;
        setTimeout(() => setIsDraggingFab(false), 50);
      }
    };

    window.addEventListener("mousemove", handlePointerMove);
    window.addEventListener("mouseup", handlePointerUp);
    window.addEventListener("touchmove", handlePointerMove);
    window.addEventListener("touchend", handlePointerUp);

    return () => {
      window.removeEventListener("mousemove", handlePointerMove);
      window.removeEventListener("mouseup", handlePointerUp);
      window.removeEventListener("touchmove", handlePointerMove);
      window.removeEventListener("touchend", handlePointerUp);
    };
  }, []);

  const handleFabClick = () => {
    if (hasDraggedRef.current) {
      hasDraggedRef.current = false;
      return;
    }
    setIsCalendarToolsOpen(true);
  };

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleEnterFullScreen = () => {
    setIsFullScreen(true);
    if (typeof document !== "undefined" && document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen().catch(() => {});
    }
  };

  const handleExitFullScreen = () => {
    setIsFullScreen(false);
    if (typeof document !== "undefined" && document.fullscreenElement && document.exitFullscreen) {
      document.exitFullscreen().catch(() => {});
    }
  };

  useEffect(() => {
    const handleFsChange = () => {
      if (typeof document !== "undefined" && !document.fullscreenElement) {
        setIsFullScreen(false);
      }
    };
    document.addEventListener("fullscreenchange", handleFsChange);
    return () => document.removeEventListener("fullscreenchange", handleFsChange);
  }, []);

  const monthlyHIMetadata = useCrewStore((state) => state.monthlyHIMetadata);
  const rawSequences = useCrewStore((state) => state.sequences);
  const vacations = useCrewStore((state) => state.vacations);
  const openSequences = useCrewStore((state) => state.openSequences);
  const showOpenTimeOverlay = useCrewStore((state) => state.showOpenTimeOverlay);
  const setShowOpenTimeOverlay = useCrewStore((state) => state.setShowOpenTimeOverlay);
  const simulatedIds = useCrewStore((state) => state.simulatedSequenceIds);
  const toggleSimulate = useCrewStore((state) => state.toggleSimulateSequence);
  const openTimeFilter = useCrewStore((state) => state.openTimeFilter);
  const setSelectedSequenceId = useCrewStore((state) => state.setSelectedSequenceId);
  const personalEvents = useCrewStore((state) => state.personalEvents || []);
  const subscribedCalendars = useCrewStore((state) => state.subscribedCalendars || []);
  const toggleSubscribedCal = useCrewStore((state) => state.toggleSubscribedCalendar);
  const selectedSequenceId = useCrewStore((state) => state.selectedSequenceId);
  const showDtsDropped = useCrewStore((state) => state.showDtsDropped);
  const toggleShowDtsDropped = useCrewStore((state) => state.toggleShowDtsDropped);
  const isCalendarToolsOpen = useCrewStore((state) => state.isCalendarToolsOpen);
  const setIsCalendarToolsOpen = useCrewStore((state) => state.setIsCalendarToolsOpen);
  const stationTurnLimits = useCrewStore((state) => state.stationTurnLimits);
  const defaultTurnLimit = useCrewStore((state) => state.defaultTurnLimit);
  const highCreditThresholdHours = useCrewStore((state) => state.highCreditThresholdHours);

  // Update calendar to match the metadata month
  const prevMetadataRef = useRef<string | null>(null);
  useEffect(() => {
    if (monthlyHIMetadata?.monthEnding) {
      if (prevMetadataRef.current === monthlyHIMetadata.monthEnding) return;
      prevMetadataRef.current = monthlyHIMetadata.monthEnding;
      
      const m = monthlyHIMetadata.monthEnding.match(/\d*([A-Z]{3})(\d{2,4})/i);
      if (m) {
        const monthAbbr = m[1].toUpperCase();
        let yearNum = parseInt(m[2], 10);
        if (yearNum < 100) yearNum += 2000;
        const months: Record<string, number> = { JAN: 0, FEB: 1, MAR: 2, APR: 3, MAY: 4, JUN: 5, JUL: 6, AUG: 7, SEP: 8, OCT: 9, NOV: 10, DEC: 11 };
        const monthIdx = months[monthAbbr];
        if (monthIdx !== undefined) {
          setCurrentDate(new Date(yearNum, monthIdx, 20));
        }
      }
    }
  }, [monthlyHIMetadata]);


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
      totalCreditMinutes: Math.round((v.creditHours || 24.5) * 60),
      layoverCities: ["VACATION"],
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
      const seqStartObj = parseLocalDateString(seq.startDate);
      const seqEndObj = parseLocalDateString(seq.endDate);

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

  const rowActivityMap = useMemo(() => {
    const map: Record<number, { maxSlot: number; hasEvents: boolean }> = {};
    
    sequenceSegments.forEach((seg) => {
      if (!map[seg.row]) map[seg.row] = { maxSlot: -1, hasEvents: false };
      map[seg.row].maxSlot = Math.max(map[seg.row].maxSlot, seg.slot);
    });

    monthDays.forEach((date, idx) => {
      const row = Math.floor(idx / 7) + 1;
      if (!map[row]) map[row] = { maxSlot: -1, hasEvents: false };

      const dStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
      const hasEvt = personalEvents.some((e) => {
        const enabledCal = subscribedCalendars.find((c) => c.id === e.calendarId);
        if (enabledCal && !enabledCal.enabled) return false;
        return e.startDate === dStr || (e.startDate <= dStr && e.endDate >= dStr);
      });

      if (hasEvt) {
        map[row].hasEvents = true;
      }
    });

    return map;
  }, [sequenceSegments, monthDays, personalEvents, subscribedCalendars]);

  // Navigation handlers
  const handlePrevMonth = () => {
    if (viewMode === "week") {
      const next = new Date(currentDate);
      next.setDate(next.getDate() - 7);
      setCurrentDate(next);
    } else {
      const next = new Date(currentDate);
      next.setMonth(next.getMonth() - 1);
      setCurrentDate(next);
    }
  };

  const handleNextMonth = () => {
    if (viewMode === "week") {
      const next = new Date(currentDate);
      next.setDate(next.getDate() + 7);
      setCurrentDate(next);
    } else {
      const next = new Date(currentDate);
      next.setMonth(next.getMonth() + 1);
      setCurrentDate(next);
    }
  };

  // Color mapping utility
  const getColorClasses = (colorTag: string, isSelected: boolean) => {
    const maps: Record<string, { bg: string; border: string; text: string; glow: string; hover: string; subtext: string }> = {
      indigo: {
        bg: "bg-sky-50",
        border: isSelected ? "border-sky-600 ring-2 ring-sky-600/40" : "border-sky-300",
        text: "text-sky-950 font-bold",
        glow: "shadow-sm",
        hover: "hover:bg-sky-100 hover:border-sky-500",
        subtext: "text-sky-800 font-semibold",
      },
      emerald: {
        bg: "bg-emerald-50",
        border: isSelected ? "border-emerald-600 ring-2 ring-emerald-600/40" : "border-emerald-300",
        text: "text-emerald-950 font-bold",
        glow: "shadow-sm",
        hover: "hover:bg-emerald-100 hover:border-emerald-500",
        subtext: "text-emerald-800 font-semibold",
      },
      amber: {
        bg: "bg-amber-50",
        border: isSelected ? "border-amber-600 ring-2 ring-amber-600/40" : "border-amber-300",
        text: "text-amber-950 font-bold",
        glow: "shadow-sm",
        hover: "hover:bg-amber-100 hover:border-amber-500",
        subtext: "text-amber-800 font-semibold",
      },
      rose: {
        bg: "bg-rose-50",
        border: isSelected ? "border-rose-600 ring-2 ring-rose-600/40" : "border-rose-300",
        text: "text-rose-950 font-bold",
        glow: "shadow-sm",
        hover: "hover:bg-rose-100 hover:border-rose-500",
        subtext: "text-rose-800 font-semibold",
      },
      cyan: {
        bg: "bg-cyan-50",
        border: isSelected ? "border-cyan-600 ring-2 ring-cyan-600/40" : "border-cyan-300",
        text: "text-cyan-950 font-bold",
        glow: "shadow-sm",
        hover: "hover:bg-cyan-100 hover:border-cyan-500",
        subtext: "text-cyan-800 font-semibold",
      },
      violet: {
        bg: "bg-purple-50",
        border: isSelected ? "border-purple-600 ring-2 ring-purple-600/40" : "border-purple-300",
        text: "text-purple-950 font-bold",
        glow: "shadow-sm",
        hover: "hover:bg-purple-100 hover:border-purple-500",
        subtext: "text-purple-800 font-semibold",
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
          ? "rgba(254, 243, 199, 0.9)"
          : "rgba(240, 249, 255, 0.9)";
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

  const renderGridContent = () => (
    <>
      {/* View Grid */}
      {viewMode === "month" ? (
        /* Month Grid View */
        <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-md h-full flex flex-col">
          {/* Weekday headers */}
          <div className="grid grid-cols-7 border-b border-slate-200 text-center py-3 bg-slate-100 shrink-0">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <span key={day} className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">
                {day}
              </span>
            ))}
          </div>

          {/* Days */}
          {(() => {
            const totalRows = Math.ceil(monthDays.length / 7);
            const gridTemplateRows = Array.from({ length: totalRows }, (_, r) => {
              const rowNum = r + 1;
              const activity = rowActivityMap[rowNum] || { maxSlot: -1, hasEvents: false };
              const slotCount = Math.max(0, activity.maxSlot + 1);
              const slotPx = isMobile ? 24 : 32;
              const basePx = isMobile ? 28 : 34;
              const evtPx = activity.hasEvents ? (isMobile ? 22 : 28) : 0;
              const minHeight = Math.max(isMobile ? 100 : 125, basePx + slotCount * slotPx + evtPx + 8);
              return `minmax(${minHeight}px, 1fr)`;
            }).join(" ");

            return (
              <div className="grid grid-cols-7 bg-slate-50 flex-grow h-full min-h-0" style={{ gridTemplateRows }}>
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

                  const isFirstOfMonth = date.getDate() === 1;
                  const monthAbbrev = date.toLocaleString("default", { month: "short" }).toUpperCase();

                  return (
                    <div
                      key={idx}
                      style={{
                        gridRow: row,
                        gridColumn: col,
                        ...(isFirstOfMonth ? { borderLeft: "4px solid #0284c7" } : {}),
                        ...(isFirstOfMonth && date.getDay() === 0 ? { borderTop: "4px solid #0284c7" } : {}),
                      }}
                      onClick={() => setSelectedDayDetail(date)}
                      className={`relative p-1 sm:p-2 border-r border-b border-slate-200 flex flex-col justify-start gap-0.5 transition-all duration-200 min-h-0 overflow-hidden cursor-pointer ${
                        isVacationDay
                          ? "bg-emerald-50/70 border-emerald-300"
                          : isFirstOfMonth
                          ? "bg-sky-50/70"
                          : isCurrentMonth
                          ? "bg-white hover:bg-slate-50/80"
                          : "bg-slate-100/80 opacity-40 pointer-events-none"
                      } ${hide ? "opacity-10" : ""}`}
                    >
                      {/* Date cell header bar */}
                      <div className="flex items-center justify-between w-full min-w-0 gap-0.5">
                        <div className="flex items-center gap-1 min-w-0">
                          <span
                            className={`text-[10px] sm:text-xs font-bold font-mono px-1.5 py-0.2 rounded-full shrink-0 ${
                              isToday
                                ? "bg-sky-600 text-white font-black shadow-sm"
                                : isFirstOfMonth
                                ? "bg-sky-600 text-white font-black shadow-xs"
                                : isCurrentMonth
                                ? "text-slate-800 font-extrabold"
                                : "text-slate-500"
                            }`}
                          >
                            {date.getDate()}
                          </span>

                          {/* Month Transition Badge on Day 1 */}
                          {isFirstOfMonth && (
                            <span className="px-1.5 py-0.2 rounded-full text-[8px] sm:text-[9.5px] font-black uppercase tracking-wider bg-gradient-to-r from-sky-600 to-indigo-600 text-white shadow-2xs shrink-0 font-mono">
                              ✨ {monthAbbrev} {date.getFullYear()}
                            </span>
                          )}
                        </div>

                        {seq && getRonForDate(seq, date) && (
                          <span className="inline-flex items-center gap-0.5 px-1 py-0.2 text-[7.5px] sm:text-[9px] font-extrabold text-amber-900 bg-amber-100 border border-amber-300 rounded tracking-tight uppercase shrink-0 max-w-[46px] sm:max-w-none truncate">
                            <Moon className="w-2 h-2 fill-amber-500 text-amber-600 shrink-0" />
                            <span className="truncate">{getRonForDate(seq, date)}</span>
                          </span>
                        )}

                        {isDfp && !isVacationDay && !seq && filterMode !== "trips" && !isFirstOfMonth && (
                          <span className="text-[7.5px] sm:text-[9px] font-bold text-slate-600 tracking-wide uppercase px-1 py-0.2 rounded bg-slate-100 border border-slate-200 shrink-0">
                            DFP
                          </span>
                        )}
                      </div>

                      {/* Personal Events Container */}
                      {(() => {
                        const cellSegs = sequenceSegments.filter(
                          (s) => s.row === row && s.startCol <= col && s.endCol >= col
                        );
                        const maxSlot = cellSegs.length > 0 ? Math.max(...cellSegs.map((s) => s.slot)) : -1;
                        const topPx = isMobile ? 24 + (maxSlot + 1) * 24 : 32 + (maxSlot + 1) * 32;

                        const dateEvents = personalEvents.filter((e) => {
                          const enabledCal = subscribedCalendars.find((c) => c.id === e.calendarId);
                          if (enabledCal && !enabledCal.enabled) return false;
                          const dStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
                          return e.startDate === dStr || (e.startDate <= dStr && e.endDate >= dStr);
                        });

                        if (dateEvents.length === 0) return null;

                        const maxVisible = 1;
                        const visibleEvents = dateEvents.slice(0, maxVisible);
                        const overflowCount = dateEvents.length - maxVisible;

                        return (
                          <div
                            style={{ top: `${topPx}px` }}
                            className="absolute left-0.5 right-0.5 space-y-0.5 z-30 pointer-events-auto max-h-[44px] overflow-hidden"
                          >
                            {visibleEvents.map((evt) => {
                              let pillStyle = "bg-purple-100 border-purple-300 text-purple-950 hover:bg-purple-200";
                              if (evt.color === "teal") pillStyle = "bg-teal-100 border-teal-300 text-teal-950";
                              else if (evt.color === "rose") pillStyle = "bg-rose-100 border-rose-300 text-rose-950";
                              else if (evt.color === "amber") pillStyle = "bg-amber-100 border-amber-300 text-amber-950";
                              else if (evt.color === "emerald") pillStyle = "bg-emerald-100 border-emerald-300 text-emerald-950";
                              else if (evt.color === "sky") pillStyle = "bg-sky-100 border-sky-300 text-sky-950";

                              return (
                                <div
                                  key={evt.id}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedPersonalEvent(evt);
                                  }}
                                  className={`px-1 py-0.2 rounded border text-[8px] sm:text-[9.5px] font-bold truncate transition cursor-pointer flex items-center justify-between gap-0.5 leading-none ${pillStyle}`}
                                  title={evt.title}
                                >
                                  <span className="truncate">{evt.title}</span>
                                  {evt.startTime && <span className="text-[7.5px] font-mono opacity-80 shrink-0">{evt.startTime}</span>}
                                </div>
                              );
                            })}

                            {overflowCount > 0 && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedDayDetail(date);
                                }}
                                className="w-full text-center text-[7.5px] font-extrabold text-sky-700 bg-sky-50 border border-sky-200 rounded py-0.2 cursor-pointer leading-none"
                              >
                                +{overflowCount} more
                              </button>
                            )}
                          </div>
                        );
                      })()}

                      {isDfp && !isVacationDay && (
                        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-200/20 via-transparent to-transparent pointer-events-none opacity-40" />
                      )}
                    </div>
                  );
                })}

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
                    const isMultiDay = seg.endCol - seg.startCol >= 1;

                    let cardStyle = "bg-sky-600 text-white border-sky-700 shadow-sm hover:bg-sky-700";
                    let subtextColor = "text-sky-100";

                    if (isVacation) {
                      cardStyle = "bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 text-white border-emerald-700 font-extrabold shadow-sm hover:from-emerald-700 hover:to-teal-700";
                      subtextColor = "text-emerald-100";
                    } else if (isDropped) {
                      cardStyle = "bg-rose-100 text-rose-900 border border-dashed border-rose-400 font-bold hover:bg-rose-200";
                      subtextColor = "text-rose-800";
                    } else if (isOt) {
                      cardStyle = "bg-gradient-to-r from-amber-500 to-amber-600 text-white border-amber-600 shadow-sm hover:from-amber-600 hover:to-amber-700 font-bold";
                      subtextColor = "text-amber-100";
                    }

                    const isSelected = seg.seq.id === selectedSequenceId;
                    const credHrs = (seg.seq.totalCreditMinutes / 60).toFixed(1);

                    return (
                      <div
                        key={`seg-${idx}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedSequenceId(seg.seq.id);
                        }}
                        style={{
                          gridRow: seg.row,
                          gridColumnStart: seg.startCol,
                          gridColumnEnd: seg.endCol + 1,
                          alignSelf: "start",
                          marginTop: `${isMobile ? 22 + seg.slot * 24 : 30 + seg.slot * 32}px`,
                          height: isMobile ? "20px" : "26px",
                          zIndex: 20,
                          position: "relative",
                        }}
                        className={`mx-0.5 py-0.5 px-1.5 rounded-lg border text-left cursor-pointer transition duration-150 select-none flex items-center justify-between gap-1 overflow-hidden ${cardStyle} ${
                          isSelected ? "ring-2 ring-sky-300 ring-offset-1" : ""
                        }`}
                        title={`Sequence #${seg.seq.sequenceNumber}\nBase: ${seg.seq.base} ${seg.seq.equipment}\nCredit: ${credHrs}h\nLayovers: ${seg.seq.layoverCities.join(" → ") || "None"}`}
                      >
                        <div className="flex items-center gap-1 truncate min-w-0">
                          <span className="flex items-center gap-0.5 font-black text-[9px] sm:text-xs truncate">
                            <Plane className="w-3 h-3 shrink-0" />
                            <span className="truncate">{isVacation ? "VACATION" : `#${seg.seq.sequenceNumber}`}</span>
                          </span>

                          {!isVacation && (
                            <span className={`text-[8px] sm:text-[10px] font-bold font-mono ${subtextColor} hidden sm:inline truncate`}>
                              [{seg.seq.base}]
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1 text-[8px] sm:text-[10px] font-mono font-bold shrink-0">
                          {isVacation ? (
                            <span className="text-[7.5px] bg-emerald-700/80 text-white px-1 py-0.2 rounded uppercase font-black">
                              7 Days
                            </span>
                          ) : (
                            <>
                              {seg.seq.layoverCities.length > 0 && !isMobile && (
                                <span className="text-[8px] opacity-95 hidden lg:inline-flex items-center gap-0.5 bg-black/20 px-1 py-0.2 rounded">
                                  <Moon className="w-2 h-2 text-amber-300" /> {seg.seq.layoverCities.join("→")}
                                </span>
                              )}
                              <span className="px-1 py-0.2 bg-black/20 rounded font-black text-[8px] sm:text-[10px]">
                                {credHrs}h
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            );
          })()}
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
                className={`p-4 bg-white border rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition duration-200 shadow-sm ${
                  isSelected ? "border-sky-600 ring-2 ring-sky-600/30" : isToday ? "border-sky-400 bg-sky-50" : "border-slate-200"
                } ${seq ? "cursor-pointer hover:border-slate-400" : ""}`}
              >
                <div className="flex items-center gap-4">
                  <div className="text-center w-14 py-2 rounded-xl bg-slate-100 border border-slate-200 font-mono">
                    <p className="text-[10px] text-slate-600 uppercase font-black">
                      {date.toLocaleString("default", { weekday: "short" })}
                    </p>
                    <p className="text-lg font-bold text-slate-900">{date.getDate()}</p>
                  </div>

                  <div>
                    {seq ? (
                      <div>
                        <div className="flex items-center gap-2.5">
                          <span className="text-md font-bold text-slate-900">
                            Sequence {seq.sequenceNumber}
                          </span>
                          <span className="px-2 py-0.5 bg-sky-100 border border-sky-300 text-sky-900 font-mono text-[10px] font-bold rounded-lg">
                            {seq.base}
                          </span>
                        </div>
                        <p className="text-xs text-slate-700 mt-0.5 flex items-center gap-2 font-medium">
                          <Clock className="w-3.5 h-3.5 text-slate-500" />
                          Duty credit: {Math.floor(seq.totalCreditMinutes / 60)}h {seq.totalCreditMinutes % 60}m
                        </p>
                      </div>
                    ) : (
                      <div>
                        <span className="text-md font-bold text-slate-800 flex items-center gap-2">
                          <Sun className="w-4 h-4 text-emerald-600" />
                          Duty-Free Period (DFP)
                        </span>
                        <p className="text-xs text-slate-500 mt-0.5">Off Day - Rest Period</p>
                      </div>
                    )}
                  </div>
                </div>

                {seq && dutyPeriod && (
                  <div className="flex-grow flex flex-col md:flex-row md:justify-end gap-3 w-full md:w-auto">
                    {dutyPeriod.legs.length > 0 ? (
                      <div className="flex flex-wrap items-center gap-2.5">
                        <span className="text-xs font-bold text-slate-600 uppercase tracking-wide mr-1.5">
                          Flights:
                        </span>
                        {dutyPeriod.legs.map((leg) => (
                          <div
                            key={leg.flightNumber}
                            className={`flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold ${leg.isCancelled ? 'text-red-600/70 line-through' : 'text-slate-800'}`}
                          >
                            <Plane className={`w-3 h-3 ${leg.isCancelled ? 'text-red-400' : 'text-sky-600'}`} />
                            <span>{leg.flightNumber}{leg.isCancelled && " (CXLD)"}</span>
                            <span className={leg.isCancelled ? 'text-red-500/70' : 'text-slate-600'}>({leg.depAirport}→{leg.arrAirport})</span>
                            <span className={`text-[10px] ${leg.isCancelled ? 'text-red-400/70' : 'text-slate-500'}`}>{leg.depTime}-{leg.arrTime}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-slate-500 italic">No flights scheduled today.</span>
                    )}

                    {dutyPeriod.layoverCity && (
                      <div className="px-3 py-1.5 bg-amber-100 border border-amber-300 text-amber-900 rounded-xl text-xs font-bold flex items-center gap-1.5">
                        <Moon className="w-3.5 h-3.5 fill-amber-500 text-amber-600" />
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
    </>
  );

  const renderModals = () => (
    <>
      {/* Floating Tooltip Component */}
      {typeof document !== "undefined" && hoveredSeqId && hoveredPosition
        ? createPortal(
            <div
              style={{
                position: "fixed",
                left: hoveredPosition.x,
                top: hoveredPosition.y,
                transform: "translate(-50%, -100%)",
                zIndex: 100001,
              }}
              className="w-80 bg-white border border-slate-300 rounded-2xl p-4 shadow-2xl pointer-events-none animate-scaleIn"
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
                    <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                      <span className="text-sm font-black text-slate-900 flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${
                          isGhost 
                            ? (hasConflict ? "bg-rose-600" : "bg-emerald-600 animate-pulse")
                            : "bg-sky-600"
                        }`} />
                        Seq {seq.sequenceNumber}
                      </span>
                      <div className="flex items-center gap-1.5">
                        {isGhost && (
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            hasConflict
                              ? "bg-rose-100 border border-rose-300 text-rose-900"
                              : "bg-emerald-100 border border-emerald-300 text-emerald-900"
                          }`}>
                            {hasConflict ? "CONFLICT" : "OPEN TIME"}
                          </span>
                        )}
                        <span className="text-[10px] bg-sky-100 border border-sky-300 font-bold px-1.5 py-0.5 rounded text-sky-900">
                          {seq.base}
                        </span>
                      </div>
                    </div>

                    {hasConflict && (
                      <div className="p-2.5 bg-rose-50 border border-rose-300 rounded-xl text-[10px] text-rose-900 font-sans leading-relaxed">
                        <strong>Conflict:</strong> {seq.conflictReason}
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                      <div className="bg-slate-50 p-2 rounded-lg border border-slate-200">
                        <p className="text-[10px] text-slate-500 font-sans">Block Hours</p>
                        <p className="font-bold text-slate-900 mt-0.5">
                          {Math.floor(seq.totalBlockMinutes / 60)}h {seq.totalBlockMinutes % 60}m
                        </p>
                      </div>
                      <div className="bg-slate-50 p-2 rounded-lg border border-slate-200">
                        <p className="text-[10px] text-slate-500 font-sans">Credit Hours</p>
                        <p className="font-bold text-emerald-700 mt-0.5">
                          {Math.floor(seq.totalCreditMinutes / 60)}h {seq.totalCreditMinutes % 60}m
                        </p>
                      </div>
                    </div>

                    {seq.layoverCities.length > 0 && (
                      <div className="text-xs">
                        <p className="text-[10px] text-slate-600 mb-1 font-bold">RON Layovers:</p>
                        <div className="flex flex-wrap gap-1">
                          {seq.layoverCities.map((city) => (
                            <span
                              key={city}
                              className="px-2 py-0.5 bg-slate-100 text-slate-800 rounded font-bold border border-slate-300 text-[10px]"
                            >
                              {city}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="text-[10px] text-sky-700 font-semibold flex items-center gap-1">
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

      <CalendarSyncModal isOpen={isSyncModalOpen} onClose={() => setIsSyncModalOpen(false)} />

      {/* Sequence / Trip Inspector Mobile Bottom Sheet Drawer */}
      {selectedSequenceId && (
        <div
          className="fixed inset-0 z-[100000] bg-slate-950/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fadeIn"
          onClick={() => setSelectedSequenceId(null)}
        >
          <div
            className="bg-white rounded-t-3xl sm:rounded-3xl border-t sm:border border-slate-200 shadow-2xl max-w-xl w-full max-h-[92vh] sm:max-h-[85vh] overflow-hidden flex flex-col animate-slideUp pb-[calc(1rem+env(safe-area-inset-bottom,0px))]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Mobile Drag Handle */}
            <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto my-2.5 sm:hidden shrink-0" />

            <div className="p-3 sm:p-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <span className="text-xs font-black uppercase text-slate-700 tracking-wider flex items-center gap-2">
                <Plane className="w-4 h-4 text-sky-600" />
                Trip Inspector & Legality
              </span>
              <button
                onClick={() => setSelectedSequenceId(null)}
                className="p-1.5 rounded-xl bg-slate-200/80 hover:bg-slate-300 text-slate-700 transition cursor-pointer active-press"
                title="Close Inspector"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-3 sm:p-5 overflow-y-auto scrollbar-thin flex-1">
              <SequenceInspector isEmbedded={true} />
            </div>
          </div>
        </div>
      )}

      {/* Personal Event Details Modal */}
      {selectedPersonalEvent && (
        <div className="fixed inset-0 z-[100000] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden flex flex-col">
            <div className="bg-gradient-to-r from-sky-700 to-sky-600 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-white/20 border border-white/30 rounded-xl text-white">
                  <CalendarIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">{selectedPersonalEvent.title}</h3>
                  <p className="text-xs text-sky-100 font-medium">
                    {subscribedCalendars.find((c) => c.id === selectedPersonalEvent.calendarId)?.name || "Subscribed Personal Calendar"}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedPersonalEvent(null)}
                className="text-white/80 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs font-medium text-slate-800">
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                <div className="flex items-center justify-between text-slate-700 font-bold">
                  <span>Start Date:</span>
                  <span className="font-mono text-slate-900">{selectedPersonalEvent.startDate}</span>
                </div>
                <div className="flex items-center justify-between text-slate-700 font-bold">
                  <span>End Date:</span>
                  <span className="font-mono text-slate-900">{selectedPersonalEvent.endDate || selectedPersonalEvent.startDate}</span>
                </div>
                <div className="flex items-center justify-between text-slate-700 font-bold">
                  <span>Event Time:</span>
                  <span className="font-mono text-slate-900">
                    {selectedPersonalEvent.startTime
                      ? `${selectedPersonalEvent.startTime} - ${selectedPersonalEvent.endTime || ""}`
                      : "All Day Event"}
                  </span>
                </div>
                {selectedPersonalEvent.location && (
                  <div className="flex items-center justify-between text-slate-700 font-bold">
                    <span>Location:</span>
                    <span className="text-purple-700 font-bold">{selectedPersonalEvent.location}</span>
                  </div>
                )}
              </div>

              {selectedPersonalEvent.notes && (
                <div className="space-y-1">
                  <label className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">Event Details & Notes</label>
                  <p className="p-3 bg-slate-100/70 border border-slate-200 rounded-xl text-slate-800 leading-relaxed">
                    {selectedPersonalEvent.notes}
                  </p>
                </div>
              )}
            </div>

            <div className="bg-slate-50 border-t border-slate-200 p-3.5 flex justify-end">
              <button
                onClick={() => setSelectedPersonalEvent(null)}
                className="px-5 py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-xl transition cursor-pointer shadow-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Day Breakdown & Timezone Modal */}
      {selectedDayDetail && (
        <DayDetailModal
          isOpen={!!selectedDayDetail}
          onClose={() => setSelectedDayDetail(null)}
          date={selectedDayDetail}
          sequences={sequences}
          personalEvents={personalEvents}
          subscribedCalendars={subscribedCalendars}
          primaryBase={sequences[0]?.base || "ORD"}
        />
      )}

      {/* Grid Preferences & Filters Popover Modal */}
      <GridFilterModal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        filterMode={filterMode}
        setFilterMode={setFilterMode}
        activeTimezone={activeTimezone}
        setActiveTimezone={setActiveTimezone}
        setIsSyncModalOpen={setIsSyncModalOpen}
      />

      {/* Calendar Tools & Controls Studio Modal */}
      <CalendarToolsModal
        isOpen={isCalendarToolsOpen}
        onClose={() => setIsCalendarToolsOpen(false)}
        viewMode={viewMode}
        setViewMode={setViewMode}
        filterMode={filterMode}
        setFilterMode={setFilterMode}
      />

      {/* Live Calendar Export & Family Sharing Modal */}
      <CalendarShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
      />

      {/* Google Calendar Style Event View / Edit Modal */}
      <CalendarEventModal
        isOpen={!!selectedPersonalEvent}
        onClose={() => setSelectedPersonalEvent(null)}
        existingEvent={selectedPersonalEvent}
      />
    </>
  );

  // If in Full Screen mode, render Portaled fullscreen directly on document.body
  if (isFullScreen && typeof document !== "undefined") {
    return createPortal(
      <div className="fixed inset-0 z-[99999] bg-slate-100 w-screen h-screen overflow-y-auto p-3 sm:p-6 flex flex-col font-sans text-slate-900 animate-fadeIn">
        {/* Full Screen Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-slate-200 p-4 rounded-2xl shadow-sm shrink-0 mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-tr from-sky-600 to-cyan-600 rounded-xl shadow-md">
              <CalendarIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight leading-none flex items-center gap-2">
                Schedule & Roster Grid
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-sky-100 border border-sky-300 text-sky-900 uppercase">
                  Full Screen Focus Mode
                </span>
              </h2>
              <p className="text-xs text-slate-500 font-medium mt-1">
                {viewMode === "month" ? `${monthName} ${activeYear}` : `Week of ${weekDays[0].toLocaleDateString("en-US", { month: "short", day: "numeric" })}`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button onClick={handlePrevMonth} className="p-1.5 hover:bg-white text-slate-700 hover:text-slate-900 rounded-lg transition cursor-pointer" title="Previous">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs font-bold font-mono px-2 text-slate-800">
                {viewMode === "month" ? `${monthName} ${activeYear}` : `Week of ${weekDays[0].toLocaleDateString("en-US", { month: "short", day: "numeric" })}`}
              </span>
              <button onClick={handleNextMonth} className="p-1.5 hover:bg-white text-slate-700 hover:text-slate-900 rounded-lg transition cursor-pointer" title="Next">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
              <button onClick={() => setViewMode("month")} className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${viewMode === "month" ? "bg-white text-slate-900 shadow-xs font-extrabold" : "text-slate-600 hover:text-slate-900"}`}>Month</button>
              <button onClick={() => setViewMode("week")} className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${viewMode === "week" ? "bg-white text-slate-900 shadow-xs font-extrabold" : "text-slate-600 hover:text-slate-900"}`}>Week</button>
            </div>

            <button onClick={() => setIsCalendarToolsOpen(true)} className="px-3 py-1.5 text-slate-700 hover:bg-slate-100 rounded-xl border border-slate-200 transition cursor-pointer flex items-center gap-1.5 font-bold text-xs" title="Calendar Tools & Controls">
              <SlidersHorizontal className="w-4 h-4 text-sky-600" />
              <span>Calendar Tools</span>
            </button>

            <button onClick={handleExitFullScreen} className="flex items-center gap-1.5 px-3.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 rounded-xl text-xs font-extrabold transition cursor-pointer shadow-xs">
              <Minimize2 className="w-4 h-4" />
              <span>Exit Full Screen</span>
            </button>
          </div>
        </div>

        {/* Dynamic Studio Panels inside Fullscreen Portal */}
        <div className="flex-grow space-y-4 overflow-y-auto">
          {renderGridContent()}
        </div>

        {/* Floating Tooltips & Modals */}
        {renderModals()}
      </div>,
      document.body
    );
  }

  // Single Unified Continuous Stream Grid across all months
  const streamDays = useMemo(() => {
    const baseYear = currentDate.getFullYear();
    const baseMonth = currentDate.getMonth();

    // Start 1 month prior, start on Sunday
    const firstDay = new Date(baseYear, baseMonth - 1, 1);
    const startDay = new Date(firstDay);
    startDay.setDate(startDay.getDate() - startDay.getDay());

    // End 4 months ahead, end on Saturday
    const lastDay = new Date(baseYear, baseMonth + 4, 0);
    const endDay = new Date(lastDay);
    endDay.setDate(endDay.getDate() + (6 - endDay.getDay()));

    const days: Date[] = [];
    const curr = new Date(startDay);
    while (curr <= endDay) {
      days.push(new Date(curr));
      curr.setDate(curr.getDate() + 1);
    }
    return days;
  }, [currentDate]);

  // Compute sequence segments across streamDays
  const streamSegmentsRaw = useMemo(() => {
    const segments: {
      seq: SequenceTrip;
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
      totalCreditMinutes: Math.round((v.creditHours || 24.5) * 60),
      layoverCities: ["VACATION"],
      dutyPeriods: [],
      colorTag: "emerald",
      statusTag: "VA",
      isVacation: true,
    }));

    const allTripsToRender = [...sequences, ...vacationTrips];

    allTripsToRender.forEach((seq) => {
      if (seq.isDropped || seq.statusTag === "DROP" || seq.statusTag === "DTS DROP") {
        if (!showDtsDropped) return;
      }

      const sDate = parseLocalDateString(seq.startDate);
      const eDate = parseLocalDateString(seq.endDate);

      const startIdx = streamDays.findIndex(
        (d) =>
          d.getFullYear() === sDate.getFullYear() &&
          d.getMonth() === sDate.getMonth() &&
          d.getDate() === sDate.getDate()
      );
      const endIdx = streamDays.findIndex(
        (d) =>
          d.getFullYear() === eDate.getFullYear() &&
          d.getMonth() === eDate.getMonth() &&
          d.getDate() === eDate.getDate()
      );

      if (startIdx === -1 && endIdx === -1) return;

      const effStart = startIdx !== -1 ? startIdx : 0;
      const effEnd = endIdx !== -1 ? endIdx : streamDays.length - 1;

      let curr = effStart;
      while (curr <= effEnd) {
        const row = Math.floor(curr / 7) + 1;
        const endOfWeek = Math.floor(curr / 7) * 7 + 6;
        const currEnd = Math.min(endOfWeek, effEnd);

        segments.push({
          seq,
          row,
          startCol: (curr % 7) + 1,
          endCol: (currEnd % 7) + 1,
          isRealStart: curr === startIdx,
          isRealEnd: currEnd === endIdx,
          isDayOt: seq.isOvertime || seq.statusTag === "OT",
          originalSeqId: seq.id,
        });

        curr = currEnd + 1;
      }
    });

    return segments;
  }, [sequences, streamDays, showDtsDropped]);

  // Group by row and assign slots
  const { streamSegmentsWithSlots, streamRowMaxSlots } = useMemo(() => {
    const rowSegments: Record<number, typeof streamSegmentsRaw> = {};
    streamSegmentsRaw.forEach((seg) => {
      if (!rowSegments[seg.row]) rowSegments[seg.row] = [];
      rowSegments[seg.row].push(seg);
    });

    const segmentsWithSlots: {
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
    }[] = [];
    const rowMaxSlots: Record<number, number> = {};

    Object.keys(rowSegments).forEach((rowStr) => {
      const row = Number(rowStr);
      const rowSegs = rowSegments[row];

      rowSegs.sort((a, b) => {
        const spanA = a.endCol - a.startCol;
        const spanB = b.endCol - b.startCol;
        if (spanA !== spanB) return spanB - spanA;
        return a.startCol - b.startCol;
      });

      const colOccupied: Record<number, boolean[]> = {};
      for (let c = 1; c <= 7; c++) colOccupied[c] = [];

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
          if (!occupied) break;
          slot++;
        }

        for (let col = seg.startCol; col <= seg.endCol; col++) {
          colOccupied[col][slot] = true;
        }

        segmentsWithSlots.push({ ...seg, slot });
        rowMaxSlots[row] = Math.max(rowMaxSlots[row] ?? -1, slot);
      });
    });

    return { streamSegmentsWithSlots: segmentsWithSlots, streamRowMaxSlots: rowMaxSlots };
  }, [streamSegmentsRaw]);

  const totalStreamRows = Math.ceil(streamDays.length / 7);
  const streamGridTemplateRows = Array.from({ length: totalStreamRows }, (_, r) => {
    const rowNum = r + 1;
    const maxSlot = streamRowMaxSlots[rowNum] ?? -1;
    const slotCount = Math.max(0, maxSlot + 1);
    const slotPx = isMobile ? 24 : 32;
    const basePx = isMobile ? 28 : 34;
    const minHeight = Math.max(isMobile ? 100 : 125, basePx + slotCount * slotPx + 20);
    return `minmax(${minHeight}px, 1fr)`;
  }).join(" ");

  return (
    <div className="w-full h-full flex flex-col bg-[#f8fafc] overflow-hidden font-sans text-slate-900">
      {/* Sticky Weekday Header (Safe below camera notch) */}
      <div className="grid grid-cols-7 border-b border-slate-200 text-center pt-[max(2.5rem,calc(env(safe-area-inset-top,0px)+0.5rem))] pb-2 bg-slate-100/95 shrink-0 sticky top-0 z-40 backdrop-blur-md shadow-xs">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
          <span key={day} className="text-[10px] sm:text-xs font-extrabold text-slate-700 uppercase tracking-wider">
            {day}
          </span>
        ))}
      </div>

      {/* Unified Continuous Stream Grid */}
      <div className="flex-grow h-full min-h-0 overflow-y-auto scrollbar-thin pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))]">
        <div className="grid grid-cols-7 bg-slate-50 border-b border-slate-200" style={{ gridTemplateRows: streamGridTemplateRows }}>
          {streamDays.map((date, idx) => {
            const seq = getSequenceForDate(date);
            const isToday = new Date().toDateString() === date.toDateString();
            const isFirstOfMonth = date.getDate() === 1;
            const isDfp = !seq;
            const row = Math.floor(idx / 7) + 1;
            const col = (idx % 7) + 1;

            const isVacationDay = vacations.some((v) => {
              const y = date.getFullYear();
              const m = String(date.getMonth() + 1).padStart(2, "0");
              const d = String(date.getDate()).padStart(2, "0");
              const dateStr = `${y}-${m}-${d}`;
              return dateStr >= v.startDate && dateStr <= v.endDate;
            });

            const monthAbbrev = date.toLocaleString("default", { month: "short" }).toUpperCase();

            return (
              <div
                key={idx}
                style={{
                  gridRow: row,
                  gridColumn: col,
                  ...(isFirstOfMonth ? { borderLeft: "4px solid #0284c7" } : {}),
                  ...(isFirstOfMonth && date.getDay() === 0 ? { borderTop: "4px solid #0284c7" } : {}),
                }}
                onClick={() => setSelectedDayDetail(date)}
                className={`relative p-1 sm:p-2 border-r border-b border-slate-200 flex flex-col justify-start gap-0.5 transition-all duration-200 min-h-0 overflow-hidden cursor-pointer ${
                  isVacationDay
                    ? "bg-emerald-50/70 border-emerald-300"
                    : isFirstOfMonth
                    ? "bg-sky-50/70"
                    : "bg-white hover:bg-slate-50/80"
                }`}
              >
                {/* Date cell header bar */}
                <div className="flex items-center justify-between w-full min-w-0 gap-0.5">
                  <div className="flex items-center gap-1 min-w-0">
                    <span
                      className={`text-[10px] sm:text-xs font-bold font-mono px-1.5 py-0.2 rounded-full shrink-0 ${
                        isToday
                          ? "bg-sky-600 text-white font-black shadow-sm"
                          : isFirstOfMonth
                          ? "bg-sky-600 text-white font-black"
                          : "text-slate-800 font-extrabold"
                      }`}
                    >
                      {date.getDate()}
                    </span>

                    {/* Creative Month Transition Badge on Day 1 */}
                    {isFirstOfMonth && (
                      <span className="px-1.5 py-0.2 rounded-full text-[8px] sm:text-[9px] font-black uppercase tracking-wider bg-gradient-to-r from-sky-600 to-indigo-600 text-white shadow-2xs shrink-0 font-mono">
                        ✨ {monthAbbrev} {date.getFullYear()}
                      </span>
                    )}
                  </div>

                  {seq && getRonForDate(seq, date) && (
                    <span className="inline-flex items-center gap-0.5 px-1 py-0.2 text-[7.5px] sm:text-[9px] font-extrabold text-amber-900 bg-amber-100 border border-amber-300 rounded tracking-tight uppercase shrink-0 max-w-[46px] sm:max-w-none truncate">
                      <Moon className="w-2 h-2 fill-amber-500 text-amber-600 shrink-0" />
                      <span className="truncate">{getRonForDate(seq, date)}</span>
                    </span>
                  )}

                  {isDfp && !isVacationDay && !seq && filterMode !== "trips" && !isFirstOfMonth && (
                    <span className="text-[7.5px] sm:text-[9px] font-bold text-slate-600 tracking-wide uppercase px-1 py-0.2 rounded bg-slate-100 border border-slate-200 shrink-0">
                      DFP
                    </span>
                  )}
                </div>

                {/* Personal Events Container */}
                {(() => {
                  const cellSegs = streamSegmentsWithSlots.filter(
                    (s) => s.row === row && s.startCol <= col && s.endCol >= col
                  );
                  const maxSlot = cellSegs.length > 0 ? Math.max(...cellSegs.map((s) => s.slot)) : -1;
                  const topPx = isMobile ? 24 + (maxSlot + 1) * 24 : 32 + (maxSlot + 1) * 32;

                  const dateEvents = personalEvents.filter((e) => {
                    const enabledCal = subscribedCalendars.find((c) => c.id === e.calendarId);
                    if (enabledCal && !enabledCal.enabled) return false;
                    const dStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
                    return e.startDate === dStr || (e.startDate <= dStr && e.endDate >= dStr);
                  });

                  if (dateEvents.length === 0) return null;

                  const maxVisible = 1;
                  const visibleEvents = dateEvents.slice(0, maxVisible);
                  const overflowCount = dateEvents.length - maxVisible;

                  return (
                    <div
                      style={{ top: `${topPx}px` }}
                      className="absolute left-0.5 right-0.5 space-y-0.5 z-30 pointer-events-auto max-h-[44px] overflow-hidden"
                    >
                      {visibleEvents.map((evt) => {
                        let pillStyle = "bg-purple-100 border-purple-300 text-purple-950";
                        if (evt.color === "teal") pillStyle = "bg-teal-100 border-teal-300 text-teal-950";
                        else if (evt.color === "rose") pillStyle = "bg-rose-100 border-rose-300 text-rose-950";
                        else if (evt.color === "amber") pillStyle = "bg-amber-100 border-amber-300 text-amber-950";
                        else if (evt.color === "emerald") pillStyle = "bg-emerald-100 border-emerald-300 text-emerald-950";
                        else if (evt.color === "sky") pillStyle = "bg-sky-100 border-sky-300 text-sky-950";

                        return (
                          <div
                            key={evt.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedPersonalEvent(evt);
                            }}
                            className={`px-1 py-0.2 rounded border text-[8px] sm:text-[9.5px] font-bold truncate transition cursor-pointer flex items-center justify-between gap-0.5 leading-none ${pillStyle}`}
                            title={evt.title}
                          >
                            <span className="truncate">{evt.title}</span>
                            {evt.startTime && <span className="text-[7.5px] font-mono opacity-80 shrink-0">{evt.startTime}</span>}
                          </div>
                        );
                      })}

                      {overflowCount > 0 && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedDayDetail(date);
                          }}
                          className="w-full text-center text-[7.5px] font-extrabold text-sky-700 bg-sky-50 border border-sky-200 rounded py-0.2 cursor-pointer leading-none"
                        >
                          +{overflowCount} more
                        </button>
                      )}
                    </div>
                  );
                })()}
              </div>
            );
          })}

          {streamSegmentsWithSlots.map((seg, idx) => {
            const isOt = seg.isDayOt !== undefined ? seg.isDayOt : (seg.seq.isOvertime || seg.seq.statusTag === "OT");
            const isDropped = seg.seq.isDropped || seg.seq.statusTag === "DROP" || seg.seq.statusTag === "DTS DROP";
            const isVacation = seg.seq.statusTag === "VA" || !!(seg.seq as any).isVacation;
            const isMultiDay = seg.endCol - seg.startCol >= 1;

            let cardStyle = "bg-sky-600 text-white border-sky-700 shadow-sm hover:bg-sky-700";
            let subtextColor = "text-sky-100";

            if (isVacation) {
              cardStyle = "bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 text-white border-emerald-700 font-extrabold shadow-sm hover:from-emerald-700 hover:to-teal-700";
              subtextColor = "text-emerald-100";
            } else if (isDropped) {
              cardStyle = "bg-rose-100 text-rose-900 border border-dashed border-rose-400 font-bold hover:bg-rose-200";
              subtextColor = "text-rose-800";
            } else if (isOt) {
              cardStyle = "bg-gradient-to-r from-amber-500 to-amber-600 text-white border-amber-600 shadow-sm hover:from-amber-600 hover:to-amber-700 font-bold";
              subtextColor = "text-amber-100";
            }

            const isSelected = seg.seq.id === selectedSequenceId;
            const credHrs = (seg.seq.totalCreditMinutes / 60).toFixed(1);

            return (
              <div
                key={`streamseg-${idx}`}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedSequenceId(seg.seq.id);
                }}
                style={{
                  gridRow: seg.row,
                  gridColumnStart: seg.startCol,
                  gridColumnEnd: seg.endCol + 1,
                  alignSelf: "start",
                  marginTop: `${isMobile ? 22 + seg.slot * 24 : 30 + seg.slot * 32}px`,
                  height: isMobile ? "20px" : "26px",
                  zIndex: 20,
                  position: "relative",
                }}
                className={`mx-0.5 py-0.5 px-1.5 rounded-lg border text-left cursor-pointer transition duration-150 select-none flex items-center justify-between gap-1 overflow-hidden ${cardStyle} ${
                  isSelected ? "ring-2 ring-sky-300 ring-offset-1" : ""
                }`}
                title={`Sequence #${seg.seq.sequenceNumber}\nBase: ${seg.seq.base} ${seg.seq.equipment}\nCredit: ${credHrs}h\nLayovers: ${seg.seq.layoverCities.join(" → ") || "None"}`}
              >
                <div className="flex items-center gap-1 truncate min-w-0">
                  <span className="flex items-center gap-0.5 font-black text-[9px] sm:text-xs truncate">
                    <Plane className="w-3 h-3 shrink-0" />
                    <span className="truncate">{isVacation ? "VACATION" : `#${seg.seq.sequenceNumber}`}</span>
                  </span>

                  {!isVacation && (
                    <span className={`text-[8px] sm:text-[10px] font-bold font-mono ${subtextColor} hidden sm:inline truncate`}>
                      [{seg.seq.base}]
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1 text-[8px] sm:text-[10px] font-mono font-bold shrink-0">
                  {isVacation ? (
                    <span className="text-[7.5px] bg-emerald-700/80 text-white px-1 py-0.2 rounded uppercase font-black">
                      7 Days
                    </span>
                  ) : (
                    <>
                      {seg.seq.layoverCities.length > 0 && !isMobile && (
                        <span className="text-[8px] opacity-95 hidden lg:inline-flex items-center gap-0.5 bg-black/20 px-1 py-0.2 rounded">
                          <Moon className="w-2 h-2 text-amber-300" /> {seg.seq.layoverCities.join("→")}
                        </span>
                      )}
                      <span className="px-1 py-0.2 bg-black/20 rounded font-black text-[8px] sm:text-[10px]">
                        {credHrs}h
                      </span>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {renderModals()}
    </div>
  );
}
