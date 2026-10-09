import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { listMyDayPlans } from "./queries";

const mocks = vi.hoisted(() => ({ createClient: vi.fn(), rpc: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));

const plan = {
  id: "8c2af272-90ac-4ef9-81ee-434fb8f18001",
  version: 1,
  city: "innsbruck",
  resort: "Stubai Glacier",
  planDate: "2026-10-10",
  meetTime: "09:15",
  transport: "need",
  meetingText: "Innsbruck Hbf",
  createdAt: "2026-10-09T10:00:00.000Z",
  updatedAt: "2026-10-09T10:00:00.000Z",
  expiresAt: "2026-10-12T00:00:00.000Z",
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.createClient.mockResolvedValue({ rpc: mocks.rpc });
});
afterEach(() => vi.restoreAllMocks());

describe("listMyDayPlans", () => {
  it("uses the owner-only RPC without accepting an owner id", async () => {
    mocks.rpc.mockResolvedValue({ data: { status: "ok", plans: [plan] }, error: null });
    await expect(listMyDayPlans()).resolves.toEqual({ status: "ok", plans: [plan] });
    expect(mocks.rpc).toHaveBeenCalledWith("list_my_day_plans");
  });

  it("does not turn a missing backend into an empty plan list", async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { code: "08006" } });
    await expect(listMyDayPlans()).resolves.toEqual({ status: "unavailable" });
    mocks.createClient.mockRejectedValueOnce(new Error("missing env"));
    await expect(listMyDayPlans()).resolves.toEqual({ status: "unavailable" });
  });

  it("fails closed if the RPC returns malformed data", async () => {
    mocks.rpc.mockResolvedValue({ data: { status: "ok", plans: [{ ...plan, userId: "leak" }] }, error: null });
    await expect(listMyDayPlans()).resolves.toEqual({ status: "unavailable" });
  });
});
