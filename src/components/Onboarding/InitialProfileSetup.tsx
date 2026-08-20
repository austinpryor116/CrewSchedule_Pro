"use client";

import { useState } from "react";
import { useCrewStore } from "@/store/useCrewStore";
import { UserProfile } from "@/types";
import { ProfileSyncService } from "@/lib/firebase/profileService";
import { CloudSyncService } from "@/lib/firebase/syncService";
import { auth } from "@/lib/firebase/config";
import {
  Plane,
  Shield,
  Award,
  Calendar,
  Clock,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  User,
  Building,
  Mail,
  Phone,
  Sparkles,
  Cloud,
  Check,
  Zap,
  ArrowRight,
  RefreshCw,
  X,
  Star,
} from "lucide-react";

interface InitialProfileSetupProps {
  isOpen?: boolean;
  onComplete?: () => void;
  onClose?: () => void;
  isStandaloneModal?: boolean;
}

const ENVOY_BASES = [
  { code: "ORD", name: "Chicago O'Hare (ORD)" },
  { code: "DFW", name: "Dallas/Fort Worth (DFW)" },
  { code: "MIA", name: "Miami (MIA)" },
  { code: "PHX", name: "Phoenix Sky Harbor (PHX)" },
];

export default function InitialProfileSetup({
  isOpen = true,
  onComplete,
  onClose,
  isStandaloneModal = false,
}: InitialProfileSetupProps) {
  const userProfile = useCrewStore((state) => state.userProfile);
  const updateUserProfile = useCrewStore((state) => state.updateUserProfile);

  // Step 0 = Welcome Screen, Step 1 = Domicile & Fleet, Step 2 = Rank/Seat, Step 3 = Pay/Longevity, Step 4 = Verify & Launch
  const [currentStep, setCurrentStep] = useState<0 | 1 | 2 | 3 | 4>(0);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  // Form State initialized with current user profile
  const [formData, setFormData] = useState<UserProfile>({
    name: userProfile?.name || "",
    employeeId: userProfile?.employeeId || "",
    seniorityNumber: userProfile?.seniorityNumber || "",
    airline: "Envoy Air (AA Eagle)",
    base: userProfile?.base || "ORD",
    equipment: "E175",
    crewRole: (userProfile?.crewRole as any) === "LFA" ? "FA" : (userProfile?.crewRole || "CA"),
    hireDate: userProfile?.hireDate || "2015-08-15",
    hasCompleted750Sic: userProfile?.hasCompleted750Sic || false,
    sic750DateReached: userProfile?.sic750DateReached || "",
    flowStatus: userProfile?.flowStatus || "PENDING",
    isCaptainFlowTopScale: userProfile?.isCaptainFlowTopScale || false,
    flowTopScaleDateReached: userProfile?.flowTopScaleDateReached || "",
    email: userProfile?.email || "",
    phone: userProfile?.phone || "",
    timezoneDisplay: userProfile?.timezoneDisplay || "LOCAL",
    notificationsEnabled: userProfile?.notificationsEnabled ?? true,
    syncCalendar: userProfile?.syncCalendar ?? true,
    autoSyncEnabled: userProfile?.autoSyncEnabled ?? true,
  });

  if (!isOpen || isDismissed) return null;

  const handleNext = () => {
    if (currentStep < 4) {
      setCurrentStep((prev) => (prev + 1) as any);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => (prev - 1) as any);
    }
  };

  const handleComplete = () => {
    // 1. Immediately dismiss so the modal unmounts on 1 tap with 0 delay
    setIsDismissed(true);
    if (onComplete) onComplete();
    if (onClose) onClose();

    try {
      const uid = auth?.currentUser?.uid || userProfile?.firebaseUid;
      const finalProfile: UserProfile = {
        ...formData,
        firebaseUid: uid || formData.firebaseUid,
        airline: "Envoy Air (AA Eagle)",
        equipment: "E175",
        hasCompletedOnboarding: true,
        updatedAt: new Date().toISOString(),
      };

      // 2. Update Global Zustand Store
      updateUserProfile(finalProfile);

      // 3. Persist locally and sync to Firebase in background
      ProfileSyncService.saveProfile(finalProfile).catch((err) =>
        console.warn("[Onboarding] Local profile save notice:", err)
      );

      // 4. Push snapshot to Cloud Firestore in background
      if (uid) {
        CloudSyncService.backupAllToCloud(uid).catch((syncErr) => {
          console.warn("[Onboarding] Cloud backup deferred (offline cache active):", syncErr);
        });
      }
    } catch (err) {
      console.error("Failed to complete profile onboarding:", err);
    }
  };

  const isCaptainRole = formData.crewRole === "CA" || formData.crewRole === "CHECK_PILOT";
  const isFoRole = formData.crewRole === "FO";
  const isFlightAttendantRole = formData.crewRole === "FA";

  return (
    <div className="fixed inset-0 z-[100000] flex flex-col bg-[#f8fafc] text-slate-900 font-sans overflow-hidden select-none animate-fadeIn">
      {/* 1. Header Bar */}
      <div className="pt-[max(2.5rem,calc(env(safe-area-inset-top,0px)+0.75rem))] pb-3 px-4 bg-white/95 border-b border-slate-200 shadow-xs backdrop-blur-md shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center shadow-md shadow-sky-600/20 border border-sky-400/30">
              <Plane className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-black tracking-tight text-slate-900 flex items-center gap-1.5">
                CrewSchedule Pro
                <span className="text-[10px] px-1.5 py-0.2 bg-sky-100 border border-sky-200 text-sky-700 font-mono font-extrabold rounded-md">
                  ENVOY AIR
                </span>
              </h1>
              <p className="text-[11px] text-slate-500 font-medium">
                {currentStep === 0 ? "Envoy Pilots & Flight Attendants Setup" : `Setup Step ${currentStep} of 4`}
              </p>
            </div>
          </div>

          {isStandaloneModal && onClose && (
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 border border-slate-200 active-press transition cursor-pointer"
              title="Close Wizard"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Step Indicator Badges (Shown when step > 0) */}
        {currentStep > 0 && (
          <div className="grid grid-cols-4 gap-1.5 pt-3">
            {[
              { step: 1, label: "Domicile & Fleet" },
              { step: 2, label: "Position & Seat" },
              { step: 3, label: "Pay & Longevity" },
              { step: 4, label: "Verify" },
            ].map((item) => {
              const isActive = currentStep === item.step;
              const isDone = currentStep > item.step;
              return (
                <button
                  key={item.step}
                  onClick={() => setCurrentStep(item.step as any)}
                  className={`py-1.5 px-1 rounded-xl text-center transition flex flex-col items-center gap-0.5 border cursor-pointer active-press ${
                    isActive
                      ? "bg-sky-50 border-sky-300 text-sky-700 font-extrabold shadow-2xs"
                      : isDone
                      ? "bg-emerald-50 border-emerald-300 text-emerald-700 font-bold"
                      : "bg-slate-100 border-slate-200 text-slate-400 font-medium"
                  }`}
                >
                  <div className="flex items-center gap-1">
                    {isDone ? (
                      <Check className="w-2.5 h-2.5 text-emerald-600 stroke-[3]" />
                    ) : (
                      <span className="text-[9px] font-mono font-black">{item.step}</span>
                    )}
                    <span className="text-[9.5px] truncate">{item.label}</span>
                  </div>
                  <div
                    className={`w-full h-1 rounded-full ${
                      isActive ? "bg-sky-600" : isDone ? "bg-emerald-500" : "bg-slate-200"
                    }`}
                  />
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* 2. Main Scrollable Content Body */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {/* STEP 0: WELCOME & ENVOY ONBOARDING HERO */}
        {currentStep === 0 && (
          <div className="space-y-4 animate-fadeIn">
            {/* Hero Card */}
            <div className="p-5 bg-gradient-to-br from-sky-600 via-indigo-600 to-sky-700 rounded-3xl text-white shadow-xl shadow-sky-600/20 space-y-3 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-2xl pointer-events-none" />
              
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-2xl bg-white/20 border border-white/30 flex items-center justify-center shadow-lg">
                  <Plane className="w-6 h-6 text-white" />
                </div>
                <span className="px-3 py-1 bg-white/20 border border-white/30 text-white font-mono font-bold text-xs rounded-full">
                  ENVOY AIR / AA EAGLE
                </span>
              </div>

              <div className="space-y-1">
                <h2 className="text-xl font-black tracking-tight leading-snug">
                  Welcome to CrewSchedule Pro
                </h2>
                <p className="text-xs text-sky-100/90 leading-relaxed">
                  Tailored exclusively for Envoy Air <strong>Pilots & Flight Attendants</strong> with native DECS, WebSabre, and CBA contract intelligence.
                </p>
              </div>

              <div className="pt-2 flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-1 rounded-lg bg-white/20 text-[10px] font-mono font-bold tracking-wide border border-white/30">
                  DECS & SABRE READY
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-amber-400 text-slate-950 text-[10px] font-mono font-black tracking-wide">
                  PILOT & INFLIGHT CBA
                </span>
              </div>
            </div>

            {/* Onboarding Value Pillars */}
            <div className="space-y-2.5">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 px-1">
                Envoy Crew Setup:
              </h3>

              <div className="grid grid-cols-1 gap-2.5">
                {[
                  {
                    icon: Building,
                    color: "text-sky-600 bg-sky-50 border-sky-200",
                    title: "1. Domicile Base & Fleet",
                    desc: "Select your Envoy domicile (ORD, DFW, MIA, PHX) and Embraer 170/175 fleet assignment.",
                  },
                  {
                    icon: Award,
                    color: "text-amber-600 bg-amber-50 border-amber-200",
                    title: "2. Pilot & Flight Attendant Positions",
                    desc: "Captain (4-Stripe), First Officer (3-Stripe), Check Pilot, or Flight Attendant with credentials.",
                  },
                  {
                    icon: Clock,
                    color: "text-emerald-600 bg-emerald-50 border-emerald-200",
                    title: "3. CBA Contract Longevity Pay",
                    desc: "Automatic step pay calculations tailored to ALPA (Pilots) or AFA-CWA (Flight Attendants).",
                  },
                  {
                    icon: Cloud,
                    color: "text-indigo-600 bg-indigo-50 border-indigo-200",
                    title: "4. Autonomous DECS Synchronization",
                    desc: "Enable local computer persistence and cloud backup for monthly HI1 schedule parsing.",
                  },
                ].map((item, idx) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={idx}
                      className="p-3.5 bg-white border border-slate-200 rounded-2xl flex items-start gap-3 shadow-2xs"
                    >
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${item.color}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="space-y-0.5">
                        <h4 className="text-xs font-black text-slate-900">{item.title}</h4>
                        <p className="text-[11px] text-slate-500 leading-relaxed">{item.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* STEP 1: DOMICILE & FLEET (ENVOY SPECIFIC) */}
        {currentStep === 1 && (
          <div className="space-y-4 animate-fadeIn">
            <div className="p-3.5 bg-sky-50/70 border border-sky-100 rounded-2xl space-y-1">
              <h2 className="text-xs font-black uppercase tracking-wider text-sky-800 flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5 text-sky-600" /> Envoy Carrier & Domicile
              </h2>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Configure your home base domicile and aircraft fleet.
              </p>
            </div>

            {/* Carrier Banner Card */}
            <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-2xs space-y-2">
              <label className="text-[11px] font-bold text-slate-700">Airline Carrier</label>
              <div className="flex items-center justify-between p-3 bg-sky-50/80 border border-sky-200 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-sky-600 flex items-center justify-center text-white font-black text-xs shadow-xs">
                    MQ
                  </div>
                  <div>
                    <span className="text-xs font-black text-slate-900 block">Envoy Air (American Eagle)</span>
                    <span className="text-[10px] text-sky-700 font-semibold block">AA Regional Network Carrier</span>
                  </div>
                </div>
                <span className="px-2.5 py-1 bg-sky-200/80 border border-sky-300 text-sky-900 text-[10px] font-mono font-black rounded-md">
                  ENVOY
                </span>
              </div>
            </div>

            {/* Domicile Base Selector */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-slate-700">Home Domicile Base</label>
              <div className="grid grid-cols-2 gap-2.5">
                {ENVOY_BASES.map((b) => {
                  const isSelected = formData.base === b.code;
                  return (
                    <button
                      key={b.code}
                      type="button"
                      onClick={() => setFormData({ ...formData, base: b.code })}
                      className={`p-3 rounded-2xl border text-left transition cursor-pointer active-press flex flex-col justify-between ${
                        isSelected
                          ? "bg-sky-50 border-2 border-sky-600 shadow-sm text-slate-900 ring-2 ring-sky-600/20"
                          : "bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700"
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="text-sm font-mono font-black text-slate-900">{b.code}</span>
                        {isSelected && <CheckCircle2 className="w-4 h-4 text-sky-600" />}
                      </div>
                      <span className="text-[10px] text-slate-500 font-medium mt-1">{b.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Aircraft Fleet Card (E175 / E170 Only) */}
            <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-2xs space-y-2">
              <label className="text-[11px] font-bold text-slate-700">Aircraft Fleet</label>
              <div className="flex items-center justify-between p-3.5 bg-amber-50/80 border-2 border-amber-500 rounded-xl shadow-2xs">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-900 font-mono font-black text-xs">
                    E175
                  </div>
                  <div>
                    <span className="text-xs font-black text-slate-900 block">Embraer 170 / 175 (E170 / E175)</span>
                    <span className="text-[10px] text-amber-800 font-semibold block">Envoy Air Regional Fleet Standard</span>
                  </div>
                </div>
                <CheckCircle2 className="w-5 h-5 text-amber-600" />
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: CREW POSITION (PILOTS & FLIGHT ATTENDANTS) */}
        {currentStep === 2 && (
          <div className="space-y-4 animate-fadeIn">
            <div className="p-3.5 bg-sky-50/70 border border-sky-100 rounded-2xl space-y-1">
              <h2 className="text-xs font-black uppercase tracking-wider text-sky-800 flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5 text-sky-600" /> Crew Position & Identity
              </h2>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Select whether you are Flight Deck (Pilot) or Inflight (Flight Attendant).
              </p>
            </div>

            {/* Section A: Flight Deck (Pilots) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <span className="text-[11px] font-black uppercase text-slate-500 tracking-wider flex items-center gap-1.5">
                  <Plane className="w-3.5 h-3.5 text-sky-600" /> Flight Deck (Pilots)
                </span>
                <span className="text-[9.5px] text-slate-400 font-medium">ALPA Contract</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { role: "CA", title: "Captain", sub: "Pilot in Command", stripes: 4 },
                  { role: "FO", title: "First Officer", sub: "Second in Command", stripes: 3 },
                  { role: "CHECK_PILOT", title: "Check Pilot", sub: "Check Airman", stripes: 4 },
                ].map((r) => {
                  const isSelected = formData.crewRole === r.role;
                  return (
                    <button
                      key={r.role}
                      type="button"
                      onClick={() => setFormData({ ...formData, crewRole: r.role as any })}
                      className={`p-2.5 rounded-2xl border text-left flex flex-col justify-between transition cursor-pointer active-press ${
                        isSelected
                          ? "bg-sky-50 border-2 border-sky-600 shadow-sm text-slate-900 ring-2 ring-sky-600/20"
                          : "bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700"
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <span className="text-xs font-black text-slate-900">{r.title}</span>
                        {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-sky-600" />}
                      </div>
                      <div className="mt-2 flex gap-0.5">
                        {Array.from({ length: r.stripes }).map((_, i) => (
                          <div
                            key={i}
                            className={`h-1 flex-1 rounded-full ${
                              isSelected ? "bg-amber-400 border border-amber-500/40" : "bg-slate-300"
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-[9px] text-slate-500 font-medium mt-1">{r.sub}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Section B: Inflight (Flight Attendant) */}
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between px-1">
                <span className="text-[11px] font-black uppercase text-indigo-700 tracking-wider flex items-center gap-1.5">
                  <Star className="w-3.5 h-3.5 text-indigo-600" /> Inflight (Flight Attendant)
                </span>
                <span className="text-[9.5px] text-slate-400 font-medium">AFA-CWA Contract</span>
              </div>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, crewRole: "FA" })}
                className={`w-full p-3.5 rounded-2xl border text-left transition cursor-pointer active-press flex items-center justify-between ${
                  formData.crewRole === "FA"
                    ? "bg-indigo-50 border-2 border-indigo-600 shadow-sm text-slate-900 ring-2 ring-indigo-600/20"
                    : "bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-100 border border-indigo-200 flex items-center justify-center text-indigo-700 font-black text-xs">
                    FA
                  </div>
                  <div>
                    <span className="text-xs font-black text-slate-900 block">Flight Attendant</span>
                    <span className="text-[10px] text-slate-500 font-medium block">Envoy Inflight Cabin Crew Member</span>
                  </div>
                </div>
                {formData.crewRole === "FA" && <CheckCircle2 className="w-5 h-5 text-indigo-600" />}
              </button>
            </div>

            {/* Name & Employee ID */}
            <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-2xs space-y-3">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700">Full Crew Member Name</label>
                <input
                  type="text"
                  placeholder="e.g. Austin Pryor"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-sky-600 focus:ring-2 focus:ring-sky-600/20 font-semibold shadow-2xs transition"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700">Employee ID (6-Digit)</label>
                  <input
                    type="text"
                    placeholder="e.g. 742840"
                    value={formData.employeeId}
                    onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none focus:bg-white focus:border-sky-600 focus:ring-2 focus:ring-sky-600/20 shadow-2xs transition"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700">Seniority Number</label>
                  <input
                    type="text"
                    placeholder="e.g. 01361"
                    value={formData.seniorityNumber}
                    onChange={(e) => setFormData({ ...formData, seniorityNumber: e.target.value })}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none focus:bg-white focus:border-sky-600 focus:ring-2 focus:ring-sky-600/20 shadow-2xs transition"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: PAY SCALE & LONGEVITY (ROLE-AWARE CBA) */}
        {currentStep === 3 && (
          <div className="space-y-4 animate-fadeIn">
            <div className={`p-3.5 rounded-2xl space-y-1 border ${
              isFlightAttendantRole
                ? "bg-indigo-50/70 border-indigo-100"
                : "bg-emerald-50/70 border-emerald-100"
            }`}>
              <h2 className={`text-xs font-black uppercase tracking-wider flex items-center gap-1.5 ${
                isFlightAttendantRole ? "text-indigo-800" : "text-emerald-800"
              }`}>
                <Clock className={`w-3.5 h-3.5 ${isFlightAttendantRole ? "text-indigo-600" : "text-emerald-600"}`} />
                {isFlightAttendantRole ? "Envoy Inflight CBA Pay Scale (AFA-CWA)" : "Envoy Pilot CBA Pay Scale (ALPA)"}
              </h2>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                {isFlightAttendantRole
                  ? "AFA-CWA Contract Section 3 (Compensation) and per diem expense calculations."
                  : "Envoy Pilot Agreement Section 3 (Pay) & Section 5 (Expenses) automatic calculations."}
              </p>
            </div>

            {/* Date of Hire */}
            <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-2xs space-y-2">
              <label className="text-[11px] font-bold text-slate-800 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-sky-600" />
                Company Date of Hire (Longevity)
              </label>
              <input
                type="date"
                value={formData.hireDate}
                onChange={(e) => setFormData({ ...formData, hireDate: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-mono font-bold focus:outline-none focus:bg-white focus:border-sky-600 focus:ring-2 focus:ring-sky-600/20 shadow-2xs transition"
              />
              <p className="text-[10px] text-slate-500">
                {isFlightAttendantRole
                  ? "Calculates your Flight Attendant step scale rate, holiday pay rate, and monthly 75h guarantee."
                  : "Calculates your exact Step rate, reserve guarantee ($2.25/hr domestic per diem), and overtime credit."}
              </p>
            </div>

            {/* FO Specific: 750 SIC Captain Pay Qualification */}
            {isFoRole && (
              <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-amber-600" />
                      750 SIC Captain Pay Provision
                    </span>
                    <p className="text-[10px] text-slate-500">
                      Envoy Pilot Supply Agreement: FOs with 750+ SIC earn Captain hourly rate.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={formData.hasCompleted750Sic}
                    onChange={(e) => setFormData({ ...formData, hasCompleted750Sic: e.target.checked })}
                    className="w-5 h-5 rounded text-sky-600 focus:ring-sky-500 bg-slate-100 border-slate-300 cursor-pointer"
                  />
                </div>
              </div>
            )}

            {/* Captain Specific: Flow & Top Scale */}
            {isCaptainRole && (
              <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-2xs space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-sky-600" />
                    American Airlines Flow Through Status
                  </label>
                  <select
                    value={formData.flowStatus}
                    onChange={(e) => setFormData({ ...formData, flowStatus: e.target.value as any })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:bg-white focus:border-sky-600 focus:ring-2 focus:ring-sky-600/20 shadow-2xs transition"
                  >
                    <option value="ACCEPT">Accepted Flow (Active AA Seniority Queue)</option>
                    <option value="PENDING">Pending Flow Seniority Number</option>
                    <option value="BYPASS">Bypassed (Temporary Hold)</option>
                    <option value="DECLINE">Declined Flow (Career Envoy Captain)</option>
                  </select>
                </div>
              </div>
            )}
          </div>
        )}

        {/* STEP 4: VERIFICATION & LAUNCH */}
        {currentStep === 4 && (
          <div className="space-y-4 animate-fadeIn">
            <div className="p-3.5 bg-amber-50/70 border border-amber-100 rounded-2xl space-y-1">
              <h2 className="text-xs font-black uppercase tracking-wider text-amber-800 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-600" /> Your Flight Deck Profile is Ready!
              </h2>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Review your Envoy profile details. Everything is persisted locally and synchronized with your device.
              </p>
            </div>

            {/* Pilot / Crew ID Card Live Mockup */}
            <div className="p-4 rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-sky-950 text-white border border-slate-700 shadow-xl space-y-4 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-36 h-36 bg-sky-500/10 rounded-full blur-2xl pointer-events-none" />

              <div className="flex items-center justify-between pb-3 border-b border-slate-700/80">
                <div className="flex items-center gap-2.5">
                  <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-black text-sm text-white shadow-md border ${
                    isFlightAttendantRole
                      ? "bg-gradient-to-tr from-indigo-600 to-purple-600 border-indigo-400/40"
                      : "bg-gradient-to-tr from-sky-600 to-indigo-600 border-sky-400/40"
                  }`}>
                    {formData.name
                      ? formData.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .substring(0, 2)
                          .toUpperCase()
                      : "MQ"}
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white">{formData.name || "Envoy Crew Member"}</h3>
                    <p className="text-[10px] text-sky-400 font-mono font-bold">
                      EMP #{formData.employeeId || "742840"} • SEN #{formData.seniorityNumber || "01361"}
                    </p>
                  </div>
                </div>

                <span className={`px-2.5 py-1 text-[10px] font-black font-mono rounded-lg border ${
                  isFlightAttendantRole
                    ? "bg-indigo-500/20 border-indigo-400/40 text-indigo-300"
                    : "bg-amber-500/20 border-amber-400/40 text-amber-300"
                }`}>
                  {formData.crewRole === "FA"
                    ? "FLIGHT ATTENDANT"
                    : formData.crewRole}
                </span>
              </div>

              {/* Badges Grid */}
              <div className="grid grid-cols-3 gap-2 text-center font-mono">
                <div className="p-2.5 bg-slate-950/70 border border-slate-700/80 rounded-xl">
                  <span className="text-[9px] text-slate-400 block font-sans">DOMICILE</span>
                  <span className="text-xs font-black text-white">{formData.base}</span>
                </div>
                <div className="p-2.5 bg-slate-950/70 border border-slate-700/80 rounded-xl">
                  <span className="text-[9px] text-slate-400 block font-sans">FLEET</span>
                  <span className="text-xs font-black text-white">E170 / E175</span>
                </div>
                <div className="p-2.5 bg-slate-950/70 border border-slate-700/80 rounded-xl">
                  <span className="text-[9px] text-slate-400 block font-sans">DIVISION</span>
                  <span className="text-xs font-black text-white">{isFlightAttendantRole ? "INFLIGHT" : "PILOT"}</span>
                </div>
              </div>

              {/* Carrier & Longevity */}
              <div className="p-3 bg-slate-950/60 border border-slate-700/80 rounded-xl space-y-1.5 text-xs">
                <div className="flex justify-between items-center text-slate-300">
                  <span>Airline Carrier:</span>
                  <span className="text-white font-bold">Envoy Air (American Eagle)</span>
                </div>
                <div className="flex justify-between items-center text-slate-300">
                  <span>Company Hire Date:</span>
                  <span className="text-white font-mono font-bold">{formData.hireDate || "2015-08-15"}</span>
                </div>
              </div>
            </div>

            {/* Cloud Ready Banner */}
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between text-xs shadow-2xs">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold shrink-0">
                  <Cloud className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold text-emerald-950 block text-[11px]">Local & Firebase Cloud Ready</span>
                  <span className="text-[10px] text-emerald-700 block">Primary local computer storage synchronized</span>
                </div>
              </div>
              <span className="text-[9px] px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-extrabold border border-emerald-200">
                ACTIVE
              </span>
            </div>
          </div>
        )}
      </div>

      {/* 3. Bottom Action Dock */}
      <div className="p-3.5 bg-white/95 border-t border-slate-200 shadow-xl backdrop-blur-md shrink-0 flex items-center justify-between gap-3 pb-[max(1rem,env(safe-area-inset-bottom,0px))]">
        {currentStep === 0 ? (
          <button
            type="button"
            onClick={handleNext}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-sky-600 via-indigo-600 to-sky-600 hover:from-sky-500 hover:to-indigo-500 text-white text-xs font-black flex items-center justify-center gap-2 shadow-lg shadow-sky-600/30 active-press transition cursor-pointer"
          >
            <span>Get Started & Set Up Envoy Profile</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={handleBack}
              className="px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 active-press transition cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
              Back
            </button>

            {currentStep < 4 ? (
              <button
                type="button"
                onClick={handleNext}
                className="flex-1 max-w-[200px] ml-auto py-2.5 px-4 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-black flex items-center justify-center gap-1.5 shadow-md shadow-sky-600/25 active-press transition cursor-pointer"
              >
                Continue
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleComplete}
                className="flex-1 py-2.5 px-4 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 shadow-lg active-press transition cursor-pointer bg-gradient-to-r from-sky-600 via-indigo-600 to-sky-600 hover:from-sky-500 hover:to-indigo-500 text-white shadow-sky-600/30"
              >
                <span>Enter Flight Deck / Inflight</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
