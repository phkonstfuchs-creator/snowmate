import { expect, it } from "vitest";
import { parseOwnGoInterests } from "./dto";

const rideId = "30000000-0000-4000-8000-000000000001";
const summary = {
  ride: {
    id: rideId,
    resort: { id: "stubai-glacier", name: "Stubai Glacier" },
    startsAt: "2026-12-01T10:00:00+01:00",
    capacity: 4,
  },
  go: {
    id: "30000000-0000-4000-8000-000000000002",
    rideId,
    minimumGroup: 3,
    needsCarpool: true,
    confirmedGroup: 1,
    hasConfirmedCarpool: false,
    groupReady: false,
    carpoolReady: false,
    ready: false,
    status: "interested",
  },
};
it("parses own summaries and a genuine empty list", () => {
  expect(parseOwnGoInterests([summary])).toEqual([summary]);
  expect(parseOwnGoInterests([])).toEqual([]);
});
it("fails closed on extra location data, inconsistent identity and malformed nested values", () => {
  for (const input of [
    null,
    {},
    [{ ...summary, meetingPoint: "private" }],
    [{ ...summary, ride: { ...summary.ride, capacity: 99 } }],
    [{ ...summary, go: { ...summary.go, confirmedGroup: 5 } }],
    [{ ...summary, ride: { ...summary.ride, startsAt: "tomorrow" } }],
    [
      {
        ...summary,
        go: { ...summary.go, rideId: "30000000-0000-4000-8000-000000000003" },
      },
    ],
    [{ ...summary, go: { ...summary.go, status: "withdrawn" } }],
    [
      {
        ...summary,
        ride: {
          ...summary.ride,
          resort: { ...summary.ride.resort, latitude: 1 },
        },
      },
    ],
  ]) {
    expect(parseOwnGoInterests(input)).toBeNull();
  }
});
it("rejects duplicate rides and responses above the hard maximum", () => {
  expect(parseOwnGoInterests([summary, summary])).toBeNull();
  expect(
    parseOwnGoInterests(Array.from({ length: 51 }, () => summary)),
  ).toBeNull();
});
