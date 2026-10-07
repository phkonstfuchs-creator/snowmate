import { describe, expect, it } from "vitest";
import { seasonLabel } from "./season";

describe("seasonLabel", () => {
  it("turns over on 1 September", () => {
    expect(seasonLabel(new Date(2026, 9, 7))).toBe("26/27");
    expect(seasonLabel(new Date(2026, 8, 1))).toBe("26/27");
    expect(seasonLabel(new Date(2026, 7, 31))).toBe("25/26");
    expect(seasonLabel(new Date(2027, 1, 14))).toBe("26/27");
    expect(seasonLabel(new Date(2099, 9, 1))).toBe("99/00");
  });
});
