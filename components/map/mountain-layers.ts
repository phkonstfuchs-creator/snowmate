import type { ExpressionSpecification, LineLayerSpecification } from "maplibre-gl";
import { featureBounds } from "@/features/mountain-data/convert";
import { mountainFeatureById, mountainGeoJSON } from "@/features/mountain-data/catalog";

export const MOUNTAIN_SOURCE = "mountain-features";
export const MOUNTAIN_PISTE_LAYER = "mountain-pistes";
export const MOUNTAIN_LIFT_LAYER = "mountain-lifts";
export const MOUNTAIN_PISTE_HIT_LAYER = "mountain-piste-hit";
export const MOUNTAIN_LIFT_HIT_LAYER = "mountain-lift-hit";
export const MOUNTAIN_SELECTED_PISTE_LAYER = "mountain-selected-piste";
export const MOUNTAIN_SELECTED_LIFT_LAYER = "mountain-selected-lift";

const mountainBounds = featureBounds(mountainGeoJSON);

export function isInsideMountainSnapshot(lng: number, lat: number): boolean {
  if (!mountainBounds || !Number.isFinite(lng) || !Number.isFinite(lat)) return false;
  const [west, south, east, north] = mountainBounds;
  return lng >= west && lng <= east && lat >= south && lat <= north;
}

const difficultyColor = [
  "match",
  ["get", "piste:difficulty"],
  "novice", "#70b96e",
  "easy", "#287fc1",
  "intermediate", "#d74b43",
  "advanced", "#302c32",
  "expert", "#302c32",
  "freeride", "#76858c",
  "#76858c",
] as ExpressionSpecification;

const lineWidth = ["interpolate", ["linear"], ["zoom"], 10, 3, 13, 4, 16, 5] as ExpressionSpecification;
const hitWidth = ["interpolate", ["linear"], ["zoom"], 10, 12, 13, 14, 16, 16] as ExpressionSpecification;
const liftWidth = ["interpolate", ["linear"], ["zoom"], 10, 3, 13, 4, 16, 5] as ExpressionSpecification;

function selectionFilter(id: string | null | undefined): ExpressionSpecification {
  const feature = id ? mountainFeatureById(id) : null;
  // MVT serialization only preserves integer feature IDs. Match the sourced
  // property instead of a top-level string such as "way/25170582".
  return ["==", ["get", "osm_id"], feature ? Number(feature.id.slice(4)) : -1];
}

export function mountainLayers(selectedFeatureId: string | null | undefined): LineLayerSpecification[] {
  return [
    {
      id: MOUNTAIN_PISTE_LAYER,
      type: "line",
      source: MOUNTAIN_SOURCE,
      minzoom: 10,
      filter: ["==", ["get", "kind"], "piste"],
      layout: { "line-cap": "round", "line-join": "round" },
      paint: { "line-color": difficultyColor, "line-width": lineWidth, "line-opacity": 0.95 },
    },
    {
      id: MOUNTAIN_LIFT_LAYER,
      type: "line",
      source: MOUNTAIN_SOURCE,
      minzoom: 10,
      filter: ["==", ["get", "kind"], "lift"],
      layout: { "line-cap": "round", "line-join": "round" },
      paint: { "line-color": "#354c58", "line-width": liftWidth, "line-dasharray": [1, 1.6], "line-opacity": 0.95 },
    },
    {
      id: MOUNTAIN_PISTE_HIT_LAYER,
      type: "line",
      source: MOUNTAIN_SOURCE,
      minzoom: 10,
      filter: ["==", ["get", "kind"], "piste"],
      layout: { "line-cap": "round", "line-join": "round" },
      paint: { "line-color": "#ffffff", "line-width": hitWidth, "line-opacity": 0.01 },
    },
    {
      id: MOUNTAIN_LIFT_HIT_LAYER,
      type: "line",
      source: MOUNTAIN_SOURCE,
      minzoom: 10,
      filter: ["==", ["get", "kind"], "lift"],
      layout: { "line-cap": "round", "line-join": "round" },
      paint: { "line-color": "#ffffff", "line-width": hitWidth, "line-opacity": 0.01 },
    },
    {
      id: MOUNTAIN_SELECTED_PISTE_LAYER,
      type: "line",
      source: MOUNTAIN_SOURCE,
      minzoom: 10,
      filter: ["all", ["==", ["get", "kind"], "piste"], selectionFilter(selectedFeatureId)],
      layout: { "line-cap": "round", "line-join": "round" },
      paint: { "line-color": "#f4a340", "line-width": 11, "line-opacity": 1 },
    },
    {
      id: MOUNTAIN_SELECTED_LIFT_LAYER,
      type: "line",
      source: MOUNTAIN_SOURCE,
      minzoom: 10,
      filter: ["all", ["==", ["get", "kind"], "lift"], selectionFilter(selectedFeatureId)],
      layout: { "line-cap": "round", "line-join": "round" },
      paint: { "line-color": "#f4a340", "line-width": 10, "line-opacity": 1 },
    },
  ];
}
