const REFRESH_MS = 30_000;

import { useEffect, useRef } from "react";
import type { Map as MapboxMap, CircleLayer, SymbolLayer, GeoJSONSource } from "mapbox-gl";
import {
  fetchOpenSkyTaiwan,
  buildOpenSkyGeoJSON,
  type AircraftState,
} from "../data/openSkyLoader";
import { fetchFr24Taiwan, hasFr24Token, type Fr24Aircraft } from "../data/fr24Loader";
import { keepLoadingUntilMapIdle } from "../lib/loadingRegistry";

const SOURCE_ID = "live-adsb-src";
const LAYER_CIRCLE = "live-adsb-circle";
const LAYER_LABEL = "live-adsb-label";

function ensureLayers(map: MapboxMap, isDark: boolean) {
  if (!map.getSource(SOURCE_ID)) {
    map.addSource(SOURCE_ID, {
      type: "geojson",
      data: { type: "FeatureCollection", features: [] },
    });
  }
  if (!map.getLayer(LAYER_CIRCLE)) {
    map.addLayer({
      id: LAYER_CIRCLE,
      type: "circle",
      source: SOURCE_ID,
      paint: {
        "circle-radius": [
          "interpolate", ["linear"], ["zoom"],
          5, 3, 8, 4, 11, 6, 14, 8,
        ],
        "circle-color": ["get", "color"],
        "circle-stroke-width": 1,
        "circle-stroke-color": isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.3)",
        "circle-opacity": 0.9,
      },
    } as CircleLayer);
  }
  if (!map.getLayer(LAYER_LABEL)) {
    map.addLayer({
      id: LAYER_LABEL,
      type: "symbol",
      source: SOURCE_ID,
      minzoom: 7,
      layout: {
        "text-field": ["get", "callsign"],
        "text-size": 9,
        "text-offset": [0, 1.2],
        "text-anchor": "top",
        "text-font": ["literal", ["Open Sans Regular", "Arial Unicode MS Regular"]],
      },
      paint: {
        "text-color": isDark ? "#ffffff" : "#111111",
        "text-halo-color": isDark ? "rgba(0,0,0,0.7)" : "rgba(255,255,255,0.7)",
        "text-halo-width": 1,
      },
    } as SymbolLayer);
  }
}

function removeLayers(map: MapboxMap) {
  for (const id of [LAYER_LABEL, LAYER_CIRCLE]) {
    if (map.getLayer(id)) map.removeLayer(id);
  }
  if (map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID);
}

// Normalise FR24 aircraft to the same shape as OpenSky for rendering
function fr24ToOpenSky(a: Fr24Aircraft, isDark: boolean): AircraftState & { _color?: string } {
  return {
    icao24:        a.id,
    callsign:      a.callsign || a.registration,
    originCountry: "",
    longitude:     a.longitude,
    latitude:      a.latitude,
    baroAltitude:  a.altitude * 0.3048,  // ft → m
    velocity:      a.speed * 0.514444,   // kn → m/s
    trueTrack:     a.track,
    onGround:      a.onGround,
    _color:        isDark ? "#ffd54f" : "#f57f17",  // distinct amber for FR24
  };
}

export function useOpenSkyLayer(
  mapRef: React.RefObject<MapboxMap | null>,
  visible: boolean,
  isDark: boolean,
  onCount?: (n: number) => void,
) {
  const dataRef = useRef<AircraftState[]>([]);
  const loadingRef = useRef(false);

  // ── Fetch + auto-refresh every 30s when visible ──
  useEffect(() => {
    if (!visible) return;

    let cancelled = false;
    let intervalId: number | null = null;
    const useFr24 = hasFr24Token();

    const refresh = async () => {
      if (loadingRef.current) return;
      loadingRef.current = true;
      try {
        let list: AircraftState[];
        if (useFr24) {
          const fr24 = await fetchFr24Taiwan();
          list = fr24.map((a) => fr24ToOpenSky(a, isDark));
          console.log(`[ADS-B/FR24] ${list.length} aircraft @ ${new Date().toLocaleTimeString()}`);
        } else {
          list = await fetchOpenSkyTaiwan();
          console.log(`[ADS-B/OpenSky] ${list.length} aircraft @ ${new Date().toLocaleTimeString()}`);
        }
        if (cancelled) return;
        dataRef.current = list;
        onCount?.(list.length);
        const map = mapRef.current;
        if (map && map.isStyleLoaded()) {
          const src = map.getSource(SOURCE_ID) as GeoJSONSource | undefined;
          if (src) {
            src.setData(buildOpenSkyGeoJSON(list, isDark));
            keepLoadingUntilMapIdle(map, "live-adsb-render", "ADS-B 渲染中", SOURCE_ID);
          }
        }
      } catch (err) {
        if (useFr24) {
          console.warn("[ADS-B/FR24] fetch failed, no fallback:", err);
        } else {
          console.warn("[ADS-B/OpenSky] fetch failed:", err);
        }
      } finally {
        loadingRef.current = false;
      }
    };

    refresh();
    intervalId = window.setInterval(refresh, REFRESH_MS);
    return () => {
      cancelled = true;
      if (intervalId !== null) window.clearInterval(intervalId);
    };
  }, [visible, mapRef, isDark]);

  // ── Layer lifecycle ──
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const apply = () => {
      const m = mapRef.current;
      if (!m) return;
      removeLayers(m);
      if (!visible) return;
      ensureLayers(m, isDark);
      if (dataRef.current.length > 0) {
        const src = m.getSource(SOURCE_ID) as GeoJSONSource | undefined;
        if (src) {
          src.setData(buildOpenSkyGeoJSON(dataRef.current, isDark));
          keepLoadingUntilMapIdle(m, "live-adsb-render", "ADS-B 渲染中", SOURCE_ID);
        }
      }
    };

    if (!map.isStyleLoaded()) {
      map.once("load", apply);
      return () => { map.off("load", apply); };
    }
    apply();
  }, [mapRef, visible, isDark]);

  // ── Unmount cleanup ──
  useEffect(() => {
    return () => {
      const map = mapRef.current;
      if (map && map.isStyleLoaded()) {
        try { removeLayers(map); } catch { /* map destroyed */ }
      }
    };
  }, [mapRef]);
}
