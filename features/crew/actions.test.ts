import { beforeEach, describe, expect, it, vi } from "vitest";
import { acceptFriendshipAction, removeFriendshipAction, requestFriendshipAction } from "./actions";

const mocks = vi.hoisted(() => ({ createClient: vi.fn(), rpc: vi.fn(), revalidatePath: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));

const idle = { status: "idle" as const, message: "" };
const form = (handle: string) => {
  const data = new FormData();
  data.set("handle", handle);
  return data;
};

describe("friend actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createClient.mockResolvedValue({ rpc: mocks.rpc });
  });

  it("normalises the handle and sends the request", async () => {
    mocks.rpc.mockResolvedValue({ data: "requested", error: null });

    await expect(requestFriendshipAction(idle, form("  @Lena_M "))).resolves.toEqual({
      status: "success",
      message: "Request sent.",
    });
    expect(mocks.rpc).toHaveBeenCalledWith("request_friendship", { target_handle: "lena_m" });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/crew");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/feed");
  });

  it("rejects a malformed handle locally", async () => {
    await expect(requestFriendshipAction(idle, form("a b"))).resolves.toMatchObject({ status: "error" });
    await expect(requestFriendshipAction(idle, new FormData())).resolves.toMatchObject({ status: "error" });
    expect(mocks.createClient).not.toHaveBeenCalled();
  });

  it.each([
    ["not_found", "error", "No rider with that handle."],
    ["self", "error", "That is your own handle."],
    ["profile_incomplete", "error", "Finish your profile first: add your name and handle on the Profile tab."],
    ["accepted", "success", "They had already asked you. You are friends now."],
    ["surprise", "error", "That did not work. Try again shortly."],
  ])("maps %s", async (data, status, message) => {
    mocks.rpc.mockResolvedValue({ data, error: null });
    await expect(requestFriendshipAction(idle, form("lena_m"))).resolves.toEqual({ status, message });
  });

  it("fails closed on errors", async () => {
    mocks.rpc.mockResolvedValueOnce({ data: null, error: { code: "42501" } });
    await expect(requestFriendshipAction(idle, form("lena_m"))).resolves.toMatchObject({ status: "error" });
    mocks.createClient.mockRejectedValueOnce(new Error("env"));
    await expect(requestFriendshipAction(idle, form("lena_m"))).resolves.toMatchObject({ status: "error" });
  });

  it("accepts and removes through the database functions", async () => {
    mocks.rpc.mockResolvedValue({ data: true, error: null });
    await expect(acceptFriendshipAction("u1")).resolves.toBe(true);
    expect(mocks.rpc).toHaveBeenCalledWith("accept_friendship", { requester: "u1" });
    await expect(removeFriendshipAction("u1")).resolves.toBe(true);
    expect(mocks.rpc).toHaveBeenCalledWith("remove_friendship", { other: "u1" });
  });

  it("reports false when nothing changed or the call failed", async () => {
    mocks.rpc.mockResolvedValueOnce({ data: false, error: null });
    await expect(acceptFriendshipAction("u1")).resolves.toBe(false);
    mocks.createClient.mockRejectedValueOnce(new Error("env"));
    await expect(removeFriendshipAction("u1")).resolves.toBe(false);
  });
});
