import type { CameraPreset } from "../types";

export const ALL_PRESETS: CameraPreset[] = [
  {
    name: "Taiwan Strait Overview",
    id: "strait",
    category: "overview",
    center: [121.5, 23.5],
    zoom: 6,
    pitch: 0,
    bearing: 0,
  },
  {
    name: "全台總覽",
    id: "overview",
    category: "overview",
    center: [120.2668, 23.1336],
    zoom: 7.6,
    pitch: 37,
    bearing: -16,
  },
  {
    name: "Taiwan Strait (North)",
    id: "strait-north",
    category: "strait",
    center: [120.5, 25.5],
    zoom: 7,
    pitch: 0,
    bearing: 0,
  },
  {
    name: "Taiwan Strait (South)",
    id: "strait-south",
    category: "strait",
    center: [120.0, 22.5],
    zoom: 7,
    pitch: 0,
    bearing: 0,
  },
  {
    name: "高雄港",
    id: "kaohsiung-port",
    category: "port",
    center: [120.30, 22.63],
    zoom: 12,
    pitch: 40,
    bearing: -30,
  },
  {
    name: "基隆港",
    id: "keelung-port",
    category: "port",
    center: [121.73, 25.13],
    zoom: 12,
    pitch: 40,
    bearing: 0,
  },
  {
    name: "台中港",
    id: "taichung-port",
    category: "port",
    center: [120.52, 24.27],
    zoom: 12,
    pitch: 40,
    bearing: 0,
  },
  {
    name: "澎湖漁場",
    id: "penghu-fishing",
    category: "scene",
    description: "Penghu fishing grounds — active fishing vessels",
    center: [119.29, 23.33],
    zoom: 9,
    pitch: 20,
    bearing: 16,
    layers: { ships: true, showFishing: true },
  },
  {
    name: "ADIZ Overview",
    id: "adiz-overview",
    category: "scene",
    description: "Taiwan ADIZ boundary and incursion events",
    center: [121.5, 23.5],
    zoom: 5.5,
    pitch: 0,
    bearing: 0,
    layers: { adizBoundary: true, adizIncursions: true },
  },
];

export const DEFAULT_CAMERA: CameraPreset = ALL_PRESETS[0]!;

export function getPresetById(id: string): CameraPreset | undefined {
  return ALL_PRESETS.find((p) => p.id === id);
}
