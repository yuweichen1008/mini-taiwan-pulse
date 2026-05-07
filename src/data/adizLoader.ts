import { loadingRegistry } from "../lib/loadingRegistry";

export interface AdizIncursion {
  date: string;
  aircraftCount: number;
  aircraftTypes: string;
  event: string;
  description: string;
  sourceUrl: string;
  lon: number;
  lat: number;
}

export async function fetchAdizBoundary(): Promise<GeoJSON.FeatureCollection> {
  loadingRegistry.start("adiz:boundary", "ADIZ 邊界");
  try {
    const res = await fetch("./geo/adiz_boundary.geojson");
    if (!res.ok) throw new Error(`adiz_boundary.geojson: ${res.status}`);
    return await res.json();
  } finally {
    loadingRegistry.end("adiz:boundary");
  }
}

export async function fetchAdizMedianLine(): Promise<GeoJSON.FeatureCollection> {
  const res = await fetch("./geo/adiz_median_line.geojson");
  if (!res.ok) throw new Error(`adiz_median_line.geojson: ${res.status}`);
  return await res.json();
}

export async function fetchAdizIncursions(): Promise<GeoJSON.FeatureCollection> {
  loadingRegistry.start("adiz:incursions", "解放軍侵入紀錄");
  try {
    const res = await fetch("./geo/adiz_incursions.geojson");
    if (!res.ok) throw new Error(`adiz_incursions.geojson: ${res.status}`);
    return await res.json();
  } finally {
    loadingRegistry.end("adiz:incursions");
  }
}
