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
} from "lucide-react";

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

  // Filter sequences active on this date
  const daySequences = [...sequences.filter((s) => s.startDate <= dateStr && s.endDate >= dateStr), ...vacationTrips];

  // Filter personal events active on this date
  const dayPersonalEvents = personalEvents.filter((e) => {
    const enabledCal = subscribedCalendars.find((c) => c.id === e.calendarId);
    if (enabledCal && !enabledCal.enabled) return false;
    return e.startDate === dateStr || (e.startDate <= dateStr && e.endDate >= dateStr);
  });

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-3xl w-full overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="bg-slate-900 text-white p-6 flex items-center justify-between relative overflow-hidden">
          <div className="relative z-10 flex items-center gap-3">
            <div className="p-3 bg-sky-500/20 border border-sky-400/30 rounded-2xl text-sky-400">
              <CalendarIcon className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-black tracking-tight text-white">{formattedDateTitle}</h3>
              <p className="text-xs text-slate-300 font-medium">
                Day Breakdown: {daySequences.length} Flight Duty Sequences &bull; {dayPersonalEvents.length} Personal Events
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="relative z-10 text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition cursor-pointer"
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
        <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-slate-50/50">
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
                            Scheduled Annual Vacation Block
                          </span>
                        </div>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-900 text-[10px] font-black">
                          {creditHrs}h Credit Pay
                        </span>
                      </div>
                      <p className="text-xs text-emerald-800 font-medium">
                        7 Days Block ({seq.startDate} to {seq.endDate}) &bull; CBA Section 11.A
                      </p>
                    </div>
                  );
                }

                // Find duty period corresponding to this day
                const seqStart = new Date(seq.startDate + "T00:00:00");
                const dayOffset = Math.floor((date.getTime() - seqStart.getTime()) / (1000 * 60 * 60 * 24));
                const dp = seq.dutyPeriods[dayOffset] || seq.dutyPeriods[0];

                const adjustedRep = convertHHMMToTz(dp ? dp.reportTime : "0600", baseTzOffset, targetOffset);
                const adjustedRel = convertHHMMToTz(dp ? dp.releaseTime : "1800", baseTzOffset, targetOffset);

                return (
                  <div
                    key={seq.id}
                    className="p-4 bg-white border-2 border-sky-300/80 rounded-2xl shadow-xs space-y-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                      <div className="flex items-center gap-2.5">
                        <span className="px-2.5 py-1 rounded-xl bg-sky-600 text-white font-black text-xs shadow-xs">
                          #{seq.sequenceNumber}
                        </span>
                        <span className="text-xs font-black text-slate-900">
                          [{seq.base || primaryBase}] {seq.equipment}
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-sky-100 text-sky-900 text-[10px] font-extrabold">
                          {creditHrs}h Credit
                        </span>
                      </div>

                      <div className="text-xs font-mono font-bold text-slate-700">
                        <span>Report: {adjustedRep}</span>
                        <span className="mx-2 text-slate-300">&bull;</span>
                        <span>Release: {adjustedRel}</span>
                      </div>
                    </div>

                    {/* Flight Legs */}
                    {dp && dp.legs && dp.legs.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">
                          Flight Legs ({dp.legs.length})
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {dp.legs.map((leg, lIdx) => {
                            const depTz = convertHHMMToTz(leg.depTime, baseTzOffset, targetOffset);
                            const arrTz = convertHHMMToTz(leg.arrTime, baseTzOffset, targetOffset);
                            const blockHrs = (leg.blockMinutes / 60).toFixed(1);

                            return (
                              <div
                                key={lIdx}
                                className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1"
                              >
                                <div className="flex items-center justify-between text-xs font-black text-slate-900">
                                  <span>{leg.flightNumber}</span>
                                  <span className="text-[10px] text-sky-700 font-mono">{blockHrs}h Block</span>
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
                        <span className="text-[10px] text-amber-800 font-mono">{dp.layoverHotelInfo}</span>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* SECTION 2: SUBSCRIBED PERSONAL EVENTS */}
          <div className="space-y-3">
            <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-purple-600" />
                Personal Subscribed Events ({dayPersonalEvents.length})
              </span>
            </h4>

            {dayPersonalEvents.length === 0 ? (
              <div className="p-4 bg-white border border-slate-200 rounded-2xl text-xs text-slate-500 text-center font-medium">
                No personal events on this date
              </div>
            ) : (
              <div className="space-y-2">
                {dayPersonalEvents.map((evt) => {
                  const parentCal = subscribedCalendars.find((c) => c.id === evt.calendarId);

                  let badgeColorStyle = "bg-purple-50 border-purple-300 text-purple-950";
                  if (evt.color === "teal") badgeColorStyle = "bg-teal-50 border-teal-300 text-teal-950";
                  else if (evt.color === "rose") badgeColorStyle = "bg-rose-50 border-rose-300 text-rose-950";
                  else if (evt.color === "amber") badgeColorStyle = "bg-amber-50 border-amber-300 text-amber-950";
                  else if (evt.color === "indigo") badgeColorStyle = "bg-indigo-50 border-indigo-300 text-indigo-950";

                  return (
                    <div
                      key={evt.id}
                      className={`p-3.5 border-2 rounded-2xl space-y-1.5 ${badgeColorStyle}`}
                    >
                      <div className="flex items-center justify-between">
                        <h5 className="text-xs font-black">{evt.title}</h5>
                        <span className="text-[10px] font-bold opacity-75">{parentCal?.name || "Subscribed Feed"}</span>
                      </div>

                      <div className="flex flex-wrap items-center justify-between text-xs font-bold opacity-90 gap-2">
                        <span>
                          {evt.startTime
                            ? `Time: ${evt.startTime} - ${evt.endTime || ""}`
                            : "All Day Event"}
                        </span>
                        {evt.location && <span>Location: {evt.location}</span>}
                      </div>

                      {evt.notes && <p className="text-[11px] font-medium opacity-80 pt-1">{evt.notes}</p>}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 border-t border-slate-200 p-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition cursor-pointer"
          >
            Close Breakdown
          </button>
        </div>
      </div>
    </div>
  );
}
