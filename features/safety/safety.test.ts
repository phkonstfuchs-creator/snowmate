import { beforeEach, describe, expect, it, vi } from "vitest";
import { blockUserAction, reportUserAction, unblockUserAction } from "./actions";
import { listMyBlocks } from "./queries";
import { isReportReason } from "./reports";

const mocks = vi.hoisted(() => ({ createClient: vi.fn(), rpc: vi.fn(), revalidatePath: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.createClient.mockResolvedValue({ rpc: mocks.rpc });
});

describe("report reasons", () => {
  it("only accepts the database's reasons", () => {
    expect(isReportReason("harassment")).toBe(true);
    expect(isReportReason("rude")).toBe(false);
  });
});

describe("blockUserAction", () => {
  it("blocks and refreshes every social screen", async () => {
    mocks.rpc.mockResolvedValue({ data: "blocked", error: null });
    await expect(blockUserAction("u1")).resolves.toMatchObject({ ok: true });
    expect(mocks.rpc).toHaveBeenCalledWith("block_user", { target: "u1" });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/feed");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/carpool");
  });

  it("refuses self and failures", async () => {
    mocks.rpc.mockResolvedValueOnce({ data: "self", error: null });
    await expect(blockUserAction("me")).resolves.toMatchObject({ ok: false });
    await expect(blockUserAction("")).resolves.toMatchObject({ ok: false });
    mocks.rpc.mockResolvedValueOnce({ data: null, error: { code: "x" } });
    await expect(blockUserAction("u1")).resolves.toMatchObject({ ok: false });
    mocks.createClient.mockRejectedValueOnce(new Error("env"));
    await expect(blockUserAction("u1")).resolves.toMatchObject({ ok: false });
  });
});

describe("unblockUserAction", () => {
  it("unblocks", async () => {
    mocks.rpc.mockResolvedValueOnce({ data: true, error: null });
    await expect(unblockUserAction("u1")).resolves.toMatchObject({ ok: true });
    mocks.rpc.mockResolvedValueOnce({ data: false, error: null });
    await expect(unblockUserAction("u1")).resolves.toMatchObject({ ok: false });
    await expect(unblockUserAction("")).resolves.toMatchObject({ ok: false });
    mocks.rpc.mockResolvedValueOnce({ data: null, error: { code: "x" } });
    await expect(unblockUserAction("u1")).resolves.toMatchObject({ ok: false });
  });
});

describe("reportUserAction", () => {
  it("sends trimmed details and the ride", async () => {
    mocks.rpc.mockResolvedValue({ data: "reported", error: null });
    await expect(
      reportUserAction({ userId: "u1", reason: "spam", details: "  links  ", rideId: "r1", alsoBlock: true }),
    ).resolves.toMatchObject({ ok: true, message: expect.stringContaining("not see each other") });
    expect(mocks.rpc).toHaveBeenCalledWith("report_user", {
      target: "u1",
      reason: "spam",
      details: "links",
      ride: "r1",
      also_block: true,
    });
    expect(mocks.revalidatePath).toHaveBeenCalled();
  });

  it("reports without blocking", async () => {
    mocks.rpc.mockResolvedValue({ data: "reported", error: null });
    await expect(reportUserAction({ userId: "u1", reason: "other" })).resolves.toEqual({ ok: true, message: "Thanks. We will look at it." });
    expect(mocks.rpc).toHaveBeenCalledWith("report_user", expect.objectContaining({ details: null, ride: null, also_block: false }));
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  it.each([
    ["too_many", "many reports today"],
    ["self", "cannot report"],
  ])("explains %s", async (data, text) => {
    mocks.rpc.mockResolvedValue({ data, error: null });
    await expect(reportUserAction({ userId: "u1", reason: "spam" })).resolves.toMatchObject({ ok: false, message: expect.stringContaining(text) });
  });

  it("validates before asking the database", async () => {
    await expect(reportUserAction({ userId: "u1", reason: "rude" })).resolves.toMatchObject({ ok: false });
    await expect(reportUserAction({ userId: "u1", reason: "spam", details: "x".repeat(1001) })).resolves.toMatchObject({ ok: false });
    expect(mocks.rpc).not.toHaveBeenCalled();
    mocks.rpc.mockResolvedValueOnce({ data: null, error: { code: "x" } });
    await expect(reportUserAction({ userId: "u1", reason: "spam" })).resolves.toMatchObject({ ok: false });
  });
});

describe("listMyBlocks", () => {
  it("maps rows and fails soft", async () => {
    mocks.rpc.mockResolvedValueOnce({ data: [{ user_id: "u1", display_name: null, handle: "x_y" }], error: null });
    await expect(listMyBlocks()).resolves.toEqual([{ userId: "u1", displayName: null, handle: "x_y" }]);
    mocks.rpc.mockResolvedValueOnce({ data: null, error: { code: "x" } });
    await expect(listMyBlocks()).resolves.toBeNull();
    mocks.createClient.mockRejectedValueOnce(new Error("env"));
    await expect(listMyBlocks()).resolves.toBeNull();
  });
});
