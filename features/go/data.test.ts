import { beforeEach, expect, it, vi } from "vitest";
import { getGoStatus } from "./data";
const mocks = vi.hoisted(() => ({ createClient: vi.fn(), rpc: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));
const row = {
  id: "10000000-0000-4000-8000-000000000001",
  rideId: "10000000-0000-4000-8000-000000000002",
  minimumGroup: 2,
  needsCarpool: false,
  confirmedGroup: 2,
  hasConfirmedCarpool: false,
  groupReady: true,
  carpoolReady: true,
  ready: true,
  status: "ready",
};
beforeEach(() => {
  vi.clearAllMocks();
  mocks.createClient.mockResolvedValue({ rpc: mocks.rpc });
});
it("reads own conditions and distinguishes no interest", async () => {
  mocks.rpc
    .mockResolvedValueOnce({ data: row, error: null })
    .mockResolvedValueOnce({ data: null, error: null });
  expect(await getGoStatus(row.rideId)).toEqual({ status: "ready", data: row });
  expect(mocks.rpc).toHaveBeenCalledWith("get_ride_go_status", {
    p_ride_id: row.rideId,
  });
  expect(await getGoStatus(row.rideId)).toEqual({
    status: "ready",
    data: null,
  });
});
it("fails closed on errors, malformed data and exceptions", async () => {
  mocks.rpc
    .mockResolvedValueOnce({ data: row, error: { code: "bad" } })
    .mockResolvedValueOnce({ data: {}, error: null })
    .mockRejectedValueOnce(new Error("offline"));
  for (let i = 0; i < 3; i++)
    expect(await getGoStatus(row.rideId)).toEqual({ status: "unavailable" });
});
