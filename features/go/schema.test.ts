import { expect, it } from "vitest";
import {
  setGoInterestInputSchema,
  withdrawGoInterestInputSchema,
} from "./schema";
export const input = {
  rideId: "10000000-0000-4000-8000-000000000001",
  minimumGroup: 2,
  needsCarpool: true,
  idempotencyKey: "20000000-0000-4000-8000-000000000001",
};
it("validates conditions without trusting client identity", () => {
  expect(setGoInterestInputSchema.safeParse(input).success).toBe(true);
  for (const change of [
    { minimumGroup: 1 },
    { minimumGroup: 13 },
    { minimumGroup: 2.5 },
    { needsCarpool: "yes" },
    { rideId: "bad" },
    { userId: input.rideId },
  ])
    expect(
      setGoInterestInputSchema.safeParse({ ...input, ...change }).success,
    ).toBe(false);
  expect(
    withdrawGoInterestInputSchema.safeParse({
      rideId: input.rideId,
      idempotencyKey: input.idempotencyKey,
    }).success,
  ).toBe(true);
});
