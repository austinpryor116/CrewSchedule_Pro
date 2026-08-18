"use client";

import React from "react";
import { TradeOfferEmbed } from "../../types";
import {
  X,
  Layers,
  Plane,
  Clock,
  MapPin,
  Calendar,
  Sparkles,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Shield,
  Check,
} from "lucide-react";

interface HssDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  tradeOffer: TradeOfferEmbed;
  isCurrentUser?: boolean;
  onAcceptTrade?: (offerId: string) => void;
  onDeclineTrade?: (offerId: string) => void;
}

export default function HssDetailModal({
  isOpen,
  onClose,
  tradeOffer,
  isCurrentUser = false,
  onAcceptTrade,
  onDeclineTrade,
}: HssDetailModalProps) {
  if (!isOpen) return null;

  const hss = tradeOffer.fullHssSummary;
  const isSelectedScope = tradeOffer.tradeScope === "SELECTED_FLIGHTS";
  const selectedFlightNos = tradeOffer.selectedFlightNumbers || [];

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-xs z-[100002] animate-fadeIn"
        onClick={onClose}
      />

      {/* Modal / Bottom Sheet */}
      <div className="fixed inset-x-0 bottom-0 z-[100003] w-full max-w-lg mx-auto bg-white border-t border-slate-200 rounded-t-[32px] shadow-2xl flex flex-col animate-slideUp max-h-[90vh] overflow-hidden text-slate-900 pb-[max(1.25rem,env(safe-area-inset-bottom,0px))] font-sans">
        {/* Grabber Pill */}
        <div className="w-12 h-1.5 rounded-full bg-slate-300 mx-auto mt-3 mb-1 shrink-0" />

        {/* Header */}
        <div className="flex justify-between items-center px-5 py-3.5 border-b border-slate-200 bg-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-sky-50 text-[#007AFF] border border-sky-200">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-slate-900 leading-tight">
                  Sequence #{tradeOffer.offeredSequenceNumber}
                </h3>
                <span
                  className={`text-[9px] font-black px-2 py-0.5 rounded-full ${
                    isSelectedScope
                      ? "bg-purple-100 text-purple-800 border border-purple-300"
                      : "bg-sky-100 text-sky-800 border border-sky-300"
                  }`}
                >
                  {isSelectedScope ? "SELECT FLIGHTS" : "FULL SEQUENCE"}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                {hss?.base || "ORD"} {hss?.equipment || "E175"} • Date: {tradeOffer.offeredDate}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition cursor-pointer active:scale-95"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-3 gap-2 px-5 py-3 bg-slate-50 border-b border-slate-200 shrink-0">
          <div className="p-2 bg-white rounded-xl border border-slate-200 text-center">
            <span className="text-[10px] text-slate-500 block font-medium">Offered Credit</span>
            <span className="font-black text-sm text-[#007AFF]">
              {tradeOffer.offeredCreditHours.toFixed(2)}h
            </span>
          </div>

          <div className="p-2 bg-white rounded-xl border border-slate-200 text-center">
            <span className="text-[10px] text-slate-500 block font-medium">Duty Days</span>
            <span className="font-black text-sm text-slate-800">
              {hss?.totalDutyPeriods || 3} Days
            </span>
          </div>

          <div className="p-2 bg-white rounded-xl border border-slate-200 text-center">
            <span className="text-[10px] text-slate-500 block font-medium">Trade Scope</span>
            <span className="font-black text-sm text-purple-700">
              {isSelectedScope ? `${selectedFlightNos.length} Flights` : "All Flights"}
            </span>
          </div>
        </div>

        {/* Scrollable HSS Itinerary Content */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1 scrollbar-thin">
          {/* Desired Trade Conditions Notice */}
          {tradeOffer.desiredDateOrTrip && (
            <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 leading-relaxed">
              <span className="font-extrabold text-[10px] uppercase tracking-wider block text-amber-800 mb-0.5">
                Desired in Exchange:
              </span>
              {tradeOffer.desiredDateOrTrip}
            </div>
          )}

          {/* Duty Period Breakdowns */}
          {hss?.dutyPeriods && hss.dutyPeriods.length > 0 ? (
            hss.dutyPeriods.map((dp, dIdx) => (
              <div
                key={dIdx}
                className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden"
              >
                {/* Duty Header */}
                <div className="px-4 py-2.5 bg-slate-100/80 border-b border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-sky-600 text-white rounded-md text-[10.5px] font-black">
                      Day {dp.dayIndex || dIdx + 1}
                    </span>
                    <span className="text-xs font-bold text-slate-700">
                      Rpt: {dp.reportTime || "07:00"} • Rel: {dp.releaseTime || "16:30"}
                    </span>
                  </div>

                  {dp.layoverCity && (
                    <span className="text-[11px] font-bold text-amber-800 bg-amber-100/80 px-2 py-0.5 rounded-lg border border-amber-300">
                      {dp.layoverCity} ({dp.layoverRestHours ? `${dp.layoverRestHours}h` : "Layover"})
                    </span>
                  )}
                </div>

                {/* Legs in this duty period */}
                <div className="divide-y divide-slate-100">
                  {dp.legs.map((leg, lIdx) => {
                    const isOfferedLeg =
                      !isSelectedScope || selectedFlightNos.includes(leg.flightNumber);

                    return (
                      <div
                        key={lIdx}
                        className={`p-3.5 flex items-center justify-between transition ${
                          isOfferedLeg
                            ? "bg-sky-50/40"
                            : "opacity-60 bg-slate-50/50"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 ${
                              isOfferedLeg
                                ? "bg-[#007AFF] text-white"
                                : "bg-slate-200 text-slate-500"
                            }`}
                          >
                            <Plane className="w-3.5 h-3.5" />
                          </div>

                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-black text-sm text-slate-900">
                                Flight {leg.flightNumber}
                              </span>
                              <span className="text-[10px] text-slate-500 font-mono">
                                ({leg.equipment || hss.equipment || "E175"})
                              </span>
                              {isOfferedLeg ? (
                                <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-0.5">
                                  <Check className="w-2.5 h-2.5" /> Offered
                                </span>
                              ) : (
                                <span className="text-[9px] font-semibold px-1.5 py-0.2 rounded bg-slate-200 text-slate-600">
                                  Retained
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-1.5 text-xs text-slate-600 font-mono mt-1">
                              <span className="font-black text-slate-900">{leg.depAirport}</span>
                              <span className="text-slate-500">{leg.depTime}</span>
                              <ArrowRight className="w-3 h-3 text-slate-400 mx-0.5" />
                              <span className="font-black text-slate-900">{leg.arrAirport}</span>
                              <span className="text-slate-500">{leg.arrTime}</span>
                            </div>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="font-black text-xs text-slate-900 block">
                            {((leg.blockMinutes || 120) / 60).toFixed(2)}h
                          </span>
                          <span className="text-[10px] text-slate-400">Block</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          ) : tradeOffer.selectedLegs && tradeOffer.selectedLegs.length > 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100 overflow-hidden">
              {tradeOffer.selectedLegs.map((leg, lIdx) => (
                <div key={lIdx} className="p-3.5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-xl bg-[#007AFF] text-white flex items-center justify-center">
                      <Plane className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-black text-sm text-slate-900">
                          Flight {leg.flightNumber}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          ({leg.equipment || "E175"})
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-slate-600 font-mono mt-0.5">
                        <span className="font-bold">{leg.depAirport} {leg.depTime}</span>
                        <ArrowRight className="w-3 h-3 text-slate-400" />
                        <span className="font-bold">{leg.arrAirport} {leg.arrTime}</span>
                      </div>
                    </div>
                  </div>
                  <span className="font-black text-xs text-slate-800">
                    {((leg.blockMinutes || 120) / 60).toFixed(2)}h
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-center text-xs text-slate-500">
              Sequence pairing information available in scheduling.
            </div>
          )}
        </div>

        {/* Footer Actions */}
        {tradeOffer.status === "PENDING" && !isCurrentUser && onAcceptTrade && onDeclineTrade ? (
          <div className="p-4 bg-white border-t border-slate-200 flex gap-3 shrink-0">
            <button
              onClick={() => {
                onAcceptTrade(tradeOffer.offerId);
                onClose();
              }}
              className="flex-1 py-3 bg-[#34C759] hover:bg-[#2EB350] text-white rounded-2xl text-xs font-black transition flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer shadow-sm"
            >
              <CheckCircle2 className="w-4 h-4" /> Accept Trade
            </button>
            <button
              onClick={() => {
                onDeclineTrade(tradeOffer.offerId);
                onClose();
              }}
              className="px-5 py-3 bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-700 rounded-2xl text-xs font-black transition flex items-center justify-center gap-1 active:scale-95 cursor-pointer border border-slate-300"
            >
              <XCircle className="w-4 h-4" /> Decline
            </button>
          </div>
        ) : (
          <div className="p-4 bg-white border-t border-slate-200 shrink-0">
            <button
              onClick={onClose}
              className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-2xl text-xs font-black transition cursor-pointer active:scale-95"
            >
              Close Breakdown
            </button>
          </div>
        )}
      </div>
    </>
  );
}
