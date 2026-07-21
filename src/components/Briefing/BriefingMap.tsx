"use client";

import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix for default Leaflet icon paths
const fixLeafletIcon = () => {
  // @ts-ignore
  delete L.Icon.Default.prototype._getIconUrl;
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
  filteredAlerts: any[];
}

export default function BriefingMap({
  depAirport,
  arrAirport,
  showRadar,
  showSigmet,
  showDemoRain,
  showIfrLow,
  filteredAlerts,
}: BriefingMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);

  // References to active layers for dynamic toggling
  const radarLayerRef = useRef<L.TileLayer | null>(null);
  const sigmetLayerRef = useRef<L.Polygon | null>(null);
  const routeLayerRef = useRef<L.Polyline | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const demoRainLayersRef = useRef<L.Layer[]>([]);
  const alertMarkersRef = useRef<L.Marker[]>([]);
  const ifrLowLayerRef = useRef<L.TileLayer | null>(null);

  useEffect(() => {
    fixLeafletIcon();

    if (!mapContainerRef.current) return;

    // Initialize map with a scale allowing full view of the US
    const defaultCenter: [number, number] = [39.8283, -98.5795]; // Center of US
    const map = L.map(mapContainerRef.current, {
      center: defaultCenter,
      zoom: 4,
      minZoom: 2,
      maxZoom: 18,
      zoomControl: false,
    });
    mapRef.current = map;

    // Add scale and custom zoom control
    L.control.zoom({ position: "topright" }).addTo(map);

    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      maxZoom: 20,
      zIndex: 1,
    }).addTo(map);

    // Watch for size changes to invalidate Leaflet size
    const resizeObserver = new ResizeObserver(() => {
      // Use requestAnimationFrame to defer call until display state has resolved in the browser
      requestAnimationFrame(() => {
        if (mapRef.current) {
          mapRef.current.invalidateSize();
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

  // Update Route, Markers, and Map bounds on Airport changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Remove existing markers & route
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];
    if (routeLayerRef.current) {
      routeLayerRef.current.remove();
      routeLayerRef.current = null;
    }

    const depLatLng = AIRPORT_COORDS[depAirport.toUpperCase()];
    const arrLatLng = AIRPORT_COORDS[arrAirport.toUpperCase()];

    if (!depLatLng || !arrLatLng) return;

    // Create custom airport labels
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

    // Add markers
    const depMarker = L.marker(depLatLng, { icon: createAirportIcon(depAirport, "DEP") }).addTo(map);
    const arrMarker = L.marker(arrLatLng, { icon: createAirportIcon(arrAirport, "ARR") }).addTo(map);
    markersRef.current = [depMarker, arrMarker];

    // Draw route line
    const route = L.polyline([depLatLng, arrLatLng], {
      color: "#6366f1", // indigo-500
      weight: 3.5,
      opacity: 0.85,
      dashArray: "10, 8",
    }).addTo(map);
    routeLayerRef.current = route;

    // Fit bounds to fit route nicely
    const bounds = L.latLngBounds([depLatLng, arrLatLng]);
    map.fitBounds(bounds, { padding: [80, 80] });
  }, [depAirport, arrAirport]);

  // Handle Live Precipitation Radar (Iowa State University IEM NEXRAD WMS Layer)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (radarLayerRef.current) {
      radarLayerRef.current.remove();
      radarLayerRef.current = null;
    }

    if (showRadar) {
      // IEM NEXRAD WMS service - 100% reliable, zero CORS issues, instant loading
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

  // Handle FAA IFR Low Enroute Charts Overlay
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (ifrLowLayerRef.current) {
      ifrLowLayerRef.current.remove();
      ifrLowLayerRef.current = null;
    }

    if (showIfrLow) {
      const ifrLow = L.tileLayer("https://tiles.arcgis.com/tiles/ssFJjBXIUyZDrSYZ/arcgis/rest/services/IFR_AreaLow/MapServer/tile/{z}/{y}/{x}.png", {
        attribution: "FAA Aeronautical Information Services",
        maxZoom: 18,
        opacity: 0.75,
        zIndex: 10,
      }).addTo(map);
      ifrLowLayerRef.current = ifrLow;
    }
  }, [showIfrLow]);

  // Handle Convective SIGMET alert polygons
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (sigmetLayerRef.current) {
      sigmetLayerRef.current.remove();
      sigmetLayerRef.current = null;
    }

    if (showSigmet) {
      const depLatLng = AIRPORT_COORDS[depAirport.toUpperCase()];
      const arrLatLng = AIRPORT_COORDS[arrAirport.toUpperCase()];

      if (!depLatLng || !arrLatLng) return;

      const midLat = (depLatLng[0] + arrLatLng[0]) / 2;
      const midLng = (depLatLng[1] + arrLatLng[1]) / 2;

      // Draw a mock convective SIGMET hazard polygon enclosing all the demo storm cells
      const polygonCoords: [number, number][] = [
        [midLat + 0.7, midLng - 0.95],
        [midLat + 0.8, midLng + 0.95],
        [midLat - 0.7, midLng + 0.95],
        [midLat - 0.8, midLng - 0.95],
      ];

      const sigmet = L.polygon(polygonCoords, {
        color: "#f43f5e", // rose-500
        fillColor: "#be123c", // rose-700
        fillOpacity: 0.25,
        weight: 2,
        dashArray: "4, 4",
      }).addTo(map);

      sigmet.bindPopup(`
        <div class="text-xs p-1 font-sans">
          <p class="font-bold text-rose-400">CONVECTIVE SIGMET 42C</p>
          <p class="text-slate-300 mt-1">Severe turbulence and gusts up to 55kts forecast due to active squall line.</p>
        </div>
      `);

      sigmetLayerRef.current = sigmet;
    }

    return () => {
      if (sigmetLayerRef.current) {
        sigmetLayerRef.current.remove();
        sigmetLayerRef.current = null;
      }
    };
  }, [showSigmet, depAirport, arrAirport]);

  // Handle Demo Rain / Storm Overlay
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Remove existing demo layers
    demoRainLayersRef.current.forEach((layer) => layer.remove());
    demoRainLayersRef.current = [];

    if (showDemoRain) {
      const depLatLng = AIRPORT_COORDS[depAirport.toUpperCase()];
      const arrLatLng = AIRPORT_COORDS[arrAirport.toUpperCase()];

      if (!depLatLng || !arrLatLng) return;

      const midLat = (depLatLng[0] + arrLatLng[0]) / 2;
      const midLng = (depLatLng[1] + arrLatLng[1]) / 2;

      // Draw light rain (green) circle - 60km radius
      const lightRain = L.circle([midLat, midLng], {
        radius: 60000,
        color: "#22c55e", // green-500
        fillColor: "#22c55e",
        fillOpacity: 0.35,
        weight: 1,
      }).addTo(map);

      // Draw moderate rain (yellow) circle offset slightly - 35km radius
      const modRain = L.circle([midLat + 0.1, midLng + 0.1], {
        radius: 35000,
        color: "#eab308", // yellow-500
        fillColor: "#eab308",
        fillOpacity: 0.5,
        weight: 1,
      }).addTo(map);

      // Draw heavy thunderstorm (red) circle offset - 15km radius
      const heavyRain = L.circle([midLat + 0.15, midLng + 0.15], {
        radius: 15000,
        color: "#ef4444", // red-500
        fillColor: "#ef4444",
        fillOpacity: 0.65,
        weight: 1.5,
      }).addTo(map);

      demoRainLayersRef.current = [lightRain, modRain, heavyRain];
    }
  }, [showDemoRain, depAirport, arrAirport]);

  // Helper to construct custom HTML icons for Alerts/PIREPs
  const getAlertIcon = (type: string, subtype?: string) => {
    let color = "bg-amber-500 border-amber-600 text-slate-950";
    let letter = "!";
    
    if (type === "PIREP") {
      if (subtype === "TURB") {
        color = "bg-amber-500 border-amber-650 text-slate-950 hover:bg-amber-400";
        letter = "T";
      } else if (subtype === "ICE") {
        color = "bg-sky-500 border-sky-600 text-white hover:bg-sky-400";
        letter = "I";
      } else if (subtype === "SMOOTH") {
        color = "bg-emerald-500 border-emerald-600 text-slate-950 hover:bg-emerald-400";
        letter = "S";
      }
    } else if (type === "SIGMET") {
      color = "bg-rose-500 border-rose-600 text-white animate-pulse hover:bg-rose-400";
      letter = "⚠";
    } else if (type === "AIRMET") {
      color = "bg-orange-500 border-orange-600 text-slate-950 hover:bg-orange-400";
      letter = "A";
    }

    return L.divIcon({
      html: `
        <div class="flex items-center justify-center w-6 h-6 rounded-full border shadow-md font-bold text-[10px] ${color}">
          ${letter}
        </div>
      `,
      className: "custom-pirep-icon",
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    });
  };

  // Handle Alert/PIREP Markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clear existing alert markers
    alertMarkersRef.current.forEach((marker) => marker.remove());
    alertMarkersRef.current = [];

    const newMarkers: L.Marker[] = [];

    filteredAlerts.forEach((alert) => {
      const marker = L.marker([alert.lat, alert.lng], {
        icon: getAlertIcon(alert.type, alert.subtype),
      }).addTo(map);

      marker.bindPopup(`
        <div class="text-xs p-1 font-sans max-w-[220px]">
          <p class="font-bold ${alert.priority === "HIGH" ? "text-rose-400" : "text-amber-400"}">${alert.type} ${alert.subtype || ""}</p>
          <p class="text-slate-300 mt-1 select-all font-mono">${alert.text}</p>
        </div>
      `);
      newMarkers.push(marker);
    });

    alertMarkersRef.current = newMarkers;
  }, [filteredAlerts]);

  return (
    <div className="w-full h-full relative rounded-2xl overflow-hidden border border-slate-800 shadow-2xl">
      <div ref={mapContainerRef} className="w-full h-full z-10" />
      <style jsx global>{`
        .leaflet-container {
          background-color: #0f172a !important; /* slate-900 */
        }
        .leaflet-bar {
          border: 1px solid rgba(51, 65, 85, 0.5) !important; /* slate-700 */
          background-color: #0f172a !important;
          border-radius: 12px !important;
          overflow: hidden;
        }
        .leaflet-bar a {
          background-color: #0f172a !important;
          color: #94a3b8 !important;
          border-bottom: 1px solid rgba(51, 65, 85, 0.5) !important;
        }
        .leaflet-bar a:hover {
          background-color: #1e293b !important;
          color: #f1f5f9 !important;
        }
        .leaflet-popup-content-wrapper {
          background-color: #0f172a !important;
          border: 1px solid rgba(51, 65, 85, 0.7) !important;
          border-radius: 16px !important;
          color: #f1f5f9 !important;
        }
        .leaflet-popup-tip {
          background-color: #0f172a !important;
          border-left: 1px solid rgba(51, 65, 85, 0.7) !important;
          border-bottom: 1px solid rgba(51, 65, 85, 0.7) !important;
        }
      `}</style>
    </div>
  );
}
