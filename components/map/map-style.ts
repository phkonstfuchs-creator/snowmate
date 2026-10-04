import type { StyleSpecification } from "maplibre-gl";

const PAPER = "#efe7d6";

/* Vector tiles from OpenFreeMap: free, no API key, no request quota.
   Rendered on the GPU, so zooming and panning stay smooth on a phone. */
export const VECTOR_STYLE_URL = "https://tiles.openfreemap.org/styles/positron";

/* Used when the vector style cannot be loaded (provider down, blocked
   network). Same CARTO raster tiles the app used before. */
export const RASTER_FALLBACK_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    carto: {
      type: "raster",
      tiles: ["a", "b", "c"].map((s) => `https://${s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png`),
      tileSize: 256,
      maxzoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
    },
  },
  layers: [
    { id: "paper", type: "background", paint: { "background-color": PAPER } },
    { id: "carto", type: "raster", source: "carto", paint: { "raster-saturation": -0.3 } },
  ],
};

/* Warm the grey positron style towards the app's paper palette. Only
   layer types and ids every OpenMapTiles style has are touched. */
export function paperTint(
  layerId: string,
  layerType: string,
): { property: "background-color" | "fill-color"; value: string } | null {
  if (layerType === "background") return { property: "background-color", value: PAPER };
  if (layerType !== "fill") return null;
  if (/water/u.test(layerId)) return { property: "fill-color", value: "#c9d6dc" };
  if (/landcover_wood|park|forest|wood/u.test(layerId)) return { property: "fill-color", value: "#dfe0c8" };
  if (/landcover_ice|glacier/u.test(layerId)) return { property: "fill-color", value: "#f7f4ee" };
  return null;
}

export interface PolygonFeature {
  type: "Feature";
  properties: Record<string, never>;
  geometry: { type: "Polygon"; coordinates: [number, number][][] };
}

/* A circle of `radiusM` metres around a point, as a GeoJSON polygon:
   how precise the viewer's own position is. */
export function accuracyCircle(lng: number, lat: number, radiusM: number, steps = 48): PolygonFeature {
  const earth = 6371008.8;
  const dLat = (radiusM / earth) * (180 / Math.PI);
  const dLng = dLat / Math.cos((lat * Math.PI) / 180);
  const ring: [number, number][] = [];
  for (let i = 0; i <= steps; i += 1) {
    const angle = (i / steps) * 2 * Math.PI;
    ring.push([lng + dLng * Math.cos(angle), lat + dLat * Math.sin(angle)]);
  }
  return { type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: [ring] } };
}

/* Accuracy below 5 m is not believable and above 2 km is not useful. */
export function clampAccuracy(accuracy: number | null): number {
  return Math.min(Math.max(accuracy ?? 0, 5), 2000);
}
