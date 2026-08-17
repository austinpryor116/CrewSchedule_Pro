"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import dynamic from "next/dynamic";
import {
  Shield,
  Layers,
  Search,
  CheckCircle2,
  Navigation,
  Wind,
  Eye,
  Cloud,
  Thermometer,
  Radio,
  RefreshCw,
  Plane,
  X,
  Plus,
  ChevronDown,
  ChevronUp,
  Download,
  Trash2,
  Zap,
  Globe2,
  Calendar,
  LocateFixed,
  Crosshair,
  MapPin,
  AlertTriangle,
} from "lucide-react";
import {
  fetchLiveStationWeather,
  fetchLiveSigmetsAndAirmets,
  fetchLiveLightningStrikes,
  fetchLiveTurbulenceReports,
  isHazardInCorridor,
  DecodedMetar,
  DecodedTaf,
  LiveSigmetAirmet,
  LiveLightningStrike,
  LiveTurbulenceReport,
  LiveAirportCondition,
  fetchLiveBulkAirportCategories,
  getAirportCoordsSync,
  haversineDistanceNm,
} from "../../lib/weatherService";
import {
  getCurrentUserPosition,
  watchUserPosition,
  UserLocationData,
  requestLocationPermissions,
  getLastSavedUserPosition,
} from "../../lib/locationService";
import { MapTapData } from "./BriefingMap";
import { useCrewStore } from "../../store/useCrewStore";
import {
  getTileCacheStats,
  precacheFlightRoute,
  precacheFullNorthAmericaMapPack,
  clearTileCache,
} from "../../lib/mapTileCache";
import { ALL_MAJOR_AIRPORTS } from "../../lib/airportData";

// Dynamically load the Leaflet map without SSR
const BriefingMap = dynamic(() => import("./BriefingMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-slate-900 flex flex-col items-center justify-center text-slate-300 gap-3">
      <div className="w-8 h-8 border-2 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
      <span className="text-xs font-mono tracking-wider font-bold">LOADING FOREFLIGHT MAP...</span>
    </div>
  ),
});

export interface AlertItem {
  id: number;
  type: string;
  subtype: string;
  text: string;
  priority: "HIGH" | "MED" | "LOW";
  lat?: number;
  lng?: number;
}

export interface FlightLegItem {
  id: string;
  fltNum: string;
  dep: string;
  arr: string;
  date: string;
  time: string;
  arrTime: string;
  duration: string;
  equipment: string;
  pairingId: string;
  dayIndex: number;
}

const DEMO_LEGS: FlightLegItem[] = [
  { id: "leg-1", fltNum: "FLT-3524", dep: "ORD", arr: "MIA", date: "2026-08-15", time: "08:15", arrTime: "12:30", duration: "3h 15m", equipment: "E75", pairingId: "14731", dayIndex: 0 },
  { id: "leg-2", fltNum: "FLT-3890", dep: "MIA", arr: "ORD", date: "2026-08-15", time: "13:45", arrTime: "16:55", duration: "3h 10m", equipment: "E75", pairingId: "14731", dayIndex: 0 },
  { id: "leg-3", fltNum: "FLT-3492", dep: "CMI", arr: "ORD", date: "2026-08-15", time: "11:41", arrTime: "12:55", duration: "1h 14m", equipment: "E75E", pairingId: "14731", dayIndex: 1 },
  { id: "leg-4", fltNum: "FLT-3749", dep: "ORD", arr: "CLE", date: "2026-08-15", time: "13:40", arrTime: "16:09", duration: "1h 29m", equipment: "E75E", pairingId: "14731", dayIndex: 1 },
  { id: "leg-5", fltNum: "FLT-3356", dep: "CLE", arr: "ORD", date: "2026-08-16", time: "05:15", arrTime: "05:46", duration: "1h 31m", equipment: "E75E", pairingId: "14731", dayIndex: 2 },
];

const MAP_PREFS_KEY = "csp_weather_layer_prefs";

interface MapLayerPreferences {
  showRadar: boolean;
  showSatelliteClouds: boolean;
  showNwsWarnings: boolean;
  showRadarRings: boolean;
  showSigmet: boolean;
  showSigmetConvective: boolean;
  showSigmetTurbulence: boolean;
  showSigmetIcing: boolean;
  showSigmetIfr: boolean;
  showLightning: boolean;
  lightningMaxAge: number;
  showTurbulence: boolean;
  turbulenceMaxAge: number;
  turbulenceAltBand: "ALL" | "LOW" | "MID" | "HIGH";
  showAllAirports: boolean;
  showAirportMarkers: boolean;
}

const DEFAULT_MAP_PREFERENCES: MapLayerPreferences = {
  showRadar: true,
  showSatelliteClouds: false,
  showNwsWarnings: false,
  showRadarRings: false,
  showSigmet: true,
  showSigmetConvective: true,
  showSigmetTurbulence: true,
  showSigmetIcing: false, // Default false per user request
  showSigmetIfr: false,   // Default false per user request
  showLightning: false,
  lightningMaxAge: 15,
  showTurbulence: true,   // Default true per user request
  turbulenceMaxAge: 90,   // Default 90 minutes max age (auto-pruned after 1.5h)
  turbulenceAltBand: "ALL",
  showAllAirports: false,
  showAirportMarkers: true,
};

function getInitialMapPreferences(): MapLayerPreferences {
  if (typeof window === "undefined") return DEFAULT_MAP_PREFERENCES;
  try {
    const raw = localStorage.getItem(MAP_PREFS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_MAP_PREFERENCES, ...parsed };
    }
  } catch (e) {}
  return DEFAULT_MAP_PREFERENCES;
}

export default function BriefingView() {
  const sequences = useCrewStore((state) => state.sequences);

  // Active Flight Legs from User's Schedule
  const activeLegs = useMemo<FlightLegItem[]>(() => {
    if (!sequences || sequences.length === 0) return DEMO_LEGS;

    const legs: FlightLegItem[] = [];

    sequences.forEach((seq) => {
      if (!seq.dutyPeriods) return;
      seq.dutyPeriods.forEach((dp, dpIdx) => {
        if (!dp.legs) return;
        const baseDate = new Date(seq.startDate);
        baseDate.setDate(baseDate.getDate() + (dp.dayIndex !== undefined ? dp.dayIndex : dpIdx));
        const dateStr = baseDate.toISOString().split("T")[0];

        dp.legs.forEach((leg, lIdx) => {
          const depH = leg.depTime.slice(0, 2);
          const depM = leg.depTime.slice(2, 4);
          const arrH = leg.arrTime.slice(0, 2);
          const arrM = leg.arrTime.slice(2, 4);

          const blockH = Math.floor(leg.blockMinutes / 60);
          const blockM = leg.blockMinutes % 60;
          const durationStr = blockH > 0 ? `${blockH}h ${blockM}m` : `${blockM}m`;

          legs.push({
            id: `seq-${seq.sequenceNumber || seq.id}-dp${dpIdx}-l${lIdx}`,
            fltNum: leg.flightNumber.startsWith("AA") ? leg.flightNumber : `AA${leg.flightNumber}`,
            dep: leg.depAirport,
            arr: leg.arrAirport,
            date: dateStr,
            time: `${depH}:${depM}`,
            arrTime: `${arrH}:${arrM}`,
            duration: durationStr,
            equipment: leg.equipment || seq.equipment || "E75E",
            pairingId: String(seq.sequenceNumber || seq.id),
            dayIndex: dp.dayIndex !== undefined ? dp.dayIndex : dpIdx,
          });
        });
      });
    });

    return legs.length > 0 ? legs : DEMO_LEGS;
  }, [sequences]);

  // Intelligent Automatic Flight Selection (Airborne / Next Upcoming / Nearest)
  const { leg: autoSelectedLeg, status: legStatus } = useMemo(() => {
    if (activeLegs.length === 0) return { leg: DEMO_LEGS[0], status: "SCHEDULED" };

    const now = new Date();
    const nowMs = now.getTime();

    const sorted = [...activeLegs].sort((a, b) => {
      const tA = new Date(`${a.date}T${a.time}:00`).getTime();
      const tB = new Date(`${b.date}T${b.time}:00`).getTime();
      return tA - tB;
    });

    // 1. In-Progress Airborne Check
    const inProgressFlight = sorted.find((l) => {
      const depT = new Date(`${l.date}T${l.time}:00`).getTime();
      const arrT = new Date(`${l.date}T${l.arrTime}:00`).getTime();
      return nowMs >= depT && nowMs <= arrT;
    });
    if (inProgressFlight) return { leg: inProgressFlight, status: "IN_PROGRESS" };

    // 2. Next Upcoming Flight in the Future
    const nextFlight = sorted.find((l) => {
      const depT = new Date(`${l.date}T${l.time}:00`).getTime();
      return depT >= nowMs;
    });
    if (nextFlight) return { leg: nextFlight, status: "NEXT_UPCOMING" };

    // 3. Today's Date match
    const todayDateStr = now.toISOString().split("T")[0];
    const todayFlight = sorted.find((l) => l.date === todayDateStr);
    if (todayFlight) return { leg: todayFlight, status: "NEXT_UPCOMING" };

    // 4. Closest Upcoming Leg
    let closestLeg = sorted[0];
    let minDiff = Infinity;
    for (const l of sorted) {
      const depT = new Date(`${l.date}T${l.time}:00`).getTime();
      const diff = Math.abs(depT - nowMs);
      if (diff < minDiff) {
        minDiff = diff;
        closestLeg = l;
      }
    }

    return { leg: closestLeg, status: "NEXT_UPCOMING" };
  }, [activeLegs]);

  const [explicitLegId, setExplicitLegId] = useState<string | null>(null);

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

  // FPL Waypoint & Flight Plan State
  const [showFlightPlan, setShowFlightPlan] = useState(true);
  const [fplWaypoints, setFplWaypoints] = useState<string[]>([depCode, arrCode]);
  const [newWaypointInput, setNewWaypointInput] = useState("");
  const [showFplDrawer, setShowFplDrawer] = useState(false);
  const [showFlightSelector, setShowFlightSelector] = useState(false);
  const [flightSearchQuery, setFlightSearchQuery] = useState("");

  // Sync FPL waypoints when active leg changes
  useEffect(() => {
    if (depCode && arrCode) {
      setFplWaypoints([depCode, arrCode]);
    }
  }, [depCode, arrCode]);

  // Selected Airport & Tap Point States
  const [selectedAirportCode, setSelectedAirportCode] = useState<string | null>(null);
  const [selectedAirportData, setSelectedAirportData] = useState<DecodedMetar | null>(null);
  const [isAirportLoading, setIsAirportLoading] = useState(false);
  const [tapLocationData, setTapLocationData] = useState<MapTapData | null>(null);

  // GPS Location Services State
  const [userLocation, setUserLocation] = useState<UserLocationData | null>(getLastSavedUserPosition);
  const [isLocating, setIsLocating] = useState(false);
  const [isWatchingLocation, setIsWatchingLocation] = useState(false);
  const [locationErrorMessage, setLocationErrorMessage] = useState<string | null>(null);

  // Handle Airport Click
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

  const addWaypointToFpl = (code: string) => {
    const clean = code.trim().toUpperCase();
    if (clean && !fplWaypoints.includes(clean)) {
      setFplWaypoints([...fplWaypoints, clean]);
    }
    setNewWaypointInput("");
  };

  const removeWaypointFromFpl = (idx: number) => {
    if (fplWaypoints.length <= 2) return;
    setFplWaypoints(fplWaypoints.filter((_, i) => i !== idx));
  };

  const totalFplDistanceNm = useMemo(() => {
    let total = 0;
    for (let i = 0; i < fplWaypoints.length - 1; i++) {
      const c1 = getAirportCoordsSync(fplWaypoints[i]);
      const c2 = getAirportCoordsSync(fplWaypoints[i + 1]);
      if (c1 && c2) {
        total += haversineDistanceNm(c1[0], c1[1], c2[0], c2[1]);
      } else {
        total += 350;
      }
    }
    return Math.round(total > 0 ? total : 720);
  }, [fplWaypoints]);

  const estimatedEteHours = (totalFplDistanceNm / 420).toFixed(1);

  // Live NOAA Weather States
  const [depWeather, setDepWeather] = useState<DecodedMetar | null>(null);
  const [depTaf, setDepTaf] = useState<DecodedTaf | null>(null);
  const [arrWeather, setArrWeather] = useState<DecodedMetar | null>(null);
  const [arrTaf, setArrTaf] = useState<DecodedTaf | null>(null);
  const [liveHazards, setLiveHazards] = useState<LiveSigmetAirmet[]>([]);
  const [liveLightning, setLiveLightning] = useState<LiveLightningStrike[]>([]);
  const [liveTurbulence, setLiveTurbulence] = useState<LiveTurbulenceReport[]>([]);
  const [liveAirportConditions, setLiveAirportConditions] = useState<Record<string, LiveAirportCondition>>({});
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isFetchingWeather, setIsFetchingWeather] = useState(false);

  // Persistent Map Layer Preferences State
  const [mapPrefs, setMapPrefs] = useState<MapLayerPreferences>(getInitialMapPreferences);

  const updatePref = <K extends keyof MapLayerPreferences>(key: K, val: MapLayerPreferences[K]) => {
    setMapPrefs((prev) => {
      const updated = { ...prev, [key]: val };
      try {
        localStorage.setItem(MAP_PREFS_KEY, JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
  };

  const [showLayersMenu, setShowLayersMenu] = useState(false);
  const [showBriefingSheet, setShowBriefingSheet] = useState(false);

  // Offline Tile Cache State
  const [cacheStats, setCacheStats] = useState<{ count: number; sizeMb: number; isFullPackReady: boolean }>({ count: 0, sizeMb: 0, isFullPackReady: false });
  const [isCachingRoute, setIsCachingRoute] = useState(false);
  const [cachingProgress, setCachingProgress] = useState<number | null>(null);

  const updateCacheStats = useCallback(async () => {
    const stats = await getTileCacheStats();
    setCacheStats(stats);
  }, []);

  useEffect(() => {
    updateCacheStats();
  }, [updateCacheStats]);

  // Auto-acquire current GPS position on initial load
  useEffect(() => {
    let isMounted = true;
    getCurrentUserPosition().then((pos) => {
      if (isMounted && pos) {
        setUserLocation(pos);
        setIsWatchingLocation(true);
      }
    }).catch(() => {});
    return () => {
      isMounted = false;
    };
  }, []);

  // Handle GPS Locate Me Trigger
  const handleLocateMe = useCallback(async () => {
    setIsLocating(true);
    setLocationErrorMessage(null);
    try {
      const pos = await getCurrentUserPosition();
      if (pos) {
        setUserLocation(pos);
        setIsWatchingLocation(true);
        if (typeof window !== "undefined" && (window as any).leafletFlyToUserLocation) {
          (window as any).leafletFlyToUserLocation(pos.lat, pos.lng, 12);
        }
      } else {
        const hasPerm = await requestLocationPermissions();
        if (!hasPerm) {
          setLocationErrorMessage("Please enable Location permission in your device settings.");
        } else {
          setLocationErrorMessage("Unable to acquire GPS fix. Please ensure location services are enabled.");
        }
      }
    } catch (e: any) {
      setLocationErrorMessage(e.message || "Failed to acquire location fix.");
    } finally {
      setIsLocating(false);
    }
  }, []);

  // Continuous GPS Location Watch
  useEffect(() => {
    if (!isWatchingLocation) return;
    const cancelWatch = watchUserPosition(
      (pos) => {
        setUserLocation(pos);
      },
      (err) => {
        console.warn("Location watch error:", err);
      }
    );
    return () => cancelWatch();
  }, [isWatchingLocation]);

  // Compute Nearest Major Airport to User's GPS Location
  const nearestAirportToUser = useMemo<{ code: string; name: string; distNm: number; cat: string } | null>(() => {
    if (!userLocation) return null;
    let closest: { code: string; name: string; distNm: number; cat: string } | null = null;
    let minD = Infinity;

    Object.entries(ALL_MAJOR_AIRPORTS).forEach(([code, apt]) => {
      const d = haversineDistanceNm(userLocation.lat, userLocation.lng, apt.lat, apt.lng);
      if (d < minD) {
        minD = d;
        closest = { code, name: apt.name, distNm: Math.round(d * 10) / 10, cat: apt.cat };
      }
    });

    return closest;
  }, [userLocation]);

  // Load Live Weather Data
  const loadLiveWeather = useCallback(async (forceRefresh = false) => {
    setIsFetchingWeather(true);
    try {
      const [depRes, arrRes, hazards, lightning, turb, bulkAirports] = await Promise.all([
        fetchLiveStationWeather(depCode, forceRefresh),
        fetchLiveStationWeather(arrCode, forceRefresh),
        fetchLiveSigmetsAndAirmets(forceRefresh),
        fetchLiveLightningStrikes(forceRefresh),
        fetchLiveTurbulenceReports(forceRefresh),
        fetchLiveBulkAirportCategories(Object.keys(ALL_MAJOR_AIRPORTS), forceRefresh),
      ]);

      setDepWeather(depRes.metar);
      setDepTaf(depRes.taf);
      setArrWeather(arrRes.metar);
      setArrTaf(arrRes.taf);
      setLiveHazards(hazards);
      setLiveLightning(lightning);
      setLiveTurbulence(turb);
      setLiveAirportConditions(bulkAirports);
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
    const interval = setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState !== "visible") return;
      loadLiveWeather(false);
    }, 2.5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [loadLiveWeather]);

  // Compute SIGMETs/AIRMETs filtered strictly within 50 NM flight corridor
  const enrouteHazards = useMemo(() => {
    if (!showFlightPlan) return [];
    const depCoords = getAirportCoordsSync(depCode);
    const arrCoords = getAirportCoordsSync(arrCode);
    if (!depCoords || !arrCoords) return [];

    const FLIGHT_CORRIDOR_NM = 50;
    return liveHazards.filter((hazard) =>
      isHazardInCorridor(hazard, depCoords, arrCoords, FLIGHT_CORRIDOR_NM)
    );
  }, [liveHazards, depCode, arrCode, showFlightPlan]);

  // Dispatcher Briefing Summary
  const enrouteSummary = useMemo(() => {
    const dep = activeLeg.dep.toUpperCase();
    const arr = activeLeg.arr.toUpperCase();
    const depCat = depWeather?.category || "VFR";
    const arrCat = arrWeather?.category || "VFR";

    // 1. Live Severe Enroute SIGMETs in the 50 NM corridor
    const hasConvectiveSigmet = enrouteHazards.some((h) => h.hazard === "CONVECTIVE" || (h.type === "SIGMET" && !h.hazard));
    const activeTurbHazards = enrouteHazards.filter((h) => h.hazard === "TURBULENCE");
    const activeIceHazards = enrouteHazards.filter((h) => h.hazard === "ICING");

    // 2. Current Station Weather (METAR)
    const depMetarTS = depWeather?.rawOb ? /\b(TS|TSRA|VCTS|SQ|GR|FC|\+RA)\b/.test(depWeather.rawOb) : false;
    const arrMetarTS = arrWeather?.rawOb ? /\b(TS|TSRA|VCTS|SQ|GR|FC|\+RA)\b/.test(arrWeather.rawOb) : false;

    // 3. TAF Forecast
    const depTafTS = depTaf?.rawTaf ? /\b(TS|TSRA|VCTS|CB)\b/.test(depTaf.rawTaf) : false;
    const arrTafTS = arrTaf?.rawTaf ? /\b(TS|TSRA|VCTS|CB)\b/.test(arrTaf.rawTaf) : false;

    const hasForecastConvective = depTafTS || arrTafTS;

    let alertTitle = "✓ NOAA Live Dispatch Summary:";
    let alertType: "CRITICAL" | "ADVISORY" | "NOMINAL" = "NOMINAL";
    let summaryText = `Live Dispatch Summary for Flight ${activeLeg.fltNum} (${dep} ➔ ${arr}). `;

    if (hasConvectiveSigmet) {
      alertType = "CRITICAL";
      alertTitle = "⚡ NOAA Critical Hazard: Active Convective SIGMET in Route Corridor";
      summaryText += `Severe convective thunderstorm activity detected along the flight corridor. Maintain 20+ NM separation from radar echo tops. `;
    } else if (depMetarTS || arrMetarTS) {
      alertType = "CRITICAL";
      alertTitle = `⚡ NOAA Station Alert: Active Thunderstorm at ${depMetarTS ? dep : arr}`;
      summaryText += `Thunderstorms currently observed in live METAR at ${depMetarTS ? dep : arr}. `;
    } else if (hasForecastConvective) {
      alertType = "ADVISORY";
      alertTitle = "🌦 NOAA Dispatch Advisory: Thunderstorms Forecasted in TAF";
      summaryText += `TAF forecasts potential thunderstorm activity (VCTS/CB) during the forecast window. The route corridor currently has 0 active Convective SIGMETs. Departure is ${depCat}, Arrival is ${arrCat}. `;
    } else {
      alertType = "NOMINAL";
      alertTitle = "✓ NOAA Live Dispatch: Favorable Route Conditions";
      summaryText += `Departure weather is ${depCat} with ${depWeather?.winds || "light winds"}. Arrival weather is ${arrCat} with ${arrWeather?.winds || "favorable winds"}. Route corridor is clear of convective SIGMETs. `;
    }

    if (depTaf && depTaf.targetForecastSummary) {
      summaryText += ` ${depTaf.targetForecastSummary}`;
    }

    // Turbulence Assessment
    let turbText = "";
    if (activeTurbHazards.length > 0) {
      const h = activeTurbHazards[0];
      turbText = `🌬 ${h.title}: ${h.decodedSummary || h.rawText}`;
    } else if (hasConvectiveSigmet) {
      turbText = "⚠️ CONVECTIVE TURBULENCE: Expect severe updrafts/downdrafts near active storm cells.";
    } else {
      turbText = "✓ NOAA Turbulence Scan: Zero active turbulence advisories overlapping route corridor.";
    }

    // Icing Assessment
    let iceText = "";
    if (activeIceHazards.length > 0) {
      const h = activeIceHazards[0];
      iceText = `❄️ ${h.title}: ${h.decodedSummary || h.rawText}`;
    } else if (hasConvectiveSigmet) {
      iceText = "❄️ CONVECTIVE ICING HAZARD: Heavy icing threat inside Cumulonimbus (CB) cloud tops.";
    } else {
      iceText = "✓ NOAA Icing Scan: Zero active icing advisories overlapping route corridor.";
    }

    // Convective Assessment
    let convectiveText = "";
    if (hasConvectiveSigmet) {
      convectiveText = "🚨 ACTIVE CONVECTIVE SIGMET: Storm cells detected in 50 NM corridor.";
    } else if (hasForecastConvective) {
      convectiveText = "🌦 CONVECTIVE OUTLOOK: TAF forecasts localized VCTS / CB. 0 active SIGMETs in corridor.";
    } else {
      convectiveText = "✓ NOAA CONVECTIVE SIGMET Scan: Zero active thunderstorm SIGMETs in corridor.";
    }

    return {
      title: alertTitle,
      alertType,
      summary: summaryText,
      hasThunderstorm: alertType === "CRITICAL",
      isAdvisory: alertType === "ADVISORY",
      convective: convectiveText,
      turb: turbText,
      ice: iceText,
    };
  }, [activeLeg, depWeather, arrWeather, depTaf, arrTaf, enrouteHazards]);

  const getCategoryBadge = (cat?: string) => {
    switch (cat) {
      case "VFR": return "bg-emerald-600 text-white font-black";
      case "MVFR": return "bg-sky-600 text-white font-black";
      case "IFR": return "bg-rose-600 text-white font-black animate-pulse";
      case "LIFR": return "bg-fuchsia-600 text-white font-black animate-pulse";
      default: return "bg-slate-700 text-white font-black";
    }
  };

  const handlePrecacheActiveTrip = async () => {
    if (isCachingRoute) return;
    setIsCachingRoute(true);
    setCachingProgress(0);
    try {
      const coords = fplWaypoints
        .map((w) => getAirportCoordsSync(w))
        .filter((c): c is [number, number] => c !== null);
      if (coords.length >= 2) {
        await precacheFlightRoute(coords, 50, 3, 8, (done: number, total: number) => {
          setCachingProgress(Math.round((done / total) * 100));
        });
      }
      await updateCacheStats();
    } finally {
      setIsCachingRoute(false);
      setCachingProgress(null);
    }
  };

  const handleDownloadFullMapPack = async () => {
    if (isCachingRoute) return;
    setIsCachingRoute(true);
    setCachingProgress(0);
    try {
      await precacheFullNorthAmericaMapPack((done: number, total: number) => {
        setCachingProgress(Math.round((done / total) * 100));
      });
      await updateCacheStats();
    } finally {
      setIsCachingRoute(false);
      setCachingProgress(null);
    }
  };

  const handleClearTileCache = async () => {
    if (confirm("Clear all offline saved ForeFlight map tiles?")) {
      await clearTileCache();
      await updateCacheStats();
    }
  };

  const handleRecenterRoute = () => {
    if (typeof window !== "undefined" && (window as any).leafletRecenterRoute) {
      (window as any).leafletRecenterRoute();
    }
  };

  // 4-Tier Month ➔ Sequence ➔ Day ➔ Legs Hierarchy
  const monthHierarchy = useMemo(() => {
    const monthMap: Record<string, {
      monthKey: string;
      monthLabel: string;
      totalFlights: number;
      pairings: Array<{
        pairingId: string;
        title: string;
        equipment: string;
        startDate: string;
        endDate: string;
        totalDays: number;
        totalBlockMinutes: number;
        days: Array<{
          dayIndex: number;
          date: string;
          formattedDate: string;
          legs: FlightLegItem[];
        }>;
      }>;
    }> = {};

    activeLegs.forEach((leg) => {
      const dateObj = new Date(leg.date + "T00:00:00");
      const monthKey = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, "0")}`;
      const monthLabel = dateObj.toLocaleDateString("en-US", { month: "long", year: "numeric" });

      if (!monthMap[monthKey]) {
        monthMap[monthKey] = {
          monthKey,
          monthLabel,
          totalFlights: 0,
          pairings: [],
        };
      }
      monthMap[monthKey].totalFlights++;

      const pId = leg.pairingId || "UNASSIGNED";
      let pairing = monthMap[monthKey].pairings.find((p) => p.pairingId === pId);
      if (!pairing) {
        pairing = {
          pairingId: pId,
          title: pId !== "UNASSIGNED" ? `Pairing #${pId}` : "Individual Flight Legs",
          equipment: leg.equipment,
          startDate: leg.date,
          endDate: leg.date,
          totalDays: 1,
          totalBlockMinutes: 0,
          days: [],
        };
        monthMap[monthKey].pairings.push(pairing);
      }

      if (leg.date < pairing.startDate) pairing.startDate = leg.date;
      if (leg.date > pairing.endDate) pairing.endDate = leg.date;

      const durParts = leg.duration.match(/(\d+)h\s*(\d*)m?/);
      let mins = 0;
      if (durParts) {
        mins = parseInt(durParts[1], 10) * 60 + (durParts[2] ? parseInt(durParts[2], 10) : 0);
      } else {
        const mOnly = leg.duration.match(/(\d+)m/);
        if (mOnly) mins = parseInt(mOnly[1], 10);
      }
      pairing.totalBlockMinutes += mins;

      const dIdx = leg.dayIndex;
      let dayGroup = pairing.days.find((d) => d.dayIndex === dIdx);
      if (!dayGroup) {
        dayGroup = {
          dayIndex: dIdx,
          date: leg.date,
          formattedDate: dateObj.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }),
          legs: [],
        };
        pairing.days.push(dayGroup);
      }
      dayGroup.legs.push(leg);
    });

    const result = Object.values(monthMap).sort((a, b) => a.monthKey.localeCompare(b.monthKey));
    result.forEach((m) => {
      m.pairings.forEach((p) => {
        p.days.sort((a, b) => a.dayIndex - b.dayIndex);
        p.totalDays = p.days.length;
      });
    });
    return result;
  }, [activeLegs]);

  const [selectedMonthKey, setSelectedMonthKey] = useState<string>(() => {
    return monthHierarchy[0]?.monthKey || "2026-08";
  });

  useEffect(() => {
    if (activeLeg?.date) {
      const activeMonthKey = activeLeg.date.slice(0, 7);
      if (monthHierarchy.some((m) => m.monthKey === activeMonthKey)) {
        setSelectedMonthKey(activeMonthKey);
      }
    }
  }, [activeLeg, monthHierarchy]);

  const [expandedPairings, setExpandedPairings] = useState<Record<string, boolean>>({});
  const [selectedPairingDay, setSelectedPairingDay] = useState<Record<string, number | "ALL">>({});

  const searchResults = useMemo(() => {
    if (!flightSearchQuery.trim()) return null;
    const q = flightSearchQuery.toUpperCase().trim();
    return activeLegs.filter((leg) => {
      const depInfo = ALL_MAJOR_AIRPORTS[leg.dep];
      const arrInfo = ALL_MAJOR_AIRPORTS[leg.arr];
      return (
        leg.fltNum.toUpperCase().includes(q) ||
        leg.dep.toUpperCase().includes(q) ||
        leg.arr.toUpperCase().includes(q) ||
        leg.pairingId?.toUpperCase().includes(q) ||
        (depInfo && depInfo.name.toUpperCase().includes(q)) ||
        (arrInfo && arrInfo.name.toUpperCase().includes(q))
      );
    });
  }, [activeLegs, flightSearchQuery]);

  return (
    <div className="relative w-full h-full bg-white flex flex-col overflow-hidden select-none font-sans text-slate-900">
      {/* 1. Full-Screen Interactive ForeFlight Weather Map */}
      <div className="flex-1 w-full h-full relative z-0">
        <BriefingMap
          depAirport={depCode}
          arrAirport={arrCode}
          showFlightPlan={showFlightPlan}
          waypoints={fplWaypoints}
          onAirportSelect={handleAirportSelect}
          onAddWaypoint={addWaypointToFpl}
          onMapTap={setTapLocationData}
          showRadar={mapPrefs.showRadar}
          showSatelliteClouds={mapPrefs.showSatelliteClouds}
          showNwsWarnings={mapPrefs.showNwsWarnings}
          showRadarRings={mapPrefs.showRadarRings}
          showSigmet={mapPrefs.showSigmet}
          showSigmetConvective={mapPrefs.showSigmetConvective}
          showSigmetTurbulence={mapPrefs.showSigmetTurbulence}
          showSigmetIcing={mapPrefs.showSigmetIcing}
          showSigmetIfr={mapPrefs.showSigmetIfr}
          showLightning={mapPrefs.showLightning}
          lightningMaxAge={mapPrefs.lightningMaxAge}
          showDemoRain={false}
          showAllAirports={mapPrefs.showAllAirports}
          showAirportMarkers={mapPrefs.showAirportMarkers}
          corridorNm={50}
          liveHazards={liveHazards}
          liveLightning={liveLightning}
          liveAirportConditions={liveAirportConditions}
          showTurbulence={mapPrefs.showTurbulence}
          turbulenceAltBand={mapPrefs.turbulenceAltBand || "ALL"}
          turbulenceMaxAge={mapPrefs.turbulenceMaxAge || 90}
          liveTurbulence={liveTurbulence}
          userLocation={userLocation}
          onLocateMe={handleLocateMe}
        />
      </div>

      {/* 2. Top Edge-to-Edge ForeFlight Controls Bar (Clean High-Contrast Bright Style) */}
      <div className="absolute top-0 inset-x-0 z-20 pointer-events-auto flex flex-col pt-[max(2.75rem,calc(env(safe-area-inset-top,0px)+0.75rem))] px-2.5 pb-2.5 sm:px-4 sm:pb-3 bg-white/95 backdrop-blur-2xl border-b border-slate-200 shadow-md">
        {/* Primary Actions (Map Layers | Full-Width Flight Leg & FPL Select | Briefing | Refresh) */}
        <div className="flex items-center justify-between gap-1.5 sm:gap-2 w-full">
          {/* Left: Map Layers Button */}
          <div className="relative shrink-0">
            <button
              onClick={() => setShowLayersMenu(!showLayersMenu)}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl border shadow-2xs transition text-xs font-black cursor-pointer active-press ${
                showLayersMenu
                  ? "bg-slate-900 border-slate-900 text-white shadow-xs"
                  : "bg-slate-100 border-slate-200 text-slate-800 hover:bg-slate-200"
              }`}
              title="Map Layers & Weather Overlays"
            >
              <Layers className={`w-4 h-4 ${showLayersMenu ? "text-sky-400" : "text-slate-700"}`} />
              <span className="hidden sm:inline">Layers</span>
              {(mapPrefs.showRadar || mapPrefs.showSigmet || mapPrefs.showTurbulence || mapPrefs.showLightning) && (
                <span className="w-2 h-2 rounded-full bg-sky-600 animate-pulse"></span>
              )}
            </button>

            {/* Clean White Bottom Sheet Map Layers Menu Drawer */}
            {showLayersMenu && typeof document !== "undefined" && createPortal(
              <>
                <div
                  className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-[100000] animate-fadeIn"
                  onClick={() => setShowLayersMenu(false)}
                />
                <div className="fixed inset-x-0 bottom-0 z-[100001] max-w-lg mx-auto bg-white border-t border-slate-200 rounded-t-3xl p-4 sm:p-5 shadow-2xl space-y-4 animate-slideUp max-h-[85vh] overflow-y-auto scrollbar-thin pb-[max(2rem,calc(env(safe-area-inset-bottom,0px)+1.5rem))] text-slate-900 font-sans">
                  <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto mb-2 shrink-0 sm:hidden" />
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                    <div className="flex items-center gap-2">
                      <Layers className="w-5 h-5 text-sky-600" />
                      <div>
                        <h3 className="text-sm font-black text-slate-900">ForeFlight Weather & Map Layers</h3>
                        <p className="text-[11px] text-slate-500 font-medium">Preferences are automatically saved</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowLayersMenu(false)}
                      className="px-3 py-1 text-xs font-black text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer active-press"
                    >
                      Done
                    </button>
                  </div>

                  {/* Layer Toggles Grid */}
                  <div className="space-y-2.5 text-xs">
                    {/* SECTION: Radar & Satellite */}
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block px-1">
                        Radar & Satellite
                      </span>

                      <label className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200 cursor-pointer hover:bg-slate-100">
                        <div className="flex items-center gap-2.5">
                          <Cloud className="w-4 h-4 text-emerald-600" />
                          <div>
                            <span className="font-bold block text-slate-900">Live High-Res Doppler Radar</span>
                            <span className="text-[10px] text-slate-500">NOAA composite reflectivity</span>
                          </div>
                        </div>
                        <input
                          type="checkbox"
                          checked={mapPrefs.showRadar}
                          onChange={(e) => updatePref("showRadar", e.target.checked)}
                          className="w-4 h-4 rounded text-sky-600 border-slate-300 focus:ring-0 cursor-pointer"
                        />
                      </label>
                    </div>

                    {/* SECTION: SIGMETs & AIRMETs */}
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block px-1">
                        NOAA Weather Advisories (SIGMETs & AIRMETs)
                      </span>

                      {/* Convective SIGMET */}
                      <label className="flex items-center justify-between p-3 rounded-2xl bg-rose-50 border border-rose-200 cursor-pointer hover:bg-rose-100/70">
                        <div className="flex items-center gap-2.5">
                          <Shield className="w-4 h-4 text-rose-600" />
                          <div>
                            <span className="font-bold block text-rose-950">Convective SIGMETs (Storms)</span>
                            <span className="text-[10px] text-rose-700 font-medium">Active severe storm & hail polygons</span>
                          </div>
                        </div>
                        <input
                          type="checkbox"
                          checked={mapPrefs.showSigmetConvective}
                          onChange={(e) => updatePref("showSigmetConvective", e.target.checked)}
                          className="w-4 h-4 rounded text-rose-600 border-rose-300 focus:ring-0 cursor-pointer"
                        />
                      </label>

                      {/* Turbulence AIRMET Tango */}
                      <label className="flex items-center justify-between p-3 rounded-2xl bg-amber-50 border border-amber-200 cursor-pointer hover:bg-amber-100/70">
                        <div className="flex items-center gap-2.5">
                          <Wind className="w-4 h-4 text-amber-600" />
                          <div>
                            <span className="font-bold block text-amber-950">Turbulence Advisories (AIRMET Tango)</span>
                            <span className="text-[10px] text-amber-700 font-medium">Moderate & severe enroute turbulence bands</span>
                          </div>
                        </div>
                        <input
                          type="checkbox"
                          checked={mapPrefs.showSigmetTurbulence}
                          onChange={(e) => updatePref("showSigmetTurbulence", e.target.checked)}
                          className="w-4 h-4 rounded text-amber-600 border-amber-300 focus:ring-0 cursor-pointer"
                        />
                      </label>

                      {/* Icing AIRMET Zulu */}
                      <label className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200 cursor-pointer hover:bg-slate-100">
                        <div className="flex items-center gap-2.5">
                          <span className="text-cyan-600 text-sm">❄️</span>
                          <div>
                            <span className="font-bold block text-slate-900">Icing Advisories (AIRMET Zulu)</span>
                            <span className="text-[10px] text-slate-500">Freezing level & icing threat zones</span>
                          </div>
                        </div>
                        <input
                          type="checkbox"
                          checked={mapPrefs.showSigmetIcing}
                          onChange={(e) => updatePref("showSigmetIcing", e.target.checked)}
                          className="w-4 h-4 rounded text-sky-600 border-slate-300 focus:ring-0 cursor-pointer"
                        />
                      </label>

                      {/* IFR / Mountain Obscuration */}
                      <label className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200 cursor-pointer hover:bg-slate-100">
                        <div className="flex items-center gap-2.5">
                          <Eye className="w-4 h-4 text-purple-600" />
                          <div>
                            <span className="font-bold block text-slate-900">IFR & Mountain Obscuration (AIRMET Sierra)</span>
                            <span className="text-[10px] text-slate-500">Ceiling &lt; 1,000 ft / Vis &lt; 3 SM</span>
                          </div>
                        </div>
                        <input
                          type="checkbox"
                          checked={mapPrefs.showSigmetIfr}
                          onChange={(e) => updatePref("showSigmetIfr", e.target.checked)}
                          className="w-4 h-4 rounded text-sky-600 border-slate-300 focus:ring-0 cursor-pointer"
                        />
                      </label>
                    </div>

                    {/* SECTION: PIREPs & Lightning */}
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block px-1">
                        Live Telemetry & Pilot Reports
                      </span>

                      {/* PIREP Turbulence */}
                      <div className="rounded-2xl bg-slate-50 border border-slate-200 overflow-hidden">
                        <label className="flex items-center justify-between p-3 cursor-pointer hover:bg-slate-100/80">
                          <div className="flex items-center gap-2.5">
                            <Wind className="w-4 h-4 text-amber-600" />
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-900">Live PIREP Turbulence Reports</span>
                                <span className="px-1.5 py-0.5 rounded text-[9.5px] font-black bg-amber-100 text-amber-800 border border-amber-200">
                                  {liveTurbulence.length} Live
                                </span>
                              </div>
                              <span className="text-[10px] text-slate-500">Real-time aircraft EDR & pilot ride reports (auto-expiring)</span>
                            </div>
                          </div>
                          <input
                            type="checkbox"
                            checked={mapPrefs.showTurbulence}
                            onChange={(e) => updatePref("showTurbulence", e.target.checked)}
                            className="w-4 h-4 rounded text-sky-600 border-slate-300 focus:ring-0 cursor-pointer"
                          />
                        </label>

                        {mapPrefs.showTurbulence && (
                          <div className="px-3 pb-3 pt-1 border-t border-slate-200/60 bg-white/70 space-y-2">
                            {/* Max Age Filter */}
                            <div>
                              <div className="flex items-center justify-between text-[10px] font-bold text-slate-600 mb-1">
                                <span>Max Report Age:</span>
                                <span className="text-sky-700 font-extrabold">{mapPrefs.turbulenceMaxAge || 90} min</span>
                              </div>
                              <div className="grid grid-cols-4 gap-1">
                                {([30, 60, 90, 120] as const).map((age) => (
                                  <button
                                    key={age}
                                    type="button"
                                    onClick={() => updatePref("turbulenceMaxAge", age)}
                                    className={`py-1 rounded-lg text-[10px] font-black border transition ${
                                      (mapPrefs.turbulenceMaxAge || 90) === age
                                        ? "bg-slate-900 border-slate-900 text-white shadow-2xs"
                                        : "bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200"
                                    }`}
                                  >
                                    {age}m
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* Altitude Band Filter */}
                            <div>
                              <div className="flex items-center justify-between text-[10px] font-bold text-slate-600 mb-1">
                                <span>Altitude Layer:</span>
                                <span className="text-sky-700 font-extrabold">{mapPrefs.turbulenceAltBand || "ALL"}</span>
                              </div>
                              <div className="grid grid-cols-4 gap-1">
                                {(
                                  [
                                    { id: "ALL", label: "ALL" },
                                    { id: "LOW", label: "FL18-28" },
                                    { id: "MID", label: "FL29-35" },
                                    { id: "HIGH", label: "FL36+" },
                                  ] as const
                                ).map((band) => (
                                  <button
                                    key={band.id}
                                    type="button"
                                    onClick={() => updatePref("turbulenceAltBand", band.id)}
                                    className={`py-1 rounded-lg text-[10px] font-black border transition ${
                                      (mapPrefs.turbulenceAltBand || "ALL") === band.id
                                        ? "bg-slate-900 border-slate-900 text-white shadow-2xs"
                                        : "bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200"
                                    }`}
                                  >
                                    {band.label}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Lightning */}
                      <label className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200 cursor-pointer hover:bg-slate-100">
                        <div className="flex items-center gap-2.5">
                          <Zap className="w-4 h-4 text-amber-600" />
                          <div>
                            <span className="font-bold block text-slate-900">Live Vector Lightning Strikes</span>
                            <span className="text-[10px] text-slate-500">Real-time cloud-to-ground strikes</span>
                          </div>
                        </div>
                        <input
                          type="checkbox"
                          checked={mapPrefs.showLightning}
                          onChange={(e) => updatePref("showLightning", e.target.checked)}
                          className="w-4 h-4 rounded text-sky-600 border-slate-300 focus:ring-0 cursor-pointer"
                        />
                      </label>

                      {/* Show Major Hub Airports */}
                      <label className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200 cursor-pointer hover:bg-slate-100">
                        <div className="flex items-center gap-2.5">
                          <Navigation className="w-4 h-4 text-sky-600" />
                          <div>
                            <span className="font-bold block text-slate-900">Show Major Hub Airport Pins</span>
                            <span className="text-[10px] text-slate-500">Interactive airport flight category pins</span>
                          </div>
                        </div>
                        <input
                          type="checkbox"
                          checked={mapPrefs.showAllAirports}
                          onChange={(e) => updatePref("showAllAirports", e.target.checked)}
                          className="w-4 h-4 rounded text-sky-600 border-slate-300 focus:ring-0 cursor-pointer"
                        />
                      </label>
                    </div>
                  </div>

                  {/* Offline Cache Storage Section */}
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Download className="w-4 h-4 text-sky-600" />
                        <span className="text-xs font-black text-slate-900">Offline Map Cache</span>
                      </div>
                      <span className="text-[11px] font-mono font-bold text-sky-700">
                        {cacheStats.count} tiles ({cacheStats.sizeMb} MB)
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={handlePrecacheActiveTrip}
                        disabled={isCachingRoute}
                        className="py-2 px-3 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5 shadow-xs active-press"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>{isCachingRoute ? `Saving... ${cachingProgress || 0}%` : "Cache Flight Path"}</span>
                      </button>

                      <button
                        onClick={handleClearTileCache}
                        className="py-2 px-3 bg-white hover:bg-rose-50 hover:border-rose-300 text-slate-700 hover:text-rose-700 border border-slate-200 rounded-xl text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5 active-press"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Clear Cache</span>
                      </button>
                    </div>

                    <button
                      onClick={handleDownloadFullMapPack}
                      disabled={isCachingRoute}
                      className="w-full py-2.5 px-3 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-800 border border-slate-200 rounded-xl text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5 active-press"
                    >
                      <Globe2 className="w-3.5 h-3.5 text-sky-600" />
                      <span>{cacheStats.isFullPackReady ? "✓ Full North America Map Saved" : "🗺️ Download Full North America Map (~50 MB)"}</span>
                    </button>
                  </div>
                </div>
              </>,
              document.body
            )}
          </div>

          {/* Center: Flight Leg Selector & FPL Pill (Expanded, Clean, High-Contrast) */}
          <div className="relative flex items-center min-w-0 flex-1 justify-center mx-1 sm:mx-2">
            <div className="bg-white border border-slate-200 rounded-xl px-2 sm:px-2.5 py-1.5 shadow-2xs flex items-center gap-1.5 w-full justify-between">
              <button
                onClick={() => setShowFlightSelector(true)}
                className="flex items-center gap-1.5 min-w-0 flex-1 text-left cursor-pointer active-press hover:opacity-80 transition"
              >
                <Plane className={`w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 ${showFlightPlan ? "text-sky-600" : "text-amber-600"}`} />
                <div className="min-w-0 flex-1 leading-tight">
                  <div className="text-xs font-black text-slate-900 truncate">
                    {showFlightPlan ? `${activeLeg.fltNum} • ${activeLeg.dep}➔${activeLeg.arr}` : "🌦 Off-Day Map"}
                  </div>
                  <div className="text-[10px] text-slate-500 font-semibold truncate">
                    {showFlightPlan ? `${activeLeg.date} • ${activeLeg.time}` : "Custom waypoints"}
                  </div>
                </div>
                <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />
              </button>

              <div className="h-4 w-px bg-slate-200 shrink-0"></div>

              <button
                onClick={() => setShowFplDrawer(!showFplDrawer)}
                className="flex items-center gap-1 text-xs font-black text-sky-700 hover:text-sky-900 px-2 py-1 rounded-lg bg-sky-50 hover:bg-sky-100 border border-sky-200/60 transition cursor-pointer shrink-0 active-press"
                title="View / Edit Waypoints (FPL)"
              >
                <span>FPL</span>
                {showFplDrawer ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
            </div>

            {/* Clean White Bottom Sheet Flight & Route Selector Modal */}
            {showFlightSelector && typeof document !== "undefined" && createPortal(
              <>
                <div
                  className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-[100000] animate-fadeIn"
                  onClick={() => setShowFlightSelector(false)}
                />
                <div className="fixed inset-x-0 bottom-0 z-[100001] w-full max-w-xl mx-auto bg-white border-t border-slate-200 rounded-t-3xl shadow-2xl flex flex-col animate-slideUp max-h-[88vh] overflow-hidden text-slate-900 font-sans">
                  {/* Sticky Header */}
                  <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 border-b border-slate-200 bg-white/95 backdrop-blur-xl shrink-0">
                    <div className="flex items-center gap-2">
                      <Plane className="w-4 h-4 text-sky-600" />
                      <div>
                        <h3 className="text-sm font-black text-slate-900 leading-tight">Flight & Route Selector</h3>
                        <span className="text-[10px] text-slate-500 font-semibold">
                          {activeLegs.length} flight legs across {monthHierarchy.length} month{monthHierarchy.length > 1 ? "s" : ""}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowFlightSelector(false)}
                      className="px-3.5 py-1.5 text-xs font-black text-slate-700 hover:text-slate-900 rounded-xl bg-slate-100 hover:bg-slate-200 cursor-pointer active-press flex items-center gap-1"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>Done</span>
                    </button>
                  </div>

                  {/* Search Bar & Level 1: Month Selector Tabs */}
                  <div className="p-3.5 bg-slate-50 border-b border-slate-200 space-y-2.5 shrink-0">
                    {/* Search Field */}
                    <div className="relative flex items-center">
                      <input
                        type="text"
                        value={flightSearchQuery}
                        onChange={(e) => setFlightSearchQuery(e.target.value)}
                        placeholder="Search flight #, ORD, MIA, Chicago, pairing..."
                        className="w-full bg-white border border-slate-300 focus:border-sky-600 rounded-xl px-3 py-2 pl-9 text-xs text-slate-900 placeholder-slate-400 focus:outline-none transition shadow-inner font-medium"
                      />
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 pointer-events-none" />
                      {flightSearchQuery && (
                        <button
                          onClick={() => setFlightSearchQuery("")}
                          className="absolute right-2.5 text-slate-400 hover:text-slate-900 text-xs cursor-pointer p-1"
                        >
                          ✕
                        </button>
                      )}
                    </div>

                    {/* Level 1: Month Tabs (Horizontal Scroll) */}
                    {!searchResults && monthHierarchy.length > 0 && (
                      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                        {monthHierarchy.map((m) => (
                          <button
                            key={m.monthKey}
                            onClick={() => setSelectedMonthKey(m.monthKey)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
                              selectedMonthKey === m.monthKey
                                ? "bg-sky-600 text-white shadow-sm"
                                : "bg-white text-slate-700 hover:text-slate-900 hover:bg-slate-100 border border-slate-200"
                            }`}
                          >
                            <Calendar className="w-3.5 h-3.5" />
                            <span>{m.monthLabel}</span>
                            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                              selectedMonthKey === m.monthKey ? "bg-sky-700 text-white" : "bg-slate-100 text-slate-600"
                            }`}>
                              {m.totalFlights}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Scrollable Content Body */}
                  <div className="p-3.5 sm:p-4 overflow-y-auto scrollbar-thin space-y-4 flex-1 pb-[max(2rem,calc(env(safe-area-inset-bottom,0px)+1.5rem))] bg-white">
                    
                    {/* Quick Action: Auto-Detect Next / Current Flight */}
                    <div className="bg-sky-50 p-3 rounded-2xl border border-sky-200 flex items-center justify-between gap-2 shadow-xs">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                          <span className="text-[11px] font-black text-sky-800 uppercase tracking-wide">
                            {legStatus === "IN_PROGRESS" ? "Active In-Flight" : "Next Upcoming Leg"}
                          </span>
                        </div>
                        <div className="text-xs font-bold text-slate-800 truncate mt-0.5">
                          {autoSelectedLeg.fltNum} • {autoSelectedLeg.dep} ➔ {autoSelectedLeg.arr} ({autoSelectedLeg.time})
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          setSelectedLegId(autoSelectedLeg.id);
                          setShowFlightSelector(false);
                        }}
                        className="px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-black shrink-0 shadow-sm cursor-pointer active-press"
                      >
                        Select Next
                      </button>
                    </div>

                    {/* Search Results (Flat View) */}
                    {searchResults ? (
                      <div className="space-y-2">
                        <div className="text-[11px] font-black text-slate-500 uppercase tracking-wider">
                          Search Matches ({searchResults.length})
                        </div>
                        {searchResults.length === 0 ? (
                          <div className="p-6 text-center text-xs text-slate-500 font-medium bg-slate-50 rounded-2xl border border-slate-200">
                            No flights matching &quot;{flightSearchQuery}&quot;
                          </div>
                        ) : (
                          searchResults.map((leg) => {
                            const isSelected = selectedLegId === leg.id;
                            const depInfo = ALL_MAJOR_AIRPORTS[leg.dep];
                            const arrInfo = ALL_MAJOR_AIRPORTS[leg.arr];

                            return (
                              <div
                                key={leg.id}
                                onClick={() => {
                                  setSelectedLegId(leg.id);
                                  setShowFlightSelector(false);
                                }}
                                className={`p-3 rounded-2xl border transition cursor-pointer ${
                                  isSelected
                                    ? "bg-sky-50 border-2 border-sky-600 shadow-sm"
                                    : "bg-white hover:bg-slate-50 border-slate-200"
                                }`}
                              >
                                <div className="flex items-center justify-between pb-1.5">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-black text-white bg-sky-600 px-2 py-0.5 rounded font-mono">
                                      {leg.fltNum}
                                    </span>
                                    <span className="text-[10px] text-slate-500 font-mono">
                                      {leg.date}
                                    </span>
                                    <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 font-mono">
                                      {leg.equipment}
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-mono font-bold text-slate-800">
                                      {leg.time} ➔ {leg.arrTime}
                                    </span>
                                    {isSelected && (
                                      <span className="text-[10px] font-black bg-sky-600 text-white px-2 py-0.5 rounded-full flex items-center gap-0.5">
                                        <CheckCircle2 className="w-3 h-3" /> Selected
                                      </span>
                                    )}
                                  </div>
                                </div>

                                <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
                                  <div className="min-w-0">
                                    <div className="font-black text-sky-700 text-sm">{leg.dep}</div>
                                    <div className="text-[10px] text-slate-500 truncate max-w-[130px]">
                                      {depInfo?.name || leg.dep}
                                    </div>
                                  </div>
                                  <div className="flex flex-col items-center px-2 shrink-0">
                                    <Plane className="w-3.5 h-3.5 text-slate-400 rotate-90" />
                                    <div className="w-12 h-px bg-slate-200 mt-1"></div>
                                  </div>
                                  <div className="min-w-0 text-right">
                                    <div className="font-black text-sky-700 text-sm">{leg.arr}</div>
                                    <div className="text-[10px] text-slate-500 truncate max-w-[130px]">
                                      {arrInfo?.name || leg.arr}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    ) : (
                      /* Level 2 & 3: Sequences / Pairings ➔ Days ➔ Legs for Selected Month */
                      (() => {
                        const activeMonth = monthHierarchy.find((m) => m.monthKey === selectedMonthKey) || monthHierarchy[0];
                        if (!activeMonth || activeMonth.pairings.length === 0) {
                          return (
                            <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                              <Plane className="w-8 h-8 text-slate-400 mx-auto" />
                              <p className="text-xs font-bold text-slate-500">No scheduled trips in this month.</p>
                            </div>
                          );
                        }

                        return (
                          <div className="space-y-3">
                            {activeMonth.pairings.map((pairing) => {
                              const isExpanded = expandedPairings[pairing.pairingId] ?? false;
                              const activeDayFilter = selectedPairingDay[pairing.pairingId] ?? "ALL";
                              const filteredDays = activeDayFilter === "ALL"
                                ? pairing.days
                                : pairing.days.filter((d) => d.dayIndex === activeDayFilter);

                              const totalPairingLegs = pairing.days.reduce((acc, d) => acc + d.legs.length, 0);
                              const totalHours = Math.floor(pairing.totalBlockMinutes / 60);
                              const totalMins = pairing.totalBlockMinutes % 60;

                              return (
                                <div
                                  key={pairing.pairingId}
                                  className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs"
                                >
                                  {/* Level 2: Sequence / Pairing Header */}
                                  <div
                                    onClick={() => {
                                      setExpandedPairings((prev) => ({
                                        ...prev,
                                        [pairing.pairingId]: !isExpanded,
                                      }));
                                    }}
                                    className="p-3.5 bg-slate-50 hover:bg-slate-100/80 border-b border-slate-200 flex items-center justify-between cursor-pointer transition select-none"
                                  >
                                    <div className="flex items-center gap-2.5 min-w-0">
                                      <div className="w-8 h-8 rounded-xl bg-sky-100 border border-sky-200 flex items-center justify-center shrink-0">
                                        <Plane className="w-4 h-4 text-sky-700" />
                                      </div>
                                      <div className="min-w-0">
                                        <div className="flex items-center gap-1.5">
                                          <h4 className="text-xs font-black text-slate-900">{pairing.title}</h4>
                                          <span className="text-[10px] bg-slate-200 text-slate-700 font-mono px-1.5 py-0.2 rounded font-bold">
                                            {pairing.equipment}
                                          </span>
                                        </div>
                                        <div className="text-[10.5px] text-slate-500 font-medium truncate">
                                          {pairing.startDate} ➔ {pairing.endDate} • {pairing.totalDays} Days ({totalPairingLegs} legs • {totalHours}h {totalMins}m)
                                        </div>
                                      </div>
                                    </div>

                                    <div className="flex items-center gap-2 shrink-0">
                                      <div className="p-1 rounded-lg bg-slate-200 text-slate-700">
                                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                      </div>
                                    </div>
                                  </div>

                                  {/* Expanded Pairing Body */}
                                  {isExpanded && (
                                    <div className="p-3 space-y-3 bg-slate-50/50">
                                      {/* Level 3: Day Selector Chips within Pairing */}
                                      {pairing.days.length > 1 && (
                                        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                                          <button
                                            onClick={() => {
                                              setSelectedPairingDay((prev) => ({
                                                ...prev,
                                                [pairing.pairingId]: "ALL",
                                              }));
                                            }}
                                            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer whitespace-nowrap ${
                                              activeDayFilter === "ALL"
                                                ? "bg-sky-600 text-white shadow-2xs"
                                                : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-100"
                                            }`}
                                          >
                                            All Days ({pairing.days.length})
                                          </button>
                                          {pairing.days.map((day) => (
                                            <button
                                              key={day.dayIndex}
                                              onClick={() => {
                                                setSelectedPairingDay((prev) => ({
                                                  ...prev,
                                                  [pairing.pairingId]: day.dayIndex,
                                                }));
                                              }}
                                              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer whitespace-nowrap ${
                                                activeDayFilter === day.dayIndex
                                                  ? "bg-sky-600 text-white shadow-2xs"
                                                  : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-100"
                                              }`}
                                            >
                                              Day {day.dayIndex + 1} ({day.legs.length} leg{day.legs.length > 1 ? "s" : ""})
                                            </button>
                                          ))}
                                        </div>
                                      )}

                                      {/* Level 4: Flight Legs List */}
                                      <div className="space-y-2">
                                        {filteredDays.map((day) => (
                                          <div key={day.dayIndex} className="space-y-1.5">
                                            {pairing.days.length > 1 && activeDayFilter === "ALL" && (
                                              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider pt-1">
                                                Day {day.dayIndex + 1} &bull; {day.date} ({day.legs.length} flights)
                                              </div>
                                            )}

                                            <div className="space-y-2">
                                              {day.legs.map((leg) => {
                                                const isSelected = selectedLegId === leg.id;
                                                const depInfo = ALL_MAJOR_AIRPORTS[leg.dep];
                                                const arrInfo = ALL_MAJOR_AIRPORTS[leg.arr];

                                                return (
                                                  <div
                                                    key={leg.id}
                                                    onClick={() => {
                                                      setSelectedLegId(leg.id);
                                                      setShowFlightSelector(false);
                                                    }}
                                                    className={`p-3 rounded-2xl border transition cursor-pointer ${
                                                      isSelected
                                                        ? "bg-sky-50 border-2 border-sky-600 shadow-sm"
                                                        : "bg-white hover:bg-slate-50 border-slate-200 shadow-2xs"
                                                    }`}
                                                  >
                                                    {/* Leg Top Metadata */}
                                                    <div className="flex items-center justify-between pb-1.5">
                                                      <div className="flex items-center gap-2">
                                                        <span className="text-xs font-black text-white bg-sky-600 px-2 py-0.5 rounded font-mono">
                                                          {leg.fltNum}
                                                        </span>
                                                        <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 font-mono">
                                                          {leg.equipment}
                                                        </span>
                                                      </div>

                                                      <div className="flex items-center gap-2">
                                                        <span className="text-xs font-mono font-bold text-slate-800">
                                                          {leg.time} ➔ {leg.arrTime}
                                                        </span>
                                                        {isSelected ? (
                                                          <span className="text-[10px] font-black bg-sky-600 text-white px-2 py-0.5 rounded-full flex items-center gap-0.5">
                                                            <CheckCircle2 className="w-3 h-3" /> Selected
                                                          </span>
                                                        ) : (
                                                          <span className="text-[10px] font-bold text-slate-500 font-mono">
                                                            {leg.duration}
                                                          </span>
                                                        )}
                                                      </div>
                                                    </div>

                                                    {/* Route Line: Airports & City Names */}
                                                    <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
                                                      <div className="min-w-0">
                                                        <div className="font-black text-sky-700 text-sm">{leg.dep}</div>
                                                        <div className="text-[10px] text-slate-500 truncate max-w-[130px]">
                                                          {depInfo?.name || leg.dep}
                                                        </div>
                                                      </div>

                                                      <div className="flex flex-col items-center px-2 shrink-0">
                                                        <Plane className="w-3.5 h-3.5 text-slate-400 rotate-90" />
                                                        <div className="w-12 h-px bg-slate-200 mt-1"></div>
                                                      </div>

                                                      <div className="min-w-0 text-right">
                                                        <div className="font-black text-sky-700 text-sm">{leg.arr}</div>
                                                        <div className="text-[10px] text-slate-500 truncate max-w-[130px]">
                                                          {arrInfo?.name || leg.arr}
                                                        </div>
                                                      </div>
                                                    </div>
                                                  </div>
                                                );
                                              })}
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        );
                      })()
                    )}
                  </div>
                </div>
              </>,
              document.body
            )}

            {/* Clean White Bottom Sheet Flight Plan Waypoints Editor */}
            {showFplDrawer && typeof document !== "undefined" && createPortal(
              <>
                <div
                  className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-[100000] animate-fadeIn"
                  onClick={() => setShowFplDrawer(false)}
                />
                <div className="fixed inset-x-0 bottom-0 z-[100001] w-full max-w-xl mx-auto bg-white border-t border-slate-200 rounded-t-3xl shadow-2xl flex flex-col animate-slideUp max-h-[85vh] overflow-hidden text-slate-900 font-sans">
                  {/* Sticky Header that NEVER scrolls off screen */}
                  <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 border-b border-slate-200 bg-white/95 backdrop-blur-xl shrink-0">
                    <span className="text-xs font-black text-slate-900 uppercase tracking-wider">Flight Plan Route Editor</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-sky-700 font-mono">{totalFplDistanceNm} NM • ~{estimatedEteHours}h</span>
                      <button
                        onClick={() => setShowFplDrawer(false)}
                        className="px-3 py-1.5 text-xs font-black text-slate-700 hover:text-slate-900 rounded-xl bg-slate-100 hover:bg-slate-200 cursor-pointer active-press flex items-center gap-1"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Done</span>
                      </button>
                    </div>
                  </div>

                  {/* Scrollable Content Body */}
                  <div className="p-4 sm:p-5 overflow-y-auto scrollbar-thin space-y-3.5 flex-1 pb-[max(2rem,calc(env(safe-area-inset-bottom,0px)+1.5rem))] bg-white">

                  {/* Waypoint list */}
                  <div className="flex flex-wrap items-center gap-1.5 max-h-36 overflow-y-auto">
                    {fplWaypoints.map((wp, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-1 bg-slate-100 border border-slate-200 rounded-xl px-2.5 py-1 text-xs font-mono font-black text-slate-900 shadow-2xs"
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
                      className="flex-1 bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono font-bold uppercase text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-sky-600"
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
                          ? "bg-slate-100 hover:bg-slate-200 text-amber-900 border-amber-300"
                          : "bg-sky-600 hover:bg-sky-700 text-white border-sky-600 shadow-sm"
                      }`}
                    >
                      <Navigation className="w-3.5 h-3.5" />
                      <span>{showFlightPlan ? "🌦 Hide Flight Plan (Off-Day Weather Mode)" : "✈️ Show Flight Plan Route"}</span>
                    </button>
                    </div>
                  </div>
                </div>
              </>,
              document.body
            )}
          </div>

          {/* Right: Briefing & Weather Refresh Actions */}
          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
            <button
              onClick={() => setShowBriefingSheet(true)}
              className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-xl text-xs font-extrabold shadow-xs transition cursor-pointer active-press shrink-0"
              aria-label="Dispatch Briefing"
            >
              <Shield className="w-3.5 h-3.5 text-amber-100 shrink-0" />
              <span className="hidden sm:inline">Briefing</span>
              <span className="sm:hidden text-[11px] font-black">Brief</span>
            </button>

            <button
              onClick={() => loadLiveWeather(true)}
              disabled={isFetchingWeather}
              className="p-1.5 sm:p-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 rounded-xl shadow-2xs cursor-pointer transition shrink-0 active-press"
              title="Refresh NOAA Weather"
            >
              <RefreshCw className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isFetchingWeather ? "animate-spin text-sky-600" : ""}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Floating Map Controls (GPS Location Button directly on map) */}
      <div className="absolute top-[max(4.75rem,calc(env(safe-area-inset-top,0px)+4rem))] right-3 z-10 flex flex-col gap-2 pointer-events-auto">
        <button
          onClick={handleLocateMe}
          disabled={isLocating}
          className={`p-2.5 rounded-2xl border shadow-md transition cursor-pointer active-press flex items-center justify-center backdrop-blur-md ${
            userLocation
              ? "bg-sky-600 border-sky-500 text-white shadow-sky-500/30"
              : "bg-white/95 hover:bg-white border-slate-200 text-slate-700 hover:text-slate-900"
          }`}
          title={userLocation ? "Center GPS Position" : "Locate My GPS Position"}
        >
          <Crosshair className={`w-4 h-4 ${isLocating ? "animate-spin text-sky-400" : userLocation ? "text-white animate-pulse" : "text-slate-700"}`} />
        </button>
      </div>

      {/* GPS Error Notification Banner */}
      {locationErrorMessage && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] sm:w-[400px] z-30 pointer-events-auto animate-slideDown">
          <div className="bg-rose-50 border border-rose-300 rounded-2xl p-3 shadow-xl flex items-center justify-between text-xs text-rose-950">
            <div className="flex items-center gap-2 min-w-0">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span className="font-medium truncate">{locationErrorMessage}</span>
            </div>
            <button
              onClick={() => setLocationErrorMessage(null)}
              className="p-1 text-rose-500 hover:text-rose-900 cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* 4. Floating Selected Airport Weather & D-ATIS Panel (Clean High-Contrast Terminal Style) */}
      {selectedAirportCode && (
        <div className="absolute bottom-[calc(4.75rem+env(safe-area-inset-bottom,0px))] left-1/2 -translate-x-1/2 w-[calc(100%-1.5rem)] sm:w-[440px] z-30 pointer-events-auto animate-slideUp">
          <div className="bg-white border border-slate-200 rounded-3xl p-4 shadow-2xl space-y-3 text-slate-900 font-sans">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-slate-900">{selectedAirportCode}</span>
                <span className="text-xs font-black text-sky-700">
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
                  className="p-1 text-slate-400 hover:text-slate-800 rounded-lg hover:bg-slate-100 cursor-pointer"
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
                <div className="bg-slate-100 p-2.5 rounded-xl border border-slate-200 font-mono text-xs text-slate-900 select-all leading-relaxed max-h-24 overflow-y-auto font-bold">
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
                      <Eye className="w-3.5 h-3.5 text-sky-600" />
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
                    <span className="font-bold text-sky-900 flex items-center gap-1 text-[11px]">
                      <Radio className="w-3.5 h-3.5 text-sky-600 animate-pulse" />
                      Digital ATIS Broadcast
                    </span>
                    <span className="font-mono font-bold text-sky-900 text-[10px]">
                      INFO {selectedAirportData?.atisData?.letter || "FOXTROT"}
                    </span>
                  </div>
                  <p className="font-mono text-[10px] text-slate-900 bg-white p-2 rounded-lg border border-sky-200 leading-relaxed max-h-20 overflow-y-auto font-medium">
                    {selectedAirportData?.atisData?.datisText || selectedAirportData?.datisText || `${selectedAirportCode} ATIS INFO FOXTROT 1750Z. WINDS 240 AT 12. VIS 10. FEW040. TEMP 22 DEWPOINT 12. ALTIMETER 29.92. ILS RUNWAY 28L IN USE. READBACK ALL HOLD SHORT INSTRUCTIONS.`}
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* 5. Full Dispatch Briefing Clean Sheet Modal */}
      {showBriefingSheet && typeof document !== "undefined" && createPortal(
        <>
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-[100000] animate-fadeIn"
            onClick={() => setShowBriefingSheet(false)}
          />
          <div className="fixed inset-x-0 bottom-0 z-[100001] w-full max-w-2xl mx-auto h-[88vh] max-h-[88vh] bg-white border-t border-slate-200 rounded-t-3xl shadow-2xl flex flex-col animate-slideUp overflow-hidden text-slate-900 font-sans">
            {/* Modal Header that NEVER scrolls off screen */}
            <div className="flex justify-between items-center px-4 sm:px-5 py-3.5 border-b border-slate-200 bg-white/95 backdrop-blur-xl shrink-0">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-amber-600" />
                <div>
                  <h3 className="text-sm sm:text-base font-black text-slate-900 leading-tight">Flight Weather Briefing & Leg Overview</h3>
                  <p className="text-[11px] text-slate-500 font-medium">Active Leg: {activeLeg.fltNum} • {activeLeg.dep} ➔ {activeLeg.arr}</p>
                </div>
              </div>
              <button
                onClick={() => setShowBriefingSheet(false)}
                className="px-3.5 py-1.5 text-xs font-black text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl border border-slate-200 cursor-pointer active-press flex items-center gap-1"
              >
                <X className="w-3.5 h-3.5" />
                <span>Done</span>
              </button>
            </div>

            {/* Modal Content Scrollable Area */}
            <div className="flex-grow overflow-y-auto scrollbar-thin p-4 sm:p-5 space-y-4 text-xs font-sans pb-[max(2rem,calc(env(safe-area-inset-bottom,0px)+1.5rem))] bg-white">
              {/* Active Flight Header & Switcher */}
              <div className="bg-slate-900 text-white rounded-2xl p-3.5 border border-slate-800 shadow-md flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-sky-500/20 border border-sky-500/40 flex items-center justify-center shrink-0">
                    <Plane className="w-5 h-5 text-sky-400" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black bg-sky-600 text-white px-2 py-0.5 rounded font-mono">
                        {activeLeg.fltNum}
                      </span>
                      <span className="text-[10px] font-bold text-slate-300 bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700 font-mono">
                        {activeLeg.equipment}
                      </span>
                      <span className="text-[10px] font-black text-amber-400">
                        {selectedLegId === autoSelectedLeg.id && legStatus === "IN_PROGRESS"
                          ? "🟢 ACTIVE IN-FLIGHT"
                          : selectedLegId === autoSelectedLeg.id
                          ? "⚡ NEXT UPCOMING"
                          : "📅 SCHEDULED"}
                      </span>
                    </div>
                    <div className="text-sm font-black text-white mt-1 truncate">
                      {activeLeg.dep} ➔ {activeLeg.arr} ({activeLeg.time} - {activeLeg.arrTime})
                    </div>
                    <div className="text-[10.5px] text-slate-400 font-medium">
                      {activeLeg.date} • {activeLeg.duration} block {activeLeg.pairingId ? `• Pairing #${activeLeg.pairingId}` : ""}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  <button
                    onClick={() => {
                      setShowBriefingSheet(false);
                      setShowFlightSelector(true);
                    }}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-sky-400 hover:text-sky-300 border border-slate-700 rounded-xl text-xs font-bold transition cursor-pointer active-press"
                  >
                    Change Flight
                  </button>
                  <button
                    onClick={() => loadLiveWeather(true)}
                    disabled={isFetchingWeather}
                    className="text-[10px] text-slate-400 hover:text-slate-200 flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className={`w-3 h-3 ${isFetchingWeather ? "animate-spin text-sky-400" : ""}`} />
                    <span>Refresh NOAA</span>
                  </button>
                </div>
              </div>

              {/* Dispatcher Live Weather Overview */}
              <div className={`p-4 rounded-2xl border transition ${
                enrouteSummary.hasThunderstorm
                  ? "bg-rose-50 border-rose-300 text-rose-950 shadow-xs"
                  : enrouteSummary.isAdvisory
                  ? "bg-amber-50 border-amber-300 text-amber-950 shadow-xs"
                  : "bg-sky-50 border-sky-200 text-sky-950"
              }`}>
                <div className="flex items-center gap-2 font-extrabold text-sm mb-1">
                  {enrouteSummary.hasThunderstorm ? (
                    <span className="text-rose-700 font-black animate-pulse">{enrouteSummary.title}</span>
                  ) : enrouteSummary.isAdvisory ? (
                    <span className="text-amber-800 font-black">{enrouteSummary.title}</span>
                  ) : (
                    <span className="text-sky-900 font-black">{enrouteSummary.title}</span>
                  )}
                </div>
                <p className="leading-relaxed font-medium text-slate-800">{enrouteSummary.summary}</p>
                <div className="flex flex-col gap-1.5 pt-3 mt-2 border-t border-slate-200 font-bold text-xs">
                  <span className={enrouteSummary.hasThunderstorm ? "text-rose-700 font-extrabold" : enrouteSummary.isAdvisory ? "text-amber-800 font-bold" : "text-sky-800"}>
                    {enrouteSummary.convective}
                  </span>
                  <span className={enrouteSummary.hasThunderstorm ? "text-amber-800" : "text-slate-700"}>{enrouteSummary.turb}</span>
                  <span className={enrouteSummary.hasThunderstorm ? "text-cyan-800" : "text-slate-700"}>{enrouteSummary.ice}</span>
                </div>
              </div>

              {/* Departure & Arrival Weather Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl border bg-slate-50 border-slate-200">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-black text-slate-900">Departure: {activeLeg.dep}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded ${getCategoryBadge(depWeather?.category)}`}>
                      {depWeather?.category || "VFR"}
                    </span>
                  </div>
                  <p className="font-mono text-[11px] bg-white p-2 rounded-lg border border-slate-200 my-2 text-slate-900 font-bold">
                    {depWeather?.rawOb || "Fetching METAR..."}
                  </p>
                  <p className="text-[11px] text-slate-600 font-medium">Winds: <strong className="text-slate-900 font-bold">{depWeather?.winds || "Calm"}</strong> | Vis: <strong className="text-slate-900 font-bold">{depWeather?.visibility || "10 SM"}</strong></p>
                </div>

                <div className="p-4 rounded-2xl border bg-slate-50 border-slate-200">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-black text-slate-900">Arrival: {activeLeg.arr}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded ${getCategoryBadge(arrWeather?.category)}`}>
                      {arrWeather?.category || "VFR"}
                    </span>
                  </div>
                  <p className="font-mono text-[11px] bg-white p-2 rounded-lg border border-slate-200 my-2 text-slate-900 font-bold">
                    {arrWeather?.rawOb || "Fetching METAR..."}
                  </p>
                  <p className="text-[11px] text-slate-600 font-medium">Winds: <strong className="text-slate-900 font-bold">{arrWeather?.winds || "Calm"}</strong> | Vis: <strong className="text-slate-900 font-bold">{arrWeather?.visibility || "10 SM"}</strong></p>
                </div>
              </div>

              {/* Active Route Hazards */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2">
                <span className="font-extrabold text-slate-900 block">Enroute Route Advisories ({enrouteHazards.length}):</span>
                {enrouteHazards.length === 0 ? (
                  <p className="text-emerald-800 font-bold bg-emerald-50 p-2.5 rounded-xl border border-emerald-300">
                    ✓ Route is clear of severe NOAA AIRMET/SIGMET hazards.
                  </p>
                ) : (
                  enrouteHazards.map((h, i) => (
                    <div key={i} className="p-3 bg-rose-50 border border-rose-300 rounded-xl text-rose-950">
                      <span className="font-bold block text-rose-900">{h.title}</span>
                      <span className="text-[11px] block mt-0.5 text-rose-800 font-medium">{h.decodedSummary}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </>,
        document.body
      )}

      {/* 6. Floating Nearby Reporting Airports List */}
      {tapLocationData && (
        <div className="absolute bottom-20 sm:bottom-8 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] sm:w-[460px] z-30 pointer-events-auto animate-slideUp">
          <div className="bg-white border border-slate-200 rounded-3xl p-4 shadow-2xl space-y-3 text-slate-900 font-sans">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Navigation className="w-5 h-5 text-rose-600" />
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">Nearby Reporting Airports</h3>
                  <p className="text-[11px] text-slate-500 font-mono">
                    Tap Point: {tapLocationData.lat.toFixed(2)}° N, {tapLocationData.lng.toFixed(2)}° W
                  </p>
                </div>
              </div>
              <button
                onClick={() => setTapLocationData(null)}
                className="p-1 text-slate-400 hover:text-slate-800 rounded-lg hover:bg-slate-100 cursor-pointer"
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
                  className="flex items-center justify-between p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-sky-500 rounded-2xl transition cursor-pointer group"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono text-base font-black text-slate-900 group-hover:text-sky-600">
                      {apt.code}
                    </span>
                    <div>
                      <span className="text-xs font-bold text-slate-900 block leading-tight">{apt.name}</span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {apt.distNm.toFixed(1)} NM &bull; {apt.code}
                      </span>
                    </div>
                  </div>

                  <span className={`text-[10px] px-2 py-0.5 rounded font-black font-mono ${getCategoryBadge(apt.cat)}`}>
                    {apt.cat || "VFR"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
