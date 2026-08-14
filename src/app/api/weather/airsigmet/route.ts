import { NextResponse } from "next/server";

export async function GET() {
  try {
    const [iceRes, turbHiRes, turbLoRes, llwsRes, ifrRes, isigRes, airSigRes] = await Promise.all([
      fetch("https://aviationweather.gov/api/data/gairmet?format=geojson&hazard=ICE", { next: { revalidate: 300 } }).catch(() => null),
      fetch("https://aviationweather.gov/api/data/gairmet?format=geojson&hazard=TURB-HI", { next: { revalidate: 300 } }).catch(() => null),
      fetch("https://aviationweather.gov/api/data/gairmet?format=geojson&hazard=TURB-LO", { next: { revalidate: 300 } }).catch(() => null),
      fetch("https://aviationweather.gov/api/data/gairmet?format=geojson&hazard=LLWS", { next: { revalidate: 300 } }).catch(() => null),
      fetch("https://aviationweather.gov/api/data/gairmet?format=geojson&hazard=IFR", { next: { revalidate: 300 } }).catch(() => null),
      fetch("https://aviationweather.gov/api/data/isigmet?format=geojson", { next: { revalidate: 300 } }).catch(() => null),
      fetch("https://aviationweather.gov/api/data/airsigmet?format=json", { next: { revalidate: 300 } }).catch(() => null),
    ]);

    const itemsList: any[] = [];

    const processGeoJson = async (res: Response | null, defaultHazard: string) => {
      if (!res || !res.ok) return;
      try {
        const geojson = await res.json();
        if (geojson && Array.isArray(geojson.features)) {
          geojson.features.forEach((feat: any, idx: number) => {
            const props = feat.properties || {};
            const geom = feat.geometry;
            if (!geom) return;

            const coords: [number, number][] = [];
            let ring: any[] = [];

            if (geom.type === "Polygon" && Array.isArray(geom.coordinates) && geom.coordinates.length > 0) {
              ring = geom.coordinates[0];
            } else if (geom.type === "MultiPolygon" && Array.isArray(geom.coordinates) && geom.coordinates.length > 0) {
              ring = geom.coordinates[0][0] || [];
            }

            if (Array.isArray(ring)) {
              ring.forEach((pt: any) => {
                if (Array.isArray(pt) && pt.length >= 2) {
                  // GeoJSON is [lon, lat] -> convert to [lat, lon]
                  coords.push([pt[1], pt[0]]);
                }
              });
            }

            if (coords.length >= 3) {
              const hazardType = (props.hazard || defaultHazard || "SIGMET").toUpperCase();
              const baseAlt = props.base ? (isNaN(props.base) ? props.base : `${props.base}00 FT`) : "SFC";
              const topAlt = props.top ? (isNaN(props.top) ? props.top : `FL${props.top}`) : "UNL";
              const severity = props.severity || props.qualifier || "MOD";
              const product = props.product || props.airSigmetType || "SIGMET";
              const title = `NOAA ${product} ${hazardType} (${severity})`;
              const rawText = `${title} [${baseAlt} - ${topAlt}] valid ${props.validTime || "NOW"}. Due to: ${props.dueTo || hazardType}`;

              itemsList.push({
                id: `noaa-${props.hazard || defaultHazard}-${idx}-${Date.now()}`,
                airSigmetType: product.includes("SIGMET") ? "SIGMET" : "AIRMET",
                hazard: hazardType.includes("ICE") ? "ICING" : hazardType.includes("TURB") || hazardType.includes("LLWS") ? "TURBULENCE" : hazardType.includes("IFR") ? "IFR" : "CONVECTIVE",
                severity,
                baseAlt,
                topAlt,
                title,
                rawText,
                coords,
                receiptTime: props.receiptTime || props.issueTime || new Date().toISOString(),
              });
            }
          });
        }
      } catch (e) {}
    };

    await Promise.all([
      processGeoJson(iceRes, "ICE"),
      processGeoJson(turbHiRes, "TURB-HI"),
      processGeoJson(turbLoRes, "TURB-LO"),
      processGeoJson(llwsRes, "LLWS"),
      processGeoJson(ifrRes, "IFR"),
      processGeoJson(isigRes, "CONVECTIVE"),
    ]);

    // Also process standard legacy json fallback if available
    if (airSigRes && airSigRes.ok) {
      try {
        const json = await airSigRes.json();
        if (Array.isArray(json)) {
          json.forEach((item: any) => {
            if (item.coords && Array.isArray(item.coords)) {
              const coords: [number, number][] = [];
              item.coords.forEach((c: any) => {
                if (c.lat !== undefined && c.lon !== undefined) coords.push([c.lat, c.lon]);
              });
              if (coords.length >= 3) {
                const haz = (item.hazard || "CONVECTIVE").toUpperCase();
                itemsList.push({
                  id: `legacy-${item.seriesId || Math.random()}`,
                  airSigmetType: item.airSigmetType || "SIGMET",
                  hazard: haz.includes("ICE") ? "ICING" : haz.includes("TURB") || haz.includes("LLWS") ? "TURBULENCE" : haz.includes("IFR") ? "IFR" : "CONVECTIVE",
                  severity: item.severity || "MOD",
                  baseAlt: item.minFt ? `${item.minFt} FT` : "SFC",
                  topAlt: item.maxFt ? `${item.maxFt} FT` : "UNL",
                  title: `NOAA SIGMET/AIRMET ${item.hazard || ""}`,
                  rawText: item.rawAirSigmet || item.rawSigmet || item.rawText || "NOAA SIGMET ADVISORY",
                  coords,
                  receiptTime: item.receiptTime || new Date().toISOString(),
                });
              }
            }
          });
        }
      } catch (e) {}
    }

    return NextResponse.json({ success: true, count: itemsList.length, items: itemsList });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message, items: [] }, { status: 500 });
  }
}
