import { useEffect, useRef } from "react";
import { Popup } from "mapbox-gl";
import type { Map as MapboxMap, LineLayer, CircleLayer, SymbolLayer, GeoJSONSource, MapLayerMouseEvent } from "mapbox-gl";
import { computeTraTrains, buildTraGeoJSON } from "../data/traLoader";
import { timeStore } from "../state/timeStore";

const SOURCE_TRACK  = "tra-track";
const SOURCE_TRAINS = "tra-trains";
const LAYER_TRACK   = "tra-track-line";
const LAYER_GLOW    = "tra-trains-glow";
const LAYER_CIRCLE  = "tra-trains-circle";
const LAYER_ARROW   = "tra-trains-arrow";

const TRA_TRACK_GEOJSON = "./geo/tra_track.geojson";

// CSS injected once; shared with useHsrLayer (idempotent id check)
function injectPopupStyles() {
  if (document.getElementById("train-popup-css")) return;
  const s = document.createElement("style");
  s.id = "train-popup-css";
  s.textContent = `
    .train-popup .mapboxgl-popup-content {
      background: rgba(6,14,22,0.96);
      border: 1px solid #1e3a4a;
      border-radius: 6px;
      padding: 9px 13px;
      box-shadow: 0 4px 16px rgba(0,0,0,0.7);
      font-family: 'Inter','Segoe UI',sans-serif;
    }
    .train-popup .mapboxgl-popup-tip { border-top-color: rgba(6,14,22,0.96); }
  `;
  document.head.appendChild(s);
}

function taiwanNow(): string {
  return new Date().toLocaleTimeString("en-US", {
    timeZone: "Asia/Taipei", hour: "2-digit", minute: "2-digit", hour12: false,
  });
}

function traPopupHTML(p: Record<string, unknown>): string {
  const dir   = Number(p.direction) === 0 ? "↓ Southbound" : "↑ Northbound";
  const route = String(p.route ?? "") === "western" ? "縱貫線" : "東部線";
  const color = String(p.color ?? "#ef4444");
  return `
    <div style="min-width:160px">
      <div style="font-size:13px;font-weight:700;color:${color};margin-bottom:5px">🚞 TRA ${String(p.trainNo ?? "")}</div>
      <div style="font-size:10px;color:#9ca3af;margin-bottom:4px">${route} · ${dir}</div>
      <div style="font-size:11px;color:#e0e0e0">${String(p.fromStation ?? "")} → ${String(p.toStation ?? "")}</div>
      <div style="font-size:10px;color:#6b7280;margin-top:4px">Taiwan time: ${taiwanNow()}</div>
    </div>`;
}

function ensureLayers(map: MapboxMap) {
  if (!map.getSource(SOURCE_TRACK)) {
    map.addSource(SOURCE_TRACK, { type: "geojson", data: TRA_TRACK_GEOJSON });
  }
  if (!map.getLayer(LAYER_TRACK)) {
    map.addLayer({
      id: LAYER_TRACK,
      type: "line",
      source: SOURCE_TRACK,
      layout: { "line-cap": "round", "line-join": "round" },
      paint: {
        "line-color": ["get", "color"],
        "line-width": ["interpolate", ["linear"], ["zoom"], 4, 1, 8, 2, 12, 3],
        "line-opacity": 0.4,
      },
    } as LineLayer);
  }

  if (!map.getSource(SOURCE_TRAINS)) {
    map.addSource(SOURCE_TRAINS, {
      type: "geojson",
      data: { type: "FeatureCollection", features: [] },
    });
  }
  if (!map.getLayer(LAYER_GLOW)) {
    map.addLayer({
      id: LAYER_GLOW,
      type: "circle",
      source: SOURCE_TRAINS,
      paint: {
        "circle-radius": ["interpolate", ["linear"], ["zoom"], 4, 6, 8, 10, 12, 15],
        "circle-color": ["get", "color"],
        "circle-blur": 1,
        "circle-opacity": 0.25,
      },
    } as CircleLayer);
  }
  if (!map.getLayer(LAYER_CIRCLE)) {
    map.addLayer({
      id: LAYER_CIRCLE,
      type: "circle",
      source: SOURCE_TRAINS,
      paint: {
        "circle-radius": ["interpolate", ["linear"], ["zoom"], 4, 2.5, 8, 4, 12, 6],
        "circle-color": ["get", "color"],
        "circle-stroke-width": 1.5,
        "circle-stroke-color": "rgba(255,255,255,0.7)",
        "circle-opacity": 0.9,
      },
    } as CircleLayer);
  }
  if (!map.getLayer(LAYER_ARROW)) {
    map.addLayer({
      id: LAYER_ARROW,
      type: "symbol",
      source: SOURCE_TRAINS,
      minzoom: 7,
      layout: {
        "text-field": "▲",
        "text-size": ["interpolate", ["linear"], ["zoom"], 7, 8, 10, 11, 14, 16],
        "text-rotate": ["get", "bearing"],
        "text-rotation-alignment": "map",
        "text-pitch-alignment": "map",
        "text-allow-overlap": true,
        "text-ignore-placement": true,
        "text-font": ["literal", ["Open Sans Regular", "Arial Unicode MS Regular"]],
      },
      paint: {
        "text-color": ["get", "color"],
        "text-halo-color": "rgba(0,0,0,0.6)",
        "text-halo-width": 1,
        "text-opacity": 0.85,
      },
    } as SymbolLayer);
  }
}

function removeLayers(map: MapboxMap) {
  for (const id of [LAYER_ARROW, LAYER_CIRCLE, LAYER_GLOW, LAYER_TRACK]) {
    if (map.getLayer(id)) map.removeLayer(id);
  }
  for (const id of [SOURCE_TRAINS, SOURCE_TRACK]) {
    if (map.getSource(id)) map.removeSource(id);
  }
}

function updateTrains(map: MapboxMap, geojson: GeoJSON.FeatureCollection) {
  const src = map.getSource(SOURCE_TRAINS) as GeoJSONSource | undefined;
  if (src) src.setData(geojson);
}

export function useTraLayer(
  mapRef: React.RefObject<MapboxMap | null>,
  visible: boolean,
  mapVersion: number,
) {
  const dataRef = useRef<GeoJSON.FeatureCollection>({ type: "FeatureCollection", features: [] });

  // ── Layer lifecycle + hover popup ──
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    injectPopupStyles();
    const popup = new Popup({ closeButton: false, closeOnClick: false, className: "train-popup", maxWidth: "none" });

    const onMouseMove = (e: MapLayerMouseEvent) => {
      map.getCanvas().style.cursor = "pointer";
      const f = e.features?.[0];
      if (!f) return;
      popup.setLngLat(e.lngLat).setHTML(traPopupHTML(f.properties as Record<string, unknown>)).addTo(map);
    };
    const onMouseLeave = () => {
      map.getCanvas().style.cursor = "";
      popup.remove();
    };

    const apply = () => {
      const m = mapRef.current;
      if (!m) return;
      m.off("mousemove", LAYER_CIRCLE, onMouseMove);
      m.off("mouseleave", LAYER_CIRCLE, onMouseLeave);
      popup.remove();
      removeLayers(m);
      if (!visible) return;
      ensureLayers(m);
      m.on("mousemove", LAYER_CIRCLE, onMouseMove);
      m.on("mouseleave", LAYER_CIRCLE, onMouseLeave);
      const geojson = buildTraGeoJSON(computeTraTrains(timeStore.getTime()));
      dataRef.current = geojson;
      updateTrains(m, geojson);
    };

    if (!map.isStyleLoaded()) {
      map.once("style.load", apply);
      return () => {
        map.off("style.load", apply);
        map.off("mousemove", LAYER_CIRCLE, onMouseMove);
        map.off("mouseleave", LAYER_CIRCLE, onMouseLeave);
        popup.remove();
      };
    }
    apply();
    return () => {
      map.off("mousemove", LAYER_CIRCLE, onMouseMove);
      map.off("mouseleave", LAYER_CIRCLE, onMouseLeave);
      popup.remove();
    };
  }, [mapRef, visible, mapVersion]);

  // ── TimeStore subscription — recompute every 5s ──
  useEffect(() => {
    if (!visible) return;

    const update = (t: number) => {
      const map = mapRef.current;
      if (!map || !map.isStyleLoaded()) return;
      const geojson = buildTraGeoJSON(computeTraTrains(t));
      dataRef.current = geojson;
      updateTrains(map, geojson);
    };

    update(timeStore.getTime());
    return timeStore.subscribeThrottled(5_000, update);
  }, [visible, mapRef, mapVersion]);

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
