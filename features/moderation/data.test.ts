import { beforeEach, describe, expect, it, vi } from "vitest";

import { getModerationAppeals, getModerationQueue } from "./data";

const mocks = vi.hoisted(() => ({ createClient: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));

const rpc = vi.fn();
const reportId = "10000000-0000-4000-8000-000000000001";

describe("moderation data access", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createClient.mockResolvedValue({ rpc });
  });

  it("loads a bounded operator queue through its guarded RPC", async () => {
    rpc.mockResolvedValue({ data: [], error: null });

    await expect(getModerationQueue(50)).resolves.toEqual({
      status: "ready",
      data: [],
    });
    expect(rpc).toHaveBeenCalledWith("get_moderation_queue", { p_limit: 50 });
  });

  it("rejects invalid limits before opening a database client", async () => {
    await expect(getModerationQueue(501)).resolves.toEqual({
      status: "unavailable",
    });
    expect(mocks.createClient).not.toHaveBeenCalled();
  });

  it("loads appeals for a validated report and hides RPC failures", async () => {
    rpc.mockResolvedValueOnce({ data: [], error: null });
    await expect(getModerationAppeals(reportId)).resolves.toEqual({
      status: "ready",
      data: [],
    });
    expect(rpc).toHaveBeenCalledWith("get_moderation_appeals", {
      p_report_id: reportId,
    });

    rpc.mockRejectedValueOnce(new Error("private operator error"));
    await expect(getModerationAppeals(reportId)).resolves.toEqual({
      status: "unavailable",
    });
  });
});
