import { describe, expect, it } from "vitest";
import { RESORT_STATUS } from "@/lib/data";
import { RESORTS, resortCoordinates, resortNamesIn } from "./resorts";

describe("resort catalogue", () => {
  it("lists every resort once", () => {
    expect(new Set(RESORTS.map((r) => r.name)).size).toBe(RESORTS.length);
  });

  it("covers every resort the prototype shows", () => {
    for (const status of RESORT_STATUS) {
      expect(RESORTS).toContainEqual(expect.objectContaining({ name: status.name, city: status.city }));
    }
  });

  it("filters by region and finds coordinates", () => {
    expect(resortNamesIn("salzburg")).toContain("Zell am See");
    expect(resortNamesIn("salzburg")).not.toContain("Nordkette");
    expect(resortCoordinates("Nordkette")).toEqual([47.3247, 11.3867]);
    expect(resortCoordinates("Nowhere")).toBeUndefined();
  });
});
