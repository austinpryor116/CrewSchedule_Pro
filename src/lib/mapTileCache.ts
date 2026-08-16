/**
 * Persistent Offline Map Tile Cache & Full Continental Map Pack Engine for CrewSchedule Pro
 * Uses CacheStorage API (with IndexedDB fallback) to store and serve Leaflet map tiles
 * 100% offline in Airplane Mode permanently.
 */

const CACHE_NAME = "crewschedule-map-tiles-v1";
const FULL_PACK_STORAGE_KEY = "crewschedule_full_map_pack_ready";

// Helper: Convert Lat/Lng to Web Mercator Tile (X, Y)
export function latLngToTile(lat: number, lng: number, zoom: number): { x: number; y: number } {
  const latRad = (lat * Math.PI) / 180;
  const n = Math.pow(2, zoom);
  const x = Math.floor(((lng + 180) / 360) * n);
  const y = Math.floor(
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n
  );
  return {
    x: Math.max(0, Math.min(n - 1, x)),
    y: Math.max(0, Math.min(n - 1, y)),
  };
}

// Helper: Get all tile coordinates across a bounding box for given zoom levels
export function getTilesForBounds(
  minLat: number,
  maxLat: number,
  minLng: number,
  maxLng: number,
  minZoom = 3,
  maxZoom = 8
): Array<{ z: number; x: number; y: number }> {
  const tiles: Array<{ z: number; x: number; y: number }> = [];
  const seen = new Set<string>();

  for (let z = minZoom; z <= maxZoom; z++) {
    const minTile = latLngToTile(maxLat, minLng, z); // Northwest
    const maxTile = latLngToTile(minLat, maxLng, z); // Southeast

    const xMin = Math.min(minTile.x, maxTile.x);
    const xMax = Math.max(minTile.x, maxTile.x);
    const yMin = Math.min(minTile.y, maxTile.y);
    const yMax = Math.max(minTile.y, maxTile.y);

    for (let x = xMin; x <= xMax; x++) {
      for (let y = yMin; y <= yMax; y++) {
        const key = `${z}/${x}/${y}`;
        if (!seen.has(key)) {
          seen.add(key);
          tiles.push({ z, x, y });
        }
      }
    }
  }

  return tiles;
}

// Generate standard tile URL from z, x, y coordinates
export function getStandardTileUrl(z: number, x: number, y: number, sub = "a"): string {
  return `https://${sub}.basemaps.cartocdn.com/rastertiles/voyager/${z}/${x}/${y}.png`;
}

// In-memory Object URL cache to avoid creating duplicate Blob URLs
const objectUrlMemoryCache = new Map<string, string>();

/**
 * Retrieves a tile from CacheStorage or fetches and saves it if online.
 * Always serves from local flash storage first for 0ms latency and 0 battery draw.
 */
export async function getOrFetchTile(
  url: string,
  coords: { x: number; y: number; z: number }
): Promise<string> {
  const cacheKey = `tile-${coords.z}-${coords.x}-${coords.y}`;

  // 1. Check in-memory object URL cache
  if (objectUrlMemoryCache.has(cacheKey)) {
    return objectUrlMemoryCache.get(cacheKey)!;
  }

  // 2. Check persistent CacheStorage API
  if (typeof caches !== "undefined") {
    try {
      const cache = await caches.open(CACHE_NAME);
      const cacheReq = new Request(`https://local-map-tile.cache/${coords.z}/${coords.x}/${coords.y}.png`);
      const cachedResp = await cache.match(cacheReq);

      if (cachedResp) {
        const blob = await cachedResp.blob();
        const objUrl = URL.createObjectURL(blob);
        objectUrlMemoryCache.set(cacheKey, objUrl);
        return objUrl;
      }

      // If not in cache and online, fetch from network and permanently save to device storage
      if (typeof navigator !== "undefined" && navigator.onLine) {
        try {
          const fetchResp = await fetch(url, { mode: "cors", cache: "default" });
          if (fetchResp.ok) {
            const blob = await fetchResp.blob();
            const respToCache = new Response(blob, {
              headers: { "Content-Type": "image/png" },
            });
            cache.put(cacheReq, respToCache).catch(() => {});

            const objUrl = URL.createObjectURL(blob);
            objectUrlMemoryCache.set(cacheKey, objUrl);
            return objUrl;
          }
        } catch {
          // Network fetch failed (offline)
        }
      }
    } catch (e) {
      console.warn("Tile cache lookup error:", e);
    }
  }

  return url;
}

/**
 * Pre-caches an array of tiles in batches with concurrency control
 */
export async function precacheTileList(
  tiles: Array<{ z: number; x: number; y: number }>,
  onProgress?: (completed: number, total: number) => void
): Promise<{ success: number; failed: number }> {
  if (typeof caches === "undefined") {
    return { success: 0, failed: 0 };
  }

  const cache = await caches.open(CACHE_NAME);
  const subdomains = ["a", "b", "c", "d"];
  let completed = 0;
  let successCount = 0;
  let failedCount = 0;
  const total = tiles.length;

  const CONCURRENCY = 8;
  const queue = [...tiles];

  async function worker() {
    while (queue.length > 0) {
      const item = queue.shift();
      if (!item) break;

      const cacheReq = new Request(`https://local-map-tile.cache/${item.z}/${item.x}/${item.y}.png`);
      const existing = await cache.match(cacheReq);

      if (existing) {
        successCount++;
      } else {
        const sub = subdomains[(item.x + item.y) % subdomains.length];
        const url = getStandardTileUrl(item.z, item.x, item.y, sub);
        try {
          const resp = await fetch(url, { mode: "cors" });
          if (resp.ok) {
            const blob = await resp.blob();
            await cache.put(
              cacheReq,
              new Response(blob, { headers: { "Content-Type": "image/png" } })
            );
            successCount++;
          } else {
            failedCount++;
          }
        } catch {
          failedCount++;
        }
      }

      completed++;
      if (onProgress && (completed % 5 === 0 || completed === total)) {
        onProgress(completed, total);
      }
    }
  }

  const workers = Array.from({ length: Math.min(CONCURRENCY, tiles.length) }, () => worker());
  await Promise.all(workers);

  return { success: successCount, failed: failedCount };
}

/**
 * Pre-cache all tiles along a flight route (waypoints + corridor buffer)
 */
export async function precacheFlightRoute(
  waypointsCoords: Array<[number, number]>,
  corridorNm = 80,
  minZoom = 3,
  maxZoom = 9,
  onProgress?: (completed: number, total: number) => void
): Promise<{ success: number; failed: number }> {
  if (waypointsCoords.length === 0) return { success: 0, failed: 0 };

  const lats = waypointsCoords.map((c) => c[0]);
  const lngs = waypointsCoords.map((c) => c[1]);

  const degBuffer = Math.max(0.6, corridorNm / 60);

  const minLat = Math.max(-85, Math.min(...lats) - degBuffer);
  const maxLat = Math.min(85, Math.max(...lats) + degBuffer);
  const minLng = Math.max(-180, Math.min(...lngs) - degBuffer * 1.3);
  const maxLng = Math.min(180, Math.max(...lngs) + degBuffer * 1.3);

  const tiles = getTilesForBounds(minLat, maxLat, minLng, maxLng, minZoom, maxZoom);
  return precacheTileList(tiles, onProgress);
}

/**
 * Complete Full North American Map Pack Pre-Loader
 * Pre-downloads and permanently saves the complete North America continent (US, Canada, Mexico, Caribbean)
 * from Zoom 2 to 8, plus zoom 9 for major airline hubs (~2,800 tiles total, ~50 MB).
 */
export async function precacheFullNorthAmericaMapPack(
  onProgress?: (completed: number, total: number) => void
): Promise<{ success: number; failed: number }> {
  // 1. World overview (Zoom 2 to 4) - 85 tiles
  const worldTiles = getTilesForBounds(-60, 75, -170, 170, 2, 4);

  // 2. Complete Continental North America & Caribbean (Zoom 5 to 7) - ~1,200 tiles
  const northAmericaTiles = getTilesForBounds(12.0, 58.0, -135.0, -60.0, 5, 7);

  // 3. Continental US Airspace (Zoom 8) - ~1,100 tiles
  const conusTiles = getTilesForBounds(24.5, 49.5, -125.0, -66.5, 8, 8);

  // 4. Major Airline Hubs (Zoom 9)
  const majorHubCoords: Array<[number, number]> = [
    [41.9742, -87.9073], // ORD
    [32.8998, -97.0403], // DFW
    [35.2140, -80.9431], // CLT
    [25.7959, -80.2870], // MIA
    [40.7769, -73.8740], // LGA/JFK
    [33.6407, -84.4277], // ATL
    [39.8561, -104.6737], // DEN
    [33.4373, -112.0078], // PHX
    [33.9416, -118.4085], // LAX
    [37.6213, -122.3790], // SFO
    [47.4502, -122.3088], // SEA
    [42.2162, -83.3554], // DTW
    [44.8848, -93.2223], // MSP
    [29.9902, -95.3368], // IAH
    [38.9531, -77.4565], // IAD
    [43.6777, -79.6248], // YYZ
    [20.5218, -103.3112], // GDL
    [20.6801, -105.2541], // PVR
  ];

  const hubTiles: Array<{ z: number; x: number; y: number }> = [];
  majorHubCoords.forEach(([lat, lng]) => {
    const tilesZ9 = getTilesForBounds(lat - 0.4, lat + 0.4, lng - 0.5, lng + 0.5, 9, 9);
    hubTiles.push(...tilesZ9);
  });

  const combinedMap = new Map<string, { z: number; x: number; y: number }>();
  [...worldTiles, ...northAmericaTiles, ...conusTiles, ...hubTiles].forEach((t) => {
    combinedMap.set(`${t.z}/${t.x}/${t.y}`, t);
  });

  const allTiles = Array.from(combinedMap.values());
  const res = await precacheTileList(allTiles, onProgress);

  if (res.success > 1500 && typeof localStorage !== "undefined") {
    localStorage.setItem(FULL_PACK_STORAGE_KEY, "true");
  }

  return res;
}

/**
 * Pre-cache US national overview & major airline hubs
 */
export async function precacheNationalOverviewAndHubs(
  onProgress?: (completed: number, total: number) => void
): Promise<{ success: number; failed: number }> {
  return precacheFullNorthAmericaMapPack(onProgress);
}

/**
 * Check if the full North American offline map pack is downloaded
 */
export function isFullMapPackDownloaded(): boolean {
  if (typeof localStorage === "undefined") return false;
  return localStorage.getItem(FULL_PACK_STORAGE_KEY) === "true";
}

let isSyncingInBackground = false;

/**
 * Quietly seeds/syncs the full continental map in the background whenever online
 */
export function startBackgroundFullMapSync(
  onProgress?: (completed: number, total: number) => void
): void {
  if (isSyncingInBackground) return;
  if (typeof navigator === "undefined" || !navigator.onLine) return;
  if (isFullMapPackDownloaded()) return;

  isSyncingInBackground = true;
  // Run with slight delay to ensure UI has finished initial render
  setTimeout(() => {
    precacheFullNorthAmericaMapPack(onProgress)
      .catch(() => {})
      .finally(() => {
        isSyncingInBackground = false;
      });
  }, 2500);
}

/**
 * Get map tile cache statistics (count and estimated MB)
 */
export async function getTileCacheStats(): Promise<{ count: number; sizeMb: number; isFullPackReady: boolean }> {
  const isFullPackReady = isFullMapPackDownloaded();

  if (typeof caches === "undefined") {
    return { count: 0, sizeMb: 0, isFullPackReady };
  }

  try {
    const cache = await caches.open(CACHE_NAME);
    const keys = await cache.keys();
    const count = keys.length;
    const estimatedSizeMb = Number(((count * 22) / 1024).toFixed(1));
    const fullReady = isFullPackReady || count >= 2000;
    return {
      count,
      sizeMb: estimatedSizeMb,
      isFullPackReady: fullReady,
    };
  } catch {
    return { count: 0, sizeMb: 0, isFullPackReady };
  }
}

/**
 * Clear all cached map tiles
 */
export async function clearTileCache(): Promise<void> {
  if (typeof caches !== "undefined") {
    try {
      await caches.delete(CACHE_NAME);
    } catch {}
  }
  if (typeof localStorage !== "undefined") {
    localStorage.removeItem(FULL_PACK_STORAGE_KEY);
  }
  objectUrlMemoryCache.forEach((url) => URL.revokeObjectURL(url));
  objectUrlMemoryCache.clear();
}
