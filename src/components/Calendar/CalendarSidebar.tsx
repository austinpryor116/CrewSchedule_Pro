"use client";

import { useState } from "react";
import SequenceInspector from "../SequenceInspector/Inspector";
import OpenTimeOverlay from "./OpenTimeOverlay";
import { useCrewStore } from "../../store/useCrewStore";

export default function CalendarSidebar({ mode }: { mode?: "inspect" | "opentime" }) {
  const selectedSequenceId = useCrewStore((state) => state.selectedSequenceId);
  const [activeTabOverride, setActiveTabOverride] = useState<"inspect" | "opentime" | null>(null);
  const openSequences = useCrewStore((state) => state.openSequences);
  const simulatedIds = useCrewStore((state) => state.simulatedSequenceIds);

  if (mode === "opentime") {
    return <OpenTimeOverlay />;
  }

  if (mode === "inspect") {
    return <SequenceInspector />;
  }

  const sidebarTab = selectedSequenceId === "open-time"
    ? "opentime"
    : (activeTabOverride ?? "inspect");

  const setSidebarTab = (tab: "inspect" | "opentime") => setActiveTabOverride(tab);

  return (
    <div className="flex flex-col gap-6 h-full font-sans">
      {/* Sidebar Switcher */}
      <div className="flex bg-white p-1.5 rounded-2xl border border-slate-200 text-xs font-semibold shrink-0 shadow-sm">
        <button
          onClick={() => setSidebarTab("inspect")}
          className={`flex-1 py-2.5 rounded-xl transition duration-150 cursor-pointer ${
            sidebarTab === "inspect" ? "bg-sky-600 text-white shadow-sm font-bold" : "text-slate-700 hover:text-slate-900"
          }`}
        >
          Trip Inspector
        </button>
        <button
          onClick={() => setSidebarTab("opentime")}
          className={`flex-1 py-2.5 rounded-xl transition duration-150 flex items-center justify-center gap-1.5 cursor-pointer ${
            sidebarTab === "opentime" ? "bg-sky-600 text-white shadow-sm font-bold" : "text-slate-700 hover:text-slate-900"
          }`}
        >
          Open Time Overlay
          {openSequences.length > 0 && (
            <span className={`w-2 h-2 rounded-full ${simulatedIds.length > 0 ? "bg-amber-500 animate-ping" : "bg-emerald-500"}`} />
          )}
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-grow">
        {sidebarTab === "inspect" ? (
          <SequenceInspector />
        ) : (
          <OpenTimeOverlay />
        )}
      </div>
    </div>
  );
}
