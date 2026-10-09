import { describe, expect, it } from "vitest";
import { readMapAction, consumeMapAction } from "./map-entry";

describe("map entry", () => {
  it("accepts only a single explicit lift action", () => {
    expect(readMapAction("lift")).toBe("lift");
    for (const value of [undefined, "location", "LIFT", ["lift"], ["lift", "lift"]]) {
      expect(readMapAction(value)).toBeNull();
    }
  });
  it("consumes the action while keeping the local pin and other parameters", () => {
    expect(consumeMapAction("http://localhost/map?action=lift&lat=47&lng=11&label=Top#crew"))
      .toBe("/map?lat=47&lng=11&label=Top#crew");
    expect(consumeMapAction("http://localhost/map?action=lift")).toBe("/map");
  });
  it("leaves unknown or repeated actions alone", () => {
    expect(consumeMapAction("http://localhost/map?action=track")).toBeNull();
    expect(consumeMapAction("http://localhost/map?action=lift&action=lift")).toBeNull();
  });
});
