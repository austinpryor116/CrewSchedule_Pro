"use client";

import { useCrewStore } from "../../store/useCrewStore";
import {
  SlidersHorizontal,
  X,
  Eye,
  EyeOff,
  Rss,
  Filter,
  CheckCircle2,
  Calendar,
  Layers,
  Trash2,
} from "lucide-react";

interface GridFilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  filterMode: "all" | "trips" | "off" | "high-credit";
  setFilterMode: (mode: "all" | "trips" | "off" | "high-credit") => void;
  activeTimezone: string;
  setActiveTimezone: (tz: string) => void;
  setIsSyncModalOpen: (open: boolean) => void;
  currentDate?: Date;
  setCurrentDate?: (date: Date) => void;
  sequencesCount?: number;
}

export default function GridFilterModal({
  isOpen,
  onClose,
  filterMode,
  setFilterMode,
  setIsSyncModalOpen,
  currentDate,
  setCurrentDate,
  sequencesCount = 0,
}: GridFilterModalProps) {
  const showOpenTimeOverlay = useCrewStore((state) => state.showOpenTimeOverlay);
  const setShowOpenTimeOverlay = useCrewStore((state) => state.setShowOpenTimeOverlay);
  const showDtsDropped = useCrewStore((state) => state.showDtsDropped);
  const toggleShowDtsDropped = useCrewStore((state) => state.toggleShowDtsDropped);
  const subscribedCalendars = useCrewStore((state) => state.subscribedCalendars || []);
  const toggleSubscribedCal = useCrewStore((state) => state.toggleSubscribedCalendar);
  const removeSubscribedCal = useCrewStore((state) => state.removeSubscribedCalendar);
  const updateSubscribedCalColor = useCrewStore((state) => state.updateSubscribedCalendarColor);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100002] bg-slate-950/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fadeIn font-sans">
      <div className="bg-white text-slate-900 rounded-t-3xl sm:rounded-3xl border-t sm:border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden flex flex-col max-h-[92vh] pb-[calc(1rem+env(safe-area-inset-bottom,0px))] animate-slideUp">
        {/* Modal Header */}
        <div className="bg-white border-b border-slate-200 text-slate-900 p-4 sm:p-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 sm:p-2.5 bg-sky-100 border border-sky-200 rounded-2xl text-sky-700 shrink-0">
              <SlidersHorizontal className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <h3 className="text-base font-black tracking-tight text-slate-900 leading-tight">Calendar Options & Settings</h3>
              <p className="text-xs text-slate-500 font-medium">Customize view, filters, overlays, and feeds</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-900 p-2 rounded-xl hover:bg-slate-100 transition cursor-pointer active-press"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-5 sm:p-6 space-y-6 overflow-y-auto max-h-[75vh] text-xs scrollbar-thin bg-white">
          {/* Quick Month Jump */}
          {setCurrentDate && currentDate && (
            <div className="space-y-2">
              <label className="text-[11px] font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Calendar className="w-4 h-4 text-sky-600" />
                Quick Month Jump
              </label>
              <div className="flex items-center gap-2">
                {[
                  { label: "July 2026", year: 2026, month: 6, day: 20 },
                  { label: "August 2026", year: 2026, month: 7, day: 15 },
                ].map((m) => {
                  const isActive = currentDate.getFullYear() === m.year && currentDate.getMonth() === m.month;
                  return (
                    <button
                      key={m.label}
                      onClick={() => setCurrentDate(new Date(m.year, m.month, m.day))}
                      className={`flex-1 py-2.5 px-3 rounded-xl border text-xs font-bold transition cursor-pointer ${
                        isActive
                          ? "bg-sky-600 text-white border-sky-600 shadow-sm"
                          : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      {m.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Schedule Display Filters */}
          <div className="space-y-2">
            <label className="text-[11px] font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Filter className="w-4 h-4 text-sky-600" />
              Schedule Display Filter
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: "all", label: "All Items", desc: "Trips, DFP & Events" },
                { id: "trips", label: "Trips Only", desc: `Active Sequences (${sequencesCount})` },
                { id: "off", label: "Off Days Only", desc: "Days Free of Duty" },
                { id: "high-credit", label: "High Credit > 5h", desc: "High value sequences" },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => setFilterMode(item.id as any)}
                  className={`p-3 rounded-2xl border text-left transition cursor-pointer ${
                    filterMode === item.id
                      ? "bg-sky-50 border-2 border-sky-600 text-slate-900 shadow-sm"
                      : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-xs block text-slate-900">{item.label}</span>
                    {filterMode === item.id && <CheckCircle2 className="w-4 h-4 text-sky-600" />}
                  </div>
                  <span className="text-[10px] text-slate-500 font-medium mt-0.5 block">{item.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Overlays & DTS Dropped Sequences */}
          <div className="space-y-2">
            <label className="text-[11px] font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Layers className="w-4 h-4 text-sky-600" />
              Schedule Overlays & Rules
            </label>

            <div className="space-y-2">
              {/* DTS Dropped Sequences Toggle */}
              <div className="flex items-center justify-between p-3.5 bg-rose-50 border border-rose-200 rounded-2xl">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-xs text-rose-950">Show DTS Dropped Sequences</span>
                    <span className="px-1.5 py-0.2 bg-rose-200 text-rose-900 font-mono text-[9px] font-black rounded">
                      DTS
                    </span>
                  </div>
                  <p className="text-[11px] text-rose-800 leading-tight">
                    Display sequences removed by Crew Schedule due to vacation overlap with red strikethrough.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={toggleShowDtsDropped}
                  className={`p-2 rounded-xl transition cursor-pointer ${
                    showDtsDropped
                      ? "bg-rose-600 text-white shadow-2xs"
                      : "bg-white text-slate-400 border border-slate-300"
                  }`}
                >
                  {showDtsDropped ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </button>
              </div>

              {/* Open Time Marketplace Overlay */}
              <div className="flex items-center justify-between p-3.5 bg-sky-50 border border-sky-200 rounded-2xl">
                <div className="space-y-0.5">
                  <span className="font-extrabold text-xs text-sky-950 block">Open Time Overlay</span>
                  <p className="text-[11px] text-sky-800 leading-tight">
                    Overlay open trips directly onto your calendar grid to simulate pickups.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowOpenTimeOverlay(!showOpenTimeOverlay)}
                  className={`p-2 rounded-xl transition cursor-pointer ${
                    showOpenTimeOverlay
                      ? "bg-sky-600 text-white shadow-2xs"
                      : "bg-white text-slate-400 border border-slate-300"
                  }`}
                >
                  {showOpenTimeOverlay ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          {/* Subscribed External Calendar Feeds */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Rss className="w-4 h-4 text-sky-600" />
                Subscribed Feeds ({subscribedCalendars.length})
              </label>

              <button
                onClick={() => {
                  onClose();
                  setIsSyncModalOpen(true);
                }}
                className="text-[11px] font-bold text-sky-700 hover:text-sky-900 hover:underline cursor-pointer"
              >
                + Manage Feeds
              </button>
            </div>

            {subscribedCalendars.length === 0 ? (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-center text-slate-500">
                <p className="text-xs">No external calendar feeds subscribed.</p>
                <button
                  onClick={() => {
                    onClose();
                    setIsSyncModalOpen(true);
                  }}
                  className="mt-2 text-xs text-sky-700 font-extrabold hover:underline"
                >
                  + Subscribe to Google / Outlook iCal feed
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {subscribedCalendars.map((cal) => (
                  <div
                    key={cal.id}
                    className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-2xl"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <button
                        onClick={() => toggleSubscribedCal(cal.id)}
                        className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 cursor-pointer ${
                          cal.enabled ? "bg-sky-600 border-sky-600" : "border-slate-400 bg-transparent"
                        }`}
                      >
                        {cal.enabled && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                      </button>

                      <div className="min-w-0">
                        <span className="font-extrabold text-xs text-slate-900 block truncate">{cal.name}</span>
                        <span className="text-[10px] text-slate-500 font-mono block">
                          Last sync: {cal.lastSyncedAt || "Active"}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {/* Color Selector */}
                      <div className="flex items-center gap-1">
                        {["purple", "emerald", "amber", "rose", "sky"].map((c) => (
                          <button
                            key={c}
                            onClick={() => updateSubscribedCalColor(cal.id, c)}
                            className={`w-3.5 h-3.5 rounded-full transition cursor-pointer ${
                              cal.color === c ? "ring-2 ring-sky-600 ring-offset-1" : "opacity-60 hover:opacity-100"
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

                      <button
                        onClick={() => removeSubscribedCal(cal.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-white transition cursor-pointer"
                        title="Unsubscribe feed"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 border-t border-slate-200 p-4 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-extrabold text-xs rounded-xl transition cursor-pointer shadow-sm active-press"
          >
            Apply & Close
          </button>
        </div>
      </div>
    </div>
  );
}
