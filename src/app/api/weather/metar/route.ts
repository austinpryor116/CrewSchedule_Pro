import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const ids = searchParams.get("ids") || "KORD,KDFW,KSFO,KATL,KLAX,KJFK";

  try {
    const url = `https://aviationweather.gov/api/data/metar?ids=${encodeURIComponent(ids)}&format=json`;
    const headers = {
      "User-Agent": "CrewSchedulePro/1.0 (aviation@crewschedule.pro)",
      "Accept": "application/json",
    };

    const res = await fetch(url, { next: { revalidate: 180 }, headers });
    if (!res.ok) {
      return NextResponse.json([]);
    }

    const data = await res.json();
    return NextResponse.json(data, {
      headers: { "Cache-Control": "public, max-age=180, stale-while-revalidate=60" },
    });
  } catch (e) {
    console.error("Error in /api/weather/metar proxy:", e);
    return NextResponse.json([]);
  }
}
