"use client";

import { useMemo } from "react";
import { useCrewStore, convertOpenToTrip } from "../../store/useCrewStore";
import { SequenceTrip, FlightLeg, DutyPeriod } from "../../types";
import { X, Plane, Clock, Calendar, Home, Plus, ShieldCheck, ShieldAlert, CheckCircle, AlertCircle } from "lucide-react";
import { checkOpenSequenceConflict } from "../../lib/parser";

export default function SequenceInspector() {
  const selectedId = useCrewStore((state) => state.selectedSequenceId);
  const setSelectedId = useCrewStore((state) => state.setSelectedSequenceId);
  const sequences = useCrewStore((state) => state.sequences);
  const openSequences = useCrewStore((state) => state.openSequences);
  const simulatedIds = useCrewStore((state) => state.simulatedSequenceIds);
  const toggleSimulate = useCrewStore((state) => state.toggleSimulateSequence);

  // Find selected trip (could be active roster, simulated, or ghost open time)
  const seq: SequenceTrip | null = useMemo(() => {
    if (!selectedId) return null;
    const activeSeq = sequences.find((s) => s.id === selectedId);
    if (activeSeq) return activeSeq;
    const openSeq = openSequences.find((s) => s.id === selectedId);
    if (openSeq) {
      const converted = convertOpenToTrip(openSeq);
      if (simulatedIds.includes(openSeq.id)) {
        return { ...converted, isSimulated: true };
      }
      return { ...converted, isGhost: true };
    }
    return null;
  }, [selectedId, sequences, openSequences, simulatedIds]);

  const stationTurnLimits = useCrewStore((state) => state.stationTurnLimits);
  const defaultTurnLimit = useCrewStore((state) => state.defaultTurnLimit);

  const openSeq = useMemo(() => {
    if (!selectedId) return null;
    return openSequences.find((s) => s.id === selectedId) || null;
  }, [selectedId, openSequences]);

  const conflictResult = useMemo(() => {
    if (!openSeq) return null;
    return checkOpenSequenceConflict(openSeq, sequences, stationTurnLimits, defaultTurnLimit);
  }, [openSeq, sequences, stationTurnLimits, defaultTurnLimit]);

  if (!seq) {
    return (
      <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-800/80 rounded-3xl p-8 shadow-2xl flex flex-col items-center justify-center text-center h-full min-h-[400px]">
        <Plane className="w-12 h-12 text-slate-700 stroke-1 mb-3 animate-pulse" />
        <h3 className="text-lg font-bold text-slate-400">No Sequence Inspected</h3>
        <p className="text-xs text-slate-500 max-w-[260px] mt-1.5 leading-relaxed">
          Select any sequence in the Calendar grid to review detailed flight lines, hotel coordinates, and layovers.
        </p>
      </div>
    );
  }

  const formatTime = (t?: string) => {
    if (!t) return "-";
    const clean = t.replace(":", "").trim();
    if (clean.length < 3) return t;
    return `${clean.substring(0, clean.length - 2)}:${clean.substring(clean.length - 2)}`;
  };

  const isDropped = seq.isDropped || seq.statusTag === "DROP" || seq.statusTag === "DTS DROP";

  return (
    <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-3xl p-6 shadow-2xl flex flex-col h-full animate-fadeIn max-h-[65vh] lg:max-h-[820px] overflow-y-auto scrollbar-thin relative">
      {/* Header section */}
      <div className="flex justify-between items-start pb-4 border-b border-slate-800/80 mb-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-xl font-black ${isDropped ? "line-through text-slate-400" : "text-slate-100"}`}>
              Sequence {seq.sequenceNumber}
            </span>
            <span className="px-2 py-0.5 bg-indigo-950/80 border border-indigo-900/60 text-indigo-400 font-mono text-[10px] rounded-lg">
              {seq.base}
            </span>
            {isDropped && (
              <span className="px-2.5 py-0.5 bg-rose-950 border border-rose-500/60 text-rose-300 font-extrabold text-[10px] rounded-lg shadow-sm flex items-center gap-1">
                DROPPED (DTS)
              </span>
            )}
            {seq.statusTag === "TT" && (
              <span className="px-2.5 py-0.5 bg-amber-500/15 border border-amber-500/30 text-amber-300 font-extrabold text-[10px] rounded-lg shadow-sm flex items-center gap-1">
                TRIP TRADE (TT)
              </span>
            )}
            {seq.statusTag === "RA" && (
              <span className="px-2.5 py-0.5 bg-rose-500/15 border border-rose-500/30 text-rose-400 font-extrabold text-[10px] rounded-lg shadow-sm flex items-center gap-1">
                REASSIGNMENT (RA)
              </span>
            )}
            {seq.isOvertime && (
              <span className="px-2.5 py-0.5 bg-amber-500/15 border border-amber-500/30 text-amber-400 font-extrabold text-[10px] rounded-lg shadow-sm">
                OVERTIME (OT)
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
            {seq.startDate} to {seq.endDate}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {seq.isGhost || seq.isSimulated ? (
            <button
              onClick={() => {
                toggleSimulate(selectedId!);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold font-sans shadow transition duration-150 flex items-center gap-1.5 cursor-pointer ${
                seq.isSimulated
                  ? "bg-slate-800 hover:bg-slate-700 text-rose-400 border border-slate-700 hover:border-slate-600"
                  : "bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-500"
              }`}
            >
              {seq.isSimulated ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
              {seq.isSimulated ? "Drop Simulated Pickup" : "Simulate Pickup"}
            </button>
          ) : null}
          <button
            onClick={() => setSelectedId(null)}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition duration-150"
            title="Close Inspector"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* DTS Dropped Sequence Banner Callout */}
      {isDropped && (
        <div className="mb-4 p-3.5 bg-rose-950/40 border border-rose-500/40 rounded-2xl flex items-start gap-3 text-xs text-rose-200 shadow-md animate-fadeIn">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div>
            <div className="font-bold text-rose-300 text-sm">DROPPED SEQUENCE — DTS OVERLAP</div>
            <div className="text-[11px] text-rose-200/90 mt-1 leading-relaxed">
              {seq.dropReason || "This sequence touches your scheduled vacation block (Aug 01 - Aug 07) and has been dropped by Crew Schedule under DTS rules."}
            </div>
            <div className="mt-1.5 text-[10px] font-mono text-rose-400 font-bold bg-rose-950/60 px-2 py-0.5 rounded border border-rose-900/60 inline-block">
              Active Status: Inactive / Dropped (0.00h active flight credit)
            </div>
          </div>
        </div>
      )}

      {/* Summary figures */}

      <div className="grid grid-cols-2 gap-3 mb-6 font-mono text-xs">
        <div className="bg-slate-950/60 p-3 rounded-2xl border border-slate-800/40">
          <p className="text-[10px] text-slate-500 font-sans">Total Block Time</p>
          <p className="text-md font-bold text-slate-200 mt-0.5">
            {Math.floor(seq.totalBlockMinutes / 60)}h {seq.totalBlockMinutes % 60}m
          </p>
        </div>
        <div className="bg-slate-950/60 p-3 rounded-2xl border border-slate-800/40">
          <p className="text-[10px] text-slate-500 font-sans">Total Credit Time</p>
          <p className="text-md font-bold text-emerald-400 mt-0.5">
            {Math.floor(seq.totalCreditMinutes / 60)}h {seq.totalCreditMinutes % 60}m
          </p>
        </div>
      </div>

      {/* FAA Legality Audit Breakdown */}
      {conflictResult && (
        <div className="mb-6 bg-slate-950/40 p-4.5 rounded-2xl border border-slate-800 space-y-4">
          <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-indigo-400" />
            FAA Part 117 Legality Audit
          </h4>

          {conflictResult.hasConflict ? (
            <div className="p-3 bg-rose-950/20 border border-rose-900/40 rounded-xl text-xs text-rose-300 leading-relaxed font-sans flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <div>
                <strong className="font-bold">Roster Conflict Detected:</strong>
                <p className="mt-1 text-[11px] text-rose-400/90">{conflictResult.reason}</p>
              </div>
            </div>
          ) : (
            <div className="p-3 bg-emerald-950/20 border border-emerald-900/40 rounded-xl text-xs text-emerald-300 leading-relaxed font-sans flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
              <div>
                <strong className="font-bold">Legality Check Passed:</strong>
                <p className="mt-0.5 text-[11px] text-emerald-400/90">This sequence is fully legal to pick up on your current roster.</p>
              </div>
            </div>
          )}

          <div className="space-y-2.5">
            {conflictResult.auditTrail?.map((audit, idx) => (
              <div
                key={idx}
                className={`p-3 rounded-xl border text-xs font-sans space-y-1 ${
                  audit.passed
                    ? "bg-slate-900/40 border-slate-850 text-slate-300"
                    : "bg-rose-950/10 border-rose-900/30 text-slate-300"
                }`}
              >
                <div className="flex justify-between items-center">
                  <span className="font-bold flex items-center gap-1.5 text-slate-200">
                    {audit.passed ? (
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    ) : (
                      <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                    )}
                    {audit.name}
                  </span>
                  <span
                    className={`px-1.5 py-0.2 rounded text-[9px] font-black uppercase ${
                      audit.passed
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                        : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                    }`}
                  >
                    {audit.passed ? "PASS" : "FAIL"}
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 leading-normal">{audit.details}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Duty Periods List */}
      <div className="space-y-6 flex-grow">
        <h4 className="text-xs font-black uppercase text-slate-500 tracking-wider mb-2 flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-indigo-400" />
          Duty Period Timeline
        </h4>

        {seq.dutyPeriods.map((dp: DutyPeriod) => {
          const hasLayover = !!dp.layoverCity;

          return (
            <div
              key={dp.dayIndex}
              className="p-4 bg-slate-950/30 border border-slate-800/80 rounded-2xl space-y-4"
            >
              {/* Duty Day Header */}
              <div className="flex justify-between items-center pb-2 border-b border-slate-900/60">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-extrabold text-slate-300">
                    Duty Day {dp.dayIndex + 1}
                  </span>
                  {(dp.isOvertime || dp.legs.some((l: FlightLeg) => l.isOvertime)) && (
                    <span className="px-2 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 text-amber-400 text-[10px] font-black uppercase">
                      OVERTIME (OT)
                    </span>
                  )}
                </div>
              </div>

              {/* Time displays */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs font-mono">
                <div className="p-1.5 bg-slate-950/40 rounded border border-slate-900/60 flex flex-col justify-between">
                  <p className="text-[9px] text-slate-500 font-sans">Report</p>
                  <div className="mt-0.5 font-bold space-y-0.5">
                    <p className="text-slate-400 text-[10px]">
                      <span className="text-[8px] text-indigo-400/80 mr-1 uppercase">S</span>
                      {formatTime(dp.reportTime)}
                    </p>
                    {dp.actualReportTime !== undefined && (
                      <p className="text-emerald-400 text-[10px]">
                        <span className="text-[8px] text-emerald-500 mr-1 uppercase">A</span>
                        {formatTime(dp.actualReportTime)}
                      </p>
                    )}
                  </div>
                </div>
                <div className="p-1.5 bg-slate-950/40 rounded border border-slate-900/60 flex flex-col justify-between">
                  <p className="text-[9px] text-slate-500 font-sans">Release</p>
                  <div className="mt-0.5 font-bold space-y-0.5">
                    <p className="text-slate-400 text-[10px]">
                      <span className="text-[8px] text-indigo-400/80 mr-1 uppercase">S</span>
                      {formatTime(dp.releaseTime)}
                    </p>
                    {dp.actualReleaseTime !== undefined && (
                      <p className="text-emerald-400 text-[10px]">
                        <span className="text-[8px] text-emerald-500 mr-1 uppercase">A</span>
                        {formatTime(dp.actualReleaseTime)}
                      </p>
                    )}
                  </div>
                </div>
                <div className="p-1.5 bg-slate-950/40 rounded border border-slate-900/60 flex flex-col justify-between">
                  <p className="text-[9px] text-slate-500 font-sans">Duty Length</p>
                  <div className="mt-0.5 font-bold space-y-0.5">
                    <p className="text-slate-400 text-[10px]">
                      <span className="text-[8px] text-indigo-400/80 mr-1 uppercase">S</span>
                      {Math.floor(dp.dutyMinutes / 60)}h {dp.dutyMinutes % 60}m
                    </p>
                    {dp.actualDutyMinutes !== undefined && (
                      <p className="text-emerald-400 text-[10px]">
                        <span className="text-[8px] text-emerald-500 mr-1 uppercase">A</span>
                        {Math.floor(dp.actualDutyMinutes / 60)}h {dp.actualDutyMinutes % 60}m
                      </p>
                    )}
                  </div>
                </div>
                <div className="p-1.5 bg-slate-950/40 rounded border border-slate-900/60 flex flex-col justify-between">
                  <p className="text-[9px] text-slate-500 font-sans">Block Time</p>
                  <div className="mt-0.5 font-bold space-y-0.5">
                    <p className="text-slate-400 text-[10px]">
                      <span className="text-[8px] text-indigo-400/80 mr-1 uppercase">S</span>
                      {Math.floor(dp.legs.reduce((acc: number, l: FlightLeg) => acc + l.blockMinutes, 0) / 60)}h {dp.legs.reduce((acc: number, l: FlightLeg) => acc + l.blockMinutes, 0) % 60}m
                    </p>
                    {dp.actualBlockMinutes !== undefined && (
                      <p className="text-emerald-400 text-[10px]">
                        <span className="text-[8px] text-emerald-500 mr-1 uppercase">A</span>
                        {Math.floor(dp.actualBlockMinutes / 60)}h {dp.actualBlockMinutes % 60}m
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Legs list inside day */}
              <div className="space-y-2">
                {dp.legs.length > 0 ? (
                  dp.legs.map((leg: FlightLeg, idx: number) => (
                    <div
                      key={leg.flightNumber + idx}
                      className="p-3 bg-slate-950/50 rounded-xl border border-slate-900/80 flex justify-between items-center text-xs font-mono"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className={`p-1 rounded-lg border ${
                          leg.isDeadhead
                            ? "bg-amber-950/80 text-amber-400 border-amber-900/40"
                            : "bg-indigo-950/80 text-indigo-400 border-indigo-900/40"
                        }`}>
                          <Plane className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <p className="font-bold text-slate-300">{leg.flightNumber}</p>
                            {leg.isDeadhead && (
                              <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[9px] font-black uppercase">
                                DH
                              </span>
                            )}
                            {leg.isOvertime && (
                              <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[9px] font-black uppercase">
                                OT
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="text-right space-y-0.5">
                        <p className="font-bold text-slate-300">
                          {leg.depAirport} → {leg.arrAirport}
                        </p>
                        {leg.actualDepTime ? (
                          <div className="text-[10px] space-y-0.5">
                            <p className="text-slate-400">
                              <span className="text-[8px] font-bold text-indigo-400/90 mr-1 uppercase">SKD</span>
                              {leg.depTime} - {leg.arrTime} ({Math.floor(leg.blockMinutes / 60)}h {leg.blockMinutes % 60}m)
                            </p>
                            <p className="text-emerald-400 font-bold">
                              <span className="text-[8px] font-extrabold text-emerald-500 mr-1 uppercase">ACT</span>
                              {leg.actualDepTime} - {leg.actualArrTime} ({Math.floor((leg.actualBlockMinutes ?? 0) / 60)}h {(leg.actualBlockMinutes ?? 0) % 60}m)
                            </p>
                          </div>
                        ) : (
                          <p className="text-[10px] text-slate-500">
                            {leg.depTime} - {leg.arrTime} ({Math.floor(leg.blockMinutes / 60)}h {leg.blockMinutes % 60}m)
                          </p>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-500 italic text-center py-2">
                    No flight legs scheduled. DFP or Standby.
                  </p>
                )}
              </div>

              {/* Layover / Hotel Info */}
              {hasLayover && (
                <div className="p-3 bg-amber-500/5 border border-amber-500/10 rounded-xl text-xs space-y-1">
                  <div className="flex items-center gap-1.5 text-amber-400 font-bold">
                    <Home className="w-3.5 h-3.5" />
                    <span>Layover: {dp.layoverCity}</span>
                  </div>
                  <p className="text-slate-400 text-[11px] leading-relaxed">
                    {dp.layoverHotelInfo}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
