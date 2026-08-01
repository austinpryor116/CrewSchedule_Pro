"use client";

import { useState } from "react";
import { useCrewStore } from "../../store/useCrewStore";
import { X, Calendar as CalendarIcon, SlidersHorizontal, Eye, EyeOff, ShoppingBag, Palmtree, Clock, Check, Plus, RefreshCw, Rss, ShieldCheck, FileSpreadsheet, Trash2, Link, Loader2 } from "lucide-react";
import { fetchRemoteIcsFeed, parseIcsText } from "../../lib/icalExporter";
import { PersonalCalendarEvent } from "../../types";

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
  const [activeTab, setActiveTabSection] = useState<"filters" | "opentime" | "vacation" | "calendars">("filters");

  const showOpenTimeOverlay = useCrewStore((state) => state.showOpenTimeOverlay);
  const setShowOpenTimeOverlay = useCrewStore((state) => state.setShowOpenTimeOverlay);
  const openTimeFilter = useCrewStore((state) => state.openTimeFilter);
  const setOpenTimeFilter = (filter: string) => useCrewStore.setState({ openTimeFilter: filter });
  const openTimePresets = useCrewStore((state) => state.openTimePresets);

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
  const [isVacSaved, setIsVacSaved] = useState(false);

  if (!isOpen) return null;

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
    if (typeof window !== "undefined") {
      localStorage.setItem("crewschedule_vacations", JSON.stringify(updated));
    }
    setIsVacSaved(true);
    setTimeout(() => setIsVacSaved(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-[100000] flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-md animate-fadeIn">
      <div
        className="fixed inset-0"
        onClick={onClose}
      />
      <div className="relative w-full max-w-xl bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] z-10 animate-slideUp text-slate-900 font-sans">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-sky-600 text-white rounded-2xl shadow-sm">
              <SlidersHorizontal className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                Calendar Tools & Controls
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Manage schedule filters, open time, vacation blocks & feeds
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-900 rounded-xl hover:bg-slate-200/60 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 bg-slate-100/70 p-1 shrink-0 gap-1 overflow-x-auto scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveTabSection("filters")}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-extrabold transition shrink-0 flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === "filters"
                ? "bg-white text-sky-700 shadow-sm border border-slate-200"
                : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
            }`}
          >
            <CalendarIcon className="w-3.5 h-3.5 text-sky-600" />
            Display & Filters
          </button>

          <button
            type="button"
            onClick={() => setActiveTabSection("opentime")}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-extrabold transition shrink-0 flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === "opentime"
                ? "bg-white text-amber-700 shadow-sm border border-slate-200"
                : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5 text-amber-600" />
            Open Time
          </button>

          <button
            type="button"
            onClick={() => setActiveTabSection("vacation")}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-extrabold transition shrink-0 flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === "vacation"
                ? "bg-white text-emerald-700 shadow-sm border border-slate-200"
                : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
            }`}
          >
            <Palmtree className="w-3.5 h-3.5 text-emerald-600" />
            Vacation Manager
          </button>

          <button
            type="button"
            onClick={() => setActiveTabSection("calendars")}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-extrabold transition shrink-0 flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === "calendars"
                ? "bg-white text-purple-700 shadow-sm border border-slate-200"
                : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
            }`}
          >
            <Rss className="w-3.5 h-3.5 text-purple-600" />
            External Feeds
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="p-4 sm:p-5 overflow-y-auto scrollbar-thin flex-grow space-y-5">
          {/* TAB 1: Display & Filters */}
          {activeTab === "filters" && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-extrabold text-slate-700 uppercase tracking-wider block mb-2">
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
                <label className="text-xs font-extrabold text-slate-700 uppercase tracking-wider block mb-2">
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
                          ? "bg-sky-100 text-sky-900 border-sky-400 font-black shadow-xs"
                          : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200">
                <label className="text-xs font-extrabold text-slate-700 uppercase tracking-wider block mb-2">
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
                      <span className="text-xs font-extrabold text-slate-800 block">
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
              <div className="flex items-center justify-between p-3.5 bg-amber-50/70 border border-amber-300 rounded-2xl">
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
                <label className="text-xs font-extrabold text-slate-700 uppercase tracking-wider block mb-2">
                  Open Time Filtering Presets
                </label>
                <div className="space-y-1.5">
                  {openTimePresets.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => setOpenTimeFilter(preset.id)}
                      className={`w-full p-2.5 rounded-2xl border text-left text-xs font-bold transition flex items-center justify-between cursor-pointer ${
                        openTimeFilter === preset.id
                          ? "bg-amber-100 text-amber-950 border-amber-400 font-black shadow-xs"
                          : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      <span>{preset.name}</span>
                      {openTimeFilter === preset.id && <Check className="w-4 h-4 text-amber-700" />}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Vacation Manager */}
          {activeTab === "vacation" && (
            <form onSubmit={handleSaveVacation} className="space-y-4">
              <div className="p-3.5 bg-emerald-50 border border-emerald-300 rounded-2xl">
                <div className="flex items-center gap-2 mb-1">
                  <Palmtree className="w-4 h-4 text-emerald-600" />
                  <h4 className="text-xs font-black text-emerald-950 uppercase tracking-wider">
                    Active Scheduled Vacation Block
                  </h4>
                </div>
                <p className="text-[11px] text-emerald-800 font-medium">
                  Configured from August 1st to August 7th (7 Days • 24.50 Hours Pay Credit).
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Vacation Start Date</label>
                  <input
                    type="date"
                    value={vacStart}
                    onChange={(e) => setVacStart(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Vacation End Date</label>
                  <input
                    type="date"
                    value={vacEnd}
                    onChange={(e) => setVacEnd(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Vacation Pay Credit (Hours)</label>
                <input
                  type="number"
                  step="0.1"
                  value={vacCredit}
                  onChange={(e) => setVacCredit(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
              >
                <Check className="w-4 h-4" />
                {isVacSaved ? "Vacation Saved!" : "Update Vacation Dates"}
              </button>

              <div className="pt-3 border-t border-slate-200">
                <label className="text-xs font-extrabold text-slate-700 uppercase tracking-wider block mb-2">
                  Schedule Studio Quick Actions
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab("import");
                      onClose();
                    }}
                    className="py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-sky-600" />
                    Parser & Import
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab("compliance");
                      onClose();
                    }}
                    className="py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    FAR 117 Audit
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* TAB 4: External Feeds */}
          {activeTab === "calendars" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-xs font-extrabold text-slate-700 uppercase tracking-wider block">
                  Subscribed Calendar Feeds ({subscribedCalendars.length})
                </label>
                <button
                  type="button"
                  onClick={() => setShowAddFeedForm(!showAddFeedForm)}
                  className="px-2.5 py-1 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Feed
                </button>
              </div>

              {/* Add Feed Inline Form */}
              {showAddFeedForm && (
                <form onSubmit={handleCreateFeed} className="p-3 bg-slate-100 border border-slate-300 rounded-2xl space-y-3 animate-fadeIn">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5">
                      <Link className="w-3.5 h-3.5 text-sky-600" />
                      Add External iCal Feed
                    </span>
                    <button type="button" onClick={() => setShowAddFeedForm(false)} className="text-slate-500 hover:text-slate-900">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div>
                    <input
                      type="text"
                      placeholder="Feed Name (e.g. Personal iCal / Google Calendar)"
                      value={newFeedName}
                      onChange={(e) => setNewFeedName(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-sky-600"
                      required
                    />
                  </div>
                  <div>
                    <input
                      type="url"
                      placeholder="Feed URL (https://... or webcal://...)"
                      value={newFeedUrl}
                      onChange={(e) => setNewFeedUrl(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-sky-600"
                    />
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      {["purple", "teal", "sky", "amber", "rose", "emerald"].map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setNewFeedColor(c)}
                          className={`w-5 h-5 rounded-full border ${
                            newFeedColor === c ? "ring-2 ring-sky-500 ring-offset-1 scale-110" : ""
                          } ${
                            c === "purple"
                              ? "bg-purple-500"
                              : c === "teal"
                              ? "bg-teal-500"
                              : c === "sky"
                              ? "bg-sky-500"
                              : c === "amber"
                              ? "bg-amber-500"
                              : c === "rose"
                              ? "bg-rose-500"
                              : "bg-emerald-500"
                          }`}
                        />
                      ))}
                    </div>
                    <button
                      type="submit"
                      disabled={isFetchingFeed}
                      className="px-3.5 py-1.5 bg-sky-600 hover:bg-sky-700 disabled:bg-sky-400 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                    >
                      {isFetchingFeed && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      {isFetchingFeed ? "Fetching Feed..." : "Subscribe"}
                    </button>
                  </div>
                </form>
              )}

              <div className="space-y-2">
                {subscribedCalendars.length === 0 ? (
                  <div className="p-4 bg-slate-50 border border-dashed border-slate-300 rounded-2xl text-center text-xs text-slate-500">
                    No active calendar feeds. Click <strong>Add Feed</strong> above to subscribe.
                  </div>
                ) : (
                  subscribedCalendars.map((cal) => (
                    <div
                      key={cal.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-2xl gap-2.5"
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <div className="flex items-center gap-1 shrink-0">
                          {["purple", "teal", "sky", "amber", "rose", "emerald"].map((c) => (
                            <button
                              key={c}
                              type="button"
                              onClick={() => updateSubscribedCalColor(cal.id, c)}
                              className={`w-3.5 h-3.5 rounded-full border transition cursor-pointer ${
                                cal.color === c ? "ring-2 ring-sky-500 scale-125 z-10" : "opacity-60 hover:opacity-100"
                              } ${
                                c === "purple"
                                  ? "bg-purple-500"
                                  : c === "teal"
                                  ? "bg-teal-500"
                                  : c === "sky"
                                  ? "bg-sky-500"
                                  : c === "amber"
                                  ? "bg-amber-500"
                                  : c === "rose"
                                  ? "bg-rose-500"
                                  : "bg-emerald-500"
                              }`}
                              title={`Change color to ${c}`}
                            />
                          ))}
                        </div>

                        <div className="truncate min-w-0">
                          <span className="text-xs font-extrabold text-slate-900 block truncate">{cal.name}</span>
                          <span className="text-[10px] text-slate-500 font-medium">
                            Synced: {cal.lastSyncedAt || "Live"}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-2 shrink-0">
                        {/* Toggle Switch */}
                        <button
                          type="button"
                          onClick={() => toggleSubscribedCal(cal.id)}
                          className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                            cal.enabled ? "bg-purple-600" : "bg-slate-300"
                          }`}
                          title={cal.enabled ? "Disable feed" : "Enable feed"}
                        >
                          <span
                            className={`block w-4 h-4 rounded-full bg-white transition-transform absolute top-1 ${
                              cal.enabled ? "left-6" : "left-1"
                            }`}
                          />
                        </button>

                        {/* Delete Feed Button */}
                        <button
                          type="button"
                          onClick={() => removeSubscribedCal(cal.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer"
                          title="Delete calendar feed"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="py-2 px-4 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-extrabold transition shadow-sm cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
