import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { deleteDayPlan, saveDayPlan } from "./actions";

const mocks = vi.hoisted(() => ({ createClient: vi.fn(), rpc: vi.fn(), revalidateApp: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));
vi.mock("@/lib/revalidate", () => ({ revalidateApp: mocks.revalidateApp }));

const input = {
  city: "innsbruck",
  resort: "Stubai Glacier",
  planDate: "2026-10-10",
  meetTime: "09:15",
  transport: "need",
  meetingText: "Innsbruck Hbf",
};
const id = "8c2af272-90ac-4ef9-81ee-434fb8f18001";
const plan = {
  id,
  version: 1,
  ...input,
  createdAt: "2026-10-09T10:00:00.000Z",
  updatedAt: "2026-10-09T10:00:00.000Z",
  expiresAt: "2026-10-12T00:00:00.000Z",
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-09T10:00:00.000Z"));
  mocks.createClient.mockResolvedValue({ rpc: mocks.rpc });
});
afterEach(() => vi.useRealTimers());

describe("day plan actions", () => {
  it("saves through the own-plan RPC and returns the saved key", async () => {
    mocks.rpc.mockResolvedValue({ data: { status: "saved", plan }, error: null });
    await expect(saveDayPlan(id, 0, input)).resolves.toEqual({ ok: true, message: "dayPlan.saved", plan });
    expect(mocks.rpc).toHaveBeenCalledWith("save_day_plan", {
      target_id: id,
      expected_version: 0,
      plan: input,
    });
    expect(mocks.revalidateApp).toHaveBeenCalled();
  });

  it("maps conflict, quota and rate limit without exposing database details", async () => {
    mocks.rpc.mockResolvedValueOnce({ data: { status: "conflict" }, error: null });
    await expect(saveDayPlan(id, 2, input)).resolves.toEqual({ ok: false, message: "dayPlan.conflict" });
    mocks.rpc.mockResolvedValueOnce({ data: { status: "limit" }, error: null });
    await expect(saveDayPlan(id, 0, input)).resolves.toEqual({ ok: false, message: "dayPlan.limit" });
    mocks.rpc.mockResolvedValueOnce({ data: { status: "rate_limited" }, error: null });
    await expect(saveDayPlan(id, 0, input)).resolves.toEqual({ ok: false, message: "dayPlan.rateLimited" });
  });

  it("validates before making a database request and preserves i18n keys", async () => {
    await expect(saveDayPlan(id, 0, { ...input, meetingText: "x".repeat(121) })).resolves.toEqual({
      ok: false,
      message: "v.max|120",
    });
    expect(mocks.createClient).not.toHaveBeenCalled();
  });

  it("deletes with version checks and treats absent/repeated deletion as success", async () => {
    mocks.rpc.mockResolvedValueOnce({ data: { status: "deleted" }, error: null });
    await expect(deleteDayPlan(id, 3)).resolves.toEqual({ ok: true, message: "dayPlan.deleted" });
    expect(mocks.rpc).toHaveBeenCalledWith("delete_day_plan", { target_id: id, expected_version: 3 });
    mocks.rpc.mockResolvedValueOnce({ data: { status: "missing" }, error: null });
    await expect(deleteDayPlan(id, 3)).resolves.toEqual({ ok: true, message: "dayPlan.deleted" });
    mocks.rpc.mockResolvedValueOnce({ data: { status: "conflict" }, error: null });
    await expect(deleteDayPlan(id, 1)).resolves.toEqual({ ok: false, message: "dayPlan.conflict" });
  });

  it("fails closed when a write is unavailable", async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { code: "x" } });
    await expect(saveDayPlan(id, 0, input)).resolves.toEqual({ ok: false, message: "common.unavailable" });
    mocks.createClient.mockRejectedValueOnce(new Error("offline"));
    await expect(deleteDayPlan(id, 1)).resolves.toEqual({ ok: false, message: "common.unavailable" });
  });
});
