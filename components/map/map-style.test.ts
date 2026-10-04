import { describe, expect, it } from "vitest";
import { RASTER_FALLBACK_STYLE, VECTOR_STYLE_URL, accuracyCircle, clampAccuracy, paperTint } from "./map-style";

describe("map style", () => {
  it("loads vector tiles over https and falls back to raster tiles", () => {
    expect(VECTOR_STYLE_URL).toMatch(/^https:\/\/tiles\.openfreemap\.org\//u);
    const source = RASTER_FALLBACK_STYLE.sources.carto!;
    expect(source.type).toBe("raster");
    expect("tiles" in source && source.tiles?.every((url) => url.startsWith("https://"))).toBe(true);
  });

  it("tints only background and known fill layers", () => {
    expect(paperTint("background", "background")?.property).toBe("background-color");
    expect(paperTint("water", "fill")).toEqual({ property: "fill-color", value: "#c9d6dc" });
    expect(paperTint("landcover_wood", "fill")?.value).toBe("#dfe0c8");
    expect(paperTint("landcover_ice_shelf", "fill")?.value).toBe("#f7f4ee");
    expect(paperTint("building", "fill")).toBeNull();
    expect(paperTint("water_name", "symbol")).toBeNull();
  });

  it("draws a closed accuracy circle of the right size", () => {
    const circle = accuracyCircle(11.4, 47.26, 100, 8);
    const ring = circle.geometry.coordinates[0]!;
    expect(ring).toHaveLength(9);
    expect(ring[0]).toEqual(ring[8]);
    /* 100 m north is about 0.0009 degrees of latitude. */
    const north = ring[2]!;
    expect(north[1] - 47.26).toBeCloseTo(0.0009, 4);
    expect(north[0]).toBeCloseTo(11.4, 6);
  });

  it("keeps the accuracy radius believable", () => {
    expect(clampAccuracy(null)).toBe(5);
    expect(clampAccuracy(1)).toBe(5);
    expect(clampAccuracy(40)).toBe(40);
    expect(clampAccuracy(50000)).toBe(2000);
  });
});
