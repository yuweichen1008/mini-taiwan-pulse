import { useCallback, useRef, useState } from "react";
import type { LayerVisibility } from "../types";

const DEFAULT: LayerVisibility = {
  ships: true,
  showMilitary: true,
  showCG: true,
  showCargo: true,
  showTanker: true,
  showPassenger: true,
  showFishing: true,
  showTug: true,
  showOther: false,
  liveAdsb: true,
  adizBoundary: true,
  adizIncursions: true,
  maritimeZones: true,
  ports: true,
  airports: false,
  submarineCables: true,
  landingStations: false,
  plaBases: true,
  hsr: true,
  tra: true,
};

export function useLayerVisibility() {
  const [layerVisibility, setLayerVisibility] = useState<LayerVisibility>(DEFAULT);
  const layerVisibilityRef = useRef(layerVisibility);
  layerVisibilityRef.current = layerVisibility;

  const toggleVisibility = useCallback((layer: keyof LayerVisibility) => {
    setLayerVisibility((prev) => ({ ...prev, [layer]: !prev[layer] }));
  }, []);

  return { layerVisibility, layerVisibilityRef, setLayerVisibility, toggleVisibility };
}
