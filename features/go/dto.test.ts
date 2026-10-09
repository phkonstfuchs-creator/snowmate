import { expect, it } from "vitest";
import { parseGoStatus } from "./dto";
export const status = {
  id: "10000000-0000-4000-8000-000000000001",
  rideId: "10000000-0000-4000-8000-000000000002",
  minimumGroup: 2,
  needsCarpool: true,
  confirmedGroup: 1,
  hasConfirmedCarpool: false,
  groupReady: false,
  carpoolReady: false,
  ready: false,
  status: "interested",
};
it("parses only the own status contract", () => {
  expect(parseGoStatus(status)).toEqual(status);
  expect(parseGoStatus(null)).toBeNull();
  for (const change of [
    { minimumGroup: 0 },
    { ready: "true" },
    { status: "fake" },
    { meetingPoint: "private" },
  ])
    expect(parseGoStatus({ ...status, ...change })).toBeNull();
});
