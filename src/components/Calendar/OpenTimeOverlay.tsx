"use client";

import { useState, useMemo } from "react";
import { useCrewStore } from "../../store/useCrewStore";
import { checkOpenSequenceConflict } from "../../lib/parser";
import { Award, CheckCircle2, ShieldAlert, Sparkles, Plus, AlertCircle, Ban, Eye, EyeOff, Trash2, X, SlidersHorizontal } from "lucide-react";
import { OpenTimePreset } from "../../types";

const parseTimeToMinutes = (timeStr: string | undefined): number | null => {
  if (!timeStr || !timeStr.trim()) return null;
  const clean = timeStr.replace(/[^0-9]/g, "");
  if (!clean) return null;

  if (clean.length <= 2) {
    const hours = parseInt(clean, 10);
    return isNaN(hours) ? null : hours * 60;
  }

  if (clean.length === 3) {
    const hours = parseInt(clean.slice(0, 1), 10);
    const mins = parseInt(clean.slice(1), 10);
    return isNaN(hours) || isNaN(mins) ? null : hours * 60 + mins;
  }

  const hours = parseInt(clean.slice(0, 2), 10);
  const mins = parseInt(clean.slice(2, 4), 10);
  return isNaN(hours) || isNaN(mins) ? null : hours * 60 + mins;
};

export default function OpenTimeOverlay() {
  const openSequences = useCrewStore((state) => state.openSequences);
  const activeSequences = useCrewStore((state) => state.sequences);
  const simulatedIds = useCrewStore((state) => state.simulatedSequenceIds);
  const toggleSimulate = useCrewStore((state) => state.toggleSimulateSequence);
  const showOverlay = useCrewStore((state) => state.showOpenTimeOverlay);
  const setShowOverlay = useCrewStore((state) => state.setShowOpenTimeOverlay);
  const clearSimulated = useCrewStore((state) => state.clearSimulatedSequences);
  const filter = useCrewStore((state) => state.openTimeFilter);
  const setFilter = useCrewStore((state) => state.setOpenTimeFilter);
  const presets = useCrewStore((state) => state.openTimePresets);
  const addPreset = useCrewStore((state) => state.addOpenTimePreset);
  const removePreset = useCrewStore((state) => state.removeOpenTimePreset);
  const stationTurnLimits = useCrewStore((state) => state.stationTurnLimits);
  const defaultTurnLimit = useCrewStore((state) => state.defaultTurnLimit);

  // Custom Preset Builder State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newPresetName, setNewPresetName] = useState("");
  const [newMinCredit, setNewMinCredit] = useState<number | "">(3.0);
  const [newMaxDays, setNewMaxDays] = useState<number | "">(1);
  const [newFitsOnly, setNewFitsOnly] = useState(false);
  const [newBase, setNewBase] = useState("ALL");

  // Process and sort sequences (memoized)
  const processedSeqs = useMemo(() => {
    return openSequences.map((ot) => {
      const conflict = checkOpenSequenceConflict(ot, activeSequences, stationTurnLimits, defaultTurnLimit);
      const isSimulated = simulatedIds.includes(ot.id);
      return {
        ot,
        conflict,
        isSimulated,
      };
    });
  }, [openSequences, activeSequences, simulatedIds, stationTurnLimits, defaultTurnLimit]);

  const passesPresetFilter = (ot: any, conflict: any, isSimulated: boolean, pId: string) => {
    if (pId === "all") return true;
    if (pId === "fits") return !conflict.hasConflict;
    if (pId === "simulated") return isSimulated;
    if (pId === "conflicts") return conflict.hasConflict;

    const preset = presets.find((p) => p.id === pId);
    if (!preset) return true;

    if (preset.fitsOnly && conflict.hasConflict) return false;
    if (preset.minCreditHours && ot.creditHours < preset.minCreditHours) return false;
    if (preset.maxCreditHours && ot.creditHours > preset.maxCreditHours) return false;

    const otRepMins = parseTimeToMinutes(ot.reportTime);
    const otRelMins = parseTimeToMinutes(ot.releaseTime);

    // Report After Time (e.g. "06:00" or "0600")
    if (preset.reportAfterTime) {
      const targetMins = parseTimeToMinutes(preset.reportAfterTime);
      if (targetMins !== null && otRepMins !== null && otRepMins < targetMins) return false;
    }

    // Report Before Time (e.g. "11:30" or "1130")
    if (preset.reportBeforeTime) {
      const targetMins = parseTimeToMinutes(preset.reportBeforeTime);
      if (targetMins !== null && otRepMins !== null && otRepMins > targetMins) return false;
    }

    // Release Before Time (e.g. "19:30" or "1930")
    if (preset.releaseBeforeTime) {
      const targetMins = parseTimeToMinutes(preset.releaseBeforeTime);
      if (targetMins !== null && otRelMins !== null && otRelMins > targetMins) return false;
    }

    // Legacy Report Window
    if (preset.reportWindow && preset.reportWindow !== "ALL") {
      const repH = parseInt(ot.reportTime.slice(0, 2), 10) || 0;
      if (preset.reportWindow === "MORNING" && repH >= 12) return false;
      if (preset.reportWindow === "AFTERNOON" && (repH < 12 || repH >= 18)) return false;
      if (preset.reportWindow === "EVENING" && repH < 18) return false;
    }

    // Trip Days
    if (preset.maxTripDays) {
      const partsStart = ot.startDate.split("-").map(Number);
      const partsEnd = ot.endDate.split("-").map(Number);
      const dStart = new Date(partsStart[0], partsStart[1] - 1, partsStart[2]);
      const dEnd = new Date(partsEnd[0], partsEnd[1] - 1, partsEnd[2]);
      const days = Math.round((dEnd.getTime() - dStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      if (days > preset.maxTripDays) return false;
    }

    // Typable Layover Preferences (e.g. "MIA", "SAN", "BOS", "TURNS")
    if (preset.preferredLayoverCity && preset.preferredLayoverCity.trim() !== "" && preset.preferredLayoverCity !== "ALL") {
      const pref = preset.preferredLayoverCity.trim().toUpperCase();
      const hasLayover = ot.layoverDescription && ot.layoverDescription.trim() !== "" && ot.layoverDescription !== "—";

      if (pref === "TURNS" || pref === "TURNS ONLY" || pref === "NO LAYOVER" || pref === "TURNS_ONLY") {
        if (hasLayover) return false;
      } else {
        if (!hasLayover) return false;
        const cities = pref.split(/[,/\s]+/).filter(Boolean);
        const otLayover = ot.layoverDescription.toUpperCase();
        const matchesAny = cities.some((city) => otLayover.includes(city));
        if (!matchesAny) return false;
      }
    }

    if (preset.baseFilter && preset.baseFilter !== "ALL" && ot.base !== preset.baseFilter) return false;

    return true;
  };

  const getPresetCount = (p: OpenTimePreset) => {
    return processedSeqs.filter(({ ot, conflict, isSimulated }) =>
      passesPresetFilter(ot, conflict, isSimulated, p.id)
    ).length;
  };

  const filteredSeqs = useMemo(() => {
    return processedSeqs.filter(({ ot, conflict, isSimulated }) =>
      passesPresetFilter(ot, conflict, isSimulated, filter)
    );
  }, [processedSeqs, filter, presets]);

  const handleCreatePreset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPresetName.trim()) return;

    const newPreset: OpenTimePreset = {
      id: `preset-${Date.now()}`,
      name: newPresetName.trim(),
      minCreditHours: newMinCredit !== "" ? Number(newMinCredit) : undefined,
      maxTripDays: newMaxDays !== "" ? Number(newMaxDays) : undefined,
      fitsOnly: newFitsOnly,
      baseFilter: newBase,
    };

    addPreset(newPreset);
    setNewPresetName("");
    setShowAddModal(false);
  };

  if (openSequences.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm flex flex-col items-center justify-center text-center h-full min-h-[400px]">
        <Sparkles className="w-12 h-12 text-slate-400 stroke-1 mb-3 animate-pulse" />
        <h3 className="text-lg font-bold text-slate-900">No Open Sequences Loaded</h3>
        <p className="text-xs text-slate-600 max-w-[260px] mt-1.5 leading-relaxed font-sans">
          To simulate pickups, first copy/paste or load the **N4 Open Time** PDF log in the **Parser Studio** tab.
        </p>
      </div>
    );
  }

  const simulatedCount = simulatedIds.length;

  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-4 sm:p-6 shadow-md flex flex-col h-full overflow-hidden relative">
      {/* Header and Grid Toggle */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-600" />
            Open Time Marketplace
          </h2>
          <p className="text-xs text-slate-600 font-sans mt-0.5">
            {openSequences.length} open routes active
          </p>
        </div>

        {/* Calendar Grid Toggle */}
        <button
          onClick={() => setShowOverlay(!showOverlay)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition duration-150 select-none cursor-pointer ${
            showOverlay
              ? "bg-sky-100 border-sky-300 text-sky-900 font-bold"
              : "bg-slate-100 border-slate-200 text-slate-600 hover:text-slate-900"
          }`}
          title="Toggle visibility of ghost sequences directly on the calendar grid"
        >
          {showOverlay ? <Eye className="w-4 h-4 text-sky-600" /> : <EyeOff className="w-4 h-4 text-slate-500" />}
          Grid Overlay
        </button>
      </div>

      {/* Custom Preset Builder Modal */}
      {showAddModal && (
        <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs z-30 p-4 flex items-center justify-center animate-fadeIn">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl w-full max-w-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-sky-600" />
                Create Custom Filter Preset
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreatePreset} className="space-y-3.5 text-xs font-sans">
              <div>
                <label className="font-bold text-slate-800 block mb-1">Preset Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Turns > 3h Credit"
                  value={newPresetName}
                  onChange={(e) => setNewPresetName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-sky-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-800 block mb-1">Min Credit (hrs)</label>
                  <input
                    type="number"
                    min={0}
                    step={0.5}
                    placeholder="e.g. 3.0"
                    value={newMinCredit}
                    onChange={(e) => setNewMinCredit(e.target.value ? Number(e.target.value) : "")}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-sky-600"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-800 block mb-1">Max Duration</label>
                  <select
                    value={newMaxDays}
                    onChange={(e) => setNewMaxDays(e.target.value ? Number(e.target.value) : "")}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-sky-600"
                  >
                    <option value={1}>1-Day Turns Only</option>
                    <option value={2}>Up to 2 Days</option>
                    <option value={3}>Up to 3 Days</option>
                    <option value="">Any Duration</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-800 block mb-1">Base Domicile</label>
                <select
                  value={newBase}
                  onChange={(e) => setNewBase(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold font-mono text-slate-900 focus:outline-none focus:border-sky-600"
                >
                  <option value="ALL">All Domiciles</option>
                  <option value="ORD">ORD Domicile</option>
                  <option value="DFW">DFW Domicile</option>
                  <option value="MIA">MIA Domicile</option>
                  <option value="PHX">PHX Domicile</option>
                </select>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="fitsOnlyCheck"
                  checked={newFitsOnly}
                  onChange={(e) => setNewFitsOnly(e.target.checked)}
                  className="rounded text-sky-600 focus:ring-sky-500 cursor-pointer"
                />
                <label htmlFor="fitsOnlyCheck" className="font-bold text-slate-800 cursor-pointer select-none">
                  Fits Schedule Only (0 Conflicts)
                </label>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl text-xs hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-sky-600 text-white font-bold rounded-xl text-xs hover:bg-sky-700 shadow-sm"
                >
                  Save Preset
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Simulator Summary (if active) */}
      {simulatedCount > 0 && (
        <div className="my-3 p-3 bg-amber-50 border border-amber-300 rounded-2xl flex items-center justify-between text-xs animate-pulse">
          <span className="text-amber-950 font-semibold font-sans">
            Simulating {simulatedCount} picked-up sequence(s) (+1.5x Premium)
          </span>
          <button
            onClick={clearSimulated}
            className="text-[10px] text-slate-600 hover:text-rose-600 font-bold underline cursor-pointer"
          >
            Clear All
          </button>
        </div>
      )}

      {/* Filter Presets Bar */}
      <div className="flex gap-1.5 overflow-x-auto py-3 border-b border-slate-200 scrollbar-none text-[10px] font-bold uppercase tracking-wider shrink-0 font-mono items-center">
        {presets.map((p) => {
          const count = getPresetCount(p);
          const isSelected = filter === p.id;
          const isBuiltIn = ["all", "fits", "simulated", "conflicts"].includes(p.id);

          return (
            <div key={p.id} className="relative group shrink-0 flex items-center">
              <button
                onClick={() => setFilter(p.id)}
                className={`px-3 py-1.5 rounded-xl border transition cursor-pointer flex items-center gap-1.5 ${
                  isSelected
                    ? "bg-sky-600 border-sky-500 text-white font-bold shadow-sm"
                    : "bg-slate-100 border-slate-200 text-slate-700 hover:text-slate-900"
                }`}
              >
                <span>{p.name}</span>
                <span className={`px-1.5 py-0.5 rounded-full text-[9px] ${
                  isSelected ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"
                }`}>
                  {count}
                </span>
              </button>

              {!isBuiltIn && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removePreset(p.id);
                  }}
                  title="Delete Custom Preset"
                  className="ml-1 p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          );
        })}

        <button
          onClick={() => setShowAddModal(true)}
          className="px-2.5 py-1.5 rounded-xl border border-dashed border-sky-400 bg-sky-50 text-sky-700 hover:bg-sky-100 transition shrink-0 cursor-pointer flex items-center gap-1 font-bold"
          title="Create custom open time filter preset"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Preset</span>
        </button>
      </div>

      {/* Roster List */}
      <div className="flex-grow overflow-y-auto scrollbar-thin py-4 space-y-4 font-sans">
        {filteredSeqs.length > 0 ? (
          filteredSeqs.map(({ ot, conflict, isSimulated }) => (
            <div
              key={ot.id}
              className={`p-4 rounded-2xl border transition duration-200 flex flex-col justify-between ${
                isSimulated
                  ? "bg-amber-50 border-amber-400 shadow-sm"
                  : conflict.hasConflict
                  ? "bg-slate-100 border-slate-200 opacity-60"
                  : "bg-slate-50 border-slate-200 hover:border-slate-300"
              }`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-sm font-extrabold text-slate-900">
                    Seq #{ot.sequenceNumber}
                  </span>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-slate-200 text-slate-800">
                    {ot.base || "ORD"}
                  </span>
                </div>

                <p className="text-xs text-slate-600 font-bold mt-1 font-mono">
                  {ot.startDate} ➔ {ot.endDate}
                </p>

                <div className="mt-2 text-xs font-mono font-semibold text-slate-800 flex items-center gap-3">
                  <span>Report: {ot.reportTime}</span>
                  <span>Release: {ot.releaseTime}</span>
                </div>

                <p className="mt-2 text-xs text-slate-700 font-sans line-clamp-2">
                  <span className="font-bold text-slate-900">Routing:</span> {ot.legsDescription}
                </p>

                {ot.layoverDescription && (
                  <p className="mt-1 text-xs text-slate-600 font-sans">
                    <span className="font-bold text-slate-800">Layover:</span> {ot.layoverDescription}
                  </p>
                )}

                {conflict.hasConflict ? (
                  <div className="mt-3 p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-900 text-xs font-semibold space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-rose-700">
                      <ShieldAlert className="w-4 h-4 shrink-0 text-rose-600" />
                      <span>FAA / Schedule Conflict</span>
                    </div>
                    <p className="text-[11px] text-rose-800 leading-tight">
                      • {conflict.reason}
                    </p>
                  </div>
                ) : (
                  <div className="mt-3 p-2 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 text-xs font-semibold flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Clean Schedule Pickup (0 Conflicts)</span>
                  </div>
                )}
              </div>

              <div className="mt-4 flex items-center justify-between pt-3 border-t border-slate-200/80">
                <span className="text-sm font-mono font-extrabold text-slate-900">
                  {ot.creditHours.toFixed(1)} hrs Credit
                </span>

                <button
                  onClick={() => toggleSimulate(ot.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition duration-150 cursor-pointer flex items-center gap-1.5 ${
                    isSimulated
                      ? "bg-rose-600 hover:bg-rose-700 text-white shadow-sm"
                      : "bg-sky-600 hover:bg-sky-700 text-white shadow-sm"
                  }`}
                >
                  {isSimulated ? (
                    <>
                      <Ban className="w-3.5 h-3.5" />
                      Remove
                    </>
                  ) : (
                    <>
                      <Plus className="w-3.5 h-3.5" />
                      Simulate Pickup
                    </>
                  )}
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="p-8 text-center text-slate-500 font-sans text-xs">
            No open sequences match the active filter preset.
          </div>
        )}
      </div>
    </div>
  );
}
