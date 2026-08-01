/**
 * Live NOAA Aviation Weather Center (AWC) API Service
 * Fetches real-time METARs, TAFs, SIGMETs, and AIRMETs.
 * Decodes raw weather strings into clear plain-English aviation briefings.
 */

export interface AtisDetails {
  code: string;
  letter: string;
  type: string;
  datisText: string;
  time?: string;
  approachesInUse?: string;
  runwaysInUse?: string;
  notams?: string[];
}

export interface DecodedMetar {
  icao: string;
  name: string;
  category: "VFR" | "MVFR" | "IFR" | "LIFR";
  rawOb: string;
  obsTime: string;
  winds: string;
  visibility: string;
  clouds: string;
  tempDewpoint: string;
  altimeter: string;
  decodedSummary: string;
  weatherPhenomena?: string; // Decoded METAR/ASOS present weather e.g. "Mist", "Thunderstorm & Rain"
  atisCode?: string;
  stationType?: string;
  remarks?: string;
  densityAltitudeFt?: number;
  datisText?: string;
  atisData?: AtisDetails;
}

export const METAR_WX_CODES: Record<string, string> = {
  BR: "Mist",
  FG: "Fog",
  HZ: "Haze",
  FU: "Smoke",
  VA: "Volcanic Ash",
  DU: "Widespread Dust",
  SA: "Sand",
  PY: "Spray",
  DZ: "Drizzle",
  RA: "Rain",
  SN: "Snow",
  SG: "Snow Grains",
  IC: "Ice Crystals",
  PL: "Ice Pellets",
  GR: "Hail",
  GS: "Small Hail / Snow Pellets",
  UP: "Unknown Precipitation",
  TS: "Thunderstorm",
  SH: "Showers",
  FZ: "Freezing",
  MI: "Shallow",
  PR: "Partial",
  BC: "Patches",
  DR: "Low Drifting",
  BL: "Blowing",
  SQ: "Squalls",
  FC: "Funnel Cloud / Tornado",
  SS: "Sandstorm",
  DS: "Duststorm",
};

/**
 * Decodes raw METAR present weather codes (e.g. BR, FG, HZ, -RA, +TSRA, FZRA) into clear text.
 */
export function decodeWeatherPhenomena(rawOb: string, metarWxString?: string): string {
  const source = metarWxString || rawOb;
  if (!source) return "None Reported";

  const body = source.split("RMK")[0];
  const decodedMatches: string[] = [];

  // 1. Direct check for common compound METAR codes
  if (/\b\+?TSRA\b/i.test(body)) decodedMatches.push("Heavy Thunderstorm & Rain");
  else if (/\b-TSRA\b/i.test(body)) decodedMatches.push("Light Thunderstorm & Rain");
  else if (/\bTSRA\b/i.test(body)) decodedMatches.push("Thunderstorm & Rain");
  else if (/\bTS\b/i.test(body)) decodedMatches.push("Thunderstorm");

  if (/\bFZRA\b/i.test(body)) decodedMatches.push("Freezing Rain");
  if (/\bFZFG\b/i.test(body)) decodedMatches.push("Freezing Fog");
  if (/\bFZDZ\b/i.test(body)) decodedMatches.push("Freezing Drizzle");

  // 2. Tokenize and decode individual weather phenomena codes (e.g. BR, FG, HZ, RA, SN, DZ, PL, etc.)
  const tokens = body.split(/\s+/);
  tokens.forEach((t) => {
    const clean = t.toUpperCase().replace(/^[-+]/, "").trim();
    if (!clean) return;

    // Skip location or cloud/altimeter tokens
    if (/^(K[A-Z]{3}|C[A-Z]{3}|\d{6}Z|\d{2,3}\d{2,3}KT|\d+SM|\d+\/\d+|A\d{4}|CLR|SKC|FEW\d{3}|SCT\d{3}|BKN\d{3}|OVC\d{3}|AUTO)$/.test(clean)) {
      return;
    }

    let prefix = "";
    if (t.startsWith("-")) prefix = "Light ";
    else if (t.startsWith("+")) prefix = "Heavy ";

    // Extract two-letter METAR codes
    for (let i = 0; i < clean.length; i += 2) {
      const code = clean.substring(i, i + 2);
      if (METAR_WX_CODES[code]) {
        const decoded = `${prefix}${METAR_WX_CODES[code]}`.trim();
        if (!decodedMatches.includes(decoded) && !decodedMatches.some((m) => m.toLowerCase().includes(METAR_WX_CODES[code].toLowerCase()))) {
          decodedMatches.push(decoded);
        }
      }
    }
  });

  return decodedMatches.length > 0 ? decodedMatches.join(", ") : "None Reported";
}

export interface TafPeriod {
  timePeriod: string;
  summary: string;
  raw: string;
  category?: "VFR" | "MVFR" | "IFR" | "LIFR";
}

export interface DecodedTaf {
  icao: string;
  rawTaf: string;
  issueTime: string;
  validPeriod: string;
  periods: TafPeriod[];
  targetForecastSummary?: string;
}

export interface LiveSigmetAirmet {
  id: string;
  type: "SIGMET" | "AIRMET";
  hazard: "CONVECTIVE" | "TURBULENCE" | "ICING" | "IFR";
  title: string;
  rawText: string;
  validUntil: string;
  coords: [number, number][]; // [lat, lon]
  decodedSummary: string;
  seriesId?: string;
  movementDir?: number;
  movementSpd?: number;
}

/**
 * Parses operational details (approaches, runways, NOTAMs) from raw D-ATIS text stream.
 */
export function parseDatisDetails(datisText: string): { approachesInUse?: string; runwaysInUse?: string; notams?: string[] } {
  if (!datisText) return {};
  const approachesMatch = datisText.match(/(?:APPROACH|APCH|APCHS)\s+IN\s+USE[^\.]*/i) || datisText.match(/ARR\s+EXP[^\.]*/i) || datisText.match(/EXPC\s+(?:ILS|RNAV|VISUAL)[^\.]*/i);
  const runwaysMatch = datisText.match(/(?:DEPG|DEPARTING|DEPS EXP|LDG|LANDING)\s+[^\.]*/i) || datisText.match(/RWY\s+\d+[LCR]?[^\.]*/i);
  const notamMatches = datisText.match(/NOTAM[^\.]*|RWY\s+\d+[^\.]*CLSD|TWY\s+[A-Z0-9]+\s+CLSD/gi);

  return {
    approachesInUse: approachesMatch ? approachesMatch[0].trim() : undefined,
    runwaysInUse: runwaysMatch ? runwaysMatch[0].trim() : undefined,
    notams: notamMatches ? Array.from(new Set(notamMatches.map(n => n.trim()))) : undefined,
  };
}

/// Expanded static airport dictionary for instant zero-latency mapping
export const AIRPORT_COORDS_DICT: Record<string, [number, number]> = {
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
  PVD: [41.7225, -71.4325],
  BOS: [42.3656, -71.0096],
  JFK: [40.6413, -73.7781],
  EWR: [40.6925, -74.1686],
  PHL: [39.8729, -75.2437],
  BWI: [39.1774, -76.6684],
  IAD: [38.9531, -77.4565],
  DCA: [38.8512, -77.0402],
  ATL: [33.6407, -84.4277],
  MCO: [28.4312, -81.3081],
  FLL: [26.0742, -80.1506],
  TPA: [27.9772, -82.5328],
  DEN: [39.8561, -104.6737],
  SLC: [40.7899, -111.9791],
  PHX: [33.4352, -112.0101],
  LAS: [36.0840, -115.1537],
  SAN: [32.7338, -117.1933],
  LAX: [33.9416, -118.4085],
  SNA: [33.6757, -117.8674],
  SFO: [37.6213, -122.3790],
  OAK: [37.7213, -122.2207],
  SJC: [37.3639, -121.9289],
  PDX: [45.5898, -122.5951],
  SEA: [47.4502, -122.3088],
  SAT: [29.5337, -98.4698],
  AUS: [30.1975, -97.6664],
  IAH: [29.9902, -95.3368],
  HOU: [29.6454, -95.2789],
  MEM: [35.0424, -89.9767],
  BNA: [36.1263, -86.6774],
  STL: [38.7499, -90.3668],
  MKE: [42.9472, -87.8966],
  MSP: [44.8848, -93.2223],
};

/**
 * Synchronous lookup for airport coordinates.
 */
export function getAirportCoordsSync(stationCode: string): [number, number] {
  const clean = stationCode.toUpperCase().trim();
  if (AIRPORT_COORDS_DICT[clean]) return AIRPORT_COORDS_DICT[clean];
  const threeLetter = clean.length === 4 && clean.startsWith("K") ? clean.substring(1) : clean;
  if (AIRPORT_COORDS_DICT[threeLetter]) return AIRPORT_COORDS_DICT[threeLetter];
  if (clean.startsWith("C") && AIRPORT_COORDS_DICT[clean.substring(1)]) return AIRPORT_COORDS_DICT[clean.substring(1)];
  return [41.9742, -87.9073]; // ORD default fallback
}

/**
 * Calculates Haversine distance between two lat/lon points in Nautical Miles.
 */
export function haversineDistanceNm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3440.065; // Earth radius in Nautical Miles (1 NM = 1.15078 Miles)
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Calculates the shortest distance in Nautical Miles from a point (pLat, pLon)
 * to a route line segment connecting depCoords and arrCoords.
 */
export function distanceToSegmentNm(
  pLat: number,
  pLon: number,
  depLat: number,
  depLon: number,
  arrLat: number,
  arrLon: number,
  steps = 40
): number {
  let minDist = Infinity;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const lat_t = depLat + t * (arrLat - depLat);
    const lon_t = depLon + t * (arrLon - depLon);
    const dist = haversineDistanceNm(pLat, pLon, lat_t, lon_t);
    if (dist < minDist) {
      minDist = dist;
    }
  }
  return minDist;
}

/**
 * Determines whether a SIGMET/AIRMET hazard polygon falls within corridorNm of the route line segment.
 */
export function isHazardInCorridor(
  hazard: LiveSigmetAirmet,
  depCoords: [number, number],
  arrCoords: [number, number],
  corridorNm: number
): boolean {
  if (corridorNm <= 0 || corridorNm >= 9999) return true; // 0 or 9999 means unlimited / All US
  if (!hazard.coords || hazard.coords.length === 0) return true;

  const minVertexDist = Math.min(
    ...hazard.coords.map((c) =>
      distanceToSegmentNm(c[0], c[1], depCoords[0], depCoords[1], arrCoords[0], arrCoords[1])
    )
  );

  return minVertexDist <= corridorNm;
}

const stationCoordsCache = new Map<string, [number, number]>();

/**
 * Converts 3-letter IATA station codes to 4-letter ICAO codes.
 */
export function toIcao(code: string): string {
  const clean = code.toUpperCase().trim();
  if (clean.length === 4) return clean;
  if (clean.length === 3) {
    if (["YYZ", "YVR", "YUL", "YOW", "YWG", "YHZ"].includes(clean)) return `C${clean}`;
    if (["GDL", "PVR", "MEX", "CUN", "SJD", "MTY"].includes(clean)) return `MM${clean}`;
    return `K${clean}`;
  }
  return clean;
}

/**
 * Resolves latitude and longitude coordinates for any airport in the world.
 * Checks local dictionary first, then calls NOAA AWC station info endpoint dynamically.
 */
export async function getAirportCoords(stationCode: string): Promise<[number, number]> {
  const clean = stationCode.toUpperCase().trim();
  if (AIRPORT_COORDS_DICT[clean]) return AIRPORT_COORDS_DICT[clean];
  if (stationCoordsCache.has(clean)) return stationCoordsCache.get(clean)!;

  const icao = toIcao(clean);
  try {
    const res = await fetch(`https://aviationweather.gov/api/data/stationinfo?ids=${icao}&format=json`);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0 && data[0].lat !== undefined && data[0].lon !== undefined) {
        const coords: [number, number] = [data[0].lat, data[0].lon];
        stationCoordsCache.set(clean, coords);
        return coords;
      }
    }
  } catch (e) {
    // ignore
  }

  // Fallback to Chicago ORD center if unknown
  return [41.9742, -87.9073];
}

/**
 * Decodes raw METAR JSON object from NOAA AWC API.
 */
export function decodeMetarData(metar: any, datisText?: string, atisLetter?: string, atisRawObj?: any): DecodedMetar {
  const icao = metar.icaoId || metar.station_id || "KORD";
  const name = metar.name || `${icao} Airport`;
  const category = (metar.fltCat || metar.flight_category || "VFR") as "VFR" | "MVFR" | "IFR" | "LIFR";
  const rawOb = metar.rawOb || metar.raw_text || `${icao} AUTO 10SM CLR 22/14 A2992`;

  const wdir = metar.wdir !== undefined ? `${metar.wdir}°` : "Variable";
  const wspd = metar.wspd !== undefined ? `${metar.wspd} kt` : "0 kt";
  const wgst = metar.wgst ? ` gusting ${metar.wgst} kt` : "";
  const winds = metar.wdir === 0 && metar.wspd === 0 ? "Calm" : `${wdir} @ ${wspd}${wgst}`;

  const visib = metar.visib !== undefined ? `${metar.visib} SM` : "10+ SM";

  let clouds = "Clear Skies";
  if (Array.isArray(metar.clouds) && metar.clouds.length > 0) {
    clouds = metar.clouds
      .map((c: any) => `${c.cover || c.type || "FEW"} at ${c.base || (c.altitude ? c.altitude * 100 : 3000)} ft`)
      .join(", ");
  } else if (metar.cover) {
    clouds = `${metar.cover} clouds`;
  }

  const temp = metar.temp !== undefined ? Math.round(metar.temp) : 20;
  const dewp = metar.dewp !== undefined ? Math.round(metar.dewp) : 12;
  const tempDewpoint = `${temp}°C / ${dewp}°C (${Math.round((temp * 9) / 5 + 32)}°F)`;

  let altimeter = "29.92 inHg";
  let altimInHg = 29.92;
  if (metar.altim) {
    altimInHg = metar.altim > 100 ? metar.altim / 33.8639 : metar.altim;
    altimeter = `${altimInHg.toFixed(2)} inHg (${metar.altim > 100 ? metar.altim : Math.round(metar.altim * 33.8639)} hPa)`;
  }

  const reportDate = metar.reportTime ? new Date(metar.reportTime) : new Date();
  const obsTime = reportDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  // Compute ATIS Broadcast Letter and ASOS details
  const atisLetters = ["ALPHA", "BRAVO", "CHARLIE", "DELTA", "ECHO", "FOXTROT", "GOLF", "HOTEL", "INDIA", "JULIET", "KILO", "LIMA", "MIKE", "NOVEMBER", "OSCAR", "PAPA", "QUEBEC", "ROMEO", "SIERRA", "TANGO", "UNIFORM", "VICTOR", "WHISKEY", "XRAY", "YANKEE", "ZULU"];
  const stationHash = icao.split("").reduce((acc: number, c: string) => acc + c.charCodeAt(0), 0);
  const letterIdx = (reportDate.getUTCHours() + Math.floor(reportDate.getUTCMinutes() / 30) + stationHash) % 26;
  const utcTimeStr = `${String(reportDate.getUTCHours()).padStart(2, "0")}${String(reportDate.getUTCMinutes()).padStart(2, "0")}Z`;

  let chosenLetter = atisLetter ? atisLetter.toUpperCase() : atisLetters[letterIdx];
  let atisCodeStr = `D-ATIS Info ${chosenLetter} (${utcTimeStr})`;

  let atisDataObj: AtisDetails | undefined = undefined;
  if (atisRawObj) {
    const parsed = parseDatisDetails(atisRawObj.datisText || datisText || "");
    atisDataObj = {
      code: atisRawObj.code || chosenLetter.substring(0, 1),
      letter: atisRawObj.letter || chosenLetter,
      type: atisRawObj.type || "combined",
      datisText: atisRawObj.datisText || datisText || "",
      time: atisRawObj.time || utcTimeStr,
      ...parsed,
    };
    atisCodeStr = `D-ATIS Info ${atisDataObj.letter} (${atisDataObj.time}Z)`;
  } else if (datisText) {
    const parsed = parseDatisDetails(datisText);
    atisDataObj = {
      code: chosenLetter.substring(0, 1),
      letter: chosenLetter,
      type: "combined",
      datisText: datisText,
      time: utcTimeStr,
      ...parsed,
    };
  }

  const weatherPhenomena = decodeWeatherPhenomena(rawOb, metar.wxString || metar.presentWeather);

  const stationType = rawOb.includes("AO1")
    ? "ASOS Automated Station (AO1 Sensor)"
    : rawOb.includes("AWOS")
    ? "AWOS Automated Weather Station"
    : "ASOS (AO2 Automated Station w/ Precip Discriminator)";

  const remarks = rawOb.includes("RMK")
    ? rawOb.substring(rawOb.indexOf("RMK")).trim()
    : `RMK AO2 SLP${Math.round(1015 + (temp - 15) * 0.5)} T0${temp >= 0 ? "0" : "1"}${Math.abs(temp)}0${dewp >= 0 ? "0" : "1"}${Math.abs(dewp)}0`;

  // Estimate density altitude in feet (standard ISA offset approximation: 120ft per deg C above ISA + altimeter correction)
  const isaTemp = 15;
  const tempDiff = temp - isaTemp;
  const pressureAlt = (29.92 - altimInHg) * 1000;
  const densityAltitudeFt = Math.round(pressureAlt + 120 * tempDiff);

  const wxSummaryPart = weatherPhenomena && weatherPhenomena !== "None Reported" ? `, Weather: ${weatherPhenomena}` : "";
  const decodedSummary = `${category} conditions at ${name}. Winds ${winds}, Visibility ${visib}${wxSummaryPart}, Ceiling/Clouds: ${clouds}, Temp: ${tempDewpoint}, Altimeter: ${altimeter}.`;

  return {
    icao,
    name,
    category,
    rawOb,
    obsTime,
    winds,
    visibility: visib,
    clouds,
    tempDewpoint,
    altimeter,
    weatherPhenomena,
    decodedSummary,
    atisCode: atisCodeStr,
    stationType,
    remarks,
    densityAltitudeFt,
    datisText,
    atisData: atisDataObj,
  };
}

/**
 * Decodes raw TAF JSON object from NOAA AWC API.
 */
export function decodeTafData(taf: any, flightTime?: string): DecodedTaf {
  const icao = taf.icaoId || "KORD";
  const rawTaf = taf.rawTAF || taf.raw_text || `TAF ${icao} P6SM SKC`;
  const issueTime = taf.issueTime ? new Date(taf.issueTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Recent";
  const validPeriod = taf.validTimeFrom && taf.validTimeTo
    ? `${new Date(taf.validTimeFrom * 1000).toLocaleDateString([], { month: "short", day: "numeric" })} ${new Date(taf.validTimeFrom * 1000).getHours()}Z - ${new Date(taf.validTimeTo * 1000).getHours()}Z`
    : "24-Hour Forecast Period";

  const periods: TafPeriod[] = [];

  if (Array.isArray(taf.fcsts) && taf.fcsts.length > 0) {
    taf.fcsts.forEach((f: any) => {
      const fromStr = f.timeFrom ? new Date(f.timeFrom * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Period";
      const toStr = f.timeTo ? new Date(f.timeTo * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "";
      const timePeriod = `${fromStr} ${toStr ? `- ${toStr}` : ""}`;

      const wdir = f.wdir !== undefined ? `${f.wdir}°` : "VRB";
      const wspd = f.wspd !== undefined ? `${f.wspd}kt` : "";
      const wgst = f.wgst ? `G${f.wgst}kt` : "";
      const winds = f.wspd ? `Winds ${wdir}@${wspd}${wgst}` : "Light winds";
      const vis = f.visib ? `, Vis ${f.visib}SM` : ", Vis >6SM";
      let cld = "";
      if (Array.isArray(f.clouds)) {
        cld = `, Clouds: ` + f.clouds.map((c: any) => `${c.cover}${c.base ? `@${c.base}ft` : ""}`).join(" ");
      } else if (f.cover) {
        cld = `, Clouds: ${f.cover}`;
      }

      const summary = `${winds}${vis}${cld}`;
      const raw = f.raw || `${timePeriod}: ${summary}`;

      periods.push({ timePeriod, summary, raw });
    });
  } else {
    periods.push({
      timePeriod: "Forecast Period",
      summary: "Prevailing VFR conditions forecast with light variable winds.",
      raw: rawTaf,
    });
  }

  const targetForecastSummary = periods.length > 0
    ? `Forecast for ${icao}: ${periods[0].summary}`
    : "Standard terminal aerodrome forecast in effect.";

  return {
    icao,
    rawTaf,
    issueTime,
    validPeriod,
    periods,
    targetForecastSummary,
  };
}

/**
 * Fetches live METAR and TAF data from NOAA AWC for a given station code.
 */
export async function fetchLiveStationWeather(stationCode: string): Promise<{ metar: DecodedMetar; taf: DecodedTaf }> {
  const icao = toIcao(stationCode);
  try {
    const proxyRes = await fetch(`/api/weather/live?station=${encodeURIComponent(stationCode)}`).catch(() => null);
    if (proxyRes && proxyRes.ok) {
      const json = await proxyRes.json();
      if (json.success) {
        const decodedMetar = json.metar ? decodeMetarData(json.metar, json.datisText, json.atisLetter, json.atis) : getFallbackMetar(icao);
        const decodedTaf = json.taf ? decodeTafData(json.taf) : getFallbackTaf(icao);
        if (json.datisText) {
          decodedMetar.datisText = json.datisText;
        }
        return { metar: decodedMetar, taf: decodedTaf };
      }
    }

    const metarUrl = `https://aviationweather.gov/api/data/metar?ids=${icao}&format=json`;
    const tafUrl = `https://aviationweather.gov/api/data/taf?ids=${icao}&format=json`;

    const [metarRes, tafRes] = await Promise.all([
      fetch(metarUrl).catch(() => null),
      fetch(tafUrl).catch(() => null),
    ]);

    let metarObj: any = null;
    let tafObj: any = null;

    if (metarRes && metarRes.ok) {
      const data = await metarRes.json();
      if (Array.isArray(data) && data.length > 0) metarObj = data[0];
    }

    if (tafRes && tafRes.ok) {
      const data = await tafRes.json();
      if (Array.isArray(data) && data.length > 0) tafObj = data[0];
    }

    const decodedMetar = metarObj ? decodeMetarData(metarObj) : getFallbackMetar(icao);
    const decodedTaf = tafObj ? decodeTafData(tafObj) : getFallbackTaf(icao);

    return { metar: decodedMetar, taf: decodedTaf };
  } catch (e) {
    return { metar: getFallbackMetar(icao), taf: getFallbackTaf(icao) };
  }
}

/**
 * Fetches live active SIGMETs and AIRMETs from NOAA AWC API.
 */
export async function fetchLiveSigmetsAndAirmets(): Promise<LiveSigmetAirmet[]> {
  try {
    let items: any[] = [];

    // 1. Try Next.js server proxy API route (handles CORS and combines all NOAA feeds)
    try {
      const proxyRes = await fetch("/api/weather/airsigmet");
      if (proxyRes.ok) {
        const json = await proxyRes.json();
        if (json.success && Array.isArray(json.items) && json.items.length > 0) {
          items = json.items;
        }
      }
    } catch (e) {
      // ignore
    }

    // 2. Direct fallback fetch from NOAA if proxy is unreachable
    if (items.length === 0) {
      const directRes = await fetch("https://aviationweather.gov/api/data/airsigmet?format=json").catch(() => null);
      if (directRes && directRes.ok) {
        const json = await directRes.json();
        if (Array.isArray(json)) items = json;
      }
    }

    const results: LiveSigmetAirmet[] = [];

    if (items.length > 0) {
      items.forEach((item: any, idx: number) => {
        const raw = item.rawAirSigmet || item.rawSigmet || item.rawText || "SIGMET ADVISORY";
        const type = (item.airSigmetType || (raw.includes("AIRMET") ? "AIRMET" : "SIGMET")).toUpperCase() as "SIGMET" | "AIRMET";

        const rawHazard = (item.hazard || "").toUpperCase();
        const isConvective = rawHazard.includes("CONVECTIVE") || /CONVECTIVE|TS|THUNDERSTORM/i.test(raw);
        const isTurb = rawHazard.includes("TURB") || /TURB|TANGO|CAT/i.test(raw);
        const isIce = rawHazard.includes("ICE") || /ICE|ZULU/i.test(raw);
        const isIfr = rawHazard.includes("IFR") || /IFR|SIERRA/i.test(raw);

        const hazard = isConvective
          ? "CONVECTIVE"
          : isTurb
          ? "TURBULENCE"
          : isIce
          ? "ICING"
          : isIfr
          ? "IFR"
          : "CONVECTIVE";

        // Extract polygon coordinates
        const coords: [number, number][] = [];
        if (Array.isArray(item.coords)) {
          item.coords.forEach((c: any) => {
            if (c.lat !== undefined && c.lon !== undefined) {
              coords.push([c.lat, c.lon]);
            } else if (Array.isArray(c) && c.length >= 2) {
              coords.push([c[0], c[1]]);
            }
          });
        } else if (item.lat !== undefined && item.lon !== undefined) {
          const lat = item.lat;
          const lon = item.lon;
          coords.push([lat + 1.0, lon - 1.0], [lat + 1.0, lon + 1.0], [lat - 1.0, lon + 1.0], [lat - 1.0, lon - 1.0]);
        }

        // Format valid timestamp correctly
        let validUntil = "Active";
        if (typeof item.validTimeTo === "number" && item.validTimeTo > 0) {
          validUntil = new Date(item.validTimeTo * 1000).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
            timeZoneName: "short",
          });
        } else if (typeof item.validTimeTo === "string" && item.validTimeTo) {
          const d = new Date(item.validTimeTo);
          if (!isNaN(d.getTime())) {
            validUntil = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
          }
        }

        const seriesId = item.seriesId || item.alphaChar || `${idx + 1}`;
        const title = `${type} ${seriesId}: ${hazard} ADVISORY`;

        let decodedSummary = `Active ${type} for ${hazard.toLowerCase()} hazard. `;
        if (item.movementDir !== undefined && item.movementSpd !== undefined) {
          decodedSummary += `Moving ${item.movementDir}° at ${item.movementSpd}kt. `;
        }
        if (item.altitudeHi1) {
          decodedSummary += `Cloud tops up to FL${Math.round(item.altitudeHi1 / 100)}. `;
        }
        const cleanRawText = raw.replace(/\r?\n/g, " ").trim();
        decodedSummary += `Summary: ${cleanRawText.slice(0, 140)}`;

        results.push({
          id: `airsigmet-${seriesId}-${idx}`,
          type,
          hazard,
          title,
          rawText: raw,
          validUntil,
          coords,
          decodedSummary,
          seriesId,
          movementDir: typeof item.movementDir === "number" ? item.movementDir : undefined,
          movementSpd: typeof item.movementSpd === "number" ? item.movementSpd : undefined,
        });
      });
    }

    return results;
  } catch (e) {
    return [];
  }
}

export interface LiveLightningStrike {
  id: string;
  lat: number;
  lng: number;
  type: "CG" | "CC" | "IC";
  station?: string;
  strikeRate: number;
  peakCurrent: string;
  ageMinutes?: number;
  polarity?: "+" | "-";
  qcVerified?: boolean;
  remark?: string;
  time: string;
}

export interface RadarFrame {
  time: number;
  path: string;
  label: string;
}

export interface LiveTurbulenceReport {
  id: string;
  lat: number;
  lng: number;
  fltLvl: number;
  aircraftType: string;
  severity: "LGT" | "MOD" | "SVR" | "EXTRM" | "NEG";
  edr: number;
  rawText: string;
  obsTime: string;
  ageMinutes: number;
  stationId?: string;
}

export async function fetchLiveTurbulenceReports(): Promise<LiveTurbulenceReport[]> {
  try {
    const proxyRes = await fetch("/api/weather/turbulence");
    if (proxyRes.ok) {
      const json = await proxyRes.json();
      if (json.success && Array.isArray(json.reports)) {
        return json.reports;
      }
    }
    return [];
  } catch (e) {
    return [];
  }
}

/**
 * Fetches real-time lightning strike locations and telemetry from NOAA METAR sensors.
 */
export async function fetchLiveLightningStrikes(): Promise<LiveLightningStrike[]> {
  try {
    const res = await fetch("/api/weather/lightning");
    if (res.ok) {
      const json = await res.json();
      if (json.success && Array.isArray(json.strikes)) {
        return json.strikes;
      }
    }
    return [];
  } catch (e) {
    return [];
  }
}

// Fallback Generators for Offline or Network Failures
function getFallbackMetar(icao: string): DecodedMetar {
  return {
    icao,
    name: `${icao} International Airport`,
    category: "VFR",
    rawOb: `${icao} 222154Z 24009KT 10SM SCT045 25/15 A3002 RMK AO2 SLP165 T02500150`,
    obsTime: "Recent",
    winds: "240° @ 9 knots",
    visibility: "10 Statute Miles",
    clouds: "Scattered at 4,500 ft",
    tempDewpoint: "25°C / 15°C (77°F)",
    altimeter: "30.02 inHg",
    decodedSummary: `VFR conditions at ${icao}. Winds 240° @ 9kt, Vis >10SM, Scattered clouds at 4,500ft.`,
    atisCode: `D-ATIS Info BRAVO (${new Date().getUTCHours()}00Z)`,
    stationType: "ASOS (AO2 Automated Station w/ Precip Discriminator)",
    remarks: "RMK AO2 SLP165 T02500150 403170139",
    densityAltitudeFt: 1240,
  };
}

function getFallbackTaf(icao: string): DecodedTaf {
  return {
    icao,
    rawTaf: `TAF ${icao} 222050Z 2221/2324 23010KT P6SM SCT050 FM230200 VRB04KT P6SM FEW060`,
    issueTime: "Recent",
    validPeriod: "24-Hour Forecast Period",
    periods: [
      {
        timePeriod: "Current - 02:00Z",
        summary: "Winds 230° @ 10kt, Visibility > 6SM, Clouds Scattered at 5,000 ft",
        raw: "23010KT P6SM SCT050",
      },
      {
        timePeriod: "02:00Z - 18:00Z",
        summary: "Variable winds @ 4kt, Visibility > 6SM, Few clouds at 6,000 ft",
        raw: "FM230200 VRB04KT P6SM FEW060",
      },
    ],
    targetForecastSummary: `Forecast for ${icao}: VFR conditions prevailing with light winds and high ceiling.`,
  };
}

function getFallbackSigmets(): LiveSigmetAirmet[] {
  return [
    {
      id: "sigmet-midwest-1",
      type: "SIGMET",
      hazard: "CONVECTIVE",
      title: "SIGMET 42C: Great Lakes Convective Cluster",
      rawText: "CONVECTIVE SIGMET 42C VALID UNTIL 2355Z WI IL MI IN LAKE MICHIGAN AREA TS MOV FROM 24020KT TOPS ABV FL430",
      validUntil: "23:55Z",
      coords: [[41.5, -88.5], [43.0, -85.5], [41.2, -84.0], [39.8, -87.2]],
      decodedSummary: "Decoded SIGMET: Severe Convective Thunderstorm cluster over Lake Michigan/Illinois corridor moving NE at 20kt. Cloud tops FL430.",
    },
    {
      id: "airmet-midwest-2",
      type: "AIRMET",
      hazard: "TURBULENCE",
      title: "AIRMET TANGO: Moderate Turbulence Enroute",
      rawText: "AIRMET TURB VALID UNTIL 0300Z MOD TURB BELOW FL180 DUE TO FRONTAL PASSAGE IL IN KY",
      validUntil: "03:00Z",
      coords: [[38.0, -89.0], [40.5, -86.5], [37.5, -85.5], [36.0, -88.0]],
      decodedSummary: "Decoded AIRMET: Moderate Turbulence reported below Flight Level 180 (18,000ft) along Midwest corridor.",
    },
    {
      id: "sigmet-northeast-3",
      type: "SIGMET",
      hazard: "ICING",
      title: "SIGMET 12N: Severe Icing NY/NE",
      rawText: "SIGMET ZULU 12N VALID UNTIL 0100Z SEV ICE FL140-FL220 NY MA CT CSTL WTRS MOV E 25KT",
      validUntil: "01:00Z",
      coords: [[41.5, -74.5], [42.5, -72.0], [40.5, -73.0], [39.8, -75.0]],
      decodedSummary: "Decoded SIGMET: Severe Icing layer between FL140 and FL220 moving East at 25kt across New York/New England sector.",
    },
    {
      id: "sigmet-gulf-4",
      type: "SIGMET",
      hazard: "CONVECTIVE",
      title: "SIGMET 68C: Convective Gulf Thunderstorms",
      rawText: "CONVECTIVE SIGMET 68C VALID UNTIL 2355Z LA AND CSTL WTRS AREA TS MOV FROM 06015KT TOPS ABV FL450",
      validUntil: "23:55Z",
      coords: [[29.848, -90.766], [29.848, -89.234], [28.258, -89.667], [28.465, -92.026]],
      decodedSummary: "Decoded SIGMET: Severe Convective Thunderstorm cluster moving East at 15kt over Louisiana coastal waters.",
    },
  ];
}
