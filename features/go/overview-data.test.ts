import { beforeEach, expect, it, vi } from "vitest";
import { getOwnGoInterests } from "./data";
const mocks = vi.hoisted(() => ({ createClient: vi.fn(), rpc: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));
const rideId = "30000000-0000-4000-8000-000000000001";
const summary = {
  ride: { id: rideId, resort: { id: "stubai-glacier", name: "Stubai Glacier" }, startsAt: "2026-12-01T10:00:00+01:00", capacity: 4 },
  go: { id: "30000000-0000-4000-8000-000000000002", rideId, minimumGroup: 2, needsCarpool: false, confirmedGroup: 1, hasConfirmedCarpool: false, groupReady: true, carpoolReady: true, ready: true, status: "ready" },
};
beforeEach(() => { vi.clearAllMocks(); mocks.createClient.mockResolvedValue({ rpc: mocks.rpc }); });
it("loads current own summaries through bounded authenticated RPC", async () => {
  mocks.rpc.mockResolvedValueOnce({ data: [summary], error: null }).mockResolvedValueOnce({ data: [], error: null });
  expect(await getOwnGoInterests()).toEqual({ status: "ready", data: [summary] });
  expect(mocks.rpc).toHaveBeenCalledWith("get_own_ride_go_interests", { p_limit: 20 });
  expect(await getOwnGoInterests(1)).toEqual({ status: "ready", data: [] });
});
it("rejects invalid limits before creating a client", async () => {
  for (const limit of [0, 51, 1.5, Number.NaN]) expect(await getOwnGoInterests(limit)).toEqual({ status: "unavailable" });
  expect(mocks.createClient).not.toHaveBeenCalled();
});
it("fails closed for database errors, malformed responses and network failures", async () => {
  mocks.rpc.mockResolvedValueOnce({ data: [summary], error: { code: "denied" } }).mockResolvedValueOnce({ data: null, error: null }).mockRejectedValueOnce(new Error("offline"));
  for (let i = 0; i < 3; i++) expect(await getOwnGoInterests()).toEqual({ status: "unavailable" });
});
it("rejects more rows than the requested limit", async () => {
  const otherId = "30000000-0000-4000-8000-000000000003";
  mocks.rpc.mockResolvedValue({ data: [summary, { ...summary, ride: { ...summary.ride, id: otherId }, go: { ...summary.go, rideId: otherId } }], error: null });
  expect(await getOwnGoInterests(1)).toEqual({ status: "unavailable" });
});
