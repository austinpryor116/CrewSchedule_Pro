"use client";

import { useState, useEffect } from "react";
import { useCrewStore } from "../../store/useCrewStore";
import {
  User,
  CreditCard,
  Scale,
  Calendar,
  Database,
  Check,
  Building2,
  Plane,
  ShieldCheck,
  Award,
  Download,
  Upload,
  RefreshCw,
  AlertTriangle,
  Clock,
  Plus,
  Trash2,
  RotateCcw,
  SlidersHorizontal,
  Mail,
  Phone,
  Hash,
  Globe,
  DollarSign,
  ChevronRight,
  UserCheck,
  CalendarDays,
  Sparkles,
  Zap,
  MapPin,
  HardDrive,
  DownloadCloud,
  Globe2,
  Cloud,
  CloudCheck,
} from "lucide-react";
import { PayRates, UserProfile } from "../../types";
import InitialProfileSetup from "../Onboarding/InitialProfileSetup";
import CloudSyncModal from "../Firebase/CloudSyncModal";
import { clearWeatherCache } from "../../lib/weatherService";
import { getTileCacheStats, clearTileCache, precacheFullNorthAmericaMapPack } from "../../lib/mapTileCache";
import {
  CBA_AIRLINE_PAY_SCALE,
  calculateLongevityYears,
  getCbaRatesForProfile,
  calculateNextPayPeriodDate,
} from "../../lib/cbaPayScale";
import {
  FAR_117_TABLE_B,
  FAR_117_TABLE_A,
  getMaxFdpHours,
  getMaxFlightTimeHours,
} from "../../lib/far117Engine";

const AIRLINE_BASES = [
  { code: "ORD", name: "Chicago O'Hare (ORD)" },
  { code: "DFW", name: "Dallas/Fort Worth (DFW)" },
  { code: "MIA", name: "Miami International (MIA)" },
  { code: "PHX", name: "Phoenix Sky Harbor (PHX)" },
];


const FLEET_EQUIPMENT = [
  { code: "E175", name: "Embraer 170 / 175 (E170 / E175)" },
];


export default function SettingsTab() {
  const userProfile = useCrewStore((state) => state.userProfile);
  const updateUserProfile = useCrewStore((state) => state.updateUserProfile);

  const payRates = useCrewStore((state) => state.payRates);
  const setPayRates = useCrewStore((state) => state.setPayRates);

  const sequences = useCrewStore((state) => state.sequences);
  const logbookEntries = useCrewStore((state) => state.logbookEntries);
  const snapshots = useCrewStore((state) => state.snapshots);
  const vacations = useCrewStore((state) => state.vacations);

  const stationTurnLimits = useCrewStore((state) => state.stationTurnLimits);
  const defaultTurnLimit = useCrewStore((state) => state.defaultTurnLimit);
  const highCreditThresholdHours = useCrewStore((state) => state.highCreditThresholdHours);
  const setStationTurnLimit = useCrewStore((state) => state.setStationTurnLimit);
  const removeStationTurnLimit = useCrewStore((state) => state.removeStationTurnLimit);
  const setDefaultTurnLimit = useCrewStore((state) => state.setDefaultTurnLimit);
  const resetStationTurnLimits = useCrewStore((state) => state.resetStationTurnLimits);
  const setHighCreditThresholdHours = useCrewStore((state) => state.setHighCreditThresholdHours);

  const showDtsDropped = useCrewStore((state) => state.showDtsDropped);
  const toggleShowDtsDropped = useCrewStore((state) => state.toggleShowDtsDropped);
  const clearAll = useCrewStore((state) => state.clearAll);

  // Active navigation section
  const [activeSection, setActiveSection] = useState<"profile" | "pay" | "legality" | "calendar" | "storage">("profile");

  // Seat Upgrade / Transition Modal State
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [targetUpgradeRole, setTargetUpgradeRole] = useState<"CA" | "FO" | "CHECK_PILOT">(
    userProfile.crewRole === "CA" ? "CHECK_PILOT" : "CA"
  );
  const [upgradeEffectiveDate, setUpgradeEffectiveDate] = useState(new Date().toISOString().substring(0, 10));

  // Station turn addition state
  const [newStation, setNewStation] = useState("");
  const [newMinutes, setNewMinutes] = useState(40);

  // Interactive FAR 117 Table B Calculator State
  const [calcReportTime, setCalcReportTime] = useState("07:15");
  const [calcSegments, setCalcSegments] = useState(3);

  // Toast feedback
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("Settings updated!");

  // Reset confirmation modal
  const [showResetModal, setShowResetModal] = useState(false);
  const [showInitialSetup, setShowInitialSetup] = useState(false);
  const [showCloudModal, setShowCloudModal] = useState(false);

  // Offline Map Storage State
  const [mapStats, setMapStats] = useState<{ count: number; sizeMb: number }>({ count: 0, sizeMb: 0 });
  const [isPreCachingHubs, setIsPreCachingHubs] = useState(false);
  const [hubPreCacheProgress, setHubPreCacheProgress] = useState(0);

  useEffect(() => {
    getTileCacheStats().then(setMapStats);
  }, [activeSection]);

  const handlePrecacheAllHubs = async () => {
    if (isPreCachingHubs) return;
    setIsPreCachingHubs(true);
    setHubPreCacheProgress(0);
    try {
      await precacheFullNorthAmericaMapPack((done, total) => {
        setHubPreCacheProgress(Math.round((done / total) * 100));
      });
      const updated = await getTileCacheStats();
      setMapStats(updated);
      triggerToast("Complete North America Map permanently cached for Offline Flight!");
    } catch (e) {
      console.warn("Hub precache failed:", e);
    } finally {
      setIsPreCachingHubs(false);
    }
  };

  const handleClearMapTileStorage = async () => {
    await clearTileCache();
    const updated = await getTileCacheStats();
    setMapStats(updated);
    triggerToast("Offline map tiles cache cleared.");
  };

  const triggerToast = (msg = "Settings updated!") => {
    setToastMessage(msg);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2400);
  };

  // Longevity & CBA calculations from Date of Hire (DOH), 750 SIC status, and Delayed Flow status
  const cbaInfo = getCbaRatesForProfile({
    hireDateStr: userProfile.hireDate,
    role: userProfile.crewRole,
    hasCompleted750Sic: userProfile.hasCompleted750Sic,
    flowStatus: userProfile.flowStatus,
    isCaptainFlowTopScale: userProfile.isCaptainFlowTopScale,
  });

  // Perform Formal Seat Upgrade / Transition
  const handleConfirmSeatTransition = () => {
    updateUserProfile({
      crewRole: targetUpgradeRole,
    });

    setShowUpgradeModal(false);
    triggerToast(`Seat transition confirmed: ${targetUpgradeRole === "CA" ? "Captain (PIC)" : targetUpgradeRole === "CHECK_PILOT" ? "Check Airman" : "First Officer (SIC)"}!`);
  };

  // Re-sync pay rates to CBA scale from Date of Hire
  const handleResetToCbaScale = () => {
    const cba = getCbaRatesForProfile({
      hireDateStr: userProfile.hireDate,
      role: userProfile.crewRole,
      hasCompleted750Sic: userProfile.hasCompleted750Sic,
      flowStatus: userProfile.flowStatus,
      isCaptainFlowTopScale: userProfile.isCaptainFlowTopScale,
    });
    setPayRates({
      hourlyRate: cba.hourlyRate,
      perDiemRate: cba.domesticPerDiem,
      intlPerDiemRate: cba.intlPerDiem,
    });
    triggerToast(`Re-synced to CBA: $${cba.hourlyRate.toFixed(2)}/hr, $${cba.domesticPerDiem.toFixed(2)} Per Diem`);
  };

  const handleAddStation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStation.trim()) return;
    const stationCode = newStation.trim().toUpperCase();
    setStationTurnLimit(stationCode, Number(newMinutes) || 40);
    setNewStation("");
    setNewMinutes(40);
    triggerToast(`Added turn buffer for ${stationCode}`);
  };

  // Export JSON Backup
  const handleExportBackup = () => {
    const backupData = {
      app: "CrewSchedule Pro",
      exportDate: new Date().toISOString(),
      userProfile,
      payRates,
      sequences,
      logbookEntries,
      vacations,
      stationTurnLimits,
      defaultTurnLimit,
      highCreditThresholdHours,
      showDtsDropped,
    };
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `CrewSchedule_Backup_${userProfile.employeeId || "Pilot"}_${new Date().toISOString().substring(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    triggerToast("Backup exported successfully!");
  };

  // Import JSON Backup
  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (json.userProfile) updateUserProfile(json.userProfile);
        if (json.payRates) setPayRates(json.payRates);
        if (Array.isArray(json.sequences)) useCrewStore.getState().setSequences(json.sequences);
        if (Array.isArray(json.vacations)) useCrewStore.getState().setVacations(json.vacations);
        triggerToast("Backup restored successfully!");
      } catch (err) {
        alert("Invalid backup file format.");
      }
    };
    reader.readAsText(file);
  };

  // Flush Weather Cache
  const handleFlushWeatherCache = () => {
    clearWeatherCache();
    triggerToast("Live weather 5m cache flushed!");
  };

  const stations = Object.entries(stationTurnLimits);

  // Seat / Rank helpers
  const isFa = userProfile.crewRole === "FA";
  const isCaptain = !isFa && (userProfile.crewRole === "CA" || userProfile.crewRole === "CHECK_PILOT");
  const roleTitle = userProfile.crewRole === "CA" ? "Captain (CA)" : userProfile.crewRole === "CHECK_PILOT" ? "Check Airman" : userProfile.crewRole === "FA" ? "Flight Attendant (FA)" : "First Officer (FO)";

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-24 font-sans animate-fadeIn px-2 sm:px-4">
      {/* Toast Notification */}
      {showToast && (
        <div className="fixed bottom-20 sm:bottom-6 right-4 sm:right-6 bg-slate-900 text-white font-bold px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2.5 text-xs animate-bounce z-50 border border-slate-700">
          <Check className="w-4 h-4 text-emerald-400 stroke-[3]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 1. AUTHENTIC AIRLINE FLIGHT DECK CREW CREDENTIALS CARD */}
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-sky-950 border border-slate-800 rounded-3xl p-5 sm:p-7 shadow-xl text-white">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-48 h-48 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            {/* 4-Stripe / 3-Stripe / Inflight Insignia Badge */}
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-tr from-amber-500/30 via-sky-500/20 to-slate-800 border border-amber-500/40 p-1 shadow-lg flex items-center justify-center shrink-0">
              <div className="w-full h-full bg-slate-950 rounded-[12px] flex flex-col items-center justify-center space-y-0.5">
                {isFa ? (
                  <div className="flex flex-col items-center justify-center py-1">
                    <span className="text-xl">🛫</span>
                  </div>
                ) : isCaptain ? (
                  <>
                    <div className="w-7 h-1 bg-amber-400 rounded-full shadow-xs" />
                    <div className="w-7 h-1 bg-amber-400 rounded-full shadow-xs" />
                    <div className="w-7 h-1 bg-amber-400 rounded-full shadow-xs" />
                    <div className="w-7 h-1 bg-amber-400 rounded-full shadow-xs" />
                  </>
                ) : (
                  <>
                    <div className="w-7 h-1 bg-amber-400/80 rounded-full shadow-xs" />
                    <div className="w-7 h-1 bg-amber-400/80 rounded-full shadow-xs" />
                    <div className="w-7 h-1 bg-amber-400/80 rounded-full shadow-xs" />
                  </>
                )}
                <span className="text-[8px] font-black text-amber-300 uppercase tracking-tighter pt-0.5 font-mono">
                  {userProfile.crewRole || "CA"}
                </span>
              </div>
            </div>

            {/* Pilot Standing & Employment Details */}
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg sm:text-xl font-black tracking-tight text-white">
                  {userProfile.name || "CAPTAIN PILOT"}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-400/30 text-[10px] font-extrabold uppercase tracking-wide">
                  {roleTitle}
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/30 text-[10px] font-bold font-mono">
                  {cbaInfo.longevityFormatted}
                </span>
              </div>

              <div className="flex items-center gap-2.5 text-xs text-slate-300 font-mono flex-wrap">
                <span>Emp #{userProfile.employeeId || "742840"}</span>
                <span className="text-slate-600">•</span>
                <span>Sen #{userProfile.seniorityNumber || "12345"}</span>
                <span className="text-slate-600">•</span>
                <span className="text-sky-300 font-bold">{userProfile.base || "ORD"} Base</span>
                <span className="text-slate-600">•</span>
                <span className="text-amber-300 font-bold">{userProfile.equipment || "E175"}</span>
                <span className="text-slate-600">•</span>
                <span className="text-emerald-300 font-bold">${payRates.hourlyRate || cbaInfo.hourlyRate}/hr</span>
              </div>
            </div>
          </div>

          {/* Formal Seat Upgrade / Transition & Profile Wizard Trigger Buttons */}
          <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-800 gap-2">
            <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap sm:flex-nowrap">
              <button
                onClick={() => setShowCloudModal(true)}
                className="flex-1 sm:flex-initial px-3.5 py-2 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white rounded-xl text-xs font-bold shadow-md flex items-center justify-center gap-1.5 transition cursor-pointer border border-sky-400/30 active-press"
              >
                <Cloud className="w-3.5 h-3.5 text-white" />
                <span>Cloud Sync</span>
              </button>
              <button
                onClick={() => setShowInitialSetup(true)}
                className="flex-1 sm:flex-initial px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold shadow-md flex items-center justify-center gap-1.5 transition cursor-pointer border border-slate-700 active-press"
              >
                <Sparkles className="w-3.5 h-3.5 text-sky-400" />
                <span>Profile Wizard</span>
              </button>
              <button
                onClick={() => setShowUpgradeModal(true)}
                className="flex-1 sm:flex-initial px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded-xl text-xs font-bold shadow-md flex items-center justify-center gap-1.5 transition cursor-pointer border border-amber-500/30 active-press"
              >
                <Award className="w-3.5 h-3.5 text-amber-300" />
                <span>Seat</span>
              </button>
            </div>
            <span className="text-[10px] text-slate-400 font-medium">
              {isCaptain ? "Logged Flight Time: PIC (100%)" : "Logged Flight Time: SIC (100%)"}
            </span>
          </div>
        </div>
      </div>

      {/* 2. MOBILE-FIRST SEGMENTED NAVIGATION BAR */}
      <div className="bg-slate-200/80 p-1 rounded-2xl flex items-center gap-1 overflow-x-auto scrollbar-none">
        {[
          { id: "profile", label: "Profile & DOH", icon: User },
          { id: "pay", label: "CBA Pay & Per Diem", icon: CreditCard },
          { id: "legality", label: "FAR 117 Legality", icon: Scale },
          { id: "calendar", label: "Display & Zulu", icon: Calendar },
          { id: "storage", label: "Data & Storage", icon: Database },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSection === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSection(tab.id as any)}
              className={`flex-1 min-w-[100px] py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer shrink-0 ${
                isActive
                  ? "bg-white text-slate-900 shadow-sm font-extrabold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? "text-sky-600" : "text-slate-500"}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* 3. TAB 1: PILOT PROFILE & OFFICIAL CREDENTIALS */}
      {activeSection === "profile" && (
        <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-7 shadow-sm space-y-6 animate-fadeIn">
          <div className="flex items-center gap-3 pb-3 border-b border-slate-200">
            <UserCheck className="w-5 h-5 text-sky-600" />
            <div>
              <h2 className="text-base font-extrabold text-slate-900">Flight Deck Crew Profile & Credentials</h2>
              <p className="text-xs text-slate-500">Official airline employee record, seniority award, Date of Hire (DOH), and base</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            {/* Full Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-slate-500" /> Official Pilot Name
              </label>
              <input
                type="text"
                value={userProfile.name || ""}
                onChange={(e) => {
                  updateUserProfile({ name: e.target.value.toUpperCase() });
                  triggerToast("Pilot name updated");
                }}
                className="w-full bg-slate-50 border border-slate-300 rounded-2xl px-3.5 py-2.5 text-xs font-bold text-slate-900 uppercase focus:outline-none focus:border-sky-600"
                placeholder="e.g. AUSTIN PRYOR"
              />
            </div>

            {/* Active Position Display (Locked - Requires formal upgrade transition) */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Award className="w-3.5 h-3.5 text-slate-500" /> Assigned Seat / Position
                </span>
                <button
                  type="button"
                  onClick={() => setShowUpgradeModal(true)}
                  className="text-[11px] font-bold text-sky-600 hover:text-sky-700 cursor-pointer"
                >
                  Change Seat
                </button>
              </label>
              <div className="w-full bg-slate-100 border border-slate-300 rounded-2xl px-3.5 py-2.5 text-xs font-bold text-slate-800 flex items-center justify-between">
                <span>{roleTitle}</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-extrabold uppercase">
                  {isCaptain ? "PIC Flight Time" : "SIC Flight Time"}
                </span>
              </div>
            </div>

            {/* Date of Hire (DOH) - Auto-calculates CBA Longevity & Pay Scale */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <CalendarDays className="w-3.5 h-3.5 text-sky-600" /> Official Date of Hire (DOH)
                </span>
                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                  {cbaInfo.longevityFormatted}
                </span>
              </label>
              <input
                type="date"
                value={userProfile.hireDate || "2016-04-18"}
                onChange={(e) => {
                  updateUserProfile({ hireDate: e.target.value });
                  triggerToast(`Date of Hire updated to ${e.target.value} (Auto-computed CBA Longevity Step ${cbaInfo.payStepYear})`);
                }}
                className="w-full bg-slate-50 border border-slate-300 rounded-2xl px-3.5 py-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-sky-600"
              />
              <p className="text-[11px] text-slate-500">
                Auto-configures CBA Pay Step Year {cbaInfo.payStepYear} (${cbaInfo.hourlyRate.toFixed(2)}/hr) and Per Diem (${cbaInfo.domesticPerDiem.toFixed(2)}/hr).
              </p>
            </div>

            {/* Employee ID */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Hash className="w-3.5 h-3.5 text-slate-500" /> Employee / Crew ID (AA/Eagle #)
              </label>
              <input
                type="text"
                value={userProfile.employeeId || ""}
                onChange={(e) => {
                  updateUserProfile({ employeeId: e.target.value.trim() });
                  triggerToast("Employee ID updated");
                }}
                className="w-full bg-slate-50 border border-slate-300 rounded-2xl px-3.5 py-2.5 text-xs font-bold text-slate-900 font-mono focus:outline-none focus:border-sky-600"
                placeholder="e.g. 742840"
              />
            </div>

            {/* Seniority Number */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-slate-500" /> System Seniority Number
              </label>
              <input
                type="text"
                value={userProfile.seniorityNumber || ""}
                onChange={(e) => {
                  updateUserProfile({ seniorityNumber: e.target.value.trim() });
                  triggerToast("Seniority number updated");
                }}
                className="w-full bg-slate-50 border border-slate-300 rounded-2xl px-3.5 py-2.5 text-xs font-bold text-slate-900 font-mono focus:outline-none focus:border-sky-600"
                placeholder="e.g. 12345"
              />
            </div>

            {/* Primary Base Domicile */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-slate-500" /> Home Domicile Base
              </label>
              <select
                value={userProfile.base || "ORD"}
                onChange={(e) => {
                  updateUserProfile({ base: e.target.value });
                  triggerToast(`Base updated to ${e.target.value}`);
                }}
                className="w-full bg-slate-50 border border-slate-300 rounded-2xl px-3.5 py-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-sky-600 cursor-pointer"
              >
                {AIRLINE_BASES.map((b) => (
                  <option key={b.code} value={b.code}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Aircraft Fleet */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Plane className="w-3.5 h-3.5 text-slate-500" /> Fleet Assignment
              </label>
              <select
                value={userProfile.equipment || "E175"}
                onChange={(e) => {
                  updateUserProfile({ equipment: e.target.value });
                  triggerToast(`Fleet updated to ${e.target.value}`);
                }}
                className="w-full bg-slate-50 border border-slate-300 rounded-2xl px-3.5 py-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-sky-600 cursor-pointer"
              >
                {FLEET_EQUIPMENT.map((eq) => (
                  <option key={eq.code} value={eq.code}>
                    {eq.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Contact Email */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-slate-500" /> Contact Email
              </label>
              <input
                type="email"
                value={userProfile.email || ""}
                onChange={(e) => updateUserProfile({ email: e.target.value })}
                className="w-full bg-slate-50 border border-slate-300 rounded-2xl px-3.5 py-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-sky-600"
                placeholder="pilot.crew@aa.com"
              />
            </div>

            {/* Mobile Phone */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-slate-500" /> Mobile Phone
              </label>
              <input
                type="tel"
                value={userProfile.phone || ""}
                onChange={(e) => updateUserProfile({ phone: e.target.value })}
                className="w-full bg-slate-50 border border-slate-300 rounded-2xl px-3.5 py-2.5 text-xs font-bold text-slate-900 font-mono focus:outline-none focus:border-sky-600"
                placeholder="(312) 555-0199"
              />
            </div>
          </div>
        </div>
      )}

      {/* 4. TAB 2: CBA CONTRACT PAY SCALE & PER DIEM */}
      {activeSection === "pay" && (
        <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-7 shadow-sm space-y-6 animate-fadeIn">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <div className="flex items-center gap-3">
              <DollarSign className="w-5 h-5 text-emerald-600" />
              <div>
                <h2 className="text-base font-extrabold text-slate-900">Official Pilot CBA Pay Scale & Per Diem</h2>
                <p className="text-xs text-slate-500">Source: Pilot Agreement Section 3 (Compensation) & Section 5 (Expenses)</p>
              </div>
            </div>

            <button
              onClick={handleResetToCbaScale}
              className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5 text-emerald-600" />
              <span>Sync to CBA Scale</span>
            </button>
          </div>

          {/* DOH Longevity Banner Card */}
          <div className="p-4 bg-gradient-to-r from-emerald-50 via-teal-50 to-sky-50 border border-emerald-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                <span className="text-xs font-black text-slate-900">
                  {cbaInfo.cbaCitation}
                </span>
              </div>
              <p className="text-[11px] text-slate-600">
                Date of Hire: <strong className="font-mono">{userProfile.hireDate || "2016-04-18"}</strong> ({cbaInfo.longevityFormatted}) • Flight Pay: <strong className="font-mono text-emerald-700">${cbaInfo.hourlyRate.toFixed(2)}/hr</strong>
              </p>
            </div>

            <div className="flex items-center gap-3 text-xs font-mono">
              <div className="px-3 py-1 bg-white border border-emerald-200 rounded-xl">
                <span className="text-[10px] text-slate-500 block">Sec 5.B Per Diem</span>
                <strong className="text-emerald-700 font-bold">${cbaInfo.domesticPerDiem.toFixed(2)}/hr</strong>
              </div>
              <div className="px-3 py-1 bg-white border border-emerald-200 rounded-xl">
                <span className="text-[10px] text-slate-500 block">Sec 3.E Guarantee</span>
                <strong className="text-emerald-700 font-bold">{cbaInfo.lineholderGuarantee.toFixed(0)}h / {cbaInfo.reserveGuarantee.toFixed(0)}h</strong>
              </div>
            </div>
          </div>

          {/* Milestone Pay Adjustments & Contractual Provisions */}
          <div className="space-y-3">
            <h3 className="text-xs font-black uppercase text-slate-700 tracking-wider flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-600" />
              Contractual Milestones & Incentive Pay Adjustments
            </h3>

            {/* Case A: First Officer 750 SIC Provision */}
            {userProfile.crewRole === "FO" && (
              <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-2xl space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      id="check750Sic"
                      checked={!!userProfile.hasCompleted750Sic}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        const today = new Date().toISOString().substring(0, 10);
                        const dateReached = userProfile.sic750DateReached || today;
                        const nextPeriod = calculateNextPayPeriodDate(dateReached);
                        updateUserProfile({
                          hasCompleted750Sic: checked,
                          sic750DateReached: dateReached,
                          sic750PayStartsPeriod: nextPeriod.nextPeriodDate,
                        });
                        triggerToast(
                          checked
                            ? `750 SIC Qualified! Captain pay active (${nextPeriod.nextPeriodLabel})`
                            : "Reverted to standard First Officer pay scale"
                        );
                      }}
                      className="mt-1 w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
                    />
                    <label htmlFor="check750Sic" className="cursor-pointer">
                      <span className="text-xs font-black text-slate-900 block">
                        750+ Hours SIC Qualification (Captain Pay Eligible)
                      </span>
                      <span className="text-[11px] text-slate-600 block mt-0.5">
                        Under the CBA Pilot Supply Agreement, First Officers reaching 750 hours SIC before Dec 31, 2026 are paid at Captain hourly rates. Pay adjustments take effect the pay period after qualification.
                      </span>
                    </label>
                  </div>

                  {userProfile.hasCompleted750Sic && (
                    <span className="px-2 py-0.5 bg-emerald-100 border border-emerald-300 text-emerald-800 text-[10px] font-bold rounded-md uppercase whitespace-nowrap">
                      CA Pay Active
                    </span>
                  )}
                </div>

                {userProfile.hasCompleted750Sic && (
                  <div className="pt-2 border-t border-amber-200 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-700 block">
                        Date 750 SIC Logged / Reached
                      </label>
                      <input
                        type="date"
                        value={userProfile.sic750DateReached || new Date().toISOString().substring(0, 10)}
                        onChange={(e) => {
                          const val = e.target.value;
                          const nextPeriod = calculateNextPayPeriodDate(val);
                          updateUserProfile({
                            sic750DateReached: val,
                            sic750PayStartsPeriod: nextPeriod.nextPeriodDate,
                          });
                          triggerToast(`Updated 750 SIC date (Effective ${nextPeriod.nextPeriodLabel})`);
                        }}
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-bold font-mono text-slate-900 focus:outline-none focus:border-amber-500"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-700 block">
                        Effective Pay Period (Starts Next Pay Period)
                      </label>
                      <div className="p-2 bg-white border border-amber-200 rounded-xl flex items-center justify-between text-xs">
                        <span className="text-slate-600 font-medium">
                          {calculateNextPayPeriodDate(userProfile.sic750DateReached || new Date().toISOString().substring(0, 10)).nextPeriodLabel}
                        </span>
                        <strong className="text-emerald-700 font-mono font-bold">
                          ${cbaInfo.hourlyRate.toFixed(2)}/hr (Step {cbaInfo.payStepYear} CA)
                        </strong>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Case B: Captain 5-Year Delayed Flow Top-of-Scale Provision */}
            {userProfile.crewRole === "CA" && (
              <div className="p-4 bg-sky-50/70 border border-sky-200 rounded-2xl space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <span className="text-xs font-black text-slate-900 block flex items-center gap-1.5">
                      <Award className="w-3.5 h-3.5 text-sky-600" />
                      5-Year Captain Delayed Flow Top-of-Scale Pay (Letter 22-06 Sec. G)
                    </span>
                    <span className="text-[11px] text-slate-600 block mt-0.5">
                      Captains completing 5 years of service receive Step 20 Top-of-Scale pay ($228.75/hr) until flowing to American Airlines. Declining/bypassing flow reverts pay to base longevity step. Pay starts the pay period after reaching 5 years.
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {cbaInfo.longevityYears >= 5 ? (
                      <span className="px-2 py-0.5 bg-emerald-100 border border-emerald-300 text-emerald-800 text-[10px] font-bold rounded-md uppercase whitespace-nowrap">
                        5+ Yrs Eligible
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 bg-slate-100 border border-slate-300 text-slate-700 text-[10px] font-bold rounded-md uppercase whitespace-nowrap">
                        {cbaInfo.longevityYears} Yrs Active
                      </span>
                    )}
                  </div>
                </div>

                <div className="pt-2 border-t border-sky-200 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Flow Status Selector */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-700 block">
                      American Airlines Flow Status
                    </label>
                    <select
                      value={userProfile.flowStatus || "ACCEPT"}
                      onChange={(e) => {
                        const val = e.target.value as "ACCEPT" | "DECLINE" | "BYPASS" | "PENDING";
                        updateUserProfile({ flowStatus: val });
                        triggerToast(
                          val === "ACCEPT"
                            ? "Flow Accepted: Step 20 Top-of-Scale ($228.75/hr) active"
                            : "Flow Declined/Bypassed: Reverted to base longevity step pay"
                        );
                      }}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-sky-600 cursor-pointer"
                    >
                      <option value="ACCEPT">✅ Flow Accepted (Step 20 Top-of-Scale: $228.75/hr)</option>
                      <option value="PENDING">⏳ Flow Pending / Pre-Flow (Step 20 Top-of-Scale: $228.75/hr)</option>
                      <option value="DECLINE">❌ Flow Declined (Reverted to Base Step Pay)</option>
                      <option value="BYPASS">⚠️ Flow Bypassed (Reverted to Base Step Pay)</option>
                    </select>
                  </div>

                  {/* Effective Rate Preview & Next Pay Period */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-700 block">
                      Contractual Rate Status
                    </label>
                    <div className="p-2 bg-white border border-sky-200 rounded-xl flex items-center justify-between text-xs">
                      <span className="text-slate-600 font-medium">
                        {cbaInfo.isFlowTopScaleActive ? "Step 20 Top-of-Scale" : `Base Step ${cbaInfo.payStepYear}`}
                      </span>
                      <strong className={`font-mono font-bold ${cbaInfo.isFlowTopScaleActive ? "text-emerald-700" : "text-amber-700"}`}>
                        ${cbaInfo.hourlyRate.toFixed(2)}/hr
                      </strong>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* CBA Longevity Table Grid */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-800 block">
              Contract Pay Scale Longevity Steps ({userProfile.crewRole || "CA"})
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
              {CBA_AIRLINE_PAY_SCALE.map((step) => {
                const isPilotStep = step.year === cbaInfo.payStepYear;
                let stepRate = step.caHourlyRate;
                if (userProfile.crewRole === "FO") stepRate = step.foHourlyRate;
                if (userProfile.crewRole === "CHECK_PILOT") stepRate = step.checkPilotHourlyRate;

                return (
                  <button
                    key={step.year}
                    type="button"
                    onClick={() => {
                      setPayRates({ hourlyRate: stepRate });
                      triggerToast(`Selected Step Year ${step.year}: $${stepRate.toFixed(2)}/hr`);
                    }}
                    className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                      isPilotStep
                        ? "bg-emerald-600 text-white border-emerald-500 font-bold shadow-xs ring-2 ring-emerald-400/40"
                        : Math.abs((payRates.hourlyRate || 0) - stepRate) < 0.01
                        ? "bg-sky-100 text-sky-950 border-sky-300 font-bold"
                        : "bg-slate-50 text-slate-800 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    <div className="text-xs font-bold flex items-center justify-between">
                      <span>{step.label}</span>
                      {isPilotStep && <span className="text-[9px] bg-emerald-700 px-1 rounded uppercase">Active</span>}
                    </div>
                    <div className="text-[11px] font-mono opacity-90">${stepRate.toFixed(2)}/hr</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Rates & Calculations Form */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 pt-2">
            {/* Custom Hourly Flight Pay Override */}
            <div className="space-y-1.5 bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <label className="text-xs font-bold text-slate-800 block">Current Flight Pay ($/hr)</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                <input
                  type="number"
                  step="0.50"
                  value={payRates.hourlyRate || cbaInfo.hourlyRate}
                  onChange={(e) => {
                    setPayRates({ hourlyRate: parseFloat(e.target.value) || 0 });
                    triggerToast("Hourly pay updated");
                  }}
                  className="w-full bg-white border border-slate-300 rounded-xl pl-8 pr-3 py-2 text-xs font-bold text-slate-900 font-mono focus:outline-none focus:border-sky-600"
                />
              </div>
              <p className="text-[10px] text-slate-500">Base contract rate paid per block/credit hour</p>
            </div>

            {/* Overtime Multiplier */}
            <div className="space-y-1.5 bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <label className="text-xs font-bold text-slate-800 block">Overtime / Premium Multiplier</label>
              <select
                value={payRates.overtimeMultiplier || 1.5}
                onChange={(e) => {
                  setPayRates({ overtimeMultiplier: parseFloat(e.target.value) });
                  triggerToast("Overtime rate updated");
                }}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-sky-600 cursor-pointer"
              >
                <option value="1.0">1.0x (Straight Time)</option>
                <option value="1.5">1.5x (Standard Premium Overtime)</option>
                <option value="2.0">2.0x (Double Time)</option>
                <option value="3.0">3.0x (Critical Coverage Premium)</option>
              </select>
              <p className="text-[10px] text-slate-500">Applied to OT open time pickups</p>
            </div>

            {/* Monthly Guarantee (MMG) */}
            <div className="space-y-1.5 bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <label className="text-xs font-bold text-slate-800 block">Monthly Guarantee (MMG Hours)</label>
              <div className="relative">
                <input
                  type="number"
                  step="1"
                  value={payRates.monthlyGuaranteeHours || 75}
                  onChange={(e) => {
                    setPayRates({ monthlyGuaranteeHours: parseFloat(e.target.value) || 0 });
                    triggerToast("Monthly guarantee updated");
                  }}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 font-mono focus:outline-none focus:border-sky-600"
                />
              </div>
              <p className="text-[10px] text-slate-500">Contract monthly minimum guarantee</p>
            </div>

            {/* Domestic Per Diem */}
            <div className="space-y-1.5 bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <label className="text-xs font-bold text-slate-800 block">Domestic Per Diem ($/hr TAFB)</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                <input
                  type="number"
                  step="0.05"
                  value={payRates.perDiemRate || cbaInfo.domesticPerDiem}
                  onChange={(e) => {
                    setPayRates({ perDiemRate: parseFloat(e.target.value) || 0 });
                    triggerToast("Domestic per diem updated");
                  }}
                  className="w-full bg-white border border-slate-300 rounded-xl pl-8 pr-3 py-2 text-xs font-bold text-slate-900 font-mono focus:outline-none focus:border-sky-600"
                />
              </div>
              <p className="text-[10px] text-slate-500">Hourly per diem for time away from base</p>
            </div>

            {/* International Per Diem */}
            <div className="space-y-1.5 bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <label className="text-xs font-bold text-slate-800 block">International Per Diem ($/hr)</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                <input
                  type="number"
                  step="0.05"
                  value={payRates.intlPerDiemRate || cbaInfo.intlPerDiem}
                  onChange={(e) => {
                    setPayRates({ intlPerDiemRate: parseFloat(e.target.value) || 0 });
                    triggerToast("International per diem updated");
                  }}
                  className="w-full bg-white border border-slate-300 rounded-xl pl-8 pr-3 py-2 text-xs font-bold text-slate-900 font-mono focus:outline-none focus:border-sky-600"
                />
              </div>
              <p className="text-[10px] text-slate-500">Per diem for Canada, Mexico, Caribbean, Intl</p>
            </div>

            {/* Deadhead Pay Ratio */}
            <div className="space-y-1.5 bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <label className="text-xs font-bold text-slate-800 block">Deadhead Pay Percentage</label>
              <select
                value={payRates.deadheadPayRatio || 1.0}
                onChange={(e) => {
                  setPayRates({ deadheadPayRatio: parseFloat(e.target.value) });
                  triggerToast("Deadhead pay ratio updated");
                }}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-sky-600 cursor-pointer"
              >
                <option value="1.0">100% Full Pay (1.0)</option>
                <option value="0.75">75% Pay (0.75)</option>
                <option value="0.5">50% Pay (0.50)</option>
              </select>
              <p className="text-[10px] text-slate-500">Credit calculation for deadhead flight legs</p>
            </div>
          </div>
        </div>
      )}

      {/* 5. TAB 3: FAR 117 LEGALITY & STATION TURN LIMITS */}
      {activeSection === "legality" && (
        <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-7 shadow-sm space-y-6 animate-fadeIn">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <div className="flex items-center gap-3">
              <Scale className="w-5 h-5 text-amber-600" />
              <div>
                <h2 className="text-base font-extrabold text-slate-900">14 CFR Part 117 Legality & FDP Engine</h2>
                <p className="text-xs text-slate-500">Dynamic Table B Flight Duty Period (FDP) & Table A flight time limits</p>
              </div>
            </div>

            <span className="px-2.5 py-1 bg-amber-50 border border-amber-300 text-amber-900 rounded-xl text-[10px] font-extrabold uppercase font-mono">
              FAA Part 117 Table B Active
            </span>
          </div>

          {/* Interactive Table B FDP Calculator Card */}
          {(() => {
            const tableBCalc = getMaxFdpHours(calcReportTime, calcSegments);
            const tableACalc = getMaxFlightTimeHours(calcReportTime);

            return (
              <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-amber-950 p-5 rounded-3xl text-white shadow-md space-y-4 border border-slate-700">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <h3 className="text-xs font-black uppercase tracking-wider text-amber-200">
                      Interactive Table B FDP Calculator
                    </h3>
                  </div>
                  <span className="text-[10px] text-slate-300 font-mono">
                    {tableBCalc.ruleCitation}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  {/* Report Time Input */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-300 block">
                      Scheduled Report Time (Acclimated / Base)
                    </label>
                    <input
                      type="time"
                      value={calcReportTime}
                      onChange={(e) => setCalcReportTime(e.target.value)}
                      className="w-full bg-slate-950/80 border border-slate-600 rounded-xl px-3 py-2 text-xs font-bold text-white font-mono focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  {/* Flight Segments Selector */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-300 block">
                      Flight Segments (Operating Legs)
                    </label>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5, 6, 7].map((num) => (
                        <button
                          key={num}
                          type="button"
                          onClick={() => setCalcSegments(num)}
                          className={`flex-1 py-2 rounded-xl text-xs font-bold font-mono transition cursor-pointer ${
                            calcSegments === num
                              ? "bg-amber-500 text-slate-950 font-black shadow-sm"
                              : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                          }`}
                        >
                          {num >= 7 ? "7+" : num}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Calculation Result Outputs */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-700/80">
                  <div className="p-3 bg-slate-950/60 rounded-2xl border border-slate-700">
                    <span className="text-[10px] text-amber-300 block font-medium">Max Allowable FDP (Table B)</span>
                    <strong className="text-lg font-black text-white font-mono">{tableBCalc.maxFdpHours.toFixed(1)} Hours</strong>
                    <span className="text-[10px] text-slate-400 block font-mono">({tableBCalc.maxFdpMinutes} mins max duty)</span>
                  </div>

                  <div className="p-3 bg-slate-950/60 rounded-2xl border border-slate-700">
                    <span className="text-[10px] text-sky-300 block font-medium">Max Daily Flight Time (Table A)</span>
                    <strong className="text-lg font-black text-white font-mono">{tableACalc.maxFlightHours.toFixed(1)} Hours</strong>
                    <span className="text-[10px] text-slate-400 block font-mono">({tableACalc.maxFlightMinutes} mins max block)</span>
                  </div>

                  <div className="p-3 bg-slate-950/60 rounded-2xl border border-slate-700 col-span-2 sm:col-span-1">
                    <span className="text-[10px] text-emerald-300 block font-medium">Required Rest Buffer</span>
                    <strong className="text-lg font-black text-white font-mono">{payRates.minRestHours || 10.0} Hours</strong>
                    <span className="text-[10px] text-slate-400 block">Uninterrupted rest</span>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* 14 CFR Part 117 Table B Matrix */}
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                14 CFR § 117.13 Table B — Unaugmented Maximum FDP Limits (Hours)
              </h3>
              <span className="text-[10px] text-slate-500 font-mono">FAA Table B Reference</span>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full text-[11px] text-center border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                    <th className="py-2.5 px-3 text-left">Report Window</th>
                    <th className="py-2.5 px-2">1 Leg</th>
                    <th className="py-2.5 px-2">2 Legs</th>
                    <th className="py-2.5 px-2">3 Legs</th>
                    <th className="py-2.5 px-2">4 Legs</th>
                    <th className="py-2.5 px-2">5 Legs</th>
                    <th className="py-2.5 px-2">6 Legs</th>
                    <th className="py-2.5 px-2">7+ Legs</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {FAR_117_TABLE_B.map((row) => {
                    const currentCalc = getMaxFdpHours(calcReportTime, calcSegments);
                    const isCurrentWindow = currentCalc.timeWindowLabel === row.timeWindowLabel;

                    return (
                      <tr
                        key={row.timeWindowLabel}
                        className={isCurrentWindow ? "bg-amber-50 font-bold text-amber-950" : "hover:bg-slate-50 text-slate-800"}
                      >
                        <td className="py-2 px-3 text-left font-sans font-bold flex items-center gap-1.5">
                          {isCurrentWindow && <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />}
                          <span>{row.timeWindowLabel}</span>
                        </td>
                        {row.limitsBySegments.map((limit, idx) => {
                          const isSelectedCell = isCurrentWindow && currentCalc.segmentIndex === idx;
                          return (
                            <td
                              key={idx}
                              className={`py-2 px-2 ${
                                isSelectedCell
                                  ? "bg-amber-500 text-white font-black rounded-md shadow-xs"
                                  : ""
                              }`}
                            >
                              {limit.toFixed(1)}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Table A Daily Flight Time Limits */}
          <div className="space-y-2 pt-2">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              14 CFR § 117.11 Table A — Maximum Daily Flight Time Limits
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {FAR_117_TABLE_A.map((a) => (
                <div key={a.timeWindowLabel} className="p-3 bg-slate-50 border border-slate-200 rounded-2xl">
                  <div className="text-xs font-bold text-slate-800">{a.timeWindowLabel} Report</div>
                  <div className="text-base font-black text-sky-700 font-mono mt-0.5">{a.maxFlightHours.toFixed(1)} Hours Max</div>
                  <span className="text-[10px] text-slate-500 block font-mono">({Math.round(a.maxFlightHours * 60)} minutes block limit)</span>
                </div>
              ))}
            </div>
          </div>

          {/* Core Rest & Report Buffers */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div className="space-y-1 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
              <label className="text-xs font-bold text-slate-800 block">Minimum Rest Buffer (Hours)</label>
              <input
                type="number"
                step="0.5"
                value={payRates.minRestHours || 10.0}
                onChange={(e) => setPayRates({ minRestHours: parseFloat(e.target.value) || 10 })}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-900 font-mono"
              />
              <p className="text-[10px] text-slate-500">14 CFR § 117.25 mandatory 10.0 hours uninterrupted rest</p>
            </div>

            <div className="space-y-1 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
              <label className="text-xs font-bold text-slate-800 block">Report Buffer Before Dep (Mins)</label>
              <input
                type="number"
                step="5"
                value={payRates.reportBufferMins || 45}
                onChange={(e) => setPayRates({ reportBufferMins: parseInt(e.target.value, 10) || 45 })}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-900 font-mono"
              />
              <p className="text-[10px] text-slate-500">Show time prior to first flight departure</p>
            </div>
          </div>

          {/* Station Specific Turn Buffers */}
          <div className="space-y-3 pt-4 border-t border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Station Connection Turn Buffers</h3>
                <p className="text-[11px] text-slate-500">Minimum ground turn time allowed per station (Default: {defaultTurnLimit} mins)</p>
              </div>
              <button
                onClick={resetStationTurnLimits}
                className="text-[11px] font-bold text-sky-600 hover:text-sky-700 flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" /> Reset Defaults
              </button>
            </div>

            {/* Add Custom Station */}
            <form onSubmit={handleAddStation} className="flex gap-2 items-center">
              <input
                type="text"
                maxLength={4}
                value={newStation}
                onChange={(e) => setNewStation(e.target.value.toUpperCase())}
                placeholder="Station (e.g. CLT)"
                className="w-32 bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-bold uppercase font-mono"
              />
              <input
                type="number"
                value={newMinutes}
                onChange={(e) => setNewMinutes(parseInt(e.target.value, 10) || 40)}
                placeholder="Minutes"
                className="w-24 bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-bold font-mono"
              />
              <button
                type="submit"
                className="px-3.5 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-sm cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Add
              </button>
            </form>

            {/* Station List */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
              {stations.map(([stn, mins]) => (
                <div key={stn} className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                  <div>
                    <strong className="text-slate-900 font-mono">{stn}</strong>
                    <span className="text-slate-500 text-[10px] block">{mins} mins</span>
                  </div>
                  <button
                    onClick={() => removeStationTurnLimit(stn)}
                    className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                    title={`Remove ${stn}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 6. TAB 4: CALENDAR & DISPLAY PREFERENCES */}
      {activeSection === "calendar" && (
        <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-7 shadow-sm space-y-6 animate-fadeIn">
          <div className="flex items-center gap-3 pb-3 border-b border-slate-200">
            <Calendar className="w-5 h-5 text-indigo-600" />
            <div>
              <h2 className="text-base font-extrabold text-slate-900">Display, Timezone & Schedule Preferences</h2>
              <p className="text-xs text-slate-500">Configure timezone display, highlights, and dropped trip visibility</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            {/* Timezone Mode */}
            <div className="space-y-1.5 bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-slate-500" /> Timezone Display Mode
              </label>
              <select
                value={userProfile.timezoneDisplay || "LOCAL"}
                onChange={(e) => {
                  updateUserProfile({ timezoneDisplay: e.target.value as any });
                  triggerToast(`Timezone set to ${e.target.value}`);
                }}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-sky-600 cursor-pointer"
              >
                <option value="LOCAL">Local Station Time (Airport Local)</option>
                <option value="BASE">Home Domicile Base Time ({userProfile.base || "ORD"})</option>
                <option value="ZULU">UTC / Zulu Time (24h Aviation Standard)</option>
              </select>
              <p className="text-[10px] text-slate-500">Controls time formatting across Calendar, Duty Periods, and Briefings</p>
            </div>

            {/* High Credit Highlight Threshold */}
            <div className="space-y-1.5 bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5 text-amber-500" /> High-Credit Highlight (Hours)
              </label>
              <input
                type="number"
                step="0.5"
                value={highCreditThresholdHours || 15.0}
                onChange={(e) => {
                  setHighCreditThresholdHours(parseFloat(e.target.value) || 15);
                  triggerToast("High credit threshold updated");
                }}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 font-mono focus:outline-none focus:border-sky-600"
              />
              <p className="text-[10px] text-slate-500">Trips above this credit are highlighted in gold badges</p>
            </div>

            {/* Show DTS Dropped Trips */}
            <div className="sm:col-span-2 flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-200">
              <div>
                <span className="text-xs font-bold text-slate-900 block">Show Dropped & DTS Trips on Calendar</span>
                <span className="text-[11px] text-slate-500">Display removed / traded trips as translucent ghost blocks for full schedule audit trails</span>
              </div>
              <button
                onClick={() => {
                  toggleShowDtsDropped();
                  triggerToast(`Dropped trips ${!showDtsDropped ? "shown" : "hidden"}`);
                }}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                  showDtsDropped ? "bg-sky-600" : "bg-slate-300"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    showDtsDropped ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. TAB 5: LOCAL COMPUTER STORAGE & SYSTEM MAINTENANCE */}
      {activeSection === "storage" && (
        <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-7 shadow-sm space-y-6 animate-fadeIn">
          <div className="flex items-center gap-3 pb-3 border-b border-slate-200">
            <Database className="w-5 h-5 text-purple-600" />
            <div>
              <h2 className="text-base font-extrabold text-slate-900">Local Storage & Schedule Backups</h2>
              <p className="text-xs text-slate-500">Offline Dexie.js database health, JSON backups, and system maintenance</p>
            </div>
          </div>

          {/* Cloud Firestore Live Backup Banner */}
          <div className="p-4 bg-gradient-to-br from-sky-50 via-indigo-50/40 to-slate-50 border border-sky-200 rounded-3xl space-y-3 shadow-2xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-sky-100 border border-sky-300 flex items-center justify-center text-sky-700 shadow-2xs">
                  <Cloud className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <span>Firebase Cloud Sync & Backup</span>
                    <span className="text-[9px] px-1.5 py-0.2 bg-emerald-100 text-emerald-800 border border-emerald-300 rounded font-mono font-bold">
                      OFFLINE-READY
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-600 font-medium">
                    Continuous cross-device sync for iOS, Android, and Desktop
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowCloudModal(true)}
                className="px-3.5 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-black transition flex items-center gap-1.5 shadow-xs cursor-pointer active-press"
              >
                <span>Manage Sync</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Database Diagnostics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-center">
              <span className="text-xs text-slate-500 block font-medium">Saved Trips</span>
              <strong className="text-lg font-black text-slate-900">{sequences.length}</strong>
            </div>
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-center">
              <span className="text-xs text-slate-500 block font-medium">Logbook Records</span>
              <strong className="text-lg font-black text-slate-900">{logbookEntries.length}</strong>
            </div>
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-center">
              <span className="text-xs text-slate-500 block font-medium">Schedule Snapshots</span>
              <strong className="text-lg font-black text-slate-900">{snapshots.length}</strong>
            </div>
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-center">
              <span className="text-xs text-slate-500 block font-medium">Vacation Blocks</span>
              <strong className="text-lg font-black text-slate-900">{vacations.length}</strong>
            </div>
          </div>

          {/* Export & Import Backup */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <button
              onClick={handleExportBackup}
              className="p-3.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-2xl text-xs font-bold text-slate-900 flex items-center justify-center gap-2 transition cursor-pointer shadow-xs"
            >
              <Download className="w-4 h-4 text-sky-600" />
              <span>Export Full JSON Backup</span>
            </button>

            <label className="p-3.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-2xl text-xs font-bold text-slate-900 flex items-center justify-center gap-2 transition cursor-pointer shadow-xs">
              <Upload className="w-4 h-4 text-purple-600" />
              <span>Restore from JSON File</span>
              <input type="file" accept=".json" onChange={handleImportBackup} className="hidden" />
            </label>
          </div>

          {/* Flush Weather Cache */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-slate-900 block">Live Weather 5-Minute Cache</span>
              <span className="text-[11px] text-slate-500">Cached METAR/TAF/hazard data automatically flushes every 5 mins</span>
            </div>
            <button
              onClick={handleFlushWeatherCache}
              className="px-3.5 py-2 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 flex items-center gap-1.5 transition cursor-pointer shadow-xs"
            >
              <RefreshCw className="w-3.5 h-3.5 text-sky-600" />
              <span>Flush Cache</span>
            </button>
          </div>

          {/* Offline In-Flight Map Tile Cache */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-900 block">Offline Aeronautical Map Storage</span>
                <span className="text-[11px] text-slate-500">
                  {mapStats.count} cached tiles ({mapStats.sizeMb} MB stored locally) for In-Flight Airplane Mode
                </span>
              </div>
              <span className="px-2.5 py-1 bg-sky-100 text-sky-800 text-[10px] font-black rounded-lg uppercase">
                {mapStats.count > 0 ? "Ready Offline" : "Empty Cache"}
              </span>
            </div>

            {isPreCachingHubs && (
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[10px] font-bold text-sky-800">
                  <span>Downloading Complete North America Map Pack...</span>
                  <span>{hubPreCacheProgress}%</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-sky-600 h-1.5 rounded-full transition-all duration-300"
                    style={{ width: `${hubPreCacheProgress}%` }}
                  ></div>
                </div>
              </div>
            )}

            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={handlePrecacheAllHubs}
                disabled={isPreCachingHubs}
                className="flex-1 px-3.5 py-2 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer shadow-xs active-press"
              >
                <Globe2 className="w-3.5 h-3.5" />
                <span>{isPreCachingHubs ? `Caching (${hubPreCacheProgress}%)...` : "📥 Pre-Cache Full North America Map (~50 MB)"}</span>
              </button>

              {mapStats.count > 0 && (
                <button
                  onClick={handleClearMapTileStorage}
                  className="px-3.5 py-2 bg-white hover:bg-rose-50 border border-slate-300 hover:border-rose-300 text-slate-700 hover:text-rose-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-xs active-press"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear Tiles</span>
                </button>
              )}
            </div>
          </div>

          {/* Reset Database */}
          <div className="p-4 bg-rose-50 rounded-2xl border border-rose-200 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-rose-900 block">Reset Local Database</span>
              <span className="text-[11px] text-rose-700">Clear all local schedule trips, snapshots, and logbook entries</span>
            </div>
            <button
              onClick={() => setShowResetModal(true)}
              className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-xs"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Reset Data</span>
            </button>
          </div>
        </div>
      )}

      {/* FORMAL SEAT TRANSITION / UPGRADE MODAL */}
      {showUpgradeModal && (
        <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 z-[100000] animate-fadeIn font-sans">
          <div className="bg-slate-900 text-white rounded-t-3xl sm:rounded-3xl p-4 sm:p-7 max-w-md w-full border-t sm:border border-slate-700/80 shadow-2xl space-y-4 sm:space-y-5 animate-slideUp pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))]">
            <div className="w-12 h-1.5 bg-slate-700 rounded-full mx-auto mb-1 shrink-0 sm:hidden" />
            <div className="flex items-center gap-3 pb-3 border-b border-slate-800">
              <div className="w-10 h-10 rounded-2xl bg-sky-500/20 border border-sky-400/30 text-sky-400 flex items-center justify-center shrink-0">
                <Award className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-white leading-tight">Seat Transition / Upgrade</h3>
                <p className="text-xs text-slate-400">Permanent career position change & award</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 block">New Awarded Seat / Position</label>
                <select
                  value={targetUpgradeRole}
                  onChange={(e) => setTargetUpgradeRole(e.target.value as any)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-3.5 py-2.5 text-xs font-bold text-white focus:outline-none focus:border-sky-500 cursor-pointer"
                >
                  <option value="CA">👨‍✈️ Captain (CA - 4 Gold Stripes • PIC)</option>
                  <option value="CHECK_PILOT">👨‍✈️ Check Airman / Evaluator (4 Gold Stripes • PIC)</option>
                  <option value="FO">👨‍✈️ First Officer (FO - 3 Gold Stripes • SIC)</option>
                  <option value="FA">🛫 Flight Attendant (FA - Cabin Crew)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 block">Effective Transition Date</label>
                <input
                  type="date"
                  value={upgradeEffectiveDate}
                  onChange={(e) => setUpgradeEffectiveDate(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-3.5 py-2.5 text-xs font-bold text-white focus:outline-none focus:border-sky-500"
                />
              </div>

              {/* Transition Summary Notice */}
              <div className="p-3.5 bg-sky-950/40 border border-sky-800/80 rounded-2xl text-xs space-y-1.5 text-sky-200">
                <span className="font-bold block flex items-center gap-1.5 text-sky-300">
                  <ShieldCheck className="w-4 h-4 text-sky-400 shrink-0" /> Operational Impact:
                </span>
                <ul className="list-disc pl-4 space-y-1 text-[11px] text-slate-300">
                  <li>
                    {targetUpgradeRole === "CA" || targetUpgradeRole === "CHECK_PILOT"
                      ? "All flight roster legs will be logged as PIC (Pilot in Command) in your electronic logbook."
                      : "All flight roster legs will be logged as SIC (Second in Command) in your electronic logbook."}
                  </li>
                  <li>Base hourly pay rate will recalibrate to the corresponding CBA longevity scale.</li>
                </ul>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setShowUpgradeModal(false)}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-xs rounded-xl transition cursor-pointer active-press border border-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmSeatTransition}
                className="flex-1 py-2.5 bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs rounded-xl transition cursor-pointer shadow-md active-press"
              >
                Confirm Upgrade
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Safety Reset Confirmation Modal */}
      {showResetModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 z-[100000] animate-fadeIn font-sans">
          <div className="bg-slate-900 text-white rounded-t-3xl sm:rounded-3xl p-4 sm:p-6 max-w-md w-full border-t sm:border border-slate-700/80 shadow-2xl space-y-4 animate-slideUp pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))]">
            <div className="w-12 h-1.5 bg-slate-700 rounded-full mx-auto mb-1 shrink-0 sm:hidden" />
            <div className="w-12 h-12 rounded-2xl bg-rose-950/60 border border-rose-800/80 text-rose-400 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-base font-black text-white">Reset Local Schedule Data?</h3>
              <p className="text-xs text-slate-400">
                This will clear all sequences, snapshots, and logbook records from your local computer. This action cannot be undone.
              </p>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setShowResetModal(false)}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-xs rounded-xl transition cursor-pointer active-press border border-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  clearAll();
                  setShowResetModal(false);
                  triggerToast("Local schedule database reset!");
                }}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl transition cursor-pointer shadow-md active-press"
              >
                Reset Everything
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Initial Profile Setup Wizard Modal */}
      {showInitialSetup && (
        <InitialProfileSetup
          isOpen={showInitialSetup}
          isStandaloneModal={true}
          onClose={() => setShowInitialSetup(false)}
          onComplete={() => {
            setShowInitialSetup(false);
            triggerToast("Profile & longevity successfully updated!");
          }}
        />
      )}

      {/* Firebase Cloud Sync & Authentication Modal */}
      <CloudSyncModal
        isOpen={showCloudModal}
        onClose={() => setShowCloudModal(false)}
      />
    </div>
  );
}
