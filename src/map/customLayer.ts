import type { CustomLayerInterface, Map as MapboxMap } from "mapbox-gl";
import type { Ship, VesselCategory } from "../types";
import { ShipScene } from "../three/ShipScene";
import { timeStore } from "../state/timeStore";

export interface ShipLayerOptions {
  getShips: () => Ship[];
  getVisibleCategories: () => Set<VesselCategory>;
  getOrbScale: () => number;
  getIsDarkTheme: () => boolean;
  getIsVisible: () => boolean;
  onSceneReady?: (scene: ShipScene) => void;
}

export function createShipLayer(opts: ShipLayerOptions): CustomLayerInterface {
  const scene = new ShipScene();
  let map: MapboxMap | null = null;

  return {
    id: "ship-3d",
    type: "custom" as const,
    renderingMode: "3d" as const,

    onAdd(mapInstance: MapboxMap, gl: WebGLRenderingContext) {
      map = mapInstance;
      scene.init(gl);
      opts.onSceneReady?.(scene);
    },

    render(_gl: WebGLRenderingContext, matrix: number[]) {
      if (!opts.getIsVisible()) return;

      scene.setTheme(opts.getIsDarkTheme());
      scene.setVisibleCategories(opts.getVisibleCategories());
      scene.setOrbScale(opts.getOrbScale());

      if (map) {
        const bounds = map.getBounds();
        if (bounds) {
          scene.setViewBounds({
            minLng: bounds.getWest(), maxLng: bounds.getEast(),
            minLat: bounds.getSouth(), maxLat: bounds.getNorth(),
          });
        }
      }

      scene.update(opts.getShips(), timeStore.getTime());
      scene.render(matrix);
      map?.triggerRepaint();
    },

    onRemove() {
      scene.dispose();
      map = null;
    },
  };
}
