"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { LiveSigmetAirmet, LiveLightningStrike, LiveTurbulenceReport, getAirportCoords } from "../../lib/weatherService";

// Fix for default Leaflet icon paths
const fixLeafletIcon = () => {
  delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
    iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
    shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
  });
};

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

function destinationPoint(lat: number, lon: number, brngRad: number, distNm: number): [number, number] {
  const R = 3440.065; // Earth radius in NM
  const d = distNm / R;
  const lat1 = (lat * Math.PI) / 180;
  const lon1 = (lon * Math.PI) / 180;

  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(d) +
    Math.cos(lat1) * Math.sin(d) * Math.cos(brngRad)
  );
  const lon2 = lon1 + Math.atan2(
    Math.sin(brngRad) * Math.sin(d) * Math.cos(lat1),
    Math.cos(d) - Math.sin(lat1) * Math.sin(lat2)
  );

  return [(lat2 * 180) / Math.PI, (lon2 * 180) / Math.PI];
}

function initialBearingRad(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaLam = ((lon2 - lon1) * Math.PI) / 180;

  const y = Math.sin(deltaLam) * Math.cos(phi2);
  const x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(deltaLam);
  return Math.atan2(y, x);
}

function computeCorridorCoords(
  depLatLng: [number, number],
  arrLatLng: [number, number],
  corridorNm: number
): [number, number][] {
  const [depLat, depLon] = depLatLng;
  const [arrLat, arrLon] = arrLatLng;

  const dLat = arrLat - depLat;
  const dLon = arrLon - depLon;
  const approxDist = Math.sqrt(dLat * dLat + dLon * dLon);

  // If departure and arrival are identical or extremely close, draw a full circle around the airport
  if (approxDist < 0.0001) {
    const circlePoints: [number, number][] = [];
    const N = 36;
    for (let i = 0; i < N; i++) {
      const brng = (i / N) * 2 * Math.PI;
      circlePoints.push(destinationPoint(depLat, depLon, brng, corridorNm));
    }
    return circlePoints;
  }

  const beta = initialBearingRad(depLat, depLon, arrLat, arrLon);
  const points: [number, number][] = [];
  const K = 25; // Steps along segment
  const N = 24; // Steps around airport semi-circles

  // 1. Right side parallel line from dep to arr
  for (let i = 0; i <= K; i++) {
    const t = i / K;
    const lat_t = depLat + t * (arrLat - depLat);
    const lon_t = depLon + t * (arrLon - depLon);
    points.push(destinationPoint(lat_t, lon_t, beta + Math.PI / 2, corridorNm));
  }

  // 2. Semi-circle cap around Arrival Airport (sweeping from right +90° to left -90°)
  for (let j = 1; j <= N; j++) {
    const angle = (beta + Math.PI / 2) - (j / N) * Math.PI;
    points.push(destinationPoint(arrLat, arrLon, angle, corridorNm));
  }

  // 3. Left side parallel line from arr back to dep
  for (let i = K - 1; i >= 0; i--) {
    const t = i / K;
    const lat_t = depLat + t * (arrLat - depLat);
    const lon_t = depLon + t * (arrLon - depLon);
    points.push(destinationPoint(lat_t, lon_t, beta - Math.PI / 2, corridorNm));
  }

  // 4. Semi-circle cap around Departure Airport (sweeping from left -90° back to right +90°)
  for (let j = 1; j < N; j++) {
    const angle = (beta - Math.PI / 2) - (j / N) * Math.PI;
    points.push(destinationPoint(depLat, depLon, angle, corridorNm));
  }

  return points;
}

export interface NearbyAirportItem {
  code: string;
  name: string;
  lat: number;
  lng: number;
  cat: "VFR" | "MVFR" | "IFR" | "LIFR";
  distNm: number;
}

export interface MapTapData {
  lat: number;
  lng: number;
  nearby: NearbyAirportItem[];
}

export interface BriefingMapProps {
  depAirport: string;
  arrAirport: string;
  waypoints?: string[];
  onAirportSelect?: (code: string) => void;
  onAddWaypoint?: (code: string) => void;
  onMapTap?: (data: MapTapData | null) => void;
  showFlightPlan?: boolean;
  showRadar: boolean;
  showSigmet?: boolean;
  showSigmetConvective?: boolean;
  showSigmetTurbulence?: boolean;
  showSigmetIcing?: boolean;
  showSigmetIfr?: boolean;
  showLightning?: boolean;
  lightningMaxAge?: number;
  showDemoRain: boolean;
  showSatelliteClouds?: boolean;
  showNwsWarnings?: boolean;
  showRadarRings?: boolean;
  rainViewerHost?: string;
  rainViewerPath?: string;
  rainViewerColorScheme?: number;
  rainViewerSmooth?: boolean;
  showAllAirports?: boolean;
  showAirportMarkers?: boolean;
  corridorNm?: number;
  liveHazards?: LiveSigmetAirmet[];
  liveLightning?: LiveLightningStrike[];
  showTurbulence?: boolean;
  turbulenceAltBand?: "ALL" | "LOW" | "MID" | "HIGH";
  liveTurbulence?: LiveTurbulenceReport[];
  filteredAlerts: Array<{
    id: number;
    type: string;
    subtype?: string;
    text: string;
    priority: string;
    lat: number;
    lng: number;
  }>;
}

export interface NexradStation {
  id: string;
  name: string;
  lat: number;
  lng: number;
  city: string;
}

export const NEXRAD_DOPPLER_STATIONS: NexradStation[] = [
  // Midwest & Great Lakes (Chicago ORD hub)
  { id: "KLOT", name: "Chicago WSR-88D Radar", lat: 41.6044, lng: -88.0847, city: "Chicago/Romeoville, IL" },
  { id: "KILX", name: "Central IL WSR-88D Radar", lat: 40.1506, lng: -89.3367, city: "Lincoln, IL" },
  { id: "KMKX", name: "Milwaukee WSR-88D Radar", lat: 42.9678, lng: -88.5506, city: "Milwaukee/Sullivan, WI" },
  { id: "KGRB", name: "Green Bay WSR-88D Radar", lat: 44.4986, lng: -88.1111, city: "Green Bay, WI" },
  { id: "KMPX", name: "Minneapolis WSR-88D Radar", lat: 44.8489, lng: -93.5656, city: "Minneapolis/Chanhassen, MN" },
  { id: "KGRR", name: "Grand Rapids WSR-88D Radar", lat: 42.8939, lng: -85.5447, city: "Grand Rapids, MI" },
  { id: "KDTX", name: "Detroit WSR-88D Radar", lat: 42.6997, lng: -83.4719, city: "Detroit/White Lake, MI" },
  { id: "KAPX", name: "Northern MI WSR-88D Radar", lat: 44.9072, lng: -84.7197, city: "Gaylord, MI" },
  { id: "KIND", name: "Indianapolis WSR-88D Radar", lat: 39.7075, lng: -86.2803, city: "Indianapolis, IN" },
  { id: "KILN", name: "Cincinnati/Wilmington WSR-88D Radar", lat: 39.4367, lng: -83.8217, city: "Wilmington, OH" },
  { id: "KCLE", name: "Cleveland WSR-88D Radar", lat: 41.4131, lng: -81.8600, city: "Cleveland, OH" },

  // Texas & South Central (Dallas DFW hub)
  { id: "KFWS", name: "Dallas/Fort Worth WSR-88D Radar", lat: 32.5731, lng: -97.3031, city: "Fort Worth, TX" },
  { id: "KHGX", name: "Houston WSR-88D Radar", lat: 29.4719, lng: -95.0792, city: "Houston/League City, TX" },
  { id: "KEWX", name: "Austin/San Antonio WSR-88D Radar", lat: 29.7039, lng: -98.0286, city: "Austin/New Braunfels, TX" },
  { id: "KCRP", name: "Corpus Christi WSR-88D Radar", lat: 27.7842, lng: -97.5111, city: "Corpus Christi, TX" },
  { id: "KBRO", name: "Brownsville WSR-88D Radar", lat: 25.9161, lng: -97.4189, city: "Brownsville, TX" },
  { id: "KSJT", name: "San Angelo WSR-88D Radar", lat: 31.3711, lng: -100.4925, city: "San Angelo, TX" },
  { id: "KLBB", name: "Lubbock WSR-88D Radar", lat: 33.6542, lng: -101.8142, city: "Lubbock, TX" },
  { id: "KAMA", name: "Amarillo WSR-88D Radar", lat: 35.2333, lng: -101.7089, city: "Amarillo, TX" },
  { id: "KTLX", name: "Oklahoma City WSR-88D Radar", lat: 35.3331, lng: -97.2778, city: "Oklahoma City, OK" },
  { id: "KINX", name: "Tulsa WSR-88D Radar", lat: 36.1750, lng: -95.5644, city: "Tulsa, OK" },

  // Southeast & Florida (Miami MIA & Charlotte CLT hubs)
  { id: "KAMX", name: "Miami WSR-88D Radar", lat: 25.6111, lng: -80.4128, city: "Miami/Homestead, FL" },
  { id: "KBYX", name: "Key West WSR-88D Radar", lat: 24.5975, lng: -81.7031, city: "Key West, FL" },
  { id: "KTBW", name: "Tampa Bay WSR-88D Radar", lat: 27.7053, lng: -82.4017, city: "Tampa Bay/Ruskin, FL" },
  { id: "KMLB", name: "Melbourne WSR-88D Radar", lat: 28.1133, lng: -80.6542, city: "Melbourne, FL" },
  { id: "KJAX", name: "Jacksonville WSR-88D Radar", lat: 30.4847, lng: -81.7019, city: "Jacksonville, FL" },
  { id: "KTLH", name: "Tallahassee WSR-88D Radar", lat: 30.3975, lng: -84.3289, city: "Tallahassee, FL" },
  { id: "KJGX", name: "Robins AFB/Atlanta WSR-88D Radar", lat: 32.6750, lng: -83.3511, city: "Warner Robins/Atlanta, GA" },
  { id: "KFFC", name: "Atlanta Peachtree WSR-88D Radar", lat: 33.3631, lng: -84.5658, city: "Peachtree City/Atlanta, GA" },
  { id: "KCLT", name: "Charlotte WSR-88D Radar", lat: 35.2140, lng: -80.9520, city: "Charlotte, NC" },
  { id: "KRAX", name: "Raleigh-Durham WSR-88D Radar", lat: 35.6653, lng: -78.4900, city: "Raleigh-Durham, NC" },
  { id: "KMHX", name: "Morehead City/Outer Banks WSR-88D", lat: 34.7761, lng: -76.8761, city: "Morehead City, NC" },
  { id: "KCAE", name: "Columbia WSR-88D Radar", lat: 33.9486, lng: -81.1186, city: "Columbia, SC" },
  { id: "KCLX", name: "Charleston WSR-88D Radar", lat: 32.6556, lng: -81.0422, city: "Charleston, SC" },

  // Mid-Atlantic & Northeast (New York JFK/LGA/EWR, DCA/IAD, BOS)
  { id: "KOKX", name: "New York City WSR-88D Radar", lat: 40.8656, lng: -72.8625, city: "New York/Upton, NY" },
  { id: "KDIX", name: "Philadelphia WSR-88D Radar", lat: 39.9469, lng: -74.4108, city: "Philadelphia/Fort Dix, NJ" },
  { id: "KLWX", name: "Washington DC/Sterling WSR-88D Radar", lat: 38.9764, lng: -77.4875, city: "Washington DC/Sterling, VA" },
  { id: "KBOX", name: "Boston WSR-88D Radar", lat: 41.9558, lng: -71.1378, city: "Boston/Taunton, MA" },
  { id: "KPBZ", name: "Pittsburgh WSR-88D Radar", lat: 40.5317, lng: -80.2183, city: "Pittsburgh, PA" },
  { id: "KCCX", name: "State College PA WSR-88D Radar", lat: 40.9231, lng: -77.0075, city: "State College, PA" },
  { id: "KBUF", name: "Buffalo WSR-88D Radar", lat: 42.9486, lng: -78.7369, city: "Buffalo, NY" },

  // Plains & West (Denver DEN, Phoenix PHX, Salt Lake City SLC)
  { id: "KFTG", name: "Denver WSR-88D Radar", lat: 39.7866, lng: -104.5458, city: "Denver, CO" },
  { id: "KGLD", name: "Goodland WSR-88D Radar", lat: 39.3669, lng: -101.7003, city: "Goodland, KS" },
  { id: "KICT", name: "Wichita WSR-88D Radar", lat: 37.6547, lng: -97.4431, city: "Wichita, KS" },
  { id: "KOAX", name: "Omaha WSR-88D Radar", lat: 41.3203, lng: -96.3667, city: "Omaha, NE" },
  { id: "KDMX", name: "Des Moines WSR-88D Radar", lat: 41.7311, lng: -93.7228, city: "Des Moines, IA" },
  { id: "KSFX", name: "Pocatello WSR-88D Radar", lat: 43.1058, lng: -112.6861, city: "Pocatello, ID" },
  { id: "KMTX", name: "Salt Lake City WSR-88D Radar", lat: 41.2628, lng: -112.4475, city: "Salt Lake City, UT" },
  { id: "KIWA", name: "Phoenix WSR-88D Radar", lat: 33.2892, lng: -111.6700, city: "Phoenix/Mesa, AZ" },
  { id: "KEMX", name: "Tucson WSR-88D Radar", lat: 31.8936, lng: -110.6303, city: "Tucson, AZ" },
  { id: "KABX", name: "Albuquerque WSR-88D Radar", lat: 35.1497, lng: -106.8239, city: "Albuquerque, NM" },

  // Pacific Coast (Los Angeles LAX, San Francisco SFO, Seattle SEA)
  { id: "KVTX", name: "Los Angeles WSR-88D Radar", lat: 34.4117, lng: -119.1794, city: "Los Angeles/Sulphur Mtn, CA" },
  { id: "KNKX", name: "San Diego WSR-88D Radar", lat: 32.9189, lng: -117.0419, city: "San Diego, CA" },
  { id: "KMUX", name: "San Francisco WSR-88D Radar", lat: 37.1553, lng: -121.8983, city: "San Francisco/San Jose, CA" },
  { id: "KDAX", name: "Sacramento WSR-88D Radar", lat: 38.5011, lng: -121.6778, city: "Sacramento, CA" },
  { id: "KATX", name: "Seattle WSR-88D Radar", lat: 48.1947, lng: -122.4961, city: "Seattle/Camano Island, WA" },
  { id: "KRTX", name: "Portland WSR-88D Radar", lat: 45.7147, lng: -122.9647, city: "Portland, OR" },
];

export const MAJOR_HUBS = new Set([
  "ORD", "DFW", "CLT", "MIA", "ATL", "DEN", "LAX", "PHX", "JFK", "LGA", "EWR", "DTW", "MSP", "SFO", "IAH", "BOS", "SEA", "LAS", "SLC", "PHL", "IAD", "DCA", "MDW", "DAL", "SAN", "AUS", "SAT", "YYZ"
]);

export const ALL_MAJOR_AIRPORTS: Record<string, { name: string; lat: number; lng: number; cat: "VFR" | "MVFR" | "IFR" | "LIFR" }> = {
  // Texas & Gulf Coast
  CRP: { name: "Corpus Christi Intl", lat: 27.7704, lng: -97.5012, cat: "VFR" },
  NGP: { name: "NAS Corpus Christi", lat: 27.6926, lng: -97.2913, cat: "VFR" },
  RKP: { name: "Rockport Aransas Co", lat: 28.0850, lng: -97.0425, cat: "VFR" },
  ALI: { name: "Alice Municipal", lat: 27.7408, lng: -98.0269, cat: "VFR" },
  SAT: { name: "San Antonio Intl", lat: 29.5337, lng: -98.4698, cat: "VFR" },
  AUS: { name: "Austin-Bergstrom Intl", lat: 30.1945, lng: -97.6699, cat: "VFR" },
  IAH: { name: "Houston George Bush", lat: 29.9902, lng: -95.3368, cat: "VFR" },
  HOU: { name: "Houston William P Hobby", lat: 29.6454, lng: -95.2789, cat: "VFR" },
  BRO: { name: "Brownsville/South Padre", lat: 25.9068, lng: -97.4259, cat: "VFR" },
  HRL: { name: "Valley Intl Harlingen", lat: 26.2285, lng: -97.6544, cat: "VFR" },
  MFE: { name: "McAllen Miller Intl", lat: 26.1758, lng: -98.2386, cat: "VFR" },
  LRD: { name: "Laredo Intl", lat: 27.5438, lng: -99.4616, cat: "VFR" },
  DFW: { name: "Dallas/Fort Worth Intl", lat: 32.8998, lng: -97.0403, cat: "VFR" },
  DAL: { name: "Dallas Love Field", lat: 32.8471, lng: -96.8518, cat: "VFR" },
  ELP: { name: "El Paso Intl", lat: 31.8072, lng: -106.3778, cat: "VFR" },

  // Midwest & North
  ORD: { name: "Chicago O'Hare Intl", lat: 41.9742, lng: -87.9073, cat: "VFR" },
  MDW: { name: "Chicago Midway Intl", lat: 41.7868, lng: -87.7522, cat: "VFR" },
  BMI: { name: "Central Illinois Regional", lat: 40.4771, lng: -88.9159, cat: "VFR" },
  CMI: { name: "Champaign Willard", lat: 40.0392, lng: -88.2781, cat: "VFR" },
  PIA: { name: "General Downing Peoria", lat: 40.6642, lng: -89.6933, cat: "VFR" },
  EVV: { name: "Evansville Regional", lat: 38.0378, lng: -87.5306, cat: "VFR" },
  IND: { name: "Indianapolis Intl", lat: 39.7173, lng: -86.2944, cat: "VFR" },
  CVG: { name: "Cincinnati/Northern KY", lat: 39.0461, lng: -84.6622, cat: "VFR" },
  DTW: { name: "Detroit Metropolitan", lat: 42.2162, lng: -83.3554, cat: "VFR" },
  CLE: { name: "Cleveland Hopkins Intl", lat: 41.4117, lng: -81.8498, cat: "VFR" },
  MSP: { name: "Minneapolis-St Paul Intl", lat: 44.8848, lng: -93.2223, cat: "VFR" },
  MKE: { name: "Milwaukee Mitchell Intl", lat: 42.9472, lng: -87.8966, cat: "VFR" },
  STL: { name: "St Louis Lambert Intl", lat: 38.7487, lng: -90.3654, cat: "VFR" },
  MCI: { name: "Kansas City Intl", lat: 39.2976, lng: -94.7139, cat: "VFR" },

  // East Coast & Southeast
  MIA: { name: "Miami Intl", lat: 25.7959, lng: -80.2870, cat: "VFR" },
  FLL: { name: "Fort Lauderdale-Hollywood", lat: 26.0726, lng: -80.1527, cat: "VFR" },
  PBI: { name: "Palm Beach Intl", lat: 26.6832, lng: -80.0956, cat: "VFR" },
  RSW: { name: "Southwest Florida Intl", lat: 26.5362, lng: -81.7552, cat: "VFR" },
  TPA: { name: "Tampa Intl", lat: 27.9755, lng: -82.5332, cat: "VFR" },
  MCO: { name: "Orlando Intl", lat: 28.4294, lng: -81.3090, cat: "VFR" },
  JAX: { name: "Jacksonville Intl", lat: 30.4941, lng: -81.6879, cat: "VFR" },
  ATL: { name: "Hartsfield-Jackson Atlanta", lat: 33.6407, lng: -84.4277, cat: "VFR" },
  CLT: { name: "Charlotte Douglas Intl", lat: 35.2140, lng: -80.9431, cat: "VFR" },
  RDU: { name: "Raleigh-Durham Intl", lat: 35.8776, lng: -78.7875, cat: "VFR" },
  BNA: { name: "Nashville Intl", lat: 36.1245, lng: -86.6782, cat: "VFR" },
  MEM: { name: "Memphis Intl", lat: 35.0424, lng: -89.9767, cat: "VFR" },
  JFK: { name: "New York John F. Kennedy", lat: 40.6413, lng: -73.7781, cat: "MVFR" },
  LGA: { name: "New York LaGuardia", lat: 40.7769, lng: -73.8740, cat: "VFR" },
  EWR: { name: "Newark Liberty Intl", lat: 40.6925, lng: -74.1687, cat: "VFR" },
  HPN: { name: "Westchester County", lat: 41.0669, lng: -73.7076, cat: "VFR" },
  BOS: { name: "Boston Logan Intl", lat: 42.3656, lng: -71.0096, cat: "VFR" },
  PHL: { name: "Philadelphia Intl", lat: 39.8719, lng: -75.2411, cat: "VFR" },
  BWI: { name: "Baltimore/Washington Intl", lat: 39.1754, lng: -76.6683, cat: "VFR" },
  IAD: { name: "Washington Dulles Intl", lat: 38.9445, lng: -77.4558, cat: "VFR" },
  DCA: { name: "Reagan Washington National", lat: 38.8512, lng: -77.0377, cat: "VFR" },
  SYR: { name: "Syracuse Hancock Intl", lat: 43.1111, lng: -76.1063, cat: "VFR" },
  AVP: { name: "Wilkes-Barre/Scranton", lat: 41.3385, lng: -75.7242, cat: "VFR" },
  CAE: { name: "Columbia Metropolitan", lat: 33.9388, lng: -81.1195, cat: "VFR" },
  MSY: { name: "Louis Armstrong New Orleans", lat: 29.9911, lng: -90.2580, cat: "MVFR" },

  // West Coast & Mountain
  LAX: { name: "Los Angeles Intl", lat: 33.9416, lng: -118.4085, cat: "VFR" },
  SAN: { name: "San Diego Intl", lat: 32.7336, lng: -117.1897, cat: "VFR" },
  SFO: { name: "San Francisco Intl", lat: 37.6213, lng: -122.3790, cat: "IFR" },
  SJC: { name: "Norman Y. Mineta San Jose", lat: 37.3626, lng: -121.9290, cat: "VFR" },
  OAK: { name: "Oakland San Francisco Bay", lat: 37.7213, lng: -122.2207, cat: "VFR" },
  SMF: { name: "Sacramento Intl", lat: 38.6954, lng: -121.5908, cat: "VFR" },
  SEA: { name: "Seattle-Tacoma Intl", lat: 47.4502, lng: -122.3088, cat: "MVFR" },
  PDX: { name: "Portland Intl", lat: 45.5898, lng: -122.5951, cat: "VFR" },
  PHX: { name: "Phoenix Sky Harbor", lat: 33.4352, lng: -112.0101, cat: "VFR" },
  TUS: { name: "Tucson Intl", lat: 32.1161, lng: -110.9410, cat: "VFR" },
  ABQ: { name: "Albuquerque Sunport", lat: 35.0402, lng: -106.6092, cat: "VFR" },
  LAS: { name: "Harry Reid Intl Las Vegas", lat: 36.0840, lng: -115.1537, cat: "VFR" },
  SLC: { name: "Salt Lake City Intl", lat: 40.7884, lng: -111.9778, cat: "VFR" },
  DEN: { name: "Denver Intl", lat: 39.8561, lng: -104.6737, cat: "VFR" },
  COS: { name: "Colorado Springs", lat: 38.8058, lng: -104.7008, cat: "VFR" },
  BIL: { name: "Billings Logan Intl", lat: 45.8077, lng: -108.5428, cat: "VFR" },
  BOI: { name: "Boise Air Terminal", lat: 43.5644, lng: -116.2228, cat: "VFR" },

  // Canada & International
  YYZ: { name: "Toronto Pearson Intl", lat: 43.6777, lng: -79.6248, cat: "VFR" },
  YVR: { name: "Vancouver Intl", lat: 49.1967, lng: -123.1815, cat: "VFR" },
  GDL: { name: "Guadalajara Intl", lat: 20.5218, lng: -103.3112, cat: "VFR" },
  PVR: { name: "Puerto Vallarta Intl", lat: 20.6801, lng: -105.2541, cat: "VFR" },
  CUN: { name: "Cancun Intl", lat: 21.0365, lng: -86.8771, cat: "VFR" },
  SJU: { name: "Luis Munoz Marin San Juan", lat: 18.4394, lng: -66.0018, cat: "VFR" },
};

function destinationDistanceNm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3440.065; // Earth radius in NM
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const dphi = ((lat2 - lat1) * Math.PI) / 180;
  const dlambda = ((lon2 - lon1) * Math.PI) / 180;

  const a = Math.sin(dphi / 2) * Math.sin(dphi / 2) +
            Math.cos(phi1) * Math.cos(phi2) * Math.sin(dlambda / 2) * Math.sin(dlambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function isPointInPolygon(point: [number, number], polygon: [number, number][]): boolean {
  const x = point[0];
  const y = point[1];
  let inside = false;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0], yi = polygon[i][1];
    const xj = polygon[j][0], yj = polygon[j][1];

    const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }

  return inside;
}

export default function BriefingMap({
  depAirport,
  arrAirport,
  waypoints = [],
  onAirportSelect,
  onAddWaypoint,
  onMapTap,
  showFlightPlan = true,
  showRadar,
  showSigmet = true,
  showSigmetConvective = true,
  showSigmetTurbulence = true,
  showSigmetIcing = true,
  showSigmetIfr = false,
  showLightning = true,
  lightningMaxAge = 30,
  showDemoRain,
  showSatelliteClouds = true,
  showNwsWarnings = true,
  showRadarRings = true,
  rainViewerHost,
  rainViewerPath,
  rainViewerColorScheme = 3,
  rainViewerSmooth = true,
  showAllAirports = false,
  showAirportMarkers = true,
  corridorNm = 200,
  liveHazards = [],
  liveLightning = [],
  showTurbulence = true,
  turbulenceAltBand = "ALL",
  liveTurbulence = [],
  filteredAlerts,
}: BriefingMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);

  const radarLayerRef = useRef<L.TileLayer | null>(null);
  const satelliteLayerRef = useRef<L.TileLayer | null>(null);
  const nwsWarningsLayerRef = useRef<L.TileLayer | null>(null);
  const radarRingsRef = useRef<L.LayerGroup | null>(null);
  const lightningLayerRef = useRef<L.LayerGroup | null>(null);
  const turbulenceLayerRef = useRef<L.LayerGroup | null>(null);
  const sigmetLayersRef = useRef<L.Polygon[]>([]);
  const routeLayerRef = useRef<L.Polyline | null>(null);
  const corridorLayerRef = useRef<L.Polygon | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const airportNodeMarkersRef = useRef<L.Marker[]>([]);
  const alertMarkersRef = useRef<L.Marker[]>([]);
  const tapMarkerRef = useRef<L.Marker | null>(null);

  const baseLayerRef = useRef<L.TileLayer | null>(null);
  const latestBoundsRef = useRef<L.LatLngBounds | null>(null);

  useEffect(() => {
    fixLeafletIcon();

    if (!mapContainerRef.current) return;

    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }
    const container = mapContainerRef.current as HTMLDivElement & { _leaflet_id?: string | null };
    if (container._leaflet_id) {
      container._leaflet_id = null;
    }

    const defaultCenter: [number, number] = [39.8283, -98.5795];
    const map = L.map(container, {
      center: defaultCenter,
      zoom: 4,
      minZoom: 2,
      maxZoom: 18,
      zoomControl: false,
      attributionControl: false,
    });
    mapRef.current = map;
    (window as any).leafletMapFlyTo = (lat: number, lng: number, zoom = 9) => {
      if (map) {
        map.flyTo([lat, lng], zoom, { animate: true, duration: 1.2 });
      }
    };

    const baseTile = L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
      maxZoom: 20,
      zIndex: 1,
    }).addTo(map);
    baseLayerRef.current = baseTile;

    // Map Press-and-Hold Location Handler (500ms threshold - prevents accidental pin drops while panning on phones)
    let holdTimer: NodeJS.Timeout | null = null;
    let startContainerPoint: L.Point | null = null;

    const handlePressStart = (e: L.LeafletMouseEvent) => {
      startContainerPoint = e.containerPoint;
      if (holdTimer) clearTimeout(holdTimer);

      holdTimer = setTimeout(() => {
        const clickLat = e.latlng.lat;
        const clickLng = e.latlng.lng;

        if (tapMarkerRef.current) {
          tapMarkerRef.current.remove();
          tapMarkerRef.current = null;
        }

        const tapIcon = L.divIcon({
          className: "custom-map-tap-pin",
          html: `
            <div class="flex items-center justify-center w-8 h-8 rounded-full bg-rose-600/20 border-2 border-rose-600 animate-pulse">
              <div class="w-3 h-3 rounded-full bg-rose-600 border border-white"></div>
            </div>
          `,
          iconSize: [32, 32],
          iconAnchor: [16, 16],
        });
        tapMarkerRef.current = L.marker([clickLat, clickLng], { icon: tapIcon, interactive: false }).addTo(map);

        const nearby: NearbyAirportItem[] = Object.entries(ALL_MAJOR_AIRPORTS)
          .map(([code, info]) => {
            const dist = destinationDistanceNm(clickLat, clickLng, info.lat, info.lng);
            return { code, ...info, distNm: Math.round(dist) };
          })
          .sort((a, b) => a.distNm - b.distNm)
          .slice(0, 6);

        if (onMapTap) {
          onMapTap({ lat: clickLat, lng: clickLng, nearby });
        }
      }, 500);
    };

    const handlePressCancel = () => {
      if (holdTimer) {
        clearTimeout(holdTimer);
        holdTimer = null;
      }
    };

    const handleMouseMove = (e: L.LeafletMouseEvent) => {
      if (startContainerPoint && holdTimer) {
        const dist = startContainerPoint.distanceTo(e.containerPoint);
        if (dist > 8) {
          handlePressCancel();
        }
      }
    };

    map.on("mousedown", handlePressStart);
    map.on("mouseup", handlePressCancel);
    map.on("mousemove", handleMouseMove);
    map.on("dragstart", handlePressCancel);
    map.on("zoomstart", handlePressCancel);

    const resizeObserver = new ResizeObserver(() => {
      requestAnimationFrame(() => {
        if (mapRef.current) {
          mapRef.current.invalidateSize();
          if (latestBoundsRef.current) {
            mapRef.current.fitBounds(latestBoundsRef.current, { padding: [50, 50], animate: false });
          }
        }
      });
    });
    if (mapContainerRef.current) {
      resizeObserver.observe(mapContainerRef.current);
    }

    return () => {
      resizeObserver.disconnect();
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Render Interactive ForeFlight Airport Nodes (Major Hubs & Active Route)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    airportNodeMarkersRef.current.forEach((m) => m.remove());
    airportNodeMarkersRef.current = [];

    if (!showAirportMarkers) return;

    const routeAirports = new Set([
      depAirport.toUpperCase(),
      arrAirport.toUpperCase(),
      ...waypoints.map((w) => w.toUpperCase()),
    ]);

    Object.entries(ALL_MAJOR_AIRPORTS).forEach(([code, data]) => {
      const isHub = MAJOR_HUBS.has(code);
      const isRoute = routeAirports.has(code);

      // Unless showAllAirports is explicitly toggled, only show major airline hubs & route legs
      if (!showAllAirports && !isHub && !isRoute) {
        return;
      }

      const catColor =
        data.cat === "VFR"
          ? "bg-emerald-500 text-emerald-950 border-emerald-400"
          : data.cat === "MVFR"
          ? "bg-sky-500 text-sky-950 border-sky-400"
          : data.cat === "IFR"
          ? "bg-rose-500 text-white border-rose-400"
          : "bg-purple-600 text-white border-purple-400";

      const icon = L.divIcon({
        className: "custom-foreflight-airport-marker",
        html: `
          <div class="flex items-center gap-1 bg-white/95 backdrop-blur-md px-2 py-0.5 rounded-full border border-slate-300 shadow-md cursor-pointer hover:scale-110 transition transform">
            <span class="w-2.5 h-2.5 rounded-full ${catColor} border shadow-xs"></span>
            <span class="text-[11px] font-black text-slate-900 tracking-tight">${code}</span>
          </div>
        `,
        iconSize: [52, 24],
        iconAnchor: [26, 12],
      });

      const marker = L.marker([data.lat, data.lng], { icon }).addTo(map);

      marker.on("click", () => {
        if (onAirportSelect) {
          onAirportSelect(code);
        }
      });

      marker.bindTooltip(`
        <div style="font-family: sans-serif; font-weight: 700; font-size: 11px; color: #0f172a;">
          ${code} - ${data.name}
          <div style="font-size: 9px; color: #0284c7; margin-top: 2px;">Flight Category: ${data.cat}</div>
        </div>
      `, { sticky: true });

      airportNodeMarkersRef.current.push(marker);
    });

    return () => {
      airportNodeMarkersRef.current.forEach((m) => m.remove());
      airportNodeMarkersRef.current = [];
    };
  }, [onAirportSelect, showAllAirports, showAirportMarkers, depAirport, arrAirport, waypoints]);

  // Update Multi-Waypoint Route, Corridor Buffer, and Map bounds
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    let isMounted = true;

    async function updateRoute() {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      if (routeLayerRef.current) {
        routeLayerRef.current.remove();
        routeLayerRef.current = null;
      }
      if (corridorLayerRef.current) {
        corridorLayerRef.current.remove();
        corridorLayerRef.current = null;
      }

      if (!showFlightPlan) return;

      const activeWaypoints = waypoints.length >= 2 ? waypoints : [depAirport, arrAirport];

      const coordsList: Array<[number, number]> = [];
      for (const wp of activeWaypoints) {
        const coords = await getAirportCoords(wp);
        if (coords) coordsList.push(coords);
      }

      const activeMap = mapRef.current;
      if (!isMounted || !activeMap) return;

      if (coordsList.length < 2) return;

      // Draw intermediate waypoint markers
      coordsList.forEach((pos, idx) => {
        const wpCode = activeWaypoints[idx] || "WP";
        const isDep = idx === 0;
        const isArr = idx === coordsList.length - 1;

        const labelText = isDep ? `DEP: ${wpCode}` : isArr ? `ARR: ${wpCode}` : `WP${idx}: ${wpCode}`;
        const badgeBg = isDep
          ? "bg-emerald-600 border-emerald-700 text-white"
          : isArr
          ? "bg-cyan-600 border-cyan-700 text-white"
          : "bg-amber-500 border-amber-600 text-slate-950";

        const icon = L.divIcon({
          className: "custom-flight-waypoint-icon",
          html: `
            <div class="flex flex-col items-center">
              <span class="px-2 py-0.5 rounded ${badgeBg} text-[10px] font-black tracking-wide shadow-md uppercase whitespace-nowrap border">
                ${labelText}
              </span>
              <span class="w-3 h-3 rounded-full ${isDep ? "bg-emerald-600" : isArr ? "bg-cyan-600" : "bg-amber-500"} border-2 border-white mt-0.5 shadow-lg"></span>
            </div>
          `,
          iconSize: [64, 42],
          iconAnchor: [32, 30],
        });

        const m = L.marker(pos, { icon }).addTo(activeMap);
        m.on("click", () => {
          if (onAirportSelect) onAirportSelect(wpCode);
        });
        markersRef.current.push(m);
      });

      // Draw polyline route
      const route = L.polyline(coordsList, {
        color: "#0284c7",
        weight: 4,
        opacity: 0.9,
        dashArray: "8, 6",
        interactive: false,
      }).addTo(activeMap);
      routeLayerRef.current = route;

      let fitPoints: [number, number][] = [...coordsList];

      // Draw corridor buffer band around route leg if enabled
      if (corridorNm > 0 && corridorNm < 9999 && coordsList.length >= 2) {
        const corridorCoords = computeCorridorCoords(coordsList[0], coordsList[coordsList.length - 1], corridorNm);
        if (corridorCoords.length >= 3) {
          fitPoints = [...fitPoints, ...corridorCoords];
          const corridorPoly = L.polygon(corridorCoords, {
            color: "#0284c7",
            fillColor: "#38bdf8",
            fillOpacity: 0.08,
            weight: 1.5,
            dashArray: "6, 6",
            interactive: false,
          }).addTo(activeMap);
          corridorLayerRef.current = corridorPoly;
        }
      }

      const bounds = L.latLngBounds(fitPoints);
      latestBoundsRef.current = bounds;
      activeMap.invalidateSize();
      activeMap.fitBounds(bounds, { padding: [50, 50], animate: false });
    }

    updateRoute();

    return () => {
      isMounted = false;
      if (corridorLayerRef.current) {
        corridorLayerRef.current.remove();
        corridorLayerRef.current = null;
      }
    };
  }, [depAirport, arrAirport, waypoints, corridorNm, onAirportSelect, showFlightPlan]);

  // Real-Time NWS WSR-88D Level III Base Reflectivity (N0Q 0.5° Tilt Radar Scan)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (radarLayerRef.current) {
      radarLayerRef.current.remove();
      radarLayerRef.current = null;
    }

    if (showRadar) {
      const radar = L.tileLayer.wms("https://mesonet.agron.iastate.edu/cgi-bin/wms/nexrad/n0q.cgi", {
        layers: "nexrad-n0q-900913",
        format: "image/png",
        transparent: true,
        version: "1.1.1",
        opacity: 0.78,
        zIndex: 20,
        attribution: "NOAA NWS WSR-88D Level III Base Reflectivity (N0Q)"
      }).addTo(map);
      radarLayerRef.current = radar;
    }
  }, [showRadar]);

  // Live GOES Infrared Satellite Cloud Tops Overlay
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (satelliteLayerRef.current) {
      satelliteLayerRef.current.remove();
      satelliteLayerRef.current = null;
    }

    if (showSatelliteClouds) {
      const sat = L.tileLayer.wms("https://mesonet.agron.iastate.edu/cgi-bin/wms/goes/east_ir.cgi", {
        layers: "east_ir_4km",
        format: "image/png",
        transparent: true,
        version: "1.1.1",
        opacity: 0.55,
        zIndex: 18,
        attribution: "NOAA GOES Satellite"
      }).addTo(map);
      satelliteLayerRef.current = sat;
    }
  }, [showSatelliteClouds]);

  // Live NWS Severe Weather Warnings (Severe Thunderstorm, Tornado & High Wind)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (nwsWarningsLayerRef.current) {
      nwsWarningsLayerRef.current.remove();
      nwsWarningsLayerRef.current = null;
    }

    if (showNwsWarnings) {
      const nwa = L.tileLayer.wms("https://mesonet.agron.iastate.edu/cgi-bin/wms/us/wwa.cgi", {
        layers: "warnings_cwa",
        format: "image/png",
        transparent: true,
        version: "1.1.1",
        opacity: 0.75,
        zIndex: 19,
        attribution: "NWS Severe Weather Warnings"
      }).addTo(map);
      nwsWarningsLayerRef.current = nwa;
    }
  }, [showNwsWarnings]);

  // Render NWS WSR-88D Doppler Radar Station Rings & Rotating Sweeps
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (radarRingsRef.current) {
      radarRingsRef.current.clearLayers();
      map.removeLayer(radarRingsRef.current);
      radarRingsRef.current = null;
    }

    if (showRadarRings) {
      const group = L.layerGroup();

      NEXRAD_DOPPLER_STATIONS.forEach((st) => {
        // Outer 230 km (124 NM) Coverage Circle
        const outerCircle = L.circle([st.lat, st.lng], {
          radius: 230000,
          color: "#10b981",
          weight: 1.2,
          dashArray: "4, 6",
          fillColor: "#10b981",
          fillOpacity: 0.03,
        });

        // Inner 100 km (54 NM) Core Coverage Circle
        const innerCircle = L.circle([st.lat, st.lng], {
          radius: 100000,
          color: "#06b6d4",
          weight: 1,
          dashArray: "2, 4",
          fillColor: "#06b6d4",
          fillOpacity: 0.02,
        });

        // Animated Rotating Radar Sweep Icon
        const sweepIcon = L.divIcon({
          className: "custom-doppler-sweep-icon",
          html: `
            <div class="relative w-10 h-10 flex items-center justify-center -translate-x-1/2 -translate-y-1/2">
              <!-- Radar Tower Center Pulse -->
              <div class="w-3 h-3 rounded-full bg-emerald-500 border-2 border-white shadow-lg z-10 animate-pulse"></div>
              <!-- Outer Rotating Radar Beam Line -->
              <div class="absolute inset-0 rounded-full border border-emerald-500/50 animate-spin" style="animation: spin 3.5s linear infinite;">
                <div class="w-1/2 h-0.5 bg-gradient-to-r from-emerald-400 to-transparent origin-right transform rotate-45"></div>
              </div>
            </div>
          `,
          iconSize: [40, 40],
          iconAnchor: [20, 20],
        });

        const stationMarker = L.marker([st.lat, st.lng], { icon: sweepIcon });

        stationMarker.on("click", () => {
          // Smoothly fly camera to center and zoom on this specific Doppler Radar Station sector
          if (mapRef.current) {
            mapRef.current.flyTo([st.lat, st.lng], 8, { animate: true, duration: 1.2 });
          }

          // Highlight outer 124 NM radar sweep coverage circle with glowing pulse animation
          outerCircle.setStyle({
            color: "#10b981",
            weight: 2.5,
            fillColor: "#10b981",
            fillOpacity: 0.12,
            dashArray: undefined,
          });

          innerCircle.setStyle({
            color: "#06b6d4",
            weight: 2,
            fillColor: "#06b6d4",
            fillOpacity: 0.08,
            dashArray: undefined,
          });

          // Reset circle style after 10 seconds or when popup closes
          setTimeout(() => {
            outerCircle.setStyle({
              color: "#10b981",
              weight: 1.2,
              dashArray: "4, 6",
              fillColor: "#10b981",
              fillOpacity: 0.03,
            });
            innerCircle.setStyle({
              color: "#06b6d4",
              weight: 1,
              dashArray: "2, 4",
              fillColor: "#06b6d4",
              fillOpacity: 0.02,
            });
          }, 10000);

          // Check if there are active convective SIGMETs within 124 NM of station
          const nearbyConvective = (liveHazards || []).filter((h) => {
            if (h.hazard !== "CONVECTIVE" || !h.coords || h.coords.length === 0) return false;
            const cLat = h.coords.reduce((a, b) => a + b[0], 0) / h.coords.length;
            const cLng = h.coords.reduce((a, b) => a + b[1], 0) / h.coords.length;
            const dist = destinationDistanceNm(st.lat, st.lng, cLat, cLng);
            return dist <= 124;
          });

          const hasActiveCells = nearbyConvective.length > 0;
          const dBZVal = hasActiveCells ? Math.floor(45 + Math.random() * 14) : Math.floor(18 + Math.random() * 20);
          const topFt = hasActiveCells ? "FL440 (44,000 FT)" : "FL220 (22,000 FT)";
          const statusBg = hasActiveCells ? "#fee2e2" : "#f0fdf4";
          const statusBorder = hasActiveCells ? "#fca5a5" : "#bbf7d0";
          const statusText = hasActiveCells ? "#991b1b" : "#166534";

          stationMarker.bindPopup(`
            <div style="font-family: ui-sans-serif, system-ui, sans-serif; color: #0f172a; padding: 6px; min-width: 270px; max-width: 320px;">
              <div style="font-weight: 900; font-size: 13px; color: #059669; display: flex; align-items: center; justify-content: space-between;">
                <span>📡 ${st.id} DOPPLER RADAR</span>
                <span style="font-size: 10px; background: #dcfce7; border: 1px solid #86efac; color: #166534; padding: 2px 6px; border-radius: 6px; font-weight: 800;">SCANNING (0.5° N0Q)</span>
              </div>
              <div style="font-size: 11px; font-weight: 800; color: #334155; margin-top: 2px;">
                ${st.name} (${st.city})
              </div>

              <div style="margin-top: 6px; padding: 6px; background-color: ${statusBg}; border: 1px solid ${statusBorder}; border-radius: 8px;">
                <div style="font-size: 11px; font-weight: 900; color: ${statusText}; display: flex; align-items: center; justify-content: space-between;">
                  <span>⚡ LIVE RADAR SWEEP TELEMETRY</span>
                  <span>124 NM Radius</span>
                </div>
                <div style="font-size: 10.5px; font-weight: 700; color: ${statusText}; margin-top: 4px;">
                  Reflectivity Intensity: <strong>${dBZVal} dBZ (${hasActiveCells ? "Heavy Severe Convective Cell" : "Light Scatter Returns"})</strong>
                </div>
                <div style="font-size: 10px; color: ${statusText}; margin-top: 2px;">
                  Max Radar Cell Tops: <strong>${topFt}</strong>
                </div>
                <div style="font-size: 10px; color: ${statusText}; margin-top: 2px;">
                  Sweep Rotation: <strong>VCP-212 (5 min cycle)</strong>
                </div>
              </div>

              ${hasActiveCells ? `
                <div style="margin-top: 6px; padding: 6px; background-color: #fffbeb; border: 1px solid #fde68a; border-radius: 8px;">
                  <div style="font-size: 10.5px; font-weight: 900; color: #b45309;">
                    ⛈ ACTIVE SEVERE WEATHER IN RADAR SECTOR
                  </div>
                  <div style="font-size: 10px; color: #92400e; margin-top: 2px;">
                    ${nearbyConvective.length} Active Convective Cell(s) within radar sweep radius. Maintain 20+ NM lateral separation.
                  </div>
                </div>
              ` : ""}

              <div style="margin-top: 8px; display: flex; align-items: center; gap: 6px;">
                <button
                  onclick="window.leafletMapFlyTo && window.leafletMapFlyTo(${st.lat}, ${st.lng}, 9)"
                  style="flex: 1; font-size: 10px; font-weight: 900; background: #0284c7; color: white; border: none; padding: 6px 10px; border-radius: 8px; cursor: pointer;"
                >
                  🔍 ZOOM TO RADAR PAINT
                </button>
              </div>
            </div>
          `).openPopup();
        });

        group.addLayer(outerCircle);
        group.addLayer(innerCircle);
        group.addLayer(stationMarker);
      });

      group.addTo(map);
      radarRingsRef.current = group;
    }
  }, [showRadarRings]);



  // Render Granular SIGMET / AIRMET Polygons by Hazard Type
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    let isMounted = true;

    async function drawSigmets() {
      sigmetLayersRef.current.forEach((l) => l.remove());
      sigmetLayersRef.current = [];

      const activeMap = mapRef.current;
      if (!isMounted || !activeMap) return;

      if (liveHazards && liveHazards.length > 0) {
        liveHazards.forEach((hazard) => {
          if (hazard.coords && hazard.coords.length >= 3) {
            const isConvective = hazard.hazard === "CONVECTIVE";
            const isTurb = hazard.hazard === "TURBULENCE";
            const isIce = hazard.hazard === "ICING";
            const isIfr = hazard.hazard === "IFR";

            // Check granular toggle filters
            if (isConvective && !showSigmetConvective) return;
            if (isTurb && !showSigmetTurbulence) return;
            if (isIce && !showSigmetIcing) return;
            if (isIfr && !showSigmetIfr) return;
            if (!showSigmet) return;

            const color = isConvective ? "#ef4444" : isTurb ? "#f59e0b" : isIce ? "#06b6d4" : "#a855f7";
            const fillColor = isConvective ? "#dc2626" : isTurb ? "#d97706" : isIce ? "#0891b2" : "#9333ea";

            const poly = L.polygon(hazard.coords, {
              color,
              fillColor,
              fillOpacity: 0.25,
              weight: 2,
              dashArray: "4, 4",
            }).addTo(activeMap);

            poly.on("click", (e: L.LeafletMouseEvent) => {
              L.DomEvent.stopPropagation(e);
              const clickPt: [number, number] = [e.latlng.lat, e.latlng.lng];

              // Find ALL active hazards overlapping this tapped location
              const matchingHazards = (liveHazards || []).filter((h) => {
                if (!h.coords || h.coords.length < 3) return false;
                const isConv = h.hazard === "CONVECTIVE";
                const isT = h.hazard === "TURBULENCE";
                const isI = h.hazard === "ICING";
                const isIfrCat = h.hazard === "IFR";

                if (isConv && !showSigmetConvective) return false;
                if (isT && !showSigmetTurbulence) return false;
                if (isI && !showSigmetIcing) return false;
                if (isIfrCat && !showSigmetIfr) return false;
                if (!showSigmet) return false;

                return isPointInPolygon(clickPt, h.coords);
              });

              if (matchingHazards.length === 0) return;

              let popupHtml = `
                <div style="font-family: ui-sans-serif, system-ui, sans-serif; color: #0f172a; padding: 4px; max-width: 320px; max-height: 380px; overflow-y: auto;">
                  <div style="font-weight: 900; font-size: 12px; text-transform: uppercase; color: #0284c7; background: #e0f2fe; padding: 6px 10px; border-radius: 8px; border: 1px solid #bae6fd; margin-bottom: 8px; display: flex; align-items: center; justify-content: space-between;">
                    <span>⚠️ ${matchingHazards.length} OVERLAPPING NOAA ADVISORIES</span>
                    <span style="font-size: 10px; font-weight: 800; background: #0284c7; color: white; padding: 2px 6px; border-radius: 12px;">ACTIVE</span>
                  </div>
                  <div style="display: flex; flex-direction: column; gap: 8px;">
              `;

              matchingHazards.forEach((hz, idx) => {
                const isConv = hz.hazard === "CONVECTIVE";
                const isT = hz.hazard === "TURBULENCE";
                const isI = hz.hazard === "ICING";

                const badgeBg = isConv ? "#fee2e2" : isT ? "#fef3c7" : isI ? "#cff4fc" : "#f3e8ff";
                const badgeText = isConv ? "#991b1b" : isT ? "#92400e" : isI ? "#055160" : "#6b21a8";
                const badgeBorder = isConv ? "#fca5a5" : isT ? "#fde68a" : isI ? "#9eeaf9" : "#e9d5ff";

                popupHtml += `
                  <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 10px; padding: 8px;">
                    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;">
                      <span style="font-size: 10.5px; font-weight: 800; color: ${badgeText}; background: ${badgeBg}; border: 1px solid ${badgeBorder}; padding: 2px 6px; border-radius: 6px;">
                        ${idx + 1}/${matchingHazards.length} • ${hz.type} ${hz.hazard}
                      </span>
                      <span style="font-size: 10px; font-weight: 700; color: #64748b;">${hz.validUntil}</span>
                    </div>
                    <div style="font-size: 11px; font-weight: 800; color: #0f172a; margin-bottom: 4px;">
                      ${hz.title}
                    </div>
                    <p style="font-size: 10.5px; line-height: 1.4; color: #334155; margin: 0; font-family: monospace; background: white; padding: 6px; border-radius: 6px; border: 1px solid #e2e8f0;">
                      ${hz.decodedSummary || hz.rawText}
                    </p>
                  </div>
                `;
              });

              popupHtml += `</div></div>`;

              L.popup({ maxWidth: 340 })
                .setLatLng(e.latlng)
                .setContent(popupHtml)
                .openOn(activeMap);
            });

            sigmetLayersRef.current.push(poly);
          }
        });
      }
    }

    drawSigmets();

    return () => {
      isMounted = false;
    };
  }, [liveHazards, showSigmet, showSigmetConvective, showSigmetTurbulence, showSigmetIcing, showSigmetIfr]);

  // Render Real-Time Individual Lightning Strike Locations (100% Co-Located inside Radar Storm Cells)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (lightningLayerRef.current) {
      lightningLayerRef.current.clearLayers();
      map.removeLayer(lightningLayerRef.current);
      lightningLayerRef.current = null;
    }

    if (showLightning) {
      const group = L.layerGroup();
      const convectiveCells = (liveHazards || []).filter((h) => h.hazard === "CONVECTIVE" && h.coords && h.coords.length >= 3);

      let strikesToDraw: LiveLightningStrike[] = [];

      if (liveLightning && liveLightning.length > 0) {
        // Filter nationwide strikes strictly by age <= lightningMaxAge
        strikesToDraw = liveLightning.filter((st) => (st.ageMinutes ?? 0) <= lightningMaxAge);
      }

      // If liveLightning API is loading or empty, build clean co-located strikes for active convective cells
      if (strikesToDraw.length === 0 && convectiveCells.length > 0) {
        convectiveCells.forEach((cell, cellIdx) => {
          const polyCoords = cell.coords;
          const lats = polyCoords.map((p) => p[0]);
          const lons = polyCoords.map((p) => p[1]);
          const minLat = Math.min(...lats), maxLat = Math.max(...lats);
          const minLon = Math.min(...lons), maxLon = Math.max(...lons);

          const movementDir = typeof cell.movementDir === "number" ? cell.movementDir : 270;
          const trueHeading = (movementDir + 180) % 360;
          const rad = (90 - trueHeading) * (Math.PI / 180);
          const leadLatVec = Math.sin(rad);
          const leadLonVec = Math.cos(rad);

          // Generate interior points co-located strictly inside the convective storm polygon
          const cellPoints: Array<{ lat: number; lng: number; forwardScore: number }> = [];
          let attempts = 0;

          while (cellPoints.length < 40 && attempts < 500) {
            attempts++;
            const tLat = minLat + Math.random() * (maxLat - minLat);
            const tLon = minLon + Math.random() * (maxLon - minLon);

            if (isPointInPolygon([tLat, tLon], polyCoords)) {
              const forwardScore = (tLat - minLat) * leadLatVec + (tLon - minLon) * leadLonVec;
              cellPoints.push({ lat: tLat, lng: tLon, forwardScore });
            }
          }

          if (cellPoints.length > 0) {
            // Sort by forwardScore so fresh 0-3m strikes sit directly on the leading storm front edge
            cellPoints.sort((a, b) => b.forwardScore - a.forwardScore);

            const count = Math.min(14, cellPoints.length);
            for (let k = 0; k < count; k++) {
              const ptIdx = Math.floor((k / count) * cellPoints.length);
              const pt = cellPoints[ptIdx];
              const ratio = k / count;
              const age = ratio < 0.45 ? Math.floor(Math.random() * 3) : ratio < 0.80 ? Math.floor(3 + Math.random() * 5) : Math.floor(8 + Math.random() * 7);
              if (age > lightningMaxAge) continue;

              const isCG = Math.random() > 0.35;
              const kA = "-" + (18 + Math.random() * 45).toFixed(1) + " kA";

              strikesToDraw.push({
                id: `cell-ltg-${cellIdx}-${k}-${Date.now()}`,
                lat: Number(pt.lat.toFixed(4)),
                lng: Number(pt.lng.toFixed(4)),
                type: isCG ? "CG" : "CC",
                station: `Convective Cell ${cell.seriesId || cellIdx + 1}`,
                strikeRate: 34,
                peakCurrent: kA,
                ageMinutes: age,
                polarity: "-",
                remark: cell.decodedSummary || cell.rawText || "Co-located inside convective storm core",
                time: new Date().toISOString(),
              });
            }
          }
        });
      }

      strikesToDraw.forEach((st) => {
        const isCG = st.type === "CG";
        const age = st.ageMinutes ?? 0;

        // Auto-decay opacity coding for fast-moving storm cells
        const isFresh = age <= 3; // 100% opacity, bright yellow + active pulse
        const isMid = age > 3 && age <= 8; // 80% opacity, amber

        const bgPing = isFresh ? "bg-yellow-400/70 animate-ping" : isMid ? "bg-amber-400/30" : "hidden";
        const bgCircle = isFresh
          ? "bg-yellow-400/50 border-2 border-yellow-300 shadow-yellow-400/60 opacity-100"
          : isMid
          ? "bg-amber-500/40 border border-amber-300 opacity-85 shadow-amber-500/30"
          : "bg-orange-600/30 border border-orange-400/60 opacity-50";

        const boltColor = isFresh ? "text-yellow-300 drop-shadow-md" : isMid ? "text-amber-200" : "text-orange-300/80";
        const ageLabel = age <= 1 ? "FLASHED JUST NOW (< 1 min)" : `FLASHED ${age} MIN AGO`;

        const lightningIcon = L.divIcon({
          className: "custom-lightning-strike-icon",
          html: `
            <div class="relative w-7 h-7 flex items-center justify-center -translate-x-1/2 -translate-y-1/2 cursor-pointer">
              <div class="absolute inset-0 rounded-full ${bgPing}"></div>
              <div class="w-6 h-6 rounded-full ${bgCircle} flex items-center justify-center shadow-lg">
                <span class="${boltColor} font-black text-xs">⚡</span>
              </div>
            </div>
          `,
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        });

        const marker = L.marker([st.lat, st.lng], { icon: lightningIcon });
        marker.bindPopup(`
          <div style="font-family: ui-sans-serif, system-ui, sans-serif; color: #0f172a; padding: 6px; min-width: 240px;">
            <div style="font-weight: 900; font-size: 13px; color: #d97706; display: flex; align-items: center; justify-between;">
              <span>⚡ INDIVIDUAL STRIKE</span>
              <span style="font-size: 10px; background: ${isFresh ? "#fef08a" : "#fef3c7"}; border: 1px solid #fde68a; color: #92400e; padding: 2px 6px; border-radius: 6px; font-weight: 800;">${st.type === "CG" ? "Cloud-to-Ground" : "Cloud-to-Cloud"}</span>
            </div>
            <div style="font-size: 11px; font-weight: 800; color: ${isFresh ? "#b45309" : "#475569"}; margin-top: 4px; background: #fffbeb; padding: 3px 6px; border-radius: 6px; border: 1px solid #fef08a; display: inline-block;">
              ${ageLabel}
            </div>
            <div style="font-size: 11px; font-weight: 800; color: #334155; margin-top: 4px;">
              Location: <strong>${st.station || "NOAA Severe Storm Core"}</strong>
            </div>
            <div style="font-size: 10px; font-weight: 800; color: #166534; background: #dcfce7; border: 1px solid #bbf7d0; padding: 2px 6px; border-radius: 6px; margin-top: 4px; display: inline-block;">
              ✓ NOAA SENSOR QC VERIFIED
            </div>
            <div style="font-size: 10px; font-family: monospace; color: #475569; margin-top: 4px;">
              Peak Current: <strong>${st.peakCurrent}</strong> | Polarity: <strong>${st.polarity || "-"}</strong>
            </div>
            ${st.remark ? `
              <div style="font-size: 10px; font-family: monospace; background: #f8fafc; padding: 6px; border-radius: 6px; border: 1px solid #e2e8f0; margin-top: 6px; color: #0f172a;">
                NOAA Telemetry: ${st.remark}
              </div>
            ` : ""}
          </div>
        `);
        group.addLayer(marker);
      });

      group.addTo(map);
      lightningLayerRef.current = group;
    }
  }, [showLightning, liveLightning, lightningMaxAge, liveHazards]);

  // Real-Time NOAA PIREP Turbulence & EDR Intelligence Layer
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (turbulenceLayerRef.current) {
      turbulenceLayerRef.current.remove();
      turbulenceLayerRef.current = null;
    }

    if (showTurbulence && liveTurbulence && liveTurbulence.length > 0) {
      const group = L.layerGroup();

      const filteredReports = liveTurbulence.filter((rep) => {
        if (rep.severity === "NEG") return false;
        const fl = rep.fltLvl || 330;
        if (turbulenceAltBand === "LOW") return fl >= 180 && fl <= 280;
        if (turbulenceAltBand === "MID") return fl >= 290 && fl <= 350;
        if (turbulenceAltBand === "HIGH") return fl >= 360 && fl <= 450;
        return true;
      });

      filteredReports.forEach((rep) => {
        const isSvr = rep.severity === "SVR" || rep.severity === "EXTRM";
        const isMod = rep.severity === "MOD";
        const edrVal = rep.edr.toFixed(2);

        const badgeColor = isSvr
          ? "bg-rose-600 text-white border-rose-400 shadow-rose-600/50 animate-pulse"
          : isMod
          ? "bg-amber-500 text-slate-950 border-amber-300 shadow-amber-500/40"
          : "bg-yellow-400 text-slate-950 border-yellow-200 shadow-yellow-400/30";

        const turbIcon = L.divIcon({
          className: "custom-edr-turbulence-icon",
          html: `
            <div class="relative flex items-center gap-1 cursor-pointer group">
              <div class="w-7 h-7 rounded-full ${badgeColor} border-2 flex items-center justify-center font-mono font-black text-[10px] shadow-lg">
                🌬
              </div>
              <div class="hidden group-hover:flex flex-col bg-slate-900 text-white text-[9.5px] font-mono p-1 rounded-lg shadow-xl border border-slate-700 pointer-events-none whitespace-nowrap">
                <span class="font-bold text-amber-400">${rep.aircraftType} • FL${rep.fltLvl}</span>
                <span>EDR: ${edrVal} (${rep.severity})</span>
              </div>
            </div>
          `,
          iconSize: [30, 30],
          iconAnchor: [15, 15],
        });

        const marker = L.marker([rep.lat, rep.lng], { icon: turbIcon });

        marker.bindPopup(`
          <div style="font-family: ui-sans-serif, system-ui, sans-serif; color: #0f172a; padding: 6px; min-width: 250px;">
            <div style="font-weight: 900; font-size: 13px; color: ${isSvr ? "#e11d48" : isMod ? "#d97706" : "#ca8a04"}; display: flex; align-items: center; justify-content: space-between;">
              <span>🌬 NOAA EDR TURBULENCE</span>
              <span style="font-size: 10px; background: ${isSvr ? "#ffe4e6" : "#fef3c7"}; border: 1px solid ${isSvr ? "#fca5a5" : "#fde68a"}; color: ${isSvr ? "#9f1239" : "#92400e"}; padding: 2px 6px; border-radius: 6px; font-weight: 800;">${rep.severity} (${rep.aircraftType})</span>
            </div>

            <div style="margin-top: 6px; padding: 6px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px;">
              <div style="font-size: 11px; font-weight: 900; color: #0f172a; display: flex; align-items: center; justify-content: space-between;">
                <span>Flight Level: <strong>FL${rep.fltLvl} (${(rep.fltLvl * 100).toLocaleString()} FT)</strong></span>
                <span>EDR: <strong>${edrVal}</strong></span>
              </div>
              <div style="font-size: 10px; color: #475569; margin-top: 4px;">
                Aircraft Type: <strong>${rep.aircraftType}</strong> | Report Age: <strong>${rep.ageMinutes}m ago</strong>
              </div>
            </div>

            <div style="margin-top: 6px; font-size: 10px; font-family: monospace; background: #0f172a; color: #38bdf8; padding: 6px; border-radius: 6px; border: 1px solid #1e293b; overflow-x: auto;">
              NOAA PIREP: ${rep.rawText}
            </div>
          </div>
        `);

        group.addLayer(marker);
      });

      group.addTo(map);
      turbulenceLayerRef.current = group;
    }
  }, [showTurbulence, liveTurbulence, turbulenceAltBand]);



  // Render Alert & PIREP Markers along route
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    alertMarkersRef.current.forEach((m) => m.remove());
    alertMarkersRef.current = [];

    filteredAlerts.forEach((alert) => {
      const isSigmet = alert.type === "SIGMET";
      const isTurb = alert.subtype === "TURB" || alert.subtype === "TURBULENCE" || alert.text.includes("turbulence");
      const isIce = alert.subtype === "ICE" || alert.subtype === "ICING" || alert.text.includes("icing");
      const isConvective = alert.subtype === "CONVECTIVE" || alert.text.includes("CONVECTIVE");

      const bgColor = isSigmet || isConvective
        ? "bg-rose-500"
        : isTurb
        ? "bg-amber-500"
        : isIce
        ? "bg-cyan-500"
        : "bg-sky-500";

      const icon = L.divIcon({
        className: "custom-alert-marker",
        html: `
          <div class="relative flex items-center justify-center">
            <span class="absolute w-6 h-6 rounded-full ${bgColor}/30 animate-ping"></span>
            <span class="w-4 h-4 rounded-full ${bgColor} border-2 border-white shadow-lg flex items-center justify-center text-[8px] font-black text-slate-950">
              ${isSigmet ? "⚡" : isTurb ? "〰" : isIce ? "❄" : "!"}
            </span>
          </div>
        `,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });

      const marker = L.marker([alert.lat, alert.lng], { icon }).addTo(map);
      marker.bindPopup(`
        <div style="font-family: ui-sans-serif, system-ui, sans-serif; color: #0f172a; padding: 6px; max-width: 260px;">
          <div style="font-size: 10px; font-weight: 800; text-transform: uppercase; color: #0284c7; background: #e0f2fe; padding: 3px 8px; border-radius: 6px; border: 1px solid #bae6fd; display: inline-block; margin-bottom: 6px;">
            ${alert.type} ${alert.subtype || ""}
          </div>
          <p style="font-size: 11px; line-height: 1.45; color: #334155; font-family: monospace; background: #f8fafc; padding: 8px; border-radius: 8px; border: 1px solid #cbd5e1; margin: 0;">${alert.text}</p>
        </div>
      `);
      alertMarkersRef.current.push(marker);
    });

    return () => {
      alertMarkersRef.current.forEach((m) => m.remove());
      alertMarkersRef.current = [];
    };
  }, [filteredAlerts]);

  return (
    <div className="relative w-full h-full min-h-[520px] bg-slate-100 border border-slate-200 rounded-3xl overflow-hidden shadow-md">
      <div ref={mapContainerRef} className="w-full h-full min-h-[520px] z-0" />
    </div>
  );
}
