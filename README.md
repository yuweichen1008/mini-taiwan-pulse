# Taiwan Maritime Pulse

Real-time maritime intelligence dashboard for the Taiwan Strait.

AIS vessel tracking · ADS-B air picture · ADIZ monitoring · submarine cable infrastructure

## What it shows

| Layer | Source | Rendering |
|---|---|---|
| AIS vessels | Supabase `get_ship_trails` | Three.js InstancedMesh + trails |
| ADS-B aircraft | OpenSky Network (30s refresh) | Mapbox GL circles |
| ADIZ boundary + median line | Static GeoJSON | Mapbox GL line |
| PLA incursion events | Static GeoJSON | Mapbox GL circles |
| EEZ / territorial waters | Static GeoJSON | Mapbox GL fill + line |
| Port polygons | Static GeoJSON | Mapbox GL fill + glow |
| Submarine cables | Static GeoJSON | Mapbox GL line (type-colored) |
| Cable landing stations | Static GeoJSON | Mapbox GL circles |
| Airports | Static GeoJSON | Mapbox GL fill (context) |

## Vessel Categories

Vessels are colored by AIS `vessel_type` field:

| Category | Color | AIS Codes |
|---|---|---|
| Military | Red `#ff4444` | 35 |
| Coast Guard | Orange `#ff8c00` | 55 |
| Tanker / LNC | Amber `#ffd700` | 80–89 (petroleum, LNG, chemical) |
| Cargo | Cyan `#4fc3f7` | 70–79 |
| Passenger / Cruise | Silver `#e0e0e0` | 60–69 |
| Fishing | Green `#66bb6a` | 30 |
| Tug / Work | Purple `#ab47bc` | 52 |
| Other | Grey `#607d8b` | all else |

Each category can be toggled independently in the sidebar.

## Dev

```bash
npm install
cp .env.example .env   # set VITE_MAPBOX_TOKEN + VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY
npm run dev            # http://localhost:3721
npm run build          # tsc -b + vite build
npx tsc -b             # type-check only (required before commit)
```

## Architecture

### Rendering

Two parallel rendering paths:

**Declarative (static GeoJSON)** — `src/map/overlayRegistry.ts` defines all static layers as config objects. `overlayManager.ts` handles add/remove/theme-update. Adding a new static overlay requires only: (1) a key in `LayerVisibility`, (2) an `OverlayConfig` entry, (3) a toggle row in `LayerSidebar`.

**Imperative (Three.js)** — `ShipScene.ts` renders vessels as `InstancedMesh` with per-instance color by category + `LineSegments` trails. Wrapped as a Mapbox `CustomLayerInterface` in `customLayer.ts`. The scene reads time from `timeStore.getTime()` directly in the RAF loop — no React re-renders in the hot path.

### Time store

`src/state/timeStore.ts` is a singleton outside React. In live mode, `App.tsx` advances it every 5 seconds with `setInterval`. The ship layer reads it synchronously from the Mapbox render callback. No `currentTime` in React deps.

### Loading

All Supabase calls must be wrapped with `withLoading(id, label, rpc(...))` from `src/lib/loadingRegistry.ts`. The `LoadingIndicator` component subscribes via `useSyncExternalStore`.

### Data

Ship tracks come from Supabase `get_ship_trails` RPC → pre-aggregated `realtime.ship_trails_daily` table (pg_cron refresh every 10 min). The hook `useShipData` loads the most recent available day on mount and caches up to 7 days (LRU).

```
src/
  App.tsx                   # maritime app root
  types/index.ts            # VesselCategory, LayerVisibility, etc.
  state/timeStore.ts        # singleton time source (no React)
  lib/loadingRegistry.ts    # global loading task store
  data/
    shipLoader.ts           # Supabase RPC + GPS anomaly filter
    openSkyLoader.ts        # OpenSky ADS-B fetch + GeoJSON builder
    adizLoader.ts           # ADIZ boundary / median / incursions
  hooks/
    useShipData.ts          # LRU 7-day cache, load + prefetch
    useOpenSkyLayer.ts      # ADS-B 30s poll + Mapbox layer lifecycle
    useAdizLayer.ts         # ADIZ boundary + incursion layers
    useLayerVisibility.ts   # maritime defaults (ships + ADIZ + cables on)
    useMapInteraction.ts    # feature click → FeatureInfoPanel
  map/
    MapView.tsx             # Mapbox init + overlay lifecycle
    overlayRegistry.ts      # declarative static layer configs
    overlayManager.ts       # add / update / show/hide overlays
    customLayer.ts          # Mapbox CustomLayer wrapping ShipScene
    cameraPresets.ts        # strait / port / scene presets
  three/
    ShipScene.ts            # InstancedMesh (per-category color) + trails
  components/
    LayerSidebar.tsx        # vessel category toggles + live counts
    FeatureInfoPanel.tsx    # click-to-inspect for cables, ports, zones
    StyleSelector.tsx       # 6 Mapbox styles
    LoadingIndicator.tsx    # global loading HUD
    LoadingScreen.tsx       # initial load screen
    InfoModal.tsx           # about / data sources
public/geo/
  adiz_boundary.geojson     # Taiwan ADIZ perimeter
  adiz_median_line.geojson  # Taiwan Strait median line
  adiz_incursions.geojson   # PLA incursion event points
  maritime_zones.geojson    # EEZ (200nm) + territorial (12nm) + contiguous (24nm)
  port_polygons.geojson     # major port boundaries
  submarine_cables.geojson  # cable routes (type-colored)
  landing_stations.geojson  # cable landing points
  airports.geojson          # airports (context layer)
```

## Related repos

| Repo | Path | Role |
|---|---|---|
| gis-platform | `../gis-platform` | Supabase migrations + `get_ship_trails` RPC |
| data-collectors | `../data-collectors` | AIS collector + pg_cron SQL templates |

## Tech stack

React 19 · TypeScript · Vite · Mapbox GL JS v3 · Three.js r172 · Supabase · OpenSky Network
