import { loadingRegistry } from "../lib/loadingRegistry";

// Taiwan bounding box: 21.5–26.5°N, 119.0–124.5°E
const BOUNDS = "21.5,26.5,119.0,124.5";

// FR24 Business API v1 — requires VITE_FR24_API_TOKEN in .env
// Doc: https://fr24api.flightradar24.com (Bearer auth, Accept-Version: v1)
// Note: browser calls require CORS to be enabled on FR24's end (contact FR24 support if blocked)
const FR24_URL = `https://fr24api.flightradar24.com/api/live/flight-positions/full?bounds=${BOUNDS}`;

export interface Fr24Aircraft {
  id: string;
  callsign: string;
  origin: string;        // IATA origin airport
  destination: string;   // IATA destination airport
  registration: string;
  icao: string;          // aircraft type ICAO (e.g. B738)
  longitude: number;
  latitude: number;
  altitude: number;      // feet
  speed: number;         // knots
  track: number;         // degrees from north
  onGround: boolean;
}

// Maps FR24 API response shape → Fr24Aircraft
// The field names below match FR24 Business API v1 documented response.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseRow(r: any): Fr24Aircraft {
  return {
    id:           String(r.fr24_id ?? r.id ?? ""),
    callsign:     String(r.callsign ?? r.flight ?? "").trim(),
    origin:       String(r.origin ?? ""),
    destination:  String(r.destination ?? ""),
    registration: String(r.registration ?? ""),
    icao:         String(r.aircraft_icao ?? r.type ?? ""),
    longitude:    Number(r.lon ?? r.lng ?? r.longitude ?? 0),
    latitude:     Number(r.lat ?? r.latitude ?? 0),
    altitude:     Number(r.alt ?? r.altitude ?? 0),
    speed:        Number(r.speed ?? r.gspeed ?? 0),
    track:        Number(r.track ?? r.heading ?? 0),
    onGround:     Boolean(r.on_ground ?? r.ground ?? false),
  };
}

export function hasFr24Token(): boolean {
  return Boolean(import.meta.env.VITE_FR24_API_TOKEN);
}

export async function fetchFr24Taiwan(): Promise<Fr24Aircraft[]> {
  const token = import.meta.env.VITE_FR24_API_TOKEN as string | undefined;
  if (!token) throw new Error("VITE_FR24_API_TOKEN not set");

  loadingRegistry.start("live-adsb:fetch", "即時航空 ADS-B (FR24)");
  try {
    const res = await fetch(FR24_URL, {
      headers: {
        "Authorization": `Bearer ${token}`,
        "Accept-Version": "v1",
        "Accept": "application/json",
      },
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) throw new Error(`FR24 API ${res.status}: ${res.statusText}`);
    const json = await res.json() as { data?: unknown[] } | unknown[];
    // Support both { data: [...] } and [...] response shapes
    const rows = Array.isArray(json) ? json : (json as { data?: unknown[] }).data ?? [];
    return rows
      .map(parseRow)
      .filter((a) => !a.onGround && a.latitude !== 0 && a.longitude !== 0);
  } finally {
    loadingRegistry.end("live-adsb:fetch");
  }
}
