import { describe, expect, it } from "vitest";
import { formatPilotDuration } from "./duration";

describe("unverified OSM lift duration", () => {
  it("shows decimal minutes without claiming excess precision", () => {
    expect(formatPilotDuration("5.166666667")).toBe("5,2 min");
    expect(formatPilotDuration("2")).toBe("2 min");
  });
  it("does not turn malformed, zero or negative source values into a duration", () => {
    for (const value of [undefined, "", "-3", "0", "4 minutes", "Infinity"]) expect(formatPilotDuration(value)).toBeNull();
  });
});
