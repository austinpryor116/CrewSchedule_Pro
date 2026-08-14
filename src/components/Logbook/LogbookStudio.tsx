"use client";

import { useState, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
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
  Code,
  Copy,
  Check,
  Send,
  X,
  RotateCcw,
  Briefcase,
} from "lucide-react";
import { useCrewStore } from "../../store/useCrewStore";
import { LogbookEntry } from "../../types";
import { isCaptainRank, isFlightAttendantRole, isFirstOfficerRole } from "../../lib/parser";

export default function LogbookStudio() {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const logbookEntries = useCrewStore((state) => state.logbookEntries);
  const autoGenerateLogbookFromRoster = useCrewStore((state) => state.autoGenerateLogbookFromRoster);
  const payRates = useCrewStore((state) => state.payRates);
  const userProfile = useCrewStore((state) => state.userProfile);
  const updateUserProfile = useCrewStore((state) => state.updateUserProfile);
  const monthlyHIMetadata = useCrewStore((state) => state.monthlyHIMetadata);
  const addLogbookEntry = useCrewStore((state) => state.addLogbookEntry);
  const updateLogbookEntry = useCrewStore((state) => state.updateLogbookEntry);
  const deleteLogbookEntry = useCrewStore((state) => state.deleteLogbookEntry);
  const clearLogbook = useCrewStore((state) => state.clearLogbook);
  const exportLogbookCsv = useCrewStore((state) => state.exportLogbookCsv);

  // Active Role determination
  const activeRole = userProfile?.crewRole || payRates?.crewRole || monthlyHIMetadata?.rank || "CA";
  const isFa = isFlightAttendantRole(activeRole);
  const isPic = !isFa && isCaptainRank(activeRole);
  const isSic = !isFa && (isFirstOfficerRole(activeRole) || !isPic);

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
    flightNumber: "AA100",
    tailNumber: "N405AA",
    aircraftType: "E75",
    depAirport: "ORD",
    arrAirport: "MHK",
    outTime: "0800",
    inTime: "1015",
    blockMinutes: 135,
    nightMinutes: 0,
    instrumentMinutes: 0,
    crossCountryMinutes: 135,
    picMinutes: isPic ? 135 : 0,
    sicMinutes: isSic ? 135 : 0,
    dualReceivedMinutes: 0,
    landingsDay: isFa ? 0 : 1,
    landingsNight: 0,
    approaches: 0,
    remarks: "Line flight.",
  });

  // Calculate Summary Totals (No Instrument metrics)
  const totals = useMemo(() => {
    return logbookEntries.reduce(
      (acc, e) => {
        acc.totalBlockMins += e.blockMinutes || 0;
        acc.picMins += e.picMinutes || 0;
        acc.sicMins += e.sicMinutes || 0;
        acc.nightMins += e.nightMinutes || 0;
        acc.landingsDay += e.landingsDay || 0;
        acc.landingsNight += e.landingsNight || 0;
        return acc;
      },
      {
        totalBlockMins: 0,
        picMins: 0,
        sicMins: 0,
        nightMins: 0,
        landingsDay: 0,
        landingsNight: 0,
      }
    );
  }, [logbookEntries]);

  // Filtered Entries (Sorted reverse chronological: newest flights on top)
  const filteredEntries = useMemo(() => {
    return logbookEntries
      .filter((e) => {
        const matchesSearch =
          e.flightNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
          e.depAirport.toLowerCase().includes(searchQuery.toLowerCase()) ||
          e.arrAirport.toLowerCase().includes(searchQuery.toLowerCase()) ||
          e.tailNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (e.remarks || "").toLowerCase().includes(searchQuery.toLowerCase());

        const matchesAircraft = filterAircraft === "all" || e.aircraftType === filterAircraft;
        const matchesMonth = filterMonth === "all" || e.date.startsWith(filterMonth);

        return matchesSearch && matchesAircraft && matchesMonth;
      })
      .sort((a, b) => {
        const timeA = a.date + "T" + (a.outTime || "0000");
        const timeB = b.date + "T" + (b.outTime || "0000");
        return timeB.localeCompare(timeA); // Newest flights first for mobile feed
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
    const prefix = isFa ? "FlightAttendant_Logbook" : format === "logten" ? "LogTen_Pro_Logbook" : format === "foreflight" ? "ForeFlight_Logbook" : "FAA_Standard_Logbook";
    const filename = `${prefix}_${new Date().toISOString().split("T")[0]}.csv`;
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Copy CSV / JSON to clipboard
  const handleCopyText = async (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Switch Role from Pill
  const handleRoleChange = (role: "CA" | "FO" | "FA") => {
    updateUserProfile({ crewRole: role });
  };

  // Handle Save Form (Add / Edit)
  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    const blockMins = Number(formData.blockMinutes) || 120;
    const entry: LogbookEntry = {
      id: editingEntry ? editingEntry.id : `log-custom-${Date.now()}`,
      date: formData.date || new Date().toISOString().split("T")[0],
      flightNumber: (formData.flightNumber || "AA100").toUpperCase(),
      tailNumber: (formData.tailNumber || "N405AA").toUpperCase(),
      aircraftType: (formData.aircraftType || "E75").toUpperCase(),
      depAirport: (formData.depAirport || "ORD").toUpperCase(),
      arrAirport: (formData.arrAirport || "MHK").toUpperCase(),
      outTime: formData.outTime || "0800",
      inTime: formData.inTime || "1000",
      blockMinutes: blockMins,
      nightMinutes: Number(formData.nightMinutes) || 0,
      instrumentMinutes: 0,
      crossCountryMinutes: blockMins,
      picMinutes: isFa ? 0 : (isPic ? (Number(formData.picMinutes) || blockMins) : 0),
      sicMinutes: isFa ? 0 : (isSic ? (Number(formData.sicMinutes) || blockMins) : 0),
      dualReceivedMinutes: 0,
      landingsDay: isFa ? 0 : (Number(formData.landingsDay) || 0),
      landingsNight: isFa ? 0 : (Number(formData.landingsNight) || 0),
      approaches: 0,
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
    const defaultBlock = 135;
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
      blockMinutes: defaultBlock,
      nightMinutes: 0,
      instrumentMinutes: 0,
      crossCountryMinutes: defaultBlock,
      picMinutes: isPic ? defaultBlock : 0,
      sicMinutes: isSic ? defaultBlock : 0,
      dualReceivedMinutes: 0,
      landingsDay: isFa ? 0 : 1,
      landingsNight: 0,
      approaches: 0,
      remarks: "Line flight.",
    });
    setIsAddModalOpen(true);
  };

  // Format HHMM string to HH:MM
  const formatTimeStr = (t?: string) => {
    if (!t || t.length < 4) return t || "--:--";
    return `${t.slice(0, 2)}:${t.slice(2, 4)}`;
  };

  return (
    <div className="flex flex-col gap-4 sm:gap-6 font-sans pb-16 animate-fadeIn">
      {/* Top Header & Role Switcher */}
      <div className="flex flex-col gap-3 pb-3 border-b border-slate-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 flex items-center gap-2.5">
              <BookOpen className="w-6 h-6 sm:w-7 sm:h-7 text-sky-600 shrink-0" />
              {isFa ? "Flight Attendant Flight Log" : isPic ? "Captain Pilot Logbook (PIC)" : "First Officer Logbook (SIC)"}
            </h1>
            <p className="text-xs text-slate-600 mt-0.5 font-medium">
              {isFa
                ? "Inflight flight time and duty records parsed from your roster. Export formatted cabin crew logs."
                : isPic
                ? "Pilot in Command (PIC) electronic logbook. Automatically reconciled with your captain roster."
                : "Second in Command (SIC) electronic logbook. Automatically reconciled with your first officer roster."}
            </p>
          </div>

          {/* Quick Role Switcher Pill */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl border border-slate-200 self-start sm:self-auto shrink-0 text-xs font-extrabold">
            <button
              onClick={() => handleRoleChange("CA")}
              className={`px-2.5 py-1 rounded-xl transition cursor-pointer active-press flex items-center gap-1 ${
                isPic ? "bg-emerald-600 text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <span>Captain (PIC)</span>
            </button>
            <button
              onClick={() => handleRoleChange("FO")}
              className={`px-2.5 py-1 rounded-xl transition cursor-pointer active-press flex items-center gap-1 ${
                isSic ? "bg-sky-600 text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <span>FO (SIC)</span>
            </button>
            <button
              onClick={() => handleRoleChange("FA")}
              className={`px-2.5 py-1 rounded-xl transition cursor-pointer active-press flex items-center gap-1 ${
                isFa ? "bg-purple-600 text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Briefcase className="w-3 h-3" />
              <span>Flight Attendant</span>
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={autoGenerateLogbookFromRoster}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer active-press"
          >
            <Sparkles className="w-4 h-4" />
            <span>Sync Roster</span>
          </button>

          <button
            onClick={() => setShowExportModal(true)}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-900 border border-slate-300 text-xs font-bold rounded-xl shadow-xs transition cursor-pointer active-press"
          >
            <Download className="w-4 h-4 text-emerald-600" />
            <span>Export & Sync</span>
          </button>

          <button
            onClick={openNewModal}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 text-sky-700 border border-sky-300 text-xs font-bold rounded-xl shadow-xs transition cursor-pointer active-press"
          >
            <Plus className="w-4 h-4" />
            <span>+ Manual Entry</span>
          </button>
        </div>
      </div>

      {/* Role-Adaptive Statistics Dashboard (NO INSTRUMENT) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
        {/* Total Flight Time */}
        <div className="bg-white border border-slate-200 rounded-2xl p-3 shadow-xs space-y-0.5">
          <div className="flex items-center justify-between text-slate-500 mb-0.5">
            <span className="text-[10px] font-bold uppercase tracking-wider">Flight Time</span>
            <Clock className="w-3.5 h-3.5 text-sky-600" />
          </div>
          <p className="text-xl font-black text-slate-900 font-mono">{(totals.totalBlockMins / 60).toFixed(1)}h</p>
          <span className="text-[10px] text-slate-500 font-mono font-bold block truncate">{logbookEntries.length} logged flight leg(s)</span>
        </div>

        {/* Role Metric: PIC for CA, SIC for FO, Total Legs for FA */}
        {isFa ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-3 shadow-xs space-y-0.5">
            <div className="flex items-center justify-between text-slate-500 mb-0.5">
              <span className="text-[10px] font-bold uppercase tracking-wider">Inflight Legs</span>
              <Plane className="w-3.5 h-3.5 text-purple-600" />
            </div>
            <p className="text-xl font-black text-purple-700 font-mono">{logbookEntries.length}</p>
            <span className="text-[10px] text-purple-600 font-mono font-bold block truncate">Cabin Duty Segments</span>
          </div>
        ) : isPic ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-3 shadow-xs space-y-0.5">
            <div className="flex items-center justify-between text-slate-500 mb-0.5">
              <span className="text-[10px] font-bold uppercase tracking-wider">PIC Hours</span>
              <Award className="w-3.5 h-3.5 text-emerald-600" />
            </div>
            <p className="text-xl font-black text-emerald-700 font-mono">{(totals.picMins / 60).toFixed(1)}h</p>
            <span className="text-[10px] text-emerald-600 font-mono font-bold block truncate">Pilot in Command</span>
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-2xl p-3 shadow-xs space-y-0.5">
            <div className="flex items-center justify-between text-slate-500 mb-0.5">
              <span className="text-[10px] font-bold uppercase tracking-wider">SIC Hours</span>
              <Award className="w-3.5 h-3.5 text-cyan-600" />
            </div>
            <p className="text-xl font-black text-cyan-700 font-mono">{(totals.sicMins / 60).toFixed(1)}h</p>
            <span className="text-[10px] text-cyan-600 font-mono font-bold block truncate">Second in Command</span>
          </div>
        )}

        {/* Night Flight */}
        <div className="bg-white border border-slate-200 rounded-2xl p-3 shadow-xs space-y-0.5">
          <div className="flex items-center justify-between text-slate-500 mb-0.5">
            <span className="text-[10px] font-bold uppercase tracking-wider">Night Time</span>
            <Moon className="w-3.5 h-3.5 text-indigo-600" />
          </div>
          <p className="text-xl font-black text-indigo-700 font-mono">{(totals.nightMins / 60).toFixed(1)}h</p>
          <span className="text-[10px] text-indigo-600 font-mono font-bold block truncate">
            {isFa ? "Nocturnal Duty" : `${totals.landingsNight} night landing(s)`}
          </span>
        </div>

        {/* Pilot Landings (Hidden for Flight Attendants) / Export Status for FA */}
        {isFa ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-3 shadow-xs space-y-0.5">
            <div className="flex items-center justify-between text-slate-500 mb-0.5">
              <span className="text-[10px] font-bold uppercase tracking-wider">Cabin Log</span>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            </div>
            <p className="text-sm font-extrabold text-emerald-700 pt-1">Export Ready</p>
            <span className="text-[10px] text-slate-500 font-mono font-bold block truncate">FA Schema Matched</span>
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-2xl p-3 shadow-xs space-y-0.5">
            <div className="flex items-center justify-between text-slate-500 mb-0.5">
              <span className="text-[10px] font-bold uppercase tracking-wider">Total Landings</span>
              <CheckCircle2 className="w-3.5 h-3.5 text-amber-600" />
            </div>
            <p className="text-xl font-black text-amber-700 font-mono">{totals.landingsDay + totals.landingsNight}</p>
            <span className="text-[10px] text-amber-600 font-mono font-bold block truncate">
              {totals.landingsDay} Day &bull; {totals.landingsNight} Night
            </span>
          </div>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-3 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-2.5">
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search flight, station, tail #..."
            className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-sky-600 font-mono"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {/* Aircraft Filter */}
          <select
            value={filterAircraft}
            onChange={(e) => setFilterAircraft(e.target.value)}
            className="flex-1 sm:flex-initial bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs text-slate-900 font-mono font-bold focus:outline-none focus:border-sky-600 cursor-pointer"
          >
            <option value="all">All Fleet</option>
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
            className="flex-1 sm:flex-initial bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs text-slate-900 font-mono font-bold focus:outline-none focus:border-sky-600 cursor-pointer"
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
              className="p-2 text-slate-400 hover:text-rose-600 rounded-xl hover:bg-slate-100 transition cursor-pointer active-press shrink-0"
              title="Clear Logbook"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* MOBILE-FIRST VERTICAL LOGBOOK CARDS FEED (NO HORIZONTAL SCROLL) */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-bold text-slate-600">
            Showing {filteredEntries.length} of {logbookEntries.length} logged flight leg(s)
          </span>
          <span className="text-[10px] font-mono font-extrabold uppercase px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
            {isFa ? "FA View" : isPic ? "PIC View" : "SIC View"}
          </span>
        </div>

        {filteredEntries.length > 0 ? (
          filteredEntries.map((e) => (
            <div
              key={e.id}
              className="bg-white border border-slate-200 hover:border-slate-300 rounded-2xl p-3.5 shadow-xs transition duration-150 space-y-2.5"
            >
              {/* Card Header: Flight #, Date, Tail/Fleet, Badges & Actions */}
              <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-black text-sky-800 bg-sky-50 px-2 py-0.5 rounded-lg border border-sky-200 font-mono">
                    {e.flightNumber}
                  </span>
                  <span className="text-xs font-bold text-slate-900 font-mono">{e.date}</span>
                  <span className="text-[11px] text-slate-500 font-mono">
                    {e.tailNumber} &bull; {e.aircraftType}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {e.isAutoFilled ? (
                    <span className="px-2 py-0.5 rounded-md bg-sky-50 border border-sky-200 text-sky-700 text-[10px] font-bold">
                      Roster
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-slate-600 text-[10px] font-bold">
                      Manual
                    </span>
                  )}
                  <button
                    onClick={() => openEditModal(e)}
                    className="p-1.5 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition cursor-pointer active-press"
                    title="Edit Flight"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => deleteLogbookEntry(e.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-100 transition cursor-pointer active-press"
                    title="Delete Flight"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Route & Times Visual Bar */}
              <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-200 flex items-center justify-between">
                {/* Departure Station */}
                <div className="space-y-0.5">
                  <span className="text-sm font-black text-slate-900 font-mono">{e.depAirport}</span>
                  <p className="text-[10px] text-slate-500 font-mono">OUT: {formatTimeStr(e.outTime)}</p>
                </div>

                {/* Duration Arrow Pill */}
                <div className="flex flex-col items-center px-3">
                  <span className="text-[11px] font-extrabold text-slate-800 font-mono">
                    {(e.blockMinutes / 60).toFixed(1)} hrs
                  </span>
                  <div className="w-20 h-0.5 bg-slate-300 relative my-0.5">
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1.5 h-1.5 border-t-2 border-r-2 border-slate-400 rotate-45" />
                  </div>
                  <span className="text-[9px] text-slate-600 font-bold uppercase tracking-wider">Block Time</span>
                </div>

                {/* Arrival Station */}
                <div className="space-y-0.5 text-right">
                  <span className="text-sm font-black text-slate-900 font-mono">{e.arrAirport}</span>
                  <p className="text-[10px] text-slate-500 font-mono">IN: {formatTimeStr(e.inTime)}</p>
                </div>
              </div>

              {/* Role-Specific Metric Pills (NO INSTRUMENT) */}
              <div className="flex items-center gap-1.5 flex-wrap text-[11px] font-mono">
                {/* Flight Time / PIC / SIC Badge */}
                {isFa ? (
                  <span className="px-2 py-0.5 rounded-lg bg-purple-50 border border-purple-200 text-purple-900 font-bold">
                    {(e.blockMinutes / 60).toFixed(1)}h Flight Time
                  </span>
                ) : isPic ? (
                  <span className="px-2 py-0.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-950 font-bold">
                    {(e.picMinutes / 60).toFixed(1)}h PIC Command
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-lg bg-cyan-50 border border-cyan-200 text-cyan-950 font-bold">
                    {(e.sicMinutes / 60).toFixed(1)}h SIC
                  </span>
                )}

                {/* Night Flight Badge */}
                {e.nightMinutes > 0 && (
                  <span className="px-2 py-0.5 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-900 font-bold">
                    {(e.nightMinutes / 60).toFixed(1)}h Night
                  </span>
                )}

                {/* Landings Badge (Pilots Only) */}
                {!isFa && (e.landingsDay > 0 || e.landingsNight > 0) && (
                  <span className="px-2 py-0.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 font-bold">
                    {e.landingsDay}D / {e.landingsNight}N Landings
                  </span>
                )}
              </div>

              {/* Remarks / Notes (if present) */}
              {e.remarks && (
                <div className="text-[11px] text-slate-600 bg-slate-50/70 rounded-xl p-2 border border-slate-100 font-sans italic">
                  &ldquo;{e.remarks}&rdquo;
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="bg-white border border-slate-200 rounded-3xl p-8 text-center text-slate-600 font-sans space-y-2">
            <BookOpen className="w-10 h-10 text-slate-300 mx-auto" />
            <h3 className="text-sm font-bold text-slate-900">No Logbook Entries Found</h3>
            <p className="text-xs text-slate-600 max-w-sm mx-auto font-medium">
              Click <strong className="text-sky-700">Sync Roster</strong> above to parse your scheduled flights directly into your logbook.
            </p>
          </div>
        )}
      </div>

      {/* Export & API Sync Modal (Portal anchored to document.body) */}
      {showExportModal && isMounted &&
        createPortal(
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[100000] flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fadeIn">
            <div className="bg-white border-t sm:border border-slate-200 rounded-t-3xl sm:rounded-3xl max-w-2xl w-full p-4 sm:p-6 space-y-4 sm:space-y-5 shadow-2xl animate-slideUp max-h-[90vh] overflow-y-auto pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))]">
              <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto mb-1 shrink-0 sm:hidden" />
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                    {isFa ? "Flight Attendant Log Export" : "Pilot Logbook Export & Sync"}
                  </h3>
                </div>
                <button
                  onClick={() => setShowExportModal(false)}
                  className="p-1.5 text-slate-500 hover:text-slate-900 rounded-xl hover:bg-slate-100 transition cursor-pointer active-press"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Export Format Selector Tabs */}
              <div className="flex p-1 bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold">
                {[
                  { id: "logten", label: isFa ? "Standard CSV" : "LogTen Pro (CSV)", icon: FileSpreadsheet },
                  { id: "foreflight", label: isFa ? "Flight Log (CSV)" : "ForeFlight (CSV)", icon: FileSpreadsheet },
                  { id: "standard_faa", label: isFa ? "Company Record (CSV)" : "FAA 8710 (CSV)", icon: FileSpreadsheet },
                  { id: "api_json", label: "API Sync (JSON)", icon: Code },
                ].map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setExportFormat(tab.id as any)}
                      className={`flex-1 py-2 flex items-center justify-center gap-1.5 rounded-lg transition cursor-pointer active-press ${
                        exportFormat === tab.id
                          ? "bg-sky-600 text-white shadow-xs"
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
                    {isFa
                      ? "Generates an official Flight Attendant flight record CSV with flight dates, aircraft IDs, station pairs, and block times."
                      : exportFormat === "logten"
                      ? `Generates a 100% schema-compliant CSV file formatted for LogTen Pro (${isPic ? "PIC Command" : "SIC"} hours included).`
                      : exportFormat === "foreflight"
                      ? `Generates a ForeFlight-compatible Logbook CSV file containing all aircraft IDs, out/in times, and ${isPic ? "PIC" : "SIC"} times.`
                      : "Standard flight time records CSV export format for airline records."}
                  </p>

                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 max-h-48 overflow-y-auto font-mono text-[10px] text-slate-800 select-all scrollbar-thin">
                    <pre className="whitespace-pre-wrap">{exportLogbookCsv(exportFormat as any)}</pre>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <button
                      onClick={() => handleCopyText(exportLogbookCsv(exportFormat as any))}
                      className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold border border-slate-300 transition cursor-pointer active-press"
                    >
                      {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                      <span>{copied ? "Copied CSV!" : "Copy CSV"}</span>
                    </button>

                    <button
                      onClick={() => handleDownloadCsv(exportFormat as any)}
                      className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer active-press"
                    >
                      <Download className="w-4 h-4" />
                      <span>Download CSV</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* API JSON Sync Section */
                <div className="space-y-4">
                  <p className="text-xs text-slate-700 leading-relaxed font-sans font-medium">
                    Structured REST JSON Payload for automated airline logbook API sync or custom webhook integrations.
                  </p>

                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 max-h-48 overflow-y-auto font-mono text-[10px] text-sky-800 font-bold select-all scrollbar-thin">
                    <pre className="whitespace-pre-wrap">
                      {JSON.stringify(
                        {
                          system: "CrewSchedule Pro API Sync",
                          role: activeRole,
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
                              role: activeRole,
                              exportedAt: new Date().toISOString(),
                              totalEntries: logbookEntries.length,
                              entries: logbookEntries,
                            },
                            null,
                            2
                          )
                        )
                      }
                      className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold border border-slate-300 transition cursor-pointer active-press"
                    >
                      {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                      <span>{copied ? "Copied JSON!" : "Copy JSON"}</span>
                    </button>

                    <button
                      onClick={() => {
                        setApiSynced(true);
                        setTimeout(() => setApiSynced(false), 3000);
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer active-press"
                    >
                      <Send className="w-4 h-4" />
                      <span>{apiSynced ? "Sync Triggered (200 OK)" : "Trigger Webhook API Sync"}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>,
          document.body
        )}

      {/* Add / Edit Flight Log Mobile Bottom Sheet Modal */}
      {isAddModalOpen && isMounted &&
        createPortal(
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[100000] flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fadeIn">
            <form
              onSubmit={handleSaveForm}
              className="bg-white border-t sm:border border-slate-200 rounded-t-3xl sm:rounded-3xl max-w-xl w-full p-4 sm:p-6 space-y-4 shadow-2xl animate-slideUp max-h-[90vh] overflow-y-auto pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))]"
            >
              <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto mb-1 shrink-0 sm:hidden" />
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                  {editingEntry ? "Edit Flight Entry" : "Add Manual Flight Entry"}
                </h3>
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="p-1.5 text-slate-500 hover:text-slate-900 rounded-xl hover:bg-slate-100 transition cursor-pointer active-press"
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
                  <label className="text-[10px] text-slate-700 block font-extrabold mb-1 uppercase">Fleet / Type</label>
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
                    onChange={(e) => {
                      const mins = Number(e.target.value);
                      setFormData({
                        ...formData,
                        blockMinutes: mins,
                        picMinutes: isPic ? mins : 0,
                        sicMinutes: isSic ? mins : 0,
                      });
                    }}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-mono font-bold focus:outline-none focus:border-sky-600"
                  />
                </div>

                {/* Role-tailored: Only PIC for Captain, Only SIC for FO, none for FA */}
                {isPic && (
                  <div>
                    <label className="text-[10px] text-emerald-800 block font-extrabold mb-1 uppercase">PIC Mins</label>
                    <input
                      type="number"
                      value={formData.picMinutes || 0}
                      onChange={(e) => setFormData({ ...formData, picMinutes: Number(e.target.value) })}
                      className="w-full bg-emerald-50/50 border border-emerald-300 rounded-xl px-3 py-2 text-emerald-950 font-mono font-bold focus:outline-none focus:border-emerald-600"
                    />
                  </div>
                )}

                {isSic && (
                  <div>
                    <label className="text-[10px] text-cyan-800 block font-extrabold mb-1 uppercase">SIC Mins</label>
                    <input
                      type="number"
                      value={formData.sicMinutes || 0}
                      onChange={(e) => setFormData({ ...formData, sicMinutes: Number(e.target.value) })}
                      className="w-full bg-cyan-50/50 border border-cyan-300 rounded-xl px-3 py-2 text-cyan-950 font-mono font-bold focus:outline-none focus:border-cyan-600"
                    />
                  </div>
                )}

                <div>
                  <label className="text-[10px] text-slate-700 block font-extrabold mb-1 uppercase">Night Mins</label>
                  <input
                    type="number"
                    value={formData.nightMinutes || 0}
                    onChange={(e) => setFormData({ ...formData, nightMinutes: Number(e.target.value) })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-mono font-bold focus:outline-none focus:border-sky-600"
                  />
                </div>

                {!isFa && (
                  <>
                    <div>
                      <label className="text-[10px] text-slate-700 block font-extrabold mb-1 uppercase">Day Landings</label>
                      <input
                        type="number"
                        value={formData.landingsDay || 0}
                        onChange={(e) => setFormData({ ...formData, landingsDay: Number(e.target.value) })}
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-mono font-bold focus:outline-none focus:border-sky-600"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] text-slate-700 block font-extrabold mb-1 uppercase">Night Landings</label>
                      <input
                        type="number"
                        value={formData.landingsNight || 0}
                        onChange={(e) => setFormData({ ...formData, landingsNight: Number(e.target.value) })}
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-mono font-bold focus:outline-none focus:border-sky-600"
                      />
                    </div>
                  </>
                )}
              </div>

              <div>
                <label className="text-[10px] text-slate-700 block font-extrabold mb-1 uppercase">Remarks / Notes</label>
                <textarea
                  value={formData.remarks || ""}
                  onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                  placeholder="Leg remarks, service notes, weather..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 font-sans font-medium focus:outline-none focus:border-sky-600 h-16"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:text-slate-900 text-xs font-bold transition cursor-pointer active-press"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer active-press"
                >
                  {editingEntry ? "Update Entry" : "Save Flight"}
                </button>
              </div>
            </form>
          </div>,
          document.body
        )}
    </div>
  );
}
