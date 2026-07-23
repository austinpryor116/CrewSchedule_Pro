"use client";

import { useState } from "react";
import { useCrewStore } from "../../store/useCrewStore";
import { Settings, Clock, Plus, Trash2, RotateCcw, ShieldCheck, Check, Building2, Award } from "lucide-react";

export default function SettingsTab() {
  const stationTurnLimits = useCrewStore((state) => state.stationTurnLimits);
  const defaultTurnLimit = useCrewStore((state) => state.defaultTurnLimit);
  const highCreditThresholdHours = useCrewStore((state) => state.highCreditThresholdHours);
  const setStationTurnLimit = useCrewStore((state) => state.setStationTurnLimit);
  const removeStationTurnLimit = useCrewStore((state) => state.removeStationTurnLimit);
  const setDefaultTurnLimit = useCrewStore((state) => state.setDefaultTurnLimit);
  const resetStationTurnLimits = useCrewStore((state) => state.resetStationTurnLimits);
  const setHighCreditThresholdHours = useCrewStore((state) => state.setHighCreditThresholdHours);

  const [newStation, setNewStation] = useState("");
  const [newMinutes, setNewMinutes] = useState(40);
  const [showSavedToast, setShowSavedToast] = useState(false);

  const triggerToast = () => {
    setShowSavedToast(true);
    setTimeout(() => setShowSavedToast(false), 2000);
  };

  const handleAddStation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStation.trim()) return;
    const stationCode = newStation.trim().toUpperCase();
    setStationTurnLimit(stationCode, Number(newMinutes) || 40);
    setNewStation("");
    setNewMinutes(40);
    triggerToast();
  };

  const stations = Object.entries(stationTurnLimits);

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-12">
      {/* Toast Notification */}
      {showSavedToast && (
        <div className="fixed bottom-6 right-6 bg-emerald-500 text-slate-950 font-bold px-4 py-2.5 rounded-2xl shadow-2xl flex items-center gap-2 text-xs animate-bounce z-50">
          <Check className="w-4 h-4 stroke-[3]" />
          <span>Turn limit settings saved!</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 p-6 md:p-8 rounded-3xl shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold">
            <Settings className="w-3.5 h-3.5" />
            <span>Airline Configuration & Station Rules</span>
          </div>
          <h2 className="text-2xl md:text-3xl font-extrabold text-slate-100 tracking-tight">
            System Settings & Turn Limits
          </h2>
          <p className="text-slate-400 text-xs md:text-sm max-w-2xl leading-relaxed">
            Customize minimum station turn connection limits (ORD, DFW, MIA, PHX, DCA, etc.) and fallback legal thresholds. All settings persist in your browser and drive the real-time FAR 117 Legality Engine.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Station Limits Column */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-800/80 rounded-3xl p-6 shadow-xl space-y-6">
            <div className="flex justify-between items-center pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <Building2 className="w-5 h-5 text-indigo-400" />
                <div>
                  <h3 className="text-sm font-bold text-slate-200">Station Turn Time Limits</h3>
                  <p className="text-[11px] text-slate-400">Minimum connection time (minutes) required between turns</p>
                </div>
              </div>
              <button
                onClick={() => {
                  resetStationTurnLimits();
                  triggerToast();
                }}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium border border-slate-700/60 transition flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset Defaults
              </button>
            </div>

            {/* Station Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {stations.map(([station, limitMins]) => (
                <div
                  key={station}
                  className="p-4 bg-slate-950/40 border border-slate-800/80 rounded-2xl space-y-3 relative group"
                >
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-indigo-950/80 text-indigo-400 border border-indigo-900/50 flex items-center justify-center font-mono font-bold text-xs">
                        {station}
                      </div>
                      <div>
                        <span className="text-xs font-bold text-slate-200">{station} Station</span>
                        <p className="text-[10px] text-slate-500">Min Turn Threshold</p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        removeStationTurnLimit(station);
                        triggerToast();
                      }}
                      title={`Remove ${station} override`}
                      className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-950/30 rounded-lg transition opacity-60 group-hover:opacity-100 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      min={10}
                      max={180}
                      value={limitMins}
                      onChange={(e) => {
                        setStationTurnLimit(station, Number(e.target.value) || 0);
                        triggerToast();
                      }}
                      className="w-20 bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs font-mono font-bold text-slate-200 text-center focus:outline-none focus:border-indigo-500"
                    />
                    <span className="text-xs font-medium text-slate-400">minutes</span>

                    <div className="flex items-center gap-1 ml-auto">
                      <button
                        onClick={() => {
                          setStationTurnLimit(station, Math.max(10, limitMins - 5));
                          triggerToast();
                        }}
                        className="w-6 h-6 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md text-xs font-bold transition flex items-center justify-center cursor-pointer"
                      >
                        -5
                      </button>
                      <button
                        onClick={() => {
                          setStationTurnLimit(station, limitMins + 5);
                          triggerToast();
                        }}
                        className="w-6 h-6 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md text-xs font-bold transition flex items-center justify-center cursor-pointer"
                      >
                        +5
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Add Custom Station Form */}
            <form
              onSubmit={handleAddStation}
              className="p-4 bg-slate-950/30 border border-indigo-900/30 rounded-2xl space-y-3"
            >
              <h4 className="text-xs font-bold text-indigo-300 flex items-center gap-1.5">
                <Plus className="w-3.5 h-3.5" />
                Add Station Override
              </h4>

              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  placeholder="Station (e.g. LGA, SFO)"
                  maxLength={4}
                  value={newStation}
                  onChange={(e) => setNewStation(e.target.value)}
                  className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono font-bold uppercase text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
                />
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={10}
                    max={180}
                    value={newMinutes}
                    onChange={(e) => setNewMinutes(Number(e.target.value) || 40)}
                    className="w-24 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-200 text-center focus:outline-none focus:border-indigo-500"
                  />
                  <span className="text-xs text-slate-400">mins</span>
                </div>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition cursor-pointer shrink-0"
                >
                  Add Station
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Sidebar Options */}
        <div className="space-y-6">
          {/* Default Turn Limit Card */}
          <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-800/80 rounded-3xl p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-800">
              <Clock className="w-5 h-5 text-amber-400" />
              <div>
                <h3 className="text-sm font-bold text-slate-200">Default Station Fallback</h3>
                <p className="text-[11px] text-slate-400">Used for stations without explicit overrides</p>
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-xs font-medium text-slate-300 block">
                Fallback Turn Time Limit
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min={10}
                  max={180}
                  value={defaultTurnLimit}
                  onChange={(e) => {
                    setDefaultTurnLimit(Number(e.target.value) || 40);
                    triggerToast();
                  }}
                  className="w-24 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-200 text-center focus:outline-none focus:border-amber-500"
                />
                <span className="text-xs text-slate-400">minutes</span>
              </div>
            </div>
          </div>

          {/* High Credit Trip Threshold Card */}
          <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-800/80 rounded-3xl p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-800">
              <Award className="w-5 h-5 text-amber-400" />
              <div>
                <h3 className="text-sm font-bold text-slate-200">High Credit Trip Threshold</h3>
                <p className="text-[11px] text-slate-400">Minimum credit hours to trigger High Credit tag</p>
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-xs font-medium text-slate-300 block">
                Credit Threshold (Hours)
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min={1}
                  max={50}
                  step={0.5}
                  value={highCreditThresholdHours}
                  onChange={(e) => {
                    setHighCreditThresholdHours(Number(e.target.value) || 15);
                    triggerToast();
                  }}
                  className="w-24 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-200 text-center focus:outline-none focus:border-amber-500"
                />
                <span className="text-xs text-slate-400">hours</span>

                <div className="flex items-center gap-1 ml-auto">
                  <button
                    onClick={() => {
                      setHighCreditThresholdHours(Math.max(1, highCreditThresholdHours - 1));
                      triggerToast();
                    }}
                    className="w-7 h-7 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md text-xs font-bold transition flex items-center justify-center cursor-pointer"
                  >
                    -1h
                  </button>
                  <button
                    onClick={() => {
                      setHighCreditThresholdHours(highCreditThresholdHours + 1);
                      triggerToast();
                    }}
                    className="w-7 h-7 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md text-xs font-bold transition flex items-center justify-center cursor-pointer"
                  >
                    +1h
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* CBA Info Card */}
          <div className="bg-indigo-950/20 border border-indigo-900/40 rounded-3xl p-6 space-y-3 text-xs text-slate-300">
            <div className="flex items-center gap-2 text-indigo-400 font-bold">
              <ShieldCheck className="w-4 h-4" />
              <span>Contract & Legal Notice</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Updating turn time limits instantly re-evaluates all Open Time sequence conflict scores across your calendar and inspector views. Contract changes take effect immediately without requiring app restarts.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
