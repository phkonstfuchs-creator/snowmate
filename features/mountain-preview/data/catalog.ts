import { mountainFeatures, mountainGeoJSON } from "../../mountain-data/catalog";
import type { MountainGeoCollection } from "../../mountain-data/convert";

export interface PilotFeature {
  id: string;
  name: string;
  kind: "lift" | "piste";
  difficulty?: string;
  duration?: string;
}

export const pilotGeoJSON = mountainGeoJSON as MountainGeoCollection;
export const pilotFeatures: readonly PilotFeature[] = mountainFeatures.map(({ id, name, kind, difficulty, duration }) => ({
  id,
  name,
  kind,
  ...(difficulty === undefined ? {} : { difficulty }),
  ...(duration === undefined ? {} : { duration }),
}));

/** Kept solely for the preview's older picker tests and non-source use. */
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
