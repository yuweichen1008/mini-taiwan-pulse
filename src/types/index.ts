// ── Shared primitives ──

/** [lat, lng, alt_m, unix_ts] */
export type TrailPoint = [number, number, number, number];

// ── Vessels (AIS) ──

/**
 * AIS vessel_type numeric code → display category.
 * Grouped for UI filtering; raw codes preserved in Ship.vessel_type.
 */
export type VesselCategory =
  | "military"    // 35 — naval warships
  | "coastguard"  // 55 — coast guard / law enforcement
  | "cargo"       // 70-79 — general cargo
  | "tanker"      // 80-89 — petroleum / LNG / chemical (LNC)
  | "passenger"   // 60-69 — cruise / passenger ferries
  | "fishing"     // 30 — fishing vessels
  | "tug"         // 52 — tugs / workboats
  | "other";      // everything else

export function getVesselCategory(vessel_type: number): VesselCategory {
  if (vessel_type === 35) return "military";
  if (vessel_type === 55) return "coastguard";
  if (vessel_type >= 60 && vessel_type <= 69) return "passenger";
  if (vessel_type >= 70 && vessel_type <= 79) return "cargo";
  if (vessel_type >= 80 && vessel_type <= 89) return "tanker";
  if (vessel_type === 30) return "fishing";
  if (vessel_type === 52) return "tug";
  return "other";
}

/** Color per category — dark theme */
export const VESSEL_COLORS: Record<VesselCategory, string> = {
  military:   "#ff4444",  // red
  coastguard: "#ff8c00",  // orange
  cargo:      "#4fc3f7",  // cyan-blue
  tanker:     "#ffd700",  // amber
  passenger:  "#e0e0e0",  // silver-white
  fishing:    "#66bb6a",  // green
  tug:        "#ab47bc",  // purple
  other:      "#607d8b",  // blue-grey
};

/** Color per category — light theme */
export const VESSEL_COLORS_LIGHT: Record<VesselCategory, string> = {
  military:   "#cc0000",
  coastguard: "#cc5500",
  cargo:      "#0277bd",
  tanker:     "#f57f17",
  passenger:  "#424242",
  fishing:    "#2e7d32",
  tug:        "#6a1b9a",
  other:      "#455a64",
};

export interface Ship {
  mmsi: string;
  vessel_type: number;
  path: TrailPoint[];
}

export interface ShipData {
  metadata: {
    date: string;
    ship_count: number;
    time_range: [number, number];
  };
  ships: Ship[];
}

// ── Aircraft (ADS-B / OpenSky) ──

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

// ── ADIZ ──

export interface AdizIncursion {
  date: string;
  aircraftCount: number;
  aircraftTypes: string;
  event: string;
  description: string;
  sourceUrl: string;
  lon: number;
  lat: number;
}

// ── Layer visibility ──

export interface LayerVisibility {
  // vessels
  ships: boolean;
  // vessel category filters (all default on)
  showMilitary: boolean;
  showCG: boolean;
  showCargo: boolean;
  showTanker: boolean;
  showPassenger: boolean;
  showFishing: boolean;
  showTug: boolean;
  showOther: boolean;
  // aircraft
  liveAdsb: boolean;
  // ADIZ / maritime zones
  adizBoundary: boolean;
  adizIncursions: boolean;
  maritimeZones: boolean;   // EEZ + territorial waters
  // infrastructure (static GeoJSON)
  ports: boolean;
  airports: boolean;
  submarineCables: boolean;
  landingStations: boolean;
  // intelligence / threat
  plaBases: boolean;
  // rail
  hsr: boolean;
  tra: boolean;
}

// ── Map styles ──

export interface MapStyle {
  id: string;
  name: string;
  url: string;
}

// ── Camera presets ──

export interface CameraPreset {
  name: string;
  id: string;
  category: "overview" | "strait" | "port" | "scene";
  center: [number, number];
  zoom: number;
  pitch: number;
  bearing: number;
  time?: number;
  speed?: number;
  autoPlay?: boolean;
  description?: string;
  layers?: Partial<LayerVisibility>;
}

// ── Overlay config (for overlayRegistry / overlayManager) ──

export interface LayerSpec {
  suffix: string;
  type: string;
  minzoom?: number;
  layout?: Record<string, unknown>;
  paint: (isDark: boolean, params?: Record<string, number>) => Record<string, unknown>;
}

export interface OverlayConfig {
  id: keyof LayerVisibility;
  sourceUrl: string;
  sourceId: string;
  filter?: unknown[];
  rebuildOnParamChange?: string[];
  layers: LayerSpec[];
}

// ── UI ──

export type ExpandableLayerKey = keyof LayerVisibility;

export interface MapClickFeature {
  layerId: string;
  properties: Record<string, unknown>;
  lngLat: [number, number];
}
