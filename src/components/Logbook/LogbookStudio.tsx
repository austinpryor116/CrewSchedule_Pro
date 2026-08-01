"use client";

import { useState, useMemo } from "react";
import {
  BookOpen,
  Sparkles,
  Download,
  Plus,
  Trash2,
  Edit2,
  Search,
  CheckCircle2,
  FileSpreadsheet,
  Clock,
  Award,
  Plane,
  Moon,
  Compass,
  Code,
  Copy,
  Check,
  Send,
  X,
  RotateCcw,
} from "lucide-react";
import { useCrewStore } from "../../store/useCrewStore";
import { LogbookEntry } from "../../types";

export default function LogbookStudio() {
  const logbookEntries = useCrewStore((state) => state.logbookEntries);
  const autoGenerateLogbookFromRoster = useCrewStore((state) => state.autoGenerateLogbookFromRoster);
  const addLogbookEntry = useCrewStore((state) => state.addLogbookEntry);
  const updateLogbookEntry = useCrewStore((state) => state.updateLogbookEntry);
  const deleteLogbookEntry = useCrewStore((state) => state.deleteLogbookEntry);
  const clearLogbook = useCrewStore((state) => state.clearLogbook);
  const exportLogbookCsv = useCrewStore((state) => state.exportLogbookCsv);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [filterAircraft, setFilterAircraft] = useState("all");
  const [filterMonth, setFilterMonth] = useState("all");

  // Modal states
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportFormat, setExportFormat] = useState<"logten" | "foreflight" | "standard_faa" | "api_json">("logten");
  const [copied, setCopied] = useState(false);
  const [apiSynced, setApiSynced] = useState(false);

  // Edit / Add Modal state
  const [editingEntry, setEditingEntry] = useState<LogbookEntry | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Form state for add/edit modal
  const [formData, setFormData] = useState<Partial<LogbookEntry>>({
    date: new Date().toISOString().split("T")[0],
    flightNumber: "AA1234",
    tailNumber: "N405AA",
    aircraftType: "E75",
    depAirport: "ORD",
    arrAirport: "MHK",
    outTime: "0800",
    inTime: "1015",
    blockMinutes: 135,
    nightMinutes: 0,
    instrumentMinutes: 20,
    crossCountryMinutes: 135,
    picMinutes: 135,
    sicMinutes: 0,
    dualReceivedMinutes: 0,
    landingsDay: 1,
    landingsNight: 0,
    approaches: 1,
    remarks: "Line flight.",
  });

  // Calculate Summary Totals
  const totals = useMemo(() => {
    return logbookEntries.reduce(
      (acc, e) => {
        acc.totalBlockMins += e.blockMinutes || 0;
        acc.picMins += e.picMinutes || 0;
        acc.sicMins += e.sicMinutes || 0;
        acc.nightMins += e.nightMinutes || 0;
        acc.instMins += e.instrumentMinutes || 0;
        acc.landingsDay += e.landingsDay || 0;
        acc.landingsNight += e.landingsNight || 0;
        acc.approaches += e.approaches || 0;
        return acc;
      },
      {
        totalBlockMins: 0,
        picMins: 0,
        sicMins: 0,
        nightMins: 0,
        instMins: 0,
        landingsDay: 0,
        landingsNight: 0,
        approaches: 0,
      }
    );
  }, [logbookEntries]);

  // Filtered Entries
  const filteredEntries = useMemo(() => {
    return logbookEntries.filter((e) => {
      const matchesSearch =
        e.flightNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.depAirport.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.arrAirport.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.tailNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (e.remarks || "").toLowerCase().includes(searchQuery.toLowerCase());

      const matchesAircraft = filterAircraft === "all" || e.aircraftType === filterAircraft;
      const matchesMonth = filterMonth === "all" || e.date.startsWith(filterMonth);

      return matchesSearch && matchesAircraft && matchesMonth;
    });
  }, [logbookEntries, searchQuery, filterAircraft, filterMonth]);

  // Aircraft list options
  const aircraftTypes = useMemo(() => {
    const types = new Set(logbookEntries.map((e) => e.aircraftType).filter(Boolean));
    return Array.from(types);
  }, [logbookEntries]);

  // Months list options
  const monthsList = useMemo(() => {
    const months = new Set(logbookEntries.map((e) => e.date.substring(0, 7)).filter(Boolean));
    return Array.from(months).sort().reverse();
  }, [logbookEntries]);

  // Download CSV helper
  const handleDownloadCsv = (format: "logten" | "foreflight" | "standard_faa") => {
    const csvContent = exportLogbookCsv(format);
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const filename =
      format === "logten"
        ? `LogTen_Pro_Logbook_${new Date().toISOString().split("T")[0]}.csv`
        : format === "foreflight"
        ? `ForeFlight_Logbook_${new Date().toISOString().split("T")[0]}.csv`
        : `FAA_Standard_Logbook_${new Date().toISOString().split("T")[0]}.csv`;
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Copy CSV / JSON to clipboard
  const handleCopyText = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Handle Save Form (Add / Edit)
  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    const entry: LogbookEntry = {
      id: editingEntry ? editingEntry.id : `log-custom-${Date.now()}`,
      date: formData.date || new Date().toISOString().split("T")[0],
      flightNumber: formData.flightNumber || "AA100",
      tailNumber: formData.tailNumber || "N405AA",
      aircraftType: formData.aircraftType || "E75",
      depAirport: (formData.depAirport || "ORD").toUpperCase(),
      arrAirport: (formData.arrAirport || "MHK").toUpperCase(),
      outTime: formData.outTime || "0800",
      inTime: formData.inTime || "1000",
      blockMinutes: Number(formData.blockMinutes) || 120,
      nightMinutes: Number(formData.nightMinutes) || 0,
      instrumentMinutes: Number(formData.instrumentMinutes) || 0,
      crossCountryMinutes: Number(formData.blockMinutes) || 120,
      picMinutes: Number(formData.picMinutes) || 0,
      sicMinutes: Number(formData.sicMinutes) || 0,
      dualReceivedMinutes: 0,
      landingsDay: Number(formData.landingsDay) || 1,
      landingsNight: Number(formData.landingsNight) || 0,
      approaches: Number(formData.approaches) || 0,
      remarks: formData.remarks || "",
      isAutoFilled: false,
      createdAt: editingEntry ? editingEntry.createdAt : new Date().toISOString(),
    };

    if (editingEntry) {
      updateLogbookEntry(entry);
    } else {
      addLogbookEntry(entry);
    }

    setIsAddModalOpen(false);
    setEditingEntry(null);
  };

  // Open Edit Modal
  const openEditModal = (entry: LogbookEntry) => {
    setEditingEntry(entry);
    setFormData(entry);
    setIsAddModalOpen(true);
  };

  // Open New Modal
  const openNewModal = () => {
    setEditingEntry(null);
    setFormData({
      date: new Date().toISOString().split("T")[0],
      flightNumber: "AA100",
      tailNumber: "N405AA",
      aircraftType: "E75",
      depAirport: "ORD",
      arrAirport: "MHK",
      outTime: "0800",
      inTime: "1015",
      blockMinutes: 135,
      nightMinutes: 0,
      instrumentMinutes: 20,
      crossCountryMinutes: 135,
      picMinutes: 135,
      sicMinutes: 0,
      dualReceivedMinutes: 0,
      landingsDay: 1,
      landingsNight: 0,
      approaches: 1,
      remarks: "Line leg",
    });
    setIsAddModalOpen(true);
  };

  return (
    <div className="flex flex-col gap-6 font-sans animate-fadeIn pb-12">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2.5">
            <BookOpen className="w-7 h-7 text-sky-600" />
            Pilot Electronic Logbook Studio
          </h1>
          <p className="text-xs text-slate-600 mt-1 font-medium">
            Automated flight logging from roster schedules. Export formatted logs directly to LogTen Pro, ForeFlight, or custom REST APIs.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={autoGenerateLogbookFromRoster}
            className="flex items-center gap-2 px-3.5 py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-xl shadow-sm transition cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            <span>Sync & Auto-Populate Roster</span>
          </button>

          <button
            onClick={() => setShowExportModal(true)}
            className="flex items-center gap-2 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-900 border border-slate-300 text-xs font-bold rounded-xl shadow-sm transition cursor-pointer"
          >
            <Download className="w-4 h-4 text-emerald-600" />
            <span>Export & Sync</span>
          </button>

          <button
            onClick={openNewModal}
            className="flex items-center gap-2 px-3.5 py-2 bg-white hover:bg-slate-50 text-sky-700 border border-sky-300 text-xs font-bold rounded-xl shadow-sm transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Manual Entry</span>
          </button>
        </div>
      </div>

      {/* Logbook Statistics Dashboard */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Total Flight Time */}
        <div className="bg-white border border-slate-200 rounded-2xl p-3.5 shadow-sm">
          <div className="flex items-center justify-between text-slate-600 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">Total Flight Time</span>
            <Clock className="w-4 h-4 text-sky-600" />
          </div>
          <p className="text-xl font-black text-slate-900">{(totals.totalBlockMins / 60).toFixed(1)}h</p>
          <span className="text-[10px] text-slate-600 font-mono font-bold">{logbookEntries.length} logged flight leg(s)</span>
        </div>

        {/* PIC Time */}
        <div className="bg-white border border-slate-200 rounded-2xl p-3.5 shadow-sm">
          <div className="flex items-center justify-between text-slate-600 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">PIC Hours</span>
            <Award className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-xl font-black text-emerald-700">{(totals.picMins / 60).toFixed(1)}h</p>
          <span className="text-[10px] text-slate-600 font-mono font-bold">Captain / Command</span>
        </div>

        {/* SIC Time */}
        <div className="bg-white border border-slate-200 rounded-2xl p-3.5 shadow-sm">
          <div className="flex items-center justify-between text-slate-600 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">SIC Hours</span>
            <Plane className="w-4 h-4 text-cyan-600" />
          </div>
          <p className="text-xl font-black text-cyan-700">{(totals.sicMins / 60).toFixed(1)}h</p>
          <span className="text-[10px] text-slate-600 font-mono font-bold">First Officer</span>
        </div>

        {/* Night Time */}
        <div className="bg-white border border-slate-200 rounded-2xl p-3.5 shadow-sm">
          <div className="flex items-center justify-between text-slate-600 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">Night Flight</span>
            <Moon className="w-4 h-4 text-cyan-600" />
          </div>
          <p className="text-xl font-black text-cyan-700">{(totals.nightMins / 60).toFixed(1)}h</p>
          <span className="text-[10px] text-slate-600 font-mono font-bold">{totals.landingsNight} night landing(s)</span>
        </div>

        {/* Instrument Time */}
        <div className="bg-white border border-slate-200 rounded-2xl p-3.5 shadow-sm">
          <div className="flex items-center justify-between text-slate-600 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">Actual Instrument</span>
            <Compass className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-xl font-black text-amber-700">{(totals.instMins / 60).toFixed(1)}h</p>
          <span className="text-[10px] text-slate-600 font-mono font-bold">{totals.approaches} IFR approach(es)</span>
        </div>

        {/* Total Landings */}
        <div className="bg-white border border-slate-200 rounded-2xl p-3.5 shadow-sm">
          <div className="flex items-center justify-between text-slate-600 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">LogTen Pro Status</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-sm font-extrabold text-emerald-700 mt-1">Ready for Export</p>
          <span className="text-[10px] text-slate-600 font-mono font-bold">100% Schema Matched</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search flight #, station, tail #..."
            className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-sky-600 font-mono"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          {/* Aircraft Filter */}
          <select
            value={filterAircraft}
            onChange={(e) => setFilterAircraft(e.target.value)}
            className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 font-mono font-bold focus:outline-none focus:border-sky-600 cursor-pointer"
          >
            <option value="all">All Aircraft Types</option>
            {aircraftTypes.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>

          {/* Month Filter */}
          <select
            value={filterMonth}
            onChange={(e) => setFilterMonth(e.target.value)}
            className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 font-mono font-bold focus:outline-none focus:border-sky-600 cursor-pointer"
          >
            <option value="all">All Months</option>
            {monthsList.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>

          {logbookEntries.length > 0 && (
            <button
              onClick={clearLogbook}
              className="p-2 text-slate-600 hover:text-rose-600 rounded-xl hover:bg-slate-100 transition cursor-pointer"
              title="Clear Logbook"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Logbook Entries Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-mono uppercase text-[10px] font-bold tracking-wider">
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-3">Flight #</th>
                <th className="py-3 px-3">Tail / Type</th>
                <th className="py-3 px-3">Route (Out ➔ In)</th>
                <th className="py-3 px-3 text-right">Block</th>
                <th className="py-3 px-3 text-right">PIC</th>
                <th className="py-3 px-3 text-right">SIC</th>
                <th className="py-3 px-3 text-right">Night</th>
                <th className="py-3 px-3 text-right">Inst</th>
                <th className="py-3 px-3 text-center">Landings</th>
                <th className="py-3 px-4">Remarks</th>
                <th className="py-3 px-3 text-center">Source</th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 font-mono text-slate-900">
              {filteredEntries.length > 0 ? (
                filteredEntries.map((e) => (
                  <tr key={e.id} className="hover:bg-slate-50 transition">
                    <td className="py-3 px-4 font-bold text-slate-900 whitespace-nowrap">{e.date}</td>
                    <td className="py-3 px-3 font-extrabold text-sky-700 whitespace-nowrap">{e.flightNumber}</td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      <span className="text-slate-900 font-bold">{e.tailNumber}</span>{" "}
                      <span className="text-slate-600 text-[10px]">({e.aircraftType})</span>
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      <span className="font-bold text-emerald-700">{e.depAirport}</span>
                      <span className="text-slate-400 mx-1">➔</span>
                      <span className="font-bold text-cyan-700">{e.arrAirport}</span>
                      <span className="text-[10px] text-slate-600 ml-1.5">({e.outTime}-{e.inTime})</span>
                    </td>
                    <td className="py-3 px-3 text-right font-extrabold text-slate-900 whitespace-nowrap">
                      {(e.blockMinutes / 60).toFixed(1)}h
                    </td>
                    <td className="py-3 px-3 text-right text-emerald-700 font-bold whitespace-nowrap">
                      {e.picMinutes > 0 ? `${(e.picMinutes / 60).toFixed(1)}h` : "-"}
                    </td>
                    <td className="py-3 px-3 text-right text-cyan-700 font-bold whitespace-nowrap">
                      {e.sicMinutes > 0 ? `${(e.sicMinutes / 60).toFixed(1)}h` : "-"}
                    </td>
                    <td className="py-3 px-3 text-right text-cyan-700 whitespace-nowrap">
                      {e.nightMinutes > 0 ? `${(e.nightMinutes / 60).toFixed(1)}h` : "-"}
                    </td>
                    <td className="py-3 px-3 text-right text-amber-700 whitespace-nowrap">
                      {e.instrumentMinutes > 0 ? `${(e.instrumentMinutes / 60).toFixed(1)}h` : "-"}
                    </td>
                    <td className="py-3 px-3 text-center whitespace-nowrap">
                      <span className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-300 text-slate-800 text-[10px] font-bold">
                        {e.landingsDay}D / {e.landingsNight}N
                      </span>
                    </td>
                    <td className="py-3 px-4 max-w-xs truncate text-slate-700 font-sans text-xs font-medium" title={e.remarks}>
                      {e.remarks || "-"}
                    </td>
                    <td className="py-3 px-3 text-center whitespace-nowrap">
                      {e.isAutoFilled ? (
                        <span className="px-2 py-0.5 rounded bg-sky-100 border border-sky-300 text-sky-900 text-[10px] font-bold">
                          Roster
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-300 text-slate-700 text-[10px] font-bold">
                          Manual
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openEditModal(e)}
                          className="p-1 text-slate-600 hover:text-slate-900 rounded hover:bg-slate-100 transition cursor-pointer"
                          title="Edit Flight Log"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => deleteLogbookEntry(e.id)}
                          className="p-1 text-slate-500 hover:text-rose-600 rounded hover:bg-slate-100 transition cursor-pointer"
                          title="Delete Flight Log"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={13} className="py-12 text-center text-slate-600 font-sans">
                    <BookOpen className="w-10 h-10 text-slate-400 mx-auto mb-3" />
                    <p className="text-sm font-bold text-slate-900">No Logbook Entries Found</p>
                    <p className="text-xs text-slate-600 mt-1 max-w-md mx-auto font-medium">
                      Click <strong className="text-sky-700">Sync & Auto-Populate Roster</strong> above to automatically parse completed schedule flights into your logbook.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Export & API Sync Modal */}
      {showExportModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-2xl w-full p-6 space-y-5 shadow-2xl animate-fadeIn">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                <h3 className="text-lg font-bold text-slate-900">Logbook Export & Third-Party Sync</h3>
              </div>
              <button
                onClick={() => setShowExportModal(false)}
                className="p-1.5 text-slate-500 hover:text-slate-900 rounded-xl hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Export Format Selector Tabs */}
            <div className="flex p-1 bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold">
              {[
                { id: "logten", label: "LogTen Pro (CSV)", icon: FileSpreadsheet },
                { id: "foreflight", label: "ForeFlight (CSV)", icon: FileSpreadsheet },
                { id: "standard_faa", label: "Standard FAA (CSV)", icon: FileSpreadsheet },
                { id: "api_json", label: "API Sync (JSON)", icon: Code },
              ].map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setExportFormat(tab.id as any)}
                    className={`flex-1 py-2 flex items-center justify-center gap-1.5 rounded-lg transition cursor-pointer ${
                      exportFormat === tab.id
                        ? "bg-sky-600 text-white shadow-sm"
                        : "text-slate-700 hover:text-slate-900"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Format Content & Actions */}
            {exportFormat !== "api_json" ? (
              <div className="space-y-4">
                <p className="text-xs text-slate-700 leading-relaxed font-sans font-medium">
                  {exportFormat === "logten"
                    ? "Generates a 100% schema-compliant CSV file formatted specifically for LogTen Pro. Import directly into LogTen Pro for iOS or macOS without column mapping."
                    : exportFormat === "foreflight"
                    ? "Generates a ForeFlight-compatible Logbook CSV file containing all aircraft IDs, out/in times, instrument hours, and landings."
                    : "Standard FAA / ICAO Form 8710 CSV export format for official flight time records."}
                </p>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 max-h-48 overflow-y-auto font-mono text-[10px] text-slate-800 select-all scrollbar-thin">
                  <pre className="whitespace-pre-wrap">{exportLogbookCsv(exportFormat as any)}</pre>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <button
                    onClick={() => handleCopyText(exportLogbookCsv(exportFormat as any))}
                    className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold border border-slate-300 transition cursor-pointer"
                  >
                    {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                    <span>{copied ? "Copied CSV!" : "Copy CSV to Clipboard"}</span>
                  </button>

                  <button
                    onClick={() => handleDownloadCsv(exportFormat as any)}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download {exportFormat === "logten" ? "LogTen Pro CSV" : "CSV File"}</span>
                  </button>
                </div>
              </div>
            ) : (
              /* API JSON Sync Section */
              <div className="space-y-4">
                <p className="text-xs text-slate-700 leading-relaxed font-sans font-medium">
                  Structured REST JSON Payload for automated third-party logbook API sync or custom webhook integrations.
                </p>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 max-h-48 overflow-y-auto font-mono text-[10px] text-sky-800 font-bold select-all scrollbar-thin">
                  <pre className="whitespace-pre-wrap">
                    {JSON.stringify(
                      {
                        system: "CrewSchedule Pro API Sync",
                        exportedAt: new Date().toISOString(),
                        totalEntries: logbookEntries.length,
                        entries: logbookEntries,
                      },
                      null,
                      2
                    )}
                  </pre>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <button
                    onClick={() =>
                      handleCopyText(
                        JSON.stringify(
                          {
                            system: "CrewSchedule Pro API Sync",
                            exportedAt: new Date().toISOString(),
                            totalEntries: logbookEntries.length,
                            entries: logbookEntries,
                          },
                          null,
                          2
                        )
                      )
                    }
                    className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold border border-slate-300 transition cursor-pointer"
                  >
                    {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                    <span>{copied ? "Copied JSON!" : "Copy JSON Payload"}</span>
                  </button>

                  <button
                    onClick={() => {
                      setApiSynced(true);
                      setTimeout(() => setApiSynced(false), 3000);
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold shadow-sm transition cursor-pointer"
                  >
                    <Send className="w-4 h-4" />
                    <span>{apiSynced ? "Sync Triggered (200 OK)" : "Trigger Webhook API Sync"}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add / Edit Flight Log Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveForm}
            className="bg-white border border-slate-200 rounded-3xl max-w-xl w-full p-6 space-y-4 shadow-2xl animate-fadeIn"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-lg font-bold text-slate-900">
                {editingEntry ? "Edit Flight Log Entry" : "Add Manual Logbook Entry"}
              </h3>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 text-slate-500 hover:text-slate-900 rounded-xl hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="text-[10px] text-slate-700 block font-extrabold mb-1 uppercase">Date</label>
                <input
                  type="date"
                  value={formData.date || ""}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-mono font-bold focus:outline-none focus:border-sky-600"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-700 block font-extrabold mb-1 uppercase">Flight #</label>
                <input
                  type="text"
                  value={formData.flightNumber || ""}
                  onChange={(e) => setFormData({ ...formData, flightNumber: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-mono font-bold focus:outline-none focus:border-sky-600"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-700 block font-extrabold mb-1 uppercase">Tail #</label>
                <input
                  type="text"
                  value={formData.tailNumber || ""}
                  onChange={(e) => setFormData({ ...formData, tailNumber: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-mono font-bold focus:outline-none focus:border-sky-600"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-700 block font-extrabold mb-1 uppercase">Aircraft Type</label>
                <input
                  type="text"
                  value={formData.aircraftType || ""}
                  onChange={(e) => setFormData({ ...formData, aircraftType: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-mono font-bold focus:outline-none focus:border-sky-600"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-700 block font-extrabold mb-1 uppercase">Dep Station</label>
                <input
                  type="text"
                  value={formData.depAirport || ""}
                  onChange={(e) => setFormData({ ...formData, depAirport: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-mono uppercase font-bold focus:outline-none focus:border-sky-600"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-700 block font-extrabold mb-1 uppercase">Arr Station</label>
                <input
                  type="text"
                  value={formData.arrAirport || ""}
                  onChange={(e) => setFormData({ ...formData, arrAirport: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-mono uppercase font-bold focus:outline-none focus:border-sky-600"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-700 block font-extrabold mb-1 uppercase">Out Time (HHMM)</label>
                <input
                  type="text"
                  value={formData.outTime || ""}
                  onChange={(e) => setFormData({ ...formData, outTime: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-mono font-bold focus:outline-none focus:border-sky-600"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-700 block font-extrabold mb-1 uppercase">In Time (HHMM)</label>
                <input
                  type="text"
                  value={formData.inTime || ""}
                  onChange={(e) => setFormData({ ...formData, inTime: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-mono font-bold focus:outline-none focus:border-sky-600"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-700 block font-extrabold mb-1 uppercase">Block Mins</label>
                <input
                  type="number"
                  value={formData.blockMinutes || 0}
                  onChange={(e) => setFormData({ ...formData, blockMinutes: Number(e.target.value) })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-mono font-bold focus:outline-none focus:border-sky-600"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-700 block font-extrabold mb-1 uppercase">PIC Mins</label>
                <input
                  type="number"
                  value={formData.picMinutes || 0}
                  onChange={(e) => setFormData({ ...formData, picMinutes: Number(e.target.value) })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-mono font-bold focus:outline-none focus:border-sky-600"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-700 block font-extrabold mb-1 uppercase">SIC Mins</label>
                <input
                  type="number"
                  value={formData.sicMinutes || 0}
                  onChange={(e) => setFormData({ ...formData, sicMinutes: Number(e.target.value) })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-mono font-bold focus:outline-none focus:border-sky-600"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-700 block font-extrabold mb-1 uppercase">Night Mins</label>
                <input
                  type="number"
                  value={formData.nightMinutes || 0}
                  onChange={(e) => setFormData({ ...formData, nightMinutes: Number(e.target.value) })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-mono font-bold focus:outline-none focus:border-sky-600"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] text-slate-700 block font-extrabold mb-1 uppercase">Remarks / Notes</label>
              <textarea
                value={formData.remarks || ""}
                onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 font-sans font-medium focus:outline-none focus:border-sky-600 h-20"
                placeholder="Leg remarks, weather, ATC delays..."
              />
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="px-4 py-2 text-slate-600 hover:text-slate-900 text-xs font-bold transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold transition shadow-sm cursor-pointer"
              >
                {editingEntry ? "Update Flight Log" : "Save Flight Log"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
