"use client";

import React, { useState } from "react";
import { SequenceTrip, VacationPeriod, MonthlyHIMetadata } from "../../types/index";
import { getFosPayStatus, getFosAddDescription, getFosRemovalDescription } from "../../lib/fosCodes";
import {
  Calendar,
  CheckCircle2,
  Plane,
  Clock,
  MapPin,
  FileText,
  ChevronRight,
  Sparkles,
  X,
  AlertTriangle,
  Layers,
  ArrowRight,
} from "lucide-react";

interface ScheduleImportReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onViewCalendar: () => void;
  sequences: SequenceTrip[];
  vacations: VacationPeriod[];
  metadata?: MonthlyHIMetadata | null;
  rawText?: string;
}

export default function ScheduleImportReviewModal({
  isOpen,
  onClose,
  onViewCalendar,
  sequences,
  vacations,
  metadata,
  rawText,
}: ScheduleImportReviewModalProps) {
  const [showRaw, setShowRaw] = useState(false);
  const [selectedSeqId, setSelectedSeqId] = useState<string | null>(null);

  if (!isOpen) return null;

  const totalCreditHours = sequences.reduce((acc, s) => acc + (s.isDropped ? 0 : s.totalCreditMinutes / 60), 0);
  const totalBlockHours = sequences.reduce((acc, s) => acc + (s.isDropped ? 0 : s.totalBlockMinutes / 60), 0);

  const activeSequences = sequences.filter((s) => !s.isDropped);
  const droppedSequences = sequences.filter((s) => s.isDropped);

  return (
    <div className="fixed inset-0 z-[999999] flex items-center justify-center p-3 bg-slate-950/80 backdrop-blur-md animate-fade-in select-none">
      <div className="relative w-full max-w-lg max-h-[92vh] flex flex-col bg-slate-900 border border-slate-700/60 rounded-2xl shadow-2xl overflow-hidden text-slate-100 font-sans">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900/90 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-wide">Schedule Successfully Imported</h2>
                <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono text-[10px] font-bold">
                  DECS HI1
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {metadata?.monthYearLabel || metadata?.monthEnding || "Monthly Schedule"} • {metadata?.pilotName ? `${metadata.pilotName} (${metadata.base})` : "Verified & Synced"}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition active:scale-95"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Scrollable Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">

          {/* Quick Metrics Cards */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-slate-800/60 border border-slate-700/40 rounded-xl p-2.5 flex flex-col items-center justify-center text-center">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Total Credit</span>
              <span className="text-base font-extrabold text-emerald-400 font-mono mt-0.5">
                {totalCreditHours.toFixed(2)}h
              </span>
              <span className="text-[9px] text-slate-500 font-mono">Guar: {metadata?.guaranteeHours || 72.0}h</span>
            </div>

            <div className="bg-slate-800/60 border border-slate-700/40 rounded-xl p-2.5 flex flex-col items-center justify-center text-center">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Pairings</span>
              <span className="text-base font-extrabold text-sky-400 font-mono mt-0.5">
                {activeSequences.length}
              </span>
              <span className="text-[9px] text-slate-500 font-mono">{totalBlockHours.toFixed(1)}h Block</span>
            </div>

            <div className="bg-slate-800/60 border border-slate-700/40 rounded-xl p-2.5 flex flex-col items-center justify-center text-center">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Vacations</span>
              <span className="text-base font-extrabold text-amber-400 font-mono mt-0.5">
                {vacations.length}
              </span>
              <span className="text-[9px] text-slate-500 font-mono">{vacations.length > 0 ? "Synced" : "None"}</span>
            </div>
          </div>

          {/* List of Imported Pairings */}
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-sky-400" />
                Imported Sequences ({activeSequences.length})
              </span>
              <span className="text-[10px] text-slate-400">Tap pairing for legs</span>
            </div>

            {activeSequences.length === 0 ? (
              <div className="p-6 bg-slate-800/30 border border-slate-700/30 rounded-xl text-center text-slate-400 text-xs">
                No active flying sequences found for this month period.
              </div>
            ) : (
              activeSequences.map((seq) => {
                const isSelected = selectedSeqId === seq.id;
                const creditHours = (seq.totalCreditMinutes / 60).toFixed(2);
                const allFlightNumbers = seq.dutyPeriods.flatMap((dp) => dp.legs.map((l) => l.flightNumber));

                return (
                  <div
                    key={seq.id}
                    onClick={() => setSelectedSeqId(isSelected ? null : seq.id)}
                    className={`border rounded-xl p-3 transition cursor-pointer ${
                      isSelected
                        ? "bg-slate-800 border-sky-500/60 shadow-lg shadow-sky-500/10"
                        : "bg-slate-800/50 border-slate-700/50 hover:bg-slate-800/80 hover:border-slate-600"
                    }`}
                  >
                    {/* Top Row */}
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-md bg-sky-500/20 text-sky-300 font-mono font-bold text-xs border border-sky-500/30">
                          SEQ {seq.sequenceNumber}
                        </span>
                        {seq.statusTag && seq.statusTag !== "SKD" && (
                          <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono text-[10px] font-bold">
                            {seq.statusTag}
                          </span>
                        )}
                        {seq.hasContinuityIssue && (
                          <span className="px-1.5 py-0.5 rounded bg-red-500/20 text-red-300 text-[10px] font-bold flex items-center gap-1">
                            <AlertTriangle className="w-2.5 h-2.5" /> Continuity
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-emerald-400">
                          {creditHours}h Cr
                        </span>
                        {seq.expTafbHours && (
                          <span className="text-[10px] font-mono text-slate-400">
                            {seq.expTafbHours}h TAFB
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Dates & Layovers */}
                    <div className="flex items-center justify-between text-xs text-slate-300">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>{seq.startDate} ➔ {seq.endDate}</span>
                        <span className="text-slate-500">({seq.dutyPeriods.length}d)</span>
                      </div>

                      {seq.layoverCities && seq.layoverCities.length > 0 && (
                        <div className="flex items-center gap-1 text-[11px] text-slate-400">
                          <MapPin className="w-3 h-3 text-amber-400" />
                          <span>{seq.layoverCities.join(" • ")}</span>
                        </div>
                      )}
                    </div>

                    {/* Flight Numbers Preview Bar */}
                    <div className="mt-2 pt-2 border-t border-slate-700/40 flex flex-wrap gap-1.5 items-center">
                      <span className="text-[10px] text-slate-500 uppercase font-semibold">Flights:</span>
                      {allFlightNumbers.length > 0 ? (
                        allFlightNumbers.map((flt, fIdx) => (
                          <span
                            key={fIdx}
                            className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700/60 text-slate-200 font-mono text-[10px]"
                          >
                            {flt}
                          </span>
                        ))
                      ) : (
                        <span className="text-[10px] text-slate-500 italic">No leg details</span>
                      )}
                    </div>

                    {/* Expanded Day-by-Day Leg Details */}
                    {isSelected && (
                      <div className="mt-3 pt-3 border-t border-slate-700 space-y-2 bg-slate-900/50 p-2.5 rounded-lg">
                        <span className="text-[11px] font-bold text-slate-300 block mb-1">
                          Duty Periods & Flight Legs
                        </span>
                        {seq.dutyPeriods.map((dp, dIdx) => (
                          <div key={dIdx} className="bg-slate-900/90 border border-slate-800 p-2 rounded-md space-y-1">
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="font-bold text-sky-300">
                                Day {dIdx + 1} ({dp.layoverCity ? `Layover: ${dp.layoverCity}` : "Release: Base"})
                              </span>
                              {dp.payStatusCode && (
                                <span className="text-[10px] text-slate-400 font-mono">
                                  {getFosPayStatus(dp.payStatusCode)}
                                </span>
                              )}
                            </div>
                            <div className="space-y-1">
                              {dp.legs.map((leg, lIdx) => (
                                <div
                                  key={lIdx}
                                  className="flex items-center justify-between text-[10px] font-mono text-slate-300 px-1.5 py-0.5 rounded bg-slate-800/40"
                                >
                                  <div className="flex items-center gap-1.5">
                                    <Plane className={`w-3 h-3 ${leg.isDeadhead ? "text-amber-400" : "text-emerald-400"}`} />
                                    <span className="font-bold text-white">{leg.flightNumber}</span>
                                    {leg.isDeadhead && (
                                      <span className="px-1 py-0.2 rounded bg-amber-500/20 text-amber-300 text-[9px]">
                                        DH
                                      </span>
                                    )}
                                    {leg.isCancelled && (
                                      <span className="px-1 py-0.2 rounded bg-red-500/20 text-red-300 text-[9px]">
                                        CXL
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-1 text-slate-400">
                                    <span>{leg.depAirport}</span>
                                    <ArrowRight className="w-2.5 h-2.5 text-slate-600" />
                                    <span>{leg.arrAirport}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Raw Text Drawer Toggle */}
          {rawText && (
            <div className="pt-2 border-t border-slate-800">
              <button
                onClick={() => setShowRaw(!showRaw)}
                className="w-full flex items-center justify-between text-xs text-slate-400 hover:text-slate-200 py-1"
              >
                <span className="flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5" />
                  {showRaw ? "Hide Raw DECS ASCII Text" : "View Raw DECS ASCII Screen Text"}
                </span>
                <ChevronRight className={`w-4 h-4 transform transition-transform ${showRaw ? "rotate-90" : ""}`} />
              </button>

              {showRaw && (
                <div className="mt-2 p-3 bg-black/90 rounded-xl border border-slate-800 font-mono text-[10px] text-emerald-400 max-h-48 overflow-y-auto whitespace-pre leading-relaxed">
                  {rawText}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Action Buttons Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/90 flex gap-2">
          <button
            onClick={onViewCalendar}
            className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-lg shadow-emerald-900/30 flex items-center justify-center gap-2 active:scale-98 transition"
          >
            <Calendar className="w-4 h-4" />
            View Schedule on Calendar
          </button>
          <button
            onClick={onClose}
            className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition active:scale-98"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
}
