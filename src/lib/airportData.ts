export const MEGA_HUBS = new Set([
  "ORD", "DFW", "CLT", "MIA", "ATL", "DEN", "LAX", "PHX", "JFK", "DCA", "SFO", "SEA"
]);

export const MAJOR_HUBS = new Set([
  "ORD", "DFW", "CLT", "MIA", "ATL", "DEN", "LAX", "PHX", "JFK", "DCA", "DTW", "MSP", "SFO", "IAH", "BOS", "SEA", "LAS", "SLC", "PHL", "SAN", "AUS", "MCO", "BNA", "RDU", "CLE", "IND", "STL", "MCI", "CVG", "YYZ"
]);

// Map of secondary/adjacent metro airports to their flagship hub to prevent visual overlap on map
export const METRO_SECONDARY_TO_PRIMARY: Record<string, string> = {
  MDW: "ORD", // Chicago: Show ORD
  LGA: "JFK", // New York Metro: Show JFK
  EWR: "JFK",
  HPN: "JFK",
  IAD: "DCA", // Washington DC / Baltimore: Show DCA
  BWI: "DCA",
  DAL: "DFW", // Dallas / Fort Worth: Show DFW
  HOU: "IAH", // Houston Metro: Show IAH
  FLL: "MIA", // South Florida: Show MIA
  PBI: "MIA",
  OAK: "SFO", // SF Bay Area: Show SFO
  SJC: "SFO",
  BUR: "LAX", // Los Angeles Basin: Show LAX
  SNA: "LAX",
  ONT: "LAX",
  LGB: "LAX",
};

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
  SFO: { name: "San Francisco Intl", lat: 37.6213, lng: -122.3790, cat: "VFR" },
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

export function destinationDistanceNm(lat1: number, lon1: number, lat2: number, lon2: number): number {
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

export function isPointInPolygon(point: [number, number], polygon: [number, number][]): boolean {
  if (!polygon || polygon.length < 3) return false;
  const [lat, lng] = point;

  // Bounding box pre-check
  let minLat = Infinity, maxLat = -Infinity, minLng = Infinity, maxLng = -Infinity;
  for (const [pLat, pLng] of polygon) {
    if (pLat < minLat) minLat = pLat;
    if (pLat > maxLat) maxLat = pLat;
    if (pLng < minLng) minLng = pLng;
    if (pLng > maxLng) maxLng = pLng;
  }
  if (lat < minLat || lat > maxLat || lng < minLng || lng > maxLng) {
    return false;
  }

  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [latI, lngI] = polygon[i];
    const [latJ, lngJ] = polygon[j];

    const intersect =
      lngI > lng !== lngJ > lng &&
      lat < ((latJ - latI) * (lng - lngI)) / (lngJ - lngI) + latI;
    if (intersect) inside = !inside;
  }

  return inside;
}
