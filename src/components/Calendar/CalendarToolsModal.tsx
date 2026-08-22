"use client";

import { useState } from "react";
import { useCrewStore } from "../../store/useCrewStore";
import { X, Calendar as CalendarIcon, SlidersHorizontal, Eye, EyeOff, ShoppingBag, Palmtree, Clock, Check, Plus, Rss, ShieldCheck, FileSpreadsheet, Trash2, Link, Loader2, Share2, Globe, Copy, Smartphone, Download, Info, RotateCcw } from "lucide-react";
import { fetchRemoteIcsFeed, parseIcsText, downloadRosterIcsFile } from "../../lib/icalExporter";
import { PersonalCalendarEvent } from "../../types";
import { isPilotRole } from "../../lib/pilotBiddingDates";

interface CalendarToolsModalProps {
  isOpen: boolean;
  onClose: () => void;
  viewMode: "month" | "week";
  setViewMode: (mode: "month" | "week") => void;
  filterMode: "all" | "trips" | "off" | "high-credit";
  setFilterMode: (mode: "all" | "trips" | "off" | "high-credit") => void;
}

export default function CalendarToolsModal({
  isOpen,
  onClose,
  viewMode,
  setViewMode,
  filterMode,
  setFilterMode,
}: CalendarToolsModalProps) {
  const [activeTab, setActiveTabSection] = useState<"filters" | "opentime" | "vacation" | "calendars" | "share">("filters");

  const showOpenTimeOverlay = useCrewStore((state) => state.showOpenTimeOverlay);
  const setShowOpenTimeOverlay = useCrewStore((state) => state.setShowOpenTimeOverlay);
  const openTimeFilter = useCrewStore((state) => state.openTimeFilter);
  const setOpenTimeFilter = (filter: string) => useCrewStore.setState({ openTimeFilter: filter });
  const openTimePresets = useCrewStore((state) => state.openTimePresets);
  const resetScheduleToDefaults = useCrewStore((state) => state.resetScheduleToDefaults);

  const showDtsDropped = useCrewStore((state) => state.showDtsDropped);
  const toggleShowDtsDropped = useCrewStore((state) => state.toggleShowDtsDropped);

  const vacations = useCrewStore((state) => state.vacations);
  const setVacations = useCrewStore((state) => state.setVacations);

  const subscribedCalendars = useCrewStore((state) => state.subscribedCalendars || []);
  const toggleSubscribedCal = useCrewStore((state) => state.toggleSubscribedCalendar);
  const removeSubscribedCal = useCrewStore((state) => state.removeSubscribedCalendar);
  const addSubscribedCal = useCrewStore((state) => state.addSubscribedCalendar);
  const updateSubscribedCalColor = useCrewStore((state) => state.updateSubscribedCalendarColor);
  const setActiveTab = useCrewStore((state) => state.setActiveTab);

  const userProfile = useCrewStore((state) => state.userProfile);
  const sequences = useCrewStore((state) => state.sequences);
  const payRates = useCrewStore((state) => state.payRates);
  const [shareCopied, setShareCopied] = useState(false);
  const [guidePlatform, setGuidePlatform] = useState<"apple" | "google" | "free">("apple");

  // New Feed Form State
  const [newFeedName, setNewFeedName] = useState("");
  const [newFeedUrl, setNewFeedUrl] = useState("");
  const [newFeedColor, setNewFeedColor] = useState("purple");
  const [showAddFeedForm, setShowAddFeedForm] = useState(false);
  const [isFetchingFeed, setIsFetchingFeed] = useState(false);

  const handleCreateFeed = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFeedName.trim()) return;

    setIsFetchingFeed(true);
    const newId = `cal-${Date.now()}`;
    let events: PersonalCalendarEvent[] = [];

    if (newFeedUrl.trim()) {
      try {
        const rawIcs = await fetchRemoteIcsFeed(newFeedUrl);
        events = parseIcsText(rawIcs, newId, newFeedColor);
      } catch (err) {
        console.warn("Could not fetch remote feed directly, registering feed listener", err);
      }
    }

    const newCal = {
      id: newId,
      name: newFeedName.trim(),
      url: newFeedUrl.trim() || undefined,
      color: newFeedColor,
      enabled: true,
      lastSyncedAt: "Live",
      eventsCount: events.length,
    };

    addSubscribedCal(newCal, events);
    setNewFeedName("");
    setNewFeedUrl("");
    setIsFetchingFeed(false);
    setShowAddFeedForm(false);
  };

  // Vacation editing state
  const currentVacation = vacations[0] || {
    id: "vac-aug-01-07",
    startDate: "2026-08-01",
    endDate: "2026-08-07",
    code: "VA",
    description: "Scheduled Annual Vacation Block",
    creditHours: 24.5,
  };

  const [vacStart, setVacStart] = useState(currentVacation.startDate);
  const [vacEnd, setVacEnd] = useState(currentVacation.endDate);
  const [vacCredit, setVacCredit] = useState(currentVacation.creditHours || 24.5);
  const [vacSaved, setVacSaved] = useState(false);

  const handleSaveVacation = (e: React.FormEvent) => {
    e.preventDefault();
    const updated = [
      {
        ...currentVacation,
        startDate: vacStart,
        endDate: vacEnd,
        creditHours: Number(vacCredit),
      },
    ];
    setVacations(updated);
    setVacSaved(true);
    setTimeout(() => setVacSaved(false), 2500);
  };

  const handleCopyShareLink = () => {
    const shareUrl = typeof window !== "undefined"
      ? `${window.location.origin}/api/ical?token=crew-${userProfile?.employeeId || "742840"}-live`
      : `https://crewschedulepro.app/api/ical?token=crew-742840-live`;
    navigator.clipboard.writeText(shareUrl);
    setShareCopied(true);
    setTimeout(() => setShareCopied(false), 3000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100001] bg-slate-950/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fadeIn font-sans">
      <div className="bg-white text-slate-900 rounded-t-3xl sm:rounded-3xl border-t sm:border border-slate-200 shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh] pb-[calc(1rem+env(safe-area-inset-bottom,0px))] animate-slideUp">
        {/* Modal Header */}
        <div className="bg-white border-b border-slate-200 text-slate-900 p-4 sm:p-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 sm:p-2.5 bg-sky-100 border border-sky-200 rounded-2xl text-sky-700 shrink-0">
              <SlidersHorizontal className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black tracking-tight text-slate-900 leading-tight">
                Calendar Tools & Schedule Manager
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Overlays, Vacation Manager, External iCal Feeds & Family Share
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-900 p-2 rounded-xl hover:bg-slate-100 transition cursor-pointer active-press"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1.5 p-2 bg-slate-50 border-b border-slate-200 overflow-x-auto scrollbar-none shrink-0">
          <button
            type="button"
            onClick={() => setActiveTabSection("filters")}
            className={`flex-1 py-2 px-2.5 rounded-xl text-xs font-extrabold transition shrink-0 flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === "filters"
                ? "bg-sky-600 text-white shadow-sm"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            Display & Filters
          </button>

          <button
            type="button"
            onClick={() => setActiveTabSection("opentime")}
            className={`flex-1 py-2 px-2.5 rounded-xl text-xs font-extrabold transition shrink-0 flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === "opentime"
                ? "bg-amber-600 text-white shadow-sm"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            Open Time
          </button>

          <button
            type="button"
            onClick={() => setActiveTabSection("vacation")}
            className={`flex-1 py-2 px-2.5 rounded-xl text-xs font-extrabold transition shrink-0 flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === "vacation"
                ? "bg-emerald-600 text-white shadow-sm"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <Palmtree className="w-3.5 h-3.5" />
            Vacation
          </button>

          <button
            type="button"
            onClick={() => setActiveTabSection("calendars")}
            className={`flex-1 py-2 px-2.5 rounded-xl text-xs font-extrabold transition shrink-0 flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === "calendars"
                ? "bg-purple-600 text-white shadow-sm"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <Rss className="w-3.5 h-3.5" />
            External Feeds
          </button>

          <button
            type="button"
            onClick={() => setActiveTabSection("share")}
            className={`flex-1 py-2 px-2.5 rounded-xl text-xs font-extrabold transition shrink-0 flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === "share"
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <Share2 className="w-3.5 h-3.5" />
            Family Share
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="p-4 sm:p-5 overflow-y-auto scrollbar-thin flex-grow space-y-5 bg-white">
          {/* TAB 1: Display & Filters */}
          {activeTab === "filters" && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-extrabold text-slate-900 uppercase tracking-wider block mb-2">
                  Calendar Grid View Mode
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setViewMode("month")}
                    className={`py-2.5 px-3 rounded-2xl border text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                      viewMode === "month"
                        ? "bg-sky-600 text-white border-sky-600 shadow-sm"
                        : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    <CalendarIcon className="w-4 h-4" />
                    Month Grid View
                  </button>

                  <button
                    type="button"
                    onClick={() => setViewMode("week")}
                    className={`py-2.5 px-3 rounded-2xl border text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                      viewMode === "week"
                        ? "bg-sky-600 text-white border-sky-600 shadow-sm"
                        : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    <Clock className="w-4 h-4" />
                    Weekly Focus View
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-extrabold text-slate-900 uppercase tracking-wider block mb-2">
                  Trip Status Filter Presets
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: "all", label: "All Trips" },
                    { id: "trips", label: "Trips Only" },
                    { id: "off", label: "Off Days" },
                    { id: "high-credit", label: "High Credit (>15h)" },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setFilterMode(item.id as any)}
                      className={`py-2 px-2.5 rounded-xl border text-xs font-bold transition cursor-pointer text-center ${
                        filterMode === item.id
                          ? "bg-sky-600 text-white border-sky-600 font-black shadow-sm"
                          : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100">
                <label className="text-xs font-extrabold text-slate-900 uppercase tracking-wider block mb-2">
                  Schedule Visibility Toggles
                </label>
                <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-2xl">
                  <div className="flex items-center gap-2.5">
                    {showDtsDropped ? (
                      <Eye className="w-4 h-4 text-sky-600" />
                    ) : (
                      <EyeOff className="w-4 h-4 text-slate-400" />
                    )}
                    <div>
                      <span className="text-xs font-extrabold text-slate-900 block">
                        Show Dropped & DTS Trades
                      </span>
                      <span className="text-[10px] text-slate-500 font-medium">
                        Display traded off and dropped roster sequences on grid
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={toggleShowDtsDropped}
                    className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                      showDtsDropped ? "bg-sky-600" : "bg-slate-300"
                    }`}
                  >
                    <span
                      className={`block w-4 h-4 rounded-full bg-white transition-transform absolute top-1 ${
                        showDtsDropped ? "left-6" : "left-1"
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Open Time & Simulation */}
          {activeTab === "opentime" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3.5 bg-amber-50 border border-amber-200 rounded-2xl">
                <div className="flex items-center gap-2.5">
                  <ShoppingBag className="w-5 h-5 text-amber-600" />
                  <div>
                    <span className="text-xs font-extrabold text-amber-950 block">
                      Open Time Pickup Overlay
                    </span>
                    <span className="text-[10px] text-amber-800 font-medium">
                      Simulate open sequences on calendar grid
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowOpenTimeOverlay(!showOpenTimeOverlay)}
                  className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                    showOpenTimeOverlay ? "bg-amber-600" : "bg-slate-300"
                  }`}
                >
                  <span
                    className={`block w-4 h-4 rounded-full bg-white transition-transform absolute top-1 ${
                      showOpenTimeOverlay ? "left-6" : "left-1"
                    }`}
                  />
                </button>
              </div>

              <div>
                <label className="text-xs font-extrabold text-slate-900 uppercase tracking-wider block mb-2">
                  Open Time Filtering Presets
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {openTimePresets.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => setOpenTimeFilter(preset.id)}
                      className={`p-3 rounded-2xl border text-left transition cursor-pointer ${
                        openTimeFilter === preset.id
                          ? "bg-amber-50 border-2 border-amber-600 text-amber-950 shadow-sm"
                          : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      <div className="font-extrabold text-xs text-slate-900">{preset.name}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        {preset.fitsOnly ? "Only trips that fit roster legality" : "All station open time"}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Vacation Manager */}
          {activeTab === "vacation" && (
            <form onSubmit={handleSaveVacation} className="space-y-4">
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start gap-3 text-emerald-950">
                <Palmtree className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="text-xs space-y-1">
                  <div className="font-black text-emerald-900">Annual Vacation Block Management</div>
                  <p className="text-emerald-800 leading-relaxed text-[11px]">
                    Configure your awarded 7-day vacation block. Scheduled sequences overlapping this window are automatically tagged for DTS (Direct Trip Swap) dropping.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 block">Block Start Date</label>
                  <input
                    type="date"
                    value={vacStart}
                    onChange={(e) => setVacStart(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-emerald-600"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 block">Block End Date</label>
                  <input
                    type="date"
                    value={vacEnd}
                    onChange={(e) => setVacEnd(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-emerald-600"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">Vacation Pay Credit (Hours)</label>
                <input
                  type="number"
                  step="0.1"
                  value={vacCredit}
                  onChange={(e) => setVacCredit(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-emerald-600"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                {vacSaved && (
                  <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                    <Check className="w-4 h-4" /> Vacation dates updated!
                  </span>
                )}
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl transition cursor-pointer shadow-sm ml-auto active-press"
                >
                  Save Vacation Block
                </button>
              </div>
            </form>
          )}

          {/* TAB 4: External iCal Feeds */}
          {activeTab === "calendars" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
                    Subscribed Calendar Feeds
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Live iCal / Google / Outlook calendar feeds overlaying on your grid
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setShowAddFeedForm(!showAddFeedForm)}
                  className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Feed</span>
                </button>
              </div>

              {/* Add Feed Inline Form */}
              {showAddFeedForm && (
                <form onSubmit={handleCreateFeed} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                  <div className="font-extrabold text-xs text-slate-900">Subscribe to Remote iCal URL</div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-700 block">Feed Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Spouse Schedule, Commute Flights, Kid Activities"
                      value={newFeedName}
                      onChange={(e) => setNewFeedName(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-purple-600 font-medium"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-700 block">iCal Feed URL (Webcal / HTTPS)</label>
                    <input
                      type="url"
                      placeholder="https://calendar.google.com/calendar/ical/..."
                      value={newFeedUrl}
                      onChange={(e) => setNewFeedUrl(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-purple-600 font-mono"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-bold text-slate-700">Badge Color:</span>
                      {["purple", "emerald", "amber", "rose", "sky"].map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setNewFeedColor(c)}
                          className={`w-5 h-5 rounded-full transition cursor-pointer ${
                            newFeedColor === c ? "ring-2 ring-purple-600 ring-offset-1" : "opacity-60"
                          }`}
                          style={{
                            backgroundColor:
                              c === "purple"
                                ? "#9333ea"
                                : c === "emerald"
                                ? "#10b981"
                                : c === "amber"
                                ? "#f59e0b"
                                : c === "rose"
                                ? "#f43f5e"
                                : "#0284c7",
                          }}
                        />
                      ))}
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setShowAddFeedForm(false)}
                        className="px-3 py-1.5 bg-slate-200 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-300 cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isFetchingFeed}
                        className="px-4 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                      >
                        {isFetchingFeed ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                        <span>Save & Sync</span>
                      </button>
                    </div>
                  </div>
                </form>
              )}

              {/* List of Subscribed Feeds */}
              <div className="space-y-2">
                {subscribedCalendars
                  .filter((cal) => {
                    const isUserPilot = isPilotRole(userProfile?.crewRole);
                    if (cal.isPilotOnly && !isUserPilot) return false;
                    return true;
                  })
                  .map((cal) => (
                    <div
                      key={cal.id}
                      className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200 rounded-2xl"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <button
                          type="button"
                          onClick={() => toggleSubscribedCal(cal.id)}
                          className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 cursor-pointer ${
                            cal.enabled
                              ? cal.color === "indigo"
                                ? "bg-indigo-600 border-indigo-600"
                                : "bg-purple-600 border-purple-600"
                              : "border-slate-400 bg-transparent"
                          }`}
                        >
                          {cal.enabled && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                        </button>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-extrabold text-xs text-slate-900 truncate">{cal.name}</span>
                            {cal.isPilotOnly && (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[8px] font-black bg-indigo-100 text-indigo-800 border border-indigo-200">
                                ✈️ Pilot Only
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-500 font-mono block">
                            Sync: {cal.lastSyncedAt || "Active"} &bull; {cal.eventsCount || 0} events
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1">
                          {["indigo", "purple", "emerald", "amber", "rose", "sky"].map((c) => (
                            <button
                              key={c}
                              type="button"
                              onClick={() => updateSubscribedCalColor(cal.id, c)}
                              className={`w-3.5 h-3.5 rounded-full transition cursor-pointer ${
                                cal.color === c ? "ring-2 ring-indigo-600 ring-offset-1" : "opacity-60"
                              }`}
                              style={{
                                backgroundColor:
                                  c === "indigo"
                                    ? "#4f46e5"
                                    : c === "purple"
                                    ? "#9333ea"
                                    : c === "emerald"
                                    ? "#10b981"
                                    : c === "amber"
                                    ? "#f59e0b"
                                    : c === "rose"
                                    ? "#f43f5e"
                                    : "#0284c7",
                              }}
                            />
                          ))}
                        </div>

                        {!cal.isPilotOnly && (
                          <button
                            type="button"
                            onClick={() => removeSubscribedCal(cal.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-white transition cursor-pointer"
                            title="Remove calendar feed"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* TAB 5: Family Share */}
          {activeTab === "share" && (
            <div className="space-y-4">
              <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-2xl flex items-start gap-3 text-indigo-950">
                <Share2 className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                <div className="text-xs space-y-1">
                  <div className="font-black text-indigo-900">Live Roster Share with Family & Spouses</div>
                  <p className="text-indigo-800 leading-relaxed text-[11px]">
                    Share your live flight duty times, hotel layovers, report times, and release schedules directly to your family members&apos; Apple Calendar or Google Calendar.
                  </p>
                </div>
              </div>

              {/* Share URL Box */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-slate-900">Your Private Family Subscription URL</span>
                  <span className="text-[10px] text-emerald-700 font-bold bg-emerald-100 px-2 py-0.5 rounded-full">
                    Live Auto-Sync
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={`https://crewschedulepro.app/api/ical?token=crew-${userProfile?.employeeId || "742840"}-live`}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono text-slate-800 select-all focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleCopyShareLink}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0 active-press shadow-2xs"
                  >
                    {shareCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    <span>{shareCopied ? "Copied!" : "Copy Link"}</span>
                  </button>
                </div>
              </div>

              {/* Direct .ics File Export */}
              <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200 rounded-2xl">
                <div className="flex items-center gap-2.5">
                  <Download className="w-5 h-5 text-sky-600" />
                  <div>
                    <span className="text-xs font-extrabold text-slate-900 block">Direct .ICS Calendar File</span>
                    <span className="text-[10px] text-slate-500 font-medium">Download offline snapshot file for manual import</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => downloadRosterIcsFile(sequences, payRates)}
                  className="px-3.5 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 shadow-2xs active-press"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download .ICS</span>
                </button>
              </div>

              {/* Reset to Clean Defaults */}
              <div className="flex items-center justify-between p-3.5 bg-rose-50/80 border border-rose-200 rounded-2xl">
                <div className="flex items-center gap-2.5">
                  <RotateCcw className="w-5 h-5 text-rose-600" />
                  <div>
                    <span className="text-xs font-extrabold text-rose-950 block">Reset Calendar & Clear Cache</span>
                    <span className="text-[10px] text-rose-700 font-medium">Restore clean schedule defaults and clear test data</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (confirm("Reset calendar and restore clean live schedule defaults?")) {
                      resetScheduleToDefaults();
                      onClose();
                    }
                  }}
                  className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 shadow-2xs active-press"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 border-t border-slate-200 p-4 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-extrabold text-xs rounded-xl transition cursor-pointer shadow-sm active-press"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
