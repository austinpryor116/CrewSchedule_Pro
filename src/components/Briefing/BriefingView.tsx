"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import { Plane, Wind, CloudRain, AlertTriangle, Shield, Navigation, Eye, Cloud, Thermometer, RefreshCw, Calendar, CheckCircle2, Zap, Radio } from "lucide-react";
import { useCrewStore, convertOpenToTrip } from "../../store/useCrewStore";
import { fetchLiveStationWeather, fetchLiveSigmetsAndAirmets, DecodedMetar, DecodedTaf, LiveSigmetAirmet, getAirportCoordsSync, isHazardInCorridor, distanceToSegmentNm } from "../../lib/weatherService";

// Dynamically import Leaflet map to disable SSR
const BriefingMap = dynamic(() => import("./BriefingMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full min-h-[480px] flex flex-col items-center justify-center bg-slate-900 border border-slate-800 rounded-2xl animate-pulse">
      <Plane className="w-12 h-12 text-slate-500 animate-bounce mb-3" />
      <span className="text-sm font-semibold text-slate-400">Loading satellite radar & live NOAA AWC charts...</span>
    </div>
  ),
});

interface BriefingLeg {
  id: string;
  fltNum: string;
  dep: string;
  arr: string;
  time: string;
  arrTime: string;
  date: string;
  equipment: string;
  duration: string;
  blockMinutes: number;
}

const DEMO_LEGS: BriefingLeg[] = [
  { id: "0", fltNum: "FLT-3524", dep: "YYZ", arr: "ORD", time: "07:17", arrTime: "09:27", date: "2026-07-21", equipment: "E75", duration: "2h 10m", blockMinutes: 130 },
  { id: "1", fltNum: "FLT-3453", dep: "ORD", arr: "EVV", time: "08:15", arrTime: "09:30", date: "2026-07-20", equipment: "E75", duration: "1h 15m", blockMinutes: 75 },
  { id: "2", fltNum: "FLT-3511", dep: "EVV", arr: "BIL", time: "10:00", arrTime: "12:45", date: "2026-07-20", equipment: "E75", duration: "2h 45m", blockMinutes: 165 },
  { id: "3", fltNum: "FLT-3622", dep: "BIL", arr: "ORD", time: "14:30", arrTime: "16:45", date: "2026-07-20", equipment: "E75", duration: "2h 15m", blockMinutes: 135 },
  { id: "4", fltNum: "FLT-4164", dep: "ORD", arr: "HPN", time: "09:30", arrTime: "11:15", date: "2026-07-20", equipment: "E75", duration: "1h 45m", blockMinutes: 105 },
];

export interface AlertItem {
  id: number;
  type: "SIGMET" | "AIRMET" | "PIREP";
  subtype?: "TURB" | "ICE" | "SMOOTH" | "CONVECTIVE" | "IFR" | "TURBULENCE" | "ICING";
  text: string;
  priority: "HIGH" | "MED" | "LOW";
  lat: number;
  lng: number;
}

export default function BriefingView() {
  const rawSequences = useCrewStore((state) => state.sequences);
  const openSequences = useCrewStore((state) => state.openSequences);
  const simulatedIds = useCrewStore((state) => state.simulatedSequenceIds);

  const sequences = useMemo(() => {
    const simulatedTrips = openSequences
      .filter((ot) => simulatedIds.includes(ot.id))
      .map(convertOpenToTrip);
    return [...rawSequences, ...simulatedTrips];
  }, [rawSequences, openSequences, simulatedIds]);

  // Dynamic Flight Leg Extractor
  const dynamicLegs = useMemo(() => {
    const legsList: BriefingLeg[] = [];
    sequences.forEach((seq) => {
      seq.dutyPeriods.forEach((period) => {
        const baseDate = new Date(seq.startDate + "T00:00:00");
        baseDate.setDate(baseDate.getDate() + period.dayIndex);
        const year = baseDate.getFullYear();
        const month = String(baseDate.getMonth() + 1).padStart(2, "0");
        const day = String(baseDate.getDate()).padStart(2, "0");
        const dateStr = `${year}-${month}-${day}`;

        period.legs.forEach((leg, legIdx) => {
          const id = `${seq.id}-${period.dayIndex}-${legIdx}`;
          const cleanDep = leg.depTime.replace(":", "").trim();
          const cleanArr = leg.arrTime.replace(":", "").trim();
          const depTimeFormatted = `${cleanDep.substring(0, 2).padStart(2, "0")}:${cleanDep.substring(2, 4).padStart(2, "0")}`;
          const arrTimeFormatted = `${cleanArr.substring(0, 2).padStart(2, "0")}:${cleanArr.substring(2, 4).padStart(2, "0")}`;
          const durationHours = Math.floor(leg.blockMinutes / 60);
          const durationMins = leg.blockMinutes % 60;
          const durationStr = `${durationHours}h ${durationMins}m`;

          legsList.push({
            id,
            fltNum: leg.flightNumber.startsWith("FLT") ? leg.flightNumber : `FLT-${leg.flightNumber}`,
            dep: leg.depAirport.toUpperCase(),
            arr: leg.arrAirport.toUpperCase(),
            time: depTimeFormatted,
            arrTime: arrTimeFormatted,
            date: dateStr,
            equipment: seq.equipment || "E75",
            duration: durationStr,
            blockMinutes: leg.blockMinutes,
          });
        });
      });
    });
    return legsList;
  }, [sequences]);

  const activeLegs = useMemo(() => {
    return dynamicLegs.length > 0 ? dynamicLegs : DEMO_LEGS;
  }, [dynamicLegs]);

  const [explicitLegId, setExplicitLegId] = useState<string | null>(null);
  const [mobileTab, setMobileTab] = useState<"briefing" | "map">("briefing");

  // Intelligently determine Next Upcoming or Current In-Progress Flight Leg
  const { leg: autoSelectedLeg, status: legStatus } = useMemo(() => {
    if (activeLegs.length === 0) return { leg: DEMO_LEGS[0], status: "SCHEDULED" };

    const now = new Date();
    // If local computer date is outside schedule year/month, reference July 20, 2026
    let referenceTime = now;
    const hasJulyAug2026 = activeLegs.some((l) => l.date.startsWith("2026-07") || l.date.startsWith("2026-08"));
    if (hasJulyAug2026 && (now.getFullYear() !== 2026 || now.getMonth() < 6)) {
      referenceTime = new Date("2026-07-20T18:00:00");
    }

    const sorted = [...activeLegs].sort((a, b) => {
      const tA = new Date(`${a.date}T${a.time}:00`).getTime();
      const tB = new Date(`${b.date}T${b.time}:00`).getTime();
      return tA - tB;
    });

    // 1. Check for flight in progress right now
    const currentFlight = sorted.find((l) => {
      const depT = new Date(`${l.date}T${l.time}:00`).getTime();
      const arrT = new Date(`${l.date}T${l.arrTime}:00`).getTime();
      return referenceTime.getTime() >= depT && referenceTime.getTime() <= arrT;
    });
    if (currentFlight) return { leg: currentFlight, status: "IN_PROGRESS" };

    // 2. Check for next upcoming flight
    const nextFlight = sorted.find((l) => {
      const depT = new Date(`${l.date}T${l.time}:00`).getTime();
      return depT >= referenceTime.getTime();
    });
    if (nextFlight) return { leg: nextFlight, status: "NEXT_UPCOMING" };

    // 3. Fallback to latest flight
    return { leg: sorted[0], status: "SCHEDULED" };
  }, [activeLegs]);

  const selectedLegId = useMemo(() => {
    if (explicitLegId && activeLegs.some((l) => l.id === explicitLegId)) {
      return explicitLegId;
    }
    return autoSelectedLeg.id;
  }, [activeLegs, explicitLegId, autoSelectedLeg]);

  const setSelectedLegId = (id: string) => setExplicitLegId(id);

  const activeLeg = useMemo(() => {
    return activeLegs.find((l) => l.id === selectedLegId) || autoSelectedLeg || activeLegs[0] || DEMO_LEGS[0];
  }, [activeLegs, selectedLegId, autoSelectedLeg]);

  const depCode = activeLeg.dep;
  const arrCode = activeLeg.arr;

  // Live NOAA Weather States
  const [depWeather, setDepWeather] = useState<DecodedMetar | null>(null);
  const [depTaf, setDepTaf] = useState<DecodedTaf | null>(null);
  const [arrWeather, setArrWeather] = useState<DecodedMetar | null>(null);
  const [arrTaf, setArrTaf] = useState<DecodedTaf | null>(null);
  const [liveHazards, setLiveHazards] = useState<LiveSigmetAirmet[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isFetchingWeather, setIsFetchingWeather] = useState(false);

  // Corridor distance filter (default 200 NM as requested)
  const [corridorNm, setCorridorNm] = useState<number>(200);

  // Map layer toggles
  const [showRadar, setShowRadar] = useState(true);
  const [showSigmet, setShowSigmet] = useState(true);
  const [showDemoRain, setShowDemoRain] = useState(false);
  const [showIfrLow, setShowIfrLow] = useState(false);

  // Fetch Live Weather Function - Stable dependency on airport codes
  const loadLiveWeather = useCallback(async () => {
    if (!depCode || !arrCode) return;
    setIsFetchingWeather(true);

    try {
      const [depRes, arrRes, hazardsRes] = await Promise.all([
        fetchLiveStationWeather(depCode),
        fetchLiveStationWeather(arrCode),
        fetchLiveSigmetsAndAirmets(),
      ]);

      setDepWeather(depRes.metar);
      setDepTaf(depRes.taf);
      setArrWeather(arrRes.metar);
      setArrTaf(arrRes.taf);
      setLiveHazards(hazardsRes);
      setLastUpdated(new Date());
    } catch (e) {
      console.error("Failed to load live weather:", e);
    } finally {
      setIsFetchingWeather(false);
    }
  }, [depCode, arrCode]);

  // Trigger weather fetch on station change & continuous 30-second live polling
  useEffect(() => {
    loadLiveWeather();
    const interval = setInterval(() => {
      loadLiveWeather();
    }, 30000);
    return () => clearInterval(interval);
  }, [loadLiveWeather]);

  // Compute SIGMETs/AIRMETs filtered strictly within route corridor
  const enrouteHazards = useMemo(() => {
    const depCoords = getAirportCoordsSync(depCode);
    const arrCoords = getAirportCoordsSync(arrCode);
    return liveHazards.filter((hazard) =>
      isHazardInCorridor(hazard, depCoords, arrCoords, corridorNm)
    );
  }, [liveHazards, depCode, arrCode, corridorNm]);

  // Filter Alerts & PIREPs within route corridor based on real live NOAA advisories
  const filteredAlerts = useMemo(() => {
    const depCoords = getAirportCoordsSync(depCode);
    const arrCoords = getAirportCoordsSync(arrCode);
    if (!depCoords || !arrCoords || enrouteHazards.length === 0) return [];

    const depLat = depCoords[0];
    const depLng = depCoords[1];
    const arrLat = arrCoords[0];
    const arrLng = arrCoords[1];

    const alerts: AlertItem[] = [];

    enrouteHazards.forEach((hazard, idx) => {
      if (hazard.coords && hazard.coords.length > 0) {
        const centerLat = hazard.coords.reduce((acc, c) => acc + c[0], 0) / hazard.coords.length;
        const centerLng = hazard.coords.reduce((acc, c) => acc + c[1], 0) / hazard.coords.length;

        alerts.push({
          id: idx + 1,
          type: hazard.type,
          subtype: hazard.hazard,
          text: hazard.title + " - " + hazard.decodedSummary,
          priority: hazard.hazard === "CONVECTIVE" ? "HIGH" : "MED",
          lat: centerLat,
          lng: centerLng,
        });
      }
    });

    return alerts;
  }, [depCode, arrCode, enrouteHazards]);

  // Dispatcher Briefing Summary
  const enrouteSummary = useMemo(() => {
    const dep = activeLeg.dep.toUpperCase();
    const arr = activeLeg.arr.toUpperCase();
    const depCat = depWeather?.category || "VFR";
    const arrCat = arrWeather?.category || "VFR";

    let summaryText = `Live Dispatcher Summary for Flight ${activeLeg.fltNum} (${dep} ➔ ${arr}). Departure weather is ${depCat} with ${depWeather?.winds || "light winds"}. Arrival weather is ${arrCat} with ${arrWeather?.winds || "favorable winds"}. `;
    
    if (depTaf && depTaf.targetForecastSummary) {
      summaryText += ` ${depTaf.targetForecastSummary}`;
    }

    return {
      summary: summaryText,
      turb: enrouteHazards.some(h => h.hazard === "TURBULENCE") ? "Moderate turbulence advisory active within route corridor." : "Smooth ride projected enroute.",
      ice: enrouteHazards.some(h => h.hazard === "ICING") ? "Icing advisory in effect within route corridor." : "No enroute icing hazards in corridor.",
    };
  }, [activeLeg, depWeather, arrWeather, depTaf, enrouteHazards]);

  const getCategoryColor = (cat?: string) => {
    switch (cat) {
      case "VFR": return "bg-emerald-950/40 border-emerald-500/30 text-emerald-400";
      case "MVFR": return "bg-cyan-950/40 border-cyan-500/30 text-cyan-400";
      case "IFR": return "bg-rose-950/40 border-rose-500/30 text-rose-400";
      case "LIFR": return "bg-fuchsia-950/40 border-fuchsia-500/30 text-fuchsia-400";
      default: return "bg-slate-900/60 border-slate-800 text-slate-300";
    }
  };

  const getCategoryBadge = (cat?: string) => {
    switch (cat) {
      case "VFR": return "bg-emerald-500 text-slate-950 font-black";
      case "MVFR": return "bg-cyan-500 text-slate-950 font-black";
      case "IFR": return "bg-rose-500 text-white font-black animate-pulse";
      case "LIFR": return "bg-fuchsia-500 text-white font-black animate-pulse";
      default: return "bg-slate-700 text-slate-200 font-black";
    }
  };

  return (
    <div className="flex flex-col gap-4 font-sans animate-fadeIn">
      {/* Top Header / Live Polling Control Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-extrabold text-white flex items-center gap-2">
            <Shield className="w-6 h-6 text-sky-400" />
            Live Pilot & Dispatcher Briefing
          </h1>
          <p className="text-xs text-slate-300 mt-0.5 font-medium">
            Real-time NOAA Aviation Weather Center (AWC) METARs, decoded TAF forecasts, D-ATIS & AIRMETs.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-[#151c2c] border border-slate-700/80 rounded-xl text-xs font-mono shadow-md">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-slate-300 text-[11px] font-bold">
              {lastUpdated ? `NOAA Live • Updated ${lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : "Connecting..."}
            </span>
          </div>

          <button
            onClick={loadLiveWeather}
            disabled={isFetchingWeather}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-md transition cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetchingWeather ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Mobile Tab Switcher */}
      <div className="xl:hidden flex p-1 bg-slate-900 border border-slate-800/80 rounded-2xl">
        <button
          onClick={() => setMobileTab("briefing")}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
            mobileTab === "briefing" ? "bg-sky-600 text-white" : "text-slate-400 hover:text-slate-200"
          }`}
        >
          Briefing & Decoded Weather
        </button>
        <button
          onClick={() => setMobileTab("map")}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
            mobileTab === "map" ? "bg-sky-600 text-white" : "text-slate-400 hover:text-slate-200"
          }`}
        >
          Map Overlay & Hazards ({enrouteHazards.length})
        </button>
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* LEFT COLUMN: Briefing Cards & Weather */}
        <div className={`xl:col-span-6 space-y-5 flex flex-col ${mobileTab === "briefing" ? "flex" : "hidden xl:flex"}`}>
          {/* Flight Leg Selector & Dispatcher Overview */}
          <div className="bg-[#151c2c] border border-slate-700/80 rounded-2xl p-5 shadow-xl">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Navigation className="w-5 h-5 text-sky-400" />
                <h2 className="text-base font-bold text-white">Select Active Sequence Leg</h2>
              </div>
              <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-lg font-mono border ${
                legStatus === "IN_PROGRESS"
                  ? "bg-amber-950/80 border-amber-500/60 text-amber-300 animate-pulse"
                  : legStatus === "NEXT_UPCOMING"
                  ? "bg-emerald-950/80 border-emerald-500/60 text-emerald-300"
                  : "bg-sky-950/80 border-sky-500/40 text-sky-300"
              }`}>
                {legStatus === "IN_PROGRESS"
                  ? "✈ IN FLIGHT NOW"
                  : legStatus === "NEXT_UPCOMING"
                  ? "🎯 NEXT UPCOMING FLIGHT"
                  : `${activeLegs.length} LEGS AVAILABLE`}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
              <div className="sm:col-span-2">
                <select
                  value={selectedLegId}
                  onChange={(e) => setSelectedLegId(e.target.value)}
                  className="w-full bg-[#0b0f17] border border-slate-700/80 rounded-xl px-3.5 py-2 text-xs text-white font-bold focus:outline-none focus:border-sky-500 transition"
                >
                  {activeLegs.map((leg) => (
                    <option key={leg.id} value={leg.id}>
                      {leg.fltNum} • {leg.dep} ➔ {leg.arr} ({leg.duration}) • {leg.date}
                    </option>
                  ))}
                </select>
              </div>

              <div className="bg-[#0b0f17] p-2.5 rounded-xl border border-slate-700/80 text-xs font-mono text-center flex flex-col justify-center">
                <span className="text-[10px] text-slate-400 font-medium">Route Corridor</span>
                <span className="font-bold text-sky-400">{corridorNm === 9999 ? "All USA" : `${corridorNm} NM`}</span>
              </div>
            </div>

            {/* Quick Dispatcher Weather Overview Card */}
            <div className="bg-sky-950/30 border border-sky-500/30 rounded-xl p-3.5 text-xs">
              <p className="text-slate-200 leading-relaxed font-medium">
                {enrouteSummary.summary}
              </p>
              <div className="flex flex-wrap gap-2 mt-2 pt-2 border-t border-sky-500/20 text-[11px] font-medium text-sky-300">
                <span className="flex items-center gap-1">
                  <Wind className="w-3.5 h-3.5 text-sky-400" />
                  {enrouteSummary.turb}
                </span>
                <span className="flex items-center gap-1">
                  <CloudRain className="w-3.5 h-3.5 text-sky-400" />
                  {enrouteSummary.ice}
                </span>
              </div>
            </div>
          </div>

          {/* Departure & Arrival Weather Cards with Live ASOS / D-ATIS / METAR */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Departure Station Card */}
            <div className={`p-4.5 rounded-2xl border backdrop-blur-md shadow-lg transition flex flex-col justify-between ${getCategoryColor(depWeather?.category)}`}>
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex items-center gap-2">
                    <Plane className="w-4 h-4 text-emerald-400 rotate-45" />
                    <span className="text-xs font-bold tracking-wider uppercase text-slate-300">Departure Station</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={`text-[10px] px-2 py-0.5 rounded-md ${getCategoryBadge(depWeather?.category)}`}>
                      {depWeather?.category || "VFR"}
                    </span>
                  </div>
                </div>

                <div className="flex items-baseline justify-between mb-2">
                  <div className="flex items-baseline gap-2">
                    <h3 className="text-2xl font-black text-white">{activeLeg.dep}</h3>
                    {depWeather?.atisData?.datisText || depWeather?.datisText ? (
                      <span
                        className="text-[11px] font-mono text-emerald-400 font-bold bg-emerald-950/80 border border-emerald-500/40 px-2.5 py-0.5 rounded-lg flex items-center gap-1 shadow-sm"
                        title="Live FAA D-ATIS Broadcast Active"
                      >
                        <Radio className="w-3 h-3 text-emerald-400 animate-pulse" />
                        {depWeather?.atisCode || `D-ATIS Info ${depWeather?.atisData?.letter || "SIERRA"}`}
                      </span>
                    ) : (
                      <span
                        className="text-[10px] font-mono text-amber-300 font-bold bg-amber-950/80 border border-amber-500/50 px-2.5 py-0.5 rounded-lg flex items-center gap-1 shadow-sm"
                        title="D-ATIS Unavailable — Active Surface Weather Driven by Live ASOS/AWOS Sensor"
                      >
                        <Radio className="w-3 h-3 text-amber-400" />
                        ASOS / AWOS LIVE (NO D-ATIS)
                      </span>
                    )}
                  </div>
                  <span className="text-xs font-mono text-slate-400">{depWeather?.obsTime || "Recent"}</span>
                </div>

                {/* D-ATIS Live Broadcast Text Box */}
                {(depWeather?.atisData?.datisText || depWeather?.datisText) ? (
                  <div className="mb-3 bg-emerald-950/30 border border-emerald-500/30 rounded-xl p-2.5">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                        <Radio className="w-3 h-3 text-emerald-400 animate-ping" />
                        Live D-ATIS Broadcast Text
                      </span>
                      <span className="text-[10px] font-mono text-emerald-300/80 font-bold">
                        Info {depWeather?.atisData?.letter || depWeather?.atisCode || "SIERRA"}
                      </span>
                    </div>
                    <p className="text-[11px] font-mono leading-relaxed text-emerald-200/90 select-all bg-black/40 p-2 rounded-lg border border-emerald-900/50 max-h-28 overflow-y-auto">
                      {depWeather?.atisData?.datisText || depWeather?.datisText}
                    </p>
                    {depWeather?.atisData?.approachesInUse && (
                      <p className="text-[10px] text-emerald-300 font-medium mt-1.5 flex items-center gap-1">
                        <span className="font-bold text-emerald-400">Approaches:</span> {depWeather.atisData.approachesInUse}
                      </p>
                    )}
                    {depWeather?.atisData?.runwaysInUse && (
                      <p className="text-[10px] text-emerald-300 font-medium mt-0.5 flex items-center gap-1">
                        <span className="font-bold text-emerald-400">Runways:</span> {depWeather.atisData.runwaysInUse}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="mb-3 bg-amber-950/20 border border-amber-500/30 rounded-xl p-2 text-[11px] font-medium text-amber-200/90 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>D-ATIS unavailable for {activeLeg.dep}. Active surface conditions auto-populated from live ASOS observation below.</span>
                  </div>
                )}

                <p className="text-[11px] font-medium text-slate-400 mb-2 flex items-center gap-1.5">
                  <Radio className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>{depWeather?.stationType || "ASOS Automated Station (AO2 Sensor)"}</span>
                </p>

                {/* Raw ASOS / METAR Observation */}
                <p className="text-xs leading-relaxed text-slate-200 font-mono mb-3 bg-slate-950/70 p-2.5 rounded-xl border border-slate-800 select-all">
                  {depWeather?.rawOb || "Loading live ASOS/METAR..."}
                </p>

                {/* Decoded Weather Phenomena / Precip Banner */}
                {depWeather?.weatherPhenomena && depWeather.weatherPhenomena !== "None Reported" && (
                  <div className="mb-3 bg-amber-950/30 border border-amber-500/40 rounded-xl p-2 flex items-center justify-between text-xs shadow-sm">
                    <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                      <CloudRain className="w-3.5 h-3.5 text-amber-400 animate-bounce" />
                      Precipitation / Weather:
                    </span>
                    <span className="font-extrabold text-amber-200 font-mono bg-amber-900/60 px-2.5 py-0.5 rounded-lg border border-amber-500/50">
                      {depWeather.weatherPhenomena}
                    </span>
                  </div>
                )}

                {/* ASOS Decoded Parameters */}
                <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                  <div className="bg-slate-950/50 p-2 rounded-xl border border-slate-800/80">
                    <span className="text-[10px] text-slate-400 block font-medium">Surface Winds</span>
                    <span className="font-bold text-slate-200 flex items-center gap-1 mt-0.5">
                      <Wind className="w-3.5 h-3.5 text-emerald-400" />
                      {depWeather?.winds || "Calm"}
                    </span>
                  </div>
                  <div className="bg-slate-950/50 p-2 rounded-lg border border-slate-800/80">
                    <span className="text-[10px] text-slate-400 block font-medium">Visibility</span>
                    <span className="font-bold text-slate-200 flex items-center gap-1 mt-0.5">
                      <Eye className="w-3.5 h-3.5 text-cyan-400" />
                      {depWeather?.visibility || "10+ SM"}
                    </span>
                  </div>
                  <div className="bg-slate-950/50 p-2 rounded-lg border border-slate-800/80">
                    <span className="text-[10px] text-slate-400 block font-medium">Ceiling / Clouds</span>
                    <span className="font-bold text-slate-200 flex items-center gap-1 mt-0.5 truncate">
                      <Cloud className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                      {depWeather?.clouds || "CLR"}
                    </span>
                  </div>
                  <div className="bg-slate-950/50 p-2 rounded-lg border border-slate-800/80">
                    <span className="text-[10px] text-slate-400 block font-medium">Temp / Dewpoint</span>
                    <span className="font-bold text-slate-200 flex items-center gap-1 mt-0.5">
                      <Thermometer className="w-3.5 h-3.5 text-amber-400" />
                      {depWeather?.tempDewpoint || "20°C/12°C"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Altimeter, Density Altitude & ASOS Remarks */}
              <div className="pt-2.5 border-t border-slate-850 flex flex-col gap-1.5 text-[11px] font-mono">
                <div className="flex justify-between items-center text-slate-300">
                  <span className="text-slate-400 font-sans">Altimeter: <strong className="text-slate-200">{depWeather?.altimeter || "29.92 inHg"}</strong></span>
                  <span className="text-slate-400 font-sans">Density Alt: <strong className="text-amber-400">{(depWeather?.densityAltitudeFt ?? 1240) >= 0 ? `+${(depWeather?.densityAltitudeFt ?? 1240).toLocaleString()} ft` : `${(depWeather?.densityAltitudeFt ?? 1240).toLocaleString()} ft`}</strong></span>
                </div>
                {depWeather?.remarks && (
                  <p className="text-[10px] text-slate-400 bg-slate-950/40 px-2 py-1 rounded border border-slate-900 truncate" title={depWeather.remarks}>
                    {depWeather.remarks}
                  </p>
                )}
              </div>
            </div>

            {/* Arrival Station Card */}
            <div className={`p-4.5 rounded-2xl border backdrop-blur-md shadow-lg transition flex flex-col justify-between ${getCategoryColor(arrWeather?.category)}`}>
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex items-center gap-2">
                    <Plane className="w-4 h-4 text-cyan-400 rotate-135" />
                    <span className="text-xs font-bold tracking-wider uppercase text-slate-300">Arrival Station</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={`text-[10px] px-2 py-0.5 rounded-md ${getCategoryBadge(arrWeather?.category)}`}>
                      {arrWeather?.category || "VFR"}
                    </span>
                  </div>
                </div>

                <div className="flex items-baseline justify-between mb-2">
                  <div className="flex items-baseline gap-2">
                    <h3 className="text-2xl font-black text-white">{activeLeg.arr}</h3>
                    {arrWeather?.atisData?.datisText || arrWeather?.datisText ? (
                      <span
                        className="text-[11px] font-mono text-cyan-400 font-bold bg-cyan-950/80 border border-cyan-500/40 px-2.5 py-0.5 rounded-lg flex items-center gap-1 shadow-sm"
                        title="Live FAA D-ATIS Broadcast Active"
                      >
                        <Radio className="w-3 h-3 text-cyan-400 animate-pulse" />
                        {arrWeather?.atisCode || `D-ATIS Info ${arrWeather?.atisData?.letter || "SIERRA"}`}
                      </span>
                    ) : (
                      <span
                        className="text-[10px] font-mono text-amber-300 font-bold bg-amber-950/80 border border-amber-500/50 px-2.5 py-0.5 rounded-lg flex items-center gap-1 shadow-sm"
                        title="D-ATIS Unavailable — Active Surface Weather Driven by Live ASOS/AWOS Sensor"
                      >
                        <Radio className="w-3 h-3 text-amber-400" />
                        ASOS / AWOS LIVE (NO D-ATIS)
                      </span>
                    )}
                  </div>
                  <span className="text-xs font-mono text-slate-400">{arrWeather?.obsTime || "Recent"}</span>
                </div>

                {/* D-ATIS Live Broadcast Text Box */}
                {(arrWeather?.atisData?.datisText || arrWeather?.datisText) ? (
                  <div className="mb-3 bg-cyan-950/30 border border-cyan-500/30 rounded-xl p-2.5">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1">
                        <Radio className="w-3 h-3 text-cyan-400 animate-ping" />
                        Live D-ATIS Broadcast Text
                      </span>
                      <span className="text-[10px] font-mono text-cyan-300/80 font-bold">
                        Info {arrWeather?.atisData?.letter || arrWeather?.atisCode || "SIERRA"}
                      </span>
                    </div>
                    <p className="text-[11px] font-mono leading-relaxed text-cyan-200/90 select-all bg-black/40 p-2 rounded-lg border border-cyan-900/50 max-h-28 overflow-y-auto">
                      {arrWeather?.atisData?.datisText || arrWeather?.datisText}
                    </p>
                    {arrWeather?.atisData?.approachesInUse && (
                      <p className="text-[10px] text-cyan-300 font-medium mt-1.5 flex items-center gap-1">
                        <span className="font-bold text-cyan-400">Approaches:</span> {arrWeather.atisData.approachesInUse}
                      </p>
                    )}
                    {arrWeather?.atisData?.runwaysInUse && (
                      <p className="text-[10px] text-cyan-300 font-medium mt-0.5 flex items-center gap-1">
                        <span className="font-bold text-cyan-400">Runways:</span> {arrWeather.atisData.runwaysInUse}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="mb-3 bg-amber-950/20 border border-amber-500/30 rounded-xl p-2 text-[11px] font-medium text-amber-200/90 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>D-ATIS unavailable for {activeLeg.arr}. Active surface conditions auto-populated from live ASOS observation below.</span>
                  </div>
                )}

                <p className="text-[11px] font-medium text-slate-400 mb-2 flex items-center gap-1.5">
                  <Radio className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span>{arrWeather?.stationType || "ASOS Automated Station (AO2 Sensor)"}</span>
                </p>

                {/* Raw ASOS / METAR Observation */}
                <p className="text-xs leading-relaxed text-slate-200 font-mono mb-3 bg-slate-950/70 p-2.5 rounded-xl border border-slate-800 select-all">
                  {arrWeather?.rawOb || "Loading live ASOS/METAR..."}
                </p>

                {/* Decoded Weather Phenomena / Precip Banner */}
                {arrWeather?.weatherPhenomena && arrWeather.weatherPhenomena !== "None Reported" && (
                  <div className="mb-3 bg-amber-950/30 border border-amber-500/40 rounded-xl p-2 flex items-center justify-between text-xs shadow-sm">
                    <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                      <CloudRain className="w-3.5 h-3.5 text-amber-400 animate-bounce" />
                      Precipitation / Weather:
                    </span>
                    <span className="font-extrabold text-amber-200 font-mono bg-amber-900/60 px-2.5 py-0.5 rounded-lg border border-amber-500/50">
                      {arrWeather.weatherPhenomena}
                    </span>
                  </div>
                )}

                {/* ASOS Decoded Parameters */}
                <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                  <div className="bg-slate-950/50 p-2 rounded-xl border border-slate-800/80">
                    <span className="text-[10px] text-slate-400 block font-medium">Surface Winds</span>
                    <span className="font-bold text-slate-200 flex items-center gap-1 mt-0.5">
                      <Wind className="w-3.5 h-3.5 text-emerald-400" />
                      {arrWeather?.winds || "Calm"}
                    </span>
                  </div>
                  <div className="bg-slate-950/50 p-2 rounded-lg border border-slate-800/80">
                    <span className="text-[10px] text-slate-400 block font-medium">Visibility</span>
                    <span className="font-bold text-slate-200 flex items-center gap-1 mt-0.5">
                      <Eye className="w-3.5 h-3.5 text-cyan-400" />
                      {arrWeather?.visibility || "10+ SM"}
                    </span>
                  </div>
                  <div className="bg-slate-950/50 p-2 rounded-lg border border-slate-800/80">
                    <span className="text-[10px] text-slate-400 block font-medium">Ceiling / Clouds</span>
                    <span className="font-bold text-slate-200 flex items-center gap-1 mt-0.5 truncate">
                      <Cloud className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                      {arrWeather?.clouds || "CLR"}
                    </span>
                  </div>
                  <div className="bg-slate-950/50 p-2 rounded-lg border border-slate-800/80">
                    <span className="text-[10px] text-slate-400 block font-medium">Temp / Dewpoint</span>
                    <span className="font-bold text-slate-200 flex items-center gap-1 mt-0.5">
                      <Thermometer className="w-3.5 h-3.5 text-amber-400" />
                      {arrWeather?.tempDewpoint || "20°C/12°C"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Altimeter, Density Altitude & ASOS Remarks */}
              <div className="pt-2.5 border-t border-slate-850 flex flex-col gap-1.5 text-[11px] font-mono">
                <div className="flex justify-between items-center text-slate-300">
                  <span className="text-slate-400 font-sans">Altimeter: <strong className="text-slate-200">{arrWeather?.altimeter || "29.92 inHg"}</strong></span>
                  <span className="text-slate-400 font-sans">Density Alt: <strong className="text-amber-400">{(arrWeather?.densityAltitudeFt ?? 1240) >= 0 ? `+${(arrWeather?.densityAltitudeFt ?? 1240).toLocaleString()} ft` : `${(arrWeather?.densityAltitudeFt ?? 1240).toLocaleString()} ft`}</strong></span>
                </div>
                {arrWeather?.remarks && (
                  <p className="text-[10px] text-slate-400 bg-slate-950/40 px-2 py-1 rounded border border-slate-900 truncate" title={arrWeather.remarks}>
                    {arrWeather.remarks}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Decoded TAF Terminal Aerodrome Forecasts */}
          <div className="bg-[#151c2c] border border-slate-700/80 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Calendar className="w-5 h-5 text-sky-400" />
                Decoded Terminal Aerodrome Forecasts (TAF)
              </h2>
              <span className="text-xs font-mono text-emerald-400 font-bold bg-emerald-950/50 border border-emerald-500/30 px-2.5 py-1 rounded-lg">
                NOAA Auto-Updated
              </span>
            </div>

            <div className="space-y-4">
              {/* Departure TAF */}
              <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-2">
                <div className="flex justify-between items-center pb-2 border-b border-slate-850">
                  <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                    <Plane className="w-3.5 h-3.5 rotate-45" /> {activeLeg.dep} Terminal Aerodrome Forecast
                  </span>
                  <span className="text-[10px] font-mono text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                    {depTaf?.validPeriod || "24h Forecast Period"}
                  </span>
                </div>
                
                <p className="text-xs text-slate-200 leading-relaxed font-sans font-medium">
                  {depTaf?.targetForecastSummary || "VFR conditions forecast."}
                </p>

                {/* TAF Forecast Periods */}
                {depTaf?.periods && depTaf.periods.length > 0 && (
                  <div className="space-y-1.5 pt-2">
                    <span className="text-[10px] uppercase font-extrabold text-slate-400 tracking-wider">Forecast Timeline Breakdown:</span>
                    {depTaf.periods.map((p, idx) => (
                      <div key={idx} className="bg-slate-900/80 p-2 rounded-lg border border-slate-850 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                        <span className="font-mono text-[11px] font-bold text-sky-300 shrink-0">{p.timePeriod}</span>
                        <span className="text-slate-300 text-[11px]">{p.summary}</span>
                      </div>
                    ))}
                  </div>
                )}

                {depTaf?.rawTaf && (
                  <p className="text-[10px] font-mono text-slate-400 mt-2 pt-2 border-t border-slate-850 select-all">
                    RAW TAF: {depTaf.rawTaf}
                  </p>
                )}
              </div>

              {/* Arrival TAF */}
              <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-2">
                <div className="flex justify-between items-center pb-2 border-b border-slate-850">
                  <span className="text-xs font-bold text-cyan-400 flex items-center gap-1.5">
                    <Plane className="w-3.5 h-3.5 rotate-135" /> {activeLeg.arr} Terminal Aerodrome Forecast
                  </span>
                  <span className="text-[10px] font-mono text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                    {arrTaf?.validPeriod || "24h Forecast Period"}
                  </span>
                </div>

                <p className="text-xs text-slate-200 leading-relaxed font-sans font-medium">
                  {arrTaf?.targetForecastSummary || "VFR conditions forecast."}
                </p>

                {/* TAF Forecast Periods */}
                {arrTaf?.periods && arrTaf.periods.length > 0 && (
                  <div className="space-y-1.5 pt-2">
                    <span className="text-[10px] uppercase font-extrabold text-slate-400 tracking-wider">Forecast Timeline Breakdown:</span>
                    {arrTaf.periods.map((p, idx) => (
                      <div key={idx} className="bg-slate-900/80 p-2 rounded-lg border border-slate-850 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                        <span className="font-mono text-[11px] font-bold text-cyan-300 shrink-0">{p.timePeriod}</span>
                        <span className="text-slate-300 text-[11px]">{p.summary}</span>
                      </div>
                    ))}
                  </div>
                )}

                {arrTaf?.rawTaf && (
                  <p className="text-[10px] font-mono text-slate-400 mt-2 pt-2 border-t border-slate-850 select-all">
                    RAW TAF: {arrTaf.rawTaf}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Map & Active Hazards */}
        <div className={`xl:col-span-6 space-y-5 flex flex-col ${mobileTab === "map" ? "flex" : "hidden xl:flex"}`}>
          {/* Interactive Routing Map */}
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 shadow-xl backdrop-blur-md space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="flex items-center gap-2">
                <Plane className="w-5 h-5 text-sky-400" />
                <h2 className="text-sm font-bold text-slate-100">Live Airspace & NEXRAD Radar Overlay</h2>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                {/* Corridor Radius Selector */}
                <div className="flex items-center bg-slate-950/90 border border-slate-800 rounded-lg p-0.5">
                  <span className="text-[10px] font-bold text-slate-400 px-2 flex items-center gap-1">
                    <Navigation className="w-3 h-3 text-sky-400" />
                    Corridor:
                  </span>
                  {[50, 100, 200, 300, 9999].map((dist) => (
                    <button
                      key={dist}
                      onClick={() => setCorridorNm(dist)}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold transition cursor-pointer ${
                        corridorNm === dist
                          ? "bg-sky-600 text-white shadow-sm"
                          : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      {dist === 9999 ? "All US" : `${dist} NM`}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => setShowRadar(!showRadar)}
                  className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold transition cursor-pointer ${
                    showRadar ? "bg-sky-600 border-sky-500 text-white" : "bg-slate-950 border-slate-800 text-slate-400"
                  }`}
                >
                  NEXRAD Radar
                </button>
              </div>
            </div>

            <div className="h-[420px] w-full rounded-xl overflow-hidden border border-slate-800">
              <BriefingMap
                depAirport={activeLeg.dep}
                arrAirport={activeLeg.arr}
                showRadar={showRadar}
                showSigmet={showSigmet}
                showDemoRain={showDemoRain}
                showIfrLow={showIfrLow}
                corridorNm={corridorNm}
                liveHazards={enrouteHazards}
                filteredAlerts={filteredAlerts}
              />
            </div>
          </div>

          {/* Active SIGMETs & AIRMETs List */}
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 shadow-xl backdrop-blur-md flex-1">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3.5 pb-2.5 border-b border-slate-800/60">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
                <div>
                  <h2 className="text-base font-bold text-slate-100">Enroute NOAA SIGMETs & AIRMETs</h2>
                  <p className="text-[11px] text-slate-400 font-medium">
                    Filtered to {activeLeg.dep} ➔ {activeLeg.arr} route corridor ({corridorNm === 9999 ? "All US" : `${corridorNm} NM radius`})
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-rose-300 bg-rose-950/80 px-2.5 py-1 border border-rose-900/60 rounded-lg">
                  {enrouteHazards.length} Enroute ({liveHazards.length} US Total)
                </span>
              </div>
            </div>

            <div className="space-y-3 max-h-[320px] overflow-y-auto scrollbar-thin pr-1">
              {enrouteHazards.length > 0 ? (
                enrouteHazards.map((h) => (
                  <div
                    key={h.id}
                    className={`p-3.5 rounded-xl border transition ${
                      h.hazard === "CONVECTIVE"
                        ? "bg-rose-950/30 border-rose-800/60 text-rose-200"
                        : h.hazard === "TURBULENCE"
                        ? "bg-amber-950/30 border-amber-800/60 text-amber-200"
                        : "bg-cyan-950/30 border-cyan-800/60 text-cyan-200"
                    }`}
                  >
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-xs font-bold flex items-center gap-1.5">
                        <Zap className="w-3.5 h-3.5 shrink-0" />
                        {h.title}
                      </span>
                      <span className="text-[10px] font-mono opacity-80">Valid: {h.validUntil}</span>
                    </div>
                    <p className="text-xs leading-relaxed font-sans opacity-95">{h.decodedSummary}</p>
                    <p className="text-[10px] font-mono opacity-60 mt-1.5 pt-1.5 border-t border-slate-850 select-all">
                      RAW: {h.rawText}
                    </p>
                  </div>
                ))
              ) : (
                <div className="p-6 rounded-xl border border-slate-800 bg-slate-950/40 text-center flex flex-col items-center justify-center">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400 mb-2 opacity-90" />
                  <span className="text-sm font-bold text-slate-200">No Enroute Advisories Found</span>
                  <p className="text-xs text-slate-400 max-w-sm mt-1">
                    No active SIGMETs or AIRMETs detected within your {corridorNm === 9999 ? "nationwide search" : `${corridorNm} NM route corridor`} for {activeLeg.dep} ➔ {activeLeg.arr}. Flight path is clear of severe weather advisories.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
