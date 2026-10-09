import { beforeEach, expect, it, vi } from "vitest";
import { listMyGoInterests, getGoStatus } from "./queries";
const m = vi.hoisted(() => ({ createClient: vi.fn(), rpc: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: m.createClient }));
const id = "00000000-0000-4000-8000-000000000001";
beforeEach(() => {
  vi.clearAllMocks();
  m.createClient.mockResolvedValue({ rpc: m.rpc });
});
it("uses session RPC and distinguishes empty from unavailable", async () => {
  m.rpc.mockResolvedValue({ data: [], error: null });
  expect(await listMyGoInterests()).toEqual({ status: "ok", interests: [] });
  expect(m.rpc).toHaveBeenCalledWith("list_my_ride_go_interests", {
    p_limit: 20,
  });
  m.rpc.mockResolvedValue({ data: null, error: null });
  expect(await getGoStatus(id)).toEqual({ status: "ok", wish: null });
  m.rpc.mockResolvedValue({ data: null, error: { code: "42501" } });
  expect(await getGoStatus(id)).toEqual({ status: "unavailable" });
});
it("rejects bad identity/limits before database and malformed results", async () => {
  expect(await getGoStatus("forged")).toEqual({ status: "unavailable" });
  expect(await listMyGoInterests(0)).toEqual({ status: "unavailable" });
  expect(m.rpc).not.toHaveBeenCalled();
  m.rpc.mockResolvedValue({ data: { secret: true }, error: null });
  expect(await listMyGoInterests()).toEqual({ status: "unavailable" });
  m.createClient.mockRejectedValue(new Error("offline"));
  expect(await getGoStatus(id)).toEqual({ status: "unavailable" });
});
