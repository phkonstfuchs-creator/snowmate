import { beforeEach, describe, expect, it, vi } from "vitest";
import { leaderboardAction, setLeaderboardSettingAction } from "./actions";

const mocks = vi.hoisted(() => ({ rpc: vi.fn(), update: vi.fn(), eq: vi.fn(), sub: "c4a70000-0000-4000-8000-000000000001" as string | null }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    rpc: mocks.rpc,
    auth: { getClaims: async () => ({ data: { claims: mocks.sub ? { sub: mocks.sub } : {} } }) },
    from: () => ({ update: (values: unknown) => { mocks.update(values); return { eq: mocks.eq }; } }),
  }),
}));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.sub = "c4a70000-0000-4000-8000-000000000001";
  mocks.eq.mockResolvedValue({ error: null });
});

describe("leaderboard actions", () => {
  it("asks the database for a known scope and metric only", async () => {
    mocks.rpc.mockResolvedValue({ data: [{ rank: 1, user_id: "u", display_name: "Lena", handle: null, value: 3000, is_me: true, anonymous: false }], error: null });
    await expect(leaderboardAction("region", "days")).resolves.toMatchObject([{ name: "Lena" }]);
    expect(mocks.rpc).toHaveBeenCalledWith("leaderboard", { scope: "region", metric: "days" });
    await expect(leaderboardAction("world", "days")).resolves.toBeNull();
    expect(mocks.rpc).toHaveBeenCalledTimes(1);
  });

  it("changes only the caller's own two settings", async () => {
    await expect(setLeaderboardSettingAction("region", true)).resolves.toBe(true);
    expect(mocks.update).toHaveBeenCalledWith({ leaderboard_region: true });
    expect(mocks.eq).toHaveBeenCalledWith("id", "c4a70000-0000-4000-8000-000000000001");
    await expect(setLeaderboardSettingAction("friends", false)).resolves.toBe(true);
    expect(mocks.update).toHaveBeenLastCalledWith({ leaderboard_friends: false });
    await expect(setLeaderboardSettingAction("is_minor", false)).resolves.toBe(false);
    await expect(setLeaderboardSettingAction("region", "yes")).resolves.toBe(false);
    mocks.sub = null;
    await expect(setLeaderboardSettingAction("region", true)).resolves.toBe(false);
  });
});
