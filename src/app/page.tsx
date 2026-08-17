"use client";

import { useEffect, useState } from "react";
import { useCrewStore } from "../store/useCrewStore";
import CalendarView from "../components/Calendar/CalendarView";
import ParserStudio from "../components/ParserStudio/ParserStudio";
import PayCalculator from "../components/PayCalculator/PayCalculator";
import CompliancePanel from "../components/Compliance/CompliancePanel";
import SettingsTab from "../components/Settings/SettingsTab";
import BriefingView from "../components/Briefing/BriefingView";
import RevisionStudio from "../components/RevisionHistory/RevisionStudio";
import LogbookStudio from "../components/Logbook/LogbookStudio";
import PortalBrowserStudio from "../components/PortalBrowser/PortalBrowserStudio";
import ScheduleImportReviewModal from "../components/ImportModal/ScheduleImportReviewModal";
import CockpitScannerStudio from "../components/Scanner/CockpitScannerStudio";
import ReserveStudio from "../components/Reserve/ReserveStudio";

import { parseRawSchedule, parseMonthlyHIMetadata, extractVacationsFromHI1, parseN4OpenTime } from "../lib/parser";
import { SequenceTrip, VacationPeriod, MonthlyHIMetadata } from "../types/index";

import {
  Calendar as CalendarIcon,
  FileSpreadsheet,
  Plane,
  RotateCcw,
  Sparkles,
  Clock,
  ShieldCheck,
  Settings,
  History,
  BookOpen,
  Globe,
  X,
  SlidersHorizontal,
  Camera,
  PhoneCall,
  Layers,
} from "lucide-react";
import HSSSequencesModal from "@/components/PortalBrowser/HSSSequencesModal";

export default function Home() {
  const isHydrated = useCrewStore((state) => state.isHydrated);
  const hydrate = useCrewStore((state) => state.hydrate);
  
  const activeTab = useCrewStore((state) => state.activeTab);
  const setActiveTab = useCrewStore((state) => state.setActiveTab);
  const clearAll = useCrewStore((state) => state.clearAll);
  const sequences = useCrewStore((state) => state.sequences);
  const openSequences = useCrewStore((state) => state.openSequences);
  const vacations = useCrewStore((state) => state.vacations);
  const rosterMetrics = useCrewStore((state) => state.getRosterMetrics)();
  const selectedSequenceId = useCrewStore((state) => state.selectedSequenceId);
  const isHssModalOpen = useCrewStore((state) => state.isHssModalOpen);
  const setIsHssModalOpen = useCrewStore((state) => state.setIsHssModalOpen);
  const setSelectedSequenceId = useCrewStore((state) => state.setSelectedSequenceId);
  const importMonthlyHISchedule = useCrewStore((state) => state.importMonthlyHISchedule);
  const setOpenSequences = useCrewStore((state) => state.setOpenSequences);

  const droppedSeqsCount = sequences.filter((s) => s.isDropped || s.statusTag === "DROP" || s.statusTag === "DTS DROP").length;

  // Sidebar states for desktop
  // Modal / Menu States
  const [showToolsModal, setShowToolsModal] = useState(false);
  const [importReviewData, setImportReviewData] = useState<{
    sequences: SequenceTrip[];
    vacations: VacationPeriod[];
    metadata?: MonthlyHIMetadata | null;
    rawText?: string;
  } | null>(null);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  // Global listener for native Android DECS schedule imports (works across all tabs)
  useEffect(() => {
    const handleGlobalNativeImport = (e: any) => {
      const text = e.detail;
      if (!text || typeof text !== "string" || text.trim().length === 0) return;
      console.log("[Global] Received native schedule import event:", text.length, "bytes");

      try {
        if (text.includes("OPEN TIME") || text.includes("POSSIBLE TRIPS") || text.includes("SEQ/DATE") || text.includes("N4/")) {
          const parsedOpen = parseN4OpenTime(text);
          if (parsedOpen && parsedOpen.length > 0) {
            setOpenSequences(parsedOpen);
            return;
          }
        }

        const parsedSeqs = parseRawSchedule(text);
        if (parsedSeqs && parsedSeqs.length > 0) {
          const meta = parseMonthlyHIMetadata(text);
          const vacs = extractVacationsFromHI1(text);
          importMonthlyHISchedule(parsedSeqs, vacs, meta, "DECS_Live_Screen.txt", text);
          setImportReviewData({
            sequences: parsedSeqs,
            vacations: vacs,
            metadata: meta,
            rawText: text,
          });
          console.log("[Global] Successfully imported", parsedSeqs.length, "trips and", vacs.length, "vacations into store!");
        }
      } catch (err) {
        console.error("[Global] Native import parse error:", err);
      }
    };

    window.addEventListener("nativeScheduleImport", handleGlobalNativeImport);
    return () => {
      window.removeEventListener("nativeScheduleImport", handleGlobalNativeImport);
    };
  }, [importMonthlyHISchedule, setOpenSequences]);

  if (!isHydrated) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-950 text-slate-200 font-mono text-sm">
        <div className="flex flex-col items-center gap-4">
          <img src="/logo.png" alt="CrewSchedule Pro" className="w-20 h-20 rounded-2xl shadow-2xl shadow-amber-500/20 animate-pulse object-cover" />
          <div className="flex flex-col items-center gap-1">
            <span className="text-amber-400 font-black tracking-widest text-xs">CREWSCHEDULE PRO</span>
            <span className="text-[10px] text-slate-500 font-bold">INITIALIZING SUITE...</span>
          </div>
        </div>
      </div>
    );
  }


  const mainNavItems = [
    { id: "calendar", name: "Schedule", icon: CalendarIcon },
    { id: "briefing", name: "Briefing", icon: Plane },
    { id: "portal", name: "Portal", icon: Globe },
    { id: "tools", name: "Tools", icon: SlidersHorizontal },
  ];

  const toolsItems = [
    { id: "reserve", name: "Reserve List", icon: PhoneCall, desc: "N6D Callout Queue & Roster" },
    { id: "hss-modal", name: "HSS Sequences", icon: Layers, desc: "Monthly Legs & DECS Roster" },
    { id: "scanner", name: "Cockpit Scanner", icon: Camera, desc: "Aircraft QR & FMS OOOI OCR" },
    { id: "calendar-tools", name: "Calendar Tools", icon: CalendarIcon, desc: "Filters, Open Time & Vacation" },
    { id: "logbook", name: "Pilot Logbook", icon: BookOpen, desc: "Logbook & Flight History" },
    { id: "revisions", name: "Revision Audit", icon: History, desc: "Schedule History & Audit" },
    { id: "import", name: "Parser & Import", icon: FileSpreadsheet, desc: "PDF & Raw Text Parser" },
    { id: "compliance", name: "FAR 117 & CBA", icon: ShieldCheck, desc: "Legality & Rest Rules" },
    { id: "financials", name: "Pay Calculator", icon: Clock, desc: "Block & Overtime Pay" },
    { id: "settings", name: "System Settings", icon: Settings, desc: "Preferences & Config" },
  ];

  const isToolsActive = ["reserve", "scanner", "logbook", "revisions", "import", "compliance", "financials", "settings"].includes(activeTab);

  return (
    <main className="w-screen h-screen flex flex-col bg-[#f8fafc] text-slate-900 overflow-hidden font-sans relative select-none">
      {/* Main Full-Screen Workspace Tab View */}
      <div className="flex-grow overflow-hidden relative">
        <div className={`h-full w-full ${activeTab === "calendar" ? "block" : "hidden"}`}>
          <CalendarView />
        </div>
        <div className={`h-full w-full ${activeTab === "briefing" ? "block" : "hidden"}`}>
          <BriefingView />
        </div>
        
        {/* Mount Portal only when active so background iframes/SSO do not cause WebView glitches */}
        {activeTab === "portal" && (
          <div className="h-full w-full overflow-y-auto pt-[max(2.75rem,calc(env(safe-area-inset-top,0px)+0.75rem))] px-3 sm:px-6 pb-32 scrollbar-thin">
            <PortalBrowserStudio />
          </div>
        )}

        {/* Other tabs unmount normally */}
        {activeTab !== "calendar" && activeTab !== "briefing" && activeTab !== "portal" && (
          <div className="h-full w-full overflow-y-auto pt-[max(2.75rem,calc(env(safe-area-inset-top,0px)+0.75rem))] px-3 sm:px-6 pb-32 scrollbar-thin">
            {activeTab === "reserve" && <ReserveStudio />}
            {activeTab === "scanner" && <CockpitScannerStudio />}
            {activeTab === "logbook" && <LogbookStudio />}
            {activeTab === "revisions" && <RevisionStudio />}
            {activeTab === "import" && <ParserStudio />}
            {activeTab === "compliance" && <CompliancePanel />}
            {activeTab === "financials" && <PayCalculator />}
            {activeTab === "settings" && <SettingsTab />}
          </div>
        )}
      </div>

      {/* Tools Modal Mobile Bottom Sheet */}
      {showToolsModal && (
        <>
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[100000] animate-fadeIn"
            onClick={() => setShowToolsModal(false)}
          />
          <div className="fixed inset-x-0 bottom-0 z-[100001] w-full max-w-lg mx-auto bg-white border-t border-slate-200 rounded-t-3xl shadow-2xl flex flex-col animate-slideUp max-h-[85vh] overflow-hidden">
            {/* Sticky Header that NEVER scrolls off screen */}
            <div className="flex justify-between items-center px-4 sm:px-5 py-3.5 border-b border-slate-200 bg-white/95 backdrop-blur-xl shrink-0">
              <div className="flex items-center gap-3">
                <img src="/logo.png" alt="CrewSchedule Pro" className="w-10 h-10 rounded-xl shadow-md border border-amber-400/40 object-cover" />
                <div>
                  <h3 className="text-sm font-black text-slate-900 leading-tight">CrewSchedule Pro Tools</h3>
                  <p className="text-[11px] text-slate-500 font-medium">Select an aviation studio module</p>
                </div>
              </div>

              <button
                onClick={() => setShowToolsModal(false)}
                className="px-3 py-1.5 text-xs font-black text-slate-700 hover:text-slate-900 rounded-xl bg-slate-100 hover:bg-slate-200 transition cursor-pointer active-press flex items-center gap-1"
              >
                <X className="w-3.5 h-3.5" />
                <span>Done</span>
              </button>
            </div>

            {/* Scrollable Content Body */}
            <div className="p-4 sm:p-5 overflow-y-auto scrollbar-thin flex-1 pb-[max(2rem,calc(env(safe-area-inset-bottom,0px)+1.5rem))]">
              <div className="grid grid-cols-2 gap-2.5 mb-4">
              {toolsItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      if (item.id === "hss-modal") {
                        setIsHssModalOpen(true);
                        setShowToolsModal(false);
                      } else if (item.id === "calendar-tools") {
                        setActiveTab("calendar");
                        useCrewStore.getState().setIsCalendarToolsOpen(true);
                        setShowToolsModal(false);
                      } else {
                        setActiveTab(item.id);
                        setShowToolsModal(false);
                      }
                    }}
                    className={`flex flex-col items-start p-3 rounded-2xl border text-left transition cursor-pointer active-press min-h-[76px] justify-between ${
                      isActive
                        ? "bg-sky-600 text-white border-sky-600 shadow-md"
                        : "bg-slate-50 text-slate-800 border-slate-200 hover:bg-slate-100 hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <Icon className={`w-4 h-4 ${isActive ? "text-white" : "text-sky-600"}`} />
                      {isActive && <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
                    </div>
                    <div>
                      <span className="text-xs font-black block leading-tight">{item.name}</span>
                      <span className={`text-[9.5px] mt-0.5 block leading-tight ${isActive ? "text-sky-100" : "text-slate-500"}`}>
                        {item.desc}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="pt-2 border-t border-slate-200 flex gap-2">
              <button
                onClick={() => {
                  clearAll();
                  setShowToolsModal(false);
                }}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer active-press"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Clear Roster
              </button>
            </div>
          </div>
        </div>
      </>
    )}

      {/* HSS Sequences Breakdown by Month Modal */}
      <HSSSequencesModal
        isOpen={isHssModalOpen}
        onClose={() => setIsHssModalOpen(false)}
      />

      {/* Schedule Import Review & Confirmation Modal */}
      {importReviewData && (
        <ScheduleImportReviewModal
          isOpen={true}
          onClose={() => setImportReviewData(null)}
          onViewCalendar={() => {
            setActiveTab("calendar");
            setImportReviewData(null);
          }}
          sequences={importReviewData.sequences}
          vacations={importReviewData.vacations}
          metadata={importReviewData.metadata}
          rawText={importReviewData.rawText}
        />
      )}

      {/* Cell Phone First Mobile Bottom Navigation Dock */}
      <nav className="bg-white/95 border-t border-slate-200/90 shadow-xl flex items-center justify-around px-2 sm:px-12 shrink-0 z-[10000] relative backdrop-blur-xl pt-1.5 pb-[max(0.6rem,env(safe-area-inset-bottom,0px))]">
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
              className={`flex flex-col items-center justify-center gap-1 px-3 sm:px-8 py-1.5 rounded-2xl transition duration-150 cursor-pointer active-press min-w-[70px] min-h-[48px] ${
                isActive
                  ? "text-sky-600 font-extrabold bg-sky-50/90 border border-sky-200/90 shadow-2xs"
                  : "text-slate-500 hover:text-slate-900 hover:bg-slate-100/50"
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? "text-sky-600 stroke-[2.5]" : "text-slate-500 stroke-[1.75]"}`} />
              <span className="text-[11px] tracking-tight font-extrabold leading-none">{item.name}</span>
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
