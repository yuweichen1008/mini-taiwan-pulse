import { loadingRegistry } from "../lib/loadingRegistry";

export interface AircraftState {
  icao24: string;
  callsign: string;
  originCountry: string;
  longitude: number;
  latitude: number;
  baroAltitude: number;
  velocity: number;
  trueTrack: number;
  onGround: boolean;
}

// Taiwan bounding box: 21.5–26.5°N, 119.0–124.5°E
const OPENSKY_URL =
  "https://opensky-network.org/api/states/all?lamin=21.5&lamax=26.5&lomin=119.0&lomax=124.5";

export async function fetchOpenSkyTaiwan(): Promise<AircraftState[]> {
  loadingRegistry.start("live-adsb:fetch", "即時航空 ADS-B");
  try {
    const res = await fetch(OPENSKY_URL, { signal: AbortSignal.timeout(12000) });
    if (!res.ok) throw new Error(`OpenSky API ${res.status}`);
    const json = await res.json() as { states: unknown[][] | null };
    return (json.states ?? [])
      .filter((s) => s[5] != null && s[6] != null && !s[8])
      .map((s) => ({
        icao24: String(s[0] ?? ""),
        callsign: String(s[1] ?? "").trim(),
        originCountry: String(s[2] ?? ""),
        longitude: Number(s[5]),
        latitude: Number(s[6]),
        baroAltitude: Number(s[7] ?? 0),
        velocity: Number(s[9] ?? 0),
        trueTrack: Number(s[10] ?? 0),
        onGround: Boolean(s[8]),
      }));
  } finally {
    loadingRegistry.end("live-adsb:fetch");
  }
}

export function altitudeToColor(alt: number, isDark: boolean): string {
  if (alt <= 0) return isDark ? "#888888" : "#666666";
  if (alt < 3000) return "#4fc3f7";
  if (alt < 9000) return "#ffd700";
  return "#ff4444";
}

export function buildOpenSkyGeoJSON(aircraft: AircraftState[], isDark: boolean): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: aircraft.map((a) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [a.longitude, a.latitude] },
      properties: {
        icao24: a.icao24,
        callsign: a.callsign || a.icao24,
        originCountry: a.originCountry,
        baroAltitude: Math.round(a.baroAltitude),
        velocityKmh: Math.round(a.velocity * 3.6),
        trueTrack: Math.round(a.trueTrack),
        isTaiwan: a.originCountry === "Taiwan",
        color: a.originCountry === "Taiwan"
          ? "#00e5ff"
          : altitudeToColor(a.baroAltitude, isDark),
      },
    })),
  };
}
