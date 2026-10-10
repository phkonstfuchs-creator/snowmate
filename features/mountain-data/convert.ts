export interface OverpassElement {
  type?: string;
  id?: number;
  version?: number;
  timestamp?: string;
  tags?: Record<string, string>;
  geometry?: Array<{ lat?: number; lon?: number }>;
}

export interface OverpassResponse {
  elements?: OverpassElement[];
}

export interface MountainGeoFeature {
  type: "Feature";
  id: string;
  properties: Record<string, string | number | null> & {
    osm_id: number;
    osm_type: "way";
    kind: "lift" | "piste";
    name: string;
    osm_version: number | null;
    osm_timestamp: string | null;
  };
  geometry: { type: "LineString"; coordinates: [number, number][] };
}

export interface MountainGeoCollection {
  type: "FeatureCollection";
  features: MountainGeoFeature[];
}

/** Legacy type names retained for preview consumers. */
export type PilotGeoFeature = MountainGeoFeature;
export type PilotGeoCollection = MountainGeoCollection;

const PASSENGER_LIFTS = new Set(["cable_car", "gondola", "chair_lift", "mixed_lift", "drag_lift", "t-bar", "j-bar", "platter", "rope_tow", "magic_carpet", "funicular"]);
const ROUTE_TYPES = new Set(["downhill", "nordic", "skitour", "sled", "ice_skating"]);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export function convertOverpass(payload: unknown): MountainGeoCollection {
  if (!isRecord(payload) || !Array.isArray(payload.elements)) {
    throw new TypeError("OSM source response must contain an elements array");
  }
  const features = payload.elements.flatMap((raw): MountainGeoFeature[] => {
    if (!isRecord(raw) || raw.type !== "way" || typeof raw.id !== "number" || !Number.isSafeInteger(raw.id) || raw.id <= 0 || !Array.isArray(raw.geometry)) return [];
    const tags = isRecord(raw.tags) ? raw.tags : {};
    const inactiveFunicular = ["disused", "abandoned", "construction"].some((lifecycle) =>
      tags[lifecycle] === "yes" || tags[`${lifecycle}:railway`] === "funicular",
    );
    const isLift = (typeof tags.aerialway === "string" && PASSENGER_LIFTS.has(tags.aerialway)) || (tags.railway === "funicular" && !inactiveFunicular);
    const pisteType = tags["piste:type"];
    const isPiste = typeof pisteType === "string" && ROUTE_TYPES.has(pisteType) && typeof tags["disused:piste:type"] !== "string";
    if (!isLift && !isPiste) return [];

    const coordinates = raw.geometry.flatMap((point): [number, number][] => {
      if (!isRecord(point) || typeof point.lat !== "number" || typeof point.lon !== "number" ||
          !Number.isFinite(point.lat) || !Number.isFinite(point.lon) || point.lat < -90 || point.lat > 90 || point.lon < -180 || point.lon > 180) return [];
      return [[point.lon, point.lat]];
    });
    if (coordinates.length !== raw.geometry.length || coordinates.length < 2) return [];

    const properties = Object.fromEntries(Object.entries(tags).filter((entry): entry is [string, string] => typeof entry[1] === "string"));
    return [{
      type: "Feature",
      id: `way/${raw.id}`,
      properties: {
        ...properties,
        osm_id: raw.id,
        osm_type: "way",
        kind: isLift ? "lift" : "piste",
        ...(typeof tags.name === "string" ? { osm_name: tags.name } : {}),
        name: isPiste && typeof tags["piste:name"] === "string" ? tags["piste:name"] : typeof tags.name === "string" ? tags.name : typeof tags.ref === "string" ? tags.ref : `OSM ${isLift ? "lift" : "piste"} ${raw.id}`,
        osm_version: typeof raw.version === "number" ? raw.version : null,
        osm_timestamp: typeof raw.timestamp === "string" ? raw.timestamp : null,
      },
      geometry: { type: "LineString", coordinates },
    }];
  });

  return { type: "FeatureCollection", features };
}

export function featureBounds(collection: MountainGeoCollection): [number, number, number, number] | null {
  const points = collection.features.flatMap((feature) => feature.geometry.coordinates);
  if (points.length === 0) return null;
  return points.reduce<[number, number, number, number]>(
    ([west, south, east, north], [lon, lat]) => [Math.min(west, lon), Math.min(south, lat), Math.max(east, lon), Math.max(north, lat)],
    [points[0]![0], points[0]![1], points[0]![0], points[0]![1]],
  );
}
