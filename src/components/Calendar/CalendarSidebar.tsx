"use client";

import { useState, useEffect } from "react";
import SequenceInspector from "../SequenceInspector/Inspector";
import OpenTimeOverlay from "./OpenTimeOverlay";
import { useCrewStore } from "../../store/useCrewStore";

export default function CalendarSidebar() {
  const selectedSequenceId = useCrewStore((state) => state.selectedSequenceId);
  const [sidebarTab, setSidebarTab] = useState<"inspect" | "opentime">("inspect");
  const openSequences = useCrewStore((state) => state.openSequences);
  const simulatedIds = useCrewStore((state) => state.simulatedSequenceIds);

  useEffect(() => {
    if (selectedSequenceId === "open-time") {
      setSidebarTab("opentime");
    } else if (selectedSequenceId) {
      setSidebarTab("inspect");
    }
  }, [selectedSequenceId]);

  return (
    <div className="flex flex-col gap-6 h-full font-sans">
      {/* Sidebar Switcher */}
      <div className="flex bg-slate-950 p-1.5 rounded-2xl border border-slate-850 text-xs font-semibold shrink-0">
        <button
          onClick={() => setSidebarTab("inspect")}
          className={`flex-1 py-2.5 rounded-xl transition duration-150 ${
            sidebarTab === "inspect" ? "bg-indigo-600 text-white shadow" : "text-slate-400 hover:text-slate-200"
          }`}
        >
          Trip Inspector
        </button>
        <button
          onClick={() => setSidebarTab("opentime")}
          className={`flex-1 py-2.5 rounded-xl transition duration-150 flex items-center justify-center gap-1.5 ${
            sidebarTab === "opentime" ? "bg-indigo-600 text-white shadow" : "text-slate-400 hover:text-slate-200"
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
