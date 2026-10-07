import { describe, expect, it } from "vitest";
import { contentSecurityPolicy } from "@/lib/security-headers";
import { MAP_TILE_HOSTS, PISTE_TILES, RASTER_FALLBACK_STYLE, TERRAIN_TILES, VECTOR_STYLE_URL, accuracyCircle, clampAccuracy, paperTint } from "./map-style";

describe("map style", () => {
  it("loads vector tiles over https and falls back to raster tiles", () => {
    expect(VECTOR_STYLE_URL).toMatch(/^https:\/\/tiles\.openfreemap\.org\//u);
    const source = RASTER_FALLBACK_STYLE.sources.carto!;
    expect(source.type).toBe("raster");
    expect("tiles" in source && source.tiles?.every((url) => url.startsWith("https://"))).toBe(true);
  });

  it("loads pistes and terrain over https from hosts the CSP allows", () => {
    const connect = contentSecurityPolicy("testnonce", false).match(/connect-src ([^;]+)/u)?.[1] ?? "";
    for (const host of MAP_TILE_HOSTS) expect(connect.split(" ")).toContain(host);
    expect(PISTE_TILES).toMatch(/^https:\/\/tiles\.opensnowmap\.org\/.+\{z\}\/\{x\}\/\{y\}\.png$/u);
    expect(TERRAIN_TILES).toMatch(/^https:\/\/s3\.amazonaws\.com\/elevation-tiles-prod\/terrarium\//u);
  });

  it("tints only background and known fill layers", () => {
    expect(paperTint("background", "background")?.property).toBe("background-color");
    expect(paperTint("water", "fill")).toEqual({ property: "fill-color", value: "#bcd3e0" });
    expect(paperTint("landcover_wood", "fill")?.value).toBe("#d3e2d3");
    expect(paperTint("landcover_ice_shelf", "fill")?.value).toBe("#ffffff");
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
