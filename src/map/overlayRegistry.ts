import type { OverlayConfig } from "../types";

// Color per PLA branch (used both in overlayRegistry paint and FeatureInfoPanel)
export const PLA_TYPE_COLORS: Record<string, string> = {
  PLAAF:  "#f59e0b",  // amber — air force
  PLAN:   "#3b82f6",  // blue  — navy
  PLARF:  "#ef4444",  // red   — rocket force
  PLAGF:  "#22c55e",  // green — ground force
  HQ:     "#d946ef",  // purple — command HQ
  RADAR:  "#06b6d4",  // cyan  — radar / EW
};

const PLA_COLOR_EXPR = [
  "match", ["get", "type"],
  "PLAAF",  "#f59e0b",
  "PLAN",   "#3b82f6",
  "PLARF",  "#ef4444",
  "PLAGF",  "#22c55e",
  "HQ",     "#d946ef",
  "RADAR",  "#06b6d4",
  "#9ca3af",
];

export const OVERLAY_REGISTRY: OverlayConfig[] = [

  // ── PLA Military Bases (OSINT) ──
  {
    id: "plaBases",
    sourceUrl: "./geo/pla_bases.geojson",
    sourceId: "pla-bases",
    layers: [
      {
        suffix: "glow",
        type: "circle",
        paint: () => ({
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 4, 8, 8, 14, 12, 20],
          "circle-color": PLA_COLOR_EXPR,
          "circle-blur": 1,
          "circle-opacity": 0.2,
        }),
      },
      {
        suffix: "core",
        type: "circle",
        paint: () => ({
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 4, 3.5, 8, 5.5, 12, 8],
          "circle-color": PLA_COLOR_EXPR,
          "circle-stroke-width": 1.5,
          "circle-stroke-color": "rgba(255,255,255,0.55)",
          "circle-opacity": 0.92,
        }),
      },
      {
        suffix: "icon",
        type: "symbol",
        layout: {
          "text-field": [
            "match", ["get", "type"],
            "PLAAF", "✈",
            "PLAN",  "⚓",
            "PLARF", "↑",
            "PLAGF", "⊕",
            "HQ",    "★",
            "RADAR", "◎",
            "●",
          ],
          "text-size": ["interpolate", ["linear"], ["zoom"], 4, 10, 8, 14, 12, 19],
          "text-allow-overlap": true,
          "text-ignore-placement": true,
          "text-font": ["literal", ["Arial Unicode MS Regular", "Open Sans Regular"]],
        },
        paint: () => ({
          "text-color": PLA_COLOR_EXPR,
          "text-halo-color": "rgba(0,0,0,0.9)",
          "text-halo-width": 1.5,
          "text-opacity": 1,
        }),
      },
      {
        suffix: "label",
        type: "symbol",
        minzoom: 7,
        layout: {
          "text-field": ["get", "name_en"],
          "text-size": ["interpolate", ["linear"], ["zoom"], 7, 9, 10, 11, 13, 12],
          "text-offset": [0, 1.4],
          "text-anchor": "top",
          "text-font": ["literal", ["Open Sans Regular", "Arial Unicode MS Regular"]],
          "text-optional": true,
        },
        paint: () => ({
          "text-color": PLA_COLOR_EXPR,
          "text-halo-color": "rgba(0,0,0,0.8)",
          "text-halo-width": 1.5,
          "text-opacity": 0.9,
        }),
      },
    ],
  },

  // ── Ports ──
  {
    id: "ports",
    sourceUrl: "./geo/port_polygons.geojson",
    sourceId: "port-polygons",
    layers: [
      {
        suffix: "glow",
        type: "line",
        paint: (isDark) => ({
          "line-color": isDark ? "#88bbff" : "#3a7bd5",
          "line-width": 12,
          "line-blur": 8,
          "line-opacity": isDark ? 0.07 : 0.14,
        }),
      },
      {
        suffix: "fill",
        type: "fill",
        paint: (isDark) => ({
          "fill-color": isDark ? "#ffffff" : "#4a90d9",
          "fill-opacity": isDark ? 0.07 : 0.11,
        }),
      },
      {
        suffix: "line",
        type: "line",
        paint: (isDark) => ({
          "line-color": isDark ? "#88ccff" : "#3a7bd5",
          "line-width": isDark ? 1 : 1.5,
          "line-opacity": isDark ? 0.5 : 0.6,
        }),
      },
    ],
  },

  // ── Airports (context layer) ──
  {
    id: "airports",
    sourceUrl: "./geo/airports.geojson",
    sourceId: "airport-boundaries",
    layers: [
      {
        suffix: "fill",
        type: "fill",
        paint: (isDark) => ({
          "fill-color": isDark ? "#ffffff" : "#c89520",
          "fill-opacity": isDark ? 0.06 : 0.10,
        }),
      },
      {
        suffix: "line",
        type: "line",
        paint: (isDark) => ({
          "line-color": isDark ? "#ffffff" : "#c89520",
          "line-width": isDark ? 1.2 : 1.6,
          "line-opacity": isDark ? 0.4 : 0.55,
        }),
      },
    ],
  },

  // ── Submarine Cables ──
  // cable_type: 國際幹線=blue, 海峽專線=red, 離島連接=green, 中國境內=orange, 規劃中=grey
  {
    id: "submarineCables",
    sourceUrl: "./geo/submarine_cables.geojson",
    sourceId: "submarine-cables",
    layers: [
      {
        suffix: "glow",
        type: "line",
        layout: { "line-cap": "round", "line-join": "round" },
        paint: (isDark) => ({
          "line-color": [
            "match", ["get", "cable_type"],
            "國際幹線", "#2196F3",
            "海峽專線", "#F44336",
            "離島連接", "#4CAF50",
            "中國境內", "#FF9800",
            "規劃中",   "#9E9E9E",
            "#9E9E9E",
          ],
          "line-width": 6,
          "line-blur": 5,
          "line-opacity": isDark ? 0.18 : 0.22,
        }),
      },
      {
        suffix: "line",
        type: "line",
        layout: { "line-cap": "round", "line-join": "round" },
        paint: (isDark) => ({
          "line-color": [
            "match", ["get", "cable_type"],
            "國際幹線", "#2196F3",
            "海峽專線", "#F44336",
            "離島連接", "#4CAF50",
            "中國境內", "#FF9800",
            "規劃中",   "#9E9E9E",
            "#9E9E9E",
          ],
          "line-width": ["interpolate", ["linear"], ["zoom"], 4, 1, 8, 1.5, 12, 2.5],
          "line-opacity": isDark ? 0.7 : 0.6,
        }),
      },
    ],
  },

  // ── Submarine Cable Landing Stations ──
  {
    id: "landingStations",
    sourceUrl: "./geo/landing_stations.geojson",
    sourceId: "landing-stations",
    layers: [
      {
        suffix: "glow",
        type: "circle",
        paint: (isDark) => ({
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 6, 4, 10, 8, 14, 14],
          "circle-blur": 1,
          "circle-color": [
            "match", ["get", "station_type"],
            "國際樞紐", "#2196F3",
            "區域節點", "#26c6da",
            "#9E9E9E",
          ],
          "circle-opacity": isDark ? 0.25 : 0.30,
        }),
      },
      {
        suffix: "core",
        type: "circle",
        paint: (isDark) => ({
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 6, 2, 10, 3.5, 14, 5.5],
          "circle-color": [
            "match", ["get", "station_type"],
            "國際樞紐", "#2196F3",
            "區域節點", "#26c6da",
            "#9E9E9E",
          ],
          "circle-stroke-color": isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.3)",
          "circle-stroke-width": ["interpolate", ["linear"], ["zoom"], 6, 0, 10, 0.6, 14, 1],
          "circle-opacity": isDark ? 0.9 : 0.8,
        }),
      },
    ],
  },

  // ── Maritime Zones (EEZ + Territorial Waters) ──
  // zone_type: "eez" | "territorial" | "contiguous"
  {
    id: "maritimeZones",
    sourceUrl: "./geo/maritime_zones.geojson",
    sourceId: "maritime-zones",
    layers: [
      {
        suffix: "fill",
        type: "fill",
        paint: (isDark) => ({
          "fill-color": [
            "match", ["get", "zone_type"],
            "territorial", isDark ? "#0d47a1" : "#1565c0",
            "contiguous",  isDark ? "#01579b" : "#0277bd",
            "eez",         isDark ? "#006064" : "#00838f",
            isDark ? "#006064" : "#00838f",
          ],
          "fill-opacity": [
            "match", ["get", "zone_type"],
            "territorial", 0.12,
            "contiguous",  0.07,
            "eez",         0.04,
            0.04,
          ],
        }),
      },
      {
        suffix: "line",
        type: "line",
        paint: (isDark) => ({
          "line-color": [
            "match", ["get", "zone_type"],
            "territorial", isDark ? "#42a5f5" : "#1565c0",
            "contiguous",  isDark ? "#29b6f6" : "#0277bd",
            "eez",         isDark ? "#26c6da" : "#00838f",
            isDark ? "#26c6da" : "#00838f",
          ],
          "line-width": [
            "match", ["get", "zone_type"],
            "territorial", 1.5,
            "contiguous",  1.0,
            "eez",         0.8,
            0.8,
          ],
          "line-dasharray": [
            "match", ["get", "zone_type"],
            "territorial", ["literal", [1, 0]],
            "contiguous",  ["literal", [4, 3]],
            "eez",         ["literal", [6, 4]],
            ["literal", [6, 4]],
          ],
          "line-opacity": isDark ? 0.75 : 0.65,
        }),
      },
    ],
  },

];
