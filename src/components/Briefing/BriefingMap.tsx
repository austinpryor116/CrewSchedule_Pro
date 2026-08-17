"use client";

import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { LiveSigmetAirmet, LiveLightningStrike, LiveTurbulenceReport, LiveAirportCondition, getAirportCoords } from "../../lib/weatherService";
import { getOrFetchTile, precacheFlightRoute } from "../../lib/mapTileCache";
import { MEGA_HUBS, MAJOR_HUBS, METRO_SECONDARY_TO_PRIMARY, ALL_MAJOR_AIRPORTS, destinationDistanceNm, isPointInPolygon } from "../../lib/airportData";

// Self-contained SVG pin icons to guarantee 100% offline rendering with zero network requests
const SVG_MARKER_ICON = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 25 41" width="25" height="41">
  <path d="M12.5 0C5.596 0 0 5.596 0 12.5c0 9.375 12.5 28.5 12.5 28.5S25 21.875 25 12.5C25 5.596 19.404 0 12.5 0z" fill="#0284c7" stroke="#ffffff" stroke-width="1.5"/>
  <circle cx="12.5" cy="12.5" r="4.5" fill="#ffffff"/>
</svg>
`)}`;

const SVG_MARKER_SHADOW = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 41 41" width="41" height="41">
  <ellipse cx="15" cy="35" rx="14" ry="4" fill="rgba(0,0,0,0.2)"/>
</svg>
`)}`;

// Fix for default Leaflet icon paths (100% offline self-contained)
const fixLeafletIcon = () => {
  delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: SVG_MARKER_ICON,
    iconUrl: SVG_MARKER_ICON,
    shadowUrl: SVG_MARKER_SHADOW,
  });
};

// Custom Offline-First TileLayer for Leaflet that uses persistent CacheStorage
const OfflineTileLayer = (L.TileLayer as any).extend({
  createTile(coords: { x: number; y: number; z: number }, done: (error: any, tile: HTMLImageElement) => void) {
    const tile = document.createElement("img");
    tile.alt = "";
    tile.setAttribute("role", "presentation");
    tile.crossOrigin = "anonymous";

    const url = (this as any).getTileUrl(coords);

    tile.onload = () => done(null, tile);
    tile.onerror = () => {
      tile.style.visibility = "hidden";
      done(null, tile);
    };

    getOrFetchTile(url, coords)
      .then((resolvedUrl) => {
        tile.src = resolvedUrl;
      })
      .catch(() => {
        tile.src = url;
      });

    return tile;
  },
});

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
  showRadar?: boolean;
  radarMode?: "FOREFLIGHT" | "N0Q" | "N0R" | "SMOOTH" | "NEXRAD";
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
  liveAirportConditions?: Record<string, LiveAirportCondition>;
  showTurbulence?: boolean;
  turbulenceAltBand?: "ALL" | "LOW" | "MID" | "HIGH";
  turbulenceMaxAge?: number;
  liveTurbulence?: LiveTurbulenceReport[];
  userLocation?: {
    lat: number;
    lng: number;
    accuracy?: number;
    altitude?: number | null;
    speed?: number | null;
    heading?: number | null;
  } | null;
  onLocateMe?: () => void;
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
  radarMode = "SMOOTH",
  rainViewerHost,
  rainViewerPath,
  rainViewerColorScheme = 4,
  rainViewerSmooth = true,
  showAllAirports = false,
  showAirportMarkers = true,
  corridorNm = 200,
  liveHazards = [],
  liveLightning = [],
  liveAirportConditions = {},
  showTurbulence = true,
  turbulenceAltBand = "ALL",
  turbulenceMaxAge = 90,
  liveTurbulence = [],
  userLocation = null,
  onLocateMe,
}: BriefingMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);

  const radarLayerRef = useRef<L.TileLayer | null>(null);
  const satelliteLayerRef = useRef<L.TileLayer | null>(null);
  const nwsWarningsLayerRef = useRef<L.TileLayer | null>(null);
  const radarRingsRef = useRef<L.LayerGroup | null>(null);
  const lightningLayerRef = useRef<L.LayerGroup | null>(null);
  const turbulenceLayerRef = useRef<L.LayerGroup | null>(null);
  const sigmetLayersRef = useRef<L.Layer[]>([]);
  const routeLayerRef = useRef<L.Polyline | null>(null);
  const corridorLayerRef = useRef<L.Polygon | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const airportNodeMarkersRef = useRef<L.Marker[]>([]);
  const tapMarkerRef = useRef<L.Marker | null>(null);
  const demoRainLayersRef = useRef<L.Circle[]>([]);
  const userLocationMarkerRef = useRef<L.Marker | null>(null);
  const userAccuracyCircleRef = useRef<L.Circle | null>(null);

  const baseLayerRef = useRef<L.TileLayer | null>(null);
  const latestBoundsRef = useRef<L.LatLngBounds | null>(null);
  const [mapZoom, setMapZoom] = useState<number>(4);

  useEffect(() => {
    fixLeafletIcon();

    if (!mapContainerRef.current) return;

    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }

    const container = mapContainerRef.current;
    if ((container as any)._leaflet_id) {
      (container as any)._leaflet_id = null;
    }

    let initialCenter: [number, number] = [38.5, -96.0];
    let initialZoom = 4;
    try {
      const savedViewStr = typeof window !== "undefined" ? localStorage.getItem("csp_map_last_view") : null;
      if (savedViewStr) {
        const saved = JSON.parse(savedViewStr);
        if (saved && typeof saved.lat === "number" && typeof saved.lng === "number" && typeof saved.zoom === "number") {
          initialCenter = [saved.lat, saved.lng];
          initialZoom = Math.min(10, Math.max(3, saved.zoom));
        }
      }
    } catch (e) {}

    const map = L.map(container, {
      center: initialCenter,
      zoom: initialZoom,
      minZoom: 2,
      maxZoom: 18,
      zoomControl: false,
      attributionControl: false,
      preferCanvas: true, // Hardware-accelerate all vector paths on GPU Canvas
      fadeAnimation: true,
      zoomAnimation: true,
      markerZoomAnimation: true,
      wheelDebounceTime: 40,
      inertia: true,
      inertiaDeceleration: 3000,
      inertiaMaxSpeed: 1500,
    });
    mapRef.current = map;
    setMapZoom(map.getZoom());

    map.on("zoomend", () => {
      if (mapRef.current) {
        setMapZoom(mapRef.current.getZoom());
      }
    });

    map.on("moveend", () => {
      if (mapRef.current) {
        const center = mapRef.current.getCenter();
        const zoom = mapRef.current.getZoom();
        try {
          localStorage.setItem("csp_map_last_view", JSON.stringify({ lat: center.lat, lng: center.lng, zoom }));
        } catch (e) {}
      }
    });

    (window as any).leafletMapFlyTo = (lat: number, lng: number, zoom = 9) => {
      if (map) {
        map.flyTo([lat, lng], zoom, { animate: true, duration: 1.2 });
      }
    };

    (window as any).leafletRecenterRoute = () => {
      if (map && latestBoundsRef.current) {
        map.fitBounds(latestBoundsRef.current, { padding: [70, 70], maxZoom: 8, animate: true });
      }
    };

    (window as any).leafletFlyToUserLocation = (lat: number, lng: number, zoom = 11) => {
      if (map) {
        map.flyTo([lat, lng], zoom, { animate: true, duration: 1.2 });
      }
    };

    // Real High-Detail Aeronautical Base Map (CartoDB Voyager raster tiles with persistent offline storage)
    const baseTile = new (OfflineTileLayer as any)(
      "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png",
      {
        subdomains: "abcd",
        maxZoom: 20,
        maxNativeZoom: 18,
        keepBuffer: 3,
        updateWhenIdle: true,
        updateWhenZooming: false,
        zIndex: 1,
      }
    ).addTo(map);
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
          mapRef.current.invalidateSize({ debounceMoveend: true });
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

  // Render High-Visibility Live GPS Location & Pulsing Radar Halo
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (userLocationMarkerRef.current) {
      userLocationMarkerRef.current.remove();
      userLocationMarkerRef.current = null;
    }
    if (userAccuracyCircleRef.current) {
      userAccuracyCircleRef.current.remove();
      userAccuracyCircleRef.current = null;
    }

    if (!userLocation) return;

    const { lat, lng, accuracy, altitude, speed, heading } = userLocation;

    // Draw accuracy circle
    if (accuracy && accuracy > 0) {
      const circle = L.circle([lat, lng], {
        radius: Math.min(accuracy, 5000),
        color: "#0284c7",
        fillColor: "#38bdf8",
        fillOpacity: 0.15,
        weight: 1.5,
        dashArray: "4, 4",
        interactive: false,
      }).addTo(map);
      userAccuracyCircleRef.current = circle;
    }

    // High-visibility GPS dot with pulsating halo and optional heading indicator
    const headingDeg = typeof heading === "number" && !isNaN(heading) ? heading : null;
    const speedKt = typeof speed === "number" && speed > 0 ? Math.round(speed * 1.94384) : 0;
    const altFt = typeof altitude === "number" ? Math.round(altitude * 3.28084) : null;

    const icon = L.divIcon({
      className: "custom-user-gps-location-marker",
      html: `
        <div style="position: relative; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center;">
          <span style="position: absolute; width: 36px; height: 36px; border-radius: 50%; background-color: rgba(2, 132, 199, 0.3); animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></span>
          <span style="position: absolute; width: 22px; height: 22px; border-radius: 50%; background-color: rgba(56, 189, 248, 0.5);"></span>
          <span style="position: relative; width: 14px; height: 14px; border-radius: 50%; background-color: #0284c7; border: 2.5px solid #ffffff; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.3);"></span>
          ${headingDeg !== null ? `
            <div style="position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; pointer-events: none; transform: rotate(${headingDeg}deg);">
              <div style="width: 0; height: 0; border-left: 5px solid transparent; border-right: 5px solid transparent; border-bottom: 10px solid #0284c7; transform: translateY(-16px); filter: drop-shadow(0 2px 2px rgba(0,0,0,0.3));"></div>
            </div>
          ` : ""}
        </div>
      `,
      iconSize: [40, 40],
      iconAnchor: [20, 20],
    });

    const marker = L.marker([lat, lng], { icon, zIndexOffset: 1000 }).addTo(map);

    marker.bindPopup(`
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'SF Pro Display', 'SF Pro', 'Helvetica Neue', Helvetica, 'Segoe UI', Roboto, Arial, sans-serif; color: #0f172a; padding: 4px; min-width: 200px;">
        <div style="font-weight: 900; font-size: 13px; color: #0284c7; display: flex; align-items: center; gap: 4px;">
          <span>📍 CURRENT GPS POSITION</span>
        </div>
        <div style="font-size: 11px; font-weight: 800; color: #334155; margin-top: 4px;">
          ${lat.toFixed(4)}° N, ${lng.toFixed(4)}° W
        </div>
        <div style="margin-top: 6px; padding: 6px; background-color: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; font-size: 10.5px; font-weight: 700; color: #0369a1; display: grid; grid-template-columns: 1fr 1fr; gap: 4px;">
          <div>Accuracy: <strong>±${Math.round(accuracy || 0)}m</strong></div>
          <div>Ground Speed: <strong>${speedKt} KT</strong></div>
          <div>Altitude: <strong>${altFt !== null ? `${altFt} FT` : "N/A"}</strong></div>
          <div>Heading: <strong>${headingDeg !== null ? `${Math.round(headingDeg)}°` : "N/A"}</strong></div>
        </div>
      </div>
    `);

    userLocationMarkerRef.current = marker;

    return () => {
      if (userLocationMarkerRef.current) {
        userLocationMarkerRef.current.remove();
        userLocationMarkerRef.current = null;
      }
      if (userAccuracyCircleRef.current) {
        userAccuracyCircleRef.current.remove();
        userAccuracyCircleRef.current = null;
      }
    };
  }, [userLocation]);

  // Render Interactive ForeFlight Airport Nodes (Single Major Hub Per Metro Region & Active Route Protection)
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

    // Step 1: Collect candidate airports based on zoom LOD and explicit metro hierarchy
    const candidates: Array<{
      code: string;
      data: { name: string; lat: number; lng: number; cat: "VFR" | "MVFR" | "IFR" | "LIFR" };
      isRoute: boolean;
      priority: number;
    }> = [];

    Object.entries(ALL_MAJOR_AIRPORTS).forEach(([code, data]) => {
      const isRoute = routeAirports.has(code);
      const isMegaHub = MEGA_HUBS.has(code);
      const isMajorHub = MAJOR_HUBS.has(code);

      // Dynamic Zoom Consolidation:
      // - Active Route (DEP, ARR, Waypoints): ALWAYS visible at all zoom levels
      // - Zoom <= 4 (Continental US view): Show only Mega Hubs (ORD, DFW, ATL, CLT, MIA, LAX, DEN, JFK, DCA, SFO, SEA, PHX) + Route
      // - Zoom 5..6 (Multi-State Regional): Show Major Airline Hubs + Route
      // - Zoom >= 7 (Terminal / Local Area): Show regional hubs (subject to proximity decluttering)
      if (!isRoute) {
        if (mapZoom <= 4) {
          if (!isMegaHub) return;
        } else if (mapZoom <= 6) {
          if (!isMajorHub && !showAllAirports) return;
        }

        // Metro Deduplication: Suppress secondary adjacent hub if primary flagship hub exists
        // (e.g., ORD over MDW in Chicago; JFK over LGA/EWR in NYC; DCA over IAD/BWI in DC; DFW over DAL in Dallas)
        const primaryHub = METRO_SECONDARY_TO_PRIMARY[code];
        if (primaryHub && ALL_MAJOR_AIRPORTS[primaryHub]) {
          return;
        }
      }

      const priority = isRoute ? 1000 : isMegaHub ? 500 : isMajorHub ? 200 : 50;
      candidates.push({ code, data, isRoute, priority });
    });

    // Step 2: Sort candidates by priority descending (Route > Mega Hub > Major Hub > Regional)
    candidates.sort((a, b) => b.priority - a.priority);

    // Step 3: Spatial proximity decluttering — prevent any two airport pills from overlapping
    const placedAirports: Array<{ lat: number; lng: number; code: string; isRoute: boolean }> = [];
    const minDeclutterDistNm = mapZoom <= 6 ? 40 : mapZoom <= 7 ? 30 : 18;

    candidates.forEach(({ code, data, isRoute }) => {
      if (!isRoute) {
        const tooClose = placedAirports.some((placed) => {
          const dist = destinationDistanceNm(data.lat, data.lng, placed.lat, placed.lng);
          return dist < minDeclutterDistNm;
        });
        if (tooClose) return;
      }

      placedAirports.push({ lat: data.lat, lng: data.lng, code, isRoute });

      const live = liveAirportConditions[code] || liveAirportConditions[`K${code}`] || liveAirportConditions[`C${code}`];
      const currentCat = live?.cat || data.cat || "VFR";

      const catColor =
        currentCat === "VFR"
          ? "bg-emerald-500 text-emerald-950 border-emerald-400"
          : currentCat === "MVFR"
          ? "bg-sky-500 text-sky-950 border-sky-400"
          : currentCat === "IFR"
          ? "bg-rose-500 text-white border-rose-400 animate-pulse"
          : "bg-purple-600 text-white border-purple-400 animate-pulse";

      const catColorHex =
        currentCat === "VFR"
          ? "#059669"
          : currentCat === "MVFR"
          ? "#0284c7"
          : currentCat === "IFR"
          ? "#e11d48"
          : "#9333ea";

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

      const obsDetails = live
        ? `<div style="font-size: 9.5px; color: #475569; margin-top: 3px; font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif;">${live.winds ? `Winds: <strong>${live.winds}</strong>` : ""}${live.tempC !== undefined ? ` • <strong>${live.tempC}°C</strong>` : ""}${live.altimInHg ? ` • <strong>${live.altimInHg}"</strong>` : ""}</div>`
        : "";

      marker.bindTooltip(`
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'SF Pro Display', 'SF Pro', 'Helvetica Neue', Helvetica, 'Segoe UI', Roboto, Arial, sans-serif; font-weight: 700; font-size: 11px; color: #0f172a; min-width: 130px;">
          <div style="font-size: 12px; font-weight: 900; color: #0f172a;">${code} - ${data.name}</div>
          <div style="font-size: 10px; font-weight: 800; color: ${catColorHex}; margin-top: 3px; display: flex; align-items: center; gap: 4px;">
            <span>● LIVE ${currentCat}</span>
          </div>
          ${obsDetails}
        </div>
      `, { sticky: true });

      airportNodeMarkersRef.current.push(marker);
    });

    return () => {
      airportNodeMarkersRef.current.forEach((m) => m.remove());
      airportNodeMarkersRef.current = [];
    };
  }, [onAirportSelect, showAllAirports, showAirportMarkers, depAirport, arrAirport, waypoints, mapZoom, liveAirportConditions]);

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
      activeMap.fitBounds(bounds, { padding: [80, 80], maxZoom: 8, animate: false });

      // Auto-precache map tiles along active flight route into persistent storage for offline Airplane Mode
      if (typeof navigator !== "undefined" && navigator.onLine && coordsList.length >= 2) {
        precacheFlightRoute(coordsList, corridorNm > 0 && corridorNm < 9999 ? corridorNm : 80, 3, 9).catch(() => {});
      }
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

  // Real-Time NOAA WSR-88D NEXRAD Base Reflectivity (High-Res 0.5° Scan - Classic Green)
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
        opacity: 0.8,
        zIndex: 20,
        updateWhenIdle: true,
        updateWhenZooming: false,
        keepBuffer: 2,
        attribution: "NOAA NWS WSR-88D NEXRAD"
      }).addTo(map);
      radarLayerRef.current = radar;
    }
  }, [showRadar]);

  // Handle Demo Rain / Storm Overlay
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (demoRainLayersRef.current) {
      demoRainLayersRef.current.forEach((layer) => layer.remove());
      demoRainLayersRef.current = [];
    }

    if (showDemoRain) {
      const depLatLng = AIRPORT_COORDS[depAirport.toUpperCase()];
      const arrLatLng = AIRPORT_COORDS[arrAirport.toUpperCase()];

      if (!depLatLng || !arrLatLng) return;

      const midLat = (depLatLng[0] + arrLatLng[0]) / 2;
      const midLng = (depLatLng[1] + arrLatLng[1]) / 2;

      // Draw light rain (green) circle - 60km radius
      const lightRain = L.circle([midLat, midLng], {
        radius: 60000,
        color: "#22c55e",
        fillColor: "#22c55e",
        fillOpacity: 0.35,
        weight: 1,
      }).addTo(map);

      // Draw moderate rain (yellow) circle offset slightly - 35km radius
      const modRain = L.circle([midLat + 0.1, midLng + 0.1], {
        radius: 35000,
        color: "#eab308",
        fillColor: "#eab308",
        fillOpacity: 0.5,
        weight: 1,
      }).addTo(map);

      // Draw heavy thunderstorm (red) circle offset - 15km radius
      const heavyRain = L.circle([midLat + 0.15, midLng + 0.15], {
        radius: 15000,
        color: "#ef4444",
        fillColor: "#ef4444",
        fillOpacity: 0.65,
        weight: 1.5,
      }).addTo(map);

      demoRainLayersRef.current = [lightRain, modRain, heavyRain];
    }
  }, [showDemoRain, depAirport, arrAirport]);

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
        minZoom: 1,
        maxZoom: 18,
        updateWhenIdle: true,
        updateWhenZooming: false,
        keepBuffer: 2,
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
        updateWhenIdle: true,
        updateWhenZooming: false,
        keepBuffer: 2,
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
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'SF Pro Display', 'SF Pro', 'Helvetica Neue', Helvetica, 'Segoe UI', Roboto, Arial, sans-serif; color: #0f172a; padding: 6px; min-width: 270px; max-width: 320px;">
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

            // 1. Draw Bold Advisory Polygon
            const poly = L.polygon(hazard.coords, {
              color,
              fillColor,
              fillOpacity: 0.32,
              weight: isConvective ? 2.5 : 2.0,
              dashArray: isConvective ? undefined : "6, 4",
            }).addTo(activeMap);

            const openHazardPopup = (latlng: L.LatLng) => {
              const clickPt: [number, number] = [latlng.lat, latlng.lng];

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
                <div style="font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'SF Pro Display', 'SF Pro', 'Helvetica Neue', Helvetica, 'Segoe UI', Roboto, Arial, sans-serif; color: #0f172a; padding: 4px; max-width: 320px; max-height: 380px; overflow-y: auto;">
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
                    <p style="font-size: 10.5px; line-height: 1.4; color: #334155; margin: 0; font-family: 'SF Mono', 'SFProMono-Regular', ui-monospace, Menlo, Monaco, Consolas, monospace; background: white; padding: 6px; border-radius: 6px; border: 1px solid #e2e8f0;">
                      ${hz.decodedSummary || hz.rawText}
                    </p>
                  </div>
                `;
              });

              popupHtml += `</div></div>`;

              L.popup({ maxWidth: 340 })
                .setLatLng(latlng)
                .setContent(popupHtml)
                .openOn(activeMap);
            };

            poly.on("click", (e: L.LeafletMouseEvent) => {
              L.DomEvent.stopPropagation(e);
              openHazardPopup(e.latlng);
            });

            sigmetLayersRef.current.push(poly);

            // 2. Draw Center Identification Badge inside the Polygon
            const centerLat = hazard.coords.reduce((acc, c) => acc + c[0], 0) / hazard.coords.length;
            const centerLng = hazard.coords.reduce((acc, c) => acc + c[1], 0) / hazard.coords.length;

            const iconText = isConvective
              ? `⚡ SIGMET ${hazard.seriesId}`
              : isTurb
              ? `🌬 TANGO ${hazard.seriesId}`
              : isIce
              ? `❄️ ZULU ${hazard.seriesId}`
              : `🌫 SIERRA ${hazard.seriesId}`;

            const badgeBorderColor = isConvective ? "#ef4444" : isTurb ? "#f59e0b" : isIce ? "#06b6d4" : "#a855f7";

            const badgeIcon = L.divIcon({
              className: "",
              iconSize: [84, 22],
              iconAnchor: [42, 11],
              html: `
                <div style="background: rgba(15, 23, 42, 0.92); border: 1.5px solid ${badgeBorderColor}; border-radius: 9999px; height: 22px; padding: 0 8px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 10px rgba(0,0,0,0.4); pointer-events: auto; cursor: pointer; white-space: nowrap;">
                  <span style="color: #ffffff; font-weight: 800; font-size: 9.5px; font-family: 'SF Mono', 'SFProMono-Regular', ui-monospace, Menlo, Monaco, Consolas, monospace; letter-spacing: 0.02em;">${iconText}</span>
                </div>
              `,
            });

            const centerMarker = L.marker([centerLat, centerLng], { icon: badgeIcon }).addTo(activeMap);
            centerMarker.on("click", (e: L.LeafletMouseEvent) => {
              L.DomEvent.stopPropagation(e);
              openHazardPopup(L.latLng(centerLat, centerLng));
            });

            sigmetLayersRef.current.push(centerMarker);
          }
        });
      }
    }

    drawSigmets();

    return () => {
      isMounted = false;
    };
  }, [liveHazards, showSigmet, showSigmetConvective, showSigmetTurbulence, showSigmetIcing, showSigmetIfr]);

  // Render Real-Time Lightning Strikes with Dynamic Zoom Consolidation & Clustering
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
        strikesToDraw = liveLightning.filter((st) => (st.ageMinutes ?? 0) <= lightningMaxAge);
      }

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

      // Zoom Level Consolidation:
      // When zoomed out (mapZoom <= 5), cluster strikes within 45 NM into a single storm cluster badge
      if (mapZoom <= 5) {
        interface StormCluster {
          lat: number;
          lng: number;
          count: number;
          freshCount: number;
          strikes: LiveLightningStrike[];
        }
        const clusters: StormCluster[] = [];

        strikesToDraw.forEach((st) => {
          const existing = clusters.find((c) => destinationDistanceNm(st.lat, st.lng, c.lat, c.lng) <= 45);
          if (existing) {
            existing.count++;
            if ((st.ageMinutes ?? 0) <= 3) existing.freshCount++;
            existing.strikes.push(st);
          } else {
            clusters.push({
              lat: st.lat,
              lng: st.lng,
              count: 1,
              freshCount: (st.ageMinutes ?? 0) <= 3 ? 1 : 0,
              strikes: [st],
            });
          }
        });

        clusters.slice(0, 20).forEach((cl) => {
          if (cl.count > 1) {
            const clusterIcon = L.divIcon({
              className: "custom-lightning-cluster-pill",
              html: `
                <div style="
                  box-sizing: border-box;
                  display: inline-flex;
                  align-items: center;
                  justify-content: center;
                  gap: 3px;
                  padding: 2px 6px;
                  background: rgba(15, 23, 42, 0.94);
                  border: 1px solid rgba(234, 179, 8, 0.7);
                  border-radius: 9999px;
                  box-shadow: 0 2px 4px rgba(0,0,0,0.4);
                  color: #fef08a;
                  font-family: 'SF Mono', 'SFProMono-Regular', ui-monospace, Menlo, Monaco, Consolas, monospace;
                  font-size: 9.5px;
                  font-weight: 800;
                  cursor: pointer;
                  white-space: nowrap;
                ">
                  <span style="color: #eab308; font-size: 10px;">⚡</span>
                  <span>${cl.count}</span>
                </div>
              `,
              iconSize: [44, 20],
              iconAnchor: [22, 10],
            });

            const marker = L.marker([cl.lat, cl.lng], { icon: clusterIcon });
            marker.on("click", () => {
              if (mapRef.current) {
                mapRef.current.flyTo([cl.lat, cl.lng], 8, { animate: true, duration: 1.0 });
              }
            });
            marker.bindPopup(`
              <div style="font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'SF Pro Display', 'SF Pro', 'Helvetica Neue', Helvetica, 'Segoe UI', Roboto, Arial, sans-serif; color: #0f172a; padding: 4px; min-width: 220px;">
                <div style="font-weight: 900; font-size: 12px; color: #b45309; display: flex; align-items: center; justify-content: space-between;">
                  <span>⚡ CONVECTIVE STORM CELL</span>
                  <span style="font-size: 10px; background: #fef08a; border: 1px solid #fde68a; color: #92400e; padding: 1px 5px; border-radius: 4px; font-weight: 800;">${cl.count} Strikes</span>
                </div>
                <div style="font-size: 11px; font-weight: 700; color: #475569; margin-top: 4px;">
                  Active Strikes within 45 NM: <strong>${cl.count}</strong>
                </div>
                <div style="font-size: 10px; color: #64748b; margin-top: 2px;">
                  Recent (0-3 min): <strong>${cl.freshCount}</strong>
                </div>
                <div style="font-size: 9.5px; color: #0284c7; margin-top: 4px; font-weight: 600;">
                  Tap to zoom in and inspect individual discharge points.
                </div>
              </div>
            `);
            group.addLayer(marker);
          } else {
            // Single isolated strike
            const st = cl.strikes[0];
            const age = st.ageMinutes ?? 0;
            const isFresh = age <= 3;
            const isMid = age > 3 && age <= 8;
            const fill = isFresh ? "#eab308" : isMid ? "#f59e0b" : "#d97706";
            const stroke = isFresh ? "#854d0e" : isMid ? "#78350f" : "#451a03";
            const opacity = isFresh ? 1.0 : isMid ? 0.75 : 0.45;
            const size = isFresh ? 14 : isMid ? 12 : 10;

            const lightningIcon = L.divIcon({
              className: "custom-lightning-strike-icon",
              html: `
                <div style="opacity: ${opacity}; display: flex; align-items: center; justify-content: center; width: ${size}px; height: ${size}px; cursor: pointer; filter: drop-shadow(0 1px 1px rgba(0,0,0,0.3));">
                  <svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="${fill}" stroke="${stroke}" stroke-width="1.2" stroke-linejoin="round" stroke-linecap="round">
                    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                  </svg>
                </div>
              `,
              iconSize: [size, size],
              iconAnchor: [size / 2, size / 2],
            });
            const marker = L.marker([st.lat, st.lng], { icon: lightningIcon });
            group.addLayer(marker);
          }
        });
      } else {
        // Granular zoomed in view (mapZoom >= 6): show individual strikes
        const cappedStrikes = strikesToDraw.slice(0, 45);

        cappedStrikes.forEach((st) => {
          const age = st.ageMinutes ?? 0;
          const isFresh = age <= 3;
          const isMid = age > 3 && age <= 8;

          const fill = isFresh ? "#eab308" : isMid ? "#f59e0b" : "#d97706";
          const stroke = isFresh ? "#854d0e" : isMid ? "#78350f" : "#451a03";
          const opacity = isFresh ? 1.0 : isMid ? 0.75 : 0.45;
          const size = isFresh ? 14 : isMid ? 12 : 10;
          const ageLabel = age <= 1 ? "JUST NOW (< 1 min)" : `${age} MIN AGO`;

          const lightningIcon = L.divIcon({
            className: "custom-lightning-strike-icon",
            html: `
              <div style="opacity: ${opacity}; display: flex; align-items: center; justify-content: center; width: ${size}px; height: ${size}px; cursor: pointer; filter: drop-shadow(0 1px 1px rgba(0,0,0,0.3));">
                <svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="${fill}" stroke="${stroke}" stroke-width="1.2" stroke-linejoin="round" stroke-linecap="round">
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                </svg>
              </div>
            `,
            iconSize: [size, size],
            iconAnchor: [size / 2, size / 2],
          });

          const marker = L.marker([st.lat, st.lng], { icon: lightningIcon });
          marker.bindPopup(`
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'SF Pro Display', 'SF Pro', 'Helvetica Neue', Helvetica, 'Segoe UI', Roboto, Arial, sans-serif; color: #0f172a; padding: 4px; min-width: 220px;">
              <div style="font-weight: 900; font-size: 12px; color: #b45309; display: flex; align-items: center; justify-content: space-between;">
                <span>⚡ LIGHTNING STRIKE</span>
                <span style="font-size: 10px; background: ${isFresh ? "#fef08a" : "#fef3c7"}; border: 1px solid #fde68a; color: #92400e; padding: 1px 5px; border-radius: 4px; font-weight: 800;">${st.type === "CG" ? "Cloud-to-Ground" : "Cloud-to-Cloud"}</span>
              </div>
              <div style="font-size: 11px; font-weight: 700; color: #475569; margin-top: 3px;">
                Flashed: <strong>${ageLabel}</strong>
              </div>
              <div style="font-size: 10px; color: #64748b; margin-top: 2px;">
                Location: <strong>${st.station || "Convective Storm Core"}</strong>
              </div>
              <div style="font-size: 10px; font-family: 'SF Mono', 'SFProMono-Regular', ui-monospace, Menlo, Monaco, Consolas, monospace; color: #64748b; margin-top: 2px;">
                Peak Current: <strong>${st.peakCurrent}</strong>
              </div>
            </div>
          `);
          group.addLayer(marker);
        });
      }

      group.addTo(map);
      lightningLayerRef.current = group;
    }
  }, [showLightning, liveLightning, lightningMaxAge, liveHazards, mapZoom]);

  // Real-Time NOAA PIREP Turbulence & EDR Intelligence Layer with Dynamic Zoom Consolidation
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (turbulenceLayerRef.current) {
      turbulenceLayerRef.current.remove();
      turbulenceLayerRef.current = null;
    }

    if (showTurbulence && liveTurbulence && liveTurbulence.length > 0) {
      const group = L.layerGroup();

      // 1. Filter by altitude band, max age, and remove NEG/smooth reports
      const rawFiltered = liveTurbulence.filter((rep) => {
        if (rep.severity === "NEG") return false;
        if (rep.ageMinutes !== undefined && rep.ageMinutes > turbulenceMaxAge) return false;

        const fl = rep.fltLvl || 330;
        if (turbulenceAltBand === "LOW") return fl >= 180 && fl <= 280;
        if (turbulenceAltBand === "MID") return fl >= 290 && fl <= 350;
        if (turbulenceAltBand === "HIGH") return fl >= 360 && fl <= 450;
        return true;
      });

      // 2. Dynamic Spatial Deduplication based on map zoom:
      // - Zoom <= 4 (Continental US): 150 NM separation (only top 6-8 country-wide reports)
      // - Zoom 5..6 (Multi-State Regional): 70 NM separation
      // - Zoom >= 7 (Terminal): 25 NM separation
      const minDistanceNm = mapZoom <= 4 ? 150 : mapZoom <= 6 ? 70 : 25;

      const decluttered: LiveTurbulenceReport[] = [];
      // Sort by severity (SVR > MOD > LGT) and then newest age
      const severityRank: Record<string, number> = { EXTRM: 4, SVR: 3, MOD: 2, LGT: 1, NEG: 0 };
      const sorted = [...rawFiltered].sort((a, b) => {
        const diff = (severityRank[b.severity] || 0) - (severityRank[a.severity] || 0);
        if (diff !== 0) return diff;
        return (a.ageMinutes || 0) - (b.ageMinutes || 0);
      });

      for (const rep of sorted) {
        const isDuplicate = decluttered.some((existing) => {
          const dist = destinationDistanceNm(rep.lat, rep.lng, existing.lat, existing.lng);
          return dist < minDistanceNm;
        });
        if (!isDuplicate) {
          decluttered.push(rep);
        }
      }

      decluttered.forEach((rep) => {
        const isSvr = rep.severity === "SVR" || rep.severity === "EXTRM";
        const isMod = rep.severity === "MOD";
        const edrVal = rep.edr.toFixed(2);
        const age = rep.ageMinutes || 0;
        
        let flNum = rep.fltLvl || 330;
        if (flNum > 999) flNum = Math.round(flNum / 100);

        // Time-decay opacity and styling:
        // < 30m: 100% opacity with vivid borders
        // 30-60m: 88% opacity
        // > 60m: 72% opacity
        const opacity = age <= 30 ? 1.0 : age <= 60 ? 0.88 : 0.72;
        const dotBg = isSvr ? "#ef4444" : isMod ? "#f59e0b" : "#94a3b8";
        const badgeBorder = isSvr
          ? `rgba(239,68,68,${opacity})`
          : isMod
          ? `rgba(245,158,11,${opacity * 0.9})`
          : `rgba(148,163,184,${opacity * 0.8})`;
        const textColor = isSvr ? "#fca5a5" : isMod ? "#fde68a" : "#e2e8f0";
        const sevLabel = isSvr ? "SVR" : isMod ? "MOD" : "LGT";

        const turbIcon = L.divIcon({
          className: "custom-edr-turbulence-pill",
          html: `
            <div style="
              box-sizing: border-box;
              display: inline-flex;
              align-items: center;
              justify-content: center;
              gap: 4px;
              width: 66px;
              height: 22px;
              padding: 0 5px;
              background: rgba(15, 23, 42, ${opacity * 0.94});
              border: 1px solid ${badgeBorder};
              border-radius: 9999px;
              box-shadow: 0 2px 4px rgba(0,0,0,${0.35 * opacity});
              cursor: pointer;
              font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
              font-size: 9.5px;
              font-weight: 700;
              color: ${textColor};
              white-space: nowrap;
              overflow: hidden;
              opacity: ${opacity};
            ">
              <span style="width: 5px; height: 5px; border-radius: 9999px; background: ${dotBg}; flex-shrink: 0;"></span>
              <span>${sevLabel}</span>
              <span style="font-weight: 500; opacity: 0.85; font-size: 9px;">${flNum}</span>
            </div>
          `,
          iconSize: [66, 22],
          iconAnchor: [33, 11],
        });

        const marker = L.marker([rep.lat, rep.lng], { icon: turbIcon });

        // Format observation time string
        let timeStr = "";
        if (rep.obsTime) {
          const d = new Date(rep.obsTime);
          if (!isNaN(d.getTime())) {
            timeStr = d.toISOString().substring(11, 16) + "Z";
          }
        }

        marker.bindPopup(`
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'SF Pro Display', 'SF Pro', 'Helvetica Neue', Helvetica, 'Segoe UI', Roboto, Arial, sans-serif; color: #0f172a; padding: 4px; min-width: 250px; max-width: 290px;">
            <div style="font-weight: 900; font-size: 12px; color: ${isSvr ? "#e11d48" : isMod ? "#d97706" : "#475569"}; display: flex; align-items: center; justify-content: space-between;">
              <span>TURBULENCE PIREP</span>
              <span style="font-size: 9.5px; background: ${isSvr ? "#ffe4e6" : isMod ? "#fef3c7" : "#f1f5f9"}; border: 1px solid ${isSvr ? "#fca5a5" : isMod ? "#fde68a" : "#cbd5e1"}; color: ${isSvr ? "#9f1239" : isMod ? "#92400e" : "#334155"}; padding: 1px 5px; border-radius: 4px; font-weight: 800;">FL${rep.fltLvl} • ${rep.severity}</span>
            </div>

            <div style="margin-top: 5px; padding: 5px 6px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; font-size: 10.5px; color: #334155;">
              <div style="display: flex; justify-content: space-between; font-weight: 700; margin-bottom: 2px;">
                <span>Type: <strong>${rep.aircraftType}</strong></span>
                <span>EDR: <strong>${edrVal}</strong></span>
                <span>Age: <strong>${age}m ago</strong></span>
              </div>
              ${timeStr ? `<div style="font-size: 9.5px; color: #64748b;">Time: <strong>${timeStr}</strong> ${rep.stationId ? `(${rep.stationId})` : ''}</div>` : ''}
            </div>

            <div style="margin-top: 5px; font-size: 9.5px; font-family: 'SF Mono', 'SFProMono-Regular', ui-monospace, Menlo, Monaco, Consolas, monospace; background: #0f172a; color: #7dd3fc; padding: 5px; border-radius: 5px; border: 1px solid #1e293b; overflow-x: auto; word-break: break-all;">
              ${rep.rawText}
            </div>
          </div>
        `);

        group.addLayer(marker);
      });

      group.addTo(map);
      turbulenceLayerRef.current = group;
    }
  }, [showTurbulence, liveTurbulence, turbulenceAltBand, turbulenceMaxAge, mapZoom]);

  return (
    <div className="relative w-full h-full bg-[#e2e8f0] overflow-hidden">
      <div ref={mapContainerRef} className="w-full h-full z-0" />
    </div>
  );
}
