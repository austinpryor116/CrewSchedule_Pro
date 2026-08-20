"use client";

import { useState, useMemo } from "react";
import { useCrewStore } from "@/store/useCrewStore";
import {
  Building2,
  Calendar,
  User,
  Hash,
  X,
  CheckCircle2,
  Clipboard,
  Send,
  AlertTriangle,
  Sparkles,
  Bed,
  Check,
  Terminal,
} from "lucide-react";

interface HotelRequestModalProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export type HotelReasonType =
  | "COMMUTER"
  | "LOST_OVERNIGHT"
  | "CRITICAL_COVERAGE"
  | "SP_REMOVAL"
  | "CANCEL";

const ENVOY_BASES = ["ORD", "DFW", "MIA", "PHX"];

export default function HotelRequestModal({
  isOpen = true,
  onClose,
}: HotelRequestModalProps) {
  const isHotelRequestModalOpen = useCrewStore((state) => state.isHotelRequestModalOpen);
  const setIsHotelRequestModalOpen = useCrewStore((state) => state.setIsHotelRequestModalOpen);
  const userProfile = useCrewStore((state) => state.userProfile);

  const shouldShow = isOpen && isHotelRequestModalOpen;

  // Initialize with current date
  const today = new Date();
  const defaultMonth = String(today.getMonth() + 1).padStart(2, "0");
  const defaultDay = String(today.getDate()).padStart(2, "0");

  const [selectedBase, setSelectedBase] = useState<string>(userProfile?.base || "ORD");
  const [layoverMonth, setLayoverMonth] = useState<string>(defaultMonth);
  const [layoverDay, setLayoverDay] = useState<string>(defaultDay);
  const [selectedReason, setSelectedReason] = useState<HotelReasonType>("COMMUTER");
  const [copied, setCopied] = useState(false);
  const [sentSuccess, setSentSuccess] = useState(false);

  const crewName = (userProfile?.name || "AUSTIN PRYOR").toUpperCase();
  const empId = userProfile?.employeeId || "742840";

  // Generate formatted DECS Green Screen Mockup
  const baseChar = selectedBase === "DFW" ? "D" : selectedBase === "MIA" ? "M" : selectedBase === "PHX" ? "P" : "C";

  const decsScreenText = useMemo(() => {
    const padName = (crewName + ".........................").slice(0, 17);
    const padEmp = (empId + ".........................").slice(0, 11);
    const m = layoverMonth.padStart(2, "0");
    const d = layoverDay.padStart(2, "0");

    const optCommuter = selectedReason === "COMMUTER" ? "<XXXXX" : "<.....";
    const optLost = selectedReason === "LOST_OVERNIGHT" ? "<XXXXX" : "<.....";
    const optCrit = selectedReason === "CRITICAL_COVERAGE" ? "<XXXXX" : "<.....";
    const optSp = selectedReason === "SP_REMOVAL" ? "<XXXXX" : "<.....";
    const optCancel = selectedReason === "CANCEL" ? "<XXXXX" : "<.....";

    return [
      "IN PERSONAL MODE",
      "MAKE HI6 OR HI6A ENTRY",
      "",
      `RF 200${baseChar} HTL`,
      `RF 200${baseChar} HTL`,
      "HI0/HTL2/02ET/52AE/60AE/HTL3/MAE2/34AE/33AE/ES03/49AE/PHX1",
      "*****************************************************************",
      "*                  CREW HOTEL REQUEST IN BASE                   *",
      "*****************************************************************",
      `*NAME <${padName}       EMP#<${padEmp}                 *`,
      "*                                                               *",
      `*LAYOVER  ${selectedBase.padEnd(3, " ")}          LAYOVER DATE <${m}/<${d}                     *`,
      "*                                                               *",
      `*${optCommuter}  COMMUTER HOTEL (1500 CHECK IN 1200 CHECK OUT)          *`,
      `*${optLost}  HOTEL DUE TO LOST OVERNIGHT FLYING                     *`,
      `*${optCrit}  HOTEL DURING PUBLISHED CRITICAL COVERAGE (OT ONLY)     *`,
      `*${optSp}  SP REMOVAL                                             *`,
      "*********NO SPECIAL REQUESTS FOR SPECIFIC HOTEL******************",
      `*${optCancel}  CANCEL HOTEL <■                                        *`,
    ].join("\n");
  }, [crewName, empId, selectedBase, baseChar, layoverMonth, layoverDay, selectedReason]);

  if (!shouldShow) return null;

  const handleClose = () => {
    setIsHotelRequestModalOpen(false);
    if (onClose) onClose();
  };

  const handleCopyDecs = () => {
    navigator.clipboard.writeText(decsScreenText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleSendToDecs = () => {
    // 1. Dispatch custom event for webview / native terminal
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("submitDecsHotelRequest", {
          detail: {
            base: selectedBase,
            baseChar,
            command: `RF 200${baseChar} HTL^`,
            month: layoverMonth,
            day: layoverDay,
            reason: selectedReason,
            rawDecs: decsScreenText,
          },
        })
      );
    }

    setSentSuccess(true);
    setTimeout(() => {
      setSentSuccess(false);
      handleClose();
    }, 1200);
  };

  const reasons = [
    {
      id: "COMMUTER" as HotelReasonType,
      label: "COMMUTER HOTEL",
      sub: "1500 Check-In / 1200 Check-Out",
      tag: "CBA Sec 5",
      color: "border-sky-500 bg-sky-50 text-sky-900",
    },
    {
      id: "LOST_OVERNIGHT" as HotelReasonType,
      label: "HOTEL DUE TO LOST OVERNIGHT FLYING",
      sub: "Re-route or cancellation overnight provision",
      tag: "Irreg Ops",
      color: "border-amber-500 bg-amber-50 text-amber-900",
    },
    {
      id: "CRITICAL_COVERAGE" as HotelReasonType,
      label: "HOTEL DURING PUBLISHED CRITICAL COVERAGE",
      sub: "Open Time critical coverage pickup only",
      tag: "OT Only",
      color: "border-indigo-500 bg-indigo-50 text-indigo-900",
    },
    {
      id: "SP_REMOVAL" as HotelReasonType,
      label: "SP REMOVAL",
      sub: "Special Project removal overnight accommodation",
      tag: "Removal",
      color: "border-purple-500 bg-purple-50 text-purple-900",
    },
    {
      id: "CANCEL" as HotelReasonType,
      label: "CANCEL HOTEL",
      sub: "Cancel previously requested in-base hotel",
      tag: "Cancellation",
      color: "border-rose-500 bg-rose-50 text-rose-900",
    },
  ];

  return (
    <div className="fixed inset-0 z-[100001] flex items-center justify-center p-3 bg-slate-950/80 backdrop-blur-sm animate-fadeIn select-none">
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-scaleUp">
        {/* 1. Header */}
        <div className="px-4 py-3.5 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center shadow-md">
              <Bed className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xs font-black tracking-tight text-white flex items-center gap-1.5">
                CREW HOTEL REQUEST IN BASE
                <span className="text-[9px] px-1.5 py-0.2 bg-emerald-500/20 text-emerald-300 font-mono font-bold rounded">
                  DECS HTL
                </span>
              </h2>
              <p className="text-[10px] text-slate-400 font-medium">
                Envoy Air In-Base & Commuter Hotel Requisition
              </p>
            </div>
          </div>

          <button
            onClick={handleClose}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer active-press"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 2. Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-slate-800">
          {/* Crew Info Pre-filled Pill */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between text-xs font-mono">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-sky-600 shrink-0" />
              <div>
                <span className="text-[9px] text-slate-400 block font-sans font-bold">NAME</span>
                <span className="font-black text-slate-900">{crewName}</span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[9px] text-slate-400 block font-sans font-bold">EMP #</span>
              <span className="font-black text-slate-900">{empId}</span>
            </div>
          </div>

          {/* Layover Base & Layover Date Selectors */}
          <div className="grid grid-cols-2 gap-3">
            {/* Layover Base */}
            <div className="p-3 bg-white border border-slate-200 rounded-2xl shadow-2xs space-y-1.5">
              <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-sky-600" />
                Layover Base
              </label>
              <div className="grid grid-cols-2 gap-1">
                {ENVOY_BASES.map((b) => (
                  <button
                    key={b}
                    type="button"
                    onClick={() => setSelectedBase(b)}
                    className={`py-1.5 px-2 rounded-xl text-xs font-mono font-black border transition cursor-pointer active-press ${
                      selectedBase === b
                        ? "bg-sky-600 text-white border-sky-600 shadow-xs"
                        : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    {b}
                  </button>
                ))}
              </div>
            </div>

            {/* Layover Date (Month / Day) */}
            <div className="p-3 bg-white border border-slate-200 rounded-2xl shadow-2xs space-y-1.5">
              <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-sky-600" />
                Layover Date
              </label>
              <div className="flex items-center gap-1.5">
                <div className="flex-1 space-y-0.5">
                  <span className="text-[9px] text-slate-400 font-bold block">MONTH</span>
                  <input
                    type="number"
                    min="1"
                    max="12"
                    value={layoverMonth}
                    onChange={(e) => setLayoverMonth(e.target.value.padStart(2, "0").slice(-2))}
                    className="w-full p-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-center text-slate-900 focus:outline-none focus:bg-white focus:border-sky-600"
                  />
                </div>
                <span className="text-slate-400 font-black text-sm pt-3">/</span>
                <div className="flex-1 space-y-0.5">
                  <span className="text-[9px] text-slate-400 font-bold block">DAY</span>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={layoverDay}
                    onChange={(e) => setLayoverDay(e.target.value.padStart(2, "0").slice(-2))}
                    className="w-full p-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-center text-slate-900 focus:outline-none focus:bg-white focus:border-sky-600"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Hotel Request Reason Options */}
          <div className="space-y-2">
            <label className="text-[11px] font-extrabold uppercase text-slate-500 tracking-wider px-1 block">
              Select Request Type (Choose One)
            </label>
            <div className="space-y-1.5">
              {reasons.map((r) => {
                const isSelected = selectedReason === r.id;
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setSelectedReason(r.id)}
                    className={`w-full p-3 rounded-2xl border text-left transition cursor-pointer active-press flex items-center justify-between ${
                      isSelected
                        ? `${r.color} border-2 shadow-xs ring-2 ring-sky-500/20`
                        : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300"
                    }`}
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black tracking-tight">{r.label}</span>
                        <span className="text-[9px] font-bold px-1.5 py-0.2 bg-white/80 border border-slate-200 rounded text-slate-600">
                          {r.tag}
                        </span>
                      </div>
                      <p className="text-[10.5px] opacity-80 font-medium">{r.sub}</p>
                    </div>

                    <div
                      className={`w-5 h-5 rounded-full flex items-center justify-center border shrink-0 ${
                        isSelected
                          ? "bg-sky-600 border-sky-600 text-white"
                          : "border-slate-300 bg-slate-50"
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Notice Policy Banner */}
          <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-2xl flex items-start gap-2.5 text-xs text-amber-900">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-black text-[11px] block">NO SPECIAL REQUESTS FOR SPECIFIC HOTEL</span>
              <p className="text-[10px] text-amber-800 leading-relaxed">
                Hotel assignments in base are contracted under company allotment standards.
              </p>
            </div>
          </div>

          {/* Authentic Live DECS 3270 Green Terminal Preview */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between px-1">
              <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-emerald-600" />
                Live DECS Screen Output
              </span>
              <button
                type="button"
                onClick={handleCopyDecs}
                className="text-[10px] text-sky-600 font-bold hover:underline flex items-center gap-1 cursor-pointer"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Clipboard className="w-3 h-3" />}
                {copied ? "Copied!" : "Copy DECS Text"}
              </button>
            </div>

            <div className="p-3 rounded-2xl bg-black border border-slate-800 text-[#00ff66] font-mono text-[8.5px] sm:text-[9.5px] leading-tight overflow-x-auto shadow-inner shadow-black/50">
              <pre className="whitespace-pre overflow-x-auto">{decsScreenText}</pre>
            </div>
          </div>
        </div>

        {/* 3. Bottom Action Dock */}
        <div className="p-3.5 bg-slate-50 border-t border-slate-200 shrink-0 flex items-center justify-between gap-2.5">
          <button
            type="button"
            onClick={handleCopyDecs}
            className="py-2.5 px-3.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold flex items-center gap-1.5 active-press transition cursor-pointer shadow-2xs"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Clipboard className="w-4 h-4" />}
            {copied ? "Copied" : "Copy Form"}
          </button>

          <button
            type="button"
            disabled={sentSuccess}
            onClick={handleSendToDecs}
            className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 shadow-md active-press transition cursor-pointer ${
              sentSuccess
                ? "bg-emerald-600 text-white shadow-emerald-600/30"
                : "bg-sky-600 hover:bg-sky-500 text-white shadow-sky-600/25"
            }`}
          >
            {sentSuccess ? (
              <>
                <Check className="w-4 h-4 text-white stroke-[3]" />
                Sent to DECS!
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Submit Request in DECS
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
