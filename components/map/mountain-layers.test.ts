import { describe, expect, it } from "vitest";
import {
  isInsideMountainSnapshot,
  MOUNTAIN_LIFT_HIT_LAYER,
  MOUNTAIN_LIFT_LAYER,
  MOUNTAIN_PISTE_HIT_LAYER,
  MOUNTAIN_PISTE_LAYER,
  mountainLayers,
} from "./mountain-layers";

describe("MapLibre mountain layers", () => {
  it("draws pistes by difficulty and lifts as dashed lines", () => {
    const layers = mountainLayers(null);
    const piste = layers.find(({ id }) => id === MOUNTAIN_PISTE_LAYER);
    const lift = layers.find(({ id }) => id === MOUNTAIN_LIFT_LAYER);
    expect(piste?.filter).toEqual(["==", ["get", "kind"], "piste"]);
    expect((piste?.paint?.["line-color"] as unknown[]).slice(2)).toEqual([
      "novice", "#70b96e", "easy", "#287fc1", "intermediate", "#d74b43", "advanced", "#302c32", "expert", "#302c32", "freeride", "#76858c", "#76858c",
    ]);
    expect(lift?.filter).toEqual(["==", ["get", "kind"], "lift"]);
    expect(lift?.paint?.["line-dasharray"]).toEqual([1, 1.6]);
    expect(lift?.layout).not.toHaveProperty("line-dasharray");
  });

  it("keeps visible line strokes thin while adding comfortable click targets", () => {
    const layers = mountainLayers(null);
    const piste = layers.find(({ id }) => id === MOUNTAIN_PISTE_LAYER);
    const lift = layers.find(({ id }) => id === MOUNTAIN_LIFT_LAYER);
    const pisteHit = layers.find(({ id }) => id === MOUNTAIN_PISTE_HIT_LAYER);
    const liftHit = layers.find(({ id }) => id === MOUNTAIN_LIFT_HIT_LAYER);
    expect(piste?.paint?.["line-width"]).toEqual(["interpolate", ["linear"], ["zoom"], 10, 3, 13, 4, 16, 5]);
    expect(lift?.paint?.["line-width"]).toEqual(["interpolate", ["linear"], ["zoom"], 10, 3, 13, 4, 16, 5]);
    expect(pisteHit?.paint?.["line-width"]).toEqual(["interpolate", ["linear"], ["zoom"], 10, 12, 13, 14, 16, 16]);
    expect(liftHit?.paint?.["line-width"]).toEqual(["interpolate", ["linear"], ["zoom"], 10, 12, 13, 14, 16, 16]);
    expect(pisteHit?.paint?.["line-opacity"]).toBe(0.01);
    expect(liftHit?.paint?.["line-opacity"]).toBe(0.01);
  });

  it("highlights a selected feature by its canonical GeoJSON id", () => {
    const layers = mountainLayers("way/25170582");
    expect(layers.find(({ id }) => id === "mountain-selected-piste")?.filter).toEqual([
      "all", ["==", ["get", "kind"], "piste"], ["==", ["id"], "way/25170582"],
    ]);
    expect(layers.find(({ id }) => id === "mountain-selected-lift")?.filter).toEqual([
      "all", ["==", ["get", "kind"], "lift"], ["==", ["id"], "way/25170582"],
    ]);
  });

  it("exposes only the snapshot's geographic bounds for the raster handoff", () => {
    expect(isInsideMountainSnapshot(11.38, 47.3)).toBe(true);
    expect(isInsideMountainSnapshot(11.32, 47.22)).toBe(false);
    expect(isInsideMountainSnapshot(Number.NaN, 47.3)).toBe(false);
  });
});
