import { NextResponse } from "next/server";

export async function GET() {
  try {
    const [airSigRes, iSigRes, airmetRes, sigRes] = await Promise.all([
      fetch("https://aviationweather.gov/api/data/airsigmet?format=json", { next: { revalidate: 60 } }).catch(() => null),
      fetch("https://aviationweather.gov/api/data/isigmet?format=json", { next: { revalidate: 60 } }).catch(() => null),
      fetch("https://aviationweather.gov/api/data/airmet?format=json", { next: { revalidate: 60 } }).catch(() => null),
      fetch("https://aviationweather.gov/api/data/sigmet?format=json", { next: { revalidate: 60 } }).catch(() => null),
    ]);

    const itemsMap = new Map<string, any>();

    const processItems = async (res: Response | null) => {
      if (!res || !res.ok) return;
      try {
        const data = await res.json();
        if (Array.isArray(data)) {
          data.forEach((item: any) => {
            const key = item.rawAirSigmet || item.rawSigmet || item.rawText || `${item.seriesId}-${item.receiptTime}`;
            if (key && !itemsMap.has(key)) {
              itemsMap.set(key, item);
            }
          });
        }
      } catch (e) {}
    };

    await Promise.all([
      processItems(airSigRes),
      processItems(iSigRes),
      processItems(airmetRes),
      processItems(sigRes),
    ]);

    const allItems = Array.from(itemsMap.values());
    return NextResponse.json({ success: true, count: allItems.length, items: allItems });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message, items: [] }, { status: 500 });
  }
}
