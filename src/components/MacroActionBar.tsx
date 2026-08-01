"use client";

import { useState } from "react";
import { PFKeyMacroBuilder } from "../lib/pfKeys";
import { executeMacroSequence } from "../lib/automationEngine";
import { useCrewStore } from "../store/useCrewStore";
import {
  Terminal,
  Zap,
  CheckCircle2,
  Hotel,
  LogOut,
  RefreshCw,
  ShoppingBag,
  ChevronDown,
  ChevronUp,
  X,
  Play,
  Activity,
  Layers,
  Sparkles,
} from "lucide-react";

export default function MacroActionBar() {
  const consoleLogs = useCrewStore((state) => state.consoleLogs);
  const clearConsoleLogs = useCrewStore((state) => state.clearConsoleLogs);
  const sequences = useCrewStore((state) => state.sequences);

  const [isLogOpen, setIsLogOpen] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [activeModal, setActiveModal] = useState<"trade" | "pickup" | null>(null);

  // Trip Trade Modal State
  const [tradeForm, setTradeForm] = useState({
    currentSeq: sequences[0]?.sequenceNumber || "17495",
    currentDate: "27JUL",
    desiredSeq: "21649",
    desiredDate: "29JUL",
    seat: "CA",
  });

  // Open Time Pickup Modal State
  const [pickupForm, setPickupForm] = useState({
    desiredSeq: "21566",
    date: "30JUL",
    seat: "CA",
  });

  // Execute a macro string directly
  const runMacro = async (macroString: string, label: string) => {
    setIsExecuting(true);
    setIsLogOpen(true);
    try {
      await executeMacroSequence(macroString, 350, {
        onStepExecute: () => {},
      });
    } catch (err) {
      console.error(`Macro execution failed for ${label}:`, err);
    } finally {
      setIsExecuting(false);
    }
  };

  // One-Tap Quick Handlers
  const handleFitForDuty = () => {
    const activeSeq = sequences[0];
    const seqNum = activeSeq ? activeSeq.sequenceNumber : "17495";
    const dep = activeSeq ? activeSeq.base : "ORD";
    const macroStr = PFKeyMacroBuilder.fitForDuty(seqNum, "27JUL", dep);
    runMacro(macroStr, "Fit for Duty");
  };

  const handleReserveProffer = () => {
    const macroStr = PFKeyMacroBuilder.profferReserve(["RAP1", "RAP2"]);
    runMacro(macroStr, "Reserve Proffer");
  };

  const handleDallasHotel = () => {
    const macroStr = PFKeyMacroBuilder.commuterHotel("DFW");
    runMacro(macroStr, "Dallas Hotel Request");
  };

  const handleSignOut = () => {
    const macroStr = PFKeyMacroBuilder.signOut();
    runMacro(macroStr, "Sign Out");
  };

  // Submit Handlers for Modals
  const handleTradeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const macroStr = PFKeyMacroBuilder.tripTrade(
      tradeForm.currentSeq,
      tradeForm.currentDate,
      tradeForm.desiredSeq,
      tradeForm.desiredDate,
      tradeForm.seat
    );
    setActiveModal(null);
    runMacro(macroStr, "Trip Trade");
  };

  const handlePickupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const macroStr = PFKeyMacroBuilder.openTimePickup(
      pickupForm.desiredSeq,
      pickupForm.date,
      pickupForm.seat
    );
    setActiveModal(null);
    runMacro(macroStr, "Open Time Pickup");
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 transition-all duration-200 font-sans">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-sky-100 border border-sky-300 text-sky-900">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              DECS Quick-Action Macro Bar
              <span className="px-2 py-0.5 text-[10px] font-black uppercase rounded-md bg-sky-100 text-sky-950 border border-sky-300">
                ^E Engine Ready
              </span>
            </h3>
            <p className="text-xs text-slate-600 font-medium">
              One-tap DECS terminal macro automation & parametric trade execution
            </p>
          </div>
        </div>

        {/* Console Log Toggle */}
        <button
          onClick={() => setIsLogOpen(!isLogOpen)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold transition duration-150 cursor-pointer ${
            isLogOpen
              ? "bg-slate-100 border-slate-300 text-sky-900"
              : "bg-white border-slate-300 text-slate-700 hover:text-slate-900 shadow-sm"
          }`}
        >
          <Terminal className="w-4 h-4 text-sky-600" />
          <span>Live Execution Log ({consoleLogs.length})</span>
          {isLogOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Action Buttons Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5 mt-3">
        {/* Fit For Duty */}
        <button
          onClick={handleFitForDuty}
          disabled={isExecuting}
          className="flex flex-col items-center justify-center p-3 rounded-xl bg-slate-50 border border-slate-200 hover:border-sky-300 hover:bg-sky-50 text-slate-900 transition duration-150 group cursor-pointer disabled:opacity-50 shadow-xs"
        >
          <CheckCircle2 className="w-5 h-5 text-sky-600 group-hover:scale-110 transition duration-150 mb-1" />
          <span className="text-xs font-bold text-slate-900">Fit For Duty</span>
          <span className="text-[9px] text-slate-600 font-mono font-bold">HIFIT/17495</span>
        </button>

        {/* Reserve Proffer */}
        <button
          onClick={handleReserveProffer}
          disabled={isExecuting}
          className="flex flex-col items-center justify-center p-3 rounded-xl bg-slate-50 border border-slate-200 hover:border-amber-300 hover:bg-amber-50 text-slate-900 transition duration-150 group cursor-pointer disabled:opacity-50 shadow-xs"
        >
          <Layers className="w-5 h-5 text-amber-600 group-hover:scale-110 transition duration-150 mb-1" />
          <span className="text-xs font-bold text-slate-900">Reserve Proffer</span>
          <span className="text-[9px] text-slate-600 font-mono font-bold">HI31 RAP 1&2</span>
        </button>

        {/* Dallas Hotel */}
        <button
          onClick={handleDallasHotel}
          disabled={isExecuting}
          className="flex flex-col items-center justify-center p-3 rounded-xl bg-slate-50 border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50 text-slate-900 transition duration-150 group cursor-pointer disabled:opacity-50 shadow-xs"
        >
          <Hotel className="w-5 h-5 text-emerald-600 group-hover:scale-110 transition duration-150 mb-1" />
          <span className="text-xs font-bold text-slate-900">DFW Hotel Req</span>
          <span className="text-[9px] text-slate-600 font-mono font-bold">RF 200DFW</span>
        </button>

        {/* Sign Out */}
        <button
          onClick={handleSignOut}
          disabled={isExecuting}
          className="flex flex-col items-center justify-center p-3 rounded-xl bg-slate-50 border border-slate-200 hover:border-rose-300 hover:bg-rose-50 text-slate-900 transition duration-150 group cursor-pointer disabled:opacity-50 shadow-xs"
        >
          <LogOut className="w-5 h-5 text-rose-600 group-hover:scale-110 transition duration-150 mb-1" />
          <span className="text-xs font-bold text-slate-900">Sign Out</span>
          <span className="text-[9px] text-slate-600 font-mono font-bold">BSO^E</span>
        </button>

        {/* Trip Trade Modal Trigger */}
        <button
          onClick={() => setActiveModal("trade")}
          disabled={isExecuting}
          className="flex flex-col items-center justify-center p-3 rounded-xl bg-slate-50 border border-slate-200 hover:border-cyan-300 hover:bg-cyan-50 text-slate-900 transition duration-150 group cursor-pointer disabled:opacity-50 shadow-xs"
        >
          <RefreshCw className="w-5 h-5 text-cyan-600 group-hover:rotate-45 transition duration-200 mb-1" />
          <span className="text-xs font-bold text-slate-900">Trip Trade</span>
          <span className="text-[9px] text-slate-600 font-mono font-bold">HIY/HTS</span>
        </button>

        {/* Open Time Pickup Trigger */}
        <button
          onClick={() => setActiveModal("pickup")}
          disabled={isExecuting}
          className="flex flex-col items-center justify-center p-3 rounded-xl bg-slate-50 border border-slate-200 hover:border-purple-300 hover:bg-purple-50 text-slate-900 transition duration-150 group cursor-pointer disabled:opacity-50 shadow-xs"
        >
          <ShoppingBag className="w-5 h-5 text-purple-600 group-hover:scale-110 transition duration-150 mb-1" />
          <span className="text-xs font-bold text-slate-900">Open Time Pickup</span>
          <span className="text-[9px] text-slate-600 font-mono font-bold">HTO/B</span>
        </button>
      </div>

      {/* Collapsible Execution Log Drawer */}
      {isLogOpen && (
        <div className="mt-4 p-3 bg-slate-50 rounded-xl border border-slate-200 animate-fadeIn">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200 text-xs">
            <span className="font-mono text-slate-700 font-bold flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-sky-600" /> Terminal Automation Log
            </span>
            <button
              onClick={clearConsoleLogs}
              className="text-[10px] text-slate-500 hover:text-slate-900 underline cursor-pointer font-bold"
            >
              Clear Logs
            </button>
          </div>
          <div className="max-h-40 overflow-y-auto font-mono text-[11px] space-y-1 text-slate-900 font-bold pr-1">
            {consoleLogs.length === 0 ? (
              <p className="text-slate-500 italic font-normal">No terminal logs recorded yet. Run a macro above.</p>
            ) : (
              consoleLogs.map((log, idx) => (
                <div
                  key={idx}
                  className={`py-0.5 px-2 rounded ${
                    log.includes("[ERROR]")
                      ? "bg-rose-100 text-rose-950 border border-rose-300"
                      : log.includes("[SUCCESS]")
                      ? "bg-emerald-100 text-emerald-950 border border-emerald-300"
                      : "bg-white text-slate-900 border border-slate-200"
                  }`}
                >
                  {log}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Trip Trade Parametric Modal */}
      {activeModal === "trade" && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-5 shadow-2xl animate-scaleIn">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h4 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <RefreshCw className="w-5 h-5 text-cyan-600" />
                Parametric Trip Trade Macro
              </h4>
              <button
                onClick={() => setActiveModal(null)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleTradeSubmit} className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Current Seq #</label>
                  <input
                    type="text"
                    value={tradeForm.currentSeq}
                    onChange={(e) => setTradeForm({ ...tradeForm, currentSeq: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 font-mono font-bold"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Current Date</label>
                  <input
                    type="text"
                    value={tradeForm.currentDate}
                    onChange={(e) => setTradeForm({ ...tradeForm, currentDate: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 font-mono font-bold"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Desired Seq #</label>
                  <input
                    type="text"
                    value={tradeForm.desiredSeq}
                    onChange={(e) => setTradeForm({ ...tradeForm, desiredSeq: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 font-mono font-bold"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Desired Date</label>
                  <input
                    type="text"
                    value={tradeForm.desiredDate}
                    onChange={(e) => setTradeForm({ ...tradeForm, desiredDate: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 font-mono font-bold"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Seat Position</label>
                  <select
                    value={tradeForm.seat}
                    onChange={(e) => setTradeForm({ ...tradeForm, seat: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 font-mono font-bold"
                  >
                    <option value="CA">CA (Captain)</option>
                    <option value="FO">FO (First Officer)</option>
                  </select>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-300 text-[11px] font-mono text-cyan-900 font-bold break-all">
                <span className="text-slate-600 font-sans block mb-1 font-extrabold">Generated ^E Command String:</span>
                {PFKeyMacroBuilder.tripTrade(
                  tradeForm.currentSeq,
                  tradeForm.currentDate,
                  tradeForm.desiredSeq,
                  tradeForm.desiredDate,
                  tradeForm.seat
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5 fill-white" />
                  Execute Trade Macro
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Open Time Pickup Parametric Modal */}
      {activeModal === "pickup" && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-5 shadow-2xl animate-scaleIn">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h4 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-purple-600" />
                Parametric Open Time Pickup Macro
              </h4>
              <button
                onClick={() => setActiveModal(null)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handlePickupSubmit} className="space-y-4 mt-4">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Sequence #</label>
                  <input
                    type="text"
                    value={pickupForm.desiredSeq}
                    onChange={(e) => setPickupForm({ ...pickupForm, desiredSeq: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 font-mono font-bold"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Start Date</label>
                  <input
                    type="text"
                    value={pickupForm.date}
                    onChange={(e) => setPickupForm({ ...pickupForm, date: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 font-mono font-bold"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Seat Position</label>
                  <select
                    value={pickupForm.seat}
                    onChange={(e) => setPickupForm({ ...pickupForm, seat: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 font-mono font-bold"
                  >
                    <option value="CA">CA (Captain)</option>
                    <option value="FO">FO (First Officer)</option>
                  </select>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-300 text-[11px] font-mono text-purple-950 font-bold break-all">
                <span className="text-slate-600 font-sans block mb-1 font-extrabold">Generated ^E Command String:</span>
                {PFKeyMacroBuilder.openTimePickup(pickupForm.desiredSeq, pickupForm.date, pickupForm.seat)}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5 fill-white" />
                  Execute Pickup Macro
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
