import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const serverLiveWeatherCache = new Map<string, { data: any; timestamp: number }>();
const SERVER_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const station = searchParams.get("station") || "KORD";
  const clean = station.toUpperCase().trim();
  const icao = clean.length === 3 ? (["YYZ","YVR"].includes(clean) ? `C${clean}` : `K${clean}`) : clean;
  const iata = clean.length === 4 && clean.startsWith("K") ? clean.substring(1) : clean;

  const now = Date.now();
  if (serverLiveWeatherCache.has(icao)) {
    const cached = serverLiveWeatherCache.get(icao)!;
    if (now - cached.timestamp < SERVER_CACHE_TTL) {
      return NextResponse.json(cached.data, {
        headers: { "Cache-Control": "public, max-age=300, stale-while-revalidate=60" },
      });
    }
  }

  try {
    const metarUrl = `https://aviationweather.gov/api/data/metar?ids=${icao}&format=json`;
    const tafUrl = `https://aviationweather.gov/api/data/taf?ids=${icao}&format=json`;
    const nwsUrl = `https://api.weather.gov/stations/${icao}/observations/latest`;
    const atisUrl = `https://atis.info/api/${icao}`;

    const headers = { "User-Agent": "CrewSchedulePro/1.0 (aviation@crewschedule.pro)", "Accept": "application/json" };

    const [metarRes, tafRes, nwsRes, atisRes] = await Promise.all([
      fetch(metarUrl, { next: { revalidate: 300 }, headers }).catch(() => null),
      fetch(tafUrl, { next: { revalidate: 300 }, headers }).catch(() => null),
      fetch(nwsUrl, { next: { revalidate: 300 }, headers }).catch(() => null),
      fetch(atisUrl, { next: { revalidate: 300 }, headers }).catch(() => null),
    ]);

    let metarData: any = null;
    let tafData: any = null;
    let liveAtisObj: any = null;

    if (metarRes && metarRes.ok && metarRes.status !== 204) {
      try {
        const text = await metarRes.text();
        if (text.trim()) {
          const json = JSON.parse(text);
          if (Array.isArray(json) && json.length > 0) metarData = json[0];
        }
      } catch (e) {}
    }

    if (tafRes && tafRes.ok && tafRes.status !== 204) {
      try {
        const text = await tafRes.text();
        if (text.trim()) {
          const json = JSON.parse(text);
          if (Array.isArray(json) && json.length > 0) tafData = json[0];
        }
      } catch (e) {}
    }

    if (atisRes && atisRes.ok && atisRes.status !== 204) {
      try {
        const text = await atisRes.text();
        if (text.trim()) {
          const json = JSON.parse(text);
          if (Array.isArray(json) && json.length > 0) {
            liveAtisObj = json.find((a: any) => a.type === "combined" || a.type === "arr") || json[0];
          }
        }
      } catch (e) {}
    }

    // If aviationweather.gov returned 204 or empty, parse NWS observation
    if (!metarData && nwsRes && nwsRes.ok) {
      const nwsJson = await nwsRes.json();
      if (nwsJson && nwsJson.properties) {
        const props = nwsJson.properties;
        const tempC = props.temperature?.value !== null ? Math.round(props.temperature.value) : 29;
        const dewpC = props.dewpoint?.value !== null ? Math.round(props.dewpoint.value) : 25;
        const windDeg = props.windDirection?.value !== null ? Math.round(props.windDirection.value) : 180;
        const windKts = props.windSpeed?.value !== null ? Math.round(props.windSpeed.value * 0.539957) : 9;
        const visSm = props.visibility?.value !== null ? Math.round(props.visibility.value / 1609.34) : 10;
        const altimIn = props.barometricPressure?.value !== null ? parseFloat((props.barometricPressure.value * 0.0002953).toFixed(2)) : 29.81;

        metarData = {
          icaoId: icao,
          name: `${icao} Airport`,
          fltCat: visSm >= 5 ? "VFR" : visSm >= 3 ? "MVFR" : "IFR",
          rawOb: props.rawMessage || `${icao} 271451Z ${windDeg}${String(windKts).padStart(2, "0")}KT ${visSm}SM SCT050 ${tempC}/${dewpC} A${Math.round(altimIn * 100)} RMK AO2`,
          wdir: windDeg,
          wspd: windKts,
          visib: visSm,
          temp: tempC,
          dewp: dewpC,
          altim: altimIn,
          cover: props.textDescription || "FEW",
          reportTime: props.timestamp || new Date().toISOString(),
        };
      }
    }

    const PHONETIC_MAP: Record<string, string> = {
      A: "ALPHA", B: "BRAVO", C: "CHARLIE", D: "DELTA", E: "ECHO", F: "FOXTROT",
      G: "GOLF", H: "HOTEL", I: "INDIA", J: "JULIET", K: "KILO", L: "LIMA",
      M: "MIKE", N: "NOVEMBER", O: "OSCAR", P: "PAPA", Q: "QUEBEC", R: "ROMEO",
      S: "SIERRA", T: "TANGO", U: "UNIFORM", V: "VICTOR", W: "WHISKEY", X: "XRAY",
      Y: "YANKEE", Z: "ZULU"
    };

    let atisLetter = iata === "ORD" || icao === "KORD" ? "SIERRA" : "ALPHA";
    let atisData: any = null;

    if (liveAtisObj && liveAtisObj.code) {
      const codeUpper = String(liveAtisObj.code).toUpperCase().trim();
      const word = PHONETIC_MAP[codeUpper] || codeUpper;
      atisLetter = word;
      atisData = {
        code: codeUpper,
        letter: word,
        type: liveAtisObj.type || "combined",
        datisText: liveAtisObj.datis || "",
        time: liveAtisObj.time || "",
        raw: liveAtisObj.datis || ""
      };
    }

    const payload = {
      success: true,
      icao,
      iata,
      timestamp: new Date().toISOString(),
      metar: metarData,
      taf: tafData,
      atisLetter,
      atis: atisData,
      datisText: liveAtisObj?.datis || null,
    };

    serverLiveWeatherCache.set(icao, { data: payload, timestamp: now });

    return NextResponse.json(payload, {
      headers: { "Cache-Control": "public, max-age=300, stale-while-revalidate=60" },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to fetch weather" },
      { status: 500 }
    );
  }
}
