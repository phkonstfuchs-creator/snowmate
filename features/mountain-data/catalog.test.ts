import { describe, expect, it } from "vitest";
import pilotSource from "./pilot.json";
import {
  MOUNTAIN_SNAPSHOT_DATE,
  mountainFeatureById,
  mountainFeatureFocus,
  mountainFeatureFromProperties,
  mountainFeatures,
  mountainGeoJSON,
} from "./catalog";
import { formatMountainDuration } from "./duration";

describe("shared Nordkette mountain catalog", () => {
  it("keeps the dated 30-way snapshot, its clipped geometry and OSM revisions", () => {
    expect(MOUNTAIN_SNAPSHOT_DATE).toBe("2026-10-09");
    expect(mountainGeoJSON).toEqual(pilotSource);
    expect(mountainFeatures).toHaveLength(30);
    expect(mountainFeatures.filter(({ kind }) => kind === "lift")).toHaveLength(5);
    expect(mountainFeatures.filter(({ kind }) => kind === "piste")).toHaveLength(25);

    for (const feature of mountainFeatures) {
      expect(feature.resort).toBe("Nordkette");
      expect(feature.osmVersion).toEqual(expect.any(Number));
      expect(feature.osmTimestamp).toEqual(expect.any(String));
      expect(feature.id).toMatch(/^way\/[1-9]\d*$/u);
      expect(mountainFeatureById(feature.id)).toEqual(feature);
    }

    expect(mountainFeatureById("way/706193014")).toMatchObject({ aerialwayType: "magic_carpet" });
    expect(mountainFeatureById("way/25170582")).toMatchObject({ id: "way/25170582", name: "Seegrubenbahn", kind: "lift", osmVersion: 25 });
    expect(mountainFeatureById("way/24559397")).toMatchObject({ id: "way/24559397", name: "2 - Zweier Skiroute", kind: "piste", osmVersion: 35 });
  });

  it("resolves only bundled ways with a valid OSM id and matching kind", () => {
    expect(mountainFeatureFromProperties({ osm_id: 25170582, kind: "lift", name: "Injected" })).toMatchObject({ name: "Seegrubenbahn", kind: "lift" });
    expect(mountainFeatureFromProperties({ osm_id: 24559397, kind: "piste", name: "Injected", status: "open" })).toMatchObject({ name: "2 - Zweier Skiroute", kind: "piste" });
    expect(mountainFeatureFromProperties({ osm_id: 25170582, kind: "piste" })).toBeNull();
    expect(mountainFeatureFromProperties({ osm_id: 42, kind: "lift", name: "Invented way" })).toBeNull();

    for (const osmId of ["25170582", 0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(mountainFeatureFromProperties({ osm_id: osmId, kind: "lift" })).toBeNull();
    }
    expect(mountainFeatureFromProperties({ osm_id: 25170582, kind: "path" })).toBeNull();
  });

  it("returns bounded Nordkette focus coordinates for known ways only", () => {
    const focus = mountainFeatureFocus("way/25170582");
    expect(focus).not.toBeNull();
    expect(focus?.lat).toBeGreaterThan(47.2);
    expect(focus?.lat).toBeLessThan(47.5);
    expect(focus?.lng).toBeGreaterThan(11.2);
    expect(focus?.lng).toBeLessThan(11.5);
    expect(focus?.zoom).toBeGreaterThanOrEqual(12);
    expect(focus?.zoom).toBeLessThanOrEqual(20);
    expect(mountainFeatureFocus("way/999999999")).toBeNull();
    expect(mountainFeatureFocus("25170582")).toBeNull();
  });

  it("formats only plausible numeric minute values in the requested locale", () => {
    expect(formatMountainDuration("5.166666667")).toBe("5,2 min");
    expect(formatMountainDuration("5.166666667", "en")).toBe("5.2 min");
    expect(formatMountainDuration("2")).toBe("2 min");
    for (const value of [undefined, "", "-3", "0", "4 minutes", "Infinity", "999999"]) {
      expect(formatMountainDuration(value)).toBeNull();
    }
  });
});
