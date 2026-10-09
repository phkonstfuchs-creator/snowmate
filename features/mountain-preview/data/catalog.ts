import rawData from "./pilot.json";
import type { PilotGeoCollection, PilotGeoFeature } from "./convert";

export interface PilotFeature {
  id: string;
  name: string;
  kind: "lift" | "piste";
  difficulty?: string;
  duration?: string;
}

export const pilotGeoJSON = rawData as unknown as PilotGeoCollection;

function toPilotFeature(feature: PilotGeoFeature): PilotFeature {
  const { properties } = feature;
  const difficulty = properties["piste:difficulty"];
  const duration = properties["aerialway:duration"] ?? properties.duration;
  return {
    id: feature.id,
    name: properties.name,
    kind: properties.kind,
    ...(typeof difficulty === "string" ? { difficulty } : {}),
    ...(typeof duration === "string" ? { duration } : {}),
  };
}

export const pilotFeatures: readonly PilotFeature[] = pilotGeoJSON.features.map(toPilotFeature);

export function pilotFeatureFromProperties(properties: Record<string, unknown>): PilotFeature | null {
  const id = properties.osm_id;
  const kind = properties.kind;
  if (typeof id !== "number" || (kind !== "lift" && kind !== "piste")) return null;
  const name = typeof properties.name === "string" ? properties.name : `OSM ${kind} ${id}`;
  const difficulty = properties["piste:difficulty"];
  const duration = properties["aerialway:duration"] ?? properties.duration;
  return {
    id: `way/${id}`,
    name,
    kind,
    ...(typeof difficulty === "string" ? { difficulty } : {}),
    ...(typeof duration === "string" ? { duration } : {}),
  };
}
