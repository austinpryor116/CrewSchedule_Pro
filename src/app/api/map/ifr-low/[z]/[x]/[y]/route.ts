import { NextRequest, NextResponse } from "next/server";

// 256x256 solid parchment SVG fallback for out-of-bounds chart tiles
const PARCHMENT_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"><rect width="256" height="256" fill="#eae7de"/></svg>`;

function tile2lon(x: number, z: number): number {
  return (x / Math.pow(2, z)) * 360 - 180;
}

function tile2lat(y: number, z: number): number {
  const n = Math.PI - 2 * Math.PI * (y / Math.pow(2, z));
  return (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
}

function lon2tile(lon: number, z: number): number {
  return Math.floor(((lon + 180) / 360) * Math.pow(2, z));
}

function lat2tile(lat: number, z: number): number {
  const rad = (lat * Math.PI) / 180;
  return Math.floor(
    ((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) *
      Math.pow(2, z)
  );
}

function getMappedTargetTile(z: number, x: number, y: number) {
  if (z >= 7 && z <= 12) {
    return { targetZ: z, targetX: x, targetY: y };
  }

  const targetZ = z < 7 ? 7 : 12;
  const centerLon = tile2lon(x + 0.5, z);
  const centerLat = tile2lat(y + 0.5, z);
  const targetX = lon2tile(centerLon, targetZ);
  const targetY = lat2tile(centerLat, targetZ);

  return { targetZ, targetX, targetY };
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ z: string; x: string; y: string }> }
) {
  try {
    const { z: zStr, x: xStr, y: yStr } = await context.params;
    const z = parseInt(zStr, 10);
    const x = parseInt(xStr, 10);
    const y = parseInt(yStr, 10);

    if (isNaN(z) || isNaN(x) || isNaN(y)) {
      return new NextResponse("Invalid tile parameters", { status: 400 });
    }

    const { targetZ, targetX, targetY } = getMappedTargetTile(z, x, y);

    const arcgisUrl = `https://tiles.arcgis.com/tiles/ssFJjBXIUyZDrSYZ/arcgis/rest/services/IFR_AreaLow/MapServer/tile/${targetZ}/${targetY}/${targetX}`;

    const res = await fetch(arcgisUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
      next: { revalidate: 86400 },
    });

    if (!res.ok) {
      return new NextResponse(PARCHMENT_SVG, {
        status: 200,
        headers: {
          "Content-Type": "image/svg+xml",
          "Cache-Control": "public, max-age=86400",
        },
      });
    }

    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch (error) {
    console.error("IFR tile proxy error:", error);
    return new NextResponse(PARCHMENT_SVG, {
      status: 200,
      headers: {
        "Content-Type": "image/svg+xml",
        "Cache-Control": "public, max-age=86400",
      },
    });
  }
}
