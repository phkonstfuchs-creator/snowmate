import { describe, expect, it } from "vitest";
import { mountainFeatureById } from "./catalog";
import { mountainFacilityById, mountainFacilityForFeature, NORDKETTE_INVENTORY_DATE, nordketteFacilities } from "./facilities";

describe("source-backed Nordkette facility inventory", () => {
  it("includes all six operator facilities separately from the five OSM ways", () => {
    expect(NORDKETTE_INVENTORY_DATE).toBe("2026-10-10");
    expect(nordketteFacilities.map(({ name }) => name)).toEqual([
      "Hungerburgbahn", "Seegrubenbahn", "Hafelekarbahn", "Sessellift 3er Stütze", "Sessellift Frau-Hitt-Warte", "Förderband Zauberteppich",
    ]);
    expect(new Set(nordketteFacilities.map(({ id }) => id)).size).toBe(6);
    for (const facility of nordketteFacilities) {
      expect(facility.sourceUrl).toBe("https://nordkette.com/lifte-pisten/");
      expect(facility.checkedAt).toBe(NORDKETTE_INVENTORY_DATE);
      expect(facility.resort).toBe("Nordkette");
      expect(mountainFacilityById(facility.id)).toEqual(facility);
    }
  });

  it("associates only explicitly named source ways and never confirms the unnamed carpet", () => {
    const matched = nordketteFacilities.filter(({ geometry }) => geometry.status === "matched");
    expect(matched).toHaveLength(4);
    expect(new Set(matched.map(({ geometry }) => geometry.featureId)).size).toBe(4);
    for (const facility of matched) {
      expect(mountainFeatureById(facility.geometry.featureId!)).toMatchObject({ kind: "lift" });
      expect(mountainFacilityForFeature(facility.geometry.featureId!)).toEqual(facility);
    }
    expect(mountainFacilityById("nordkette-hungerburgbahn")?.geometry).toEqual({ status: "missing", featureId: null });
    expect(mountainFacilityById("nordkette-zauberteppich")?.geometry).toEqual({ status: "candidate", featureId: "way/706193014" });
    expect(mountainFacilityForFeature("way/706193014")).toBeNull();
    for (const id of ["way/24559397", "way/42", "nordkette-seegrubenbahn", "way/0"]) expect(mountainFacilityForFeature(id)).toBeNull();
    expect(mountainFacilityById("unknown")).toBeNull();
  });

  it("retains minimum and approximate operator durations without converting them to exact ETA", () => {
    expect(mountainFacilityForFeature("way/25170582")?.rideTime).toEqual({ kind: "minimum", minutes: 6.5, sourceUrl: "https://nordkette.com/top-of-innsbruck/technik/" });
    expect(mountainFacilityForFeature("way/25282282")?.rideTime).toEqual({ kind: "approximate", minutes: 4, sourceUrl: "https://nordkette.com/top-of-innsbruck/technik/" });
    for (const id of ["nordkette-dreierstuetze", "nordkette-frau-hitt", "nordkette-zauberteppich"]) {
      expect(mountainFacilityById(id)?.rideTime).toBeNull();
      expect(mountainFacilityById(id)?.departureInterval).toBeNull();
    }
  });

  it("keeps conflicting Hungerburg ride times visible and departure cadence distinct", () => {
    expect(mountainFacilityById("nordkette-hungerburgbahn")?.rideTime).toEqual({
      kind: "conflicting", values: [6, 8], sourceUrls: ["https://nordkette.com/top-of-innsbruck/technik/", "https://nordkette.com/top-of-innsbruck/hungerburgbahn/"],
    });
    for (const id of ["nordkette-hungerburgbahn", "nordkette-seegrubenbahn", "nordkette-hafelekarbahn"]) {
      expect(mountainFacilityById(id)?.departureInterval).toEqual({ minutes: 15, sourceUrl: "https://nordkette.com/anlagen-fahrplan/" });
    }
  });
});
