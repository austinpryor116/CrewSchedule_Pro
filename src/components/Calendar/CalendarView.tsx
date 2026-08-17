"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useCrewStore, convertOpenToTrip } from "../../store/useCrewStore";
import { SequenceTrip, DutyPeriod } from "../../types";
import { checkOpenSequenceConflict } from "../../lib/parser";
import { PersonalCalendarEvent } from "../../types";
import { isPilotRole } from "../../lib/pilotBiddingDates";
import { Calendar as CalendarIcon, Clock, ChevronLeft, ChevronRight, ChevronDown, Info, Plane, Sun, Moon, Palmtree, Eye, EyeOff, ShoppingBag, Rss, X, Globe, Plus, Maximize2, Minimize2, SlidersHorizontal } from "lucide-react";
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
  const [streamBaseDate] = useState(() => new Date());
  const [currentDate, setCurrentDate] = useState(new Date());
  const [visibleMonth, setVisibleMonth] = useState(new Date());
  const [isMonthPickerOpen, setIsMonthPickerOpen] = useState(false);
  const [streamPastMonths, setStreamPastMonths] = useState(12);
  const [streamFutureMonths, setStreamFutureMonths] = useState(24);
  const [selectedPickerYear, setSelectedPickerYear] = useState(() => new Date().getFullYear());
  const prevScrollHeightRef = useRef<number>(0);
  const prevScrollTopRef = useRef<number>(0);
  const isExpandingTopRef = useRef<boolean>(false);
  const isProgrammaticScrollRef = useRef<boolean>(false);
  const lastExpansionTimeRef = useRef<number>(0);
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

  // Today Auto-Scroll Reference
  const todayElementRef = useRef<HTMLDivElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  const scrollToToday = (smooth = true) => {
    const today = new Date();
    isProgrammaticScrollRef.current = true;
    setTimeout(() => { isProgrammaticScrollRef.current = false; }, 600);

    if (!scrollContainerRef.current) return;
    const c = scrollContainerRef.current;

    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, "0");
    const d = String(today.getDate()).padStart(2, "0");
    const todayStr = `${y}-${m}-${d}`;

    const el = c.querySelector(`[data-cell-date="${todayStr}"]`);
    if (el) {
      const cRect = c.getBoundingClientRect();
      const elRect = el.getBoundingClientRect();
      const rTop = elRect.top - cRect.top + c.scrollTop;
      const targetScroll = Math.max(0, rTop - (c.clientHeight / 2) + (el.clientHeight / 2));
      c.scrollTo({
        top: targetScroll,
        behavior: smooth ? "smooth" : "auto",
      });
      setVisibleMonth(today);
    } else {
      scrollToMonth(today, smooth);
    }
  };

  const scrollToMonth = (targetDate: Date, smooth = false) => {
    if (viewMode !== "month" || !scrollContainerRef.current) {
      setCurrentDate(targetDate);
      setVisibleMonth(targetDate);
      return;
    }

    isProgrammaticScrollRef.current = true;
    setTimeout(() => { isProgrammaticScrollRef.current = false; }, 400);

    const targetAnchor = `${targetDate.getFullYear()}-${targetDate.getMonth()}`;
    const container = scrollContainerRef.current;
    const targetEl = container.querySelector(`[data-month-anchor="${targetAnchor}"]`);

    if (targetEl) {
      const cRect = container.getBoundingClientRect();
      const elRect = targetEl.getBoundingClientRect();
      const rTop = elRect.top - cRect.top + container.scrollTop;
      container.scrollTo({
        top: Math.max(0, rTop - 4),
        behavior: smooth ? "smooth" : "auto",
      });
      setVisibleMonth(targetDate);
    } else {
      // If outside current loaded buffer, expand buffer
      const baseMonths = streamBaseDate.getFullYear() * 12 + streamBaseDate.getMonth();
      const targetMonths = targetDate.getFullYear() * 12 + targetDate.getMonth();
      const diff = targetMonths - baseMonths;
      if (diff < -streamPastMonths) {
        setStreamPastMonths(Math.abs(diff) + 12);
      } else if (diff > streamFutureMonths) {
        setStreamFutureMonths(diff + 18);
      }
      setVisibleMonth(targetDate);
      requestAnimationFrame(() => {
        setTimeout(() => {
          if (!scrollContainerRef.current) return;
          const c = scrollContainerRef.current;
          const newEl = c.querySelector(`[data-month-anchor="${targetAnchor}"]`);
          if (newEl) {
            const cRect = c.getBoundingClientRect();
            const nRect = newEl.getBoundingClientRect();
            const rTop = nRect.top - cRect.top + c.scrollTop;
            c.scrollTo({
              top: Math.max(0, rTop - 4),
              behavior: "auto",
            });
          }
        }, 80);
      });
    }
  };

  useEffect(() => {
    // Immediate alignment on mount without animation or window displacement
    const timer = setTimeout(() => {
      scrollToToday(false);
    }, 60);
    return () => clearTimeout(timer);
  }, []);

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
  const userProfile = useCrewStore((state) => state.userProfile);
  const isUserPilot = isPilotRole(userProfile?.crewRole);

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
          const target = new Date(yearNum, monthIdx, 20);
          setCurrentDate(target);
          setVisibleMonth(target);
        }
      }
    }
  }, [monthlyHIMetadata]);

  // Synchronize visible month dynamically and trigger infinite bi-directional expansion
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container || viewMode !== "month") return;

    let animationFrameId: number | null = null;

    const handleScroll = () => {
      if (animationFrameId !== null) return;
      animationFrameId = requestAnimationFrame(() => {
        animationFrameId = null;
        if (!scrollContainerRef.current) return;
        const c = scrollContainerRef.current;
        const cRect = c.getBoundingClientRect();

        // 1. Check if user is scrolling near the top to load more past months
        if (!isProgrammaticScrollRef.current) {
          const now = Date.now();
          if (now - lastExpansionTimeRef.current > 1500) {
            if (c.scrollTop < 100 && !isExpandingTopRef.current && c.scrollTop >= 0 && c.scrollHeight > c.clientHeight) {
              lastExpansionTimeRef.current = now;
              isExpandingTopRef.current = true;
              prevScrollHeightRef.current = c.scrollHeight;
              prevScrollTopRef.current = c.scrollTop;
              setStreamPastMonths((prev) => prev + 12);
            } else if (c.scrollTop + c.clientHeight > c.scrollHeight - 250) {
              lastExpansionTimeRef.current = now;
              setStreamFutureMonths((prev) => prev + 12);
            }
          }
        }

        // 3. Probe cell near the vertical center of the visible viewport (dominant visible week)
        const probeY = cRect.top + c.clientHeight * 0.45;
        const probeX = cRect.left + c.clientWidth / 2;

        const el = document.elementFromPoint(probeX, probeY);
        if (el) {
          const cell = el.closest("[data-cell-date]");
          if (cell) {
            const dateAttr = cell.getAttribute("data-cell-date");
            if (dateAttr) {
              const [yStr, mStr] = dateAttr.split("-");
              const yNum = parseInt(yStr, 10);
              const mNum = parseInt(mStr, 10) - 1;
              if (!isNaN(yNum) && !isNaN(mNum)) {
                setVisibleMonth((prev) => {
                  if (prev.getFullYear() === yNum && prev.getMonth() === mNum) {
                    return prev;
                  }
                  return new Date(yNum, mNum, 1);
                });
              }
            }
          }
        }
      });
    };

    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      container.removeEventListener("scroll", handleScroll);
      if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [viewMode]);

  // Continuous Infinite Stream Calendar Days across multiple years (starts with 12 prior months, 24 future months, dynamically expands)
  const streamDays = useMemo(() => {
    const baseYear = streamBaseDate.getFullYear();
    const baseMonth = streamBaseDate.getMonth();

    // Start streamPastMonths prior, aligned to Sunday
    const firstDay = new Date(baseYear, baseMonth - streamPastMonths, 1);
    const startDay = new Date(firstDay);
    startDay.setDate(startDay.getDate() - startDay.getDay());

    // End streamFutureMonths ahead, aligned to Saturday
    const lastDay = new Date(baseYear, baseMonth + streamFutureMonths + 1, 0);
    const endDay = new Date(lastDay);
    endDay.setDate(endDay.getDate() + (6 - endDay.getDay()));

    const days: Date[] = [];
    const curr = new Date(startDay);
    while (curr <= endDay) {
      days.push(new Date(curr));
      curr.setDate(curr.getDate() + 1);
    }
    return days;
  }, [streamBaseDate, streamPastMonths, streamFutureMonths]);

  // Seamlessly adjust scroll position when prepending past months to prevent UI jumping
  useEffect(() => {
    if (isExpandingTopRef.current && scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const heightDiff = container.scrollHeight - prevScrollHeightRef.current;
      if (heightDiff > 0) {
        container.scrollTop = prevScrollTopRef.current + heightDiff;
      }
      isExpandingTopRef.current = false;
    }
  }, [streamDays]);

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

  // Helper: get all sequences matching a date (e.g. multiple turns or overlapping trades)
  const getSequencesForDate = (date: Date): SequenceTrip[] => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    const dateStr = `${y}-${m}-${d}`;
    return sequences.filter((seq) => {
      return dateStr >= seq.startDate && dateStr <= seq.endDate;
    });
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

  // Helper: get specific day's duty period and RON info
  const getDayDutyInfo = (seq: SequenceTrip | null, date: Date) => {
    if (!seq) return null;
    const dp = getDutyPeriodForDate(seq, date);
    const ronCity = getRonForDate(seq, date);
    
    let legsSummary = "";
    if (dp && dp.legs && dp.legs.length > 0) {
      if (dp.legs.length === 1) {
        legsSummary = `${dp.legs[0].depAirport}→${dp.legs[0].arrAirport}`;
      } else {
        const first = dp.legs[0].depAirport;
        const last = dp.legs[dp.legs.length - 1].arrAirport;
        legsSummary = `${first}→${last}`;
      }
    }
    
    return { dp, ronCity, legsSummary };
  };

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
    const days = streamDays;
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

      // Sort:
      // 1. Vacation blocks ALWAYS take top priority (slot 0) across all vacation days
      // 2. Regular active flights / OT add-ons
      // 3. Dropped trips (e.g. dropped due to vacation) ALWAYS go below vacation and active trips
      rowSegs.sort((a, b) => {
        const aIsVac = !!(a.seq.isVacation || a.seq.statusTag === "VA");
        const bIsVac = !!(b.seq.isVacation || b.seq.statusTag === "VA");
        if (aIsVac && !bIsVac) return -1;
        if (!aIsVac && bIsVac) return 1;

        const aIsDrop = !!(a.seq.isDropped || a.seq.statusTag === "DROP" || a.seq.statusTag === "DTS DROP");
        const bIsDrop = !!(b.seq.isDropped || b.seq.statusTag === "DROP" || b.seq.statusTag === "DTS DROP");
        if (aIsDrop && !bIsDrop) return 1;
        if (!aIsDrop && bIsDrop) return -1;

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
    streamDays,
    rawSequences,
    stationTurnLimits,
    defaultTurnLimit,
  ]);

  // Memoize multi-day personal calendar events segments
  const multiDayPersonalEventSegments = useMemo(() => {
    const days = streamDays;
    const segments: {
      evt: PersonalCalendarEvent;
      row: number;
      startCol: number;
      endCol: number;
      isRealStart?: boolean;
      isRealEnd?: boolean;
    }[] = [];

    const multiDayEvents = personalEvents.filter((e) => {
      if ((e.isPilotOnly || e.targetRole === "pilot" || e.category === "pilot_bidding") && !isUserPilot) {
        return false;
      }
      const enabledCal = subscribedCalendars.find((c) => c.id === e.calendarId);
      if (enabledCal && !enabledCal.enabled) return false;
      return e.startDate && e.endDate && e.startDate !== e.endDate;
    });

    multiDayEvents.forEach((evt) => {
      const startObj = parseLocalDateString(evt.startDate);
      const endObj = parseLocalDateString(evt.endDate);

      let startIdx = days.findIndex(
        (d) =>
          d.getFullYear() === startObj.getFullYear() &&
          d.getMonth() === startObj.getMonth() &&
          d.getDate() === startObj.getDate()
      );
      let endIdx = days.findIndex(
        (d) =>
          d.getFullYear() === endObj.getFullYear() &&
          d.getMonth() === endObj.getMonth() &&
          d.getDate() === endObj.getDate()
      );

      if (startIdx === -1 && endIdx === -1) return;

      if (startIdx === -1) {
        if (startObj < days[0]) startIdx = 0;
        else return;
      }

      if (endIdx === -1) {
        if (endObj > days[days.length - 1]) endIdx = days.length - 1;
        else return;
      }

      let currentStart = startIdx;
      while (currentStart <= endIdx) {
        const row = Math.floor(currentStart / 7) + 1;
        const startCol = (currentStart % 7) + 1;
        const endOfWeekIdx = Math.floor(currentStart / 7) * 7 + 6;
        const currentEnd = Math.min(endOfWeekIdx, endIdx);
        const endCol = (currentEnd % 7) + 1;

        segments.push({
          evt,
          row,
          startCol,
          endCol,
          isRealStart: currentStart === startIdx,
          isRealEnd: currentEnd === endIdx,
        });

        currentStart = currentEnd + 1;
      }
    });

    const rowSegments: Record<number, typeof segments> = {};
    segments.forEach((seg) => {
      if (!rowSegments[seg.row]) rowSegments[seg.row] = [];
      rowSegments[seg.row].push(seg);
    });

    interface MultiDayPersonalEventSegment {
      evt: PersonalCalendarEvent;
      row: number;
      startCol: number;
      endCol: number;
      slot: number;
      isRealStart?: boolean;
      isRealEnd?: boolean;
    }

    const segmentsWithSlots: MultiDayPersonalEventSegment[] = [];

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
          if (!occupied) break;
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
  }, [personalEvents, subscribedCalendars, streamDays]);

  const rowActivityMap = useMemo(() => {
    const map: Record<number, { maxSeqSlot: number; maxMultiDaySlot: number; maxSingleEventCount: number }> = {};
    
    sequenceSegments.forEach((seg) => {
      if (!map[seg.row]) map[seg.row] = { maxSeqSlot: -1, maxMultiDaySlot: -1, maxSingleEventCount: 0 };
      map[seg.row].maxSeqSlot = Math.max(map[seg.row].maxSeqSlot, seg.slot);
    });

    multiDayPersonalEventSegments.forEach((seg) => {
      if (!map[seg.row]) map[seg.row] = { maxSeqSlot: -1, maxMultiDaySlot: -1, maxSingleEventCount: 0 };
      map[seg.row].maxMultiDaySlot = Math.max(map[seg.row].maxMultiDaySlot, seg.slot);
    });

    streamDays.forEach((date, idx) => {
      const row = Math.floor(idx / 7) + 1;
      if (!map[row]) map[row] = { maxSeqSlot: -1, maxMultiDaySlot: -1, maxSingleEventCount: 0 };

      const dStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
      const count = personalEvents.filter((e) => {
        const enabledCal = subscribedCalendars.find((c) => c.id === e.calendarId);
        if (enabledCal && !enabledCal.enabled) return false;
        // Only count single-day events inside the day box
        if (e.startDate && e.endDate && e.startDate !== e.endDate) return false;
        return e.startDate === dStr;
      }).length;

      map[row].maxSingleEventCount = Math.max(map[row].maxSingleEventCount, count);
    });

    return map;
  }, [sequenceSegments, multiDayPersonalEventSegments, streamDays, personalEvents, subscribedCalendars]);

  // Navigation handlers
  const handlePrevMonth = () => {
    if (viewMode === "week") {
      const next = new Date(currentDate);
      next.setDate(next.getDate() - 7);
      setCurrentDate(next);
      setVisibleMonth(next);
    } else {
      const target = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() - 1, 1);
      scrollToMonth(target, true);
    }
  };

  const handleNextMonth = () => {
    if (viewMode === "week") {
      const next = new Date(currentDate);
      next.setDate(next.getDate() + 7);
      setCurrentDate(next);
      setVisibleMonth(next);
    } else {
      const target = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 1);
      scrollToMonth(target, true);
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
      const date = streamDays[dayIdx];
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

  const displayMonthDate = viewMode === "month" ? visibleMonth : currentDate;
  const monthName = displayMonthDate.toLocaleString("default", { month: "long" });
  const activeYear = displayMonthDate.getFullYear();

  const renderGridContent = () => (
    <>
      {/* View Grid */}
      {viewMode === "month" ? (
        /* Month Grid View (Continuous Timeline Stream across months) */
        <div className="bg-white border border-slate-200 rounded-2xl shadow-xs min-h-full flex flex-col">
          {/* Days */}
          {(() => {
            const totalRows = Math.ceil(streamDays.length / 7);
            const gridTemplateRows = Array.from({ length: totalRows }, (_, r) => {
              const rowNum = r + 1;
              const activity = rowActivityMap[rowNum] || { maxSeqSlot: -1, maxMultiDaySlot: -1, maxSingleEventCount: 0 };
              const seqSlotCount = Math.max(0, activity.maxSeqSlot + 1);
              const multiSlotCount = Math.max(0, activity.maxMultiDaySlot + 1);
              const seqSlotPx = isMobile ? 28 : 34;
              const multiSlotPx = isMobile ? 24 : 28;
              const basePx = isMobile ? 36 : 42;
              const evtPx = Math.min(activity.maxSingleEventCount, 4) * (isMobile ? 24 : 28);
              const contentMinHeight = basePx + seqSlotCount * seqSlotPx + multiSlotCount * multiSlotPx + evtPx + 36;
              const viewportWeekHeight = isMobile ? "calc((100vh - 128px) / 3.4)" : "calc((100vh - 140px) / 3.4)";
              return `minmax(max(${contentMinHeight}px, ${viewportWeekHeight}), 1fr)`;
            }).join(" ");

            return (
              <div className="grid grid-cols-7 bg-slate-50 min-h-full rounded-2xl overflow-hidden" style={{ gridTemplateRows }}>
                {streamDays.map((date, idx) => {
                  const daySeqs = getSequencesForDate(date);
                  const seq = daySeqs[0] || null;
                  const extraTripsCount = Math.max(0, daySeqs.length - 1);
                  const isCurrentMonth = date.getMonth() === currentDate.getMonth();
                  const isToday = new Date().toDateString() === date.toDateString();
                  const dutyInfo = getDayDutyInfo(seq, date);
                  const ronCity = dutyInfo?.ronCity;
                  
                  // Apply filters
                  let hide = false;
                  if (filterMode === "trips" && !seq) hide = true;
                  if (filterMode === "off" && seq) hide = true;
                  if (filterMode === "high-credit" && (!seq || !daySeqs.some(isHighCredit))) hide = true;

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

                  const isFirstOfMonth = date.getDate() === 1;
                  const isMonthStartInStream = idx === 0 || streamDays[idx - 1].getMonth() !== date.getMonth();
                  const monthAnchorKey = `${date.getFullYear()}-${date.getMonth()}`;
                  const monthAbbrev = date.toLocaleString("default", { month: "short" }).toUpperCase();

                  return (
                    <div
                      key={idx}
                      ref={isToday ? todayElementRef : undefined}
                      data-cell-date={`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`}
                      {...(isFirstOfMonth || isMonthStartInStream ? { "data-month-anchor": monthAnchorKey } : {})}
                      style={{
                        gridRow: row,
                        gridColumn: col,
                      }}
                      onClick={() => setSelectedDayDetail(date)}
                      className={`relative p-1 sm:p-2 border-r border-b border-slate-200 flex flex-col justify-between transition-all duration-200 min-h-0 overflow-hidden cursor-pointer ${
                        isVacationDay
                          ? "bg-emerald-50/70 border-emerald-300"
                          : isToday
                          ? "bg-sky-50/40"
                          : "bg-white hover:bg-slate-50/80"
                      } ${hide ? "opacity-10" : ""}`}
                    >
                      {/* 1. Date cell header bar */}
                      <div className="flex items-center justify-between w-full min-w-0 z-10">
                        <div className="flex items-center gap-1 min-w-0">
                          {isFirstOfMonth ? (
                            <div className="flex items-baseline gap-1 min-w-0">
                              <span
                                className={`text-[10px] sm:text-xs font-black font-mono px-1.5 py-0.5 rounded-full shrink-0 ${
                                  isToday
                                    ? "bg-sky-600 text-white shadow-xs ring-2 ring-sky-300"
                                    : "text-sky-700 font-extrabold bg-sky-50 border border-sky-200"
                                }`}
                              >
                                {date.getDate()}
                              </span>
                              <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-sky-700 font-sans">
                                {monthAbbrev}
                              </span>
                            </div>
                          ) : (
                            <span
                              className={`text-[10px] sm:text-xs font-bold font-mono px-1.5 py-0.5 rounded-full shrink-0 ${
                                isToday
                                    ? "bg-sky-600 text-white font-black shadow-xs ring-2 ring-sky-300"
                                    : "text-slate-800 font-extrabold"
                              }`}
                            >
                              {date.getDate()}
                            </span>
                          )}
                          {extraTripsCount > 0 && (
                            <span className="text-[8px] font-black text-indigo-800 bg-indigo-100 border border-indigo-300 px-1 py-0.2 rounded font-mono shadow-2xs">
                              +{extraTripsCount}
                            </span>
                          )}
                        </div>

                        {isVacationDay ? (
                          <span className="text-[8px] sm:text-[9px] font-black text-emerald-800 bg-emerald-100 border border-emerald-300 px-1 py-0.5 rounded uppercase tracking-wider shrink-0 font-mono">
                            VA
                          </span>
                        ) : isDfp && !seq && filterMode !== "trips" && !isFirstOfMonth ? (
                          <span className="text-[8px] sm:text-[9px] font-extrabold text-slate-400 bg-slate-100 border border-slate-200 px-1 py-0.5 rounded uppercase tracking-wider shrink-0 font-mono">
                            OFF
                          </span>
                        ) : null}
                      </div>

                      {/* 2. Bottom Layover / RON and Flight Leg Summary */}
                      <div className="mt-auto w-full pt-1 flex items-center justify-between gap-1 overflow-hidden pointer-events-none z-10">
                        {ronCity ? (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[8px] sm:text-[9.5px] font-black text-amber-950 bg-amber-100/90 border border-amber-300 rounded-md shadow-2xs truncate">
                            <Moon className="w-2.5 h-2.5 fill-amber-500 text-amber-600 shrink-0" />
                            <span className="truncate font-mono font-black">{ronCity}</span>
                          </span>
                        ) : dutyInfo?.legsSummary ? (
                          <span className="text-[7.5px] sm:text-[9px] font-mono font-bold text-slate-500 truncate bg-slate-100/90 px-1 py-0.5 rounded border border-slate-200 ml-auto">
                            {dutyInfo.legsSummary}
                          </span>
                        ) : null}
                      </div>

                      {/* 3. Personal Events Container (Single-Day Events) */}
                      {(() => {
                        const cellSeqSegs = sequenceSegments.filter(
                          (s) => s.row === row && s.startCol <= col && s.endCol >= col
                        );
                        const maxSeqSlotInCell = cellSeqSegs.length > 0 ? Math.max(...cellSeqSegs.map((s) => s.slot)) : -1;

                        const rowSeqSegs = sequenceSegments.filter((s) => s.row === row);
                        const maxSeqSlotInRow = rowSeqSegs.length > 0 ? Math.max(...rowSeqSegs.map((s) => s.slot)) : -1;

                        const cellMultiSegs = multiDayPersonalEventSegments.filter(
                          (s) => s.row === row && s.startCol <= col && s.endCol >= col
                        );
                        const maxMultiSlotInCell = cellMultiSegs.length > 0 ? Math.max(...cellMultiSegs.map((s) => s.slot)) : -1;

                        const seqSlotHeight = isMobile ? 26 : 32;
                        const multiSlotHeight = isMobile ? 22 : 26;
                        const baseHeaderHeight = isMobile ? 28 : 34;

                        let topPx = baseHeaderHeight + 4;
                        if (maxMultiSlotInCell >= 0) {
                          // Multi-day ribbons in this row sit below the row's sequences
                          const rowSeqHeight = maxSeqSlotInRow >= 0 ? (maxSeqSlotInRow + 1) * seqSlotHeight : 0;
                          topPx = baseHeaderHeight + rowSeqHeight + (maxMultiSlotInCell + 1) * multiSlotHeight + 4;
                        } else if (maxSeqSlotInCell >= 0) {
                          // If no multi-day event in this cell, sit cleanly below the cell's sequence
                          topPx = baseHeaderHeight + (maxSeqSlotInCell + 1) * seqSlotHeight + 4;
                        }

                        const dateEvents = personalEvents.filter((e) => {
                          if ((e.isPilotOnly || e.targetRole === "pilot" || e.category === "pilot_bidding") && !isUserPilot) {
                            return false;
                          }
                          const enabledCal = subscribedCalendars.find((c) => c.id === e.calendarId);
                          if (enabledCal && !enabledCal.enabled) return false;
                          // If it's a multi-day event, it's already rendered as a continuous spanning ribbon across the grid
                          if (e.startDate && e.endDate && e.startDate !== e.endDate) return false;
                          const dStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
                          return e.startDate === dStr;
                        });

                        if (dateEvents.length === 0) return null;

                        const maxVisible = maxSeqSlotInCell >= 0 || maxMultiSlotInCell >= 0 ? 3 : 5;
                        const visibleEvents = dateEvents.slice(0, maxVisible);
                        const overflowCount = dateEvents.length - maxVisible;

                        const formatCompactTime = (timeStr?: string) => {
                          if (!timeStr) return "";
                          const clean = timeStr.trim();
                          const ampmMatch = clean.match(/^(\d{1,2}):?(\d{2})?\s*([AP]M)?$/i);
                          if (ampmMatch) {
                            let hour = parseInt(ampmMatch[1], 10);
                            const mins = ampmMatch[2] || "00";
                            let period = (ampmMatch[3] || "").toLowerCase();
                            if (!period && hour >= 12) {
                              if (hour > 12) hour -= 12;
                              period = "p";
                            } else if (!period && hour < 12) {
                              if (hour === 0) hour = 12;
                              period = "a";
                            } else if (period) {
                              period = period[0];
                            }
                            const minStr = mins === "00" ? "" : `:${mins}`;
                            return `${hour}${minStr}${period}`;
                          }
                          return clean.slice(0, 5);
                        };

                        return (
                          <div
                            style={{ top: `${topPx}px` }}
                            className="absolute left-0.5 right-0.5 space-y-1 z-30 pointer-events-auto overflow-hidden pb-1"
                          >
                            {visibleEvents.map((evt) => {
                              let pillStyle = "bg-purple-100/95 border-purple-300 text-purple-950 hover:bg-purple-200 shadow-2xs";
                              if (evt.color === "indigo") pillStyle = "bg-indigo-100/95 border-indigo-300 text-indigo-950 shadow-2xs";
                              else if (evt.color === "teal") pillStyle = "bg-teal-100/95 border-teal-300 text-teal-950 shadow-2xs";
                              else if (evt.color === "rose") pillStyle = "bg-rose-100/95 border-rose-300 text-rose-950 shadow-2xs";
                              else if (evt.color === "amber") pillStyle = "bg-amber-100/95 border-amber-300 text-amber-950 shadow-2xs";
                              else if (evt.color === "emerald") pillStyle = "bg-emerald-100/95 border-emerald-300 text-emerald-950 shadow-2xs";
                              else if (evt.color === "sky") pillStyle = "bg-sky-100/95 border-sky-300 text-sky-950 shadow-2xs";

                              const cTime = formatCompactTime(evt.startTime);

                              return (
                                <div
                                  key={evt.id}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedPersonalEvent(evt);
                                  }}
                                  className={`px-1 py-0.5 rounded-md border text-[8px] sm:text-[9.5px] font-bold cursor-pointer leading-[1.15] active-press shadow-2xs ${pillStyle}`}
                                  title={`${evt.title}${evt.startTime ? ` (${evt.startTime})` : ""}`}
                                >
                                  <div className="line-clamp-2 break-words">
                                    {cTime && (
                                      <span className="font-mono font-black opacity-80 text-[7px] sm:text-[8.5px] mr-0.5 inline-block bg-black/10 px-0.5 rounded">
                                        {cTime}
                                      </span>
                                    )}
                                    <span>{evt.title}</span>
                                  </div>
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
                                className="w-full text-center text-[7.5px] font-extrabold text-sky-700 bg-sky-50 border border-sky-200 rounded py-0.5 cursor-pointer leading-none active-press"
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

                {/* Sequence Trip Bars */}
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

                    let cardStyle = "bg-sky-600 text-white border-sky-700 shadow-sm hover:bg-sky-700 font-bold";
                    let subtextColor = "text-sky-100";

                    if (isVacation) {
                      cardStyle = "bg-emerald-600 text-white border-emerald-700 shadow-sm hover:bg-emerald-700 font-bold";
                      subtextColor = "text-emerald-200";
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
                          marginTop: `${isMobile ? 28 + seg.slot * 26 : 34 + seg.slot * 32}px`,
                          height: isMobile ? "22px" : "26px",
                          zIndex: 20,
                          position: "relative",
                        }}
                        className={`mx-0.5 py-0.5 px-1.5 rounded-lg border text-left cursor-pointer transition duration-150 select-none flex items-center justify-between gap-1 overflow-hidden ${cardStyle} ${
                          isSelected ? "ring-2 ring-sky-300 ring-offset-1" : ""
                        }`}
                        title={isVacation ? `Vacation Block\nDuration: 7 Days\nCredit: ${credHrs}h` : `Sequence #${seg.seq.sequenceNumber}\nBase: ${seg.seq.base} ${seg.seq.equipment}\nCredit: ${credHrs}h\nLayovers: ${seg.seq.layoverCities.join(" → ") || "None"}`}
                      >
                        <div className="flex items-center gap-1 truncate min-w-0">
                          <span className="flex items-center gap-0.5 font-black text-[9px] sm:text-xs truncate">
                            {isVacation ? <Palmtree className="w-3 h-3 shrink-0 text-emerald-200" /> : <Plane className="w-3 h-3 shrink-0" />}
                            <span className="truncate">
                              {isVacation ? "VACATION" : isDropped ? `DROP #${seg.seq.sequenceNumber}` : `#${seg.seq.sequenceNumber}`}
                            </span>
                          </span>

                          <span className={`text-[8px] sm:text-[10px] font-bold font-mono ${subtextColor} hidden sm:inline truncate`}>
                            [{isVacation ? "VA" : seg.seq.base}]
                          </span>
                        </div>

                        <div className="flex items-center gap-1 text-[8px] sm:text-[10px] font-mono font-bold shrink-0">
                          {seg.seq.layoverCities.length > 0 && !isMobile && !isVacation && (
                            <span className="text-[8px] opacity-95 hidden lg:inline-flex items-center gap-0.5 bg-black/20 px-1 py-0.2 rounded">
                              <Moon className="w-2 h-2 text-amber-300" /> {seg.seq.layoverCities.join("→")}
                            </span>
                          )}
                          <span className="px-1 py-0.2 bg-black/20 rounded font-black text-[8px] sm:text-[10px]">
                            {credHrs}h
                          </span>
                        </div>
                      </div>
                    );
                  })}

                {/* Multi-Day Personal Calendar Event Spanning Ribbons */}
                {multiDayPersonalEventSegments.map((seg, idx) => {
                  let pillStyle = "bg-purple-100/95 border-purple-300 text-purple-950 hover:bg-purple-200 shadow-2xs";
                  if (seg.evt.color === "indigo") pillStyle = "bg-indigo-100/95 border-indigo-300 text-indigo-950 hover:bg-indigo-200 shadow-2xs";
                  else if (seg.evt.color === "teal") pillStyle = "bg-teal-100/95 border-teal-300 text-teal-950 hover:bg-teal-200 shadow-2xs";
                  else if (seg.evt.color === "rose") pillStyle = "bg-rose-100/95 border-rose-300 text-rose-950 hover:bg-rose-200 shadow-2xs";
                  else if (seg.evt.color === "amber") pillStyle = "bg-amber-100/95 border-amber-300 text-amber-950 hover:bg-amber-200 shadow-2xs";
                  else if (seg.evt.color === "emerald") pillStyle = "bg-emerald-100/95 border-emerald-300 text-emerald-950 hover:bg-emerald-200 shadow-2xs";
                  else if (seg.evt.color === "sky") pillStyle = "bg-sky-100/95 border-sky-300 text-sky-950 hover:bg-sky-200 shadow-2xs";

                  const rowSeqSegs = sequenceSegments.filter((s) => s.row === seg.row);
                  const maxSeqSlotInRow = rowSeqSegs.length > 0 ? Math.max(...rowSeqSegs.map((s) => s.slot)) : -1;
                  const seqHeight = maxSeqSlotInRow >= 0 ? (maxSeqSlotInRow + 1) * (isMobile ? 26 : 32) : 0;
                  const topPx = (isMobile ? 28 : 34) + seqHeight + seg.slot * (isMobile ? 22 : 26);

                      const roundedClass = `${seg.isRealStart ? "rounded-l-md ml-0.5" : "rounded-l-none border-l-0 ml-0"} ${seg.isRealEnd ? "rounded-r-md mr-0.5" : "rounded-r-none border-r-0 mr-0"}`;

                      return (
                        <div
                          key={`multi-evt-${idx}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedPersonalEvent(seg.evt);
                          }}
                          style={{
                            gridRow: seg.row,
                            gridColumnStart: seg.startCol,
                            gridColumnEnd: seg.endCol + 1,
                            alignSelf: "start",
                            marginTop: `${topPx}px`,
                            height: isMobile ? "20px" : "24px",
                            zIndex: 22,
                            position: "relative",
                          }}
                          className={`py-0.5 px-1.5 border text-left cursor-pointer transition duration-150 select-none flex items-center justify-between gap-1 overflow-hidden font-bold active-press ${roundedClass} ${pillStyle}`}
                          title={`${seg.evt.title} (${seg.evt.startDate} to ${seg.evt.endDate})`}
                        >
                          <div className="flex items-center gap-1 truncate min-w-0">
                            {seg.evt.category === "pilot_bidding" || seg.evt.isPilotOnly ? (
                              <span className="text-[9px] shrink-0">✈️</span>
                            ) : (
                              <CalendarIcon className="w-2.5 h-2.5 shrink-0 opacity-85" />
                            )}
                            <span className="truncate text-[8.5px] sm:text-[10px] font-black">{seg.evt.title}</span>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            {seg.evt.location && (
                              <span className="text-[7.5px] sm:text-[9px] opacity-85 truncate hidden sm:inline font-mono">
                                📍 {seg.evt.location}
                              </span>
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
                        {(() => {
                          const dayLegsBlock = dutyPeriod?.legs ? dutyPeriod.legs.reduce((acc, l) => acc + (l.blockMinutes || 0), 0) : 0;
                          const dayCreditMins = dutyPeriod?.payCreditMinutes !== undefined && dutyPeriod.payCreditMinutes > 0
                            ? dutyPeriod.payCreditMinutes
                            : (dayLegsBlock > 0 ? dayLegsBlock : Math.round(seq.totalCreditMinutes / Math.max(1, seq.dutyPeriods?.length || 1)));

                          return (
                            <p className="text-xs text-slate-700 mt-0.5 flex items-center gap-2 font-medium flex-wrap">
                              <Clock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                              <span>Day credit: {Math.floor(dayCreditMins / 60)}h {dayCreditMins % 60}m</span>
                              {seq.dutyPeriods && seq.dutyPeriods.length > 1 && (
                                <span className="text-[10px] text-slate-400 font-mono font-semibold">(Trip Total: {Math.floor(seq.totalCreditMinutes / 60)}h {seq.totalCreditMinutes % 60}m)</span>
                              )}
                            </p>
                          );
                        })()}
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
            className="bg-white rounded-t-3xl sm:rounded-3xl border-t sm:border border-slate-200 shadow-2xl max-w-xl w-full max-h-[92vh] sm:max-h-[85vh] overflow-hidden flex flex-col animate-slideUp"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Sticky Header that NEVER scrolls off screen */}
            <div className="px-4 sm:px-5 py-3.5 border-b border-slate-200 flex items-center justify-between bg-white/95 backdrop-blur-xl shrink-0">
              <span className="text-xs sm:text-sm font-black uppercase text-slate-800 tracking-wider flex items-center gap-2">
                <Plane className="w-4 h-4 text-sky-600" />
                Trip Inspector & Legality
              </span>
              <button
                onClick={() => setSelectedSequenceId(null)}
                className="px-3 py-1.5 text-xs font-black text-slate-700 hover:text-slate-900 rounded-xl bg-slate-100 hover:bg-slate-200 transition cursor-pointer active-press flex items-center gap-1"
                title="Close Inspector"
              >
                <X className="w-3.5 h-3.5" />
                <span>Done</span>
              </button>
            </div>
            <div className="p-3 sm:p-5 overflow-y-auto scrollbar-thin flex-1 pb-[max(1.5rem,calc(env(safe-area-inset-bottom,0px)+1rem))]">
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

      {/* Month Quick-Jump Picker Modal */}
      {isMonthPickerOpen && (
        <div
          className="fixed inset-0 z-[100000] bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn"
          onClick={() => setIsMonthPickerOpen(false)}
        >
          <div
            className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-sm w-full p-5 space-y-4 animate-scaleUp"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-sky-600" />
                <h3 className="text-sm font-black text-slate-900">Jump to Month</h3>
              </div>
              <button
                onClick={() => setIsMonthPickerOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              {/* Year Switcher Header */}
              <div className="flex items-center justify-between bg-slate-100 p-1 rounded-2xl border border-slate-200">
                <button
                  onClick={() => setSelectedPickerYear((prev) => prev - 1)}
                  className="p-1.5 hover:bg-white text-slate-700 hover:text-slate-900 rounded-xl transition cursor-pointer active-press"
                  title="Previous Year"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs font-black font-mono text-slate-900 tracking-wide">
                  {selectedPickerYear} Schedule
                </span>
                <button
                  onClick={() => setSelectedPickerYear((prev) => prev + 1)}
                  className="p-1.5 hover:bg-white text-slate-700 hover:text-slate-900 rounded-xl transition cursor-pointer active-press"
                  title="Next Year"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* 12-Month Selector Grid */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { name: "Jan", m: 0 },
                  { name: "Feb", m: 1 },
                  { name: "Mar", m: 2 },
                  { name: "Apr", m: 3 },
                  { name: "May", m: 4 },
                  { name: "Jun", m: 5 },
                  { name: "Jul", m: 6 },
                  { name: "Aug", m: 7 },
                  { name: "Sep", m: 8 },
                  { name: "Oct", m: 9 },
                  { name: "Nov", m: 10 },
                  { name: "Dec", m: 11 },
                ].map((item) => {
                  const isSelected = displayMonthDate.getFullYear() === selectedPickerYear && displayMonthDate.getMonth() === item.m;
                  return (
                    <button
                      key={`${selectedPickerYear}-${item.m}`}
                      onClick={() => {
                        scrollToMonth(new Date(selectedPickerYear, item.m, 1), true);
                        setIsMonthPickerOpen(false);
                      }}
                      className={`py-2.5 px-3 rounded-xl text-xs font-bold transition cursor-pointer active-press border ${
                        isSelected
                          ? "bg-sky-600 text-white border-sky-600 shadow-sm"
                          : "bg-slate-50 hover:bg-slate-100 text-slate-800 border-slate-200"
                      }`}
                    >
                      {item.name}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
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
              <button
                onClick={() => setIsMonthPickerOpen(true)}
                className="flex items-center gap-1 text-xs font-bold font-mono px-2 py-1 text-slate-800 hover:bg-white rounded-lg transition cursor-pointer"
                title="Jump to Month"
              >
                <span>{viewMode === "month" ? `${monthName} ${activeYear}` : `Week of ${weekDays[0].toLocaleDateString("en-US", { month: "short", day: "numeric" })}`}</span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>
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

  return (
    <div className="w-full h-full flex flex-col bg-[#f8fafc] overflow-hidden font-sans text-slate-900 relative">
      {/* 1. Mobile & Desktop Top Calendar Header Bar */}
      <div className="flex items-center justify-between px-3 pt-[max(2.5rem,calc(env(safe-area-inset-top,0px)+0.5rem))] pb-2 bg-white/95 border-b border-slate-200 shadow-xs backdrop-blur-md shrink-0 z-40">
        {/* Month Navigation */}
        <div className="flex items-center gap-1">
          <button
            onClick={handlePrevMonth}
            className="p-1.5 hover:bg-slate-100 text-slate-700 hover:text-slate-900 rounded-xl transition cursor-pointer active-press"
            title="Previous Month"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <button
            onClick={() => setIsMonthPickerOpen(true)}
            className="flex items-center gap-1 text-xs sm:text-sm font-black font-mono px-2 py-1 rounded-xl text-slate-900 hover:bg-slate-100 transition cursor-pointer active-press"
            title="Jump to Month"
          >
            <span>
              {viewMode === "month"
                ? `${monthName} ${activeYear}`
                : `Week of ${weekDays[0].toLocaleDateString("en-US", { month: "short", day: "numeric" })}`}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          <button
            onClick={handleNextMonth}
            className="p-1.5 hover:bg-slate-100 text-slate-700 hover:text-slate-900 rounded-xl transition cursor-pointer active-press"
            title="Next Month"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-1.5">
          {/* Today Button */}
          <button
            onClick={() => scrollToToday(true)}
            className="px-2.5 py-1 bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 rounded-xl text-xs font-black transition cursor-pointer active-press shadow-2xs"
          >
            Today
          </button>

          {/* Month / Week toggle */}
          <div className="flex bg-slate-100 p-0.5 rounded-xl border border-slate-200 text-xs">
            <button
              onClick={() => setViewMode("month")}
              className={`px-2 py-0.5 rounded-lg font-bold transition cursor-pointer ${
                viewMode === "month" ? "bg-white text-slate-900 shadow-xs font-extrabold" : "text-slate-500"
              }`}
            >
              Mo
            </button>
            <button
              onClick={() => setViewMode("week")}
              className={`px-2 py-0.5 rounded-lg font-bold transition cursor-pointer ${
                viewMode === "week" ? "bg-white text-slate-900 shadow-xs font-extrabold" : "text-slate-500"
              }`}
            >
              Wk
            </button>
          </div>

          {/* Calendar Tools */}
          <button
            onClick={() => setIsCalendarToolsOpen(true)}
            className="p-1.5 text-slate-700 hover:bg-slate-100 rounded-xl border border-slate-200 transition cursor-pointer active-press"
            title="Calendar Tools & Filters"
          >
            <SlidersHorizontal className="w-4 h-4 text-sky-600" />
          </button>
        </div>
      </div>

      {/* 2. Sticky Weekday Headers */}
      {viewMode === "month" && (
        <div className="grid grid-cols-7 border-b border-slate-200 text-center py-1.5 bg-slate-100/95 shrink-0 z-30 shadow-2xs">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <span key={day} className="text-[10px] sm:text-xs font-extrabold text-slate-700 uppercase tracking-wider">
              {day}
            </span>
          ))}
        </div>
      )}

      {/* 3. Main Continuous Schedule Grid Container */}
      <div
        ref={scrollContainerRef}
        className="flex-grow h-full min-h-0 overflow-y-auto scrollbar-thin p-1.5 sm:p-3"
      >
        {renderGridContent()}
      </div>

      {/* Floating Jump to Today Button */}
      <button
        onClick={() => scrollToToday(true)}
        className="fixed bottom-20 right-4 z-40 px-3.5 py-2 bg-slate-900/90 hover:bg-slate-900 text-white rounded-full shadow-xl border border-slate-700/50 backdrop-blur-md text-xs font-extrabold flex items-center gap-1.5 cursor-pointer active-press transition duration-150"
        title="Jump to Today"
      >
        <CalendarIcon className="w-3.5 h-3.5 text-sky-400" />
        <span>Today</span>
      </button>

      {renderModals()}
    </div>
  );
}
