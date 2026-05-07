# Taiwan Strait Intelligence Dashboard

**Open-source, browser-based situational awareness for the Taiwan Strait.**

Real-time AIS vessel tracking · Live ADS-B air picture · PLA OSINT installations · ADIZ monitoring · Critical infrastructure overlay

> Built by people who care about Taiwan's future. No government affiliation. All data from open sources.

---

## Why this exists

Taiwan sits at one of the most consequential chokepoints on Earth. Understanding what moves through the Strait — ships, aircraft, missiles, data — is no longer just for analysts. It should be open, legible, and free.

This dashboard is a public intelligence layer. Every data point is sourced from open channels: AIS broadcasts, ADS-B transponders, DoD reports, CSIS China Power, OSINT satellite imagery. Nothing here is classified. Everything here should be known.

If you're a developer, GIS engineer, security researcher, or just someone who wants Taiwan to remain free — you're in the right place. **PRs welcome.**

---

## Live layers

| Layer | Source | Update cadence |
|---|---|---|
| AIS vessels (1,000+) | Supabase `get_ship_trails` | Historical trails (prev day) |
| Live ADS-B aircraft | FR24 Business API → OpenSky fallback | 30s refresh |
| PLA military installations (30) | DoD CMPR · CSIS China Power · OSINT | Static (curated) |
| ADIZ boundary + median line | ROCAF published coordinates | Static |
| PLA incursion events | ROCAF daily briefings | Manual update |
| EEZ / territorial / contiguous | UNCLOS reference | Static |
| HSR trains (position interpolated) | THSR timetable | 10s simulation |
| TRA trains (position interpolated) | TRA timetable | 10s simulation |
| Port polygons | Static GeoJSON | Static |
| Submarine cables | TeleGeography OSINT | Static |
| Cable landing stations | TeleGeography OSINT | Static |
| Airports | Static GeoJSON | Static |

### PLA installation coverage

30 verified OSINT sites across 6 branches — each with per-branch icons, threat-level assessment, and terminal-style hover intel card:

| Branch | Icon | Installations |
|---|---|---|
| PLAAF (Air Force) | ✈ | Longtian, Liancheng, Shaowu, Jinjiang, Zhangzhou, Ningbo Lishe, Zhoushan, Wenzhou, Shantou, Huizhou |
| PLAN (Navy) | ⚓ | Xiamen Naval Base, Fuzhou Mawei, Xiangshan Submarine Base, Zhoushan Naval Base, Shanwei, Ningde |
| PLARF (Rocket Force) | ↑ | Base 61 (Huangshan), Base 62 (Leping), Dongshan Missile Unit, Zhangpu Coastal Defense |
| PLAGF (Ground Force) | ⊕ | 73rd Group Army (Xiamen), 72nd Group Army (Huzhou), 71st Group Army (Hefei), Changle Amphibious Staging |
| Theater HQ | ★ | Eastern Theater Command, Sansha Garrison (Woody Island) |
| SIGINT / EW | ◎ | Pingtan Island, Dongshan EW, Xiapu Tracking, Fuqing ISR |

---

## Quick start

```bash
npm install
cp .env.example .env
# set VITE_MAPBOX_TOKEN + VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY
npm run dev   # http://localhost:3721
```

Optional: add `VITE_FR24_API_TOKEN` for FlightRadar24 Business API (richer ADS-B). Falls back to OpenSky if unset.

---

## Architecture

### Rendering — two paths

**Declarative (static GeoJSON)** — `src/map/overlayRegistry.ts` defines all static layers as config objects. Adding a new overlay: (1) key in `LayerVisibility`, (2) `OverlayConfig` entry, (3) toggle row in `LayerSidebar`. No other wiring needed.

**Imperative (dynamic)** — Direct Mapbox source/layer management for data that updates on a timer: ADS-B, HSR, TRA. Hooks (`useOpenSkyLayer`, `useHsrLayer`, `useTraLayer`) own the full lifecycle. Ships render via Three.js `InstancedMesh` + trails in a Mapbox `CustomLayerInterface`.

### Time

`src/state/timeStore.ts` — singleton outside React. App advances it every 5s in live mode. Dynamic layers subscribe via `subscribeThrottled(ms, cb)`. **Never** put current time in React `useEffect` deps.

### File layout

```
src/
  App.tsx                   # root — wires all hooks
  types/index.ts            # LayerVisibility, VesselCategory
  state/timeStore.ts        # singleton time source
  data/
    openSkyLoader.ts        # ADS-B fetch + GeoJSON builder
    fr24Loader.ts           # FR24 Business API adapter
    hsrLoader.ts            # THSR schedule interpolation
    traLoader.ts            # TRA schedule interpolation
    adizLoader.ts           # ADIZ boundary / incursions
    shipLoader.ts           # Supabase AIS trails
  hooks/
    useOpenSkyLayer.ts      # ADS-B 30s poll
    useAdizLayer.ts         # ADIZ + median line layers
    useHsrLayer.ts          # HSR position update loop
    useTraLayer.ts          # TRA position update loop
    usePlaPopup.ts          # hover intel card for PLA bases
    useShipData.ts          # LRU 7-day AIS cache
  map/
    overlayRegistry.ts      # all declarative overlay configs
    overlayManager.ts       # add / update / show / hide
    customLayer.ts          # Three.js → Mapbox CustomLayer
  three/
    ShipScene.ts            # InstancedMesh + trails
public/geo/
  pla_bases.geojson         # 30 PLA OSINT installations
  adiz_boundary.geojson     # Taiwan ADIZ perimeter
  adiz_median_line.geojson  # Taiwan Strait median line
  adiz_incursions.geojson   # PLA crossing event log
  maritime_zones.geojson    # EEZ + territorial + contiguous
  submarine_cables.geojson  # cable routes by type
  landing_stations.geojson  # cable landing points
  hsr_track.geojson         # THSR track geometry
  tra_track.geojson         # TRA Western Trunk + East Coast
```

---

## Contributing

**This project exists because Taiwan's security deserves open-source attention. Every PR matters.**

### What we need

The clearest ways to help — roughly in priority order:

| Area | What's needed |
|---|---|
| **PLA data** | More OSINT installations — additional PLARF brigades, PLAN bases in Guangdong/Hainan, new PLAAF expansion sites |
| **Live AIS** | Integration with MarineTraffic / VT Explorer AIS stream (paid API) for real-time vessel positions |
| **ADIZ incursions** | Automated parser for ROCAF daily briefings to keep `adiz_incursions.geojson` current |
| **GeoJSON quality** | Better port polygons, updated cable routes, airport boundary accuracy |
| **Mobile** | Responsive layout for the sidebar and info panels |
| **Accessibility** | Color-blind friendly palette option for vessel categories |
| **Performance** | Ship trail LOD — reduce Three.js geometry at zoom < 6 |

### Ground rules

1. **OSINT only.** All data must be sourced from public, unclassified material. DoD CMPR, CSIS China Power, commercial satellite imagery analysis, government press releases, official flight tracking. If you can't cite it, don't add it.

2. **No speculation.** If a PLA base location is approximate, say so in the `notes` field. Wrong coordinates are worse than no coordinates.

3. **Accuracy over drama.** Threat levels and labels should reflect open-source assessments, not political temperature. The map speaks for itself.

4. **One feature, one PR.** Keep changes focused so reviewers can evaluate data quality independently from code quality.

5. **TypeScript strict.** Run `npx tsc -b` before opening a PR. Zero type errors required.

6. **Attribution.** If you add a GeoJSON feature, include the source in the `notes` property or your PR description.

### Adding a PLA installation

Edit `public/geo/pla_bases.geojson`. Each feature needs:

```json
{
  "type": "Feature",
  "geometry": { "type": "Point", "coordinates": [LNG, LAT] },
  "properties": {
    "type": "PLAAF | PLAN | PLARF | PLAGF | HQ | RADAR",
    "name_en": "English name",
    "name_zh": "中文名稱",
    "unit": "PLA unit designation",
    "dist_km": 350,
    "notes": "Capability notes. Source: DoD CMPR 2023 / CSIS China Power."
  }
}
```

### Adding a new map layer

Follow the enforced order in `CLAUDE.md` (rule #5):
1. `src/types/index.ts` — add key to `LayerVisibility`
2. `src/data/xxxLoader.ts` — data fetcher
3. `src/hooks/useXxxLayer.ts` — layer lifecycle hook
4. `src/map/overlayRegistry.ts` or custom layer file
5. `src/components/LayerSidebar.tsx` — toggle + `LAYER_COLORS` entry
6. `src/App.tsx` — wire the hook
7. `src/hooks/useLayerVisibility.ts` — set default visibility

Or use the scaffold command: `/new-layer <name>` in Claude Code.

---

## Tech stack

React 19 · TypeScript · Vite · Mapbox GL JS v3 · Three.js r172 · Supabase · OpenSky Network · FR24 Business API

---

## Related repos

| Repo | Role |
|---|---|
| `gis-platform` | Supabase migrations, `get_ship_trails` RPC, pg_cron jobs |
| `data-collectors` | AIS + IoT collector scripts, SQL pre-aggregate templates |

---

## Data sources

| Dataset | Source |
|---|---|
| PLA installations | DoD China Military Power Report · CSIS China Power Project · OSINT |
| ADIZ boundary | ROCAF official coordinates |
| PLA incursions | ROCAF daily air defense briefings |
| AIS vessel tracks | Collected via open AIS feed → Supabase |
| ADS-B flights | OpenSky Network (open) / FlightRadar24 (commercial) |
| Maritime zones | UNCLOS reference boundaries |
| Submarine cables | TeleGeography (public data) |
| Rail schedules | THSR / TRA published timetables |

---

*台灣加油。* 🇹🇼
