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
import RevisionStudio from "../components/RevisionHistory/RevisionStudio";
import LogbookStudio from "../components/Logbook/LogbookStudio";
import PortalBrowserStudio from "../components/PortalBrowser/PortalBrowserStudio";

import {
  Calendar as CalendarIcon,
  FileSpreadsheet,
  Plane,
  RotateCcw,
  Sparkles,
  Award,
  Clock,
  ShieldCheck,
  Pin,
  ChevronLeft,
  ChevronRight,
  Settings,
  History,
  Sun,
  AlertCircle,
  BookOpen,
  Globe,
  X,
  SlidersHorizontal
} from "lucide-react";

export default function Home() {
  const isHydrated = useCrewStore((state) => state.isHydrated);
  const hydrate = useCrewStore((state) => state.hydrate);
  
  const activeTab = useCrewStore((state) => state.activeTab);
  const setActiveTab = useCrewStore((state) => state.setActiveTab);
  const loadDemoData = useCrewStore((state) => state.loadDemoData);
  const clearAll = useCrewStore((state) => state.clearAll);
  const sequences = useCrewStore((state) => state.sequences);
  const vacations = useCrewStore((state) => state.vacations);
  const rosterMetrics = useCrewStore((state) => state.getRosterMetrics)();
  const selectedSequenceId = useCrewStore((state) => state.selectedSequenceId);
  const setSelectedSequenceId = useCrewStore((state) => state.setSelectedSequenceId);

  const droppedSeqsCount = sequences.filter((s) => s.isDropped || s.statusTag === "DROP" || s.statusTag === "DTS DROP").length;

  // Sidebar states for desktop
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isSidebarPinned, setIsSidebarPinned] = useState(true);
  const [showMoreMobileMenu, setShowMoreMobileMenu] = useState(false);

  useEffect(() => {
    hydrate();
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

  const isExpanded = !isSidebarCollapsed;

  const navItems = [
    { id: "calendar", name: "Schedule / Calendar", icon: CalendarIcon },
    { id: "briefing", name: "Pilot Briefing", icon: Plane },
    { id: "portal", name: "Live Portal & Extractor", icon: Globe },
    { id: "logbook", name: "Pilot Logbook Studio", icon: BookOpen },
    { id: "revisions", name: "Revision History & Audit", icon: History },
    { id: "import", name: "Parser & Import Studio", icon: FileSpreadsheet },
    { id: "compliance", name: "FAR 117 & CBA Audit", icon: ShieldCheck },
    { id: "settings", name: "System Settings", icon: Settings },
  ];

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden font-sans relative">
      {/* Desktop Navigation Sidebar (Hidden on Mobile < lg) */}
      <div
        className={`hidden lg:block shrink-0 transition-all duration-300 ease-in-out ${
          isSidebarPinned && isExpanded ? "w-80" : "w-20"
        }`}
      >
        <aside
          className={`bg-slate-900/40 border-r border-slate-800/80 flex flex-col justify-between shrink-0 transition-all duration-300 ease-in-out h-full relative ${
            isExpanded ? "w-80 p-6" : "w-20 py-6 px-3.5"
          }`}
        >
          <div className="space-y-6 overflow-y-auto scrollbar-thin pr-1">
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

            {/* Desktop Navigation Links */}
            <nav className="space-y-1.5">
              {navItems.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
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
                
                <div className="space-y-2 text-[11px]">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 font-sans flex items-center gap-1.5">
                      <Award className="w-3.5 h-3.5 text-indigo-400" /> Trips Loaded:
                    </span>
                    <span className="font-bold text-slate-200">{rosterMetrics.totalSequencesCount}</span>
                  </div>
                  {vacations.length > 0 && (
                    <div className="flex justify-between items-center text-emerald-400 font-sans">
                      <span className="flex items-center gap-1.5"><Sun className="w-3.5 h-3.5 text-emerald-400" /> Vacation:</span>
                      <span className="font-bold text-[10px] bg-emerald-950/80 border border-emerald-500/30 px-1.5 py-0.5 rounded text-emerald-300">Aug 01-07</span>
                    </div>
                  )}
                  {droppedSeqsCount > 0 && (
                    <div className="flex justify-between items-center text-rose-400 font-sans">
                      <span className="flex items-center gap-1.5"><AlertCircle className="w-3.5 h-3.5 text-rose-400" /> Dropped (DTS):</span>
                      <span className="font-bold text-[10px] bg-rose-950/80 border border-rose-500/30 px-1.5 py-0.5 rounded text-rose-300">{droppedSeqsCount} Seq</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 font-sans flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-emerald-400" /> Flown Block:
                    </span>
                    <span className="font-bold text-emerald-400">{rosterMetrics.flownBlockHours.toFixed(1)}h</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 font-sans flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-amber-400" /> To Be Flown:
                    </span>
                    <span className="font-bold text-amber-400">{rosterMetrics.toBeFlownBlockHours.toFixed(1)}h</span>
                  </div>
                  <div className="flex justify-between items-center border-t border-slate-900/60 pt-1.5">
                    <span className="text-slate-400 font-sans flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-indigo-400" /> Total Scheduled:
                    </span>
                    <span className="font-bold text-slate-200">{rosterMetrics.totalBlockHours.toFixed(1)}h</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Global Demo Actions and Collapse/Pin Panel */}
          <div className="space-y-4 pt-4 border-t border-slate-800/60">
            {isExpanded && (
              <div className="space-y-2 animate-fadeIn">
                <button
                  onClick={loadDemoData}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 hover:from-indigo-500/20 hover:to-purple-500/20 text-indigo-300 hover:text-white border border-indigo-500/20 hover:border-indigo-500/30 rounded-2xl font-bold transition text-xs shadow-sm cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Load Demo Schedule
                </button>
                <button
                  onClick={clearAll}
                  className="w-full flex items-center justify-center gap-2 py-2 bg-slate-900/50 hover:bg-slate-900 text-slate-500 hover:text-slate-400 border border-slate-800 rounded-2xl font-bold transition text-xs cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Clear Active Roster
                </button>
              </div>
            )}

            {/* Collapse and Pin Controls for Desktop */}
            <div className={`flex items-center gap-2 ${
              isExpanded ? "justify-between" : "justify-center"
            }`}>
              <button
                onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                className={`p-2 bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl border border-slate-800 hover:border-slate-700 transition duration-150 flex items-center justify-center cursor-pointer ${
                  !isExpanded ? "w-full" : ""
                }`}
                title={isExpanded ? "Collapse Sidebar" : "Expand Sidebar"}
              >
                {isExpanded ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </button>

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
      <main className="flex-grow flex flex-col h-full bg-slate-950 overflow-hidden relative">
        {/* Top bar header */}
        <header className="h-14 lg:h-16 border-b border-slate-800/80 px-4 md:px-8 flex items-center justify-between bg-slate-950/80 backdrop-blur-xl shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-gradient-to-tr from-indigo-500 to-purple-600 rounded-xl shadow-md">
                <Plane className="w-4 h-4 text-white transform -rotate-45" />
              </div>
              <div>
                <h1 className="text-base font-black tracking-tight text-white leading-none">
                  CrewSchedule <span className="text-indigo-400 font-bold">Pro</span>
                </h1>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/50 animate-pulse" />
            <span className="text-xs font-bold text-slate-300 hidden sm:inline">Workspace Connected</span>
            <span className="text-[11px] font-bold text-slate-400 sm:hidden">Connected</span>
          </div>
        </header>

        {/* Dynamic Studio Panels */}
        <div className="flex-grow p-3 sm:p-6 md:p-8 overflow-y-auto scrollbar-thin pb-20 lg:pb-8">
          {activeTab === "calendar" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start lg:items-stretch">
              <div className="lg:col-span-2">
                <CalendarView />
              </div>
              
              {/* Desktop Sticky Inspector Panel */}
              <div className="hidden lg:block lg:col-span-1 lg:sticky lg:top-6 lg:self-start lg:max-h-[calc(100vh-120px)] lg:overflow-y-auto lg:scrollbar-thin">
                <CalendarSidebar />
              </div>

              {/* Mobile Bottom Sheet Inspector (renders ONLY when a trip is selected on phone) */}
              {selectedSequenceId && (
                <>
                  <div
                    className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 lg:hidden"
                    onClick={() => setSelectedSequenceId(null)}
                  />
                  <div className="fixed inset-x-0 bottom-0 z-50 max-h-[85vh] flex flex-col bg-slate-900 border-t border-slate-800 rounded-t-3xl p-5 shadow-2xl backdrop-blur-2xl lg:hidden animate-slideUp overflow-y-auto scrollbar-thin">
                    <div className="flex justify-between items-center mb-3">
                      <div className="w-12 h-1.5 bg-slate-700 rounded-full mx-auto" />
                      <button
                        onClick={() => setSelectedSequenceId(null)}
                        className="p-1.5 text-slate-400 hover:text-white rounded-xl bg-slate-800 transition cursor-pointer absolute right-4 top-4"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                    <CalendarSidebar />
                  </div>
                </>
              )}
            </div>
          )}

          {activeTab === "import" && <ParserStudio />}
          {activeTab === "briefing" && <BriefingView />}
          {activeTab === "portal" && <PortalBrowserStudio />}
          {activeTab === "logbook" && <LogbookStudio />}
          {activeTab === "revisions" && <RevisionStudio />}
          {activeTab === "financials" && <PayCalculator />}
          {activeTab === "compliance" && <CompliancePanel />}
          {activeTab === "settings" && <SettingsTab />}
        </div>

        {/* Mobile Extra Studios Bottom Sheet Modal (opened when clicking 'More' icon) */}
        {showMoreMobileMenu && (
          <>
            <div
              className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 lg:hidden"
              onClick={() => setShowMoreMobileMenu(false)}
            />
            <div className="fixed inset-x-0 bottom-0 z-50 max-h-[80vh] bg-slate-900 border-t border-slate-800 rounded-t-3xl p-6 shadow-2xl backdrop-blur-2xl lg:hidden animate-slideUp overflow-y-auto">
              <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-800">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-indigo-400" />
                  Additional Aviation Tools
                </h3>
                <button
                  onClick={() => setShowMoreMobileMenu(false)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-xl bg-slate-800 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {[
                  { id: "revisions", name: "Revision History", icon: History, desc: "Roster Audit & History" },
                  { id: "import", name: "Parser & Import", icon: FileSpreadsheet, desc: "Raw Text / PDF Parser" },
                  { id: "compliance", name: "FAR 117 & CBA", icon: ShieldCheck, desc: "Legality & Rest Audit" },
                  { id: "financials", name: "Pay Calculator", icon: Clock, desc: "Block & Overtime Pay" },
                  { id: "settings", name: "Settings", icon: Settings, desc: "Preferences & System" },
                ].map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setActiveTab(item.id);
                        setShowMoreMobileMenu(false);
                      }}
                      className={`flex flex-col items-start p-3.5 rounded-2xl border text-left transition cursor-pointer ${
                        isActive
                          ? "bg-indigo-600 text-white border-indigo-500 shadow-md"
                          : "bg-slate-950/80 text-slate-300 border-slate-800 hover:border-slate-700"
                      }`}
                    >
                      <Icon className={`w-5 h-5 mb-2 ${isActive ? "text-white" : "text-indigo-400"}`} />
                      <span className="text-xs font-bold">{item.name}</span>
                      <span className={`text-[10px] mt-0.5 ${isActive ? "text-indigo-200" : "text-slate-500"}`}>
                        {item.desc}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800 flex gap-2">
                <button
                  onClick={() => {
                    loadDemoData();
                    setShowMoreMobileMenu(false);
                  }}
                  className="flex-1 py-2.5 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 text-indigo-300 border border-indigo-500/30 rounded-xl text-xs font-bold"
                >
                  Load Demo Data
                </button>
                <button
                  onClick={() => {
                    clearAll();
                    setShowMoreMobileMenu(false);
                  }}
                  className="flex-1 py-2.5 bg-slate-800 text-slate-400 border border-slate-700 rounded-xl text-xs font-bold"
                >
                  Clear Active Roster
                </button>
              </div>
            </div>
          </>
        )}

        {/* Mobile Native Bottom Navigation Bar (< lg screens) */}
        <nav className="fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 border-t border-slate-800/80 flex items-center justify-around py-2 px-1 backdrop-blur-xl lg:hidden">
          {[
            { id: "calendar", name: "Schedule", icon: CalendarIcon },
            { id: "briefing", name: "Briefing", icon: Plane },
            { id: "portal", name: "Portal", icon: Globe },
            { id: "logbook", name: "Logbook", icon: BookOpen },
            { id: "more", name: "Tools", icon: SlidersHorizontal },
          ].map((item) => {
            const Icon = item.icon;
            const isActive =
              activeTab === item.id ||
              (item.id === "more" && ["revisions", "import", "compliance", "financials", "settings"].includes(activeTab));
            return (
              <button
                key={item.id}
                onClick={() => {
                  if (item.id === "more") {
                    setShowMoreMobileMenu(true);
                  } else {
                    setActiveTab(item.id);
                  }
                }}
                className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition duration-150 cursor-pointer ${
                  isActive ? "text-indigo-400 font-bold" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? "text-indigo-400" : "text-slate-400"}`} />
                <span className="text-[10px] tracking-tight">{item.name}</span>
              </button>
            );
          })}
        </nav>
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
