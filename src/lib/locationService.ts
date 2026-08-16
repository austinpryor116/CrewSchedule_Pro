import { Geolocation, Position } from "@capacitor/geolocation";

export interface UserLocationData {
  lat: number;
  lng: number;
  accuracy: number;
  altitude: number | null;
  speed: number | null;
  heading: number | null;
  timestamp: number;
}

const LAST_GPS_KEY = "csp_last_known_gps";

export function getLastSavedUserPosition(): UserLocationData | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(LAST_GPS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.lat === "number" && typeof parsed.lng === "number") {
        return parsed;
      }
    }
  } catch (e) {}
  return null;
}

export function saveUserPosition(pos: UserLocationData) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LAST_GPS_KEY, JSON.stringify(pos));
  } catch (e) {}
}

export async function requestLocationPermissions(): Promise<boolean> {
  try {
    const status = await Geolocation.checkPermissions();
    if (status.location === "granted") return true;

    try {
      const res = await Geolocation.requestPermissions();
      if (res.location === "granted") return true;
    } catch (reqErr) {
      console.warn("Geolocation.requestPermissions failed:", reqErr);
    }
  } catch (e) {
    console.warn("Capacitor Geolocation check failed:", e);
  }

  // Fallback to browser check
  if (typeof navigator !== "undefined" && "geolocation" in navigator) {
    return true;
  }
  return false;
}

export async function getCurrentUserPosition(): Promise<UserLocationData | null> {
  // 1. Try Native Capacitor Plugin first with a 6-second timeout
  try {
    const pos = await Geolocation.getCurrentPosition({
      enableHighAccuracy: true,
      timeout: 8000,
      maximumAge: 10000,
    });
    const formatted = formatPosition(pos);
    saveUserPosition(formatted);
    return formatted;
  } catch (capErr) {
    console.warn("Capacitor Geolocation getCurrentPosition failed, falling back to navigator.geolocation:", capErr);
  }

  // 2. Web / Android WebView Standard Geolocation Fallback
  if (typeof navigator !== "undefined" && navigator.geolocation) {
    try {
      const webPos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 8000,
          maximumAge: 10000,
        });
      });
      const formatted: UserLocationData = {
        lat: webPos.coords.latitude,
        lng: webPos.coords.longitude,
        accuracy: webPos.coords.accuracy,
        altitude: webPos.coords.altitude,
        speed: webPos.coords.speed,
        heading: webPos.coords.heading,
        timestamp: webPos.timestamp,
      };
      saveUserPosition(formatted);
      return formatted;
    } catch (webErr) {
      console.warn("Standard navigator.geolocation failed:", webErr);
    }
  }

  // 3. Fallback to cached position if available
  return getLastSavedUserPosition();
}

export function watchUserPosition(
  onPosition: (pos: UserLocationData) => void,
  onError?: (err: any) => void
): () => void {
  let watchId: string | number | null = null;
  let isCancelled = false;

  // 1. Start Capacitor Watch
  Geolocation.watchPosition(
    {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 3000,
    },
    (position, err) => {
      if (isCancelled) return;
      if (err) {
        if (onError) onError(err);
        return;
      }
      if (position) {
        const formatted = formatPosition(position);
        saveUserPosition(formatted);
        onPosition(formatted);
      }
    }
  )
    .then((id) => {
      watchId = id;
    })
    .catch(() => {
      // 2. Fallback to Web Watch
      if (typeof navigator !== "undefined" && navigator.geolocation) {
        const navWatchId = navigator.geolocation.watchPosition(
          (webPos) => {
            if (isCancelled) return;
            const formatted: UserLocationData = {
              lat: webPos.coords.latitude,
              lng: webPos.coords.longitude,
              accuracy: webPos.coords.accuracy,
              altitude: webPos.coords.altitude,
              speed: webPos.coords.speed,
              heading: webPos.coords.heading,
              timestamp: webPos.timestamp,
            };
            saveUserPosition(formatted);
            onPosition(formatted);
          },
          (webErr) => {
            if (onError) onError(webErr);
          },
          { enableHighAccuracy: true, timeout: 15000, maximumAge: 3000 }
        );
        watchId = navWatchId;
      }
    });

  return () => {
    isCancelled = true;
    if (watchId !== null) {
      if (typeof watchId === "string") {
        Geolocation.clearWatch({ id: watchId }).catch(() => {});
      } else if (typeof navigator !== "undefined" && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchId);
      }
    }
  };
}

function formatPosition(pos: Position): UserLocationData {
  return {
    lat: pos.coords.latitude,
    lng: pos.coords.longitude,
    accuracy: pos.coords.accuracy,
    altitude: pos.coords.altitude ?? null,
    speed: pos.coords.speed ?? null,
    heading: pos.coords.heading ?? null,
    timestamp: pos.timestamp,
  };
}
