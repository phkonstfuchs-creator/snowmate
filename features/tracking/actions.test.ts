import { beforeEach, describe, expect, it, vi } from "vitest";
import { deleteSkiDayAction, saveSkiDayAction } from "./actions";

const mocks = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ rpc: mocks.rpc }) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const now = Date.now();
const summary = {
  startedAt: new Date(now - 5 * 3600_000).toISOString(),
  endedAt: new Date(now - 60_000).toISOString(),
  distanceM: 30_000,
  verticalM: 4000,
  maxSpeedKmh: 70.2,
  runs: 11,
};

beforeEach(() => vi.clearAllMocks());

describe("saveSkiDayAction", () => {
  it("saves the summary with a known resort", async () => {
    mocks.rpc.mockResolvedValue({ data: "saved", error: null });
    await expect(saveSkiDayAction(summary, "Nordkette")).resolves.toBe("saved");
    expect(mocks.rpc).toHaveBeenCalledWith("save_ski_day", {
      p_resort: "Nordkette",
      p_started_at: summary.startedAt,
      p_ended_at: summary.endedAt,
      p_distance_m: 30_000,
      p_vertical_m: 4000,
      p_max_speed_kmh: 70.2,
      p_runs: 11,
    });
  });

  it("drops an unknown resort and refuses implausible days before the database", async () => {
    mocks.rpc.mockResolvedValue({ data: "saved", error: null });
    await saveSkiDayAction(summary, "<b>x</b>");
    expect(mocks.rpc.mock.calls[0]![1]).toMatchObject({ p_resort: null });
    mocks.rpc.mockClear();
    await expect(saveSkiDayAction({ ...summary, maxSpeedKmh: 300 }, null)).resolves.toBe("invalid");
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("passes on refusals and failures", async () => {
    mocks.rpc.mockResolvedValue({ data: "rate_limited", error: null });
    await expect(saveSkiDayAction(summary, null)).resolves.toBe("rate_limited");
    mocks.rpc.mockResolvedValue({ data: null, error: { code: "XX000" } });
    await expect(saveSkiDayAction(summary, null)).resolves.toBe("unavailable");
  });
});

describe("deleteSkiDayAction", () => {
  it("deletes by id and refuses malformed ids", async () => {
    mocks.rpc.mockResolvedValue({ data: true, error: null });
    await expect(deleteSkiDayAction("c4a70000-0000-4000-8000-0000000000aa")).resolves.toBe(true);
    expect(mocks.rpc).toHaveBeenCalledWith("delete_my_ski_day", { p_id: "c4a70000-0000-4000-8000-0000000000aa" });
    await expect(deleteSkiDayAction("x")).resolves.toBe(false);
  });
});
