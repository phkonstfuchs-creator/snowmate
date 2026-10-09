import { describe, expect, it } from "vitest";
import { parseGoStatus, parseGoOverview } from "./go-status";
const id = "00000000-0000-4000-8000-000000000001";
export const wish = {
  id,
  rideId: id,
  minimumGroup: 3,
  needsCarpool: true,
  confirmedGroup: 1,
  hasConfirmedCarpool: false,
  groupReady: false,
  carpoolReady: false,
  ready: false,
  status: "interested",
};
describe("Go DTO", () => {
  it("accepts a real status and no wish", () => {
    expect(parseGoStatus(wish, id)).toEqual(wish);
    expect(parseGoStatus(null, id)).toBeNull();
  });
  it("rejects cross-ride data, invalid booleans and leaked fields", () => {
    expect(
      parseGoStatus(
        { ...wish, rideId: "00000000-0000-4000-8000-000000000002" },
        id,
      ),
    ).toBeUndefined();
    expect(parseGoStatus({ ...wish, ready: "yes" }, id)).toBeUndefined();
    expect(
      parseGoStatus({ ...wish, meetPoint: "private" }, id),
    ).toBeUndefined();
  });
  it("rejects duplicate or mismatched overview and ended wishes", () => {
    const row = {
      ride: {
        id,
        resort: "Stubai",
        rideDate: "2027-01-08",
        meetTime: "09:00:00",
        totalSpots: 3,
      },
      go: wish,
    };
    expect(parseGoOverview([row])).toEqual([row]);
    expect(parseGoOverview([row, row])).toBeUndefined();
    expect(
      parseGoOverview([{ ...row, go: { ...wish, status: "expired" } }]),
    ).toBeUndefined();
    expect(
      parseGoOverview([{ ...row, go: { ...wish, confirmedGroup: 5 } }]),
    ).toBeUndefined();
  });
});

it("preserves existing large ride capacity", () => {
  expect(
    parseGoOverview([
      {
        ride: {
          id,
          resort: "Stubai",
          rideDate: "2027-01-08",
          meetTime: "09:00:00",
          totalSpots: 50,
        },
        go: { ...wish, minimumGroup: 12, confirmedGroup: 51 },
      },
    ]),
  ).toHaveLength(1);
  expect(parseGoStatus({ ...wish, minimumGroup: 13 }, id)).toBeUndefined();
});

it("preserves a saved wish when the host reduces capacity below its minimum", () => {
  const row = {
    ride: {
      id,
      resort: "Stubai",
      rideDate: "2027-01-08",
      meetTime: "09:00:00",
      totalSpots: 3,
    },
    go: { ...wish, minimumGroup: 6, groupReady: false, ready: false },
  };
  expect(parseGoOverview([row])).toEqual([row]);
});
