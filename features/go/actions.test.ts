import { beforeEach, expect, it, vi } from "vitest";
import { setGoInterestAction, withdrawGoInterestAction } from "./actions";
const mocks = vi.hoisted(() => ({ execute: vi.fn() }));
vi.mock("@/lib/supabase/commands", () => ({
  executeUuidCommand: mocks.execute,
  invalidCommandInput: () => ({ ok: false, message: "invalid" }),
}));
const input = {
  rideId: "10000000-0000-4000-8000-000000000001",
  minimumGroup: 2,
  needsCarpool: true,
  idempotencyKey: "20000000-0000-4000-8000-000000000001",
};
beforeEach(() => vi.clearAllMocks());
it("maps conditions to session bound commands", async () => {
  mocks.execute.mockResolvedValue({ ok: true, id: input.rideId });
  await setGoInterestAction(input);
  expect(mocks.execute).toHaveBeenCalledWith(
    "set_ride_go_interest",
    {
      p_ride_id: input.rideId,
      p_minimum_group: 2,
      p_needs_carpool: true,
      p_idempotency_key: input.idempotencyKey,
    },
    "/feed",
  );
  await withdrawGoInterestAction({
    rideId: input.rideId,
    idempotencyKey: input.idempotencyKey,
  });
  expect(mocks.execute).toHaveBeenLastCalledWith(
    "withdraw_ride_go_interest",
    { p_ride_id: input.rideId, p_idempotency_key: input.idempotencyKey },
    "/feed",
  );
});
it("rejects malformed commands before opening database", async () => {
  expect((await setGoInterestAction({})).ok).toBe(false);
  expect((await withdrawGoInterestAction({})).ok).toBe(false);
  expect(mocks.execute).not.toHaveBeenCalled();
});
