"use client";

import { useEffect, useState } from "react";
import { useCrewStore } from "../store/useCrewStore";
import CalendarView from "../components/Calendar/CalendarView";
import CalendarSidebar from "../components/Calendar/CalendarSidebar";
import ParserStudio from "../components/ParserStudio/ParserStudio";
import PayCalculator from "../components/PayCalculator/PayCalculator";
import CompliancePanel from "../components/Compliance/CompliancePanel";
import SettingsTab from "../components/Settings/SettingsTab";
import BriefingView from "../components/Briefing/BriefingView";

import {
  Calendar as CalendarIcon,
  FileSpreadsheet,
  Banknote,
  Plane,
  RotateCcw,
  Sparkles,
  Award,
  Clock,
  DollarSign,
  ShieldCheck,
  Pin,
  ChevronLeft,
  ChevronRight,
  Settings,
  Menu
} from "lucide-react";

export default function Home() {
  const isHydrated = useCrewStore((state) => state.isHydrated);
  const hydrate = useCrewStore((state) => state.hydrate);
  
  const activeTab = useCrewStore((state) => state.activeTab);
  const setActiveTab = useCrewStore((state) => state.setActiveTab);
  const sequences = useCrewStore((state) => state.sequences);
  const loadDemoData = useCrewStore((state) => state.loadDemoData);
  const clearAll = useCrewStore((state) => state.clearAll);
  const calcs = useCrewStore((state) => state.getPayCalculations)();
  const rosterMetrics = useCrewStore((state) => state.getRosterMetrics)();
  const selectedSequenceId = useCrewStore((state) => state.selectedSequenceId);
  const setSelectedSequenceId = useCrewStore((state) => state.setSelectedSequenceId);

  // Sidebar states
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);
  const [isSidebarPinned, setIsSidebarPinned] = useState(true);

  // Run hydration on mount and adjust sidebar for mobile
  useEffect(() => {
    hydrate();
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      setIsSidebarCollapsed(true);
    } else {
      setIsSidebarCollapsed(false);
    }
  }, [hydrate]);

  if (!isHydrated) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-950 text-indigo-400 font-mono text-sm">
        <div className="flex flex-col items-center gap-4">
          <RefreshCwIcon className="w-8 h-8 animate-spin text-indigo-500" />
          <span>INITIALIZING CREWSCHEDULE PRO...</span>
        </div>
      </div>
    );
  }

  // Active statistics helper
  const totalCreditHours = calcs.creditHours;
  const totalGrossPay = calcs.grossTotalPay;

  // Derive if sidebar should be expanded
  const isExpanded = !isSidebarCollapsed;

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* Mobile Sidebar Backdrop */}
      {isExpanded && (
        <div
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsSidebarCollapsed(true)}
        />
      )}

      {/* Sidebar Container placeholder to preserve layout grid */}
      <div
        className={`shrink-0 transition-all duration-300 ease-in-out ${
          isSidebarPinned && isExpanded ? "w-0 lg:w-80" : "w-0 lg:w-20"
        }`}
      >
        <aside
          className={`bg-slate-900/95 backdrop-blur-xl lg:bg-slate-900/40 border-r border-slate-800/80 flex flex-col justify-between shrink-0 transition-all duration-300 ease-in-out h-full fixed top-0 bottom-0 left-0 z-50 lg:relative lg:translate-x-0 ${
            isExpanded
              ? "w-80 p-6 translate-x-0 shadow-[10px_0_30px_rgba(0,0,0,0.5)] lg:shadow-none"
              : "w-80 -translate-x-full lg:w-20 lg:translate-x-0 lg:py-6 lg:px-3.5"
          }`}
        >
          <div className="space-y-8">
            {/* Logo Brand */}
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-gradient-to-tr from-indigo-500 to-purple-600 rounded-2xl shadow-lg shadow-indigo-500/20 shrink-0">
                <Plane className="w-6 h-6 text-white transform -rotate-45" />
              </div>
              {isExpanded && (
                <div>
                  <h2 className="text-lg font-black tracking-tight bg-gradient-to-r from-white via-slate-200 to-indigo-400 bg-clip-text text-transparent">
                    CrewSchedule Pro
                  </h2>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                    Professional Suite
                  </p>
                </div>
              )}
            </div>

            {/* Navigation Links */}
            <nav className="space-y-1.5">
              {[
                { id: "calendar", name: "Schedule / Calendar", icon: CalendarIcon },
                { id: "briefing", name: "Pilot Briefing", icon: Plane },
                { id: "import", name: "Parser & Import Studio", icon: FileSpreadsheet },
                { id: "compliance", name: "FAR 117 & CBA Audit", icon: ShieldCheck },
                { id: "settings", name: "System Settings", icon: Settings },
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setActiveTab(tab.id);
                      if (!isSidebarPinned) {
                        setIsSidebarCollapsed(true);
                      }
                    }}
                    className={`w-full flex items-center rounded-2xl text-sm font-semibold transition-all duration-200 text-left cursor-pointer ${
                      isExpanded ? "px-4 py-3 gap-3" : "p-3 justify-center"
                    } ${
                      isActive
                        ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/10 border-l-4 border-indigo-400"
                        : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
                    }`}
                    title={!isExpanded ? tab.name : undefined}
                  >
                    <Icon className={`w-5 h-5 shrink-0 ${isActive ? "text-white" : "text-slate-500"}`} />
                    {isExpanded && <span className="truncate">{tab.name}</span>}
                  </button>
                );
              })}
            </nav>

            {/* Active Roster Statistics Quick Summary */}
            {isExpanded && (
              <div className="bg-slate-950/60 border border-slate-850 rounded-2xl p-4 space-y-3 font-mono text-xs animate-fadeIn">
                <div className="flex justify-between items-center pb-2 border-b border-slate-900">
                  <p className="text-[10px] text-slate-500 font-sans font-black uppercase tracking-wider">
                    Roster & Block Metrics
                  </p>
                  {rosterMetrics.overtimeTripsCount > 0 && (
                    <span className="px-1.5 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 text-amber-400 text-[9px] font-bold">
                      {rosterMetrics.overtimeTripsCount} OT
                    </span>
                  )}
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 font-sans flex items-center gap-1.5">
                      <Award className="w-3.5 h-3.5 text-indigo-400" /> Trips Loaded:
                    </span>
                    <span className="font-bold text-slate-200">{rosterMetrics.totalSequencesCount}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 font-sans flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-emerald-400" /> Flown Block (Excl. DH):
                    </span>
                    <span className="font-bold text-emerald-400">{rosterMetrics.flownBlockHours.toFixed(1)}h</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 font-sans flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-amber-400" /> To Be Flown (Excl. DH):
                    </span>
                    <span className="font-bold text-amber-400">{rosterMetrics.toBeFlownBlockHours.toFixed(1)}h</span>
                  </div>
                  <div className="flex justify-between items-center border-t border-slate-900/60 pt-1.5">
                    <span className="text-slate-400 font-sans flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-indigo-400" /> Total Scheduled (Incl. DH):
                    </span>
                    <span className="font-bold text-slate-200">{rosterMetrics.totalBlockHours.toFixed(1)}h</span>
                  </div>
                  <p className="text-[9px] text-slate-500 font-sans leading-normal mt-2 border-t border-slate-900/40 pt-1.5">
                    * Flown and to-be-flown block times exclude deadheads (DH). Total scheduled block time includes deadheads.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Global Demo Actions and Collapse/Pin Panel */}
          <div className="space-y-4">
            {isExpanded && (
              <div className="space-y-3 animate-fadeIn">
                <button
                  onClick={loadDemoData}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 hover:from-indigo-500/20 hover:to-purple-500/20 text-indigo-300 hover:text-white border border-indigo-500/20 hover:border-indigo-500/30 rounded-2xl font-bold transition text-xs shadow-sm shadow-indigo-500/5 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Load Demo Schedule
                </button>
                <button
                  onClick={clearAll}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-slate-900/50 hover:bg-slate-900 text-slate-500 hover:text-slate-400 border border-slate-800 rounded-2xl font-bold transition text-xs cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Clear Active Roster
                </button>
              </div>
            )}

            {/* Collapse and Pin Controls */}
            <div className={`pt-4 border-t border-slate-800/60 flex items-center gap-2 ${
              isExpanded ? "justify-between" : "justify-center"
            }`}>
              {/* Collapse Toggle */}
              <button
                onClick={() => {
                  setIsSidebarCollapsed(!isSidebarCollapsed);
                }}
                className={`p-2 bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl border border-slate-800 hover:border-slate-700 transition duration-150 flex items-center justify-center cursor-pointer ${
                  !isExpanded ? "w-full" : ""
                }`}
                title={isExpanded ? "Collapse Sidebar" : "Expand Sidebar"}
              >
                {isExpanded ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </button>

              {/* Pin Toggle */}
              {isExpanded && (
                <button
                  onClick={() => setIsSidebarPinned(!isSidebarPinned)}
                  className={`p-2 rounded-xl border transition duration-150 flex items-center justify-center cursor-pointer ${
                    isSidebarPinned
                      ? "bg-indigo-600/20 text-indigo-400 border-indigo-500/30 hover:bg-indigo-600/30"
                      : "bg-slate-900/80 hover:bg-slate-800 text-slate-500 hover:text-slate-400 border border-slate-800 hover:border-slate-700"
                  }`}
                  title={isSidebarPinned ? "Unpin Sidebar" : "Pin Sidebar"}
                >
                  <Pin className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </aside>
      </div>

      {/* Main Workspace Frame */}
      <main className="flex-grow flex flex-col h-full bg-slate-950 overflow-hidden">
        {/* Top bar header */}
        <header className="h-16 border-b border-slate-800/80 px-4 md:px-8 flex items-center justify-between bg-slate-950/60 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            {/* Hamburger Menu for Mobile/Tablet */}
            <button
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className="lg:hidden p-2 -ml-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800/50 transition cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>
            <span className="text-xs text-slate-500 font-mono hidden sm:inline">
              STATUS: ACTIVE // DATABASE: LOCALSTORAGE_PERSISTENT
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/50" />
            <span className="text-xs font-bold text-slate-300">Workspace Connected</span>
          </div>
        </header>

        {/* Dynamic Studio Panels */}
        <div className="flex-grow p-4 md:p-8 overflow-y-auto scrollbar-thin">
          {activeTab === "calendar" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start lg:items-stretch">
              <div className="lg:col-span-2">
                <CalendarView />
              </div>
              
              {selectedSequenceId && (
                <div
                  className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-40 lg:hidden"
                  onClick={() => setSelectedSequenceId(null)}
                />
              )}

              <div className={`
                lg:col-span-1
                lg:sticky lg:top-6 lg:self-start lg:max-h-[calc(100vh-120px)] lg:overflow-y-auto lg:scrollbar-thin
                fixed inset-x-4 bottom-4 z-50 max-h-[85vh] flex flex-col bg-slate-900/95 border border-slate-800 rounded-3xl p-6 shadow-2xl backdrop-blur-xl
                ${selectedSequenceId ? "translate-y-0 opacity-100" : "translate-y-10 opacity-0 pointer-events-none lg:translate-y-0 lg:opacity-100 lg:pointer-events-auto"}
                lg:bg-transparent lg:border-none lg:p-0 lg:shadow-none lg:backdrop-blur-none
                transition-all duration-300
              `}>
                <CalendarSidebar />
              </div>
            </div>
          )}

          {activeTab === "import" && <ParserStudio />}
          {activeTab === "briefing" && <BriefingView />}
          {activeTab === "financials" && <PayCalculator />}
          {activeTab === "compliance" && <CompliancePanel />}
          {activeTab === "settings" && <SettingsTab />}
        </div>
      </main>
    </div>
  );
}

// Simple local spin indicator helper to avoid icon loading states
function RefreshCwIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
      <path d="M3 21v-5h5" />
    </svg>
  );
}
