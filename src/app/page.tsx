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
import MacroActionBar from "../components/MacroActionBar";

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
  SlidersHorizontal,
  Layers,
} from "lucide-react";

export default function Home() {
  const isHydrated = useCrewStore((state) => state.isHydrated);
  const hydrate = useCrewStore((state) => state.hydrate);
  
  const activeTab = useCrewStore((state) => state.activeTab);
  const setActiveTab = useCrewStore((state) => state.setActiveTab);
  const loadDemoData = useCrewStore((state) => state.loadDemoData);
  const clearAll = useCrewStore((state) => state.clearAll);
  const sequences = useCrewStore((state) => state.sequences);
  const openSequences = useCrewStore((state) => state.openSequences);
  const vacations = useCrewStore((state) => state.vacations);
  const rosterMetrics = useCrewStore((state) => state.getRosterMetrics)();
  const selectedSequenceId = useCrewStore((state) => state.selectedSequenceId);
  const setSelectedSequenceId = useCrewStore((state) => state.setSelectedSequenceId);

  const droppedSeqsCount = sequences.filter((s) => s.isDropped || s.statusTag === "DROP" || s.statusTag === "DTS DROP").length;

  // Sidebar states for desktop
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isSidebarPinned, setIsSidebarPinned] = useState(true);
  const [showMoreMobileMenu, setShowMoreMobileMenu] = useState(false);
  const [showToolsModal, setShowToolsModal] = useState(false);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  if (!isHydrated) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-950 text-sky-400 font-mono text-sm">
        <div className="flex flex-col items-center gap-4">
          <RefreshCwIcon className="w-8 h-8 animate-spin text-sky-500" />
          <span>INITIALIZING CREWSCHEDULE PRO...</span>
        </div>
      </div>
    );
  }

  const isExpanded = !isSidebarCollapsed;

  const mainNavItems = [
    { id: "calendar", name: "Schedule", icon: CalendarIcon },
    { id: "briefing", name: "Briefing", icon: Plane },
    { id: "portal", name: "Portal", icon: Globe },
    { id: "tools", name: "Tools", icon: SlidersHorizontal },
  ];

  const toolsItems = [
    { id: "calendar-tools", name: "Calendar Tools", icon: CalendarIcon, desc: "Filters, Open Time & Vacation" },
    { id: "logbook", name: "Pilot Logbook", icon: BookOpen, desc: "Logbook & Flight History" },
    { id: "revisions", name: "Revision Audit", icon: History, desc: "Schedule History & Audit" },
    { id: "import", name: "Parser & Import", icon: FileSpreadsheet, desc: "PDF & Raw Text Parser" },
    { id: "compliance", name: "FAR 117 & CBA", icon: ShieldCheck, desc: "Legality & Rest Rules" },
    { id: "financials", name: "Pay Calculator", icon: Clock, desc: "Block & Overtime Pay" },
    { id: "settings", name: "System Settings", icon: Settings, desc: "Preferences & Config" },
  ];

  const isToolsActive = ["logbook", "revisions", "import", "compliance", "financials", "settings"].includes(activeTab);

  return (
    <main className="w-screen h-screen flex flex-col bg-[#f8fafc] text-slate-900 overflow-hidden font-sans relative">
      {/* Main Full-Screen Workspace Tab View */}
      <div className="flex-grow overflow-hidden relative">
        {activeTab === "calendar" && <CalendarView />}
        {activeTab === "briefing" && <BriefingView />}
        {activeTab !== "calendar" && activeTab !== "briefing" && (
          <div className="h-full w-full overflow-y-auto p-4 sm:p-6 pb-24 scrollbar-thin">
            {activeTab === "portal" && <PortalBrowserStudio />}
            {activeTab === "logbook" && <LogbookStudio />}
            {activeTab === "revisions" && <RevisionStudio />}
            {activeTab === "import" && <ParserStudio />}
            {activeTab === "compliance" && <CompliancePanel />}
            {activeTab === "financials" && <PayCalculator />}
            {activeTab === "settings" && <SettingsTab />}
          </div>
        )}
      </div>

      {/* Tools Modal Bottom Sheet */}
      {showToolsModal && (
        <>
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100000] animate-fadeIn"
            onClick={() => setShowToolsModal(false)}
          />
          <div className="fixed inset-x-0 bottom-16 sm:bottom-20 z-[100001] max-w-lg mx-auto bg-white border border-slate-200 rounded-3xl p-4 sm:p-5 shadow-2xl backdrop-blur-2xl animate-slideUp max-h-[75vh] overflow-y-auto scrollbar-thin">
            <div className="flex justify-between items-center pb-3 mb-4 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-sky-100 border border-sky-300 rounded-xl text-sky-700">
                  <SlidersHorizontal className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">Aviation Tools & Settings</h3>
                  <p className="text-[11px] text-slate-500 font-medium">Select a tool to launch studio view</p>
                </div>
              </div>

              <button
                onClick={() => setShowToolsModal(false)}
                className="p-1.5 text-slate-500 hover:text-slate-900 rounded-xl bg-slate-100 hover:bg-slate-200 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              {toolsItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      if (item.id === "calendar-tools") {
                        setActiveTab("calendar");
                        useCrewStore.getState().setIsCalendarToolsOpen(true);
                        setShowToolsModal(false);
                      } else {
                        setActiveTab(item.id);
                        setShowToolsModal(false);
                      }
                    }}
                    className={`flex flex-col items-start p-3 rounded-2xl border text-left transition cursor-pointer ${
                      isActive
                        ? "bg-sky-600 text-white border-sky-600 shadow-md"
                        : "bg-slate-50 text-slate-800 border-slate-200 hover:bg-slate-100 hover:border-slate-300"
                    }`}
                  >
                    <Icon className={`w-5 h-5 mb-1.5 ${isActive ? "text-white" : "text-sky-600"}`} />
                    <span className="text-xs font-bold">{item.name}</span>
                    <span className={`text-[10px] mt-0.5 ${isActive ? "text-sky-100" : "text-slate-500"}`}>
                      {item.desc}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="pt-3 border-t border-slate-200 flex gap-2">
              <button
                onClick={() => {
                  loadDemoData();
                  setShowToolsModal(false);
                }}
                className="flex-1 py-2 bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-300 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Load Demo Data
              </button>
              <button
                onClick={() => {
                  clearAll();
                  setShowToolsModal(false);
                }}
                className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Clear Roster
              </button>
            </div>
          </div>
        </>
      )}

      {/* Condensed Bottom Navigation Bar at the Very Bottom */}
      <nav className="h-14 sm:h-16 bg-white/95 border-t border-slate-200/90 shadow-lg flex items-center justify-around px-4 sm:px-12 shrink-0 z-50 backdrop-blur-md">
        {mainNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.id === "tools" ? isToolsActive : activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                if (item.id === "tools") {
                  setShowToolsModal(!showToolsModal);
                } else {
                  setActiveTab(item.id);
                  setShowToolsModal(false);
                }
              }}
              className={`flex flex-col items-center justify-center gap-1 px-4 sm:px-8 py-1 rounded-xl transition duration-150 cursor-pointer ${
                isActive
                  ? "text-sky-600 font-extrabold bg-sky-50 border border-sky-200 shadow-xs"
                  : "text-slate-500 hover:text-slate-900 hover:bg-slate-100/60"
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? "text-sky-600" : "text-slate-500"}`} />
              <span className="text-xs tracking-tight font-bold">{item.name}</span>
            </button>
          );
        })}
      </nav>
    </main>
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
