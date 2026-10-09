import { beforeEach, describe, expect, it, vi } from "vitest";
import { getAccountDeletionStatus, getExportRequests } from "./data";

const mocks = vi.hoisted(() => ({ createClient: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));

const rpc = vi.fn();

describe("account lifecycle data access", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createClient.mockResolvedValue({ rpc });
  });

  it("loads export DTOs through the authenticated RPC", async () => {
    rpc.mockResolvedValue({
      data: [
        {
          id: "10000000-0000-4000-8000-000000000001",
          status: "ready",
          requested_at: "2026-08-03T10:00:00+00:00",
          expires_at: "2026-08-04T10:00:00+00:00",
          downloaded_at: null,
        },
      ],
      error: null,
    });

    await expect(getExportRequests()).resolves.toEqual({
      status: "ready",
      data: [expect.objectContaining({ status: "ready" })],
    });
    expect(rpc).toHaveBeenCalledWith("get_export_requests");
  });

  it("fails closed on malformed deletion DTOs and database failures", async () => {
    rpc.mockResolvedValueOnce({ data: [{ status: "pending" }], error: null });
    await expect(getAccountDeletionStatus()).resolves.toEqual({
      status: "unavailable",
    });

    rpc.mockRejectedValueOnce(new Error("private database detail"));
    await expect(getExportRequests()).resolves.toEqual({
      status: "unavailable",
    });
  });
});
