import { describe, expect, it } from "vitest";
import { convertOverpass } from "./convert";

const funicular = { type: "way", id: 123, version: 2, timestamp: "2026-10-10T12:00:00Z", tags: { railway: "funicular", name: "Hungerburgbahn" }, geometry: [{ lat: 47.27, lon: 11.39 }, { lat: 47.28, lon: 11.4 }] };

describe("funicular geometry import", () => {
  it("accepts passenger funicular railways while preserving their actual source tags", () => {
    const data = convertOverpass({ elements: [funicular] });
    expect(data.features).toHaveLength(1);
    expect(data.features[0]).toMatchObject({ id: "way/123", properties: { kind: "lift", railway: "funicular", name: "Hungerburgbahn", osm_version: 2 }, geometry: { coordinates: [[11.39, 47.27], [11.4, 47.28]] } });
    expect(data.features[0]?.properties).not.toHaveProperty("aerialway");
  });
  it("does not import ordinary railway lines or join geometry across missing nodes", () => {
    expect(convertOverpass({ elements: [{ ...funicular, tags: { railway: "rail" } }] }).features).toHaveLength(0);
    expect(convertOverpass({ elements: [{ ...funicular, geometry: [funicular.geometry[0], {}, funicular.geometry[1]] }] }).features).toHaveLength(0);
  });
  it("excludes funicular ways with separate lifecycle tags", () => {
    for (const lifecycle of [{ disused: "yes" }, { abandoned: "yes" }, { construction: "yes" }, { "disused:railway": "funicular" }, { "abandoned:railway": "funicular" }, { "construction:railway": "funicular" }]) {
      expect(convertOverpass({ elements: [{ ...funicular, tags: { ...funicular.tags, ...lifecycle } }] }).features).toHaveLength(0);
    }
    expect(convertOverpass({ elements: [{ ...funicular, tags: { ...funicular.tags, disused: "no" } }] }).features).toHaveLength(1);
  });
  it("does not resurrect abandoned or construction railways as working lifts", () => {
    for (const tags of [{ railway: "abandoned", "abandoned:railway": "funicular" }, { railway: "construction", construction: "funicular" }]) {
      expect(convertOverpass({ elements: [{ ...funicular, tags }] }).features).toHaveLength(0);
    }
  });
});
