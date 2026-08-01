"use client";

import { useCrewStore } from "../../store/useCrewStore";
import {
  SlidersHorizontal,
  X,
  Eye,
  EyeOff,
  Rss,
  Globe,
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
  activeTimezone,
  setActiveTimezone,
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
    <div className="fixed inset-0 z-[100002] bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-sky-500/20 border border-sky-400/30 rounded-2xl text-sky-400">
              <SlidersHorizontal className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black tracking-tight text-white">Calendar Options & Settings</h3>
              <p className="text-xs text-slate-400 font-medium">Customize view, filters, overlays, and subscribed feeds</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 space-y-6 overflow-y-auto max-h-[75vh] text-xs">
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
                          ? "bg-sky-600 text-white border-sky-700 shadow-sm"
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

          {/* 1. Schedule Filter Mode */}
          <div className="space-y-2">
            <label className="text-[11px] font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Filter className="w-4 h-4 text-sky-600" />
              Schedule Display Filter
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: "all", label: "All Days & Trips" },
                { id: "trips", label: "Trips Only" },
                { id: "off", label: "DFP / Off Days Only" },
                { id: "high-credit", label: "High Credit (>14h)" },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => setFilterMode(item.id as any)}
                  className={`p-3 rounded-2xl border text-left font-bold transition flex items-center justify-between cursor-pointer ${
                    filterMode === item.id
                      ? "bg-sky-600 text-white border-sky-700 shadow-md shadow-sky-600/20"
                      : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <span>{item.label}</span>
                  {filterMode === item.id && <CheckCircle2 className="w-4 h-4 text-white" />}
                </button>
              ))}
            </div>
          </div>

          {/* 2. Grid Overlays & DTS Dropped */}
          <div className="space-y-2">
            <label className="text-[11px] font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Eye className="w-4 h-4 text-amber-600" />
              Overlays & Dropped Sequences
            </label>

            <div className="space-y-2">
              <button
                onClick={toggleShowDtsDropped}
                className={`w-full p-3 rounded-2xl border text-left font-bold transition flex items-center justify-between cursor-pointer ${
                  showDtsDropped
                    ? "bg-amber-100 border-amber-300 text-amber-950 font-black"
                    : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  {showDtsDropped ? <Eye className="w-4 h-4 text-amber-600" /> : <EyeOff className="w-4 h-4 text-slate-400" />}
                  <span>DTS Dropped Sequences</span>
                </div>
                <span className="text-[10px] font-bold opacity-75">{showDtsDropped ? "Showing on Grid" : "Hidden"}</span>
              </button>

              <button
                onClick={() => setShowOpenTimeOverlay(!showOpenTimeOverlay)}
                className={`w-full p-3 rounded-2xl border text-left font-bold transition flex items-center justify-between cursor-pointer ${
                  showOpenTimeOverlay
                    ? "bg-sky-100 border-sky-300 text-sky-950 font-black"
                    : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  {showOpenTimeOverlay ? <Eye className="w-4 h-4 text-sky-600" /> : <EyeOff className="w-4 h-4 text-slate-400" />}
                  <span>Open Time Marketplace Ghost Overlay</span>
                </div>
                <span className="text-[10px] font-bold opacity-75">{showOpenTimeOverlay ? "Showing on Grid" : "Hidden"}</span>
              </button>
            </div>
          </div>

          {/* 3. Subscribed Personal Calendar Feeds */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Rss className="w-4 h-4 text-purple-600" />
                Subscribed Feeds ({subscribedCalendars.length})
              </label>
              <button
                onClick={() => {
                  onClose();
                  setIsSyncModalOpen(true);
                }}
                className="text-purple-700 hover:text-purple-900 font-bold text-[11px] hover:underline cursor-pointer"
              >
                Manage Feeds & ICS
              </button>
            </div>

            <div className="space-y-2">
              {subscribedCalendars.map((cal) => (
                <div
                  key={cal.id}
                  className={`w-full p-2.5 rounded-2xl border text-left font-bold transition flex items-center justify-between gap-2 ${
                    cal.enabled
                      ? "bg-white border-slate-300 text-slate-900 shadow-xs"
                      : "bg-slate-50 border-slate-200 text-slate-400 line-through"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => toggleSubscribedCal(cal.id)}
                    className="flex-1 flex items-center justify-between cursor-pointer truncate"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <div className="flex items-center gap-1 shrink-0">
                        {["purple", "teal", "sky", "amber", "rose", "emerald"].map((c) => (
                          <span
                            key={c}
                            onClick={(e) => {
                              e.stopPropagation();
                              updateSubscribedCalColor(cal.id, c);
                            }}
                            className={`w-3 h-3 rounded-full border transition cursor-pointer ${
                              cal.color === c ? "ring-2 ring-sky-500 scale-125 z-10" : "opacity-50 hover:opacity-100"
                            } ${
                              c === "purple"
                                ? "bg-purple-600"
                                : c === "teal"
                                ? "bg-teal-600"
                                : c === "sky"
                                ? "bg-sky-600"
                                : c === "amber"
                                ? "bg-amber-600"
                                : c === "rose"
                                ? "bg-rose-600"
                                : "bg-emerald-600"
                            }`}
                          />
                        ))}
                      </div>
                      <span className="truncate">{cal.name}</span>
                    </div>
                    <span className="text-[10px] font-bold shrink-0 mr-1">{cal.enabled ? "Enabled" : "Disabled"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => removeSubscribedCal(cal.id)}
                    className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer shrink-0"
                    title="Delete calendar feed"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* 4. Roster Legend */}
          <div className="space-y-2 pt-2 border-t border-slate-200">
            <label className="text-[11px] font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Layers className="w-4 h-4 text-slate-700" />
              Calendar Legend & Indicators
            </label>
            <div className="grid grid-cols-2 gap-2 text-[11px] font-bold">
              <div className="p-2.5 bg-sky-50 border border-sky-200 rounded-xl text-sky-950 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-sky-600 shrink-0" />
                <span>Line Sequence</span>
              </div>
              <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-950 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-600 shrink-0" />
                <span>Overtime / High Credit</span>
              </div>
              <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-950 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-600 shrink-0" />
                <span>Traded / DTS Drop</span>
              </div>
              <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-950 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 shrink-0" />
                <span>Vacation Block</span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 border-t border-slate-200 p-4 flex items-center justify-between">
          <span className="text-xs text-slate-500 font-mono font-bold">
            {sequencesCount} Active Sequences
          </span>
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition cursor-pointer"
          >
            Done & Apply
          </button>
        </div>
      </div>
    </div>
  );
}
