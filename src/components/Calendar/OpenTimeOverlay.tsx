"use client";

import { useState, useMemo } from "react";
import { useCrewStore } from "../../store/useCrewStore";
import { checkOpenSequenceConflict, OpenSequence } from "../../lib/parser";
import { Award, CheckCircle2, ShieldAlert, Sparkles, Plus, AlertCircle, Ban, Eye, EyeOff } from "lucide-react";

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
  const stationTurnLimits = useCrewStore((state) => state.stationTurnLimits);
  const defaultTurnLimit = useCrewStore((state) => state.defaultTurnLimit);

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

  const filteredSeqs = useMemo(() => {
    return processedSeqs.filter(({ conflict, isSimulated }) => {
      if (filter === "fits") return !conflict.hasConflict;
      if (filter === "simulated") return isSimulated;
      if (filter === "conflicts") return conflict.hasConflict;
      return true;
    });
  }, [processedSeqs, filter]);

  if (openSequences.length === 0) {
    return (
      <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-800/80 rounded-3xl p-8 shadow-2xl flex flex-col items-center justify-center text-center h-full min-h-[400px]">
        <Sparkles className="w-12 h-12 text-slate-700 stroke-1 mb-3 animate-pulse" />
        <h3 className="text-lg font-bold text-slate-400">No Open Sequences Loaded</h3>
        <p className="text-xs text-slate-500 max-w-[260px] mt-1.5 leading-relaxed font-sans">
          To simulate pickups, first copy/paste or load the **N4 Open Time** PDF log in the **Parser Studio** tab.
        </p>
      </div>
    );
  }

  const simulatedCount = simulatedIds.length;

  return (
    <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-800/80 rounded-3xl p-6 shadow-2xl flex flex-col h-[65vh] lg:h-[700px] overflow-hidden">
      {/* Header and Grid Toggle */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-500" />
            Open Time Marketplace
          </h2>
          <p className="text-xs text-slate-400 font-sans mt-0.5">
            {openSequences.length} open routes out of ORD
          </p>
        </div>

        {/* Calendar Grid Toggle */}
        <button
          onClick={() => setShowOverlay(!showOverlay)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition duration-150 select-none ${
            showOverlay
              ? "bg-indigo-600/30 border-indigo-500/50 text-indigo-300"
              : "bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200"
          }`}
          title="Toggle visibility of ghost sequences directly on the calendar grid"
        >
          {showOverlay ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          Grid Overlay
        </button>
      </div>

      {/* Simulator Summary (if active) */}
      {simulatedCount > 0 && (
        <div className="my-3 p-3 bg-gradient-to-r from-amber-500/10 to-indigo-500/10 border border-amber-500/20 rounded-2xl flex items-center justify-between text-xs animate-pulse">
          <span className="text-amber-300 font-semibold font-sans">
            Simulating {simulatedCount} picked-up sequence(s) (+1.5x Premium)
          </span>
          <button
            onClick={clearSimulated}
            className="text-[10px] text-slate-400 hover:text-rose-400 font-bold underline"
          >
            Clear All
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-1.5 overflow-x-auto py-3 border-b border-slate-850 scrollbar-none text-[10px] font-bold uppercase tracking-wider shrink-0 font-mono">
        {(["all", "fits", "simulated", "conflicts"] as const).map((f) => {
          const count =
            f === "all"
              ? processedSeqs.length
              : f === "fits"
              ? processedSeqs.filter((s) => !s.conflict.hasConflict).length
              : f === "simulated"
              ? simulatedCount
              : processedSeqs.filter((s) => s.conflict.hasConflict).length;

          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-xl border transition shrink-0 ${
                filter === f
                  ? "bg-indigo-600 border-indigo-500 text-white shadow"
                  : "bg-slate-950/60 border-slate-800/80 text-slate-400 hover:text-slate-200 hover:border-slate-700"
              }`}
            >
              {f === "fits" ? "Fits" : f} ({count})
            </button>
          );
        })}
      </div>

      {/* Roster List */}
      <div className="flex-grow overflow-y-auto scrollbar-thin py-4 space-y-4">
        {filteredSeqs.length > 0 ? (
          filteredSeqs.map(({ ot, conflict, isSimulated }) => (
            <div
              key={ot.id}
              className={`p-4 rounded-2xl border transition duration-200 flex flex-col justify-between ${
                isSimulated
                  ? "bg-amber-950/20 border-amber-500/80 shadow-[0_0_12px_rgba(245,158,11,0.15)]"
                  : conflict.hasConflict
                  ? "bg-slate-950/10 border-slate-900 opacity-50"
                  : "bg-slate-950/40 border-slate-800/60 hover:border-slate-700/80"
              }`}
            >
              <div>
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h4 className="text-sm font-extrabold text-slate-100 font-mono flex items-center gap-1.5">
                      <span
                        className={`w-2.5 h-2.5 rounded-full ${
                          isSimulated ? "bg-amber-500 animate-ping" : conflict.hasConflict ? "bg-rose-500" : "bg-emerald-500"
                        }`}
                      />
                      Seq {ot.sequenceNumber}
                    </h4>
                    <p className="text-[10px] text-slate-400 font-mono mt-0.5 uppercase tracking-wide">
                      {ot.startDate} to {ot.endDate}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-amber-400 font-mono">
                      {ot.creditHours.toFixed(2)}h
                    </p>
                    <p className="text-[9px] text-slate-500 font-sans font-bold">Unscaled Credit</p>
                  </div>
                </div>

                {/* Details */}
                <div className="grid grid-cols-2 gap-y-1.5 gap-x-3 text-[11px] text-slate-400 font-mono bg-slate-950/30 p-2.5 rounded-xl border border-slate-850/50 mb-3.5">
                  <div>
                    Report: <span className="text-slate-200 font-semibold">{ot.reportTime}</span>
                  </div>
                  <div>
                    Release: <span className="text-slate-200 font-semibold">{ot.releaseTime}</span>
                  </div>
                  <div className="col-span-2">
                    Layovers: <span className="text-slate-200 font-semibold truncate block">{ot.layoverDescription}</span>
                  </div>
                  <div className="col-span-2">
                    Legs pattern: <span className="text-slate-200 font-semibold">{ot.legsDescription}</span>
                  </div>
                </div>

                {/* Conflict Status Tag */}
                {conflict.hasConflict ? (
                  <div className="flex items-start gap-2 text-[10px] text-rose-400 bg-rose-500/5 border border-rose-500/10 p-2.5 rounded-xl font-sans mb-3.5 leading-relaxed">
                    <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                    <span>{conflict.reason}</span>
                  </div>
                ) : isSimulated ? (
                  <div className="flex items-center gap-1.5 text-[10px] text-emerald-400 bg-emerald-500/5 border border-emerald-500/10 p-2 rounded-xl font-sans mb-3.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Overlayed on Calendar (+1.5x Premium Active)</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-[10px] text-emerald-400 bg-emerald-500/5 border border-emerald-500/10 p-2 rounded-xl font-sans mb-3.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Compliant with FAA Rest & Overlap Rules</span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div>
                {conflict.hasConflict ? (
                  <button
                    disabled
                    className="w-full py-2 bg-slate-900 border border-slate-850 text-slate-600 rounded-xl text-xs font-bold font-sans cursor-not-allowed flex items-center justify-center gap-1.5"
                  >
                    <Ban className="w-3.5 h-3.5" />
                    Unavailable due to Conflict
                  </button>
                ) : isSimulated ? (
                  <button
                    onClick={() => toggleSimulate(ot.id)}
                    className="w-full py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-rose-400 hover:text-rose-300 rounded-xl text-xs font-bold font-sans transition duration-150 flex items-center justify-center gap-1"
                  >
                    Drop Simulated Pickup
                  </button>
                ) : (
                  <button
                    onClick={() => toggleSimulate(ot.id)}
                    className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold font-sans shadow-lg shadow-emerald-600/10 transition duration-150 flex items-center justify-center gap-1"
                  >
                    <Plus className="w-4 h-4" />
                    Simulate Pickup (+1.5x Pay)
                  </button>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-12 text-slate-500">
            <AlertCircle className="w-8 h-8 text-slate-700 mx-auto mb-2 animate-bounce" />
            <p className="text-xs font-semibold">No open sequences match filter</p>
          </div>
        )}
      </div>
    </div>
  );
}
