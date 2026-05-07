import { useEffect, useRef } from "react";
import type { Map as MapboxMap, GeoJSONSource, LineLayer, CircleLayer, SymbolLayer } from "mapbox-gl";
import {
  fetchAdizBoundary,
  fetchAdizMedianLine,
  fetchAdizIncursions,
} from "../data/adizLoader";
import { keepLoadingUntilMapIdle } from "../lib/loadingRegistry";

const SRC_BOUNDARY = "adiz-boundary-src";
const SRC_MEDIAN = "adiz-median-src";
const SRC_INCIDENTS = "adiz-incidents-src";

const LYR_BOUNDARY_LINE = "adiz-boundary-line";
const LYR_MEDIAN_LINE = "adiz-median-line";
const LYR_INCIDENT_CIRCLE = "adiz-incident-circle";
const LYR_INCIDENT_LABEL = "adiz-incident-label";

const EMPTY: GeoJSON.FeatureCollection = { type: "FeatureCollection", features: [] };

function ensureBoundaryLayers(map: MapboxMap, isDark: boolean) {
  if (!map.getSource(SRC_BOUNDARY)) {
    map.addSource(SRC_BOUNDARY, { type: "geojson", data: EMPTY });
  }
  if (!map.getSource(SRC_MEDIAN)) {
    map.addSource(SRC_MEDIAN, { type: "geojson", data: EMPTY });
  }
  if (!map.getLayer(LYR_BOUNDARY_LINE)) {
    map.addLayer({
      id: LYR_BOUNDARY_LINE,
      type: "line",
      source: SRC_BOUNDARY,
      paint: {
        "line-color": isDark ? "#ff4444" : "#cc0000",
        "line-width": 1.5,
        "line-dasharray": [4, 3],
        "line-opacity": 0.8,
      },
    } as LineLayer);
  }
  if (!map.getLayer(LYR_MEDIAN_LINE)) {
    map.addLayer({
      id: LYR_MEDIAN_LINE,
      type: "line",
      source: SRC_MEDIAN,
      paint: {
        "line-color": isDark ? "#ff9900" : "#cc6600",
        "line-width": 1.5,
        "line-dasharray": [6, 3],
        "line-opacity": 0.85,
      },
    } as LineLayer);
  }
}

function ensureIncidentLayers(map: MapboxMap, isDark: boolean) {
  if (!map.getSource(SRC_INCIDENTS)) {
    map.addSource(SRC_INCIDENTS, { type: "geojson", data: EMPTY });
  }
  if (!map.getLayer(LYR_INCIDENT_CIRCLE)) {
    map.addLayer({
      id: LYR_INCIDENT_CIRCLE,
      type: "circle",
      source: SRC_INCIDENTS,
      paint: {
        "circle-radius": [
          "interpolate", ["linear"], ["get", "aircraft_count"],
          50, 6, 100, 10, 160, 14,
        ],
        "circle-color": isDark ? "#ff3333" : "#cc0000",
        "circle-stroke-width": 1.5,
        "circle-stroke-color": isDark ? "rgba(255,100,100,0.7)" : "rgba(180,0,0,0.5)",
        "circle-opacity": 0.75,
      },
    } as CircleLayer);
  }
  if (!map.getLayer(LYR_INCIDENT_LABEL)) {
    map.addLayer({
      id: LYR_INCIDENT_LABEL,
      type: "symbol",
      source: SRC_INCIDENTS,
      layout: {
        "text-field": ["concat", ["get", "date"], "\n", ["get", "aircraft_count"], " ac"],
        "text-size": 10,
        "text-offset": [0, 1.5],
        "text-anchor": "top",
        "text-font": ["literal", ["Open Sans Regular", "Arial Unicode MS Regular"]],
      },
      paint: {
        "text-color": isDark ? "#ffaaaa" : "#880000",
        "text-halo-color": isDark ? "rgba(0,0,0,0.8)" : "rgba(255,255,255,0.8)",
        "text-halo-width": 1,
      },
    } as SymbolLayer);
  }
}

function removeBoundaryLayers(map: MapboxMap) {
  for (const id of [LYR_BOUNDARY_LINE, LYR_MEDIAN_LINE]) {
    if (map.getLayer(id)) map.removeLayer(id);
  }
  for (const id of [SRC_BOUNDARY, SRC_MEDIAN]) {
    if (map.getSource(id)) map.removeSource(id);
  }
}

function removeIncidentLayers(map: MapboxMap) {
  for (const id of [LYR_INCIDENT_LABEL, LYR_INCIDENT_CIRCLE]) {
    if (map.getLayer(id)) map.removeLayer(id);
  }
  if (map.getSource(SRC_INCIDENTS)) map.removeSource(SRC_INCIDENTS);
}

export function useAdizLayer(
  mapRef: React.RefObject<MapboxMap | null>,
  boundaryVisible: boolean,
  incursionsVisible: boolean,
  isDark: boolean,
) {
  const boundaryLoadedRef = useRef(false);
  const incursionsLoadedRef = useRef(false);

  // ── Load boundary + median line once ──
  useEffect(() => {
    if (!boundaryVisible) return;
    if (boundaryLoadedRef.current) return;

    let cancelled = false;
    (async () => {
      const [boundary, median] = await Promise.all([
        fetchAdizBoundary(),
        fetchAdizMedianLine(),
      ]);
      if (cancelled) return;
      boundaryLoadedRef.current = true;
      const map = mapRef.current;
      if (!map || !map.isStyleLoaded()) return;
      const bSrc = map.getSource(SRC_BOUNDARY) as GeoJSONSource | undefined;
      const mSrc = map.getSource(SRC_MEDIAN) as GeoJSONSource | undefined;
      if (bSrc) bSrc.setData(boundary);
      if (mSrc) mSrc.setData(median);
      keepLoadingUntilMapIdle(map, "adiz-boundary-render", "ADIZ 渲染中", SRC_BOUNDARY);
    })().catch((e) => console.warn("[ADIZ] boundary load failed", e));

    return () => { cancelled = true; };
  }, [boundaryVisible, mapRef]);

  // ── Load incursions once ──
  useEffect(() => {
    if (!incursionsVisible) return;
    if (incursionsLoadedRef.current) return;

    let cancelled = false;
    (async () => {
      const data = await fetchAdizIncursions();
      if (cancelled) return;
      incursionsLoadedRef.current = true;
      const map = mapRef.current;
      if (!map || !map.isStyleLoaded()) return;
      const src = map.getSource(SRC_INCIDENTS) as GeoJSONSource | undefined;
      if (src) src.setData(data);
      keepLoadingUntilMapIdle(map, "adiz-incidents-render", "侵入紀錄渲染中", SRC_INCIDENTS);
    })().catch((e) => console.warn("[ADIZ] incursions load failed", e));

    return () => { cancelled = true; };
  }, [incursionsVisible, mapRef]);

  // ── Boundary layer lifecycle ──
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const apply = () => {
      const m = mapRef.current;
      if (!m) return;
      removeBoundaryLayers(m);
      if (!boundaryVisible) return;
      ensureBoundaryLayers(m, isDark);
    };

    if (!map.isStyleLoaded()) {
      map.once("load", apply);
      return () => { map.off("load", apply); };
    }
    apply();
  }, [mapRef, boundaryVisible, isDark]);

  // ── Incursions layer lifecycle ──
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const apply = () => {
      const m = mapRef.current;
      if (!m) return;
      removeIncidentLayers(m);
      if (!incursionsVisible) return;
      ensureIncidentLayers(m, isDark);
    };

    if (!map.isStyleLoaded()) {
      map.once("load", apply);
      return () => { map.off("load", apply); };
    }
    apply();
  }, [mapRef, incursionsVisible, isDark]);

  // ── Unmount cleanup ──
  useEffect(() => {
    return () => {
      const map = mapRef.current;
      if (map && map.isStyleLoaded()) {
        try { removeBoundaryLayers(map); } catch { /* map destroyed */ }
        try { removeIncidentLayers(map); } catch { /* map destroyed */ }
      }
    };
  }, [mapRef]);
}
