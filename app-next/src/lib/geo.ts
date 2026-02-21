/**
 * Native browser GPS / Geolocation.
 * Uses navigator.geolocation (requires HTTPS or localhost in production).
 * Use for attaching location to logged events (work, break, end shift).
 * The browser will prompt for location permission on first use.
 */

export type GeoPosition = {
  lat: number;
  lng: number;
  accuracy: number; // metres
};

const DEFAULT_TIMEOUT_MS = 5000;
const DEFAULT_MAX_AGE_MS = 10000;

/** Best-effort: faster fix, shorter wait. Use when logging events so UI isn’t blocked. */
export const BEST_EFFORT_OPTIONS = {
  timeout: 2500,
  maxAge: 8000,
  highAccuracy: false,
} as const;

export function isGeoAvailable(): boolean {
  return typeof navigator !== "undefined" && "geolocation" in navigator;
}

/**
 * Get current position via browser Geolocation API.
 * Returns null if unavailable, permission denied, timeout, or error.
 * For faster logging use getCurrentPosition({ ...BEST_EFFORT_OPTIONS }).
 */
export function getCurrentPosition(options?: {
  timeout?: number;
  maxAge?: number;
  highAccuracy?: boolean;
}): Promise<GeoPosition | null> {
  if (!isGeoAvailable()) return Promise.resolve(null);
  const { timeout = DEFAULT_TIMEOUT_MS, maxAge = DEFAULT_MAX_AGE_MS, highAccuracy = true } = options ?? {};
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy ?? 0,
        });
      },
      () => resolve(null),
      { enableHighAccuracy: highAccuracy, timeout, maximumAge: maxAge }
    );
  });
}
