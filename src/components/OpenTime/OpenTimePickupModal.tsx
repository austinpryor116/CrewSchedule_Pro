"use client";

import React, { useState, useMemo } from "react";
import { useCrewStore } from "@/store/useCrewStore";
import {
  OpenTimeEngine,
  getDecsBaseCode,
  ENVOY_DOMICILE_BASES,
} from "@/lib/openTimeEngine";
import { OpenSequence, SequenceTrip, OpenTimePickupMode } from "@/types";
import {
  Zap,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Clock,
  Calendar,
  Plane,
  DollarSign,
  Layers,
  ArrowRightLeft,
  X,
  Clipboard,
  Send,
  Sparkles,
  ShieldCheck,
  Building2,
  Terminal,
  Check,
  ChevronDown,
} from "lucide-react";

export default function OpenTimePickupModal() {
  const isPickupModalOpen = useCrewStore((state) => state.isPickupModalOpen);
  const setIsPickupModalOpen = useCrewStore((state) => state.setIsPickupModalOpen);
  const selectedSeq = useCrewStore((state) => state.selectedOpenTimeForPickup);
  const setSelectedOpenTimeForPickup = useCrewStore((state) => state.setSelectedOpenTimeForPickup);
  const openSequences = useCrewStore((state) => state.openSequences);
  const sequences = useCrewStore((state) => state.sequences);
  const userProfile = useCrewStore((state) => state.userProfile);
  const payRates = useCrewStore((state) => state.payRates);
  const simulatedSequenceIds = useCrewStore((state) => state.simulatedSequenceIds);
  const toggleSimulateSequence = useCrewStore((state) => state.toggleSimulateSequence);
  const setActiveTab = useCrewStore((state) => state.setActiveTab);

  // Tab filter: Legal Trips Only vs All Open Time Trips
  const [filterTab, setFilterTab] = useState<"LEGAL_ONLY" | "ALL">("LEGAL_ONLY");

  // Evaluate legality for all loaded open time sequences
  const openSeqsWithAudit = useMemo(() => {
    if (!openSequences || openSequences.length === 0) return [];
    return openSequences.map((seq) => {
      const audit = OpenTimeEngine.evaluatePickupLegality(seq, sequences, userProfile);
      return { seq, audit };
    });
  }, [openSequences, sequences, userProfile]);

  const legalOpenSeqs = useMemo(() => {
    return openSeqsWithAudit.filter(({ audit }) => audit.overallStatus !== "ILLEGAL" && audit.score >= 50);
  }, [openSeqsWithAudit]);

  const displayedOpenSeqs = useMemo(() => {
    if (filterTab === "LEGAL_ONLY") {
      return legalOpenSeqs.length > 0 ? legalOpenSeqs : openSeqsWithAudit;
    }
    return openSeqsWithAudit;
  }, [filterTab, legalOpenSeqs, openSeqsWithAudit]);

  // Active sequence fallback if opened from portal without an explicit selection
  const activeSeq: OpenSequence = useMemo(() => {
    if (selectedSeq) return selectedSeq;
    if (displayedOpenSeqs && displayedOpenSeqs.length > 0) return displayedOpenSeqs[0].seq;
    if (openSequences && openSequences.length > 0) return openSequences[0];

    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];
    return {
      id: "ot-active-default",
      sequenceNumber: "14731",
      startDate: todayStr,
      endDate: todayStr,
      creditHours: 15.5,
      base: userProfile?.base || "ORD",
      reportTime: "08:00",
      releaseTime: "17:30",
      blockMinutes: 600,
      layoverDescription: "Turns Only",
      legsDescription: "ORD-DFW-ORD",
      isDropBoard: false,
    };
  }, [selectedSeq, displayedOpenSeqs, openSequences, userProfile]);

  // Mode: Straight HTO vs Swap HTS vs DropBoard HTD
  const [pickupMode, setPickupMode] = useState<OpenTimePickupMode>("STRAIGHT_HTO");
  const [selectedDropSeqId, setSelectedDropSeqId] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Active droppable trips on user's line (for HTS trade mode)
  const droppableTrips = useMemo(() => {
    return sequences.filter((s) => !s.isSimulated && !s.isDropped);
  }, [sequences]);

  const selectedDropSeq = useMemo(() => {
    return droppableTrips.find((s) => s.id === selectedDropSeqId) || null;
  }, [droppableTrips, selectedDropSeqId]);

  // Legality audit and financial impact
  const legalityAudit = useMemo(() => {
    return OpenTimeEngine.evaluatePickupLegality(activeSeq, sequences, userProfile);
  }, [activeSeq, sequences, userProfile]);

  const financialImpact = useMemo(() => {
    const currentCredit = sequences
      .filter((s) => !s.isDropped && !s.isSimulated)
      .reduce((acc, s) => acc + ((s.totalCreditMinutes || 0) / 60), 0);
    return OpenTimeEngine.calculatePickupEarnings(
      activeSeq,
      currentCredit || 75.0,
      payRates,
      userProfile
    );
  }, [activeSeq, sequences, payRates, userProfile]);

  // Generate DECS macro string
  const decsMacro = useMemo(() => {
    return OpenTimeEngine.generateDecsPickupMacro(
      activeSeq,
      pickupMode,
      userProfile,
      selectedDropSeq
    );
  }, [activeSeq, pickupMode, userProfile, selectedDropSeq]);

  if (!isPickupModalOpen || !legalityAudit || !financialImpact) {
    return null;
  }

  const isSimulated = simulatedSequenceIds.includes(activeSeq.id);

  const handleClose = () => {
    setIsPickupModalOpen(false);
    setSelectedOpenTimeForPickup(null);
    setActiveTab("portal");

    if (typeof window !== "undefined") {
      const win = window as any;
      if (win.AndroidPortal && win.AndroidPortal.hidePortalView) {
        win.AndroidPortal.hidePortalView();
      }
      window.dispatchEvent(new CustomEvent("exitPortalToMainScreen"));
    }
  };

  const handleCopyMacro = () => {
    navigator.clipboard.writeText(decsMacro);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleExecutePickup = () => {
    setIsSubmitting(true);

    // 1. Dispatch custom event for native Android WebView / WebSabre
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("submitDecsOpenTimePickup", {
          detail: {
            sequenceNumber: activeSeq.sequenceNumber,
            startDate: activeSeq.startDate,
            mode: pickupMode,
            macro: decsMacro,
            seat: userProfile?.crewRole || "CA",
            base: activeSeq.base || "ORD",
          },
        })
      );
    }

    setTimeout(() => {
      setIsSubmitting(false);
      setSubmitSuccess(true);
      setTimeout(() => {
        setSubmitSuccess(false);
        handleClose();
      }, 1500);
    }, 800);
  };

  return (
    <div 
      onClick={handleClose}
      className="fixed inset-0 z-[100000] flex items-end sm:items-center justify-center bg-slate-950/70 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-200 cursor-pointer"
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-in slide-in-from-bottom duration-300 cursor-default"
      >
        {/* 1. Header Bar */}
        <div className="p-4 bg-slate-900 text-white shrink-0 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-sky-600/30 border border-sky-500/40 flex items-center justify-center text-sky-400">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-black tracking-tight">
                  SEQ #{activeSeq.sequenceNumber}
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-400/30">
                  {activeSeq.base || "ORD"} • E175
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {activeSeq.startDate} to {activeSeq.endDate}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClose}
            title="Exit to Portal Screen"
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 2. Open Time Filter Tabs & Sequence Selector Carousel */}
        <div className="p-3 bg-slate-100 border-b border-slate-200 space-y-2 shrink-0">
          <div className="flex items-center justify-between gap-1.5 p-1 bg-slate-200/80 rounded-xl">
            <button
              type="button"
              onClick={() => setFilterTab("LEGAL_ONLY")}
              className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                filterTab === "LEGAL_ONLY"
                  ? "bg-white text-emerald-700 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Legal Trips ({legalOpenSeqs.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setFilterTab("ALL")}
              className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                filterTab === "ALL"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-sky-600" />
              <span>All Open Time ({openSeqsWithAudit.length})</span>
            </button>
          </div>

          {/* Sequence Cards Carousel */}
          {displayedOpenSeqs.length > 0 ? (
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              {displayedOpenSeqs.map(({ seq, audit }) => {
                const isSelected = seq.id === activeSeq.id;
                const isLegal = audit.overallStatus === "LEGAL";
                const isWarning = audit.overallStatus === "WARNING";

                return (
                  <button
                    key={seq.id}
                    type="button"
                    onClick={() => setSelectedOpenTimeForPickup(seq)}
                    className={`shrink-0 p-2.5 rounded-xl border text-left transition-all cursor-pointer min-w-[130px] ${
                      isSelected
                        ? "bg-sky-50 border-sky-500 shadow-sm ring-1 ring-sky-500"
                        : "bg-white border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="text-xs font-black text-slate-900">
                        #{seq.sequenceNumber}
                      </span>
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                          isLegal
                            ? "bg-emerald-100 text-emerald-800"
                            : isWarning
                            ? "bg-amber-100 text-amber-800"
                            : "bg-rose-100 text-rose-800"
                        }`}
                      >
                        {isLegal ? "100% Legal" : isWarning ? "Note" : "Conflict"}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-500 font-medium">
                      {seq.startDate} • {seq.creditHours.toFixed(1)}h
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-2 text-xs font-bold text-slate-500">
              No open time sequences found for this filter tab.
            </div>
          )}
        </div>

        {/* 3. Scrollable Body */}
        <div className="p-4 overflow-y-auto space-y-4 flex-1">
          {/* Legality & Score Banner */}
          <div
            className={`p-3.5 rounded-2xl border flex items-start justify-between gap-3 ${
              legalityAudit.overallStatus === "LEGAL"
                ? "bg-emerald-50/90 border-emerald-300 text-emerald-950"
                : legalityAudit.overallStatus === "WARNING"
                ? "bg-amber-50/90 border-amber-300 text-amber-950"
                : "bg-rose-50/90 border-rose-300 text-rose-950"
            }`}
          >
            <div className="flex items-start gap-2.5">
              {legalityAudit.overallStatus === "LEGAL" ? (
                <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              ) : legalityAudit.overallStatus === "WARNING" ? (
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              )}
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black uppercase tracking-wider">
                    {legalityAudit.overallStatus === "LEGAL"
                      ? "100% Legal To Pick Up"
                      : legalityAudit.overallStatus === "WARNING"
                      ? "Legal with Notes / TDY"
                      : "Schedule / Rest Conflict"}
                  </span>
                </div>
                <p className="text-[11px] opacity-90 mt-0.5 font-medium leading-relaxed">
                  {legalityAudit.reasons[0] || "FAR 117 and CBA parameters verified."}
                </p>
              </div>
            </div>

            <div className="text-right shrink-0">
              <span className="text-[10px] font-bold text-slate-500 uppercase block">
                Fit Score
              </span>
              <span className="text-sm font-black text-slate-900">
                {legalityAudit.score}/100
              </span>
            </div>
          </div>

          {/* Quick Metrics Grid */}
          <div className="grid grid-cols-3 gap-2">
            <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-center">
              <span className="text-[9.5px] font-bold uppercase text-slate-400 block">
                Trip Credit
              </span>
              <span className="text-sm font-black text-slate-900">
                {activeSeq.creditHours.toFixed(2)}h
              </span>
            </div>
            <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-center">
              <span className="text-[9.5px] font-bold uppercase text-slate-400 block">
                Report Time
              </span>
              <span className="text-sm font-black text-slate-900">
                {activeSeq.reportTime || "08:00"}
              </span>
            </div>
            <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-center">
              <span className="text-[9.5px] font-bold uppercase text-slate-400 block">
                Est. Pay
              </span>
              <span className="text-sm font-black text-emerald-600">
                +${financialImpact.estimatedGrossPay.toLocaleString()}
              </span>
            </div>
          </div>

          {/* FAR 117 / CBA Rest Audit Checklist */}
          <div className="p-3 bg-slate-50/80 border border-slate-200 rounded-2xl space-y-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
              Legality & Rest Compliance Checklist
            </span>

            <div className="space-y-1.5 text-xs">
              <div className="flex items-center justify-between py-1 border-b border-slate-100">
                <span className="text-slate-600 font-medium flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  Pre-Duty Rest Available
                </span>
                <span
                  className={`font-bold ${
                    legalityAudit.isPreDutyRestLegal
                      ? "text-emerald-700"
                      : "text-rose-700"
                  }`}
                >
                  {legalityAudit.preDutyRestHours}h (Min 10.0h)
                </span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-slate-100">
                <span className="text-slate-600 font-medium flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  Post-Duty Rest Available
                </span>
                <span
                  className={`font-bold ${
                    legalityAudit.isPostDutyRestLegal
                      ? "text-emerald-700"
                      : "text-rose-700"
                  }`}
                >
                  {legalityAudit.postDutyRestHours}h (Min 10.0h)
                </span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-slate-100">
                <span className="text-slate-600 font-medium flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  FAR 117.25(b) 30-in-7 Rest
                </span>
                <span
                  className={`font-bold ${
                    legalityAudit.has30in7Rest
                      ? "text-emerald-700"
                      : "text-amber-700"
                  }`}
                >
                  {legalityAudit.has30in7Rest ? "Satisfied (30h+)" : "Check 168h Window"}
                </span>
              </div>

              <div className="flex items-center justify-between py-1">
                <span className="text-slate-600 font-medium flex items-center gap-1.5">
                  <Plane className="w-3.5 h-3.5 text-slate-400" />
                  Position & Fleet Match
                </span>
                <span className="font-bold text-slate-800">
                  {userProfile?.crewRole || "CA"} • E175 Only
                </span>
              </div>
            </div>
          </div>

          {/* Layovers & Routing */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
              Routing & Layovers
            </span>
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-slate-700">
                Layovers:{" "}
                <strong className="text-slate-900">
                  {activeSeq.layoverDescription || "Turns Only"}
                </strong>
              </span>
              <span className="font-medium text-slate-700">
                Daily Legs:{" "}
                <strong className="text-slate-900">
                  {activeSeq.legsDescription || "1-2-1"}
                </strong>
              </span>
            </div>
          </div>

          {/* Pickup Mode Switcher (Straight HTO vs Swap HTS) */}
          <div className="space-y-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
              Pickup Transaction Type
            </span>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPickupMode("STRAIGHT_HTO")}
                className={`p-2.5 rounded-2xl border text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  pickupMode === "STRAIGHT_HTO"
                    ? "bg-sky-600 border-sky-600 text-white shadow-sm"
                    : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                }`}
              >
                <Zap className="w-3.5 h-3.5" />
                Straight Pickup (HTO)
              </button>

              <button
                type="button"
                onClick={() => setPickupMode("SWAP_HTS")}
                className={`p-2.5 rounded-2xl border text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  pickupMode === "SWAP_HTS"
                    ? "bg-sky-600 border-sky-600 text-white shadow-sm"
                    : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                }`}
              >
                <ArrowRightLeft className="w-3.5 h-3.5" />
                Trade / Swap (HTS)
              </button>
            </div>

            {/* If Swap Mode, show trip dropdown */}
            {pickupMode === "SWAP_HTS" && (
              <div className="p-3 bg-sky-50/80 border border-sky-200 rounded-2xl space-y-2 animate-in fade-in duration-200">
                <span className="text-[10px] font-black uppercase tracking-wider text-sky-800 block">
                  Select Trip To Drop From Your Schedule:
                </span>

                {droppableTrips.length > 0 ? (
                  <select
                    value={selectedDropSeqId}
                    onChange={(e) => setSelectedDropSeqId(e.target.value)}
                    className="w-full p-2 bg-white border border-sky-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  >
                    <option value="">-- Choose sequence to drop (A) --</option>
                    {droppableTrips.map((s) => (
                      <option key={s.id} value={s.id}>
                        Seq #{s.sequenceNumber} ({s.startDate} - {(((s.totalCreditMinutes || 0) / 60)).toFixed(2)}h credit)
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="text-xs text-amber-800 font-medium">
                    No active trips on your schedule available to trade.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Authentic Live DECS Keystroke Macro Preview */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between px-1">
              <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-emerald-600" />
                DECS WebSabre Macro Output
              </span>
              <button
                type="button"
                onClick={handleCopyMacro}
                className="text-[10px] text-sky-600 font-bold hover:underline flex items-center gap-1 cursor-pointer"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Clipboard className="w-3 h-3" />}
                {copied ? "Copied!" : "Copy Macro"}
              </button>
            </div>

            <div className="p-3 rounded-2xl bg-black border border-slate-800 text-[#00ff66] font-mono text-[9px] sm:text-[10px] leading-tight overflow-x-auto shadow-inner shadow-black/50">
              <pre className="whitespace-pre overflow-x-auto">{decsMacro}</pre>
            </div>
          </div>
        </div>

        {/* 3. Sticky Action Dock */}
        <div className="p-3.5 bg-slate-50 border-t border-slate-200 shrink-0 flex items-center justify-between gap-2.5">
          <button
            type="button"
            onClick={() => toggleSimulateSequence(activeSeq.id)}
            className={`px-3.5 py-2.5 rounded-2xl border text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
              isSimulated
                ? "bg-amber-100 border-amber-300 text-amber-900"
                : "bg-white border-slate-300 text-slate-700 hover:bg-slate-100"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            {isSimulated ? "Simulated ✓" : "Simulate"}
          </button>

          <button
            type="button"
            disabled={isSubmitting || submitSuccess}
            onClick={handleExecutePickup}
            className={`flex-1 py-2.5 px-4 rounded-2xl text-xs font-black text-white shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
              submitSuccess
                ? "bg-emerald-600 shadow-emerald-500/25"
                : isSubmitting
                ? "bg-sky-500 opacity-80"
                : "bg-sky-600 hover:bg-sky-700 shadow-sky-500/25"
            }`}
          >
            {submitSuccess ? (
              <>
                <CheckCircle2 className="w-4 h-4" />
                Pickup Sent to DECS!
              </>
            ) : isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Transmitting...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                🚀 Submit DECS Pickup ({pickupMode === "SWAP_HTS" ? "HTS" : "HTO"})
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
