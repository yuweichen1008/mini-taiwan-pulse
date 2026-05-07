import { useCallback, useEffect, useRef, useState } from "react";
import type { Map as MapboxMap } from "mapbox-gl";
import type { MapClickFeature } from "../types";

export function useMapInteraction(mapRef: React.RefObject<MapboxMap | null>) {
  const [clickedFeature, setClickedFeature] = useState<MapClickFeature | null>(null);
  const clearFeature = useCallback(() => setClickedFeature(null), []);
  const bound = useRef(false);

  const bindEvents = useCallback((map: MapboxMap) => {
    map.on("click", (e) => {
      const features = map.queryRenderedFeatures(e.point);
      if (!features.length) { setClickedFeature(null); return; }
      const f = features[0]!;
      setClickedFeature({
        layerId: f.layer?.id ?? "unknown",
        properties: (f.properties ?? {}) as Record<string, unknown>,
        lngLat: [e.lngLat.lng, e.lngLat.lat],
      });
    });

    for (const id of ["submarine-cables-line", "port-polygons-fill", "maritime-zones-line", "pla-bases-core"]) {
      map.on("mouseenter", id, () => { map.getCanvas().style.cursor = "pointer"; });
      map.on("mouseleave", id, () => { map.getCanvas().style.cursor = ""; });
    }
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || bound.current) return;
    bound.current = true;
    if (map.isStyleLoaded()) { bindEvents(map); return; }
    map.once("load", () => bindEvents(map));
  });

  return { clickedFeature, clearFeature };
}
