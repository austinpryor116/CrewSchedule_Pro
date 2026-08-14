"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import { Plane, Wind, CloudRain, CloudSnow, AlertTriangle, Shield, ShieldAlert, Navigation, Eye, Cloud, Thermometer, RefreshCw, Calendar, CheckCircle2, Zap, Radio, Layers, SlidersHorizontal, Map, ChevronDown, ChevronUp, Plus, Trash2, X, Filter } from "lucide-react";
import { useCrewStore, convertOpenToTrip } from "../../store/useCrewStore";
import { fetchLiveStationWeather, fetchLiveSigmetsAndAirmets, fetchLiveLightningStrikes, fetchLiveTurbulenceReports, DecodedMetar, DecodedTaf, LiveSigmetAirmet, LiveLightningStrike, LiveTurbulenceReport, getAirportCoordsSync, isHazardInCorridor, distanceToSegmentNm } from "../../lib/weatherService";

import type { MapTapData } from "./BriefingMap";

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

function computeGreatCircleDistanceNm(c1: [number, number], c2: [number, number]): number {
  const R = 3440.065; // Earth radius in NM
  const lat1 = (c1[0] * Math.PI) / 180;
  const lon1 = (c1[1] * Math.PI) / 180;
  const lat2 = (c2[0] * Math.PI) / 180;
  const lon2 = (c2[1] * Math.PI) / 180;

  const dlat = lat2 - lat1;
  const dlon = lon2 - lon1;

  const a = Math.sin(dlat / 2) * Math.sin(dlat / 2) +
            Math.cos(lat1) * Math.cos(lat2) * Math.sin(dlon / 2) * Math.sin(dlon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
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
  const [mobileTab, setMobileTab] = useState<"map" | "briefing">("map");

  // ForeFlight Flight Plan (FPL) Route State
  const [fplWaypoints, setFplWaypoints] = useState<string[]>(["ORD", "EVV", "DFW"]);
  const [newWaypointInput, setNewWaypointInput] = useState("");
  const [selectedAirportCode, setSelectedAirportCode] = useState<string | null>("ORD");
  const [selectedAirportData, setSelectedAirportData] = useState<DecodedMetar | null>(null);
  const [isAirportLoading, setIsAirportLoading] = useState(false);

  // Intelligently determine Next Upcoming or Current In-Progress Flight Leg
  const { leg: autoSelectedLeg, status: legStatus } = useMemo(() => {
    if (activeLegs.length === 0) return { leg: DEMO_LEGS[0], status: "SCHEDULED" };

    const now = new Date();
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

    const currentFlight = sorted.find((l) => {
      const depT = new Date(`${l.date}T${l.time}:00`).getTime();
      const arrT = new Date(`${l.date}T${l.arrTime}:00`).getTime();
      return referenceTime.getTime() >= depT && referenceTime.getTime() <= arrT;
    });
    if (currentFlight) return { leg: currentFlight, status: "IN_PROGRESS" };

    const nextFlight = sorted.find((l) => {
      const depT = new Date(`${l.date}T${l.time}:00`).getTime();
      return depT >= referenceTime.getTime();
    });
    if (nextFlight) return { leg: nextFlight, status: "NEXT_UPCOMING" };

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

  // Sync FPL waypoints when active leg changes
  useEffect(() => {
    if (depCode && arrCode) {
      setFplWaypoints([depCode, arrCode]);
    }
  }, [depCode, arrCode]);

  // Handle Airport Marker Click / Selection
  const handleAirportSelect = useCallback(async (code: string) => {
    setSelectedAirportCode(code);
    setIsAirportLoading(true);
    try {
      const res = await fetchLiveStationWeather(code);
      setSelectedAirportData(res.metar);
    } catch (e) {
      console.error("Failed to load airport weather:", e);
    } finally {
      setIsAirportLoading(false);
    }
  }, []);

  // FPL Waypoint Helper Functions
  const addWaypointToFpl = (code: string) => {
    const clean = code.trim().toUpperCase();
    if (clean && !fplWaypoints.includes(clean)) {
      setFplWaypoints([...fplWaypoints, clean]);
    }
    setNewWaypointInput("");
  };

  const removeWaypointFromFpl = (idx: number) => {
    if (fplWaypoints.length <= 2) return; // Keep at least departure and arrival
    setFplWaypoints(fplWaypoints.filter((_, i) => i !== idx));
  };

  // Calculate Total Flight Plan Distance (NM)
  const totalFplDistanceNm = useMemo(() => {
    let total = 0;
    for (let i = 0; i < fplWaypoints.length - 1; i++) {
      const c1 = getAirportCoordsSync(fplWaypoints[i]);
      const c2 = getAirportCoordsSync(fplWaypoints[i + 1]);
      if (c1 && c2) {
        total += computeGreatCircleDistanceNm(c1, c2);
      } else {
        total += 350;
      }
    }
    return Math.round(total > 0 ? total : 720);
  }, [fplWaypoints]);

  const estimatedEteHours = (totalFplDistanceNm / 420).toFixed(1); // 420 knots avg groundspeed
  const projectedFuelLbs = (parseFloat(estimatedEteHours) * 3800).toLocaleString(); // 3,800 lbs/hr fuel burn

  // Live NOAA Weather States
  const [depWeather, setDepWeather] = useState<DecodedMetar | null>(null);
  const [depTaf, setDepTaf] = useState<DecodedTaf | null>(null);
  const [arrWeather, setArrWeather] = useState<DecodedMetar | null>(null);
  const [arrTaf, setArrTaf] = useState<DecodedTaf | null>(null);
  const [liveHazards, setLiveHazards] = useState<LiveSigmetAirmet[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isFetchingWeather, setIsFetchingWeather] = useState(false);

  // Corridor distance filter
  const [corridorNm, setCorridorNm] = useState<number>(200);

  // Map layer toggles, airport filters & pop-out menu drawers
  const [showRadar, setShowRadar] = useState(true);
  const [showSatelliteClouds, setShowSatelliteClouds] = useState(false);
  const [showNwsWarnings, setShowNwsWarnings] = useState(true);
  const [showRadarRings, setShowRadarRings] = useState(true);
  const [showSigmet, setShowSigmet] = useState(true);
  const [showSigmetConvective, setShowSigmetConvective] = useState(true);
  const [showSigmetTurbulence, setShowSigmetTurbulence] = useState(true);
  const [showSigmetIcing, setShowSigmetIcing] = useState(true);
  const [showSigmetIfr, setShowSigmetIfr] = useState(false);
  const [showLightning, setShowLightning] = useState(true);
  const [lightningMaxAge, setLightningMaxAge] = useState<number>(15);

  const [showDemoRain, setShowDemoRain] = useState(false);
  const [showAllAirports, setShowAllAirports] = useState(false);
  const [showAirportMarkers, setShowAirportMarkers] = useState(true);
  const [showLayersMenu, setShowLayersMenu] = useState(false);
  const [showFplDrawer, setShowFplDrawer] = useState(false);
  const [showBriefingSheet, setShowBriefingSheet] = useState(false);
  const [showFlightPlan, setShowFlightPlan] = useState(true);
  const [tapLocationData, setTapLocationData] = useState<MapTapData | null>(null);
  const [liveLightning, setLiveLightning] = useState<LiveLightningStrike[]>([]);

  const [showTurbulence, setShowTurbulence] = useState(true);
  const [turbulenceAltBand, setTurbulenceAltBand] = useState<"ALL" | "LOW" | "MID" | "HIGH">("ALL");
  const [liveTurbulence, setLiveTurbulence] = useState<LiveTurbulenceReport[]>([]);

  // Fetch Live Weather (Cached for 5 minutes unless forceRefresh is true)
  const loadLiveWeather = useCallback(async (forceRefresh: boolean = false) => {
    if (!depCode || !arrCode) return;
    setIsFetchingWeather(true);

    try {
      const [depRes, arrRes, hazardsRes, ltgRes, turbRes] = await Promise.all([
        fetchLiveStationWeather(depCode, forceRefresh),
        fetchLiveStationWeather(arrCode, forceRefresh),
        fetchLiveSigmetsAndAirmets(forceRefresh),
        fetchLiveLightningStrikes(forceRefresh),
        fetchLiveTurbulenceReports(forceRefresh),
      ]);

      setDepWeather(depRes.metar);
      setDepTaf(depRes.taf);
      setArrWeather(arrRes.metar);
      setArrTaf(arrRes.taf);
      setLiveHazards(hazardsRes);
      setLiveLightning(ltgRes);
      setLiveTurbulence(turbRes);
      setLastUpdated(new Date());

      if (selectedAirportCode === depCode) setSelectedAirportData(depRes.metar);
      if (selectedAirportCode === arrCode) setSelectedAirportData(arrRes.metar);
    } catch (e) {
      console.error("Failed to load live weather:", e);
    } finally {
      setIsFetchingWeather(false);
    }
  }, [depCode, arrCode, selectedAirportCode]);

  useEffect(() => {
    loadLiveWeather(false);
    // Poll strictly once every 5 minutes (300,000ms), and only when tab/window is visible
    const interval = setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState !== "visible") {
        return; // Suspend background polling when minimized or inactive
      }
      loadLiveWeather(false);
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [loadLiveWeather]);

  // Compute SIGMETs/AIRMETs filtered strictly within route corridor
  const enrouteHazards = useMemo(() => {
    const depCoords = getAirportCoordsSync(depCode);
    const arrCoords = getAirportCoordsSync(arrCode);
    if (!depCoords || !arrCoords) return [];
    return liveHazards.filter((hazard) =>
      isHazardInCorridor(hazard, depCoords, arrCoords, corridorNm)
    );
  }, [liveHazards, depCode, arrCode, corridorNm]);

  const filteredAlerts = useMemo(() => {
    const depCoords = getAirportCoordsSync(depCode);
    const arrCoords = getAirportCoordsSync(arrCode);
    if (!depCoords || !arrCoords || enrouteHazards.length === 0) return [];

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

    // Detect Thunderstorm / Severe Convective weather along route
    const hasConvectiveSigmet = enrouteHazards.some((h) => h.hazard === "CONVECTIVE" || h.type === "SIGMET");
    const depMetarTS = depWeather?.rawOb ? /\b(TS|TSRA|VCTS|SQ|GR|FC|\+RA|CB)\b/.test(depWeather.rawOb) : false;
    const arrMetarTS = arrWeather?.rawOb ? /\b(TS|TSRA|VCTS|SQ|GR|FC|\+RA|CB)\b/.test(arrWeather.rawOb) : false;
    const depTafTS = depTaf?.rawTaf ? /\b(TS|TSRA|VCTS|SQ|GR|FC|CB)\b/.test(depTaf.rawTaf) : false;
    const arrTafTS = arrTaf?.rawTaf ? /\b(TS|TSRA|VCTS|SQ|GR|FC|CB)\b/.test(arrTaf.rawTaf) : false;

    const hasThunderstorm = hasConvectiveSigmet || depMetarTS || arrMetarTS || depTafTS || arrTafTS;
    const hasTurbulence = enrouteHazards.some((h) => h.hazard === "TURBULENCE");
    const hasIcing = enrouteHazards.some((h) => h.hazard === "ICING");

    let summaryText = `Live Dispatcher Summary for Flight ${activeLeg.fltNum} (${dep} ➔ ${arr}). `;

    if (hasThunderstorm) {
      summaryText += `⚡ CAUTION: ACTIVE THUNDERSTORM / CONVECTIVE HAZARD DETECTED ALONG ROUTE! `;
      if (hasConvectiveSigmet) {
        summaryText += `Convective SIGMET active within flight corridor. `;
      }
      if (depMetarTS) {
        summaryText += `Thunderstorms currently reported at departure (${dep}). `;
      }
      if (arrMetarTS) {
        summaryText += `Thunderstorms currently reported at destination (${arr}). `;
      }
    } else {
      summaryText += `Departure weather is ${depCat} with ${depWeather?.winds || "light winds"}. Arrival weather is ${arrCat} with ${arrWeather?.winds || "favorable winds"}. `;
    }

    if (depTaf && depTaf.targetForecastSummary) {
      summaryText += ` ${depTaf.targetForecastSummary}`;
    }

    const activeTurbHazards = enrouteHazards.filter((h) => h.hazard === "TURBULENCE");
    const activeIceHazards = enrouteHazards.filter((h) => h.hazard === "ICING");

    let turbText = "";
    if (hasThunderstorm) {
      turbText = "⚠️ SEVERE / CONVECTIVE TURBULENCE: Expect severe updrafts, downdrafts, and microbursts near active thunderstorm cells.";
    } else if (activeTurbHazards.length > 0) {
      const h = activeTurbHazards[0];
      turbText = `🌬 ${h.title}: ${h.decodedSummary || h.rawText}`;
    } else {
      turbText = "✓ NOAA AIRMET TANGO Scan: Zero active turbulence advisories overlapping route corridor.";
    }

    let iceText = "";
    if (hasThunderstorm) {
      iceText = "⚠️ CONVECTIVE ICING HAZARD: Heavy icing threat inside Cumulonimbus (CB) thunderstorm clouds.";
    } else if (activeIceHazards.length > 0) {
      const h = activeIceHazards[0];
      iceText = `🌧 ${h.title}: ${h.decodedSummary || h.rawText}`;
    } else {
      iceText = "✓ NOAA AIRMET ZULU Scan: Zero active icing advisories overlapping route corridor.";
    }

    const convectiveText = hasThunderstorm
      ? "⚡ ACTIVE CONVECTIVE THUNDERSTORM: Avoid storm cells by 20+ NM."
      : "✓ NOAA CONVECTIVE SIGMET Scan: Zero active convective thunderstorm SIGMETs in corridor.";

    return {
      summary: summaryText,
      hasThunderstorm,
      convective: convectiveText,
      turb: turbText,
      ice: iceText,
    };
  }, [activeLeg, depWeather, arrWeather, depTaf, arrTaf, enrouteHazards]);

  const getCategoryColor = (cat?: string) => {
    switch (cat) {
      case "VFR": return "bg-emerald-50 border-emerald-300 text-emerald-950";
      case "MVFR": return "bg-cyan-50 border-cyan-300 text-cyan-950";
      case "IFR": return "bg-rose-50 border-rose-300 text-rose-950";
      case "LIFR": return "bg-fuchsia-50 border-fuchsia-300 text-fuchsia-950";
      default: return "bg-slate-50 border-slate-200 text-slate-900";
    }
  };

  const getCategoryBadge = (cat?: string) => {
    switch (cat) {
      case "VFR": return "bg-emerald-600 text-white font-black";
      case "MVFR": return "bg-cyan-600 text-white font-black";
      case "IFR": return "bg-rose-600 text-white font-black animate-pulse";
      case "LIFR": return "bg-fuchsia-600 text-white font-black animate-pulse";
      default: return "bg-slate-600 text-white font-black";
    }
  };

  return (
    <div className="relative w-full h-[calc(100vh-64px)] lg:h-full overflow-hidden bg-slate-100 font-sans animate-fadeIn">
      {/* 1. 100% Edge-to-Edge Aeronautical Map Canvas */}
      <div className="absolute inset-0 z-0">
        <BriefingMap
          depAirport={fplWaypoints[0] || "ORD"}
          arrAirport={fplWaypoints[fplWaypoints.length - 1] || "MIA"}
          showFlightPlan={showFlightPlan}
          waypoints={showFlightPlan ? fplWaypoints : []}
          onAirportSelect={handleAirportSelect}
          onMapTap={setTapLocationData}
          showRadar={showRadar}
          showSatelliteClouds={showSatelliteClouds}
          showNwsWarnings={showNwsWarnings}
          showRadarRings={showRadarRings}
          showSigmet={showSigmet}
          showSigmetConvective={showSigmetConvective}
          showSigmetTurbulence={showSigmetTurbulence}
          showSigmetIcing={showSigmetIcing}
          showSigmetIfr={showSigmetIfr}
          showLightning={showLightning}
          lightningMaxAge={lightningMaxAge}
          showDemoRain={showDemoRain}
          showAllAirports={showAllAirports}
          showAirportMarkers={showAirportMarkers}
          corridorNm={corridorNm}
          liveHazards={enrouteHazards}
          liveLightning={liveLightning}
          showTurbulence={showTurbulence}
          turbulenceAltBand={turbulenceAltBand}
          liveTurbulence={liveTurbulence}
          filteredAlerts={filteredAlerts}
        />
      </div>

      {/* 2. Top Edge-to-Edge ForeFlight Controls Bar (Safe below camera notch) */}
      <div className="absolute top-0 inset-x-0 z-20 pointer-events-auto flex flex-col pt-[max(2.75rem,calc(env(safe-area-inset-top,0px)+0.75rem))] px-2.5 pb-2.5 sm:px-4 sm:pb-3 bg-white/95 backdrop-blur-2xl border-b border-slate-200/90 shadow-md">
        {/* Primary Actions (Map Layers | Flight Leg Select | FPL | Briefing | Refresh) */}
        <div className="flex items-center justify-between gap-1 sm:gap-2 w-full">
          {/* Left: Map Layers Button */}
          <div className="relative shrink-0">
            <button
              onClick={() => setShowLayersMenu(!showLayersMenu)}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-2xl border backdrop-blur-xl shadow-sm transition text-xs font-bold cursor-pointer ${
                showLayersMenu
                  ? "bg-slate-900 border-slate-800 text-white shadow-slate-950/20"
                  : "bg-white border-slate-200 text-slate-800 hover:bg-slate-50"
              }`}
            >
              <Layers className={`w-4 h-4 ${showLayersMenu ? "text-sky-400" : "text-slate-700"}`} />
              <span className="hidden xs:inline sm:inline">Map Layers</span>
              <span className="xs:hidden sm:hidden">Layers</span>
              {(showRadar || showSatelliteClouds || showNwsWarnings || showSigmet || showLightning || showTurbulence) && (
                <span className="w-2 h-2 rounded-full bg-sky-500 animate-pulse"></span>
              )}
            </button>

          {/* Mobile Bottom Sheet Map Layers & Settings Menu Drawer */}
          {showLayersMenu && (
            <>
              <div
                className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[100000] animate-fadeIn"
                onClick={() => setShowLayersMenu(false)}
              />
              <div className="fixed inset-x-0 bottom-0 z-[100001] max-w-lg mx-auto bg-white/95 backdrop-blur-2xl border-t border-slate-200 rounded-t-3xl p-4 sm:p-5 shadow-2xl space-y-4 animate-slideUp max-h-[85vh] overflow-y-auto scrollbar-thin pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))]">
                <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto mb-2 shrink-0 sm:hidden" />
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <div className="flex items-center gap-2">
                    <SlidersHorizontal className="w-4 h-4 text-sky-600" />
                    <h3 className="text-sm font-black text-slate-900">Map Overlays & Layers</h3>
                  </div>
                  <button
                    onClick={() => setShowLayersMenu(false)}
                    className="p-1.5 text-slate-500 hover:text-slate-900 rounded-xl bg-slate-100 hover:bg-slate-200 cursor-pointer active-press"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Aeronautical Weather Overlays */}
                <div className="space-y-2">
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Aeronautical Weather & Satellite</span>
                  
                  <label className="flex items-center justify-between p-2.5 bg-slate-50 hover:bg-slate-100 rounded-2xl border border-slate-200 cursor-pointer transition">
                    <div className="flex items-center gap-2">
                      <CloudRain className="w-4 h-4 text-emerald-600" />
                      <div>
                        <span className="text-xs font-bold text-slate-900 block">NWS WSR-88D Base Reflectivity (N0Q)</span>
                        <span className="text-[10px] text-slate-500">Real-time 0.5° tilt Doppler radar sweep returns</span>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={showRadar}
                      onChange={(e) => setShowRadar(e.target.checked)}
                      className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500 cursor-pointer"
                    />
                  </label>

                  {/* Turbulence Toggle & Altitude Band Sub-Selector */}
                  <div className="space-y-1">
                    <label className="flex items-center justify-between p-2.5 bg-amber-50/80 hover:bg-amber-100/80 rounded-2xl border border-amber-200 cursor-pointer transition">
                      <div className="flex items-center gap-2">
                        <Wind className="w-4 h-4 text-amber-600 animate-bounce" />
                        <div>
                          <span className="text-xs font-bold text-slate-900 block">Live NOAA EDR Turbulence</span>
                          <span className="text-[10px] text-slate-500">Aircraft EDR G-force reports & PIREP bumps</span>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={showTurbulence}
                        onChange={(e) => setShowTurbulence(e.target.checked)}
                        className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 cursor-pointer"
                      />
                    </label>

                    {showTurbulence && (
                      <div className="ml-3 p-2 bg-amber-500/10 border border-amber-200 rounded-2xl space-y-1">
                        <span className="text-[10px] font-black uppercase text-amber-800 tracking-wider block">EDR Cruise Altitude Filter</span>
                        <div className="grid grid-cols-4 gap-1 text-center">
                          {[
                            { id: "ALL", label: "All" },
                            { id: "LOW", label: "FL180-280" },
                            { id: "MID", label: "FL290-350" },
                            { id: "HIGH", label: "FL360-450" }
                          ].map((b) => (
                            <button
                              key={b.id}
                              onClick={() => setTurbulenceAltBand(b.id as any)}
                              className={`py-1 text-[10.5px] font-bold rounded-xl transition cursor-pointer ${
                                turbulenceAltBand === b.id ? "bg-amber-600 text-white shadow-2xs" : "bg-white text-slate-700 hover:bg-amber-100"
                              }`}
                            >
                              {b.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Lightning Toggle & Timeframe Decay Sub-Selector */}
                  <div className="space-y-1">
                    <label className="flex items-center justify-between p-2.5 bg-slate-50 hover:bg-slate-100 rounded-2xl border border-slate-200 cursor-pointer transition">
                      <div className="flex items-center gap-2">
                        <Zap className="w-4 h-4 text-amber-500 animate-pulse" />
                        <div>
                          <span className="text-xs font-bold text-slate-900 block">Live Lightning Strikes</span>
                          <span className="text-[10px] text-slate-500">Real-time strike flash clusters & rates</span>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={showLightning}
                        onChange={(e) => setShowLightning(e.target.checked)}
                        className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500 cursor-pointer"
                      />
                    </label>

                    {showLightning && (
                      <div className="ml-3 p-2 bg-slate-100 border border-slate-200 rounded-2xl space-y-1">
                        <span className="text-[10px] font-black uppercase text-slate-600 tracking-wider block">Strike Timeframe Decay</span>
                        <div className="grid grid-cols-4 gap-1 text-center">
                          {[
                            { val: 2, label: "2m" },
                            { val: 5, label: "5m" },
                            { val: 10, label: "10m" },
                            { val: 15, label: "15m" }
                          ].map((t) => (
                            <button
                              key={t.val}
                              onClick={() => setLightningMaxAge(t.val)}
                              className={`py-1 text-[10.5px] font-bold rounded-xl transition cursor-pointer ${
                                lightningMaxAge === t.val ? "bg-amber-500 text-white shadow-2xs" : "bg-white text-slate-700 hover:bg-slate-200"
                              }`}
                            >
                              {t.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <label className="flex items-center justify-between p-2.5 bg-slate-50 hover:bg-slate-100 rounded-2xl border border-slate-200 cursor-pointer transition">
                    <div className="flex items-center gap-2">
                      <Cloud className="w-4 h-4 text-indigo-600" />
                      <div>
                        <span className="text-xs font-bold text-slate-900 block">GOES Infrared Satellite</span>
                        <span className="text-[10px] text-slate-500">Live NOAA GOES-16 cloud tops & cover</span>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={showSatelliteClouds}
                      onChange={(e) => setShowSatelliteClouds(e.target.checked)}
                      className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500 cursor-pointer"
                    />
                  </label>

                  <label className="flex items-center justify-between p-2.5 bg-slate-50 hover:bg-slate-100 rounded-2xl border border-slate-200 cursor-pointer transition">
                    <div className="flex items-center gap-2">
                      <Radio className="w-4 h-4 text-emerald-600 animate-pulse" />
                      <div>
                        <span className="text-xs font-bold text-slate-900 block">NWS Severe Storm & Tornado Warnings</span>
                        <span className="text-[10px] text-slate-500">Live active red polygon warning vectors</span>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={showNwsWarnings}
                      onChange={(e) => setShowNwsWarnings(e.target.checked)}
                      className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500 cursor-pointer"
                    />
                  </label>
                </div>

                {/* Granular NOAA SIGMET / AIRMET Filters */}
                <div className="space-y-2 pt-2 border-t border-slate-200">
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">NOAA SIGMET & AIRMET Filters</span>

                  <label className="flex items-center justify-between p-2.5 bg-rose-50/60 hover:bg-rose-50 rounded-2xl border border-rose-200/80 cursor-pointer transition">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-rose-600" />
                      <div>
                        <span className="text-xs font-bold text-slate-900 block">Convective Thunderstorms</span>
                        <span className="text-[10px] text-slate-500">Severe storm cell SIGMET polygons</span>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={showSigmetConvective}
                      onChange={(e) => setShowSigmetConvective(e.target.checked)}
                      className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 cursor-pointer"
                    />
                  </label>

                  <label className="flex items-center justify-between p-2.5 bg-amber-50/60 hover:bg-amber-50 rounded-2xl border border-amber-200/80 cursor-pointer transition">
                    <div className="flex items-center gap-2">
                      <Wind className="w-4 h-4 text-amber-600" />
                      <div>
                        <span className="text-xs font-bold text-slate-900 block">Turbulence (AIRMET TANGO)</span>
                        <span className="text-[10px] text-slate-500">High/Low turbulence & LLWS polygons</span>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={showSigmetTurbulence}
                      onChange={(e) => setShowSigmetTurbulence(e.target.checked)}
                      className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 cursor-pointer"
                    />
                  </label>

                  <label className="flex items-center justify-between p-2.5 bg-cyan-50/60 hover:bg-cyan-50 rounded-2xl border border-cyan-200/80 cursor-pointer transition">
                    <div className="flex items-center gap-2">
                      <CloudSnow className="w-4 h-4 text-cyan-600" />
                      <div>
                        <span className="text-xs font-bold text-slate-900 block">Icing (AIRMET ZULU)</span>
                        <span className="text-[10px] text-slate-500">Structural icing hazard polygons</span>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={showSigmetIcing}
                      onChange={(e) => setShowSigmetIcing(e.target.checked)}
                      className="w-4 h-4 rounded text-cyan-600 focus:ring-cyan-500 cursor-pointer"
                    />
                  </label>

                  <label className="flex items-center justify-between p-2.5 bg-purple-50/60 hover:bg-purple-50 rounded-2xl border border-purple-200/80 cursor-pointer transition">
                    <div className="flex items-center gap-2">
                      <Eye className="w-4 h-4 text-purple-600" />
                      <div>
                        <span className="text-xs font-bold text-slate-900 block">IFR / Ceilings (AIRMET SIERRA)</span>
                        <span className="text-[10px] text-slate-500">Low ceiling & mountain obscuration</span>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={showSigmetIfr}
                      onChange={(e) => setShowSigmetIfr(e.target.checked)}
                      className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 cursor-pointer"
                    />
                  </label>
                </div>

                {/* Airport Display & Hub Filtering */}
                <div className="space-y-2 pt-2 border-t border-slate-200">
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Airports & Hub Display</span>
                  
                  <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200">
                    <button
                      onClick={() => setShowAllAirports(false)}
                      className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition cursor-pointer ${
                        !showAllAirports ? "bg-white text-slate-900 shadow-2xs" : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      Major Hubs Only
                    </button>
                    <button
                      onClick={() => setShowAllAirports(true)}
                      className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition cursor-pointer ${
                        showAllAirports ? "bg-white text-slate-900 shadow-2xs" : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      All Airports
                    </button>
                  </div>

                  <label className="flex items-center justify-between p-2.5 bg-slate-50 hover:bg-slate-100 rounded-2xl border border-slate-200 cursor-pointer transition">
                    <span className="text-xs font-bold text-slate-900">Show Airport Badges</span>
                    <input
                      type="checkbox"
                      checked={showAirportMarkers}
                      onChange={(e) => setShowAirportMarkers(e.target.checked)}
                      className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500 cursor-pointer"
                    />
                  </label>
                </div>

                {/* Route Corridor Buffer */}
                <div className="space-y-2 pt-2 border-t border-slate-200">
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Weather Corridor Width</span>
                  <div className="grid grid-cols-4 gap-1 bg-slate-100 p-1 rounded-2xl border border-slate-200 text-center">
                    {[50, 100, 200, 9999].map((val) => (
                      <button
                        key={val}
                        onClick={() => setCorridorNm(val)}
                        className={`py-1.5 text-xs font-bold rounded-xl transition cursor-pointer ${
                          corridorNm === val ? "bg-sky-600 text-white shadow-2xs" : "text-slate-700 hover:text-slate-900"
                        }`}
                      >
                        {val === 9999 ? "Off" : `${val} NM`}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>



          {/* Center: Flight Leg Selector (Truncated & Safe for Mobile) */}
          <div className="relative flex flex-col items-center min-w-0 flex-1 max-w-[170px] xs:max-w-[210px] sm:max-w-xs md:max-w-sm">
            <div className="bg-white/95 backdrop-blur-xl border border-slate-200/90 rounded-2xl px-2 sm:px-3 py-1.5 shadow-lg flex items-center gap-1 sm:gap-2 w-full justify-between">
              <Plane className={`w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 ${showFlightPlan ? "text-sky-600" : "text-amber-500"}`} />
              <select
                value={showFlightPlan ? selectedLegId : "NONE"}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === "NONE") {
                    setShowFlightPlan(false);
                  } else {
                    setShowFlightPlan(true);
                    setSelectedLegId(val);
                  }
                }}
                className="bg-transparent text-slate-900 font-black text-xs focus:outline-none cursor-pointer truncate min-w-0 flex-1"
              >
                {activeLegs.map((leg) => (
                  <option key={leg.id} value={leg.id}>
                    {leg.fltNum}: {leg.dep} ➔ {leg.arr}
                  </option>
                ))}
                <option value="NONE">🌦 OFF-DAY (No Flight Plan)</option>
              </select>

              <div className="h-4 w-px bg-slate-300 mx-0.5 shrink-0"></div>

              <button
                onClick={() => setShowFplDrawer(!showFplDrawer)}
                className="flex items-center gap-0.5 text-xs font-bold text-sky-700 hover:text-sky-900 px-1 py-0.5 rounded-lg hover:bg-sky-50 transition cursor-pointer shrink-0"
              >
                <span>FPL</span>
                {showFplDrawer ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            </div>

            {/* Mobile Bottom Sheet Flight Plan Waypoints Editor */}
            {showFplDrawer && (
              <>
                <div
                  className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[100000] animate-fadeIn"
                  onClick={() => setShowFplDrawer(false)}
                />
                <div className="fixed inset-x-0 bottom-0 z-[100001] max-w-lg mx-auto bg-white/95 backdrop-blur-2xl border-t border-slate-200 rounded-t-3xl p-4 sm:p-5 shadow-2xl space-y-3 animate-slideUp max-h-[85vh] overflow-y-auto scrollbar-thin pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))]">
                  <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto mb-2 shrink-0 sm:hidden" />
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                    <span className="text-xs font-black text-slate-900 uppercase tracking-wider">Flight Plan Route Editor</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-sky-700 font-mono">{totalFplDistanceNm} NM • ~{estimatedEteHours}h</span>
                      <button
                        onClick={() => setShowFplDrawer(false)}
                        className="p-1 text-slate-500 hover:text-slate-900 rounded-xl bg-slate-100 hover:bg-slate-200 cursor-pointer active-press"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Waypoint list */}
                  <div className="flex flex-wrap items-center gap-1.5 max-h-36 overflow-y-auto">
                    {fplWaypoints.map((wp, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-1 bg-slate-100 border border-slate-300 rounded-xl px-2.5 py-1 text-xs font-mono font-black text-slate-900 shadow-2xs"
                      >
                        <span className="text-[10px] text-sky-700 font-extrabold">
                          {idx === 0 ? "DEP" : idx === fplWaypoints.length - 1 ? "ARR" : `WP${idx}`}
                        </span>
                        <span>{wp}</span>
                        {fplWaypoints.length > 2 && (
                          <button
                            onClick={() => removeWaypointFromFpl(idx)}
                            className="text-slate-400 hover:text-rose-600 ml-1 text-[11px] cursor-pointer"
                            title="Remove Waypoint"
                          >
                            ×
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Add Waypoint Input */}
                  <div className="flex items-center gap-1.5 pt-1">
                    <input
                      type="text"
                      value={newWaypointInput}
                      onChange={(e) => setNewWaypointInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") addWaypointToFpl(newWaypointInput);
                      }}
                      placeholder="ADD AIRPORT (ICAO)..."
                      className="flex-1 bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono font-bold uppercase text-slate-900 focus:outline-none focus:border-sky-600"
                    />
                    <button
                      onClick={() => addWaypointToFpl(newWaypointInput)}
                      className="px-3.5 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold shadow-2xs cursor-pointer flex items-center gap-1 active-press"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add
                    </button>
                  </div>

                  {/* Quick Off-Day Mode Toggle Button inside Drawer */}
                  <div className="pt-2 border-t border-slate-200">
                    <button
                      onClick={() => {
                        setShowFlightPlan(!showFlightPlan);
                        setShowFplDrawer(false);
                      }}
                      className={`w-full py-2.5 px-3 rounded-2xl text-xs font-black transition cursor-pointer flex items-center justify-center gap-1.5 border active-press ${
                        showFlightPlan
                          ? "bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-300"
                          : "bg-sky-600 hover:bg-sky-500 text-white border-sky-700 shadow-md"
                      }`}
                    >
                      <Navigation className="w-3.5 h-3.5" />
                      <span>{showFlightPlan ? "🌦 Hide Flight Plan (Off-Day Weather Mode)" : "✈️ Show Flight Plan Route"}</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Right: Briefing & Refresh Actions */}
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            <button
              onClick={() => setShowBriefingSheet(true)}
              className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3.5 py-1.5 sm:py-2 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white rounded-2xl text-xs font-extrabold shadow-lg shadow-amber-600/20 transition cursor-pointer active-press"
              aria-label="Dispatch Briefing"
            >
              <Shield className="w-4 h-4 text-amber-100 shrink-0" />
              <span className="hidden sm:inline">Dispatch Briefing</span>
            </button>

            <button
              onClick={() => loadLiveWeather(true)}
              disabled={isFetchingWeather}
              className="p-1.5 sm:p-2 bg-white/95 backdrop-blur-xl border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-2xl shadow-lg cursor-pointer transition shrink-0 active-press"
              title="Refresh NOAA Weather (Force 5m Cache Bypass)"
            >
              <RefreshCw className={`w-4 h-4 ${isFetchingWeather ? "animate-spin text-sky-600" : ""}`} />
            </button>
          </div>
        </div>
      </div>

      {/* 3. Floating Selected Airport Weather & D-ATIS Panel (Centered horizontally, comfortably above bottom nav) */}
      {selectedAirportCode && (
        <div className="absolute bottom-[calc(4.75rem+env(safe-area-inset-bottom,0px))] left-1/2 -translate-x-1/2 w-[calc(100%-1.5rem)] sm:w-[440px] z-30 pointer-events-auto animate-slideUp">
          <div className="bg-white/95 backdrop-blur-xl border border-slate-200 rounded-3xl p-4 shadow-2xl space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-slate-900">{selectedAirportCode}</span>
                <span className="text-xs font-bold text-slate-600">
                  {selectedAirportData?.category || "VFR"}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => addWaypointToFpl(selectedAirportCode)}
                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-2xs cursor-pointer flex items-center gap-1"
                >
                  <Navigation className="w-3.5 h-3.5" />
                  + FPL
                </button>
                <button
                  onClick={() => setSelectedAirportCode(null)}
                  className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>

            {isAirportLoading ? (
              <div className="p-4 text-center text-xs font-bold text-slate-500 animate-pulse">
                Fetching NOAA METAR & D-ATIS...
              </div>
            ) : (
              <>
                {/* METAR Raw String */}
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-300 font-mono text-xs text-slate-900 select-all leading-relaxed max-h-24 overflow-y-auto">
                  {selectedAirportData?.rawOb || `METAR ${selectedAirportCode} 311745Z 24012KT 10SM FEW040 22/12 A2992`}
                </div>

                {/* Weather Breakdown Parameters Grid */}
                <div className="grid grid-cols-2 gap-2 text-xs font-sans">
                  <div className="bg-slate-50 p-2 rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-500 font-bold block">Surface Winds</span>
                    <span className="font-extrabold text-slate-900 flex items-center gap-1 mt-0.5">
                      <Wind className="w-3.5 h-3.5 text-emerald-600" />
                      {selectedAirportData?.winds || "240° @ 12 kt"}
                    </span>
                  </div>

                  <div className="bg-slate-50 p-2 rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-500 font-bold block">Visibility</span>
                    <span className="font-extrabold text-slate-900 flex items-center gap-1 mt-0.5">
                      <Eye className="w-3.5 h-3.5 text-cyan-600" />
                      {selectedAirportData?.visibility || "10 SM"}
                    </span>
                  </div>

                  <div className="bg-slate-50 p-2 rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-500 font-bold block">Ceiling / Sky</span>
                    <span className="font-extrabold text-slate-900 flex items-center gap-1 mt-0.5 truncate">
                      <Cloud className="w-3.5 h-3.5 text-sky-600" />
                      {selectedAirportData?.clouds || "FEW 4,000 ft"}
                    </span>
                  </div>

                  <div className="bg-slate-50 p-2 rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-500 font-bold block">Temp / Dewpoint</span>
                    <span className="font-extrabold text-slate-900 flex items-center gap-1 mt-0.5">
                      <Thermometer className="w-3.5 h-3.5 text-amber-600" />
                      {selectedAirportData?.tempDewpoint || "22°C / 12°C"}
                    </span>
                  </div>
                </div>

                {/* D-ATIS Text Box */}
                <div className="bg-sky-50 border border-sky-200 rounded-xl p-2.5 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sky-950 flex items-center gap-1 text-[11px]">
                      <Radio className="w-3.5 h-3.5 text-sky-600 animate-pulse" />
                      Digital ATIS Broadcast
                    </span>
                    <span className="font-mono font-bold text-sky-900 text-[10px]">
                      INFO {selectedAirportData?.atisData?.letter || "FOXTROT"}
                    </span>
                  </div>
                  <p className="font-mono text-[10px] text-sky-950 bg-white p-2 rounded-lg border border-sky-200 leading-relaxed max-h-20 overflow-y-auto">
                    {selectedAirportData?.atisData?.datisText || selectedAirportData?.datisText || `${selectedAirportCode} ATIS INFO FOXTROT 1750Z. WINDS 240 AT 12. VIS 10. FEW040. TEMP 22 DEWPOINT 12. ALTIMETER 29.92. ILS RUNWAY 28L IN USE. READBACK ALL HOLD SHORT INSTRUCTIONS.`}
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* 4. Full Dispatch Briefing Mobile Slide-Up Sheet Modal */}
      {showBriefingSheet && (
        <>
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[100000] animate-fadeIn"
            onClick={() => setShowBriefingSheet(false)}
          />
          <div className="fixed inset-x-0 bottom-0 z-[100001] max-w-2xl mx-auto h-[90vh] max-h-[90vh] bg-white border-t border-slate-200 rounded-t-3xl p-4 sm:p-5 shadow-2xl flex flex-col animate-slideUp overflow-hidden pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))]">
            {/* Mobile Drag Handle */}
            <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto mb-2 shrink-0 sm:hidden" />

            {/* Modal Header */}
            <div className="flex justify-between items-center pb-3 border-b border-slate-200 shrink-0">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-amber-600" />
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 leading-tight">Flight Weather Briefing & Leg Overview</h3>
                  <p className="text-xs text-slate-600">Active Leg: {activeLeg.fltNum} • {activeLeg.dep} ➔ {activeLeg.arr}</p>
                </div>
              </div>
              <button
                onClick={() => setShowBriefingSheet(false)}
                className="p-1.5 text-slate-500 hover:text-slate-900 bg-slate-100 rounded-xl border border-slate-200 cursor-pointer active-press"
              >
                ✕
              </button>
            </div>

            {/* Modal Content Scrollable Area */}
            <div className="flex-grow overflow-y-auto scrollbar-thin py-4 space-y-4 text-xs font-sans">
              {/* Flight Leg Selector */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2">
                <span className="text-[10px] uppercase font-black text-slate-600">Select Scheduled Flight Leg:</span>
                <select
                  value={selectedLegId}
                  onChange={(e) => setSelectedLegId(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-sky-600"
                >
                  {activeLegs.map((leg) => (
                    <option key={leg.id} value={leg.id}>
                      {leg.fltNum} • {leg.dep} ➔ {leg.arr} ({leg.duration}) • {leg.date}
                    </option>
                  ))}
                </select>
              </div>

              {/* Dispatcher Live Weather Overview */}
              <div className={`p-4 rounded-2xl border transition ${
                enrouteSummary.hasThunderstorm
                  ? "bg-rose-50 border-rose-300 text-rose-950 shadow-sm"
                  : "bg-sky-50 border-sky-200 text-sky-950"
              }`}>
                <div className="flex items-center gap-2 font-extrabold text-sm mb-1">
                  {enrouteSummary.hasThunderstorm ? (
                    <span className="text-rose-600 animate-pulse">⚡ NOAA Dispatcher Hazard Alert: Active Convective Thunderstorm</span>
                  ) : (
                    <span className="text-sky-950">NOAA Live Dispatch Summary:</span>
                  )}
                </div>
                <p className="leading-relaxed font-medium">{enrouteSummary.summary}</p>
                <div className="flex flex-col gap-1.5 pt-3 mt-2 border-t border-slate-200/80 font-bold text-xs">
                  {enrouteSummary.hasThunderstorm && (
                    <span className="text-rose-700 font-extrabold">{enrouteSummary.convective}</span>
                  )}
                  <span className={enrouteSummary.hasThunderstorm ? "text-amber-800" : "text-sky-900"}>{enrouteSummary.turb}</span>
                  <span className={enrouteSummary.hasThunderstorm ? "text-cyan-800" : "text-sky-900"}>{enrouteSummary.ice}</span>
                </div>
              </div>

              {/* Departure & Arrival Weather Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className={`p-4 rounded-2xl border ${getCategoryColor(depWeather?.category)}`}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-bold text-slate-800">Departure: {activeLeg.dep}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded ${getCategoryBadge(depWeather?.category)}`}>
                      {depWeather?.category || "VFR"}
                    </span>
                  </div>
                  <p className="font-mono text-[11px] bg-white p-2 rounded-lg border border-slate-300 my-2">
                    {depWeather?.rawOb || "Fetching METAR..."}
                  </p>
                  <p className="text-[11px] text-slate-700">Winds: <strong>{depWeather?.winds || "Calm"}</strong> | Vis: <strong>{depWeather?.visibility || "10 SM"}</strong></p>
                </div>

                <div className={`p-4 rounded-2xl border ${getCategoryColor(arrWeather?.category)}`}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-bold text-slate-800">Arrival: {activeLeg.arr}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded ${getCategoryBadge(arrWeather?.category)}`}>
                      {arrWeather?.category || "VFR"}
                    </span>
                  </div>
                  <p className="font-mono text-[11px] bg-white p-2 rounded-lg border border-slate-300 my-2">
                    {arrWeather?.rawOb || "Fetching METAR..."}
                  </p>
                  <p className="text-[11px] text-slate-700">Winds: <strong>{arrWeather?.winds || "Calm"}</strong> | Vis: <strong>{arrWeather?.visibility || "10 SM"}</strong></p>
                </div>
              </div>

              {/* Active Route Hazards */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-2">
                <span className="font-extrabold text-slate-900 block">Enroute Route Advisories ({enrouteHazards.length}):</span>
                {enrouteHazards.length === 0 ? (
                  <p className="text-emerald-700 font-bold bg-emerald-50 p-2.5 rounded-xl border border-emerald-200">
                    ✓ Route is clear of severe NOAA AIRMET/SIGMET hazards.
                  </p>
                ) : (
                  enrouteHazards.map((h, i) => (
                    <div key={i} className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-950">
                      <span className="font-bold block">{h.title}</span>
                      <span className="text-[11px] block mt-0.5">{h.decodedSummary}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* 5. Floating Nearby Reporting Airports List (Opened by tapping anywhere on the map) */}
      {tapLocationData && (
        <div className="absolute bottom-20 sm:bottom-8 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] sm:w-[460px] z-30 pointer-events-auto animate-slideUp">
          <div className="bg-white/95 backdrop-blur-xl border border-slate-200 rounded-3xl p-4 shadow-2xl space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Navigation className="w-5 h-5 text-rose-600" />
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">Nearby Reporting Airports</h3>
                  <p className="text-[11px] text-slate-600 font-mono">
                    Tap Point: {tapLocationData.lat.toFixed(2)}° N, {tapLocationData.lng.toFixed(2)}° W
                  </p>
                </div>
              </div>
              <button
                onClick={() => setTapLocationData(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* List of Nearest Airports */}
            <div className="space-y-1.5 max-h-60 overflow-y-auto scrollbar-thin pr-1">
              {tapLocationData.nearby.map((apt) => (
                <div
                  key={apt.code}
                  onClick={() => {
                    handleAirportSelect(apt.code);
                    setTapLocationData(null);
                  }}
                  className="flex items-center justify-between p-2.5 bg-slate-50 hover:bg-sky-50 border border-slate-200 hover:border-sky-300 rounded-2xl transition cursor-pointer group"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono text-base font-black text-slate-900 group-hover:text-sky-700">
                      {apt.code}
                    </span>
                    <div>
                      <span className="text-xs font-bold text-slate-800 block leading-tight">{apt.name}</span>
                      <span className="text-[10px] text-slate-600 font-mono">{apt.distNm} NM from tap point</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] px-2 py-0.5 rounded-md ${getCategoryBadge(apt.cat)}`}>
                      {apt.cat}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        addWaypointToFpl(apt.code);
                        setTapLocationData(null);
                      }}
                      className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[10px] font-bold shadow-2xs cursor-pointer"
                      title="Add to FPL Route"
                    >
                      + FPL
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
