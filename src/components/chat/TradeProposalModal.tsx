"use client";

import React, { useState, useEffect } from "react";
import { useMessageStore } from "../../store/useMessageStore";
import { useCrewStore } from "../../store/useCrewStore";
import { SequenceTrip, DutyPeriod, FlightLeg } from "../../types";
import {
  Sparkles,
  X,
  Plane,
  Calendar,
  Clock,
  Check,
  ChevronDown,
  ChevronRight,
  Layers,
  ArrowRight,
} from "lucide-react";

interface TradeProposalModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function TradeProposalModal({ isOpen, onClose }: TradeProposalModalProps) {
  const proposeTrade = useMessageStore((s) => s.proposeTrade);
  const sequences = useCrewStore((s) => s.sequences);

  const [selectedSeqNumber, setSelectedSeqNumber] = useState<string>("");
  const [tradeScope, setTradeScope] = useState<"FULL_SEQUENCE" | "SELECTED_FLIGHTS">("FULL_SEQUENCE");
  const [selectedFlightNumbers, setSelectedFlightNumbers] = useState<string[]>([]);
  const [offeredDate, setOfferedDate] = useState<string>("");
  const [creditHours, setCreditHours] = useState<number>(0);
  const [desiredText, setDesiredText] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [expandedDays, setExpandedDays] = useState<Record<number, boolean>>({});
  const todayStr = new Date().toISOString().split("T")[0];


  const activeSequences = sequences.filter((s) => {
    if (s.isDropped) return false;
    const seqEndDate = s.endDate || s.startDate;
    if (!seqEndDate) return true;
    return seqEndDate >= todayStr;
  });
  const currentSequence = activeSequences.find((s) => s.sequenceNumber === selectedSeqNumber);


  const handleSelectSequence = (seq: SequenceTrip) => {
    setSelectedSeqNumber(seq.sequenceNumber);
    setOfferedDate(seq.startDate || new Date().toISOString().split("T")[0]);
    const totalCred = seq.totalCreditMinutes ? +(seq.totalCreditMinutes / 60).toFixed(2) : 18.5;
    setCreditHours(totalCred);

    // Collect all flight numbers
    const allFlightNos: string[] = [];
    const expanded: Record<number, boolean> = {};
    if (seq.dutyPeriods) {
      seq.dutyPeriods.forEach((dp, idx) => {
        expanded[idx] = true;
        dp.legs.forEach((leg) => {
          allFlightNos.push(leg.flightNumber);
        });
      });
    }
    setSelectedFlightNumbers(allFlightNos);
    setExpandedDays(expanded);
  };

  // Default to first sequence when opening
  useEffect(() => {
    if (activeSequences.length > 0 && !selectedSeqNumber) {
      handleSelectSequence(activeSequences[0]);
    }
  }, [activeSequences, selectedSeqNumber]);

  if (!isOpen) return null;


  const toggleFlight = (flightNo: string, blockMins: number) => {
    const isAlreadySelected = selectedFlightNumbers.includes(flightNo);
    let updated: string[];
    if (isAlreadySelected) {
      updated = selectedFlightNumbers.filter((f) => f !== flightNo);
    } else {
      updated = [...selectedFlightNumbers, flightNo];
    }
    setSelectedFlightNumbers(updated);

    // Recalculate estimated credit hours proportionally
    if (currentSequence && currentSequence.dutyPeriods) {
      let totalSelectedBlock = 0;
      let totalTripBlock = currentSequence.totalBlockMinutes || 1;
      currentSequence.dutyPeriods.forEach((dp) => {
        dp.legs.forEach((leg) => {
          if (updated.includes(leg.flightNumber)) {
            totalSelectedBlock += leg.blockMinutes || 120;
          }
        });
      });
      const fullCred = currentSequence.totalCreditMinutes
        ? currentSequence.totalCreditMinutes / 60
        : 18.5;
      const ratio = totalTripBlock > 0 ? totalSelectedBlock / totalTripBlock : 1;
      setCreditHours(+(fullCred * ratio).toFixed(2));
    }
  };

  const selectAllFlights = () => {
    if (!currentSequence || !currentSequence.dutyPeriods) return;
    const all = currentSequence.dutyPeriods.flatMap((dp) => dp.legs.map((l) => l.flightNumber));
    setSelectedFlightNumbers(all);
    setTradeScope("FULL_SEQUENCE");
    setCreditHours(
      currentSequence.totalCreditMinutes
        ? +(currentSequence.totalCreditMinutes / 60).toFixed(2)
        : 18.5
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSeqNumber || !offeredDate) return;

    setIsSubmitting(true);
    try {
      // Build selected legs and HSS summary
      let selectedLegs: any[] = [];
      let hssSummary: any = undefined;

      if (currentSequence) {
        hssSummary = {
          base: currentSequence.base || "ORD",
          equipment: currentSequence.equipment || "E175",
          totalDutyPeriods: currentSequence.dutyPeriods?.length || 1,
          totalBlockMinutes: currentSequence.totalBlockMinutes || 0,
          totalCreditMinutes: currentSequence.totalCreditMinutes || 0,
          layoverCities: currentSequence.layoverCities || [],
          dutyPeriods: currentSequence.dutyPeriods?.map((dp, dIdx) => ({
            dayIndex: dIdx + 1,
            reportTime: dp.reportTime,
            releaseTime: dp.releaseTime,
            layoverCity: dp.layoverCity,
            layoverRestHours: dp.layoverRestMinutes ? +(dp.layoverRestMinutes / 60).toFixed(1) : undefined,
            legs: dp.legs.map((l) => ({
              flightNumber: l.flightNumber,
              depAirport: l.depAirport,
              arrAirport: l.arrAirport,
              depTime: l.depTime,
              arrTime: l.arrTime,
              blockMinutes: l.blockMinutes,
              equipment: l.equipment || currentSequence.equipment,
            })),
          })) || [],
        };

        if (currentSequence.dutyPeriods) {
          currentSequence.dutyPeriods.forEach((dp, dIdx) => {
            dp.legs.forEach((leg) => {
              if (
                tradeScope === "FULL_SEQUENCE" ||
                selectedFlightNumbers.includes(leg.flightNumber)
              ) {
                selectedLegs.push({
                  flightNumber: leg.flightNumber,
                  depAirport: leg.depAirport,
                  arrAirport: leg.arrAirport,
                  depTime: leg.depTime,
                  arrTime: leg.arrTime,
                  blockMinutes: leg.blockMinutes,
                  equipment: leg.equipment || currentSequence.equipment,
                  dutyDayIndex: dIdx + 1,
                });
              }
            });
          });
        }
      }

      await proposeTrade({
        offeredSequenceNumber: selectedSeqNumber,
        offeredDate,
        offeredCreditHours: creditHours || 18.5,
        tradeScope,
        selectedFlightNumbers: tradeScope === "SELECTED_FLIGHTS" ? selectedFlightNumbers : undefined,
        selectedLegs,
        fullHssSummary: hssSummary,
        desiredDateOrTrip: desiredText.trim() || undefined,
      });

      onClose();

    } catch (err) {
      console.error("Trade proposal submission failed:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-xs z-[100000] animate-fadeIn"
        onClick={onClose}
      />
      <div className="fixed inset-x-0 bottom-0 z-[100001] w-full max-w-lg mx-auto bg-white border-t border-slate-200 rounded-t-[28px] shadow-2xl flex flex-col animate-slideUp max-h-[92vh] overflow-hidden text-slate-900 pb-[max(1rem,env(safe-area-inset-bottom,0px))] font-sans">
        {/* Grabber Pill */}
        <div className="w-10 h-1 rounded-full bg-slate-300 mx-auto mt-2.5 mb-1" />

        {/* Header */}
        <div className="flex justify-between items-center px-5 py-3 border-b border-slate-200 bg-white shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-2xl bg-amber-50 text-amber-800 border border-amber-300">
              <Sparkles className="w-4 h-4 text-amber-600" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900 leading-tight">
                Trip Trade / HSS Breakdown
              </h3>
              <p className="text-[11px] text-slate-500">
                Select full sequence or individual flights to trade
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition cursor-pointer active:scale-95"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit} className="p-4 overflow-y-auto space-y-3.5 flex-1 scrollbar-thin">
          {activeSequences.length === 0 && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-center text-xs text-amber-900 font-semibold">
              <Plane className="w-5 h-5 text-amber-600 mx-auto mb-1.5" />
              <p>No current or upcoming pairings available on your schedule.</p>
              <p className="text-[11px] text-amber-700 font-normal mt-0.5">
                Past completed sequences cannot be traded or dropped.
              </p>
            </div>
          )}

          {/* 1. Sequence Selector Carousel */}
          {activeSequences.length > 0 && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                1. Select Current or Future Sequence Pairing:
              </label>

              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                {activeSequences.map((seq) => {
                  const isSelected = selectedSeqNumber === seq.sequenceNumber;
                  return (
                    <button
                      key={seq.id || seq.sequenceNumber}
                      type="button"
                      onClick={() => handleSelectSequence(seq)}
                      className={`p-2.5 rounded-2xl border text-left shrink-0 min-w-[140px] transition cursor-pointer active:scale-95 ${
                        isSelected
                          ? "bg-sky-50 border-[#007AFF] text-slate-900 shadow-xs"
                          : "bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700"
                      }`}
                    >
                      <div className="font-extrabold text-sm">#{seq.sequenceNumber}</div>
                      <div className="text-[11px] text-sky-700 font-bold">
                        {seq.base} {seq.equipment} • {seq.dutyPeriods?.length || 3}D
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        {((seq.totalCreditMinutes || 1110) / 60).toFixed(2)}h Credit
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 2. Trade Scope Toggle */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              2. Trade Scope:
            </label>
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={selectAllFlights}
                className={`flex-1 py-1.5 rounded-lg text-xs font-extrabold transition cursor-pointer text-center ${
                  tradeScope === "FULL_SEQUENCE"
                    ? "bg-white text-slate-900 shadow-xs border border-slate-200"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Full Sequence (All Days)
              </button>

              <button
                type="button"
                onClick={() => setTradeScope("SELECTED_FLIGHTS")}
                className={`flex-1 py-1.5 rounded-lg text-xs font-extrabold transition cursor-pointer text-center ${
                  tradeScope === "SELECTED_FLIGHTS"
                    ? "bg-white text-slate-900 shadow-xs border border-slate-200"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Specific Flights / Days
              </button>
            </div>
          </div>

          {/* 3. Granular HSS Flight-by-Flight Breakdown */}
          {currentSequence && currentSequence.dutyPeriods && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-extrabold text-slate-800 flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5 text-sky-600" />
                  <span>HSS Pairing Breakdown & Legs</span>
                </label>
                <span className="text-[10.5px] text-sky-700 font-bold">
                  {selectedFlightNumbers.length} of{" "}
                  {currentSequence.dutyPeriods.reduce((sum, dp) => sum + dp.legs.length, 0)} Legs Selected
                </span>
              </div>

              <div className="space-y-2.5 bg-slate-50 p-2.5 rounded-2xl border border-slate-200">
                {currentSequence.dutyPeriods.map((dp, dIdx) => (
                  <div key={dIdx} className="bg-white rounded-xl border border-slate-200/80 overflow-hidden shadow-2xs">
                    {/* Duty Header */}
                    <div className="px-3 py-1.5 bg-slate-100/70 border-b border-slate-200 flex items-center justify-between text-xs font-bold text-slate-800">
                      <div className="flex items-center gap-1.5">
                        <span className="bg-sky-100 text-sky-800 px-1.5 py-0.2 rounded text-[10px]">
                          Day {dIdx + 1}
                        </span>
                        <span className="text-[11px] text-slate-600">
                          Rpt: {dp.reportTime || "07:00"} • Rel: {dp.releaseTime || "16:30"}
                        </span>
                      </div>
                      {dp.layoverCity && (
                        <span className="text-[10px] text-amber-800 font-bold bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                          {dp.layoverCity} ({dp.layoverRestMinutes ? `${(dp.layoverRestMinutes / 60).toFixed(1)}h` : "Layover"})
                        </span>
                      )}
                    </div>

                    {/* Duty Flight Legs */}
                    <div className="divide-y divide-slate-100">
                      {dp.legs.map((leg, lIdx) => {
                        const isLegSelected = selectedFlightNumbers.includes(leg.flightNumber);
                        return (
                          <div
                            key={lIdx}
                            onClick={() => toggleFlight(leg.flightNumber, leg.blockMinutes || 120)}
                            className={`px-3 py-2 flex items-center justify-between cursor-pointer transition ${
                              isLegSelected ? "bg-sky-50/50" : "hover:bg-slate-50 opacity-60"
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div
                                className={`w-4 h-4 rounded border flex items-center justify-center transition shrink-0 ${
                                  isLegSelected
                                    ? "bg-[#007AFF] border-[#007AFF] text-white"
                                    : "border-slate-300 bg-white"
                                }`}
                              >
                                {isLegSelected && <Check className="w-3 h-3 stroke-[3]" />}
                              </div>

                              <div>
                                <div className="flex items-center gap-1.5">
                                  <span className="font-extrabold text-xs text-slate-900">
                                    Flight {leg.flightNumber}
                                  </span>
                                  <span className="text-[10px] text-slate-500 font-mono">
                                    ({leg.equipment || currentSequence.equipment || "E175"})
                                  </span>
                                </div>
                                <div className="flex items-center gap-1 text-[11px] text-slate-600 font-mono mt-0.5">
                                  <span className="font-bold text-slate-900">{leg.depAirport}</span>
                                  <span>{leg.depTime}</span>
                                  <ArrowRight className="w-2.5 h-2.5 text-slate-400 mx-0.5" />
                                  <span className="font-bold text-slate-900">{leg.arrAirport}</span>
                                  <span>{leg.arrTime}</span>
                                </div>
                              </div>
                            </div>

                            <div className="text-right shrink-0">
                              <span className="text-xs font-bold text-slate-800 block">
                                {((leg.blockMinutes || 120) / 60).toFixed(2)}h
                              </span>
                              <span className="text-[9.5px] text-slate-400">Block</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 4. Calculated Credit & Desired Swap */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Trip Start Date:
              </label>
              <input
                type="date"
                value={offeredDate}
                onChange={(e) => setOfferedDate(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-[#007AFF] focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Offered Credit (Hours):
              </label>
              <input
                type="number"
                step="0.1"
                value={creditHours || ""}
                onChange={(e) => setCreditHours(parseFloat(e.target.value) || 0)}
                placeholder="e.g. 18.5"
                required
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-[#007AFF] focus:bg-white font-bold"
              />
            </div>
          </div>

          {/* Desired Text */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Desired in Exchange: (Optional)
            </label>
            <textarea
              value={desiredText}
              onChange={(e) => setDesiredText(e.target.value)}
              placeholder="e.g. Looking for weekend off or similar credit 2-day turn in ORD..."
              rows={2}
              className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-300 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#007AFF] focus:bg-white resize-none"
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={!selectedSeqNumber || selectedFlightNumbers.length === 0 || isSubmitting}
            className={`w-full py-3 rounded-2xl text-xs font-black transition cursor-pointer flex items-center justify-center gap-1.5 shadow-sm active:scale-98 ${
              selectedSeqNumber && selectedFlightNumbers.length > 0 && !isSubmitting
                ? "bg-[#007AFF] hover:bg-[#0062D2] text-white shadow-sky-500/20"
                : "bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300/60"
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>
              {isSubmitting
                ? "Broadcasting..."
                : `Broadcast Trade (${selectedFlightNumbers.length} Flights • ${creditHours.toFixed(2)}h Credit)`}
            </span>
          </button>
        </form>
      </div>
    </>
  );
}
