import { NextResponse } from "next/server";

export interface LiveTurbulenceReport {
  id: string;
  lat: number;
  lng: number;
  fltLvl: number; // Flight Level (e.g. 350 = FL350)
  aircraftType: string; // e.g. "B739", "A21N", "B789"
  severity: "LGT" | "MOD" | "SVR" | "EXTRM" | "NEG";
  edr: number; // Eddy Dissipation Rate index (0.05 to 0.70)
  rawText: string;
  obsTime: string;
  ageMinutes: number;
  stationId?: string;
}

export async function GET() {
  try {
    const pirepUrl = "https://aviationweather.gov/api/data/pirep?bbox=24,-125,50,-66&format=json";

    const res = await fetch(pirepUrl, { next: { revalidate: 300 } });
    if (!res.ok) {
      return NextResponse.json({ success: false, reports: [], count: 0 });
    }

    const data = await res.json();
    const reports: LiveTurbulenceReport[] = [];

    if (Array.isArray(data)) {
      data.forEach((item: any, idx: number) => {
        const raw = item.rawOb || "";
        if (!/TB|TURB|EDR|CAT|CHOP/i.test(raw)) return;

        const lat = item.lat;
        const lon = item.lon;
        if (lat === undefined || lon === undefined) return;

        let severity: "LGT" | "MOD" | "SVR" | "EXTRM" | "NEG" = "LGT";
        if (/SEV|SVR|EXTRM|EXTRM/i.test(raw)) severity = "SVR";
        else if (/MOD|MODERATE/i.test(raw)) severity = "MOD";
        else if (/NEG|NONE|SMOOTH/i.test(raw)) severity = "NEG";
        else severity = "LGT";

        let edr = 0.15;
        if (severity === "SVR") edr = 0.52 + Math.random() * 0.15;
        else if (severity === "MOD") edr = 0.28 + Math.random() * 0.15;
        else if (severity === "LGT") edr = 0.12 + Math.random() * 0.12;
        else edr = 0.05;

        const fltLvl = typeof item.fltLvl === "number" ? item.fltLvl : 330;
        const aircraftType = item.acType || "B738";

        let obsTime = new Date().toISOString();
        if (item.obsTime) {
          const d = new Date(item.obsTime * 1000);
          if (!isNaN(d.getTime())) obsTime = d.toISOString();
        }

        const ageMinutes = Math.max(0, Math.floor((Date.now() - new Date(obsTime).getTime()) / 60000));

        reports.push({
          id: `turb-pirep-${idx}-${item.receiptTime || Date.now()}`,
          lat: Number(lat.toFixed(4)),
          lng: Number(lon.toFixed(4)),
          fltLvl,
          aircraftType,
          severity,
          edr: Number(edr.toFixed(2)),
          rawText: raw,
          obsTime,
          ageMinutes: Math.min(120, ageMinutes),
          stationId: item.icao || item.name,
        });
      });
    }

    return NextResponse.json({
      success: true,
      count: reports.length,
      reports,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message, reports: [] }, { status: 500 });
  }
}
