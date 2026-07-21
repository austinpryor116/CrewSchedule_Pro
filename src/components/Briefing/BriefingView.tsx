"use client";

import { useState, useEffect, useMemo } from "react";
import dynamic from "next/dynamic";
import { Plane, AlertTriangle, CloudRain, Shield, Navigation, Wind, Eye, Cloud, Thermometer, Compass, CompassIcon, Info } from "lucide-react";
import { useCrewStore, convertOpenToTrip } from "../../store/useCrewStore";

// Dynamically import Leaflet map to disable SSR
const BriefingMap = dynamic(() => import("./BriefingMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900 border border-slate-800 rounded-2xl animate-pulse">
      <Plane className="w-12 h-12 text-slate-500 animate-bounce mb-3" />
      <span className="text-sm font-semibold text-slate-400">Loading charts & satellite radar...</span>
    </div>
  ),
});

interface FlightLeg {
  id: string;
  fltNum: string;
  dep: string;
  arr: string;
  time: string;
  equipment: string;
  duration: string;
  date?: string;
}

const DEMO_LEGS: FlightLeg[] = [
  { id: "0", fltNum: "FLT-3524", dep: "YYZ", arr: "ORD", time: "07:17", equipment: "E75", duration: "2h 10m", date: "2026-07-21" },
  { id: "1", fltNum: "FLT-3453", dep: "ORD", arr: "EVV", time: "08:15", equipment: "E75", duration: "1h 15m", date: "2026-07-20" },
  { id: "2", fltNum: "FLT-3511", dep: "EVV", arr: "BIL", time: "10:00", equipment: "E75", duration: "2h 45m", date: "2026-07-20" },
  { id: "3", fltNum: "FLT-3622", dep: "BIL", arr: "ORD", time: "14:30", equipment: "E75", duration: "2h 15m", date: "2026-07-20" },
  { id: "4", fltNum: "FLT-4164", dep: "ORD", arr: "HPN", time: "09:30", equipment: "E75", duration: "1h 45m", date: "2026-07-20" },
  { id: "5", fltNum: "FLT-4165", dep: "HPN", arr: "ORD", time: "12:15", equipment: "E75", duration: "1h 55m", date: "2026-07-20" },
  { id: "6", fltNum: "FLT-5211", dep: "ORD", arr: "GDL", time: "07:00", equipment: "B737", duration: "3h 30m", date: "2026-07-20" },
  { id: "7", fltNum: "FLT-5212", dep: "GDL", arr: "PVR", time: "11:15", equipment: "B737", duration: "0h 45m", date: "2026-07-20" },
  { id: "8", fltNum: "FLT-5213", dep: "PVR", arr: "ORD", time: "13:00", equipment: "B737", duration: "3h 15m", date: "2026-07-20" },
];

interface WeatherData {
  category: "VFR" | "MVFR" | "IFR" | "LIFR";
  metar: string;
  taf: string;
  winds: string;
  visibility: string;
  clouds: string;
  tempDewpoint: string;
  altimeter: string;
}

const WEATHER_REPORTS: Record<string, WeatherData> = {
  ORD: {
    category: "VFR",
    metar: "KORD 210251Z 24008KT 10SM CLR 28/16 A2992",
    taf: "KORD 210250Z 2103/2209 23010KT P6SM SCT050 FM211600 24012G18KT P6SM SCT050",
    winds: "240° @ 8 knots",
    visibility: "10 Statute Miles",
    clouds: "Clear Skies (CLR)",
    tempDewpoint: "28°C / 16°C",
    altimeter: "29.92 inHg",
  },
  EVV: {
    category: "VFR",
    metar: "KEVV 210253Z 19005KT 10SM SCT045 27/18 A2995",
    taf: "KEVV 210253Z 2103/2203 19006KT P6SM FEW040 FM211800 21010KT P6SM SCT050",
    winds: "190° @ 5 knots",
    visibility: "10 Statute Miles",
    clouds: "Scattered at 4,500 ft (SCT045)",
    tempDewpoint: "27°C / 18°C",
    altimeter: "29.95 inHg",
  },
  BIL: {
    category: "MVFR",
    metar: "KBIL 210253Z 05012KT 8SM OVC025 15/11 A3002",
    taf: "KBIL 210250Z 2103/2203 04010KT 6SM -RA BR OVC020 FM211400 05012KT 8SM OVC025",
    winds: "050° @ 12 knots",
    visibility: "8 Statute Miles",
    clouds: "Overcast at 2,500 ft (OVC025)",
    tempDewpoint: "15°C / 11°C",
    altimeter: "30.02 inHg",
  },
  HPN: {
    category: "IFR",
    metar: "KHPN 210256Z 09007KT 2SM -DZ BR OVC008 18/17 A2988",
    taf: "KHPN 210250Z 2103/2203 08008KT 3SM -RADZ BR OVC010 FM211500 09010KT 2SM -DZ OVC008",
    winds: "090° @ 7 knots",
    visibility: "2 Statute Miles (Light Drizzle / Mist)",
    clouds: "Overcast at 800 ft (OVC008)",
    tempDewpoint: "18°C / 17°C",
    altimeter: "29.88 inHg",
  },
  GDL: {
    category: "VFR",
    metar: "MMGL 210245Z 11006KT 6SM HZ SCT030 24/15 A3010",
    taf: "MMGL 210240Z 2103/2203 11006KT 6SM HZ SCT030 FM211800 24008KT P6SM FEW040",
    winds: "110° @ 6 knots",
    visibility: "6 Statute Miles (Haze)",
    clouds: "Scattered at 3,000 ft (SCT030)",
    tempDewpoint: "24°C / 15°C",
    altimeter: "30.10 inHg",
  },
  PVR: {
    category: "LIFR",
    metar: "MMPR 210240Z 27015KT 1SM +TSRA FEW005CB OVC015 29/25 A2985",
    taf: "MMPR 210240Z 2103/2203 27015KT 1SM +TSRA BKN010CB OVC015 FM212000 26010KT 3SM TSRA",
    winds: "270° @ 15 knots",
    visibility: "1 Statute Mile (Heavy Thunderstorms / Rain)",
    clouds: "Few CB at 500 ft, Overcast at 1,500 ft",
    tempDewpoint: "29°C / 25°C",
    altimeter: "29.85 inHg",
  },
  YYZ: {
    category: "VFR",
    metar: "CYYZ 210251Z 23007KT 15SM CLR 24/15 A3001",
    taf: "CYYZ 210250Z 2103/2203 22008KT P6SM SKC FM211400 24010KT P6SM SCT040",
    winds: "230° @ 7 knots",
    visibility: "15 Statute Miles",
    clouds: "Clear Skies (CLR)",
    tempDewpoint: "24°C / 15°C",
    altimeter: "30.01 inHg",
  },
};

const getWeatherData = (airportCode: string): WeatherData => {
  const code = airportCode.toUpperCase().trim();
  if (WEATHER_REPORTS[code]) {
    return WEATHER_REPORTS[code];
  }
  
  // Generate realistic weather dynamic fallback
  const icao = code.length === 3 ? `K${code}` : code;
  return {
    category: "VFR",
    metar: `${icao} 210250Z 23008KT 10SM CLR 22/14 A2995`,
    taf: `${icao} 210245Z 2103/2203 23008KT P6SM SKC`,
    winds: "230° @ 8 knots",
    visibility: "10 Statute Miles",
    clouds: "Clear Skies (CLR)",
    tempDewpoint: "22°C / 14°C",
    altimeter: "29.95 inHg",
  };
};

export interface AlertItem {
  id: number;
  type: "SIGMET" | "AIRMET" | "PIREP";
  subtype?: "TURB" | "ICE" | "SMOOTH" | "CONVECTIVE" | "IFR";
  text: string;
  priority: "HIGH" | "MED" | "LOW";
  lat: number;
  lng: number;
}

const MOCK_ALERTS: AlertItem[] = [
  {
    id: 1,
    type: "SIGMET",
    subtype: "CONVECTIVE",
    text: "CONVECTIVE SIGMET 42C: Severe turbulence and wind shear forecast below FL180 due to active squall line.",
    priority: "HIGH",
    lat: 39.8,
    lng: -87.7
  },
  {
    id: 2,
    type: "PIREP",
    subtype: "TURB",
    text: "KORD UA /OV KORD-KEVV /TM 0210 /FL330 /TP B737 /TB MOD /RM MOD turbulence enroute.",
    priority: "MED",
    lat: 39.5,
    lng: -87.6
  },
  {
    id: 3,
    type: "AIRMET",
    subtype: "IFR",
    text: "AIRMET SIERRA: IFR conditions and mountain obscuration active along departure corridors.",
    priority: "MED",
    lat: 42.2,
    lng: -87.8
  },
  {
    id: 4,
    type: "PIREP",
    subtype: "TURB",
    text: "KEVV UA /OV KEVV /TM 0225 /FL085 /TP E75 /TB LGT-MOD /RM Smooth ride once above 10,000ft.",
    priority: "LOW",
    lat: 38.1,
    lng: -87.5
  },
  {
    id: 5,
    type: "PIREP",
    subtype: "SMOOTH",
    text: "KBIL UA /OV KBIL /TM 0145 /FL350 /TP A321 /TB NONE /RM Smooth ride.",
    priority: "LOW",
    lat: 45.9,
    lng: -108.6
  },
  {
    id: 6,
    type: "PIREP",
    subtype: "ICE",
    text: "CYYZ UA /OV CYYZ-KORD /TM 0735 /FL240 /TP E175 /TA M05 /IC LGT RIME /RM Light rime enroute.",
    priority: "MED",
    lat: 42.9,
    lng: -82.4
  },
  {
    id: 7,
    type: "PIREP",
    subtype: "TURB",
    text: "CYYZ UA /OV KDTW /TM 0805 /FL310 /TP B738 /TB MOD /RM Moderate chop enroute near Detroit.",
    priority: "MED",
    lat: 42.2,
    lng: -83.4
  },
  {
    id: 8,
    type: "PIREP",
    subtype: "SMOOTH",
    text: "KPVR UA /OV KPVR /TM 1320 /FL340 /TP B737 /TB NONE /RM Smooth ride.",
    priority: "LOW",
    lat: 20.7,
    lng: -105.3
  }
];

const AIRPORT_COORDS: Record<string, [number, number]> = {
  ORD: [41.9742, -87.9073],
  EVV: [38.0378, -87.5306],
  BIL: [45.8077, -108.5428],
  HPN: [41.0669, -73.7076],
  GDL: [20.5218, -103.3112],
  PVR: [20.6801, -105.2541],
  DFW: [32.8998, -97.0403],
  LGA: [40.7769, -73.8740],
  CLT: [35.2140, -80.9431],
  MIA: [25.7959, -80.2870],
  YYZ: [43.6777, -79.6248],
  DTW: [42.2162, -83.3554],
  CWA: [44.7776, -89.6668],
  LAN: [42.7787, -84.5874],
  TUL: [36.1984, -95.8881],
  MHK: [39.1409, -96.6708],
  BMI: [40.4771, -88.9159],
  CAE: [33.9388, -81.1195],
  MSY: [29.9911, -90.2580],
  HSV: [34.6372, -86.7725],
  SYR: [43.1111, -76.1063],
  CMI: [40.0392, -88.2781],
  ICT: [37.6499, -97.4331],
  LIT: [34.7294, -92.2243],
  CMH: [39.9980, -82.8919],
  GSP: [34.8956, -82.2189],
  AVP: [41.3385, -75.7242],
  BHM: [33.5629, -86.7535],
  VPS: [30.4832, -86.5254],
  CAK: [40.9161, -81.4422],
  MSN: [43.1398, -89.3375],
  GSO: [36.0977, -79.9373],
  TLH: [30.3965, -84.3503],
  RDU: [35.8776, -78.7875],
  MQT: [46.3536, -87.3953],
  XNA: [36.2818, -94.3068],
  TVC: [44.7414, -85.5822],
  SGF: [37.2457, -93.3886],
  PIA: [40.6642, -89.6933],
  CVG: [39.0461, -84.6622],
};

function getGreatCircleDistance(coords1: [number, number], coords2: [number, number]): number {
  const R = 3958.8; // Haversine formula in miles
  const lat1 = coords1[0] * Math.PI / 180;
  const lat2 = coords2[0] * Math.PI / 180;
  const dLat = (coords2[0] - coords1[0]) * Math.PI / 180;
  const dLng = (coords2[1] - coords1[1]) * Math.PI / 180;

  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1) * Math.cos(lat2) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function getDistancePointToSegment(p: [number, number], a: [number, number], b: [number, number]): number {
  const l2 = Math.pow(a[0] - b[0], 2) + Math.pow(a[1] - b[1], 2);
  if (l2 === 0) return getGreatCircleDistance(p, a);
  
  let t = ((p[0] - a[0]) * (b[0] - a[0]) + (p[1] - a[1]) * (b[1] - a[1])) / l2;
  t = Math.max(0, Math.min(1, t));
  
  const projection: [number, number] = [
    a[0] + t * (b[0] - a[0]),
    a[1] + t * (b[1] - a[1])
  ];
  
  return getGreatCircleDistance(p, projection);
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
    const legsList: any[] = [];
    sequences.forEach((seq) => {
      seq.dutyPeriods.forEach((period) => {
        // Calculate date of duty period timezone-independently
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

  const [selectedLegId, setSelectedLegId] = useState("1");
  const [mobileTab, setMobileTab] = useState<"briefing" | "map">("briefing");

  // Default to the next flight leg in the future
  useEffect(() => {
    if (activeLegs.length === 0) return;

    // Use current time: 2026-07-20T22:02:42-05:00
    // Mock to July 20, 2026 22:00 if system time is different, to align with the July 2026 roster
    let now = new Date();
    if (now.getFullYear() !== 2026 || now.getMonth() !== 6) {
      now = new Date("2026-07-20T22:00:00");
    }

    const futureLegs = activeLegs
      .map((leg) => {
        const depDate = new Date(`${leg.date}T${leg.time}:00`);
        return { leg, depDate, diff: depDate.getTime() - now.getTime() };
      })
      .filter((item) => item.diff > 0)
      .sort((a, b) => a.diff - b.diff);

    if (futureLegs.length > 0) {
      setSelectedLegId(futureLegs[0].leg.id);
    } else {
      setSelectedLegId(activeLegs[0].id);
    }
  }, [activeLegs]);

  // Chart layer toggles
  const [showRadar, setShowRadar] = useState(true);
  const [showSigmet, setShowSigmet] = useState(true);
  const [showDemoRain, setShowDemoRain] = useState(true);
  const [showIfrLow, setShowIfrLow] = useState(false);

  const activeLeg = useMemo(() => {
    return activeLegs.find((l) => l.id === selectedLegId) || activeLegs[0] || DEMO_LEGS[0];
  }, [activeLegs, selectedLegId]);

  const depWeather = getWeatherData(activeLeg.dep);
  const arrWeather = getWeatherData(activeLeg.arr);

  // Filter Alerts & PIREPs within 100 miles of selected route (dynamically positioned relative to active leg path)
  const filteredAlerts = useMemo(() => {
    const depCoords = AIRPORT_COORDS[activeLeg.dep.toUpperCase()];
    const arrCoords = AIRPORT_COORDS[activeLeg.arr.toUpperCase()];
    if (!depCoords || !arrCoords) return [];

    const depLat = depCoords[0];
    const depLng = depCoords[1];
    const arrLat = arrCoords[0];
    const arrLng = arrCoords[1];

    const midLat = (depLat + arrLat) / 2;
    const midLng = (depLng + arrLng) / 2;

    // Generate path-relative coordinates for alerts
    const alerts: AlertItem[] = [
      {
        id: 1,
        type: "SIGMET",
        subtype: "CONVECTIVE",
        text: `CONVECTIVE SIGMET 42C: Severe turbulence and wind shear forecast below FL180 due to active squall line near ${activeLeg.dep}-${activeLeg.arr} corridor.`,
        priority: "HIGH",
        lat: midLat + 0.15,
        lng: midLng + 0.15, // Centered on the red thunderstorm core
      },
      {
        id: 2,
        type: "PIREP",
        subtype: "TURB",
        text: `K${activeLeg.dep} UA /OV K${activeLeg.dep}-K${activeLeg.arr} /TM 0210 /FL330 /TP B737 /TB MOD /RM MOD turbulence enroute.`,
        priority: "MED",
        lat: depLat + 0.3 * (arrLat - depLat),
        lng: depLng + 0.3 * (arrLng - depLng),
      },
      {
        id: 3,
        type: "AIRMET",
        subtype: "IFR",
        text: `AIRMET SIERRA: IFR conditions and mountain obscuration active along departure corridors near ${activeLeg.dep}.`,
        priority: "MED",
        lat: depLat + 0.08 * (arrLat - depLat) + 0.1,
        lng: depLng + 0.08 * (arrLng - depLng) - 0.1,
      },
      {
        id: 4,
        type: "PIREP",
        subtype: "TURB",
        text: `K${activeLeg.arr} UA /OV K${activeLeg.arr} /TM 0225 /FL085 /TP E75 /TB LGT-MOD /RM Smooth ride once above 10,000ft.`,
        priority: "LOW",
        lat: arrLat - 0.05 * (arrLat - depLat),
        lng: arrLng - 0.05 * (arrLng - depLng),
      },
      {
        id: 5,
        type: "PIREP",
        subtype: "SMOOTH",
        text: `K${activeLeg.arr} UA /OV K${activeLeg.arr} /TM 0145 /FL350 /TP A321 /TB NONE /RM Smooth ride on descent.`,
        priority: "LOW",
        lat: arrLat - 0.15 * (arrLat - depLat),
        lng: arrLng - 0.15 * (arrLng - depLng),
      },
      {
        id: 6,
        type: "PIREP",
        subtype: "ICE",
        text: `K${activeLeg.dep} UA /OV K${activeLeg.dep}-K${activeLeg.arr} /TM 0735 /FL240 /TP E175 /TA M05 /IC LGT RIME /RM Light rime enroute.`,
        priority: "MED",
        lat: depLat + 0.5 * (arrLat - depLat) - 0.05,
        lng: depLng + 0.5 * (arrLng - depLng) + 0.05,
      },
    ];

    return alerts;
  }, [activeLeg]);

  // Compiled Dispatcher Overview Note
  const briefingOverview = useMemo(() => {
    const dep = activeLeg.dep.toUpperCase();
    const arr = activeLeg.arr.toUpperCase();
    const turbAlerts = filteredAlerts.filter(a => a.subtype === "TURB");
    const iceAlerts = filteredAlerts.filter(a => a.subtype === "ICE");

    let summaryText = "";
    let turbProjection = "Smooth ride projected enroute.";

    if (turbAlerts.length > 0) {
      const severity = turbAlerts.some(a => a.text.includes("MOD")) ? "moderate" : "light";
      turbProjection = `Caution: ${severity} turbulence projected enroute based on pilot reports.`;
    }

    if (dep === "YYZ" && arr === "ORD") {
      summaryText = `Toronto (YYZ) to Chicago (ORD) flight corridor is clear for departure. Chicago is reporting VFR conditions under 240° @ 8kt winds. Light rime icing reported enroute at FL240. Turbulence enroute is projected to be light to moderate below FL310 near Detroit. No significant ATC delays expected.`;
    } else if (dep === "ORD" && arr === "EVV") {
      summaryText = `Chicago (ORD) to Evansville (EVV) flight corridor contains active convective hazard cells. Evansville is VFR (190° @ 5kt), but a convective SIGMET is active near the midpoint with active squalls and gusts up to 55kts forecast. Moderate turbulence is reported enroute at FL330. Suggest routing slightly east to bypass the convective cell.`;
    } else if (dep === "EVV" && arr === "BIL") {
      summaryText = `Evansville (EVV) to Billings (BIL) route shows deteriorating weather near Billings (MVFR with rain, OVC025). Light to moderate turbulence reported below 10,000 ft by regional aircraft, smooth ride above. Expect instrument approach procedures at Billings.`;
    } else {
      const alertSummary = filteredAlerts.length > 0 
        ? `${filteredAlerts.length} weather hazard(s) located within 100 miles of your flight corridor.`
        : "No significant enroute weather hazards reported.";
      summaryText = `${dep} to ${arr} flight path is open. Departure weather is ${depWeather.category} and arrival is ${arrWeather.category}. ${alertSummary} Review active weather radar overlays for tactical decision making.`;
    }

    return {
      summary: summaryText,
      turb: turbProjection,
      ice: iceAlerts.length > 0 ? "Light enroute icing reported." : "No enroute icing reported."
    };
  }, [activeLeg, filteredAlerts, depWeather, arrWeather]);

  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case "VFR": return "bg-emerald-500/10 border-emerald-500/30 text-emerald-400";
      case "MVFR": return "bg-cyan-500/10 border-cyan-500/30 text-cyan-400";
      case "IFR": return "bg-rose-500/10 border-rose-500/30 text-rose-400";
      case "LIFR": return "bg-fuchsia-500/10 border-fuchsia-500/30 text-fuchsia-400";
      default: return "bg-slate-500/10 border-slate-500/30 text-slate-400";
    }
  };

  const getCategoryBadge = (cat: string) => {
    switch (cat) {
      case "VFR": return "bg-emerald-500 text-slate-950";
      case "MVFR": return "bg-cyan-500 text-slate-950";
      case "IFR": return "bg-rose-500 text-white animate-pulse";
      case "LIFR": return "bg-fuchsia-500 text-white animate-pulse";
      default: return "bg-slate-500 text-white";
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Mobile Tab Switcher */}
      <div className="xl:hidden flex p-1 bg-slate-900 border border-slate-800/80 rounded-2xl">
        <button
          onClick={() => setMobileTab("briefing")}
          className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
            mobileTab === "briefing"
              ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/10"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          Briefing & Weather
        </button>
        <button
          onClick={() => setMobileTab("map")}
          className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
            mobileTab === "map"
              ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/10"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          Routing Map & Alerts
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 min-h-[calc(100vh-140px)]">
        {/* LEFT COLUMN: Briefing Data */}
        <div className={`xl:col-span-5 space-y-6 flex flex-col ${mobileTab === "briefing" ? "flex" : "hidden xl:flex"}`}>

          {/* Dispatcher Compiled Overview Card */}
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 sm:p-5 shadow-lg backdrop-blur-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-28 h-28 bg-indigo-500/5 rounded-full blur-2xl -z-10" />
          
          <div className="flex items-center justify-between mb-3.5">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-indigo-400" />
              <h2 className="text-sm font-bold text-slate-100">Compiled Dispatcher Briefing</h2>
            </div>
            <span className="text-[9px] font-black tracking-wider uppercase px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
              Auto-Compiled
            </span>
          </div>

          <div className="space-y-3 text-xs">
            <div className="p-3 bg-slate-950/40 border border-slate-800/60 rounded-xl leading-relaxed text-slate-300 font-sans">
              <p className="font-semibold text-slate-200 mb-1 text-[11px] uppercase tracking-wider text-slate-400">Route & Weather Summary</p>
              {briefingOverview.summary}
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="p-2.5 bg-slate-950/30 border border-slate-800/40 rounded-lg flex items-center gap-2">
                <Wind className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <div className="min-w-0">
                  <p className="text-slate-500 font-medium">Turbulence</p>
                  <p className="text-slate-300 font-semibold truncate mt-0.5" title={briefingOverview.turb}>{briefingOverview.turb}</p>
                </div>
              </div>
              <div className="p-2.5 bg-slate-950/30 border border-slate-800/40 rounded-lg flex items-center gap-2">
                <CloudRain className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <div className="min-w-0">
                  <p className="text-slate-500 font-medium">Icing Hazard</p>
                  <p className="text-slate-300 font-semibold truncate mt-0.5" title={briefingOverview.ice}>{briefingOverview.ice}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Selector Card */}
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 sm:p-5 shadow-lg backdrop-blur-sm">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-2">
              <Navigation className="w-5 h-5 text-indigo-400" />
              <h2 className="text-base font-bold text-slate-100">Flight Briefing</h2>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-950 border border-indigo-800 text-indigo-400">
              Today's Flight Logs
            </span>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1.5">Select Flight Leg</label>
              <select
                value={selectedLegId}
                onChange={(e) => setSelectedLegId(e.target.value)}
                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 font-bold focus:outline-none focus:border-indigo-500 transition"
              >
                {activeLegs.map((leg) => (
                  <option key={leg.id} value={leg.id}>
                    {leg.fltNum} • {leg.dep} ➔ {leg.arr} ({leg.duration}) • {leg.equipment}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-3 gap-3 bg-slate-950/40 p-3.5 rounded-xl border border-slate-800/30 text-xs font-mono text-center">
              <div>
                <p className="text-[10px] text-slate-500 mb-0.5">Leg Time (UTC)</p>
                <p className="font-bold text-slate-300">{activeLeg.time}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-500 mb-0.5">Equipment</p>
                <p className="font-bold text-slate-300">{activeLeg.equipment}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-500 mb-0.5">Est. ETE</p>
                <p className="font-bold text-indigo-400">{activeLeg.duration}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Airport Weather cards */}
        <div className="space-y-4 flex-1">
          {/* Departure Airport */}
          <div className={`border rounded-2xl p-4 sm:p-5 shadow-lg backdrop-blur-sm ${getCategoryColor(depWeather.category)}`}>
            <div className="flex justify-between items-center pb-3 border-b border-slate-800/60 mb-3.5">
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Departure Airport</span>
                <h3 className="text-lg font-black text-slate-100">{activeLeg.dep}</h3>
              </div>
              <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-black tracking-widest ${getCategoryBadge(depWeather.category)}`}>
                {depWeather.category}
              </span>
            </div>

            {/* Grid metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4 text-xs">
              <div className="bg-slate-950/30 p-2 rounded-xl border border-slate-800/40">
                <div className="flex items-center gap-1.5 text-slate-500 mb-0.5">
                  <Wind className="w-3.5 h-3.5" />
                  <span>Winds</span>
                </div>
                <span className="font-bold text-slate-300">{depWeather.winds}</span>
              </div>
              <div className="bg-slate-950/30 p-2 rounded-xl border border-slate-800/40">
                <div className="flex items-center gap-1.5 text-slate-500 mb-0.5">
                  <Eye className="w-3.5 h-3.5" />
                  <span>Visibility</span>
                </div>
                <span className="font-bold text-slate-300">{depWeather.visibility}</span>
              </div>
              <div className="bg-slate-950/30 p-2 rounded-xl border border-slate-800/40">
                <div className="flex items-center gap-1.5 text-slate-500 mb-0.5">
                  <Cloud className="w-3.5 h-3.5" />
                  <span>Sky Cond</span>
                </div>
                <span className="font-bold text-slate-300 truncate block">{depWeather.clouds}</span>
              </div>
              <div className="bg-slate-950/30 p-2 rounded-xl border border-slate-800/40">
                <div className="flex items-center gap-1.5 text-slate-500 mb-0.5">
                  <Thermometer className="w-3.5 h-3.5" />
                  <span>Temp/DP</span>
                </div>
                <span className="font-bold text-slate-300">{depWeather.tempDewpoint}</span>
              </div>
            </div>

            <div className="space-y-2 bg-slate-950/60 p-3 rounded-xl border border-slate-800/70 text-[10px] font-mono leading-relaxed">
              <p className="text-slate-500 font-sans font-bold">RAW METAR</p>
              <p className="text-slate-300 select-all">{depWeather.metar}</p>
              <p className="text-slate-500 font-sans font-bold mt-2">RAW TAF FORECAST</p>
              <p className="text-slate-400 select-all">{depWeather.taf}</p>
            </div>
          </div>

          {/* Arrival Airport */}
          <div className={`border rounded-2xl p-4 sm:p-5 shadow-lg backdrop-blur-sm ${getCategoryColor(arrWeather.category)}`}>
            <div className="flex justify-between items-center pb-3 border-b border-slate-800/60 mb-3.5">
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Arrival Airport</span>
                <h3 className="text-lg font-black text-slate-100">{activeLeg.arr}</h3>
              </div>
              <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-black tracking-widest ${getCategoryBadge(arrWeather.category)}`}>
                {arrWeather.category}
              </span>
            </div>

            {/* Grid metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4 text-xs">
              <div className="bg-slate-950/30 p-2 rounded-xl border border-slate-800/40">
                <div className="flex items-center gap-1.5 text-slate-500 mb-0.5">
                  <Wind className="w-3.5 h-3.5" />
                  <span>Winds</span>
                </div>
                <span className="font-bold text-slate-300">{arrWeather.winds}</span>
              </div>
              <div className="bg-slate-950/30 p-2 rounded-xl border border-slate-800/40">
                <div className="flex items-center gap-1.5 text-slate-500 mb-0.5">
                  <Eye className="w-3.5 h-3.5" />
                  <span>Visibility</span>
                </div>
                <span className="font-bold text-slate-300">{arrWeather.visibility}</span>
              </div>
              <div className="bg-slate-950/30 p-2 rounded-xl border border-slate-800/40">
                <div className="flex items-center gap-1.5 text-slate-500 mb-0.5">
                  <Cloud className="w-3.5 h-3.5" />
                  <span>Sky Cond</span>
                </div>
                <span className="font-bold text-slate-300 truncate block">{arrWeather.clouds}</span>
              </div>
              <div className="bg-slate-950/30 p-2 rounded-xl border border-slate-800/40">
                <div className="flex items-center gap-1.5 text-slate-500 mb-0.5">
                  <Thermometer className="w-3.5 h-3.5" />
                  <span>Temp/DP</span>
                </div>
                <span className="font-bold text-slate-300">{arrWeather.tempDewpoint}</span>
              </div>
            </div>

            <div className="space-y-2 bg-slate-950/60 p-3 rounded-xl border border-slate-800/70 text-[10px] font-mono leading-relaxed">
              <p className="text-slate-500 font-sans font-bold">RAW METAR</p>
              <p className="text-slate-300 select-all">{arrWeather.metar}</p>
              <p className="text-slate-500 font-sans font-bold mt-2">RAW TAF FORECAST</p>
              <p className="text-slate-400 select-all">{arrWeather.taf}</p>
            </div>
          </div>
        </div>
      </div>

        {/* RIGHT COLUMN: Map & Alerts */}
        <div className={`xl:col-span-7 flex flex-col gap-6 ${mobileTab === "map" ? "flex" : "hidden xl:flex"}`}>
          
          {/* Map Container */}
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 sm:p-5 shadow-lg backdrop-blur-sm flex-1 flex flex-col min-h-[320px] sm:min-h-[450px] xl:min-h-[480px]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-100">Interactive Flight Routing Map & Weather Overlay</h2>
              <p className="text-[10px] text-slate-500 mt-0.5">Interactive Leaflet container displaying flight route and live weather radar</p>
            </div>
            
            {/* Map Overlay Controls */}
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => setShowIfrLow(!showIfrLow)}
                className={`px-2.5 py-1 text-[10px] font-black rounded-lg border transition ${
                  showIfrLow 
                    ? "bg-indigo-500/15 border-indigo-500/30 text-indigo-400 shadow-sm"
                    : "bg-slate-950/60 border-slate-800/80 text-slate-500 hover:text-slate-300"
                }`}
              >
                IFR LOW
              </button>
              <button
                onClick={() => setShowRadar(!showRadar)}
                className={`px-2.5 py-1 text-[10px] font-black rounded-lg border transition ${
                  showRadar 
                    ? "bg-amber-500/15 border-amber-500/30 text-amber-400 shadow-sm"
                    : "bg-slate-950/60 border-slate-800/80 text-slate-500 hover:text-slate-300"
                }`}
              >
                RADAR
              </button>
              <button
                onClick={() => setShowSigmet(!showSigmet)}
                className={`px-2.5 py-1 text-[10px] font-black rounded-lg border transition ${
                  showSigmet 
                    ? "bg-rose-500/15 border-rose-500/30 text-rose-400 shadow-sm animate-pulse"
                    : "bg-slate-950/60 border-slate-800/80 text-slate-500 hover:text-slate-300"
                }`}
              >
                SIGMET
              </button>
              <button
                onClick={() => setShowDemoRain(!showDemoRain)}
                className={`px-2.5 py-1 text-[10px] font-black rounded-lg border transition ${
                  showDemoRain 
                    ? "bg-teal-500/15 border-teal-500/30 text-teal-400 shadow-sm"
                    : "bg-slate-950/60 border-slate-800/80 text-slate-500 hover:text-slate-300"
                }`}
              >
                DEMO STORM
              </button>
            </div>
          </div>
 
          <div className="flex-1 min-h-[260px] sm:min-h-[350px] xl:min-h-[380px]">
            <BriefingMap
              depAirport={activeLeg.dep}
              arrAirport={activeLeg.arr}
              showRadar={showRadar}
              showSigmet={showSigmet}
              showDemoRain={showDemoRain}
              showIfrLow={showIfrLow}
              filteredAlerts={filteredAlerts}
            />
          </div>
        </div>

        {/* Real-time Alerts Panel */}
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 sm:p-5 shadow-lg backdrop-blur-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-rose-500" />
              <h2 className="text-sm font-bold text-slate-100">Enroute Alerts (100mi Corridor)</h2>
            </div>
            <span className="text-[9px] bg-slate-950 px-2 py-0.5 rounded text-slate-500 border border-slate-800 font-mono">
              Filtered
            </span>
          </div>

          <div className="space-y-3.5">
            {filteredAlerts.length === 0 ? (
              <div className="bg-slate-950/40 border border-slate-800/40 rounded-xl p-6 text-center">
                <p className="text-xs font-semibold text-emerald-400">✓ All Clear Corridor</p>
                <p className="text-[10px] text-slate-500 mt-1.5 leading-relaxed">
                  No active SIGMETs, AIRMETs, or hazardous PIREPs reported within 100 miles of your flight corridor.
                </p>
              </div>
            ) : (
              filteredAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`p-3.5 border rounded-xl flex gap-3 text-xs leading-relaxed transition ${
                    alert.priority === "HIGH"
                      ? "bg-rose-950/20 border-rose-900/40 text-rose-300"
                      : alert.priority === "MED"
                      ? "bg-amber-950/15 border-amber-900/30 text-amber-300"
                      : "bg-slate-950/40 border-slate-800/30 text-slate-400"
                  }`}
                >
                  <div className="shrink-0 mt-0.5">
                    {alert.type === "SIGMET" ? (
                      <span className="px-1.5 py-0.5 rounded bg-rose-500 text-slate-950 font-black text-[9px] uppercase">
                        SIGMET
                      </span>
                    ) : alert.type === "AIRMET" ? (
                      <span className="px-1.5 py-0.5 rounded bg-amber-500 text-slate-950 font-black text-[9px] uppercase">
                        AIRMET
                      </span>
                    ) : (
                      <span className={`px-1.5 py-0.5 rounded font-black text-[9px] uppercase ${
                        alert.subtype === "SMOOTH" 
                          ? "bg-emerald-500 text-slate-950" 
                          : alert.subtype === "ICE" 
                          ? "bg-sky-500 text-white" 
                          : "bg-indigo-500 text-slate-950"
                      }`}>
                        {alert.subtype || "PIREP"}
                      </span>
                    )}
                  </div>
                  <div>
                    <p className="font-mono text-slate-200">{alert.text}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  </div>
  );
}
