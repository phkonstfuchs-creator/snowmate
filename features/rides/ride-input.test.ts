import { describe, expect, it } from "vitest";
import { validateRideInput } from "./ride-input";

const valid = {
  resort: " Nordkette ",
  city: "innsbruck",
  abilityLevel: "park",
  rideDate: "2027-01-09",
  meetTime: "09:30",
  meetPoint: " Congress station ",
  totalSpots: 4,
  caption: "  ",
  visibility: "friends",
};

describe("validateRideInput", () => {
  it("normalises a friends ride", () => {
    expect(validateRideInput(valid)).toEqual({
      success: true,
      data: {
        resort: "Nordkette",
        city: "innsbruck",
        abilityLevel: "park",
        rideDate: "2027-01-09",
        meetTime: "09:30",
        meetPoint: "Congress station",
        totalSpots: 4,
        caption: null,
        visibility: "friends",
      },
    });
  });

  it("requires a name for a public event", () => {
    expect(validateRideInput({ ...valid, visibility: "public" })).toEqual({
      success: false,
      message: "Give the event a name (at least 3 characters).",
    });
    expect(validateRideInput({ ...valid, visibility: "public", title: "Park day" }).success).toBe(true);
  });

  it.each([
    [{ meetTime: "25:00" }, "Pick a time."],
    [{ rideDate: "tomorrow" }, "Pick a date."],
    [{ meetPoint: "x" }, "Add a meeting point."],
    [{ totalSpots: 0 }, "At least one spot."],
    [{ city: "wien" }, "Pick a region."],
  ])("rejects %j", (patch, message) => {
    expect(validateRideInput({ ...valid, ...patch })).toEqual({ success: false, message });
  });
});
