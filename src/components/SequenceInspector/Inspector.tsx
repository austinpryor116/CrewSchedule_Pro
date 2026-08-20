"use client";

import { useState, useMemo } from "react";
import { useCrewStore, convertOpenToTrip } from "../../store/useCrewStore";
import { SequenceTrip, FlightLeg, DutyPeriod } from "../../types";
import { X, Plane, Clock, Calendar, Home, Plus, ShieldCheck, ShieldAlert, CheckCircle, AlertCircle, DollarSign, Zap } from "lucide-react";
import { checkOpenSequenceConflict, isRealHotelInfo } from "../../lib/parser";
import { auditDutyPeriodFdp } from "../../lib/far117Engine";
import { OpenTimeEngine } from "../../lib/openTimeEngine";
import { typeMacroOnDecsScreen } from "../../lib/keyboardSimEngine";

interface SequenceInspectorProps {
  isEmbedded?: boolean;
}

export default function SequenceInspector({ isEmbedded = false }: SequenceInspectorProps = {}) {
  const selectedId = useCrewStore((state) => state.selectedSequenceId);
  const setSelectedId = useCrewStore((state) => state.setSelectedSequenceId);
  const sequences = useCrewStore((state) => state.sequences);
  const openSequences = useCrewStore((state) => state.openSequences);
  const simulatedIds = useCrewStore((state) => state.simulatedSequenceIds);
  const vacations = useCrewStore((state) => state.vacations);
  const toggleSimulate = useCrewStore((state) => state.toggleSimulateSequence);
  const userProfile = useCrewStore((state) => state.userProfile);
  const payRates = useCrewStore((state) => state.payRates);

  const [isPullingHss, setIsPullingHss] = useState(false);
  const [hssFeedback, setHssFeedback] = useState<string | null>(null);

  // Find selected trip (could be active roster, vacation, simulated, or ghost open time)
  const seq: SequenceTrip | null = useMemo(() => {
    if (!selectedId) return null;
    const activeSeq = sequences.find((s) => s.id === selectedId);
    if (activeSeq) return activeSeq;

    const vac = vacations.find((v) => v.id === selectedId);
    if (vac) {
      return {
        id: vac.id,
        sequenceNumber: "VACATION",
        startDate: vac.startDate,
        endDate: vac.endDate,
        base: "ORD",
        equipment: "VAC",
        totalBlockMinutes: 0,
        totalCreditMinutes: Math.round((vac.creditHours || 24.5) * 60),
        layoverCities: ["VACATION"],
        dutyPeriods: [],
        colorTag: "emerald",
        statusTag: "VA",
      };
    }

    const openSeq = openSequences.find((s) => s.id === selectedId);
    if (openSeq) {
      const converted = convertOpenToTrip(openSeq);
      if (simulatedIds.includes(openSeq.id)) {
        return { ...converted, isSimulated: true };
      }
      return { ...converted, isGhost: true };
    }
    return null;
  }, [selectedId, sequences, vacations, openSequences, simulatedIds]);

  const handleFetchHssTimes = async () => {
    if (!seq || seq.sequenceNumber === "VACATION") return;
    setIsPullingHss(true);
    setHssFeedback("Connecting to DECS terminal...");

    let seat = "CA";
    const rankStr = (seq.rank || (seq as any).seat || (seq as any).role || userProfile?.crewRole || "").toUpperCase();
    if (rankStr.includes("FA") || rankStr.includes("FLIGHT ATTENDANT") || rankStr.includes("ATTENDANT")) {
      seat = "FA";
    } else if (rankStr.includes("FO") || rankStr.includes("F/O") || rankStr.includes("FIRST OFFICER") || rankStr.includes("SIC")) {
      seat = "FO";
    }

    const datePart = seq.startDate ? seq.startDate.substring(8, 10) : "";
    const monthLetters = seq.startDate
      ? new Date(seq.startDate + "T12:00:00").toLocaleDateString("en-US", { month: "short" }).toUpperCase()
      : "";
    const command = `HSS/${seat}/${seq.sequenceNumber}/${datePart}${monthLetters}^`;

    try {
      if (typeof window !== "undefined" && (window as any).AndroidPortal?.executeHss) {
        (window as any).AndroidPortal.executeHss(command);
      } else {
        await typeMacroOnDecsScreen(command);
      }
      setHssFeedback(`✓ Sent ${command.replace("^", "")} to DECS! Updating exact times...`);
      setTimeout(() => {
        setIsPullingHss(false);
        setTimeout(() => setHssFeedback(null), 4500);
      }, 1500);
    } catch (e: any) {
      setHssFeedback(`Error: ${e.message || "Failed to trigger HSS"}`);
      setIsPullingHss(false);
    }
  };

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

  const moneyBreakdown = useMemo(() => {
    if (!seq || seq.sequenceNumber === "VACATION") return null;
    return OpenTimeEngine.calculateSequenceMoney(seq, payRates, userProfile);
  }, [seq, userProfile, payRates]);

  if (!seq) {
    return (
      <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm flex flex-col items-center justify-center text-center h-full min-h-[400px] text-slate-900">
        <Plane className="w-12 h-12 text-sky-600 stroke-1 mb-3 animate-pulse" />
        <h3 className="text-lg font-bold text-slate-900">No Sequence Inspected</h3>
        <p className="text-xs text-slate-500 max-w-[260px] mt-1.5 leading-relaxed font-medium">
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
    <div
      className={
        isEmbedded
          ? "flex flex-col text-slate-900 w-full"
          : "bg-white border border-slate-200 rounded-3xl p-4 sm:p-6 shadow-sm flex flex-col h-full animate-fadeIn lg:max-h-[820px] overflow-y-auto scrollbar-thin relative text-slate-900"
      }
    >
      {/* Header section */}
      <div className="flex justify-between items-start pb-4 border-b border-slate-200 mb-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-xl font-black ${isDropped ? "line-through text-slate-400" : "text-slate-900"}`}>
              {seq.sequenceNumber === "VACATION" ? "Vacation Block" : `Sequence ${seq.sequenceNumber}`}
            </span>
            <span className="px-2 py-0.5 bg-sky-100 border border-sky-200 text-sky-900 font-mono text-[10px] font-bold rounded-lg">
              {seq.base}
            </span>
            {(seq.statusTag === "VA" || seq.sequenceNumber === "VACATION") && (
              <span className="px-2.5 py-0.5 bg-emerald-100 border border-emerald-300 text-emerald-950 font-extrabold text-[10px] rounded-lg shadow-2xs flex items-center gap-1">
                SCHEDULED VACATION (VA)
              </span>
            )}
            {isDropped && (
              <span className="px-2.5 py-0.5 bg-rose-100 border border-rose-300 text-rose-900 font-extrabold text-[10px] rounded-lg shadow-2xs flex items-center gap-1">
                DROPPED (DTS)
              </span>
            )}
            {seq.statusTag === "TT" && (
              <span className="px-2.5 py-0.5 bg-amber-100 border border-amber-300 text-amber-900 font-extrabold text-[10px] rounded-lg shadow-2xs flex items-center gap-1">
                TRIP TRADE (TT)
              </span>
            )}
            {seq.statusTag === "RA" && (
              <span className="px-2.5 py-0.5 bg-rose-100 border border-rose-300 text-rose-900 font-extrabold text-[10px] rounded-lg shadow-2xs flex items-center gap-1">
                REASSIGNMENT (RA)
              </span>
            )}
            {seq.isOvertime && (
              <span className="px-2.5 py-0.5 bg-amber-100 border border-amber-300 text-amber-900 font-extrabold text-[10px] rounded-lg shadow-2xs">
                OVERTIME (OT)
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5 font-medium">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            {seq.startDate} to {seq.endDate}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap justify-end">
          {seq.sequenceNumber !== "VACATION" && !isDropped && (
            <button
              onClick={handleFetchHssTimes}
              disabled={isPullingHss}
              className="px-2.5 py-1.5 rounded-xl text-xs font-black bg-amber-400 hover:bg-amber-500 active:scale-95 text-slate-950 border border-amber-500 shadow-2xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              title="Pull exact show/release times, leg departure/arrival times, and hotel coordinates from DECS (HSS)"
            >
              <Zap className={`w-3.5 h-3.5 ${isPullingHss ? "animate-spin text-slate-950" : "fill-current text-slate-950"}`} />
              <span>{isPullingHss ? "Pulling DECS HSS..." : "⚡ Pull Exact Times (HSS)"}</span>
            </button>
          )}
          {seq.isGhost || seq.isSimulated ? (
            <button
              onClick={() => {
                toggleSimulate(selectedId!);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold font-sans shadow-2xs transition duration-150 flex items-center gap-1.5 cursor-pointer ${
                seq.isSimulated
                  ? "bg-slate-100 hover:bg-slate-200 text-rose-700 border border-slate-300"
                  : "bg-emerald-600 hover:bg-emerald-700 text-white border border-emerald-600"
              }`}
            >
              {seq.isSimulated ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
              {seq.isSimulated ? "Drop Simulated Pickup" : "Simulate Pickup"}
            </button>
          ) : null}
          {!isEmbedded && (
            <button
              onClick={() => setSelectedId(null)}
              className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition duration-150"
              title="Close Inspector"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* HSS Feedback Banner */}
      {hssFeedback && (
        <div className="mb-4 p-3 bg-indigo-50 border border-indigo-200 rounded-2xl flex items-center gap-2.5 text-xs text-indigo-950 shadow-2xs animate-fadeIn">
          <Zap className="w-4 h-4 text-indigo-600 shrink-0" />
          <span className="font-semibold">{hssFeedback}</span>
        </div>
      )}

      {/* DTS Dropped Sequence Banner Callout */}
      {isDropped && (
        <div className="mb-4 p-3.5 bg-rose-50 border border-rose-300 rounded-2xl flex items-start gap-3 text-xs text-rose-950 shadow-2xs animate-fadeIn">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <div className="font-bold text-rose-900 text-sm">DROPPED SEQUENCE — DTS OVERLAP</div>
            <div className="text-[11px] text-rose-950 mt-1 leading-relaxed">
              {seq.dropReason || "This sequence touches your scheduled vacation block (Aug 01 - Aug 07) and has been dropped by Crew Schedule under DTS rules."}
            </div>
            <div className="mt-1.5 text-[10px] font-mono text-rose-900 font-bold bg-rose-100 px-2 py-0.5 rounded border border-rose-300 inline-block">
              Active Status: Inactive / Dropped (0.00h active flight credit)
            </div>
          </div>
        </div>
      )}

      {/* Sequence Earnings & Money Breakdown */}
      {moneyBreakdown && (
        <div className="mb-4 p-4 bg-gradient-to-br from-emerald-50 via-slate-50 to-sky-50 border border-emerald-200/80 rounded-3xl text-slate-900 shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-100 border border-emerald-300 flex items-center justify-center text-emerald-700 shadow-2xs">
                <DollarSign className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-black uppercase tracking-wider text-emerald-800 block">
                  SEQ #{moneyBreakdown.seqNum} Financial Breakdown
                </span>
                <span className="text-[10px] text-slate-500 font-bold">
                  {moneyBreakdown.role} Pay Rate (${moneyBreakdown.hourlyRate}/hr) • Envoy E175
                </span>
              </div>
            </div>

            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Est. Total Trip Value</span>
              <span className="text-lg font-black text-emerald-700 font-mono">
                +${moneyBreakdown.totalTripValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 font-mono text-xs">
            <div className="p-2.5 bg-white rounded-2xl border border-slate-200 shadow-2xs">
              <span className="text-[9.5px] font-bold uppercase text-slate-500 font-sans block">Gross Flight Pay</span>
              <span className="text-sm font-black text-slate-900">+${moneyBreakdown.grossPay.toLocaleString()}</span>
              <span className="text-[9px] text-slate-500 block">{moneyBreakdown.creditHours.toFixed(1)}h × ${moneyBreakdown.hourlyRate}</span>
            </div>

            <div className="p-2.5 bg-white rounded-2xl border border-slate-200 shadow-2xs">
              <span className="text-[9.5px] font-bold uppercase text-slate-500 font-sans block">Est. Per Diem</span>
              <span className="text-sm font-black text-sky-700">+${moneyBreakdown.perDiemPay.toFixed(2)}</span>
              <span className="text-[9px] text-slate-500 block">{moneyBreakdown.tafbHours.toFixed(0)}h @ ${moneyBreakdown.perDiemRate}/hr</span>
            </div>

            <div className="p-2.5 bg-white rounded-2xl border border-slate-200 shadow-2xs">
              <span className="text-[9.5px] font-bold uppercase text-slate-500 font-sans block">Trip Credit</span>
              <span className="text-sm font-black text-indigo-700">{moneyBreakdown.creditHours.toFixed(2)}h</span>
              <span className="text-[9px] text-slate-500 block">Total Credit</span>
            </div>
          </div>
        </div>
      )}

      {/* Summary figures */}
      <div className="grid grid-cols-2 gap-3 mb-6 font-mono text-xs">
        <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200">
          <p className="text-[10px] text-slate-500 font-sans font-bold">Total Block Time</p>
          <p className="text-md font-black text-slate-900 mt-0.5">
            {Math.floor(seq.totalBlockMinutes / 60)}h {seq.totalBlockMinutes % 60}m
          </p>
        </div>
        <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200">
          <p className="text-[10px] text-slate-500 font-sans font-bold">Total Credit Time</p>
          <p className="text-md font-black text-emerald-700 mt-0.5">
            {Math.floor(seq.totalCreditMinutes / 60)}h {seq.totalCreditMinutes % 60}m
          </p>
        </div>
      </div>

      {/* FAA Legality Audit Breakdown */}
      {conflictResult && (
        <div className="mb-6 bg-slate-50 p-4.5 rounded-2xl border border-slate-200 space-y-4">
          <h4 className="text-xs font-black uppercase text-slate-800 tracking-wider flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-sky-600" />
            FAA Part 117 Legality Audit
          </h4>

          {conflictResult.hasConflict ? (
            <div className="p-3 bg-rose-50 border border-rose-300 rounded-xl text-xs text-rose-950 leading-relaxed font-sans flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <strong className="font-bold text-rose-900">Roster Conflict Detected:</strong>
                <p className="mt-1 text-[11px] text-rose-900">{conflictResult.reason}</p>
              </div>
            </div>
          ) : (
            <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-xs text-emerald-950 leading-relaxed font-sans flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
              <div>
                <strong className="font-bold text-emerald-900">Legality Check Passed:</strong>
                <p className="mt-0.5 text-[11px] text-emerald-900">This sequence is fully legal to pick up on your current roster.</p>
              </div>
            </div>
          )}

          <div className="space-y-2.5">
            {conflictResult.auditTrail?.map((audit, idx) => (
              <div
                key={idx}
                className={`p-3 rounded-xl border text-xs font-sans space-y-1 ${
                  audit.passed
                    ? "bg-white border-slate-200 text-slate-800"
                    : "bg-rose-50 border-rose-200 text-slate-800"
                }`}
              >
                <div className="flex justify-between items-center">
                  <span className="font-bold flex items-center gap-1.5 text-slate-900">
                    {audit.passed ? (
                      <span className="w-2 h-2 rounded-full bg-emerald-600" />
                    ) : (
                      <span className="w-2 h-2 rounded-full bg-rose-600 animate-pulse" />
                    )}
                    {audit.name}
                  </span>
                  <span
                    className={`px-1.5 py-0.2 rounded text-[9px] font-black uppercase ${
                      audit.passed
                        ? "bg-emerald-100 text-emerald-900 border border-emerald-300"
                        : "bg-rose-100 text-rose-900 border border-rose-300"
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
        <h4 className="text-xs font-black uppercase text-slate-700 tracking-wider mb-2 flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-sky-600" />
          Duty Period Timeline
        </h4>

        {seq.dutyPeriods.map((dp: DutyPeriod) => {
          const hasLayover = !!dp.layoverCity;
          const fdpAudit = auditDutyPeriodFdp(dp);

          return (
            <div
              key={dp.dayIndex}
              className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-4 shadow-2xs text-slate-900"
            >
              {/* Duty Day Header */}
              <div className="flex justify-between items-center pb-2 border-b border-slate-200 flex-wrap gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-extrabold text-slate-900">
                    Duty Day {dp.dayIndex + 1}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono border ${
                    fdpAudit.isFdpLegal
                      ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                      : "bg-rose-100 text-rose-900 border-rose-300"
                  }`}>
                    Table B Max FDP: {fdpAudit.maxFdpHours.toFixed(1)}h ({fdpAudit.fdpMarginMinutes >= 0 ? `${fdpAudit.fdpMarginMinutes}m margin` : `${Math.abs(fdpAudit.fdpMarginMinutes)}m OVER`})
                  </span>
                  {(dp.isOvertime || dp.legs.some((l: FlightLeg) => l.isOvertime)) && (
                    <span className="px-2 py-0.5 rounded bg-amber-100 border border-amber-300 text-amber-900 text-[10px] font-black uppercase">
                      OVERTIME (OT)
                    </span>
                  )}
                </div>
              </div>

              {/* Time displays */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs font-mono">
                <div className="p-2 bg-white rounded-xl border border-slate-200 flex flex-col justify-between">
                  <p className="text-[9px] text-slate-500 font-sans font-bold">Report</p>
                  <div className="mt-0.5 font-bold space-y-0.5">
                    <p className="text-slate-800 text-[10px]">
                      <span className="text-[8px] text-sky-600 mr-1 uppercase">S</span>
                      {formatTime(dp.reportTime)}
                    </p>
                    {dp.actualReportTime !== undefined && (
                      <p className="text-emerald-700 text-[10px]">
                        <span className="text-[8px] text-emerald-700 mr-1 uppercase">A</span>
                        {formatTime(dp.actualReportTime)}
                      </p>
                    )}
                  </div>
                </div>
                <div className="p-2 bg-white rounded-xl border border-slate-200 flex flex-col justify-between">
                  <p className="text-[9px] text-slate-500 font-sans font-bold">Release</p>
                  <div className="mt-0.5 font-bold space-y-0.5">
                    <p className="text-slate-800 text-[10px]">
                      <span className="text-[8px] text-sky-600 mr-1 uppercase">S</span>
                      {formatTime(dp.releaseTime)}
                    </p>
                    {dp.actualReleaseTime !== undefined && (
                      <p className="text-emerald-700 text-[10px]">
                        <span className="text-[8px] text-emerald-700 mr-1 uppercase">A</span>
                        {formatTime(dp.actualReleaseTime)}
                      </p>
                    )}
                  </div>
                </div>
                <div className="p-2 bg-white rounded-xl border border-slate-200 flex flex-col justify-between">
                  <p className="text-[9px] text-slate-500 font-sans font-bold">Duty Length</p>
                  <div className="mt-0.5 font-bold space-y-0.5">
                    <p className="text-slate-800 text-[10px]">
                      <span className="text-[8px] text-sky-600 mr-1 uppercase">S</span>
                      {Math.floor(dp.dutyMinutes / 60)}h {dp.dutyMinutes % 60}m
                    </p>
                    {dp.actualDutyMinutes !== undefined && (
                      <p className="text-emerald-700 text-[10px]">
                        <span className="text-[8px] text-emerald-700 mr-1 uppercase">A</span>
                        {Math.floor(dp.actualDutyMinutes / 60)}h {dp.actualDutyMinutes % 60}m
                      </p>
                    )}
                  </div>
                </div>
                <div className="p-2 bg-white rounded-xl border border-slate-200 flex flex-col justify-between">
                  <p className="text-[9px] text-slate-500 font-sans font-bold">Block Time</p>
                  <div className="mt-0.5 font-bold space-y-0.5">
                    <p className="text-slate-800 text-[10px]">
                      <span className="text-[8px] text-sky-600 mr-1 uppercase">S</span>
                      {Math.floor(dp.legs.reduce((acc: number, l: FlightLeg) => acc + l.blockMinutes, 0) / 60)}h {dp.legs.reduce((acc: number, l: FlightLeg) => acc + l.blockMinutes, 0) % 60}m
                    </p>
                    {dp.actualBlockMinutes !== undefined && (
                      <p className="text-emerald-700 text-[10px]">
                        <span className="text-[8px] text-emerald-700 mr-1 uppercase">A</span>
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
                      className="p-3 bg-white rounded-xl border border-slate-200 flex justify-between items-center text-xs font-mono shadow-2xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className={`p-1.5 rounded-lg border ${
                          leg.isDeadhead
                            ? "bg-amber-100 text-amber-900 border-amber-300"
                            : "bg-sky-100 text-sky-900 border-sky-200"
                        }`}>
                          <Plane className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <p className="font-black text-slate-900">{leg.flightNumber}</p>
                            {leg.isDeadhead && (
                              <span className="px-1.5 py-0.2 rounded bg-amber-100 text-amber-900 border border-amber-300 text-[9px] font-black uppercase">
                                DH
                              </span>
                            )}
                            {leg.isOvertime && (
                              <span className="px-1.5 py-0.2 rounded bg-amber-100 text-amber-900 border border-amber-300 text-[9px] font-black uppercase">
                                OT
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="text-right space-y-0.5">
                        <p className="font-black text-slate-900">
                          {leg.depAirport} → {leg.arrAirport}
                        </p>
                        {leg.actualDepTime ? (
                          <div className="text-[10px] space-y-0.5">
                            <p className="text-slate-500">
                              <span className="text-[8px] font-bold text-sky-700 mr-1 uppercase">SKD</span>
                              {leg.depTime} - {leg.arrTime} ({Math.floor(leg.blockMinutes / 60)}h {leg.blockMinutes % 60}m)
                            </p>
                            <p className="text-emerald-700 font-black">
                              <span className="text-[8px] font-extrabold text-emerald-800 mr-1 uppercase">ACT</span>
                              {leg.actualDepTime} - {leg.actualArrTime} ({Math.floor((leg.actualBlockMinutes ?? 0) / 60)}h {(leg.actualBlockMinutes ?? 0) % 60}m)
                            </p>
                          </div>
                        ) : (
                          <p className="text-[10px] text-slate-500 font-bold">
                            {leg.depTime} - {leg.arrTime} ({Math.floor(leg.blockMinutes / 60)}h {leg.blockMinutes % 60}m)
                          </p>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-400 italic text-center py-2">
                    No flight legs scheduled. DFP or Standby.
                  </p>
                )}
              </div>

              {/* Layover / Hotel Info */}
              {hasLayover && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs space-y-1">
                  <div className="flex items-center gap-1.5 text-amber-900 font-black">
                    <Home className="w-3.5 h-3.5 text-amber-600" />
                    <span>Layover: {dp.layoverCity}</span>
                  </div>
                  {isRealHotelInfo(dp.layoverHotelInfo) && (
                    <p className="text-slate-700 text-[11px] leading-relaxed">
                      {dp.layoverHotelInfo}
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
