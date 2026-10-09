import { beforeEach, expect, it, vi } from "vitest";
import { saveGoInterest, withdrawGoInterest, readGoStatus } from "./actions";
const m = vi.hoisted(() => ({
  rpc: vi.fn(),
  createClient: vi.fn(),
  refresh: vi.fn(),
}));
vi.mock("@/lib/supabase/server", () => ({ createClient: m.createClient }));
vi.mock("@/lib/revalidate", () => ({ revalidateApp: m.refresh }));
vi.mock("@/lib/i18n/server", () => ({
  getT: async () => (key: string) => key,
}));
const id = "00000000-0000-4000-8000-000000000001";
beforeEach(() => {
  vi.clearAllMocks();
  m.createClient.mockResolvedValue({ rpc: m.rpc });
});
it("validates before calling session-owned commands", async () => {
  expect((await saveGoInterest(id, 1, true)).ok).toBe(false);
  expect((await saveGoInterest("forged", 3, true)).ok).toBe(false);
  expect(m.rpc).not.toHaveBeenCalled();
  m.rpc.mockResolvedValue({ data: "saved", error: null });
  expect((await saveGoInterest(id, 3, true)).ok).toBe(true);
  expect(m.rpc).toHaveBeenCalledWith("set_ride_go_interest", {
    target_ride: id,
    minimum_group: 3,
    needs_carpool: true,
  });
  expect(m.refresh).toHaveBeenCalled();
});
it("allows withdrawal, rejects unknown/error results and reads no wish", async () => {
  m.rpc.mockResolvedValueOnce({ data: "withdrawn", error: null });
  expect((await withdrawGoInterest(id)).ok).toBe(true);
  m.rpc.mockResolvedValueOnce({ data: "unexpected", error: null });
  expect((await withdrawGoInterest(id)).ok).toBe(false);
  m.rpc.mockRejectedValueOnce(new Error("offline"));
  expect((await saveGoInterest(id, 3, false)).ok).toBe(false);
  m.rpc.mockResolvedValueOnce({ data: null, error: null });
  expect(await readGoStatus(id)).toEqual({ status: "ok", wish: null });
});
