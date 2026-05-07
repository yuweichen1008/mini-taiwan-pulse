import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Map as MapboxMap } from "mapbox-gl";
import type { VesselCategory, CameraPreset } from "./types";
import { getVesselCategory } from "./types";
import { MapView } from "./map/MapView";
import { createShipLayer } from "./map/customLayer";
import { useShipData } from "./hooks/useShipData";
import { useOpenSkyLayer } from "./hooks/useOpenSkyLayer";
import { useAdizLayer } from "./hooks/useAdizLayer";
import { useHsrLayer } from "./hooks/useHsrLayer";
import { useTraLayer } from "./hooks/useTraLayer";
import { usePlaPopup } from "./hooks/usePlaPopup";
import { useLayerVisibility } from "./hooks/useLayerVisibility";
import { useLoadingTasks } from "./hooks/useLoadingTasks";
import { useMapInteraction } from "./hooks/useMapInteraction";
import { useIsMobile } from "./hooks/useIsMobile";
import { timeStore } from "./state/timeStore";
import { LayerSidebar } from "./components/LayerSidebar";
import { StyleSelector, getStyleUrl } from "./components/StyleSelector";
import { FeatureInfoPanel } from "./components/FeatureInfoPanel";
import { LoadingIndicator } from "./components/LoadingIndicator";
import { LoadingScreen } from "./components/LoadingScreen";
import { InfoModal } from "./components/InfoModal";
import type { ShipScene } from "./three/ShipScene";

const DEFAULT_PRESET: CameraPreset = {
  id: "strait",
  name: "Taiwan Strait",
  category: "overview",
  center: [121.5, 23.5],
  zoom: 6,
  pitch: 0,
  bearing: 0,
};

function styleReady(map: MapboxMap | null): map is MapboxMap {
  if (!map) return false;
  try { return !!map.getStyle(); } catch { return false; }
}
void styleReady; // used by layer hooks

export default function App() {
  const isMobile = useIsMobile();
  const mapRef = useRef<MapboxMap | null>(null);
  const shipSceneRef = useRef<ShipScene | null>(null);

  const [styleId, setStyleId] = useState<string>("dark");
  const [mapVersion, setMapVersion] = useState(0);
  const isDark = styleId !== "light";
  const styleUrl = useMemo(() => getStyleUrl(styleId), [styleId]);

  const { layerVisibility, toggleVisibility } = useLayerVisibility();
  const layerVisibilityRef = useRef(layerVisibility);
  layerVisibilityRef.current = layerVisibility;

  const { ships, loading: shipsLoading } = useShipData();
  const shipsRef = useRef(ships);
  shipsRef.current = ships;

  // Derive visible vessel categories from layer toggles
  const visibleCategories = useMemo((): Set<VesselCategory> => {
    const s = new Set<VesselCategory>();
    if (layerVisibility.showMilitary)  s.add("military");
    if (layerVisibility.showCG)        s.add("coastguard");
    if (layerVisibility.showCargo)     s.add("cargo");
    if (layerVisibility.showTanker)    s.add("tanker");
    if (layerVisibility.showPassenger) s.add("passenger");
    if (layerVisibility.showFishing)   s.add("fishing");
    if (layerVisibility.showTug)       s.add("tug");
    if (layerVisibility.showOther)     s.add("other");
    return s;
  }, [layerVisibility]);
  const visibleCatsRef = useRef(visibleCategories);
  visibleCatsRef.current = visibleCategories;

  const [adsbCount, setAdsbCount] = useState(0);

  // Vessel count: ships in dataset that match active category filters
  const visibleShipCount = useMemo(() => {
    if (!layerVisibility.ships) return 0;
    return ships.filter((s) => visibleCategories.has(getVesselCategory(s.vessel_type))).length;
  }, [ships, visibleCategories, layerVisibility.ships]);

  // Mount the ship Three.js layer once map is ready; re-mount on style change
  const onMapReady = useCallback((map: MapboxMap) => {
    mapRef.current = map;
    if (map.getLayer("ship-3d")) map.removeLayer("ship-3d");

    map.addLayer(createShipLayer({
      getShips: () => shipsRef.current,
      getVisibleCategories: () => visibleCatsRef.current,
      getOrbScale: () => 0.000005,
      getIsDarkTheme: () => styleId !== "light",
      getIsVisible: () => layerVisibilityRef.current.ships,
      onSceneReady: (scene) => { shipSceneRef.current = scene; },
    }));

    // Increment mapVersion so hook effects using it as a dep re-run with the live map
    setMapVersion((v) => v + 1);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ADIZ + ADS-B + HSR hooks
  useAdizLayer(mapRef, layerVisibility.adizBoundary, layerVisibility.adizIncursions, isDark);
  useOpenSkyLayer(mapRef, layerVisibility.liveAdsb, isDark, setAdsbCount);
  useHsrLayer(mapRef, layerVisibility.hsr, mapVersion);
  useTraLayer(mapRef, layerVisibility.tra, mapVersion);
  usePlaPopup(mapRef, layerVisibility.plaBases, mapVersion);

  const { clickedFeature, clearFeature } = useMapInteraction(mapRef);
  const loadingTasks = useLoadingTasks();
  const isInitialLoading = shipsLoading && ships.length === 0;

  // Keep timeStore in live mode — advance every 5s
  useEffect(() => {
    timeStore.setTime(Date.now() / 1000);
    const id = window.setInterval(() => timeStore.setTime(Date.now() / 1000), 2000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div style={{ position: "relative", width: "100vw", height: "100vh", background: "#060e16", overflow: "hidden" }}>

      {isInitialLoading && <LoadingScreen steps={[]} />}

      <MapView
        preset={DEFAULT_PRESET}
        styleUrl={styleUrl}
        isDarkTheme={isDark}
        layerVisibility={layerVisibility}
        onMapReady={onMapReady}
      />

      <LayerSidebar
        layerVisibility={layerVisibility}
        onToggle={toggleVisibility}
        shipCount={visibleShipCount}
        adsbCount={adsbCount}
      />

      {!isMobile && (
        <div style={{ position: "fixed", bottom: 20, right: 12, zIndex: 100 }}>
          <StyleSelector selected={styleId} isDarkTheme={isDark} onChange={setStyleId} />
        </div>
      )}

      {loadingTasks.length > 0 && <LoadingIndicator />}

      {clickedFeature && <FeatureInfoPanel feature={clickedFeature} onClose={clearFeature} />}

      <InfoModal />

      {ships.length > 0 && (
        <div style={{
          position: "fixed", bottom: 16, left: "50%", transform: "translateX(-50%)",
          background: "rgba(6,14,22,0.88)", border: "1px solid #1e3a4a",
          borderRadius: 6, padding: "4px 14px", color: "#607d8b", fontSize: 11,
          backdropFilter: "blur(8px)", zIndex: 50,
          fontFamily: "'Inter','Segoe UI',sans-serif",
        }}>
          {ships.length.toLocaleString()} vessels · AIS · live
        </div>
      )}
    </div>
  );
}
