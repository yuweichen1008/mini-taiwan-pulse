import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import type { CameraPreset, LayerVisibility } from "../types";
import { OVERLAY_REGISTRY } from "./overlayRegistry";
import { addAllOverlays, updateAllOverlayThemes, setOverlayVisible } from "./overlayManager";

interface MapViewProps {
  preset: CameraPreset;
  styleUrl: string;
  isDarkTheme?: boolean;
  layerVisibility: LayerVisibility;
  onMapReady?: (map: mapboxgl.Map) => void;
}

export function MapView({
  preset, styleUrl, isDarkTheme = true, layerVisibility, onMapReady,
}: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const readyRef = useRef(false);

  const onMapReadyRef = useRef(onMapReady);
  const presetRef = useRef(preset);
  const isDarkThemeRef = useRef(isDarkTheme);
  const layerVisibilityRef = useRef(layerVisibility);

  onMapReadyRef.current = onMapReady;
  presetRef.current = preset;
  isDarkThemeRef.current = isDarkTheme;
  layerVisibilityRef.current = layerVisibility;

  // Map init — runs once
  useEffect(() => {
    if (!containerRef.current) return;
    mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: styleUrl,
      center: presetRef.current.center,
      zoom: presetRef.current.zoom,
      pitch: presetRef.current.pitch,
      bearing: presetRef.current.bearing,
      antialias: true,
    });

    // Re-add all overlays on every style change (style.load fires on initial load + setStyle calls)
    map.on("style.load", () => {
      addAllOverlays(map, OVERLAY_REGISTRY, isDarkThemeRef.current, layerVisibilityRef.current);
      if (readyRef.current) onMapReadyRef.current?.(map);
    });

    map.on("load", () => {
      mapRef.current = map;
      readyRef.current = true;
      onMapReadyRef.current?.(map);
    });

    return () => {
      map.remove();
      mapRef.current = null;
      readyRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Style switch
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !readyRef.current) return;
    map.setStyle(styleUrl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [styleUrl]);

  // Camera fly-to on preset change
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !readyRef.current) return;
    map.flyTo({ center: preset.center, zoom: preset.zoom, pitch: preset.pitch, bearing: preset.bearing, duration: 2000 });
  }, [preset]);

  // Theme update
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !readyRef.current || !map.isStyleLoaded()) return;
    updateAllOverlayThemes(map, OVERLAY_REGISTRY, isDarkTheme);
  }, [isDarkTheme]);

  // Layer visibility
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !readyRef.current || !map.isStyleLoaded()) return;
    for (const config of OVERLAY_REGISTRY) {
      setOverlayVisible(map, config, layerVisibility[config.id] as boolean);
    }
  }, [layerVisibility]);

  return <div ref={containerRef} style={{ position: "absolute", inset: 0 }} />;
}
