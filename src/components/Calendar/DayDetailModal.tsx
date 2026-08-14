"use client";

import { useState } from "react";
import { useCrewStore } from "../../store/useCrewStore";
import { SequenceTrip, PersonalCalendarEvent, SubscribedCalendar, FlightLeg, DutyPeriod } from "../../types";
import {
  Calendar as CalendarIcon,
  Clock,
  Plane,
  MapPin,
  X,
  Globe,
  CheckCircle2,
  Building,
  Info,
  ChevronRight,
  Sparkles,
  Plus,
  Edit2,
  ExternalLink,
  Bell,
} from "lucide-react";
import CalendarEventModal from "./CalendarEventModal";

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

// Timezone offset mapping relative to UTC for display conversion
const TZ_OFFSETS: Record<TimezoneMode, { name: string; offsetHours: number }> = {
  BASE: { name: "Base Local (CT)", offsetHours: -5 }, // ORD / DFW = Central Time (-5 UTC)
  UTC: { name: "UTC / Zulu (Z)", offsetHours: 0 },
  ET: { name: "Eastern (ET)", offsetHours: -4 },
  CT: { name: "Central (CT)", offsetHours: -5 },
  MT: { name: "Mountain (MT)", offsetHours: -6 },
  PT: { name: "Pacific (PT)", offsetHours: -7 },
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

  // Base timezone offset (ORD / DFW = -5 CT, JFK / MIA = -4 ET, LAX = -7 PT)
  const baseTzOffset = primaryBase === "JFK" || primaryBase === "MIA" ? -4 : primaryBase === "LAX" ? -7 : -5;
  const currentTzObj = TZ_OFFSETS[activeTz];
  const targetOffset = activeTz === "BASE" ? baseTzOffset : currentTzObj.offsetHours;

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

  const deletePersonalEvent = useCrewStore((state) => state.deletePersonalEvent);

  // Full Google Calendar Event Modal State
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<PersonalCalendarEvent | null>(null);

  const handleOpenAddEvent = () => {
    setEditingEvent(null);
    setIsEventModalOpen(true);
  };

  const handleOpenEditEvent = (evt: PersonalCalendarEvent) => {
    setEditingEvent(evt);
    setIsEventModalOpen(true);
  };

  // Filter sequences active on this date
  const daySequences = [...sequences.filter((s) => s.startDate <= dateStr && s.endDate >= dateStr), ...vacationTrips];

  // Filter personal events active on this date
  const dayPersonalEvents = personalEvents.filter((e) => {
    if (e.calendarId === "cal-custom-personal") return e.startDate === dateStr || (e.startDate <= dateStr && e.endDate >= dateStr);
    const enabledCal = subscribedCalendars.find((c) => c.id === e.calendarId);
    if (enabledCal && !enabledCal.enabled) return false;
    return e.startDate === dateStr || (e.startDate <= dateStr && e.endDate >= dateStr);
  });

  return (
    <div className="fixed inset-0 z-[100000] bg-slate-950/70 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fadeIn font-sans">
      <div className="bg-white rounded-t-3xl sm:rounded-3xl border-t sm:border border-slate-200 shadow-2xl max-w-3xl w-full overflow-hidden flex flex-col max-h-[92vh] pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] animate-slideUp">
        {/* Modal Header */}
        <div className="bg-slate-900 text-white p-4 sm:p-6 flex items-center justify-between relative overflow-hidden shrink-0">
          <div className="relative z-10 flex items-center gap-3">
            <div className="p-2.5 sm:p-3 bg-sky-500/20 border border-sky-400/30 rounded-2xl text-sky-400 shrink-0">
              <CalendarIcon className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black tracking-tight text-white leading-tight">{formattedDateTitle}</h3>
              <p className="text-xs text-slate-300 font-medium">
                {daySequences.length} Flight Duty &bull; {dayPersonalEvents.length} Events
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="relative z-10 text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition cursor-pointer active-press"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Timezone Selector Toolbar */}
        <div className="bg-slate-100 p-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs font-bold">
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-sky-600" />
            <span className="text-slate-700">Display Timezone:</span>
          </div>

          <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 shadow-xs">
            {(["BASE", "UTC", "ET", "CT", "MT", "PT"] as TimezoneMode[]).map((tz) => (
              <button
                key={tz}
                onClick={() => setActiveTz(tz)}
                className={`px-2.5 py-1 rounded-lg transition text-[11px] font-extrabold cursor-pointer ${
                  activeTz === tz
                    ? "bg-sky-600 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                }`}
              >
                {tz === "BASE" ? `Base (${primaryBase})` : tz}
              </button>
            ))}
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1 bg-slate-50/50">
          {/* SECTION 1: FLIGHT DUTY & SEQUENCES */}
          <div className="space-y-3">
            <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Plane className="w-4 h-4 text-sky-600" />
                Flight Duty Lines & Blocks ({daySequences.length})
              </span>
              <span className="text-[10px] text-slate-500 font-normal">
                Timezone: <strong className="text-slate-800">{TZ_OFFSETS[activeTz].name}</strong>
              </span>
            </h4>

            {daySequences.length === 0 ? (
              <div className="p-4 bg-white border border-slate-200 rounded-2xl text-xs text-slate-500 text-center font-medium">
                No flight sequences scheduled for this day (Off / DFP)
              </div>
            ) : (
              daySequences.map((seq) => {
                const isVac = seq.sequenceNumber === "VACATION" || seq.statusTag === "VA";
                const creditHrs = (seq.totalCreditMinutes / 60).toFixed(1);

                if (isVac) {
                  return (
                    <div
                      key={seq.id}
                      className="p-4 bg-emerald-50 border-2 border-emerald-300 rounded-2xl shadow-xs space-y-2 text-emerald-950"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-1 rounded-xl bg-emerald-600 text-white font-black text-xs shadow-xs">
                            VACATION
                          </span>
                          <span className="text-xs font-black text-emerald-950">
                            Approved Annual Vacation
                          </span>
                        </div>
                        <span className="text-xs font-mono font-bold text-emerald-800">
                          {creditHrs} hrs Credit
                        </span>
                      </div>
                    </div>
                  );
                }

                // Determine duty period for this date
                const baseDate = new Date(seq.startDate);
                const targetDate = new Date(dateStr);
                const dayDiff = Math.round((targetDate.getTime() - baseDate.getTime()) / (1000 * 3600 * 24));
                const dp = seq.dutyPeriods ? seq.dutyPeriods[dayDiff] : null;

                const repTz = dp ? convertHHMMToTz(dp.reportTime, baseTzOffset, targetOffset) : "06:00";
                const relTz = dp ? convertHHMMToTz(dp.releaseTime, baseTzOffset, targetOffset) : "18:00";

                return (
                  <div
                    key={seq.id}
                    className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-3"
                  >
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2.5 py-1 rounded-xl bg-sky-100 text-sky-900 border border-sky-200 font-mono font-black text-xs">
                          SEQ #{seq.sequenceNumber}
                        </span>
                        <span className="text-xs font-bold text-slate-800">
                          Day {dayDiff + 1} of {seq.dutyPeriods?.length || 1}
                        </span>
                        <span className="text-[11px] text-slate-500 font-mono">
                          {seq.base} &bull; {seq.equipment}
                        </span>
                      </div>

                      <span className="text-xs font-mono font-black text-emerald-700">
                        {creditHrs}h Pay Credit
                      </span>
                    </div>

                    {dp && (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
                        <div className="p-2 bg-slate-50 rounded-xl border border-slate-100">
                          <span className="text-[10px] text-slate-400 block font-sans">Report ({activeTz})</span>
                          <strong className="text-slate-900">{repTz}</strong>
                        </div>
                        <div className="p-2 bg-slate-50 rounded-xl border border-slate-100">
                          <span className="text-[10px] text-slate-400 block font-sans">Release ({activeTz})</span>
                          <strong className="text-slate-900">{relTz}</strong>
                        </div>
                        <div className="p-2 bg-slate-50 rounded-xl border border-slate-100">
                          <span className="text-[10px] text-slate-400 block font-sans">Block Time</span>
                          <strong className="text-slate-900">{(seq.totalBlockMinutes / 60).toFixed(1)}h</strong>
                        </div>
                        <div className="p-2 bg-slate-50 rounded-xl border border-slate-100">
                          <span className="text-[10px] text-slate-400 block font-sans">Duty Legs</span>
                          <strong className="text-slate-900">{dp.legs?.length || 0} Flown</strong>
                        </div>
                      </div>
                    )}

                    {/* Flight Legs in this Duty Period */}
                    {dp && dp.legs && dp.legs.length > 0 && (
                      <div className="space-y-1.5 pt-1">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                          Flight Legs ({dp.legs.length})
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {dp.legs.map((leg, legIdx) => {
                            const depTz = convertHHMMToTz(leg.depTime, baseTzOffset, targetOffset);
                            const arrTz = convertHHMMToTz(leg.arrTime, baseTzOffset, targetOffset);
                            return (
                              <div
                                key={legIdx}
                                className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs font-mono space-y-1"
                              >
                                <div className="flex items-center justify-between">
                                  <span className="font-extrabold text-sky-800">{leg.flightNumber}</span>
                                  <span className="text-[10px] text-slate-500">{(leg.blockMinutes / 60).toFixed(1)}h</span>
                                </div>
                                <div className="flex items-center justify-between text-xs font-bold text-slate-700">
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
                        <span className="flex items-center gap-1.5">
                          <Building className="w-4 h-4 text-amber-600" />
                          Overnight Layover: {dp.layoverCity}
                        </span>
                        <span className="text-[10px] text-amber-800 font-mono">{dp.layoverHotelInfo || "Layover Hotel"}</span>
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
                className="px-3.5 py-1.5 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer active-press shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>+ Add Event</span>
              </button>
            </div>

            {dayPersonalEvents.length === 0 ? (
              <div className="p-5 bg-white border border-slate-200 rounded-2xl text-xs text-slate-500 text-center font-medium space-y-2">
                <p>No personal events on this date.</p>
                <button
                  type="button"
                  onClick={handleOpenAddEvent}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl transition cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create Google Calendar Style Event</span>
                </button>
              </div>
            ) : (
              <div className="space-y-2.5">
                {dayPersonalEvents.map((evt) => {
                  const isCustom = evt.calendarId === "cal-custom-personal";
                  const parentCal = subscribedCalendars.find((c) => c.id === evt.calendarId);

                  let badgeColorStyle = "bg-sky-50 border-sky-300 text-sky-950";
                  if (evt.color === "purple") badgeColorStyle = "bg-purple-50 border-purple-300 text-purple-950";
                  else if (evt.color === "rose") badgeColorStyle = "bg-rose-50 border-rose-300 text-rose-950";
                  else if (evt.color === "amber") badgeColorStyle = "bg-amber-50 border-amber-300 text-amber-950";
                  else if (evt.color === "indigo") badgeColorStyle = "bg-indigo-50 border-indigo-300 text-indigo-950";
                  else if (evt.color === "emerald") badgeColorStyle = "bg-emerald-50 border-emerald-300 text-emerald-950";
                  else if (evt.color === "teal") badgeColorStyle = "bg-teal-50 border-teal-300 text-teal-950";
                  else if (evt.color === "slate") badgeColorStyle = "bg-slate-50 border-slate-300 text-slate-950";

                  return (
                    <div
                      key={evt.id}
                      onClick={() => isCustom && handleOpenEditEvent(evt)}
                      className={`p-3.5 border-2 rounded-2xl space-y-2 transition shadow-2xs ${badgeColorStyle} ${
                        isCustom ? "cursor-pointer hover:border-slate-400 active-press" : ""
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-sm">
                            {evt.category === "commute"
                              ? "✈️"
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
                          <h5 className="text-xs font-black">{evt.title}</h5>
                        </div>

                        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                          <span className="text-[10px] font-extrabold opacity-75 uppercase tracking-wide">
                            {isCustom ? "Personal" : parentCal?.name || "Feed"}
                          </span>
                          {isCustom && (
                            <button
                              type="button"
                              onClick={() => handleOpenEditEvent(evt)}
                              className="p-1 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-white/60 transition cursor-pointer"
                              title="Edit event"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                          )}
                          {isCustom && (
                            <button
                              type="button"
                              onClick={() => deletePersonalEvent(evt.id)}
                              className="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-white/60 transition cursor-pointer"
                              title="Delete event"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Time & Location Details */}
                      <div className="flex flex-wrap items-center justify-between text-xs font-bold opacity-90 gap-2">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 opacity-70" />
                          {evt.isAllDay || !evt.startTime
                            ? "All Day Event"
                            : `${evt.startTime} - ${evt.endTime || ""}`}
                        </span>
                        {evt.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3 opacity-70" />
                            {evt.location}
                          </span>
                        )}
                      </div>

                      {/* Notes snippet */}
                      {evt.notes && (
                        <p className="text-[11px] font-medium opacity-85 pt-1 border-t border-black/5 line-clamp-2">
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
        <div className="bg-slate-50 border-t border-slate-200 p-4 flex justify-between items-center">
          <button
            type="button"
            onClick={handleOpenAddEvent}
            className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-xl transition cursor-pointer active-press shadow-xs flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Add Event</span>
          </button>

          <button
            onClick={onClose}
            className="px-6 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition cursor-pointer active-press shadow-xs"
          >
            Close Breakdown
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
