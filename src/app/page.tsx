"use client";

import { useEffect, useState } from "react";
import { useCrewStore } from "@/store/useCrewStore";
import { useMessageStore } from "@/store/useMessageStore";
import {
  CalendarView,
  ParserStudio,
  PayCalculator,
  CompliancePanel,
  SettingsTab,
  BriefingView,
  RevisionStudio,
  LogbookStudio,
  PortalBrowserStudio,
  ScheduleImportReviewModal,
  CockpitScannerStudio,
  ReserveStudio,
  ChatContainer,
  HSSSequencesModal,
  HotelRequestModal,
  OpenTimeStudio,
  OpenTimePickupModal,
  InitialProfileSetup,
} from "@/components";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import CloudSyncModal from "@/components/Firebase/CloudSyncModal";
import DecsDiagnosticsModal, { recordDecsDiagnostic } from "@/components/DecsDiagnosticsModal";
import { parseRawSchedule, parseHssSchedule, parseMonthlyHIMetadata, extractVacationsFromHI1, parseN4OpenTime, checkOpenSequenceConflict, detectMonthFromText } from "@/lib/parser";
import { parseN6DReserves } from "@/lib/n6dParser";
import { parseTurnbackList } from "@/lib/turnbackParser";
import { SequenceTrip, VacationPeriod, MonthlyHIMetadata } from "@/types";
import { NotificationService } from "@/lib/notifications/notificationService";
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
  MessageSquare,
  User,
  Bed,
  Cloud,
  Terminal,
} from "lucide-react";


export default function Home() {
  const isHydrated = useCrewStore((state) => state.isHydrated);
  const hydrate = useCrewStore((state) => state.hydrate);
  
  const activeTab = useCrewStore((state) => state.activeTab);
  const setActiveTab = useCrewStore((state) => state.setActiveTab);
  const clearAll = useCrewStore((state) => state.clearAll);
  const sequences = useCrewStore((state) => state.sequences);
  const userProfile = useCrewStore((state) => state.userProfile);
  const updateUserProfile = useCrewStore((state) => state.updateUserProfile);
  const openSequences = useCrewStore((state) => state.openSequences);
  const vacations = useCrewStore((state) => state.vacations);
  const rosterMetrics = useCrewStore((state) => state.getRosterMetrics)();
  const selectedSequenceId = useCrewStore((state) => state.selectedSequenceId);
  const isHssModalOpen = useCrewStore((state) => state.isHssModalOpen);
  const setIsHssModalOpen = useCrewStore((state) => state.setIsHssModalOpen);
  const isHotelRequestModalOpen = useCrewStore((state) => state.isHotelRequestModalOpen);
  const setIsHotelRequestModalOpen = useCrewStore((state) => state.setIsHotelRequestModalOpen);
  const setSelectedSequenceId = useCrewStore((state) => state.setSelectedSequenceId);
  const importMonthlyHISchedule = useCrewStore((state) => state.importMonthlyHISchedule);
  const mergeHssIntoSequence = useCrewStore((state) => state.mergeHssIntoSequence);
  const addSequences = useCrewStore((state) => state.addSequences);
  const setOpenSequences = useCrewStore((state) => state.setOpenSequences);

  const unreadChatCount = useMessageStore((state) =>
    state.channels.reduce((sum, ch) => sum + (ch.unreadCount || 0), 0)
  );

  const droppedSeqsCount = sequences.filter((s) => s.isDropped || s.statusTag === "DROP" || s.statusTag === "DTS DROP").length;

  // Sidebar states for desktop
  // Modal / Menu States
  const [showToolsModal, setShowToolsModal] = useState(false);
  const [isTestingProfileSetup, setIsTestingProfileSetup] = useState(false);
  const [isCloudSyncModalOpen, setIsCloudSyncModalOpen] = useState(false);
  const [isDecsDiagnosticsOpen, setIsDecsDiagnosticsOpen] = useState(false);
  const [importReviewData, setImportReviewData] = useState<{
    sequences: SequenceTrip[];
    vacations: VacationPeriod[];
    metadata?: MonthlyHIMetadata | null;
    rawText?: string;
  } | null>(null);

  useEffect(() => {
    hydrate();
    NotificationService.init();
    if (typeof window !== "undefined") {
      (window as any).__CREW_STORE__ = useCrewStore;
      (window as any).__MESSAGE_STORE__ = useMessageStore;
      (window as any).__NOTIFICATION_SERVICE__ = NotificationService;
      (window as any).openDecsDiagnostics = () => setIsDecsDiagnosticsOpen(true);
      (window as any).__CHECK_OPEN_CONFLICT__ = (ot: any) => {
        const state = useCrewStore.getState();
        return checkOpenSequenceConflict(ot, state.sequences, state.stationTurnLimits, state.defaultTurnLimit);
      };
      (window as any).__GET_EVALUATED_OPEN_SEQUENCES__ = () => {
        const state = useCrewStore.getState();
        return (state.openSequences || []).map((ot) => {
          const conflict = checkOpenSequenceConflict(ot, state.sequences, state.stationTurnLimits, state.defaultTurnLimit);
          return {
            ...ot,
            hasConflict: conflict.hasConflict,
            conflictReason: conflict.reason,
          };
        });
      };
    }
  }, [hydrate]);

  // Global listener for native Android DECS schedule imports (works across all tabs)
  useEffect(() => {
    const handleGlobalNativeImport = (e: any) => {
      const detail = e.detail;
      const text = typeof detail === "string" ? detail : detail?.text;
      const command = typeof detail === "object" ? detail?.command : undefined;
      if (!text || typeof text !== "string" || text.trim().length === 0) return;
      
      const beforeSeqs = useCrewStore.getState().sequences;
      const storeBeforeCount = beforeSeqs.length;
      console.log("[Global] Received native schedule import event:", text.length, "bytes, command:", command);

      try {
        // 1. Check for Open Time
        if (text.includes("OPEN TIME") || text.includes("OPEN SEQUENCES") || text.includes("CREWED SEQUENCES") || text.includes("POSSIBLE TRIPS") || text.includes("SEQ/DATE") || text.includes("N4/") || text.includes("N4D") || text.includes("OPEN TRIPS")) {
          const parsedOpen = parseN4OpenTime(text);
          if (parsedOpen && parsedOpen.length > 0) {
            setOpenSequences(parsedOpen);
            recordDecsDiagnostic({
              command,
              classification: "Open Time (N4D)",
              rawText: text,
              storeBeforeCount,
              storeAfterCount: useCrewStore.getState().sequences.length,
              status: "success",
              details: `Imported ${parsedOpen.length} open sequences into Open Time board.`,
            });
            console.log("[Global] Successfully imported Open Time with", parsedOpen.length, "trips into store!");
            return;
          }
        }

        // 2. Check for N6D Reserves Display
        if (text.includes("RESERVES DISPLAY") || (text.includes("DOMESTIC") && text.includes("PROJ") && text.includes("ACT/SKD"))) {
          const parsedN6D = parseN6DReserves(text);
          if (parsedN6D && parsedN6D.pilots && parsedN6D.pilots.length > 0) {
            useCrewStore.getState().setN6DReserves(parsedN6D);
            recordDecsDiagnostic({
              command,
              classification: "Reserve Roster (N6D)",
              rawText: text,
              storeBeforeCount,
              storeAfterCount: useCrewStore.getState().sequences.length,
              status: "success",
              details: `Imported N6D list with ${parsedN6D.pilots.length} reserve pilots.`,
            });
            console.log("[Global] Successfully imported N6D Reserve List with", parsedN6D.pilots.length, "pilots into store!");
            return;
          }
        }

        // 3. Check for HIHR Turnback List
        if (text.includes("HIHR") || text.includes("TURNBACK") || text.includes("TRNBK") || text.includes("TURN BACK")) {
          const parsedTB = parseTurnbackList(text);
          if (parsedTB && parsedTB.records && parsedTB.records.length > 0) {
            useCrewStore.getState().setTurnbackData(parsedTB);
            recordDecsDiagnostic({
              command,
              classification: "Turnback List (HIHR)",
              rawText: text,
              storeBeforeCount,
              storeAfterCount: useCrewStore.getState().sequences.length,
              status: "success",
              details: `Imported HIHR turnback roster with ${parsedTB.records.length} records.`,
            });
            console.log("[Global] Successfully imported HIHR Turnback List with", parsedTB.records.length, "pilots into store!");
            return;
          }
        }

        // 4. Check for Full Monthly HI1 / HI2 Schedule first
        const isMonthlyHI =
          (command && (command.toUpperCase().startsWith("HI1") || command.toUpperCase().startsWith("HI2"))) ||
          /MONTH\s*[-:\s]?\s*ENDING/i.test(text) ||
          text.includes("MONTHENDING") ||
          text.includes("BID SEL") ||
          text.includes("FLT DUTY") ||
          text.includes("GUAR 72.00") ||
          (text.includes("PAGE 01 OF") && !command?.toUpperCase().startsWith("HSS"));

        if (isMonthlyHI) {
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
            const afterSeqs = useCrewStore.getState().sequences;
            recordDecsDiagnostic({
              command,
              classification: "Monthly HI Schedule",
              rawText: text,
              storeBeforeCount,
              storeAfterCount: afterSeqs.length,
              status: "success",
              details: `Imported whole-month schedule with ${parsedSeqs.length} trips & ${vacs.length} vacations. Month Ending: ${meta?.monthEnding || "N/A"}`,
            });
            console.log("[Global] Successfully imported", parsedSeqs.length, "trips and", vacs.length, "vacations into store!");
            return;
          }
        }

        // 5. Check for HSS Sequence pairing signature
        const hasHssSignature =
          !!(command && command.toUpperCase().startsWith("HSS")) ||
          (text.includes("SEQ ") && (
            text.includes("SKD") ||
            text.includes("ACT") ||
            text.includes("TAFB") ||
            text.includes("FDPT") ||
            text.includes("D/P") ||
            text.includes("HALF DAY") ||
            text.includes("ONDUTY")
          ));

        if (hasHssSignature) {
          const state = useCrewStore.getState();
          const existingSeqs = state.sequences;
          let targetMonthKey: string | undefined;

          // 1. Check if command explicitly specifies month (e.g. "HSS/CA/18061/04SEP^")
          if (command) {
            const cmdMonth = detectMonthFromText(command);
            if (cmdMonth.hasExplicitMonth) {
              targetMonthKey = `${cmdMonth.yearNum}-${String(cmdMonth.monthNum + 1).padStart(2, "0")}`;
            }
          }

          // 2. If no month in command, check if sequence already exists on calendar (e.g. 18061 in September)
          if (!targetMonthKey) {
            const seqMatch = text.match(/^SEQ\s+([A-Z0-9]{3,6})/im) || (command ? command.match(/HSS\/(?:[A-Z]{2}\/)?([A-Z0-9]{3,6})/i) : null);
            const seqNum = seqMatch ? seqMatch[1].replace(/^[A-Za-z]+/, "") : null;
            if (seqNum) {
              const existing = existingSeqs.find((s) => (s.sequenceNumber || "").replace(/^[A-Za-z]+/, "") === seqNum);
              if (existing && existing.startDate) {
                targetMonthKey = existing.startDate.substring(0, 7);
              }
            }
          }

          const parsedHssTrips = parseHssSchedule(text, {
            command,
            existingSequences: existingSeqs,
            targetMonthKey,
          });

          if (parsedHssTrips && parsedHssTrips.length > 0) {
            parsedHssTrips.forEach((hssTrip) => {
              mergeHssIntoSequence(hssTrip.sequenceNumber, hssTrip);
            });
            const afterSeqs = useCrewStore.getState().sequences;
            const storeAfterCount = afterSeqs.length;

            recordDecsDiagnostic({
              command,
              classification: "HSS Pairing",
              rawText: text,
              targetMonthKey,
              parsedSummary: {
                tripsCount: parsedHssTrips.length,
                sequences: parsedHssTrips.map((t) => ({
                  seqNum: t.sequenceNumber,
                  startDate: t.startDate,
                  endDate: t.endDate,
                  dutyPeriodsCount: t.dutyPeriods?.length || 0,
                  legsCount: t.dutyPeriods?.reduce((a, b) => a + b.legs.length, 0) || 0,
                  layoverCities: t.layoverCities || [],
                  totalCreditMinutes: t.totalCreditMinutes || 0,
                  expTafbHours: t.expTafbHours,
                  legs: (t.dutyPeriods || []).flatMap((dp) =>
                    dp.legs.map((l) => ({
                      flightNumber: l.flightNumber,
                      dep: l.depAirport,
                      arr: l.arrAirport,
                      depTime: l.depTime,
                      arrTime: l.arrTime,
                      blockMinutes: l.blockMinutes,
                      isDeadhead: l.isDeadhead,
                    }))
                  ),
                })),
              },
              storeBeforeCount,
              storeAfterCount,
              status: "success",
              details: `Successfully merged HSS #${parsedHssTrips[0].sequenceNumber} (${parsedHssTrips[0].startDate} to ${parsedHssTrips[0].endDate}) with ${parsedHssTrips[0].dutyPeriods?.length} duty periods.`,
            });

            console.log("[Global] Authoritatively updated HSS sequence with flight legs & layovers into calendar and logbook.");
          } else {
            recordDecsDiagnostic({
              command,
              classification: "HSS Pairing",
              rawText: text,
              targetMonthKey,
              storeBeforeCount,
              storeAfterCount: useCrewStore.getState().sequences.length,
              status: "warning",
              details: "HSS signature detected but parser returned 0 valid sequences.",
            });
          }
          // NEVER fall through to monthly schedule import for HSS screens
          return;
        }

        // 6. Fallback Unrecognized Screen
        recordDecsDiagnostic({
          command,
          classification: "Unrecognized Screen",
          rawText: text,
          storeBeforeCount,
          storeAfterCount: useCrewStore.getState().sequences.length,
          status: "warning",
          details: `Captured ${text.length} chars but matched no schedule or roster patterns.`,
        });
      } catch (err: any) {
        console.error("[Global] Native import parse error:", err);
        recordDecsDiagnostic({
          command,
          classification: "Parser Exception",
          rawText: text,
          storeBeforeCount,
          storeAfterCount: useCrewStore.getState().sequences.length,
          status: "error",
          details: `Error: ${err?.message || String(err)}`,
        });
      }
    };

    const handleGlobalPickupTrigger = () => {
      console.log("[Global] Received openTimePickupModal event!");
      const state = useCrewStore.getState();
      if (state.openSequences && state.openSequences.length > 0) {
        state.setSelectedOpenTimeForPickup(state.openSequences[0]);
      } else {
        state.setIsPickupModalOpen(true);
      }
    };

    const handleGlobalPickupSubmit = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail && customEvent.detail.macro) {
        console.log("[Global] Submitting DECS pickup macro:", customEvent.detail.macro);
        const win = window as any;
        if (win.AndroidPortal && win.AndroidPortal.sendDirectDecsCommand) {
          win.AndroidPortal.sendDirectDecsCommand(customEvent.detail.macro);
        } else if (win.sendDecsKey) {
          win.sendDecsKey(customEvent.detail.macro);
        }
      }
    };

    window.addEventListener("nativeScheduleImport", handleGlobalNativeImport);
    window.addEventListener("openTimePickupModal", handleGlobalPickupTrigger);
    window.addEventListener("submitDecsOpenTimePickup", handleGlobalPickupSubmit);
    return () => {
      window.removeEventListener("nativeScheduleImport", handleGlobalNativeImport);
      window.removeEventListener("openTimePickupModal", handleGlobalPickupTrigger);
      window.removeEventListener("submitDecsOpenTimePickup", handleGlobalPickupSubmit);
    };
  }, [importMonthlyHISchedule, mergeHssIntoSequence, addSequences, setOpenSequences]);

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
    { id: "chat", name: "Crew Chat", icon: MessageSquare, badge: unreadChatCount },
    { id: "portal", name: "Portal", icon: Globe },
    { id: "tools", name: "Tools", icon: SlidersHorizontal },
  ];


  const toolsItems = [
    { id: "decs-diagnostics", name: "DECS Diagnostics", icon: Terminal, desc: "Live Terminal Capture & Sync Logs" },
    { id: "cloud-sync", name: "Firebase Cloud Sync", icon: Cloud, desc: "Cloud Backup & Multi-Device" },
    { id: "profile-setup", name: "Profile Setup (Test)", icon: User, desc: "Test Onboarding Wizard" },
    { id: "hotel-request", name: "Hotel Request", icon: Bed, desc: "DECS In-Base & Commuter Hotel" },
    { id: "open-time", name: "Open Time", icon: Plane, desc: "N4D Open Pairings & Drops" },
    { id: "chat", name: "Crew Comms", icon: MessageSquare, desc: "E2EE Pairings & Base Chat" },
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

  const isToolsActive = ["open-time", "reserve", "scanner", "logbook", "revisions", "import", "compliance", "financials", "settings"].includes(activeTab);

  return (
    <ErrorBoundary>
      <main className="w-screen h-[100dvh] fixed inset-0 flex flex-col bg-[#f8fafc] text-slate-900 overflow-hidden font-sans select-none">
      {/* Main Full-Screen Workspace Tab View */}
      <div className="flex-grow overflow-hidden relative">
        <div className={`h-full w-full ${activeTab === "calendar" ? "block" : "hidden"}`}>
          <CalendarView />
        </div>
        <div className={`h-full w-full ${activeTab === "briefing" ? "block" : "hidden"}`}>
          <BriefingView />
        </div>
        <div className={`h-full w-full ${activeTab === "chat" ? "block" : "hidden"}`}>
          <ChatContainer />
        </div>
        
        {/* Mount Portal only when active so background iframes/SSO do not cause WebView glitches */}
        {activeTab === "portal" && (
          <div className="h-full w-full overflow-y-auto pt-[max(3rem,calc(env(safe-area-inset-top,0px)+0.75rem))] px-3 sm:px-6 pb-32 scrollbar-thin">
            <PortalBrowserStudio />
          </div>
        )}

        {/* Other tabs unmount normally */}
        {activeTab !== "calendar" && activeTab !== "briefing" && activeTab !== "chat" && activeTab !== "portal" && (
          <div className="h-full w-full overflow-y-auto pt-[max(3rem,calc(env(safe-area-inset-top,0px)+0.75rem))] px-3 sm:px-6 pb-32 scrollbar-thin">
            {activeTab === "open-time" && <OpenTimeStudio />}
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
                      if (item.id === "decs-diagnostics") {
                        setIsDecsDiagnosticsOpen(true);
                        setShowToolsModal(false);
                      } else if (item.id === "cloud-sync") {
                        setIsCloudSyncModalOpen(true);
                        setShowToolsModal(false);
                      } else if (item.id === "profile-setup") {
                        setIsTestingProfileSetup(true);
                        setShowToolsModal(false);
                      } else if (item.id === "hotel-request") {
                        setIsHotelRequestModalOpen(true);
                        setShowToolsModal(false);
                      } else if (item.id === "hss-modal") {
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

      {/* First-time Profile Setup Onboarding Flow */}
      {isHydrated && userProfile && userProfile.hasCompletedOnboarding === false && (
        <InitialProfileSetup
          isOpen={true}
          isStandaloneModal={true}
          onClose={() => {
            updateUserProfile({ hasCompletedOnboarding: true });
          }}
          onComplete={() => {
            updateUserProfile({ hasCompletedOnboarding: true });
          }}
        />
      )}

      {/* Test Mode Profile Setup Modal Triggered from Tools */}
      {isTestingProfileSetup && (
        <InitialProfileSetup
          isOpen={true}
          isStandaloneModal={true}
          onClose={() => setIsTestingProfileSetup(false)}
          onComplete={() => {
            setIsTestingProfileSetup(false);
          }}
        />
      )}

      {/* Hotel Request Modal Triggered from Tools or Portal */}
      <HotelRequestModal
        isOpen={isHotelRequestModalOpen}
        onClose={() => setIsHotelRequestModalOpen(false)}
      />

      {/* Open Time 1-Tap Pickup & Trade Inspector Modal */}
      <OpenTimePickupModal />

      {/* Firebase Cloud Sync & Authentication Modal */}
      <CloudSyncModal
        isOpen={isCloudSyncModalOpen}
        onClose={() => setIsCloudSyncModalOpen(false)}
        onStartOnboarding={() => setIsTestingProfileSetup(true)}
      />

      {/* Real-time DECS Terminal Capture & Sync Diagnostics Modal */}
      <DecsDiagnosticsModal
        isOpen={isDecsDiagnosticsOpen}
        onClose={() => setIsDecsDiagnosticsOpen(false)}
      />

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
              <div className="relative">
                <Icon className={`w-5 h-5 ${isActive ? "text-sky-600 stroke-[2.5]" : "text-slate-500 stroke-[1.75]"}`} />
                {item.badge && item.badge > 0 ? (
                  <span className="absolute -top-1 -right-2 px-1 py-0.2 rounded-full bg-amber-500 text-slate-950 font-black text-[9px] min-w-[14px] text-center leading-tight shadow">
                    {item.badge}
                  </span>
                ) : null}
              </div>
              <span className="text-[11px] tracking-tight font-extrabold leading-none">{item.name}</span>
            </button>
          );
        })}
      </nav>

      </main>
    </ErrorBoundary>
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
