"use client";

import { useState } from "react";
import { useCrewStore } from "../../store/useCrewStore";
import { parseRawSchedule, parseN4OpenTime } from "../../lib/parser";
import { RAW_DEMO_TEXT, RAW_HI1_TEXT, RAW_N4_TEXT } from "../../lib/demoData";
import { Clipboard, Play, AlertCircle, FileText, CheckCircle2, RotateCcw, HelpCircle, Eye, Calendar } from "lucide-react";

export default function ParserStudio() {
  const [parseMode, setParseMode] = useState<"roster" | "opentime">("roster");
  const [inputText, setInputText] = useState("");
  const [parsedOutput, setParsedOutput] = useState<any[]>([]);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [clearRosterFirst, setClearRosterFirst] = useState(true);

  const addSequences = useCrewStore((state) => state.addSequences);
  const clearAll = useCrewStore((state) => state.clearAll);
  const setOpenSequences = useCrewStore((state) => state.setOpenSequences);
  const setActiveTab = useCrewStore((state) => state.setActiveTab);

  const handleParse = () => {
    setErrorMsg("");
    setSuccessMsg("");
    if (!inputText.trim()) {
      setErrorMsg("Please paste some monospace schedule text first.");
      return;
    }

    try {
      if (parseMode === "roster") {
        const results = parseRawSchedule(inputText);
        if (results.length === 0) {
          setErrorMsg("Could not parse any sequences. Check the format or try the Demo data.");
          setParsedOutput([]);
        } else {
          setParsedOutput(results);
          setSuccessMsg(`Successfully parsed ${results.length} active sequence(s)!`);
        }
      } else {
        const results = parseN4OpenTime(inputText);
        if (results.length === 0) {
          setErrorMsg("Could not parse any open sequences. Check the format or try the N4 sample data.");
          setParsedOutput([]);
        } else {
          setParsedOutput(results);
          setSuccessMsg(`Successfully parsed ${results.length} open sequence(s)!`);
        }
      }
    } catch (e: any) {
      setErrorMsg(`Parsing failed: ${e.message || e}`);
      setParsedOutput([]);
    }
  };

  const handleImport = () => {
    if (parsedOutput.length === 0) return;
    
    if (parseMode === "roster") {
      if (clearRosterFirst) {
        clearAll();
      }
      addSequences(parsedOutput);
      setSuccessMsg(`Imported ${parsedOutput.length} sequence(s) to your active schedule.`);
    } else {
      setOpenSequences(parsedOutput);
      setSuccessMsg(`Imported ${parsedOutput.length} open sequences for Calendar Overlay!`);
    }

    setTimeout(() => {
      setActiveTab("calendar");
    }, 1000);
  };

  const loadDemoText = () => {
    setInputText(RAW_DEMO_TEXT.trim());
    setErrorMsg("");
    setSuccessMsg("");
  };

  const loadHI1Text = () => {
    setInputText(RAW_HI1_TEXT.trim());
    setErrorMsg("");
    setSuccessMsg("");
  };

  const loadN4Text = () => {
    setInputText(RAW_N4_TEXT.trim());
    setErrorMsg("");
    setSuccessMsg("");
  };

  const handleClear = () => {
    setInputText("");
    setParsedOutput([]);
    setErrorMsg("");
    setSuccessMsg("");
  };

  const switchMode = (mode: "roster" | "opentime") => {
    setParseMode(mode);
    setParsedOutput([]);
    setInputText("");
    setErrorMsg("");
    setSuccessMsg("");
  };

  return (
    <div className="space-y-6 animate-fadeIn font-sans">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-slate-800">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            Terminal OCR & Log Parser Studio
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Import raw monospace terminal sheets, roster logs, or N4 Open Time documents to populate scheduling grids.
          </p>
        </div>
        <div className="mt-4 md:mt-0 flex gap-3 flex-wrap">
          {parseMode === "roster" ? (
            <>
              <button
                onClick={loadDemoText}
                className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-slate-600 rounded-xl transition duration-200 text-sm font-semibold shadow-lg shadow-slate-950/20"
              >
                <FileText className="w-4 h-4 text-indigo-400" />
                Load Sample Terminal Text
              </button>
              <button
                onClick={loadHI1Text}
                className="flex items-center gap-2 px-4 py-2 bg-slate-850 hover:bg-slate-800 text-slate-200 border border-slate-800 hover:border-slate-700 rounded-xl transition duration-200 text-sm font-semibold shadow-lg shadow-slate-950/20"
              >
                <FileText className="w-4 h-4 text-emerald-400" />
                Load HI1 Roster Log
              </button>
            </>
          ) : (
            <button
              onClick={loadN4Text}
              className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-slate-600 rounded-xl transition duration-200 text-sm font-semibold shadow-lg shadow-slate-950/20"
            >
              <FileText className="w-4 h-4 text-amber-400" />
              Load N4 Open Time Log
            </button>
          )}
          <button
            onClick={handleClear}
            className="flex items-center gap-2 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-300 border border-slate-800 rounded-xl transition duration-200 text-sm font-semibold"
          >
            <RotateCcw className="w-4 h-4" />
            Clear
          </button>
        </div>
      </div>

      {/* Parse Mode Switcher */}
      <div className="flex bg-slate-900 p-1.5 rounded-2xl border border-slate-800 max-w-sm text-xs font-semibold">
        <button
          onClick={() => switchMode("roster")}
          className={`flex-1 py-2 rounded-xl transition duration-150 ${
            parseMode === "roster" ? "bg-indigo-600 text-white shadow" : "text-slate-400 hover:text-slate-200"
          }`}
        >
          Parse Roster Schedule
        </button>
        <button
          onClick={() => switchMode("opentime")}
          className={`flex-1 py-2 rounded-xl transition duration-150 ${
            parseMode === "opentime" ? "bg-indigo-600 text-white shadow" : "text-slate-400 hover:text-slate-200"
          }`}
        >
          Parse Open Time (N4)
        </button>
      </div>

      {/* Parser Workspace */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Input Panel */}
        <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-2xl p-6 shadow-xl flex flex-col h-[600px]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-200 flex items-center gap-2">
              <Clipboard className="w-5 h-5 text-indigo-400" />
              Raw Monospace Input
            </h2>
            <span className="text-xs text-slate-500 font-mono">Monospace Terminal Output</span>
          </div>

          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={
              parseMode === "roster"
                ? "Paste raw active schedule log text here..."
                : "Paste raw N4 Open Time log text here..."
            }
            className="w-full flex-grow bg-slate-950/80 border border-slate-800/80 focus:border-indigo-500/80 focus:ring-1 focus:ring-indigo-500/80 rounded-xl p-4 text-slate-300 font-mono text-xs leading-relaxed resize-none focus:outline-none transition duration-150 scrollbar-thin"
          />

          <div className="mt-4 flex items-center justify-between">
            <span className="text-xs text-slate-500">
              {inputText.length > 0 ? `${inputText.split("\n").length} lines` : "Empty input"}
            </span>
            <button
              onClick={handleParse}
              className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white rounded-xl font-bold shadow-lg shadow-indigo-500/10 hover:shadow-indigo-500/20 active:scale-95 transition-all text-sm"
            >
              <Play className="w-4 h-4 fill-white" />
              Parse Terminal Output
            </button>
          </div>
        </div>

        {/* Output Panel */}
        <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-2xl p-6 shadow-xl flex flex-col h-[600px]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-200 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              Parsed Structured Results
            </h2>
            <span className="text-xs text-slate-500 font-mono">Parsed Records</span>
          </div>

          <div className="flex-grow bg-slate-950/80 border border-slate-800/80 rounded-xl p-4 overflow-y-auto scrollbar-thin flex flex-col">
            {errorMsg && (
              <div className="flex items-start gap-3 p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-sm mb-4">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold">Parsing Error</h4>
                  <p className="mt-0.5 text-xs text-rose-400/90">{errorMsg}</p>
                </div>
              </div>
            )}

            {successMsg && (
              <div className="flex items-start gap-3 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-sm mb-4">
                <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold">Success</h4>
                  <p className="mt-0.5 text-xs text-emerald-400/90">{successMsg}</p>
                </div>
              </div>
            )}

            {parsedOutput.length > 0 ? (
              <div className="space-y-4 flex-grow">
                {parseMode === "roster" ? (
                  <div className="grid grid-cols-1 gap-3">
                    {parsedOutput.map((seq, idx) => (
                      <div
                        key={seq.id || idx}
                        className="p-4 bg-slate-900/85 border border-slate-800 rounded-xl hover:border-slate-700/80 transition duration-200"
                      >
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm font-bold text-slate-100 flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                            Seq {seq.sequenceNumber}
                          </span>
                          <span className="px-2 py-0.5 bg-indigo-950/80 text-indigo-400 border border-indigo-900/50 rounded font-bold text-xs">
                            {seq.base}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-y-1.5 gap-x-4 text-xs text-slate-400 font-mono">
                          <div>
                            Dates: <span className="text-slate-200 font-bold">{seq.startDate} to {seq.endDate}</span>
                          </div>
                          <div>
                            Block Time: <span className="text-slate-200 font-bold">{(seq.totalBlockMinutes / 60).toFixed(2)} hrs</span>
                          </div>
                          <div>
                            Layovers: <span className="text-slate-200 font-bold">{seq.layoverCities.join(", ") || "None"}</span>
                          </div>
                          <div>
                            Credit: <span className="text-emerald-400 font-bold font-black">{(seq.totalCreditMinutes / 60).toFixed(2)} hrs</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3">
                    {parsedOutput.map((seq, idx) => (
                      <div
                        key={seq.id || idx}
                        className="p-4 bg-slate-900/85 border border-slate-800 rounded-xl hover:border-slate-700/80 transition duration-200"
                      >
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm font-bold text-slate-100 flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                            Open Seq {seq.sequenceNumber}
                          </span>
                          <span className="px-2 py-0.5 bg-amber-950/80 text-amber-400 border border-amber-900/50 rounded font-bold text-xs">
                            OT
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-y-1.5 gap-x-4 text-xs text-slate-400 font-mono">
                          <div>
                            Start: <span className="text-slate-200 font-bold">{seq.startDate} ({seq.reportTime})</span>
                          </div>
                          <div>
                            End: <span className="text-slate-200 font-bold">{seq.endDate} ({seq.releaseTime})</span>
                          </div>
                          <div>
                            Layovers: <span className="text-slate-200 font-bold">{seq.layoverDescription}</span>
                          </div>
                          <div>
                            Legs: <span className="text-slate-200 font-bold">{seq.legsDescription}</span>
                          </div>
                          <div className="col-span-2 border-t border-slate-800/60 pt-1.5 mt-1.5">
                            Credit Yield: <span className="text-amber-400 font-bold font-black">{seq.creditHours.toFixed(2)} hrs (unscaled)</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Import Controller */}
                <div className="sticky bottom-0 bg-slate-950 p-4 border border-slate-850 rounded-2xl flex flex-col gap-3 shadow-2xl">
                  {parseMode === "roster" && (
                    <div className="flex items-center gap-2 text-xs text-slate-400 font-sans">
                      <input
                        type="checkbox"
                        id="clear-first"
                        checked={clearRosterFirst}
                        onChange={(e) => setClearRosterFirst(e.target.checked)}
                        className="rounded border-slate-800 text-indigo-600 focus:ring-indigo-500 bg-slate-900 w-4 h-4"
                      />
                      <label htmlFor="clear-first" className="cursor-pointer font-bold">
                        Overwrite and clear active roster before import
                      </label>
                    </div>
                  )}

                  <button
                    onClick={handleImport}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-emerald-500 to-indigo-600 hover:from-emerald-600 hover:to-indigo-700 text-white rounded-xl font-bold shadow-lg shadow-emerald-500/10 active:scale-95 transition-all text-sm font-sans"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    {parseMode === "roster"
                      ? "Import Parsed Sequences to Main Dashboard"
                      : "Import Parsed Open Sequences for Calendar Overlay"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex-grow flex flex-col items-center justify-center text-slate-500 text-center py-12 px-6">
                <HelpCircle className="w-12 h-12 text-slate-700 mb-3 animate-pulse" />
                <p className="text-sm font-semibold">No parsed records</p>
                <p className="text-xs text-slate-600 max-w-[280px] mt-1 leading-relaxed">
                  {parseMode === "roster"
                    ? "Paste or load sample terminal schedules and click Parse."
                    : "Paste or load sample N4 open sequence lists and click Parse."}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
