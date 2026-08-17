"use client";

import { useState } from "react";
import { useCrewStore } from "../../store/useCrewStore";
import { SequenceTrip, PersonalCalendarEvent, SubscribedCalendar } from "../../types";
import {
  Calendar as CalendarIcon,
  Clock,
  Plane,
  MapPin,
  X,
  Globe,
  Building,
  ChevronRight,
  Plus,
  Edit2,
  ExternalLink,
} from "lucide-react";
import CalendarEventModal from "./CalendarEventModal";
import { isPilotRole } from "../../lib/pilotBiddingDates";

interface DayDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  date: Date;
  sequences: SequenceTrip[];
  personalEvents: PersonalCalendarEvent[];
  subscribedCalendars: SubscribedCalendar[];
  primaryBase?: string;
}

export type TimezoneMode = "BASE" | "UTC" | "ET" | "CT" | "MT" | "PT";

const IANA_TIMEZONES: Record<TimezoneMode, string> = {
  BASE: "America/Chicago",
  UTC: "UTC",
  ET: "America/New_York",
  CT: "America/Chicago",
  MT: "America/Denver",
  PT: "America/Los_Angeles",
};

const BASE_IANA_MAP: Record<string, string> = {
  ORD: "America/Chicago",
  DFW: "America/Chicago",
  MIA: "America/New_York",
  JFK: "America/New_York",
  LGA: "America/New_York",
  PHL: "America/New_York",
  DCA: "America/New_York",
  BOS: "America/New_York",
  CLT: "America/New_York",
  PHX: "America/Phoenix",
  LAX: "America/Los_Angeles",
  SFO: "America/Los_Angeles",
  SEA: "America/Los_Angeles",
};

export function getTimezoneOffsetHours(tzName: string, refDate: Date): number {
  if (tzName === "UTC") return 0;
  try {
    const d = new Date(Date.UTC(refDate.getFullYear(), refDate.getMonth(), refDate.getDate(), 12, 0, 0));
    const utcStr = d.toLocaleString("en-US", { timeZone: "UTC" });
    const tzStr = d.toLocaleString("en-US", { timeZone: tzName });
    const utcDate = new Date(utcStr);
    const tzDate = new Date(tzStr);
    return (tzDate.getTime() - utcDate.getTime()) / (1000 * 60 * 60);
  } catch {
    return -5;
  }
}

const TZ_LABELS: Record<TimezoneMode, string> = {
  BASE: "Base Local",
  UTC: "UTC / Zulu (Z)",
  ET: "Eastern (ET)",
  CT: "Central (CT)",
  MT: "Mountain (MT)",
  PT: "Pacific (PT)",
};

/**
 * Converts a 4-digit HHMM string into a formatted timezone-adjusted time string
 */
function convertHHMMToTz(hhmm: string, fromOffsetHours: number, toOffsetHours: number): string {
  if (!hhmm || hhmm.length < 4) return hhmm;
  const hours = parseInt(hhmm.slice(0, 2), 10);
  const minutes = parseInt(hhmm.slice(2, 4), 10);

  if (isNaN(hours) || isNaN(minutes)) return hhmm;

  const diff = toOffsetHours - fromOffsetHours;
  let newHours = (hours + diff) % 24;
  if (newHours < 0) newHours += 24;

  return `${String(newHours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

export default function DayDetailModal({
  isOpen,
  onClose,
  date,
  sequences,
  personalEvents,
  subscribedCalendars,
  primaryBase = "ORD",
}: DayDetailModalProps) {
  const [activeTz, setActiveTz] = useState<TimezoneMode>("BASE");

  if (!isOpen) return null;

  const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;

  const formattedDateTitle = date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  // Dynamic IANA date-aware timezone resolution (handles Daylight Saving Time automatically)
  const baseIana = BASE_IANA_MAP[primaryBase.toUpperCase()] || "America/Chicago";
  const targetIana = activeTz === "BASE" ? baseIana : IANA_TIMEZONES[activeTz];
  const baseTzOffset = getTimezoneOffsetHours(baseIana, date);
  const targetOffset = getTimezoneOffsetHours(targetIana, date);
  const activeTzLabel = `${TZ_LABELS[activeTz]} (${targetOffset >= 0 ? `+${targetOffset}` : targetOffset}h UTC)`;

  const vacations = useCrewStore((state) => state.vacations);

  const vacationTrips: SequenceTrip[] = vacations
    .filter((v) => v.startDate <= dateStr && v.endDate >= dateStr)
    .map((v) => ({
      id: v.id,
      sequenceNumber: "VACATION",
      startDate: v.startDate,
      endDate: v.endDate,
      base: primaryBase,
      equipment: "VAC",
      totalBlockMinutes: 0,
      totalCreditMinutes: Math.round((v.creditHours || 24.5) * 60),
      layoverCities: ["VACATION"],
      dutyPeriods: [],
      colorTag: "emerald",
      statusTag: "VA",
    }));

  // Filter sequences active on this exact date
  const daySequences = [
    ...sequences.filter((seq) => {
      const isDropped = seq.isDropped || seq.statusTag === "DROP" || seq.statusTag === "DTS DROP";
      if (isDropped) return false;
      return dateStr >= seq.startDate && dateStr <= seq.endDate;
    }),
    ...vacationTrips,
  ];

  const userProfile = useCrewStore((state) => state.userProfile);
  const isUserPilot = isPilotRole(userProfile?.crewRole);

  // Filter personal events for this date
  const dayPersonalEvents = personalEvents.filter((evt) => {
    if ((evt.isPilotOnly || evt.targetRole === "pilot" || evt.category === "pilot_bidding") && !isUserPilot) {
      return false;
    }
    const parentCal = subscribedCalendars.find((c) => c.id === evt.calendarId);
    if (parentCal && !parentCal.enabled) return false;
    return evt.startDate === dateStr || (evt.startDate <= dateStr && evt.endDate >= dateStr);
  });

  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<PersonalCalendarEvent | null>(null);

  const deletePersonalEvent = useCrewStore((state) => state.deletePersonalEvent);

  const handleOpenAddEvent = () => {
    setEditingEvent(null);
    setIsEventModalOpen(true);
  };

  const handleOpenEditEvent = (evt: PersonalCalendarEvent) => {
    setEditingEvent(evt);
    setIsEventModalOpen(true);
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-[100000] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/60 backdrop-blur-xs animate-fadeIn font-sans text-slate-900"
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-t-3xl sm:rounded-3xl max-w-xl w-full border-t sm:border border-slate-200 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-slideUp"
      >
        {/* Mobile handle indicator */}
        <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto my-2 shrink-0 sm:hidden" />

        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 sm:p-3 bg-sky-100 border border-sky-200 rounded-2xl text-sky-700 shrink-0">
              <CalendarIcon className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black tracking-tight text-slate-900 leading-tight">{formattedDateTitle}</h3>
              <p className="text-xs text-slate-500 font-semibold">
                {daySequences.length} Flight Duty &bull; {dayPersonalEvents.length} Events
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="text-slate-400 hover:text-slate-900 p-2 rounded-xl hover:bg-slate-100 transition cursor-pointer active-press"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Timezone Selector Toolbar */}
        <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs font-bold shrink-0">
          <div className="flex items-center gap-1.5">
            <Globe className="w-4 h-4 text-sky-600" />
            <span className="text-slate-700">Display Timezone:</span>
          </div>

          <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 shadow-2xs">
            {(["BASE", "UTC", "ET", "CT", "MT", "PT"] as TimezoneMode[]).map((tz) => (
              <button
                key={tz}
                onClick={() => setActiveTz(tz)}
                className={`px-2.5 py-1 rounded-lg transition text-[11px] font-extrabold cursor-pointer ${
                  activeTz === tz
                    ? "bg-sky-600 text-white shadow-2xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                }`}
              >
                {tz === "BASE" ? `Base (${primaryBase})` : tz}
              </button>
            ))}
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1 bg-white scrollbar-thin">
          {/* SECTION 1: FLIGHT DUTY & SEQUENCES */}
          <div className="space-y-3">
            <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Plane className="w-4 h-4 text-sky-600" />
                Flight Duty Lines & Blocks ({daySequences.length})
              </span>
              <span className="text-[10px] text-slate-500 font-semibold">
                Timezone: <strong className="text-slate-800">{activeTzLabel}</strong>
              </span>
            </h4>

            {daySequences.length === 0 ? (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-500 text-center font-medium">
                No flight sequences scheduled for this day (Off / DFP)
              </div>
            ) : (
              daySequences.map((seq) => {
                const isVac = seq.sequenceNumber === "VACATION" || seq.statusTag === "VA";

                if (isVac) {
                  const vacDays = Math.max(
                    1,
                    Math.round(
                      (new Date(seq.endDate).getTime() - new Date(seq.startDate).getTime()) /
                        (1000 * 3600 * 24)
                    ) + 1
                  );
                  const dayVacCreditMins = Math.round(seq.totalCreditMinutes / vacDays);
                  const dayCreditHrs = (dayVacCreditMins / 60).toFixed(1);
                  const totalCreditHrs = (seq.totalCreditMinutes / 60).toFixed(1);

                  return (
                    <div
                      key={seq.id}
                      className="p-4 bg-emerald-50 border border-emerald-300 rounded-2xl shadow-2xs space-y-2 text-emerald-950"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-1 rounded-xl bg-emerald-600 text-white font-black text-xs shadow-2xs">
                            VACATION
                          </span>
                          <span className="text-xs font-black text-emerald-900">
                            Approved Annual Vacation
                          </span>
                        </div>
                        <div className="flex flex-col items-end">
                          <span className="text-xs font-mono font-black text-emerald-800">
                            {dayCreditHrs}h Daily Credit
                          </span>
                          {vacDays > 1 && (
                            <span className="text-[10px] font-mono text-emerald-700/80 font-semibold">
                              Total: {totalCreditHrs}h ({vacDays}d)
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                }

                // Determine duty period for this date
                const baseDate = new Date(seq.startDate);
                const targetDate = new Date(dateStr);
                const dayDiff = Math.round((targetDate.getTime() - baseDate.getTime()) / (1000 * 3600 * 24));
                const dp = seq.dutyPeriods ? (seq.dutyPeriods.find((p) => p.dayIndex === dayDiff) || seq.dutyPeriods[dayDiff]) : null;

                // Calculate Day-Specific Credit & Block Time
                const dayLegsBlockMins = dp?.legs ? dp.legs.reduce((acc, leg) => acc + (leg.blockMinutes || 0), 0) : 0;
                const dayCreditMinutes = dp?.payCreditMinutes !== undefined && dp.payCreditMinutes > 0
                  ? dp.payCreditMinutes
                  : (dp?.actualDutyMinutes ?? (dayLegsBlockMins > 0 ? dayLegsBlockMins : Math.round(seq.totalCreditMinutes / Math.max(1, seq.dutyPeriods?.length || 1))));

                const dayCreditHrs = (dayCreditMinutes / 60).toFixed(1);
                const dayBlockMins = dp?.actualBlockMinutes ?? (dayLegsBlockMins > 0 ? dayLegsBlockMins : Math.round(seq.totalBlockMinutes / Math.max(1, seq.dutyPeriods?.length || 1)));
                const dayBlockHrs = (dayBlockMins / 60).toFixed(1);
                const totalSeqCreditHrs = (seq.totalCreditMinutes / 60).toFixed(1);

                const repTz = dp ? convertHHMMToTz(dp.reportTime, baseTzOffset, targetOffset) : "06:00";
                const relTz = dp ? convertHHMMToTz(dp.releaseTime, baseTzOffset, targetOffset) : "18:00";

                return (
                  <div
                    key={seq.id}
                    className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm space-y-3 text-slate-900"
                  >
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2.5 py-1 rounded-xl bg-sky-100 text-sky-900 border border-sky-200 font-mono font-black text-xs">
                          SEQ #{seq.sequenceNumber}
                        </span>
                        <span className="text-xs font-black text-slate-900">
                          Day {dayDiff + 1} of {seq.dutyPeriods?.length || 1}
                        </span>
                        <span className="text-[11px] text-slate-500 font-mono font-bold">
                          {seq.base} &bull; {seq.equipment}
                        </span>
                      </div>

                      <div className="flex flex-col items-end">
                        <span className="text-xs font-mono font-black text-emerald-700">
                          {dayCreditHrs}h Pay Credit
                        </span>
                        {seq.dutyPeriods && seq.dutyPeriods.length > 1 && (
                          <span className="text-[10px] font-mono text-slate-400 font-semibold">
                            Trip Total: {totalSeqCreditHrs}h
                          </span>
                        )}
                      </div>
                    </div>

                    {dp && (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
                        <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                          <span className="text-[10px] text-slate-500 block font-sans font-bold">Report ({activeTz})</span>
                          <strong className="text-slate-900 text-xs font-black">{repTz}</strong>
                        </div>
                        <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                          <span className="text-[10px] text-slate-500 block font-sans font-bold">Release ({activeTz})</span>
                          <strong className="text-slate-900 text-xs font-black">{relTz}</strong>
                        </div>
                        <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                          <span className="text-[10px] text-slate-500 block font-sans font-bold">Block Time</span>
                          <strong className="text-slate-900 text-xs font-black">{dayBlockHrs}h</strong>
                        </div>
                        <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                          <span className="text-[10px] text-slate-500 block font-sans font-bold">Duty Legs</span>
                          <strong className="text-slate-900 text-xs font-black">{dp.legs?.length || 0} Flown</strong>
                        </div>
                      </div>
                    )}

                    {/* Flight Legs in this Duty Period */}
                    {dp && dp.legs && dp.legs.length > 0 && (
                      <div className="space-y-1.5 pt-1">
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">
                          Flight Legs ({dp.legs.length})
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {dp.legs.map((leg, legIdx) => {
                            const depTz = convertHHMMToTz(leg.depTime, baseTzOffset, targetOffset);
                            const arrTz = convertHHMMToTz(leg.arrTime, baseTzOffset, targetOffset);
                            return (
                              <div
                                key={legIdx}
                                className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs font-mono space-y-1.5"
                              >
                                <div className="flex items-center justify-between">
                                  <span className="font-black text-sky-700">{leg.flightNumber}</span>
                                  <span className="text-[10px] text-slate-500 font-bold">{(leg.blockMinutes / 60).toFixed(1)}h</span>
                                </div>
                                <div className="flex items-center justify-between text-xs font-black text-slate-900">
                                  <span>{leg.depAirport} ({depTz})</span>
                                  <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                                  <span>{leg.arrAirport} ({arrTz})</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {dp && dp.layoverCity && (
                      <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-xs font-bold text-amber-950 flex items-center justify-between">
                        <span className="flex items-center gap-1.5 text-amber-900 font-black">
                          <Building className="w-4 h-4 text-amber-600" />
                          Overnight Layover: {dp.layoverCity}
                        </span>
                        <span className="text-[10px] text-amber-800 font-mono font-bold">{dp.layoverHotelInfo || "Layover Hotel"}</span>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* SECTION 2: CUSTOM & SUBSCRIBED PERSONAL EVENTS */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Globe className="w-4 h-4 text-sky-600" />
                Personal & Family Events ({dayPersonalEvents.length})
              </h4>

              <button
                type="button"
                onClick={handleOpenAddEvent}
                className="px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-black transition flex items-center gap-1.5 cursor-pointer active-press shadow-2xs"
              >
                <Plus className="w-4 h-4" />
                <span>+ Add Event</span>
              </button>
            </div>

            {dayPersonalEvents.length === 0 ? (
              <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-500 text-center font-medium space-y-2">
                <p>No personal events on this date.</p>
                <button
                  type="button"
                  onClick={handleOpenAddEvent}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-800 text-xs font-bold rounded-xl transition cursor-pointer border border-slate-200 shadow-2xs"
                >
                  <Plus className="w-3.5 h-3.5 text-sky-600" />
                  <span>Create Event</span>
                </button>
              </div>
            ) : (
              <div className="space-y-2.5">
                {dayPersonalEvents.map((evt) => {
                  const isCustom = evt.calendarId === "cal-custom-personal";
                  const parentCal = subscribedCalendars.find((c) => c.id === evt.calendarId);

                  let badgeColorStyle = "bg-sky-50 border-sky-200 text-sky-950";
                  if (evt.color === "purple") badgeColorStyle = "bg-purple-50 border-purple-200 text-purple-950";
                  else if (evt.color === "rose") badgeColorStyle = "bg-rose-50 border-rose-200 text-rose-950";
                  else if (evt.color === "amber") badgeColorStyle = "bg-amber-50 border-amber-200 text-amber-950";
                  else if (evt.color === "indigo") badgeColorStyle = "bg-indigo-50 border-indigo-200 text-indigo-950";
                  else if (evt.color === "emerald") badgeColorStyle = "bg-emerald-50 border-emerald-200 text-emerald-950";
                  else if (evt.color === "teal") badgeColorStyle = "bg-teal-50 border-teal-200 text-teal-950";
                  else if (evt.color === "slate") badgeColorStyle = "bg-slate-50 border-slate-200 text-slate-900";

                  return (
                    <div
                      key={evt.id}
                      onClick={() => isCustom && handleOpenEditEvent(evt)}
                      className={`p-3.5 border rounded-2xl space-y-2 transition shadow-2xs ${badgeColorStyle} ${
                        isCustom ? "cursor-pointer hover:border-sky-500 active-press" : ""
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-sm">
                            {evt.category === "pilot_bidding" || evt.category === "bidding"
                              ? "✈️"
                              : evt.category === "commute"
                              ? "🛫"
                              : evt.category === "medical"
                              ? "👨‍⚕️"
                              : evt.category === "family"
                              ? "❤️"
                              : evt.category === "task"
                              ? "✅"
                              : evt.category === "reminder"
                              ? "⏰"
                              : "🗓️"}
                          </span>
                          <h5 className="text-xs font-black text-slate-900">{evt.title}</h5>
                        </div>

                        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                          {evt.isPilotOnly && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[8.5px] font-black bg-indigo-100 text-indigo-900 border border-indigo-200">
                              ✈️ Pilot Milestone
                            </span>
                          )}
                          <span className="text-[10px] font-extrabold opacity-75 uppercase tracking-wide">
                            {isCustom ? "Personal" : parentCal?.name || "Feed"}
                          </span>
                          {isCustom && (
                            <button
                              type="button"
                              onClick={() => handleOpenEditEvent(evt)}
                              className="p-1 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-white/80 transition cursor-pointer"
                              title="Edit event"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                          )}
                          {isCustom && (
                            <button
                              type="button"
                              onClick={() => deletePersonalEvent(evt.id)}
                              className="p-1 text-slate-500 hover:text-rose-600 rounded-lg hover:bg-white/80 transition cursor-pointer"
                              title="Delete event"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Time & Location Details */}
                      <div className="flex flex-wrap items-center justify-between text-xs font-bold text-slate-700 gap-2">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-500" />
                          {evt.isAllDay || !evt.startTime
                            ? "All Day Event"
                            : `${evt.startTime} - ${evt.endTime || ""}`}
                        </span>
                        {evt.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-slate-500" />
                            {evt.location}
                          </span>
                        )}
                      </div>

                      {/* Notes snippet */}
                      {evt.notes && (
                        <p className="text-[11px] font-medium text-slate-600 pt-1 border-t border-slate-200/60 line-clamp-2">
                          {evt.notes}
                        </p>
                      )}

                      {/* URL Link */}
                      {evt.url && (
                        <div className="pt-0.5" onClick={(e) => e.stopPropagation()}>
                          <a
                            href={evt.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-sky-700 hover:underline"
                          >
                            <ExternalLink className="w-3 h-3" />
                            <span>Open Link</span>
                          </a>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 border-t border-slate-200 p-4 flex justify-between items-center shrink-0">
          <button
            type="button"
            onClick={handleOpenAddEvent}
            className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-xl transition cursor-pointer active-press shadow-2xs flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Add Event</span>
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="px-6 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold rounded-xl transition cursor-pointer active-press"
          >
            Close
          </button>
        </div>
      </div>

      {/* Google Calendar Style Create & Edit Event Modal */}
      <CalendarEventModal
        isOpen={isEventModalOpen}
        onClose={() => {
          setIsEventModalOpen(false);
          setEditingEvent(null);
        }}
        initialDate={date}
        existingEvent={editingEvent}
      />
    </div>
  );
}
