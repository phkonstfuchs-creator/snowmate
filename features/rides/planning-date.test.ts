import { describe, expect, it } from "vitest";
import { isPlanningDate } from "./planning-date";

describe("isPlanningDate", () => {
  it("uses the Vienna day at midnight and includes day 365", () => {
    const now = new Date("2026-10-06T22:30:00Z"); // already 7 October in Vienna
    expect(isPlanningDate("2026-10-06", now)).toBe(false);
    expect(isPlanningDate("2026-10-07", now)).toBe(true);
    expect(isPlanningDate("2027-10-07", now)).toBe(true);
    expect(isPlanningDate("2027-10-08", now)).toBe(false);
    expect(isPlanningDate("9999-01-01", now)).toBe(false);
  });
});
