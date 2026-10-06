import { describe, expect, it, vi } from "vitest";
import { listMySkiDays } from "./queries";

const mocks = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ rpc: mocks.rpc }) }));

describe("listMySkiDays", () => {
  it("maps the caller's days and reports failures as null", async () => {
    mocks.rpc.mockResolvedValue({
      data: [{ id: "a", resort: "Nordkette", started_at: "2026-01-10T08:00:00Z", ended_at: "2026-01-10T15:00:00Z", distance_m: 1, vertical_m: 2, max_speed_kmh: "50.5", runs: 3 }],
      error: null,
    });
    await expect(listMySkiDays()).resolves.toMatchObject([{ id: "a", maxSpeedKmh: 50.5 }]);
    expect(mocks.rpc).toHaveBeenCalledWith("list_my_ski_days", { max_rows: 60 });
    mocks.rpc.mockResolvedValue({ data: null, error: { code: "42501" } });
    await expect(listMySkiDays()).resolves.toBeNull();
  });
});
