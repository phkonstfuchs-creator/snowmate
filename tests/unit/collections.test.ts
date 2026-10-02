import { describe, expect, it } from "vitest";
import { toggleSetValue } from "@/lib/collections";

describe("toggleSetValue", () => {
  it("returns a new set and toggles membership", () => {
    const original = new Set(["ride-1"]);
    const result = toggleSetValue(original, "ride-1");

    expect(result).not.toBe(original);
    expect(result.has("ride-1")).toBe(false);
    expect(original.has("ride-1")).toBe(true);
  });

  it("adds a missing value without changing the source set", () => {
    const original = new Set<string>();
    const result = toggleSetValue(original, "ride-1");

    expect(result.has("ride-1")).toBe(true);
    expect(original.has("ride-1")).toBe(false);
  });
});
