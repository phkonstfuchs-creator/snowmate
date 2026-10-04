import { describe, expect, it } from "vitest";
import { heroNameFontSize } from "./hero-name";

describe("heroNameFontSize", () => {
  it("keeps short names at full size", () => {
    expect(heroNameFontSize("Felix Gruber")).toBe(56);
  });

  it("shrinks a long single word so it fits", () => {
    const size = heroNameFontSize("Philipptesting");
    expect(size).toBeLessThan(56);
    expect(14 * 0.66 * size).toBeLessThanOrEqual(380);
  });

  it("never goes below the smallest readable size", () => {
    expect(heroNameFontSize("A".repeat(50))).toBe(26);
  });
});
