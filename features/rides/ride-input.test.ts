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
      message: "v.eventName",
    });
    expect(validateRideInput({ ...valid, visibility: "public", title: "Park day" }).success).toBe(true);
  });

  it.each([
    [{ meetTime: "25:00" }, "v.pickTime"],
    [{ rideDate: "tomorrow" }, "v.pickDate"],
    [{ meetPoint: "x" }, "v.addMeetPoint"],
    [{ totalSpots: 0 }, "v.minSpot"],
    [{ city: "wien" }, "v.pickRegion"],
  ])("rejects %j", (patch, message) => {
    expect(validateRideInput({ ...valid, ...patch })).toEqual({ success: false, message });
  });
});
