import rawData from "./pilot.json";
import { featureBounds, type MountainGeoCollection, type MountainGeoFeature } from "./convert";

export const MOUNTAIN_SNAPSHOT_DATE = "2026-10-09" as const;

export interface MountainFeature {
  id: string;
  name: string;
  kind: "lift" | "piste";
  difficulty?: string;
  duration?: string;
  osmVersion: number | null;
  osmTimestamp: string | null;
  resort: "Nordkette";
}

export const mountainGeoJSON = rawData as unknown as MountainGeoCollection;

function toMountainFeature(feature: MountainGeoFeature): MountainFeature {
  const { properties } = feature;
  const difficulty = properties["piste:difficulty"];
  const duration = properties["aerialway:duration"] ?? properties.duration;
  return {
    id: feature.id,
    name: properties.name,
    kind: properties.kind,
    ...(typeof difficulty === "string" ? { difficulty } : {}),
    ...(typeof duration === "string" ? { duration } : {}),
    osmVersion: properties.osm_version,
    osmTimestamp: properties.osm_timestamp,
    resort: "Nordkette",
  };
}

export const mountainFeatures: readonly MountainFeature[] = mountainGeoJSON.features.map(toMountainFeature);
const mountainFeatureIndex = new Map(mountainFeatures.map((feature) => [feature.id, feature]));

export function mountainFeatureById(id: string): MountainFeature | null {
  return mountainFeatureIndex.get(id) ?? null;
}

export function mountainFeatureFromProperties(properties: Record<string, unknown>): MountainFeature | null {
  const osmId = properties.osm_id;
  const kind = properties.kind;
  if (typeof osmId !== "number" || !Number.isSafeInteger(osmId) || osmId <= 0 || (kind !== "lift" && kind !== "piste")) return null;
  const feature = mountainFeatureById(`way/${osmId}`);
  return feature?.kind === kind ? feature : null;
}

export interface MountainFeatureFocus {
  lat: number;
  lng: number;
  zoom: number;
}

export function mountainFeatureFocus(id: string): MountainFeatureFocus | null {
  const feature = mountainGeoJSON.features.find((candidate) => candidate.id === id);
  if (!feature) return null;
  const bounds = featureBounds({ type: "FeatureCollection", features: [feature] });
  if (!bounds) return null;
  const [west, south, east, north] = bounds;
  const span = Math.max(east - west, north - south);
  const zoom = span <= 0.001 ? 16 : span <= 0.005 ? 14 : span <= 0.03 ? 12 : 10;
  return { lat: (south + north) / 2, lng: (west + east) / 2, zoom };
}
