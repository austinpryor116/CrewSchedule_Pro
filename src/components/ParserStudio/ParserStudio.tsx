"use client";

import { useState, useRef, ChangeEvent, DragEvent } from "react";
import { useCrewStore } from "../../store/useCrewStore";
import { parseRawSchedule, parseN4OpenTime, extractVacationsFromHI1, parseMonthlyHIMetadata } from "../../lib/parser";
import { readUploadedFileAsText } from "../../lib/pdfExtractor";
import { RAW_DEMO_TEXT, RAW_HI1_TEXT, RAW_HI1_AUG_TEXT, RAW_N4_TEXT } from "../../lib/demoData";
import { SequenceTrip, OpenSequence, MonthlyHIMetadata, VacationPeriod } from "../../types";
import { Clipboard, Play, AlertCircle, FileText, CheckCircle2, RotateCcw, HelpCircle, Upload, ShieldCheck, Calendar, User, Award, Clock, DollarSign, HeartPulse } from "lucide-react";

export default function ParserStudio() {
  const [parseMode, setParseMode] = useState<"roster" | "opentime">("roster");
  const [inputText, setInputText] = useState("");
  const [parsedOutput, setParsedOutput] = useState<(SequenceTrip | OpenSequence)[]>([]);
  const [parsedMetadata, setParsedMetadata] = useState<MonthlyHIMetadata | null>(null);
  const [parsedVacations, setParsedVacations] = useState<VacationPeriod[]>([]);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [uploadedFileName, setUploadedFileName] = useState<string>("");
  const [isExtracting, setIsExtracting] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  const importMonthlyHISchedule = useCrewStore((state) => state.importMonthlyHISchedule);
  const setOpenSequences = useCrewStore((state) => state.setOpenSequences);
  const setActiveTab = useCrewStore((state) => state.setActiveTab);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const processTextAndParse = (text: string, fileName: string = "Terminal_Log.txt") => {
    setInputText(text);
    setUploadedFileName(fileName);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      if (parseMode === "roster") {
        const metadata = parseMonthlyHIMetadata(text);
        const vacations = extractVacationsFromHI1(text);
        const results = parseRawSchedule(text);

        setParsedMetadata(metadata);
        setParsedVacations(vacations);

        if (results.length === 0) {
          setErrorMsg("Could not parse any sequences. Ensure text is a valid HI log or terminal sheet.");
          setParsedOutput([]);
        } else {
          setParsedOutput(results);
          const activeCount = results.filter((s) => !s.isDropped).length;
          const droppedCount = results.filter((s) => s.isDropped).length;
          setSuccessMsg(
            `Parsed ${results.length} total sequences (${activeCount} active, ${droppedCount} dropped/traded) and ${vacations.length} vacation block(s)!`
          );
        }
      } else {
        const results = parseN4OpenTime(text);
        setParsedMetadata(null);
        setParsedVacations([]);
        if (results.length === 0) {
          setErrorMsg("Could not parse any open sequences. Ensure format is N4 Open Time.");
          setParsedOutput([]);
        } else {
          setParsedOutput(results);
          setSuccessMsg(`Successfully parsed ${results.length} open sequence(s)!`);
        }
      }
    } catch (e: unknown) {
      const err = e as Error;
      setErrorMsg(`Parsing failed: ${err.message || String(e)}`);
      setParsedOutput([]);
    }
  };

  const handleFileUpload = async (file: File) => {
    setIsExtracting(true);
    setErrorMsg("");
    setSuccessMsg("");
    try {
      const { text, fileName } = await readUploadedFileAsText(file);
      processTextAndParse(text, fileName);
    } catch (e: unknown) {
      const err = e as Error;
      setErrorMsg(`File reading failed: ${err.message || String(e)}`);
    } finally {
      setIsExtracting(false);
    }
  };

  const onFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const onDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const onDragLeave = () => {
    setIsDragOver(false);
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const handleManualParse = () => {
    if (!inputText.trim()) {
      setErrorMsg("Please paste schedule text or upload a PDF / text log file first.");
      return;
    }
    processTextAndParse(inputText, uploadedFileName || "Pasted_Terminal_Text.txt");
  };

  const handleImport = () => {
    if (parsedOutput.length === 0) return;

    if (parseMode === "roster") {
      importMonthlyHISchedule(
        parsedOutput as SequenceTrip[],
        parsedVacations,
        parsedMetadata,
        uploadedFileName || "Monthly_HI_Schedule.pdf",
        inputText
      );
      setSuccessMsg(`Imported ${parsedOutput.length} sequence(s) and configured Monthly HI schedule metrics & audit trail!`);
    } else {
      setOpenSequences(parsedOutput as OpenSequence[]);
      setSuccessMsg(`Imported ${parsedOutput.length} open sequence(s) for Calendar Overlay!`);
    }

    setTimeout(() => {
      setActiveTab("calendar");
    }, 1000);
  };

  const loadHI1Text = () => {
    processTextAndParse(RAW_HI1_TEXT.trim(), "HI1_July_2026.pdf");
  };

  const loadAugText = () => {
    processTextAndParse(RAW_HI1_AUG_TEXT.trim(), "HI1_August_2026.pdf");
  };

  const loadN4Text = () => {
    setParseMode("opentime");
    processTextAndParse(RAW_N4_TEXT.trim(), "N4_OpenTime.txt");
  };

  const handleClear = () => {
    setInputText("");
    setUploadedFileName("");
    setParsedOutput([]);
    setParsedMetadata(null);
    setParsedVacations([]);
    setErrorMsg("");
    setSuccessMsg("");
  };

  const switchMode = (mode: "roster" | "opentime") => {
    setParseMode(mode);
    handleClear();
  };

  return (
    <div className="space-y-6 animate-fadeIn font-sans">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-slate-200">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
            Monthly HI & Schedule Log Parser Studio
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Upload your monthly HI schedule PDF, terminal logs, or N4 Open Time text to parse sequences, credit, vacation pay, and sick leave balances.
          </p>
        </div>
        <div className="mt-4 md:mt-0 flex gap-2 flex-wrap">
          {parseMode === "roster" ? (
            <>
              <button
                onClick={loadHI1Text}
                className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 text-slate-900 border border-slate-300 rounded-xl transition duration-200 text-xs font-bold shadow-sm cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5 text-emerald-600" />
                July HI Log (HI1.pdf)
              </button>
              <button
                onClick={loadAugText}
                className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 text-slate-900 border border-slate-300 rounded-xl transition duration-200 text-xs font-bold shadow-sm cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5 text-amber-600" />
                August HI Log (HI2.pdf)
              </button>
            </>
          ) : (
            <button
              onClick={loadN4Text}
              className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-50 text-slate-900 border border-slate-300 rounded-xl transition duration-200 text-xs font-bold shadow-sm cursor-pointer"
            >
              <FileText className="w-4 h-4 text-amber-600" />
              Load N4 Open Time Sample
            </button>
          )}
          <button
            onClick={handleClear}
            className="flex items-center gap-2 px-3 py-2 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 border border-slate-300 rounded-xl transition duration-200 text-xs font-bold cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            Clear
          </button>
        </div>
      </div>

      {/* Parse Mode Switcher */}
      <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200 max-w-sm text-xs font-bold">
        <button
          onClick={() => switchMode("roster")}
          className={`flex-1 py-2 rounded-xl transition duration-150 cursor-pointer ${
            parseMode === "roster" ? "bg-sky-600 text-white shadow-sm" : "text-slate-700 hover:text-slate-900"
          }`}
        >
          Parse Roster Schedule (HI / HI1 / HI2)
        </button>
        <button
          onClick={() => switchMode("opentime")}
          className={`flex-1 py-2 rounded-xl transition duration-150 cursor-pointer ${
            parseMode === "opentime" ? "bg-sky-600 text-white shadow-sm" : "text-slate-700 hover:text-slate-900"
          }`}
        >
          Parse Open Time (N4)
        </button>
      </div>

      {/* Drag and Drop File Upload Area */}
      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all duration-200 ${
          isDragOver
            ? "border-sky-600 bg-sky-50 scale-[1.01]"
            : "border-slate-300 hover:border-slate-400 bg-white hover:bg-slate-50 shadow-sm"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.txt,.log"
          onChange={onFileInputChange}
          className="hidden"
        />
        <div className="flex flex-col items-center justify-center space-y-2">
          <div className="p-3 bg-sky-100 border border-sky-300 rounded-2xl text-sky-700">
            <Upload className="w-6 h-6 animate-bounce" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              {uploadedFileName ? `Uploaded: ${uploadedFileName}` : "Drag & Drop your Monthly HI Log (.pdf, .txt)"}
            </h3>
            <p className="text-xs text-slate-600 mt-1 font-medium">
              Supports <span className="text-sky-700 font-bold">HI1.pdf</span>, <span className="text-sky-700 font-bold">HI2.pdf</span>, <span className="text-sky-700 font-bold">HSS.pdf</span>, or monospace text logs. Click to browse files.
            </p>
          </div>
          {isExtracting && (
            <div className="flex items-center gap-2 text-xs text-sky-700 font-bold pt-2">
              <span className="w-2 h-2 rounded-full bg-sky-600 animate-ping" />
              Extracting text and parsing PDF coordinates...
            </div>
          )}
        </div>
      </div>

      {/* Parser Workspace */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Input Panel */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col h-[650px]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Clipboard className="w-5 h-5 text-sky-600" />
              Raw Monospace Log Text
            </h2>
            <span className="text-xs text-slate-600 font-mono font-bold">
              {uploadedFileName || "Terminal Monospace Output"}
            </span>
          </div>

          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={
              parseMode === "roster"
                ? "Paste raw monthly HI schedule log text or drop your HI PDF file above..."
                : "Paste raw N4 Open Time log text here..."
            }
            className="w-full flex-grow bg-slate-50 border border-slate-300 focus:border-sky-600 focus:ring-1 focus:ring-sky-600 rounded-xl p-4 text-slate-900 font-mono text-xs font-bold leading-relaxed resize-none focus:outline-none transition duration-150 scrollbar-thin"
          />

          <div className="mt-4 flex items-center justify-between">
            <span className="text-xs text-slate-600 font-mono font-bold">
              {inputText.length > 0 ? `${inputText.split("\n").length} lines extracted` : "No text input"}
            </span>
            <button
              onClick={handleManualParse}
              className="flex items-center gap-2 px-6 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-bold shadow-sm active:scale-95 transition-all text-sm cursor-pointer"
            >
              <Play className="w-4 h-4 fill-white" />
              Parse Schedule Log
            </button>
          </div>
        </div>

        {/* Output Panel */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col h-[650px]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              Parsed Schedule & Metadata Analysis
            </h2>
            <span className="text-xs text-slate-600 font-mono font-bold">Structured Audit</span>
          </div>

          <div className="flex-grow bg-slate-50 border border-slate-300 rounded-xl p-4 overflow-y-auto scrollbar-thin flex flex-col">
            {errorMsg && (
              <div className="flex items-start gap-3 p-4 bg-rose-50 border border-rose-300 rounded-xl text-rose-950 text-sm mb-4">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-rose-600" />
                <div>
                  <h4 className="font-bold">Parsing Issue</h4>
                  <p className="mt-0.5 text-xs text-rose-900 font-medium">{errorMsg}</p>
                </div>
              </div>
            )}

            {successMsg && (
              <div className="flex items-start gap-3 p-4 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-950 text-sm mb-4">
                <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5 text-emerald-600" />
                <div>
                  <h4 className="font-bold">Parsing Success</h4>
                  <p className="mt-0.5 text-xs text-emerald-900 font-medium">{successMsg}</p>
                </div>
              </div>
            )}

            {/* Parsed Monthly HI Header Summary Card */}
            {parsedMetadata && (
              <div className="mb-4 p-4 bg-white border border-slate-300 rounded-2xl shadow-sm space-y-3">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-sky-100 border border-sky-300 rounded-xl text-sky-700">
                      <User className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        {parsedMetadata.pilotName}
                        <span className="px-2 py-0.5 bg-sky-100 text-sky-900 border border-sky-300 rounded text-[10px] font-mono font-extrabold">
                          Seniority #{parsedMetadata.seniorityNum}
                        </span>
                      </h3>
                      <p className="text-xs text-slate-600 font-mono mt-0.5 font-bold">
                        Base: {parsedMetadata.base} | Rank: {parsedMetadata.rank} | Equip: {parsedMetadata.equipment} | Emp #{parsedMetadata.empNum}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-emerald-900 bg-emerald-100 px-2.5 py-1 border border-emerald-300 rounded-lg flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-emerald-700" />
                      {parsedMetadata.monthYearLabel}
                    </span>
                    {parsedMetadata.asOfDateStr && (
                      <p className="text-[10px] text-slate-600 font-mono mt-1 font-bold">As of: {parsedMetadata.asOfDateStr}</p>
                    )}
                  </div>
                </div>

                {/* Metrics Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
                  <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                    <div className="flex items-center gap-1 text-slate-600 text-[10px] font-sans font-bold">
                      <Award className="w-3 h-3 text-sky-600" /> Guarantee
                    </div>
                    <div className="text-slate-900 font-bold text-sm mt-0.5">{parsedMetadata.guaranteeHours.toFixed(2)} hrs</div>
                  </div>
                  <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                    <div className="flex items-center gap-1 text-slate-600 text-[10px] font-sans font-bold">
                      <Clock className="w-3 h-3 text-emerald-600" /> Bid Sel Proj
                    </div>
                    <div className="text-emerald-700 font-bold text-sm mt-0.5">{parsedMetadata.bidSelProjHours.toFixed(2)} hrs</div>
                  </div>
                  <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                    <div className="flex items-center gap-1 text-slate-600 text-[10px] font-sans font-bold">
                      <DollarSign className="w-3 h-3 text-amber-600" /> Vacation Pay
                    </div>
                    <div className="text-amber-700 font-bold text-sm mt-0.5">
                      {parsedMetadata.vacationDaysCount} days {parsedMetadata.vacationCreditHours > 0 ? `(${parsedMetadata.vacationCreditHours.toFixed(2)}h)` : ""}
                    </div>
                  </div>
                  <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                    <div className="flex items-center gap-1 text-slate-600 text-[10px] font-sans font-bold">
                      <HeartPulse className="w-3 h-3 text-rose-600" /> Sick Avail
                    </div>
                    <div className="text-slate-900 font-bold text-sm mt-0.5">{parsedMetadata.availSickHours.toFixed(2)} hrs</div>
                  </div>
                </div>
              </div>
            )}

            {parsedOutput.length > 0 ? (
              <div className="space-y-4 flex-grow">
                {parseMode === "roster" ? (
                  <div className="grid grid-cols-1 gap-2.5">
                    {(parsedOutput as SequenceTrip[]).map((seq, idx) => (
                      <div
                        key={seq.id || idx}
                        className={`p-3.5 border rounded-xl transition duration-200 ${
                          seq.isDropped
                            ? "border-rose-300 bg-rose-50"
                            : seq.isOvertime
                            ? "border-amber-300 bg-amber-50"
                            : "border-slate-200 bg-white hover:border-slate-300 shadow-sm"
                        }`}
                      >
                        <div className="flex justify-between items-center mb-1.5">
                          <span className="text-xs font-bold text-slate-900 flex items-center gap-2">
                            <span
                              className={`w-2.5 h-2.5 rounded-full ${
                                seq.isDropped ? "bg-rose-600" : seq.isOvertime ? "bg-amber-600" : "bg-sky-600"
                              }`}
                            />
                            Seq {seq.sequenceNumber}
                            {seq.isDropped && (
                              <span className="px-2 py-0.5 bg-rose-100 text-rose-950 border border-rose-300 rounded text-[10px] font-mono font-bold">
                                {seq.statusTag || "DROPPED"}
                              </span>
                            )}
                            {seq.isOvertime && !seq.isDropped && (
                              <span className="px-2 py-0.5 bg-amber-100 text-amber-950 border border-amber-300 rounded text-[10px] font-mono font-bold">
                                OT / REASSIGNED
                              </span>
                            )}
                          </span>
                          <span className="px-2 py-0.5 bg-sky-100 text-sky-900 border border-sky-300 rounded font-bold text-[10px]">
                            {seq.base}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-y-1 gap-x-4 text-xs text-slate-700 font-mono">
                          <div>
                            Dates: <span className="text-slate-900 font-bold">{seq.startDate} to {seq.endDate}</span>
                          </div>
                          <div>
                            Layovers: <span className="text-slate-900 font-bold">{seq.layoverCities.join(", ") || "None"}</span>
                          </div>
                          <div>
                            Block: <span className="text-slate-900 font-bold">{(seq.totalBlockMinutes / 60).toFixed(2)} hrs</span>
                          </div>
                          <div>
                            Credit: <span className="text-emerald-700 font-bold">{(seq.totalCreditMinutes / 60).toFixed(2)} hrs</span>
                          </div>
                          {seq.dropReason && (
                            <div className="col-span-2 text-[11px] text-rose-700 font-sans mt-1 pt-1 border-t border-slate-200 font-medium">
                              {seq.dropReason}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-2.5">
                    {(parsedOutput as OpenSequence[]).map((seq, idx) => (
                      <div
                        key={seq.id || idx}
                        className="p-3.5 bg-white border border-slate-200 rounded-xl hover:border-slate-300 shadow-sm transition duration-200"
                      >
                        <div className="flex justify-between items-center mb-1.5">
                          <span className="text-xs font-bold text-slate-900 flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-amber-600" />
                            Open Seq {seq.sequenceNumber}
                          </span>
                          <span className="px-2 py-0.5 bg-amber-100 text-amber-950 border border-amber-300 rounded font-bold text-[10px]">
                            OT
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-y-1 gap-x-4 text-xs text-slate-700 font-mono">
                          <div>
                            Start: <span className="text-slate-900 font-bold">{seq.startDate} ({seq.reportTime})</span>
                          </div>
                          <div>
                            End: <span className="text-slate-900 font-bold">{seq.endDate} ({seq.releaseTime})</span>
                          </div>
                          <div>
                            Layovers: <span className="text-slate-900 font-bold">{seq.layoverDescription}</span>
                          </div>
                          <div>
                            Credit: <span className="text-amber-700 font-bold">{seq.creditHours.toFixed(2)} hrs</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Import Action Controller */}
                <div className="sticky bottom-0 bg-white p-4 border border-slate-300 rounded-2xl flex flex-col gap-3 shadow-md">
                  <button
                    onClick={handleImport}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-bold shadow-sm active:scale-95 transition-all text-sm cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    {parseMode === "roster"
                      ? "Import Parsed Monthly Schedule & Audit Trail"
                      : "Import Parsed Open Sequences for Overlay"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex-grow flex flex-col items-center justify-center text-slate-600 text-center py-12 px-6">
                <HelpCircle className="w-12 h-12 text-slate-400 mb-3 animate-pulse" />
                <p className="text-sm font-bold text-slate-900">No parsed records yet</p>
                <p className="text-xs text-slate-600 max-w-[280px] mt-1 leading-relaxed font-medium">
                  {parseMode === "roster"
                    ? "Drag & drop your monthly HI schedule PDF (HI1.pdf, HI2.pdf) or paste terminal output to analyze."
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
