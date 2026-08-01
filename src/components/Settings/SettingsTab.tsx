"use client";

import { useState } from "react";
import { useCrewStore } from "../../store/useCrewStore";
import {
  Settings,
  Clock,
  Plus,
  Trash2,
  RotateCcw,
  ShieldCheck,
  Check,
  Building2,
  Award,
  UserCheck,
  DollarSign,
  Scale,
  Briefcase,
  SlidersHorizontal,
  Sparkles,
  Plane,
  Coins,
  ShieldAlert,
  Zap,
} from "lucide-react";
import { PayRates, OpenTimePreset } from "../../types";

export default function SettingsTab() {
  const payRates = useCrewStore((state) => state.payRates);
  const setPayRates = useCrewStore((state) => state.setPayRates);

  const stationTurnLimits = useCrewStore((state) => state.stationTurnLimits);
  const defaultTurnLimit = useCrewStore((state) => state.defaultTurnLimit);
  const highCreditThresholdHours = useCrewStore((state) => state.highCreditThresholdHours);
  const setStationTurnLimit = useCrewStore((state) => state.setStationTurnLimit);
  const removeStationTurnLimit = useCrewStore((state) => state.removeStationTurnLimit);
  const setDefaultTurnLimit = useCrewStore((state) => state.setDefaultTurnLimit);
  const resetStationTurnLimits = useCrewStore((state) => state.resetStationTurnLimits);
  const setHighCreditThresholdHours = useCrewStore((state) => state.setHighCreditThresholdHours);

  const [activeSection, setActiveSection] = useState<"presets" | "profile" | "pay" | "legality" | "stations">("presets");

  const openPresets = useCrewStore((state) => state.openTimePresets);
  const addOpenPreset = useCrewStore((state) => state.addOpenTimePreset);
  const removeOpenPreset = useCrewStore((state) => state.removeOpenTimePreset);
  const activePresetFilter = useCrewStore((state) => state.openTimeFilter);
  const setOpenTimeFilter = useCrewStore((state) => state.setOpenTimeFilter);

  // Typable Preference Form State inside Settings (Tools)
  const [presetName, setPresetName] = useState("");
  const [minCredit, setMinCredit] = useState<number | "">(3.5);
  const [maxCredit, setMaxCredit] = useState<number | "">("");
  const [maxDays, setMaxDays] = useState<number | "">(1);
  const [reportAfterTime, setReportAfterTime] = useState("");
  const [reportBeforeTime, setReportBeforeTime] = useState("");
  const [releaseBeforeTime, setReleaseBeforeTime] = useState("");
  const [layoverPrefText, setLayoverPrefText] = useState("");
  const [fitsOnly, setFitsOnly] = useState(false);
  const [baseFilter, setBaseFilter] = useState("ALL");

  const handleCreateSettingsPreset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!presetName.trim()) return;

    const newPreset: OpenTimePreset = {
      id: `preset-${Date.now()}`,
      name: presetName.trim(),
      minCreditHours: minCredit !== "" ? Number(minCredit) : undefined,
      maxCreditHours: maxCredit !== "" ? Number(maxCredit) : undefined,
      maxTripDays: maxDays !== "" ? Number(maxDays) : undefined,
      reportAfterTime: reportAfterTime.trim() || undefined,
      reportBeforeTime: reportBeforeTime.trim() || undefined,
      releaseBeforeTime: releaseBeforeTime.trim() || undefined,
      preferredLayoverCity: layoverPrefText.trim() || undefined,
      fitsOnly: fitsOnly,
      baseFilter: baseFilter,
    };

    addOpenPreset(newPreset);
    setPresetName("");
    triggerToast(`Saved Custom Preset: ${newPreset.name}`);
  };
  const [newStation, setNewStation] = useState("");
  const [newMinutes, setNewMinutes] = useState(40);
  const [showSavedToast, setShowSavedToast] = useState(false);
  const [toastMsg, setToastMsg] = useState("Settings updated!");

  const triggerToast = (msg = "Settings updated!") => {
    setToastMsg(msg);
    setShowSavedToast(true);
    setTimeout(() => setShowSavedToast(false), 2200);
  };

  const applyPresetProfile = (role: "CA" | "FO" | "LFA" | "FA") => {
    let preset: Partial<PayRates> = {};
    if (role === "CA") {
      preset = {
        crewRole: "CA",
        hourlyRate: 340.0,
        overtimeMultiplier: 1.5,
        perDiemRate: 2.85,
        intlPerDiemRate: 3.60,
        monthlyGuaranteeHours: 75.0,
        minDailyGuaranteeMinutes: 300,
        legalityStandard: "FAR117",
        minRestHours: 10.0,
        maxFdpHours: 13.0,
        maxDailyFlightHours: 9.0,
        reportBufferMins: 45,
        releaseBufferMins: 15,
      };
    } else if (role === "FO") {
      preset = {
        crewRole: "FO",
        hourlyRate: 215.0,
        overtimeMultiplier: 1.5,
        perDiemRate: 2.50,
        intlPerDiemRate: 3.25,
        monthlyGuaranteeHours: 75.0,
        minDailyGuaranteeMinutes: 300,
        legalityStandard: "FAR117",
        minRestHours: 10.0,
        maxFdpHours: 13.0,
        maxDailyFlightHours: 9.0,
        reportBufferMins: 45,
        releaseBufferMins: 15,
      };
    } else if (role === "LFA") {
      preset = {
        crewRole: "LFA",
        hourlyRate: 88.0,
        overtimeMultiplier: 1.5,
        perDiemRate: 2.40,
        intlPerDiemRate: 3.10,
        monthlyGuaranteeHours: 70.0,
        minDailyGuaranteeMinutes: 240,
        legalityStandard: "FA_REST",
        minRestHours: 10.0,
        maxFdpHours: 14.0,
        maxDailyFlightHours: 10.0,
        reportBufferMins: 60,
        releaseBufferMins: 30,
      };
    } else if (role === "FA") {
      preset = {
        crewRole: "FA",
        hourlyRate: 62.0,
        overtimeMultiplier: 1.5,
        perDiemRate: 2.25,
        intlPerDiemRate: 2.95,
        monthlyGuaranteeHours: 70.0,
        minDailyGuaranteeMinutes: 240,
        legalityStandard: "FA_REST",
        minRestHours: 10.0,
        maxFdpHours: 14.0,
        maxDailyFlightHours: 10.0,
        reportBufferMins: 60,
        releaseBufferMins: 30,
      };
    }

    setPayRates(preset);
    triggerToast(`Loaded ${role} Contract Preset!`);
  };

  const handleAddStation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStation.trim()) return;
    const stationCode = newStation.trim().toUpperCase();
    setStationTurnLimit(stationCode, Number(newMinutes) || 40);
    setNewStation("");
    setNewMinutes(40);
    triggerToast(`Added ${stationCode} turn limit!`);
  };

  const stations = Object.entries(stationTurnLimits);

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-16 font-sans animate-fadeIn">
      {/* Toast Notification */}
      {showSavedToast && (
        <div className="fixed bottom-6 right-6 bg-slate-900 text-white font-bold px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2.5 text-xs animate-bounce z-50 border border-slate-700">
          <Check className="w-4 h-4 text-emerald-400 stroke-[3]" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-white border border-slate-200 p-6 md:p-8 rounded-3xl shadow-sm relative overflow-hidden">
        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-100 border border-sky-300 text-sky-900 text-xs font-bold">
            <SlidersHorizontal className="w-3.5 h-3.5 text-sky-600" />
            <span>Pilot & Flight Attendant Contract Configuration</span>
          </div>
          <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
            Crew Member & Airline System Settings
          </h2>
          <p className="text-slate-600 text-xs md:text-sm max-w-3xl leading-relaxed font-medium">
            Customize crew roles (Captain, FO, Purser, Flight Attendant), base pay rates, per diems, overtime multipliers, FAR Part 117 legality thresholds, and station turn limits. All settings persist locally and drive real-time pay calculations and legality engines.
          </p>
        </div>
      </div>

      {/* Quick Role Preset Switcher Bar */}
      <div className="bg-white border border-slate-200 p-4 md:p-5 rounded-3xl shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-black uppercase text-slate-500 tracking-wider flex items-center gap-1.5 font-mono">
            <Sparkles className="w-4 h-4 text-amber-500" /> 1-Click Role Presets
          </span>
          <span className="text-[11px] text-slate-400 font-semibold hidden sm:inline">
            Selecting a preset updates pay rates, per diem, and FAR/FA rest rules instantly
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <button
            onClick={() => applyPresetProfile("CA")}
            className={`p-3 rounded-2xl border text-left transition cursor-pointer flex flex-col justify-between ${
              payRates.crewRole === "CA"
                ? "bg-sky-600 border-sky-500 text-white shadow-md"
                : "bg-slate-50 border-slate-200 text-slate-800 hover:bg-slate-100"
            }`}
          >
            <div>
              <span className="text-xs font-black block">👨‍✈️ Captain (CA)</span>
              <span className="text-[10px] opacity-80 block font-mono">$340/hr • 1.5x OT</span>
            </div>
            <span className="text-[9px] font-bold uppercase tracking-wide mt-2 block opacity-75">FAR 117 Pilot</span>
          </button>

          <button
            onClick={() => applyPresetProfile("FO")}
            className={`p-3 rounded-2xl border text-left transition cursor-pointer flex flex-col justify-between ${
              payRates.crewRole === "FO"
                ? "bg-sky-600 border-sky-500 text-white shadow-md"
                : "bg-slate-50 border-slate-200 text-slate-800 hover:bg-slate-100"
            }`}
          >
            <div>
              <span className="text-xs font-black block">👨‍✈️ First Officer (FO)</span>
              <span className="text-[10px] opacity-80 block font-mono">$215/hr • 1.5x OT</span>
            </div>
            <span className="text-[9px] font-bold uppercase tracking-wide mt-2 block opacity-75">FAR 117 Pilot</span>
          </button>

          <button
            onClick={() => applyPresetProfile("LFA")}
            className={`p-3 rounded-2xl border text-left transition cursor-pointer flex flex-col justify-between ${
              payRates.crewRole === "LFA"
                ? "bg-sky-600 border-sky-500 text-white shadow-md"
                : "bg-slate-50 border-slate-200 text-slate-800 hover:bg-slate-100"
            }`}
          >
            <div>
              <span className="text-xs font-black block">✈️ Lead FA / Purser</span>
              <span className="text-[10px] opacity-80 block font-mono">$88/hr • 1.5x OT</span>
            </div>
            <span className="text-[9px] font-bold uppercase tracking-wide mt-2 block opacity-75">FA Rest Standard</span>
          </button>

          <button
            onClick={() => applyPresetProfile("FA")}
            className={`p-3 rounded-2xl border text-left transition cursor-pointer flex flex-col justify-between ${
              payRates.crewRole === "FA"
                ? "bg-sky-600 border-sky-500 text-white shadow-md"
                : "bg-slate-50 border-slate-200 text-slate-800 hover:bg-slate-100"
            }`}
          >
            <div>
              <span className="text-xs font-black block">✈️ Flight Attendant</span>
              <span className="text-[10px] opacity-80 block font-mono">$62/hr • 1.5x OT</span>
            </div>
            <span className="text-[9px] font-bold uppercase tracking-wide mt-2 block opacity-75">FA Rest Standard</span>
          </button>
        </div>
      </div>

      {/* Main Navigation Tabs */}
      <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200 text-xs font-bold gap-1 overflow-x-auto scrollbar-none">
        <button
          onClick={() => setActiveSection("presets")}
          className={`flex-1 py-2.5 px-4 rounded-xl transition duration-150 flex items-center justify-center gap-2 shrink-0 cursor-pointer ${
            activeSection === "presets" ? "bg-white text-slate-900 shadow-sm font-extrabold" : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <SlidersHorizontal className="w-4 h-4 text-purple-600" />
          <span>1. Open Time Presets</span>
        </button>

        <button
          onClick={() => setActiveSection("profile")}
          className={`flex-1 py-2.5 px-4 rounded-xl transition duration-150 flex items-center justify-center gap-2 shrink-0 cursor-pointer ${
            activeSection === "profile" ? "bg-white text-slate-900 shadow-sm font-extrabold" : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <UserCheck className="w-4 h-4 text-sky-600" />
          <span>2. Crew & Base Profile</span>
        </button>

        <button
          onClick={() => setActiveSection("pay")}
          className={`flex-1 py-2.5 px-4 rounded-xl transition duration-150 flex items-center justify-center gap-2 shrink-0 cursor-pointer ${
            activeSection === "pay" ? "bg-white text-slate-900 shadow-sm font-extrabold" : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <DollarSign className="w-4 h-4 text-emerald-600" />
          <span>3. Pay Rates & Financial CBA</span>
        </button>

        <button
          onClick={() => setActiveSection("legality")}
          className={`flex-1 py-2.5 px-4 rounded-xl transition duration-150 flex items-center justify-center gap-2 shrink-0 cursor-pointer ${
            activeSection === "legality" ? "bg-white text-slate-900 shadow-sm font-extrabold" : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <Scale className="w-4 h-4 text-amber-600" />
          <span>4. FAR 117 & Legality Limits</span>
        </button>

        <button
          onClick={() => setActiveSection("stations")}
          className={`flex-1 py-2.5 px-4 rounded-xl transition duration-150 flex items-center justify-center gap-2 shrink-0 cursor-pointer ${
            activeSection === "stations" ? "bg-white text-slate-900 shadow-sm font-extrabold" : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <Building2 className="w-4 h-4 text-indigo-600" />
          <span>5. Station Turns & Buffers</span>
        </button>
      </div>

      {/* SECTION 1: CREW & BASE PROFILE */}
      {activeSection === "profile" && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 md:p-8 shadow-sm space-y-6 animate-fadeIn">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-200">
            <UserCheck className="w-6 h-6 text-sky-600" />
            <div>
              <h3 className="text-base font-extrabold text-slate-900">Crew Member Role & Domicile Settings</h3>
              <p className="text-xs text-slate-500 font-medium">Select crew rank, aircraft equipment, home base domicile, and employee ID</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Position / Role */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-800 block">Crew Position / Rank</label>
              <select
                value={payRates.crewRole || "FO"}
                onChange={(e) => {
                  setPayRates({ crewRole: e.target.value as any });
                  triggerToast(`Role updated to ${e.target.value}`);
                }}
                className="w-full bg-slate-50 border border-slate-300 rounded-2xl px-4 py-3 text-xs font-bold text-slate-900 focus:outline-none focus:border-sky-600 cursor-pointer"
              >
                <option value="CA">👨‍✈️ Captain (CA)</option>
                <option value="FO">👨‍✈️ First Officer (FO)</option>
                <option value="CHECK_PILOT">👨‍✈️ Check Airman / Evaluator</option>
                <option value="LFA">✈️ Lead Flight Attendant / Purser (LFA)</option>
                <option value="FA">✈️ Flight Attendant (FA)</option>
              </select>
              <p className="text-[11px] text-slate-500 font-medium">Controls flight logbook generation and pay calculation formulas</p>
            </div>

            {/* Aircraft Equipment */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-800 block">Fleet / Aircraft Equipment</label>
              <select
                value={payRates.equipment || "E175"}
                onChange={(e) => {
                  setPayRates({ equipment: e.target.value });
                  triggerToast(`Fleet updated to ${e.target.value}`);
                }}
                className="w-full bg-slate-50 border border-slate-300 rounded-2xl px-4 py-3 text-xs font-bold text-slate-900 focus:outline-none focus:border-sky-600 cursor-pointer"
              >
                <option value="E175">Embraer 175 / 170 (E175)</option>
                <option value="B737">Boeing 737-800 / 900 / MAX (B737)</option>
                <option value="A320">Airbus A320 / A321 (A320)</option>
                <option value="B787">Boeing 787 Dreamliner (B787)</option>
                <option value="B777">Boeing 777 (B777)</option>
              </select>
              <p className="text-[11px] text-slate-500 font-medium">Default aircraft type assigned to roster sequences</p>
            </div>

            {/* Home Base Domicile */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-800 block">Home Domicile / Base</label>
              <select
                value={payRates.homeBase || "ORD"}
                onChange={(e) => {
                  setPayRates({ homeBase: e.target.value });
                  triggerToast(`Home base updated to ${e.target.value}`);
                }}
                className="w-full bg-slate-50 border border-slate-300 rounded-2xl px-4 py-3 text-xs font-bold text-slate-900 focus:outline-none focus:border-sky-600 cursor-pointer font-mono"
              >
                <option value="ORD">ORD - Chicago O'Hare International</option>
                <option value="DFW">DFW - Dallas/Fort Worth International</option>
                <option value="MIA">MIA - Miami International</option>
                <option value="PHX">PHX - Phoenix Sky Harbor</option>
                <option value="DCA">DCA - Washington Reagan National</option>
                <option value="CLT">CLT - Charlotte Douglas</option>
                <option value="LAX">LAX - Los Angeles International</option>
                <option value="JFK">JFK - New York John F. Kennedy</option>
              </select>
              <p className="text-[11px] text-slate-500 font-medium">Used for TAFB (Time Away From Base) and layover rest calculations</p>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 2: PAY RATES & FINANCIAL CBA */}
      {activeSection === "pay" && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 md:p-8 shadow-sm space-y-6 animate-fadeIn">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-200">
            <DollarSign className="w-6 h-6 text-emerald-600" />
            <div>
              <h3 className="text-base font-extrabold text-slate-900">Financial CBA & Pay Rates Configuration</h3>
              <p className="text-xs text-slate-500 font-medium">Configure base hourly pay rates, per diems, overtime multipliers, and daily guarantees</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Hourly Pay Rate */}
            <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-2xl space-y-2">
              <label className="text-xs font-bold text-emerald-950 block">Base Flight Pay ($/hr)</label>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-emerald-700">$</span>
                <input
                  type="number"
                  min={20}
                  max={600}
                  step={0.5}
                  value={payRates.hourlyRate}
                  onChange={(e) => {
                    setPayRates({ hourlyRate: Number(e.target.value) || 0 });
                    triggerToast("Hourly pay rate updated");
                  }}
                  className="w-full bg-white border border-emerald-300 rounded-xl px-3 py-2 text-sm font-mono font-bold text-slate-900 focus:outline-none focus:border-emerald-600"
                />
              </div>
              <span className="text-[10px] text-emerald-800 font-medium block">Standard flight & credit hour pay rate</span>
            </div>

            {/* Overtime Multiplier */}
            <div className="p-4 bg-amber-50/60 border border-amber-200 rounded-2xl space-y-2">
              <label className="text-xs font-bold text-amber-950 block">Open Time Overtime Multiplier</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1.0}
                  max={3.0}
                  step={0.25}
                  value={payRates.overtimeMultiplier || 1.5}
                  onChange={(e) => {
                    setPayRates({ overtimeMultiplier: Number(e.target.value) || 1.5 });
                    triggerToast("Overtime multiplier updated");
                  }}
                  className="w-full bg-white border border-amber-300 rounded-xl px-3 py-2 text-sm font-mono font-bold text-slate-900 focus:outline-none focus:border-amber-600"
                />
                <span className="text-sm font-bold text-amber-800">x</span>
              </div>
              <span className="text-[10px] text-amber-800 font-medium block">Applied to Open Time pickups (1.5x Premium)</span>
            </div>

            {/* Domestic Per Diem */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
              <label className="text-xs font-bold text-slate-900 block">Domestic Per Diem ($/hr)</label>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-slate-600">$</span>
                <input
                  type="number"
                  min={1.0}
                  max={10.0}
                  step={0.05}
                  value={payRates.perDiemRate}
                  onChange={(e) => {
                    setPayRates({ perDiemRate: Number(e.target.value) || 0 });
                    triggerToast("Per diem rate updated");
                  }}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm font-mono font-bold text-slate-900 focus:outline-none focus:border-sky-600"
                />
              </div>
              <span className="text-[10px] text-slate-500 font-medium block">TAFB expense allowance per hour away</span>
            </div>

            {/* International Per Diem */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
              <label className="text-xs font-bold text-slate-900 block">International Per Diem ($/hr)</label>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-slate-600">$</span>
                <input
                  type="number"
                  min={1.0}
                  max={15.0}
                  step={0.05}
                  value={payRates.intlPerDiemRate || 3.5}
                  onChange={(e) => {
                    setPayRates({ intlPerDiemRate: Number(e.target.value) || 0 });
                    triggerToast("International per diem updated");
                  }}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm font-mono font-bold text-slate-900 focus:outline-none focus:border-sky-600"
                />
              </div>
              <span className="text-[10px] text-slate-500 font-medium block">Applied to international/trans-oceanic legs</span>
            </div>

            {/* Monthly Minimum Guarantee (MMG) */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
              <label className="text-xs font-bold text-slate-900 block">Monthly Minimum Guarantee (MMG)</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={40}
                  max={120}
                  step={1}
                  value={payRates.monthlyGuaranteeHours || 75.0}
                  onChange={(e) => {
                    setPayRates({ monthlyGuaranteeHours: Number(e.target.value) || 75 });
                    triggerToast("Monthly guarantee updated");
                  }}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm font-mono font-bold text-slate-900 focus:outline-none focus:border-sky-600"
                />
                <span className="text-xs font-bold text-slate-600">hrs</span>
              </div>
              <span className="text-[10px] text-slate-500 font-medium block">Contractual minimum monthly line pay</span>
            </div>

            {/* Daily Rig Minimum Guarantee */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
              <label className="text-xs font-bold text-slate-900 block">Daily Rig Minimum Guarantee</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={2.0}
                  max={8.0}
                  step={0.5}
                  value={(payRates.minDailyGuaranteeMinutes || 300) / 60}
                  onChange={(e) => {
                    setPayRates({ minDailyGuaranteeMinutes: (Number(e.target.value) || 5) * 60 });
                    triggerToast("Daily guarantee updated");
                  }}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm font-mono font-bold text-slate-900 focus:outline-none focus:border-sky-600"
                />
                <span className="text-xs font-bold text-slate-600">hrs/day</span>
              </div>
              <span className="text-[10px] text-slate-500 font-medium block">Minimum credit earned per calendar duty day</span>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 3: FAR 117 & LEGALITY LIMITS */}
      {activeSection === "legality" && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 md:p-8 shadow-sm space-y-6 animate-fadeIn">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-200">
            <Scale className="w-6 h-6 text-amber-600" />
            <div>
              <h3 className="text-base font-extrabold text-slate-900">FAA & Contractual Legality Thresholds</h3>
              <p className="text-xs text-slate-500 font-medium">Configure regulatory standards (FAR 117 vs Flight Attendant Rest) and maximum duty limits</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Regulatory Standard */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-800 block">Regulatory Compliance Standard</label>
              <select
                value={payRates.legalityStandard || "FAR117"}
                onChange={(e) => {
                  setPayRates({ legalityStandard: e.target.value as any });
                  triggerToast(`Compliance engine set to ${e.target.value}`);
                }}
                className="w-full bg-slate-50 border border-slate-300 rounded-2xl px-4 py-3 text-xs font-bold text-slate-900 focus:outline-none focus:border-amber-600 cursor-pointer"
              >
                <option value="FAR117">FAR Part 117 (Pilots - Strict FDP & Rest Rules)</option>
                <option value="FA_REST">FAA Flight Attendant Rest Standard (10 Hours Rest Guarantee - P.L. 115-254)</option>
              </select>
              <p className="text-[11px] text-slate-500 font-medium">Drives real-time legality validation on the calendar grid and inspector</p>
            </div>

            {/* Minimum Required Rest */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-800 block">Minimum Required Layover Rest (Hours)</label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min={8.0}
                  max={16.0}
                  step={0.5}
                  value={payRates.minRestHours || 10.0}
                  onChange={(e) => {
                    setPayRates({ minRestHours: Number(e.target.value) || 10.0 });
                    triggerToast("Minimum rest requirement updated");
                  }}
                  className="w-full bg-slate-50 border border-slate-300 rounded-2xl px-4 py-3 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-amber-600"
                />
                <span className="text-xs font-bold text-slate-600">hours</span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium">Mandatory consecutive rest block between duty periods</p>
            </div>

            {/* Max Daily FDP */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-800 block">Maximum Daily Flight Duty Period (FDP)</label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min={9.0}
                  max={18.0}
                  step={0.5}
                  value={payRates.maxFdpHours || 13.0}
                  onChange={(e) => {
                    setPayRates({ maxFdpHours: Number(e.target.value) || 13.0 });
                    triggerToast("Max FDP limit updated");
                  }}
                  className="w-full bg-slate-50 border border-slate-300 rounded-2xl px-4 py-3 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-amber-600"
                />
                <span className="text-xs font-bold text-slate-600">hours</span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium">Upper limit on continuous duty time per calendar day</p>
            </div>

            {/* Max Daily Flight Time */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-800 block">Maximum Daily Flight / Block Time</label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min={6.0}
                  max={14.0}
                  step={0.5}
                  value={payRates.maxDailyFlightHours || 9.0}
                  onChange={(e) => {
                    setPayRates({ maxDailyFlightHours: Number(e.target.value) || 9.0 });
                    triggerToast("Max daily flight hours updated");
                  }}
                  className="w-full bg-slate-50 border border-slate-300 rounded-2xl px-4 py-3 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-amber-600"
                />
                <span className="text-xs font-bold text-slate-600">hours</span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium">FAR 117.11 daily flight time cap for unaugmented operations</p>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 4: STATION TURNS & BUFFERS */}
      {activeSection === "stations" && (
        <div className="space-y-6 animate-fadeIn">
          {/* Main Station Limits Column */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 md:p-8 shadow-sm space-y-6">
            <div className="flex justify-between items-center pb-4 border-b border-slate-200">
              <div className="flex items-center gap-2.5">
                <Building2 className="w-5 h-5 text-indigo-600" />
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Station Turn Time Limits</h3>
                  <p className="text-[11px] text-slate-600 font-medium">Minimum connection time (minutes) required between turns</p>
                </div>
              </div>
              <button
                onClick={() => {
                  resetStationTurnLimits();
                  triggerToast("Reset station limits to defaults");
                }}
                className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold border border-slate-300 transition flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset Defaults
              </button>
            </div>

            {/* Station Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {stations.map(([station, limitMins]) => (
                <div
                  key={station}
                  className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3 relative group"
                >
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-900 border border-indigo-300 flex items-center justify-center font-mono font-bold text-xs">
                        {station}
                      </div>
                      <div>
                        <span className="text-xs font-bold text-slate-900">{station} Station</span>
                        <p className="text-[10px] text-slate-600 font-bold">Min Turn Threshold</p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        removeStationTurnLimit(station);
                        triggerToast(`Removed ${station} override`);
                      }}
                      title={`Remove ${station} override`}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition opacity-60 group-hover:opacity-100 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      min={10}
                      max={180}
                      value={limitMins}
                      onChange={(e) => {
                        setStationTurnLimit(station, Number(e.target.value) || 0);
                        triggerToast();
                      }}
                      className="w-20 bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs font-mono font-bold text-slate-900 text-center focus:outline-none focus:border-indigo-600"
                    />
                    <span className="text-xs font-bold text-slate-600">minutes</span>

                    <div className="flex items-center gap-1 ml-auto">
                      <button
                        onClick={() => {
                          setStationTurnLimit(station, Math.max(10, limitMins - 5));
                          triggerToast();
                        }}
                        className="w-6 h-6 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-md text-xs font-bold transition flex items-center justify-center cursor-pointer shadow-xs"
                      >
                        -5
                      </button>
                      <button
                        onClick={() => {
                          setStationTurnLimit(station, limitMins + 5);
                          triggerToast();
                        }}
                        className="w-6 h-6 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-md text-xs font-bold transition flex items-center justify-center cursor-pointer shadow-xs"
                      >
                        +5
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Add Custom Station Form */}
            <form
              onSubmit={handleAddStation}
              className="p-4 bg-slate-50 border border-indigo-300 rounded-2xl space-y-3"
            >
              <h4 className="text-xs font-bold text-indigo-900 flex items-center gap-1.5">
                <Plus className="w-3.5 h-3.5 text-indigo-600" />
                Add Custom Station Override
              </h4>

              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  placeholder="Station (e.g. LGA, SFO)"
                  maxLength={4}
                  value={newStation}
                  onChange={(e) => setNewStation(e.target.value)}
                  className="flex-1 bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono font-bold uppercase text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-600"
                />
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={10}
                    max={180}
                    value={newMinutes}
                    onChange={(e) => setNewMinutes(Number(e.target.value) || 40)}
                    className="w-24 bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 text-center focus:outline-none focus:border-indigo-600"
                  />
                  <span className="text-xs font-bold text-slate-600">mins</span>
                </div>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition cursor-pointer shrink-0 shadow-sm"
                >
                  Add Station
                </button>
              </div>
            </form>
          </div>

          {/* Operational Buffers */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-3">
              <h4 className="text-xs font-bold text-slate-900">Fallback Station Turn Limit</h4>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={10}
                  max={180}
                  value={defaultTurnLimit}
                  onChange={(e) => {
                    setDefaultTurnLimit(Number(e.target.value) || 40);
                    triggerToast("Fallback turn limit updated");
                  }}
                  className="w-24 bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 text-center focus:outline-none focus:border-indigo-600"
                />
                <span className="text-xs font-bold text-slate-600">minutes</span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium">Used for unconfigured airports</p>
            </div>

            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-3">
              <h4 className="text-xs font-bold text-slate-900">Report Check-in Buffer</h4>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={15}
                  max={120}
                  value={payRates.reportBufferMins || 45}
                  onChange={(e) => {
                    setPayRates({ reportBufferMins: Number(e.target.value) || 45 });
                    triggerToast("Report buffer updated");
                  }}
                  className="w-24 bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 text-center focus:outline-none focus:border-indigo-600"
                />
                <span className="text-xs font-bold text-slate-600">minutes</span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium">Report time prior to first flight departure</p>
            </div>

            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-3">
              <h4 className="text-xs font-bold text-slate-900">Release Check-out Buffer</h4>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={10}
                  max={60}
                  value={payRates.releaseBufferMins || 15}
                  onChange={(e) => {
                    setPayRates({ releaseBufferMins: Number(e.target.value) || 15 });
                    triggerToast("Release buffer updated");
                  }}
                  className="w-24 bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 text-center focus:outline-none focus:border-indigo-600"
                />
                <span className="text-xs font-bold text-slate-600">minutes</span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium">Release buffer added after last flight block-in</p>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 5: OPEN TIME PRESET MANAGER */}
      {activeSection === "presets" && (
        <div className="space-y-6 animate-fadeIn">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 md:p-8 shadow-sm space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <SlidersHorizontal className="w-6 h-6 text-purple-600" />
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">Open Time Marketplace Filter Presets Studio</h3>
                  <p className="text-xs text-slate-500 font-medium">Create and manage custom filtering presets for Open Time pickups (e.g. Turns &gt; 3.0h Credit)</p>
                </div>
              </div>
            </div>

            {/* Presets Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {openPresets.map((p) => {
                const isSelected = activePresetFilter === p.id;
                const isBuiltIn = ["all", "fits", "simulated", "conflicts"].includes(p.id);

                return (
                  <div
                    key={p.id}
                    className={`p-4 rounded-2xl border transition duration-150 flex flex-col justify-between ${
                      isSelected
                        ? "bg-purple-50/80 border-purple-300 ring-2 ring-purple-500/20"
                        : "bg-slate-50 border-slate-200"
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-slate-900">{p.name}</span>
                        {!isBuiltIn && (
                          <button
                            onClick={() => {
                              removeOpenPreset(p.id);
                              triggerToast(`Deleted custom preset: ${p.name}`);
                            }}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded-lg cursor-pointer"
                            title="Delete Preset"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      <div className="text-[11px] text-slate-600 font-mono space-y-0.5">
                        {p.minCreditHours && <div>• Min Credit: <span className="font-bold text-slate-900">{p.minCreditHours} hrs</span></div>}
                        {p.maxCreditHours && <div>• Max Credit: <span className="font-bold text-slate-900">{p.maxCreditHours} hrs</span></div>}
                        {p.maxTripDays && <div>• Trip Days: <span className="font-bold text-slate-900">{p.maxTripDays === 1 ? "1-Day Turn" : `${p.maxTripDays} Days`}</span></div>}
                        {p.reportAfterTime && <div>• Report After: <span className="font-bold text-slate-900">{p.reportAfterTime}</span></div>}
                        {p.reportBeforeTime && <div>• Report Before: <span className="font-bold text-slate-900">{p.reportBeforeTime}</span></div>}
                        {p.releaseBeforeTime && <div>• Release Cap: <span className="font-bold text-slate-900">Before {p.releaseBeforeTime}</span></div>}
                        {p.preferredLayoverCity && <div>• Layover: <span className="font-bold text-indigo-700">{p.preferredLayoverCity}</span></div>}
                        {p.fitsOnly && <div>• Legality: <span className="font-bold text-emerald-700">Fits Schedule Only</span></div>}
                        {p.baseFilter && p.baseFilter !== "ALL" && <div>• Domicile: <span className="font-bold text-slate-900">{p.baseFilter}</span></div>}
                        {isBuiltIn && <div className="text-[10px] text-slate-400 italic">Built-in System Preset</div>}
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        setOpenTimeFilter(p.id);
                        triggerToast(`Activated preset: ${p.name}`);
                      }}
                      className={`mt-4 w-full py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                        isSelected
                          ? "bg-purple-600 text-white shadow-sm"
                          : "bg-white hover:bg-slate-100 text-slate-800 border border-slate-300"
                      }`}
                    >
                      {isSelected ? "Active Preset" : "Set as Active Preset"}
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Create Custom Preset Form */}
            <form
              onSubmit={handleCreateSettingsPreset}
              className="p-5 bg-purple-50/50 border border-purple-200 rounded-2xl space-y-4"
            >
              <h4 className="text-xs font-bold text-purple-950 flex items-center gap-1.5">
                <Plus className="w-4 h-4 text-purple-600" />
                Build Custom Open Time Preference Preset
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-800">Preset Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. ⚡ Morning Turns > 3.5h"
                    value={presetName}
                    onChange={(e) => setPresetName(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-purple-600"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-800">Min Credit (hrs)</label>
                  <input
                    type="number"
                    min={0}
                    step={0.5}
                    placeholder="e.g. 3.5"
                    value={minCredit}
                    onChange={(e) => setMinCredit(e.target.value ? Number(e.target.value) : "")}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-purple-600"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-800">Max Credit (hrs)</label>
                  <input
                    type="number"
                    min={0}
                    step={0.5}
                    placeholder="No Cap"
                    value={maxCredit}
                    onChange={(e) => setMaxCredit(e.target.value ? Number(e.target.value) : "")}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-purple-600"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-800">Trip Duration</label>
                  <select
                    value={maxDays}
                    onChange={(e) => setMaxDays(e.target.value ? Number(e.target.value) : "")}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-purple-600 cursor-pointer"
                  >
                    <option value={1}>1-Day Turns Only</option>
                    <option value={2}>Up to 2 Days</option>
                    <option value={3}>Up to 3 Days</option>
                    <option value={4}>Up to 4 Days</option>
                    <option value="">Any Duration</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-800">Report After Time</label>
                  <input
                    type="text"
                    placeholder="e.g. 06:00 or 0600"
                    value={reportAfterTime}
                    onChange={(e) => setReportAfterTime(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-purple-600"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-800">Report Before Time</label>
                  <input
                    type="text"
                    placeholder="e.g. 11:30 or 1130"
                    value={reportBeforeTime}
                    onChange={(e) => setReportBeforeTime(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-purple-600"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-800">Release Before Time</label>
                  <input
                    type="text"
                    placeholder="e.g. 19:30 or 1930"
                    value={releaseBeforeTime}
                    onChange={(e) => setReleaseBeforeTime(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-purple-600"
                  />
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <label className="text-[11px] font-bold text-slate-800">Layover & Destination Preferences</label>
                  <input
                    type="text"
                    placeholder="Type city/airport codes e.g. MIA, SAN, SFO or TURNS"
                    value={layoverPrefText}
                    onChange={(e) => setLayoverPrefText(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-purple-600"
                  />
                  <span className="text-[10px] text-slate-400 block font-sans font-medium">Type any airport (e.g. MIA, SAN), multiple (MIA, SFO), or TURNS for no layovers</span>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-800">Base Domicile</label>
                  <select
                    value={baseFilter}
                    onChange={(e) => setBaseFilter(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-purple-600 cursor-pointer"
                  >
                    <option value="ALL">All Domiciles</option>
                    <option value="ORD">ORD Domicile</option>
                    <option value="DFW">DFW Domicile</option>
                    <option value="MIA">MIA Domicile</option>
                    <option value="PHX">PHX Domicile</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="settingsFitsOnly"
                    checked={fitsOnly}
                    onChange={(e) => setFitsOnly(e.target.checked)}
                    className="rounded text-purple-600 focus:ring-purple-500 cursor-pointer"
                  />
                  <label htmlFor="settingsFitsOnly" className="text-xs font-bold text-slate-800 cursor-pointer select-none">
                    Fits Schedule Only (0 FAA / Duty Conflicts)
                  </label>
                </div>

                <button
                  type="submit"
                  className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl transition cursor-pointer shadow-sm"
                >
                  Save Preset
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
