import { describe, expect, it } from "vitest";
import { pilotFeatureFromProperties, pilotFeatures, pilotGeoJSON } from "./catalog";

describe("pilot map catalog", () => {
  it("ships only source-backed pilot ways with retained OSM identity and revision", () => {
    expect(pilotGeoJSON.type).toBe("FeatureCollection");
    expect(pilotFeatures.length).toBeGreaterThan(0);
    for (const feature of pilotGeoJSON.features) {
      expect(feature.id).toMatch(/^way\/\d+$/u);
      expect(feature.properties.osm_id).toBe(Number(feature.id.slice(4)));
      expect(feature.properties.osm_version).toEqual(expect.any(Number));
      expect(feature.properties.osm_timestamp).toEqual(expect.any(String));
      expect(feature.geometry.coordinates.length).toBeGreaterThan(1);
    }
    expect(pilotFeatures.some((feature) => feature.id === "way/25170582" && feature.kind === "lift")).toBe(true);
    expect(pilotFeatures.some((feature) => feature.kind === "piste")).toBe(true);
  });

  it("maps OSM properties to the picker contract and rejects invalid rows", () => {
    expect(pilotFeatureFromProperties({ osm_id: 42, kind: "piste", name: "Run", "piste:difficulty": "easy" })).toEqual({ id: "way/42", name: "Run", kind: "piste", difficulty: "easy" });
    expect(pilotFeatureFromProperties({ osm_id: 43, kind: "lift", name: "Lift", "aerialway:duration": "4" })).toEqual({ id: "way/43", name: "Lift", kind: "lift", duration: "4" });
    expect(pilotFeatureFromProperties({ osm_id: "43", kind: "lift" })).toBeNull();
    expect(pilotFeatureFromProperties({ osm_id: 43, kind: "path" })).toBeNull();
  });
});
