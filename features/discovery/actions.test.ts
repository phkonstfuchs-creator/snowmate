import { beforeEach, describe, expect, it, vi } from "vitest";
import { setDiscoverableAction, swipeAction } from "./actions";

const mocks = vi.hoisted(() => ({ rpc: vi.fn(), update: vi.fn(), eq: vi.fn(), after: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/server", () => ({ after: mocks.after }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    rpc: mocks.rpc,
    auth: { getClaims: async () => ({ data: { claims: { sub: "c4a70000-0000-4000-8000-000000000001" } } }) },
    from: () => ({ update: (values: unknown) => { mocks.update(values); return { eq: mocks.eq }; } }),
  }),
}));

const TARGET = "c4a70000-0000-4000-8000-0000000000aa";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.eq.mockResolvedValue({ error: null });
});

describe("discovery actions", () => {
  it("swipes on a valid id only", async () => {
    mocks.rpc.mockResolvedValue({ data: "liked", error: null });
    await expect(swipeAction(TARGET, true)).resolves.toBe("liked");
    expect(mocks.rpc).toHaveBeenCalledWith("swipe", { target: TARGET, p_liked: true });
    await expect(swipeAction("x", true)).resolves.toBe("invalid");
    await expect(swipeAction(TARGET, "yes")).resolves.toBe("invalid");
    expect(mocks.rpc).toHaveBeenCalledTimes(1);
  });

  it("passes on a match and unknown answers safely", async () => {
    mocks.rpc.mockResolvedValue({ data: "matched", error: null });
    await expect(swipeAction(TARGET, true)).resolves.toBe("matched");
    mocks.rpc.mockResolvedValue({ data: "weird", error: null });
    await expect(swipeAction(TARGET, true)).resolves.toBe("unavailable");
    mocks.rpc.mockResolvedValue({ data: null, error: { code: "XX000" } });
    await expect(swipeAction(TARGET, false)).resolves.toBe("unavailable");
  });

  it("switches only the caller's own discoverable flag", async () => {
    await expect(setDiscoverableAction(true)).resolves.toBe(true);
    expect(mocks.update).toHaveBeenCalledWith({ discoverable: true });
    expect(mocks.eq).toHaveBeenCalledWith("id", "c4a70000-0000-4000-8000-000000000001");
    await expect(setDiscoverableAction("on")).resolves.toBe(false);
  });
});
