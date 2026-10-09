import { describe, expect, it } from "vitest";
import { convertOverpass, featureBounds } from "./convert";

describe("pilot map conversion", () => {
  it("keeps source ids and tags while converting valid lifts and pistes", () => {
    const result = convertOverpass({
      elements: [
        { type: "way", id: 123, version: 4, timestamp: "2026-01-02T03:04:05Z", tags: { aerialway: "gondola", name: "Testbahn", duration: "4.5" }, geometry: [{ lat: 47.3, lon: 11.3 }, { lat: 47.31, lon: 11.31 }] },
        { type: "way", id: 456, version: 8, timestamp: "2026-01-03T03:04:05Z", tags: { "piste:type": "downhill", "piste:difficulty": "intermediate", name: "Piste 1" }, geometry: [{ lat: 47.3, lon: 11.3 }, { lat: 47.32, lon: 11.32 }] },
      ],
    });
    expect(result.features).toHaveLength(2);
    expect(result.features[0]).toMatchObject({ id: "way/123", properties: { osm_id: 123, osm_version: 4, aerialway: "gondola", name: "Testbahn", duration: "4.5", kind: "lift" } });
    expect(result.features[1]).toMatchObject({ id: "way/456", properties: { osm_id: 456, osm_version: 8, "piste:difficulty": "intermediate", kind: "piste" } });
    expect(result.features[0]!.geometry.coordinates[0]).toEqual([11.3, 47.3]);
  });

  it("ignores unrelated, malformed, retired piste, and non-passenger lift ways", () => {
    const result = convertOverpass({ elements: [
      { type: "node", id: 1, lat: 47.3, lon: 11.3 },
      { type: "way", id: 2, tags: { highway: "path" }, geometry: [{ lat: 47.3, lon: 11.3 }, { lat: 47.31, lon: 11.31 }] },
      { type: "way", id: 3, tags: { aerialway: "gondola" } },
      { type: "way", id: 4, tags: { "piste:type": "downhill", "disused:piste:type": "downhill" }, geometry: [{ lat: 47.3, lon: 11.3 }] },
      { type: "way", id: 5, tags: { aerialway: "goods" }, geometry: [{ lat: 47.3, lon: 11.3 }, { lat: 47.31, lon: 11.31 }] },
    ] });
    expect(result.features).toEqual([]);
  });

  it("rejects an entire way when a malformed interior vertex would create a false bridge", () => {
    const result = convertOverpass({ elements: [
      { type: "way", id: 777, tags: { "piste:type": "downhill" }, geometry: [
        { lat: 47.3, lon: 11.3 },
        { lat: 47.31 },
        { lat: 47.32, lon: 11.32 },
      ] },
    ] });
    expect(result.features).toEqual([]);
  });

  it("rejects an invalid source envelope instead of treating it as an empty import", () => {
    expect(() => convertOverpass({ remark: "Overpass error" })).toThrow(/elements/u);
  });

  it("computes feature bounds in MapLibre order", () => {
    const result = convertOverpass({ elements: [
      { type: "way", id: 9, tags: { aerialway: "chair_lift" }, geometry: [{ lat: 47.32, lon: 11.4 }, { lat: 47.29, lon: 11.35 }] },
    ] });
    expect(featureBounds(result)).toEqual([11.35, 47.29, 11.4, 47.32]);
  });

  it("rejects invalid way identities without changing the source payload", () => {
    const row = { type: "way", id: -9, tags: { aerialway: "gondola" }, geometry: [{ lat: 47.3, lon: 11.3 }, { lat: 47.31, lon: 11.31 }] };
    const payload = { elements: [row] };
    const before = structuredClone(payload);
    expect(convertOverpass(payload).features).toEqual([]);
    expect(payload).toEqual(before);
  });
});
