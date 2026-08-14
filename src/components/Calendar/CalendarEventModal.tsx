"use client";

import { useState, useEffect } from "react";
import {
  X,
  Clock,
  MapPin,
  AlignLeft,
  Bell,
  Link as LinkIcon,
  Palette,
  Eye,
  RefreshCw,
  Globe,
  Trash2,
  Check,
  Calendar as CalendarIcon,
  Plane,
  Briefcase,
  Users,
  Sparkles,
} from "lucide-react";
import { PersonalCalendarEvent } from "../../types";
import { useCrewStore } from "../../store/useCrewStore";

interface CalendarEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialDate?: Date | string;
  existingEvent?: PersonalCalendarEvent | null;
}

const GOOGLE_COLORS = [
  { id: "sky", name: "Peacock Blue", bg: "bg-sky-500", text: "text-sky-950", border: "border-sky-300" },
  { id: "purple", name: "Grape Purple", bg: "bg-purple-500", text: "text-purple-950", border: "border-purple-300" },
  { id: "rose", name: "Flamingo Rose", bg: "bg-rose-500", text: "text-rose-950", border: "border-rose-300" },
  { id: "amber", name: "Tangerine Orange", bg: "bg-amber-500", text: "text-amber-950", border: "border-amber-300" },
  { id: "emerald", name: "Sage Green", bg: "bg-emerald-500", text: "text-emerald-950", border: "border-emerald-300" },
  { id: "indigo", name: "Blueberry Indigo", bg: "bg-indigo-500", text: "text-indigo-950", border: "border-indigo-300" },
  { id: "teal", name: "Cyan Teal", bg: "bg-teal-500", text: "text-teal-950", border: "border-teal-300" },
  { id: "slate", name: "Graphite Slate", bg: "bg-slate-500", text: "text-slate-950", border: "border-slate-300" },
];

const CATEGORIES: { id: PersonalCalendarEvent["category"]; label: string; icon: string; defaultColor: string }[] = [
  { id: "event", label: "Event", icon: "🗓️", defaultColor: "sky" },
  { id: "commute", label: "Commute / Jumpseat", icon: "✈️", defaultColor: "amber" },
  { id: "medical", label: "FAA Medical / Training", icon: "👨‍⚕️", defaultColor: "emerald" },
  { id: "family", label: "Family & Personal", icon: "❤️", defaultColor: "rose" },
  { id: "task", label: "Task / Todo", icon: "✅", defaultColor: "indigo" },
  { id: "reminder", label: "Reminder", icon: "⏰", defaultColor: "purple" },
];

export default function CalendarEventModal({
  isOpen,
  onClose,
  initialDate,
  existingEvent,
}: CalendarEventModalProps) {
  const addPersonalEvent = useCrewStore((state) => state.addPersonalEvent);
  const updatePersonalEvent = useCrewStore((state) => state.updatePersonalEvent);
  const deletePersonalEvent = useCrewStore((state) => state.deletePersonalEvent);
  const publishSchedule = useCrewStore((state) => state.publishScheduleToFamilyFeed);

  // Derive initial date string YYYY-MM-DD
  const getDefaultDateStr = () => {
    if (initialDate instanceof Date) {
      return `${initialDate.getFullYear()}-${String(initialDate.getMonth() + 1).padStart(2, "0")}-${String(
        initialDate.getDate()
      ).padStart(2, "0")}`;
    }
    if (typeof initialDate === "string" && initialDate.length >= 10) {
      return initialDate.slice(0, 10);
    }
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(
      today.getDate()
    ).padStart(2, "0")}`;
  };

  const defaultDate = getDefaultDateStr();

  // Form State
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<PersonalCalendarEvent["category"]>("event");
  const [isAllDay, setIsAllDay] = useState(true);
  const [startDate, setStartDate] = useState(defaultDate);
  const [endDate, setEndDate] = useState(defaultDate);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [timezone, setTimezone] = useState("Base Time (CT)");
  const [recurrence, setRecurrence] = useState<PersonalCalendarEvent["recurrence"]>("none");
  const [location, setLocation] = useState("");
  const [reminderMinutes, setReminderMinutes] = useState<number>(30);
  const [notes, setNotes] = useState("");
  const [url, setUrl] = useState("");
  const [busyStatus, setBusyStatus] = useState<"busy" | "free">("busy");
  const [color, setColor] = useState("sky");

  // Populate when opening or switching events
  useEffect(() => {
    if (existingEvent) {
      setTitle(existingEvent.title || "");
      setCategory(existingEvent.category || "event");
      setIsAllDay(existingEvent.isAllDay ?? !existingEvent.startTime);
      setStartDate(existingEvent.startDate || defaultDate);
      setEndDate(existingEvent.endDate || existingEvent.startDate || defaultDate);
      setStartTime(existingEvent.startTime || "09:00");
      setEndTime(existingEvent.endTime || "10:00");
      setRecurrence(existingEvent.recurrence || "none");
      setLocation(existingEvent.location || "");
      setReminderMinutes(existingEvent.reminderMinutes ?? 30);
      setNotes(existingEvent.notes || "");
      setUrl(existingEvent.url || "");
      setBusyStatus(existingEvent.busyStatus || "busy");
      setColor(existingEvent.color || "sky");
    } else {
      setTitle("");
      setCategory("event");
      setIsAllDay(true);
      setStartDate(defaultDate);
      setEndDate(defaultDate);
      setStartTime("09:00");
      setEndTime("10:00");
      setRecurrence("none");
      setLocation("");
      setReminderMinutes(30);
      setNotes("");
      setUrl("");
      setBusyStatus("busy");
      setColor("sky");
    }
  }, [existingEvent, defaultDate, isOpen]);

  if (!isOpen) return null;

  const handleCategorySelect = (catId: PersonalCalendarEvent["category"]) => {
    setCategory(catId);
    const matched = CATEGORIES.find((c) => c.id === catId);
    if (matched && !existingEvent) {
      setColor(matched.defaultColor);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const eventPayload: PersonalCalendarEvent = {
      id: existingEvent ? existingEvent.id : `pevt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      calendarId: "cal-custom-personal",
      title: title.trim(),
      category,
      startDate,
      endDate: endDate || startDate,
      startTime: isAllDay ? undefined : startTime,
      endTime: isAllDay ? undefined : endTime,
      isAllDay,
      recurrence,
      location: location.trim() || undefined,
      reminderMinutes,
      notes: notes.trim() || undefined,
      url: url.trim() || undefined,
      busyStatus,
      color,
    };

    if (existingEvent) {
      updatePersonalEvent(eventPayload);
    } else {
      addPersonalEvent(eventPayload);
    }

    // Auto publish to family live feed in the background
    publishSchedule();

    onClose();
  };

  const handleDelete = () => {
    if (existingEvent) {
      deletePersonalEvent(existingEvent.id);
      publishSchedule();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[100000] bg-slate-950/70 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fadeIn font-sans">
      <div className="bg-white rounded-t-3xl sm:rounded-3xl border-t sm:border border-slate-200 shadow-2xl max-w-xl w-full overflow-hidden flex flex-col max-h-[94vh] pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] animate-slideUp">
        {/* Google Calendar Style Top App Bar */}
        <div className="bg-slate-900 text-white px-4 py-3.5 sm:px-5 sm:py-4 flex items-center justify-between shrink-0 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-slate-800 transition cursor-pointer active-press"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-sm sm:text-base font-black tracking-tight text-white">
              {existingEvent ? "Edit Event" : "New Event"}
            </h3>
          </div>

          <div className="flex items-center gap-2">
            {existingEvent && (
              <button
                type="button"
                onClick={handleDelete}
                className="p-2 text-rose-400 hover:text-rose-200 hover:bg-rose-500/20 rounded-xl transition cursor-pointer active-press"
                title="Delete Event"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!title.trim()}
              className="px-5 py-1.5 bg-sky-500 hover:bg-sky-400 disabled:bg-slate-700 disabled:text-slate-500 text-slate-950 font-black rounded-xl text-xs transition cursor-pointer active-press shadow-sm flex items-center gap-1.5"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>Save</span>
            </button>
          </div>
        </div>

        {/* Scrollable Event Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1 bg-slate-50/50">
          {/* 1. Large Title Field */}
          <div className="bg-white border border-slate-200 rounded-2xl p-3.5 shadow-2xs space-y-2">
            <input
              type="text"
              autoFocus
              placeholder="Add title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-transparent text-base sm:text-lg font-black text-slate-900 placeholder:text-slate-400 focus:outline-none"
              required
            />

            {/* Category Chips (Google Calendar Style) */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none pt-1">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => handleCategorySelect(cat.id)}
                  className={`px-2.5 py-1 rounded-xl text-[11px] font-extrabold transition shrink-0 flex items-center gap-1 cursor-pointer active-press ${
                    category === cat.id
                      ? "bg-slate-900 text-white shadow-2xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  <span>{cat.icon}</span>
                  <span>{cat.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 2. Date & Time Section (Google Calendar standard) */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs space-y-3.5">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <Clock className="w-4 h-4 text-slate-500" />
                <span className="text-xs font-black text-slate-800 uppercase tracking-wider">Date & Time</span>
              </div>

              {/* All-Day Toggle Switch */}
              <label className="flex items-center gap-2 cursor-pointer">
                <span className="text-xs font-bold text-slate-600">All-day</span>
                <button
                  type="button"
                  onClick={() => setIsAllDay(!isAllDay)}
                  className={`w-10 h-5 rounded-full transition-colors relative cursor-pointer ${
                    isAllDay ? "bg-sky-600" : "bg-slate-300"
                  }`}
                >
                  <span
                    className={`block w-3.5 h-3.5 rounded-full bg-white transition-transform absolute top-0.5 ${
                      isAllDay ? "left-5.5" : "left-1"
                    }`}
                  />
                </button>
              </label>
            </div>

            {/* Start Date & Time */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div>
                <label className="text-[10px] font-extrabold text-slate-500 uppercase block mb-1">Starts</label>
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => {
                      setStartDate(e.target.value);
                      if (e.target.value > endDate) setEndDate(e.target.value);
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-bold font-mono focus:outline-none focus:border-sky-600"
                    required
                  />
                  {!isAllDay && (
                    <input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-slate-900 font-bold font-mono focus:outline-none focus:border-sky-600 shrink-0"
                    />
                  )}
                </div>
              </div>

              {/* End Date & Time */}
              <div>
                <label className="text-[10px] font-extrabold text-slate-500 uppercase block mb-1">Ends</label>
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={endDate}
                    min={startDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-bold font-mono focus:outline-none focus:border-sky-600"
                    required
                  />
                  {!isAllDay && (
                    <input
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-slate-900 font-bold font-mono focus:outline-none focus:border-sky-600 shrink-0"
                    />
                  )}
                </div>
              </div>
            </div>

            {/* Recurrence & Timezone */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
              <div>
                <label className="text-[10px] font-extrabold text-slate-500 uppercase block mb-1 flex items-center gap-1">
                  <RefreshCw className="w-3 h-3 text-slate-400" />
                  Repeat
                </label>
                <select
                  value={recurrence}
                  onChange={(e) => setRecurrence(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-bold focus:outline-none focus:border-sky-600"
                >
                  <option value="none">Does not repeat</option>
                  <option value="daily">Every day</option>
                  <option value="weekly">Every week</option>
                  <option value="monthly">Every month</option>
                  <option value="yearly">Every year</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-extrabold text-slate-500 uppercase block mb-1 flex items-center gap-1">
                  <Globe className="w-3 h-3 text-slate-400" />
                  Time Zone
                </label>
                <select
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-bold focus:outline-none focus:border-sky-600"
                >
                  <option value="Base Time (CT)">Base Local Time (CT - Central)</option>
                  <option value="Eastern (ET)">Eastern Time (ET)</option>
                  <option value="Mountain (MT)">Mountain Time (MT)</option>
                  <option value="Pacific (PT)">Pacific Time (PT)</option>
                  <option value="UTC / Zulu (Z)">UTC / Zulu (Z)</option>
                </select>
              </div>
            </div>
          </div>

          {/* 3. Location Field & Quick Chips */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs space-y-2.5">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-rose-500" />
              <input
                type="text"
                placeholder="Add location, airport code, or address"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full bg-transparent text-xs font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none"
              />
            </div>

            {/* Quick Airport / Commute Suggestions */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none text-[10px]">
              {["ORD Base", "DFW Base", "MIA Base", "Home", "Gate K12", "Hotel"].map((loc) => (
                <button
                  key={loc}
                  type="button"
                  onClick={() => setLocation(loc)}
                  className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg transition shrink-0 cursor-pointer"
                >
                  + {loc}
                </button>
              ))}
            </div>
          </div>

          {/* 4. Notification / Reminder */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs flex items-center justify-between text-xs">
            <div className="flex items-center gap-2.5">
              <Bell className="w-4 h-4 text-amber-500" />
              <span className="font-bold text-slate-800">Notification Alert</span>
            </div>

            <select
              value={reminderMinutes}
              onChange={(e) => setReminderMinutes(Number(e.target.value))}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-slate-900 font-bold text-xs focus:outline-none focus:border-sky-600"
            >
              <option value={0}>At time of event</option>
              <option value={10}>10 minutes before</option>
              <option value={30}>30 minutes before</option>
              <option value={60}>1 hour before</option>
              <option value={1440}>1 day before</option>
            </select>
          </div>

          {/* 5. Google Calendar Color Palette */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Palette className="w-4 h-4 text-purple-500" />
                <span className="text-xs font-bold text-slate-800">Color Label</span>
              </div>
              <span className="text-[10px] font-bold text-slate-500">
                {GOOGLE_COLORS.find((c) => c.id === color)?.name}
              </span>
            </div>

            <div className="flex items-center justify-between gap-1.5 pt-1">
              {GOOGLE_COLORS.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setColor(c.id)}
                  className={`w-7 h-7 rounded-full transition-transform cursor-pointer active-press flex items-center justify-center ${c.bg} ${
                    color === c.id ? "ring-2 ring-slate-900 ring-offset-2 scale-110 shadow-xs" : "hover:scale-105 opacity-85 hover:opacity-100"
                  }`}
                  title={c.name}
                >
                  {color === c.id && <Check className="w-3.5 h-3.5 text-white stroke-[3]" />}
                </button>
              ))}
            </div>
          </div>

          {/* 6. Description / Notes & URL */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs space-y-3">
            <div className="flex items-start gap-2.5">
              <AlignLeft className="w-4 h-4 text-slate-500 mt-1 shrink-0" />
              <textarea
                placeholder="Add description, confirmation #, flight numbers, notes..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full bg-transparent text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none resize-none leading-relaxed"
              />
            </div>

            <div className="flex items-center gap-2.5 pt-2 border-t border-slate-100 text-xs">
              <LinkIcon className="w-4 h-4 text-sky-600 shrink-0" />
              <input
                type="url"
                placeholder="Add URL, reservation link, or ticket..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="w-full bg-transparent text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none"
              />
            </div>
          </div>

          {/* 7. Busy / Free Visibility */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs flex items-center justify-between text-xs">
            <div className="flex items-center gap-2.5">
              <Eye className="w-4 h-4 text-slate-500" />
              <div>
                <span className="font-bold text-slate-800 block">Show as</span>
                <span className="text-[10px] text-slate-400">
                  {busyStatus === "busy" ? "Blocks off your schedule as Busy" : "Available / Free on schedule"}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
              <button
                type="button"
                onClick={() => setBusyStatus("busy")}
                className={`px-3 py-1 rounded-lg transition cursor-pointer ${
                  busyStatus === "busy" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-500"
                }`}
              >
                Busy
              </button>
              <button
                type="button"
                onClick={() => setBusyStatus("free")}
                className={`px-3 py-1 rounded-lg transition cursor-pointer ${
                  busyStatus === "free" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-500"
                }`}
              >
                Free
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
