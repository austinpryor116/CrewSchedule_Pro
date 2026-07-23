"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { LiveSigmetAirmet, getAirportCoords } from "../../lib/weatherService";

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

interface BriefingMapProps {
  depAirport: string;
  arrAirport: string;
  showRadar: boolean;
  showSigmet: boolean;
  showDemoRain: boolean;
  showIfrLow: boolean;
  corridorNm?: number;
  liveHazards?: LiveSigmetAirmet[];
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

export default function BriefingMap({
  depAirport,
  arrAirport,
  showRadar,
  showSigmet,
  showDemoRain,
  showIfrLow,
  corridorNm = 200,
  liveHazards = [],
  filteredAlerts,
}: BriefingMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);

  const radarLayerRef = useRef<L.TileLayer | null>(null);
  const sigmetLayersRef = useRef<L.Polygon[]>([]);
  const routeLayerRef = useRef<L.Polyline | null>(null);
  const corridorLayerRef = useRef<L.Polygon | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const demoRainLayersRef = useRef<L.Layer[]>([]);
  const alertMarkersRef = useRef<L.Marker[]>([]);
  const ifrLowLayerRef = useRef<L.TileLayer | null>(null);

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
    });
    mapRef.current = map;

    L.control.zoom({ position: "topright" }).addTo(map);

    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      maxZoom: 20,
      zIndex: 1,
    }).addTo(map);

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

  // Update Route, Markers, Corridor Buffer, and Map bounds on Airport changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    let isMounted = true;

    async function updateRoute() {
      const depLatLng = await getAirportCoords(depAirport);
      const arrLatLng = await getAirportCoords(arrAirport);

      const activeMap = mapRef.current;
      if (!isMounted || !activeMap) return;

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

      if (!depLatLng || !arrLatLng) return;

      const createAirportIcon = (code: string, type: "DEP" | "ARR") => {
        return L.divIcon({
          className: "custom-airport-icon",
          html: `
            <div class="flex flex-col items-center">
              <span class="px-2 py-0.5 rounded bg-slate-900 border ${type === "DEP" ? "border-emerald-500 text-emerald-400" : "border-cyan-500 text-cyan-400"} text-[10px] font-black tracking-wide shadow-md uppercase whitespace-nowrap">
                ${type}: ${code}
              </span>
              <span class="w-2.5 h-2.5 rounded-full ${type === "DEP" ? "bg-emerald-500 ring-4 ring-emerald-500/20" : "bg-cyan-500 ring-4 ring-cyan-500/20"} border border-slate-950 mt-1 shadow-lg"></span>
            </div>
          `,
          iconSize: [60, 40],
          iconAnchor: [30, 28],
        });
      };

      const depMarker = L.marker(depLatLng, { icon: createAirportIcon(depAirport, "DEP") }).addTo(activeMap);
      const arrMarker = L.marker(arrLatLng, { icon: createAirportIcon(arrAirport, "ARR") }).addTo(activeMap);
      markersRef.current = [depMarker, arrMarker];

      let fitPoints: [number, number][] = [depLatLng, arrLatLng];

      // Draw corridor buffer band if enabled
      if (corridorNm > 0 && corridorNm < 9999) {
        const corridorCoords = computeCorridorCoords(depLatLng, arrLatLng, corridorNm);
        if (corridorCoords.length >= 3) {
          fitPoints = [...fitPoints, ...corridorCoords];
          const corridorPoly = L.polygon(corridorCoords, {
            color: "#818cf8",
            fillColor: "#6366f1",
            fillOpacity: 0.08,
            weight: 1.5,
            dashArray: "6, 6",
          }).addTo(activeMap);
          corridorPoly.bindTooltip(`${corridorNm} NM Route Corridor`, { sticky: true });
          corridorLayerRef.current = corridorPoly;
        }
      }

      const route = L.polyline([depLatLng, arrLatLng], {
        color: "#6366f1",
        weight: 3.5,
        opacity: 0.85,
        dashArray: "10, 8",
      }).addTo(activeMap);
      routeLayerRef.current = route;

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
  }, [depAirport, arrAirport, corridorNm]);

  // Live NEXRAD Radar Overlay
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (radarLayerRef.current) {
      radarLayerRef.current.remove();
      radarLayerRef.current = null;
    }

    if (showRadar) {
      const radar = L.tileLayer.wms("https://mesonet.agron.iastate.edu/cgi-bin/wms/nexrad/n0r.cgi", {
        layers: "nexrad-n0r-900913",
        format: "image/png",
        transparent: true,
        version: "1.1.1",
        opacity: 0.8,
        zIndex: 20,
        attribution: "IEM NEXRAD"
      }).addTo(map);
      radarLayerRef.current = radar;
    }
  }, [showRadar]);

  // FAA IFR Low Enroute Charts Overlay
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (ifrLowLayerRef.current) {
      ifrLowLayerRef.current.remove();
      ifrLowLayerRef.current = null;
    }

    if (showIfrLow) {
      const ifrLow = L.tileLayer("https://tiles.arcgis.com/tiles/ssFJjBXIUyZDrSYZ/arcgis/rest/services/IFR_AreaLow/MapServer/tile/{z}/{y}/{x}.png", {
        attribution: "FAA AIS",
        maxZoom: 18,
        opacity: 0.75,
        zIndex: 10,
      }).addTo(map);
      ifrLowLayerRef.current = ifrLow;
    }
  }, [showIfrLow]);

  // Render SIGMET / AIRMET Polygons
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    let isMounted = true;

    async function drawSigmets() {
      sigmetLayersRef.current.forEach((l) => l.remove());
      sigmetLayersRef.current = [];

      const activeMap = mapRef.current;
      if (!showSigmet || !isMounted || !activeMap) return;

      if (liveHazards && liveHazards.length > 0) {
        liveHazards.forEach((hazard) => {
          if (hazard.coords && hazard.coords.length >= 3) {
            const isConvective = hazard.hazard === "CONVECTIVE";
            const isTurb = hazard.hazard === "TURBULENCE";
            const isIce = hazard.hazard === "ICING";

            const color = isConvective ? "#ef4444" : isTurb ? "#f59e0b" : isIce ? "#06b6d4" : "#a855f7";
            const fillColor = isConvective ? "#dc2626" : isTurb ? "#d97706" : isIce ? "#0891b2" : "#9333ea";

            const poly = L.polygon(hazard.coords, {
              color,
              fillColor,
              fillOpacity: 0.25,
              weight: 2,
              dashArray: "4, 4",
            }).addTo(activeMap);

            poly.bindPopup(`
              <div class="text-xs p-1 font-sans">
                <p class="font-bold text-slate-100">${hazard.title}</p>
                <p class="text-[10px] text-amber-400 font-mono mt-0.5">${hazard.type} • Valid: ${hazard.validUntil}</p>
                <p class="text-slate-300 mt-1">${hazard.decodedSummary}</p>
              </div>
            `);

            sigmetLayersRef.current.push(poly);
          }
        });
      } else {
        const depLatLng = await getAirportCoords(depAirport);
        const arrLatLng = await getAirportCoords(arrAirport);
        if (depLatLng && arrLatLng && isMounted) {
          const midLat = (depLatLng[0] + arrLatLng[0]) / 2;
          const midLng = (depLatLng[1] + arrLatLng[1]) / 2;
          const polygonCoords: [number, number][] = [
            [midLat + 0.7, midLng - 0.95],
            [midLat + 0.8, midLng + 0.95],
            [midLat - 0.7, midLng + 0.95],
            [midLat - 0.8, midLng - 0.95],
          ];
          const sigmet = L.polygon(polygonCoords, {
            color: "#f43f5e",
            fillColor: "#be123c",
            fillOpacity: 0.25,
            weight: 2,
            dashArray: "4, 4",
          }).addTo(activeMap);
          sigmetLayersRef.current.push(sigmet);
        }
      }
    }

    drawSigmets();

    return () => {
      isMounted = false;
      sigmetLayersRef.current.forEach((l) => l.remove());
      sigmetLayersRef.current = [];
    };
  }, [showSigmet, depAirport, arrAirport, liveHazards]);

  // Render Alert & PIREP Markers along route
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    alertMarkersRef.current.forEach((m) => m.remove());
    alertMarkersRef.current = [];

    filteredAlerts.forEach((alert) => {
      const isSigmet = alert.type === "SIGMET";
      const isTurb = alert.subtype === "TURB" || alert.text.includes("turbulence");
      const isIce = alert.subtype === "ICE" || alert.text.includes("icing");
      const isConvective = alert.subtype === "CONVECTIVE" || alert.text.includes("CONVECTIVE");

      const bgColor = isSigmet || isConvective
        ? "bg-rose-500"
        : isTurb
        ? "bg-amber-500"
        : isIce
        ? "bg-cyan-500"
        : "bg-indigo-500";

      const icon = L.divIcon({
        className: "custom-alert-marker",
        html: `
          <div class="relative flex items-center justify-center">
            <span class="absolute w-6 h-6 rounded-full ${bgColor}/30 animate-ping"></span>
            <span class="w-4 h-4 rounded-full ${bgColor} border-2 border-slate-950 shadow-lg flex items-center justify-center text-[8px] font-black text-slate-950">
              ${isSigmet ? "⚡" : isTurb ? "〰" : isIce ? "❄" : "!"}
            </span>
          </div>
        `,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });

      const marker = L.marker([alert.lat, alert.lng], { icon }).addTo(map);
      marker.bindPopup(`
        <div class="text-xs p-1 font-sans max-w-[220px]">
          <span class="px-1.5 py-0.5 text-[9px] font-bold rounded ${bgColor} text-slate-950 uppercase">
            ${alert.type} ${alert.subtype || ""}
          </span>
          <p class="text-slate-200 mt-2 font-mono text-[11px] leading-relaxed">${alert.text}</p>
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
    <div className="relative w-full h-full min-h-[480px] bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
      <div ref={mapContainerRef} className="w-full h-full min-h-[480px] z-0" />
    </div>
  );
}
