"use client";

import React from "react";
import { useMessageStore } from "../../store/useMessageStore";
import { useCrewStore } from "../../store/useCrewStore";
import { FlightLegSummaryEmbed } from "../../types";
import {
  Car,
  Clock,
  Snowflake,
  Shield,
  DoorClosed,
  Zap,
} from "lucide-react";

interface TacticalMacroBarProps {
  onMacroTriggered?: () => void;
}

export default function TacticalMacroBar({ onMacroTriggered }: TacticalMacroBarProps) {
  const sendQuickMacro = useMessageStore((s) => s.sendQuickMacro);
  const sequences = useCrewStore((s) => s.sequences);

  // Extract active flight leg from sequences if available
  const getActiveLegSummary = (): FlightLegSummaryEmbed | undefined => {
    for (const seq of sequences) {
      if (seq.isDropped || !seq.dutyPeriods) continue;
      for (const dp of seq.dutyPeriods) {
        for (const leg of dp.legs) {
          return {
            flightNumber: leg.flightNumber,
            depAirport: leg.depAirport,
            arrAirport: leg.arrAirport,
            depTime: leg.depTime,
            arrTime: leg.arrTime,
            tailNumber: leg.tailNumber || "N824NN",
            aircraftType: leg.equipment || "E175",
            status: "EN_ROUTE",
          };
        }
      }
    }
    return undefined;
  };

  const macros = [
    {
      id: "van",
      tag: "CREW_VAN" as const,
      label: "Van Departing",
      emoji: "🚐",
      icon: Car,
      color: "bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100",
      description: "15m Lobby Call",
    },
    {
      id: "delay",
      tag: "RUNNING_LATE" as const,
      label: "Inbound Delay",
      emoji: "⏱️",
      icon: Clock,
      color: "bg-rose-50 text-rose-900 border-rose-300 hover:bg-rose-100",
      description: "+15m Gate ETA",
      attachActiveLeg: true,
    },
    {
      id: "deicing",
      tag: "DEICING" as const,
      label: "De-icing Pad",
      emoji: "❄️",
      icon: Snowflake,
      color: "bg-cyan-50 text-cyan-900 border-cyan-300 hover:bg-cyan-100",
      description: "Type I/IV active",
    },
    {
      id: "rest",
      tag: "REST_START" as const,
      label: "Legal Rest Active",
      emoji: "🛡️",
      icon: Shield,
      color: "bg-emerald-50 text-emerald-900 border-emerald-300 hover:bg-emerald-100",
      description: "Mute alerts",
    },
    {
      id: "gatehold",
      tag: "GATE_HOLD" as const,
      label: "Gate Hold",
      emoji: "🚪",
      icon: DoorClosed,
      color: "bg-purple-50 text-purple-900 border-purple-300 hover:bg-purple-100",
      description: "ATC ground delay",
    },
  ];

  const handleMacroClick = async (macro: typeof macros[0]) => {
    const activeLeg = macro.attachActiveLeg ? getActiveLegSummary() : undefined;
    await sendQuickMacro(macro.tag, undefined, activeLeg);
    if (onMacroTriggered) {
      onMacroTriggered();
    }
  };

  return (
    <div className="p-3 bg-slate-50 border-t border-slate-200 select-none">
      <div className="flex items-center justify-between px-1 mb-2">
        <span className="text-[11px] font-extrabold text-slate-800 flex items-center gap-1.5">
          <Zap className="w-3.5 h-3.5 text-amber-600" />
          Aviation Tactical Quick Actions
        </span>
        <span className="text-[10px] text-slate-500 font-medium">1-Tap Cockpit Dispatch</span>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {macros.map((macro) => (
          <button
            key={macro.id}
            onClick={() => handleMacroClick(macro)}
            className={`shrink-0 flex items-center gap-2 px-3 py-2 rounded-2xl ${macro.color} border transition cursor-pointer active:scale-95 text-left shadow-2xs`}
          >
            <span className="text-xl">{macro.emoji}</span>
            <div>
              <span className="text-[12.5px] font-bold block text-slate-900 leading-tight">
                {macro.label}
              </span>
              <span className="text-[10px] text-slate-600 block leading-tight mt-0.5">
                {macro.description}
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
