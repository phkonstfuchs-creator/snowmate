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
const NOW = new Date("2027-01-08T08:00:00Z");

describe("validateRideInput", () => {
  it("normalises a friends ride", () => {
    expect(validateRideInput(valid, NOW)).toEqual({
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
    expect(validateRideInput({ ...valid, visibility: "public" }, NOW)).toEqual({
      success: false,
      message: "v.eventName",
    });
    expect(validateRideInput({ ...valid, visibility: "public", title: "Park day" }, NOW).success).toBe(true);
  });

  it.each([
    [{ meetTime: "25:00" }, "v.pickTime"],
    [{ rideDate: "tomorrow" }, "v.pickDate"],
    [{ meetPoint: "x" }, "v.addMeetPoint"],
    [{ totalSpots: 0 }, "v.minSpot"],
    [{ city: "wien" }, "v.pickRegion"],
  ])("rejects %j", (patch, message) => {
    expect(validateRideInput({ ...valid, ...patch }, NOW)).toEqual({ success: false, message });
  });

  it.each(["2027-01-07", "2028-01-09", "9999-01-01"])("refuses out-of-window date %s", (rideDate) => {
    expect(validateRideInput({ ...valid, rideDate }, NOW)).toEqual({ success: false, message: "v.dateWithinYear" });
  });
});
