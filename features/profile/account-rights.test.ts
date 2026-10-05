import { beforeEach, describe, expect, it, vi } from "vitest";
import { exportMyDataResponse } from "./account-rights";
import { deleteAccountAction } from "./account-actions";
import { initialDeleteAccountState } from "./action-state";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  rpc: vi.fn(),
  signOut: vi.fn(),
  redirect: vi.fn((path: string) => {
    throw new Error(`redirect:${path}`);
  }),
}));

vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));

const form = (confirmation?: string) => {
  const data = new FormData();
  if (confirmation !== undefined) data.set("confirmation", confirmation);
  return data;
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.createClient.mockResolvedValue({ rpc: mocks.rpc, auth: { signOut: mocks.signOut } });
});

describe("exportMyDataResponse", () => {
  it("returns the caller's data as a dated, uncached download", async () => {
    mocks.rpc.mockResolvedValue({ data: { profile: { handle: "lena_m" } }, error: null });

    const response = await exportMyDataResponse(new Date("2027-01-08T10:00:00Z"));

    expect(mocks.rpc).toHaveBeenCalledWith("export_my_data");
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Disposition")).toBe('attachment; filename="pistl-data-2027-01-08.json"');
    expect(response.headers.get("Cache-Control")).toContain("no-store");
    expect(JSON.parse(await response.text())).toEqual({ profile: { handle: "lena_m" } });
  });

  it("answers 401 without a session and 503 when unavailable", async () => {
    mocks.rpc.mockResolvedValueOnce({ data: null, error: { code: "42501" } });
    expect((await exportMyDataResponse()).status).toBe(401);
    mocks.rpc.mockResolvedValueOnce({ data: null, error: { code: "XX000" } });
    expect((await exportMyDataResponse()).status).toBe(503);
    mocks.createClient.mockRejectedValueOnce(new Error("env"));
    expect((await exportMyDataResponse()).status).toBe(503);
  });
});

describe("deleteAccountAction", () => {
  it("requires the confirmation word", async () => {
    await expect(deleteAccountAction(initialDeleteAccountState, form("yes"))).resolves.toMatchObject({ status: "error" });
    await expect(deleteAccountAction(initialDeleteAccountState, form())).resolves.toMatchObject({ status: "error" });
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("removes the profile picture and post photo files before deleting the account", async () => {
    const left: Record<string, string[]> = { avatars: ["a.webp"], "post-photos": ["p1.webp", "p2.jpg"] };
    const list = vi.fn();
    const remove = vi.fn();
    mocks.createClient.mockResolvedValue({
      rpc: mocks.rpc,
      auth: { signOut: mocks.signOut, getClaims: async () => ({ data: { claims: { sub: "u-1" } } }) },
      storage: {
        from: (bucket: string) => ({
          list: (folder: string) => {
            list(bucket, folder);
            return Promise.resolve({ data: left[bucket]!.map((name) => ({ name })), error: null });
          },
          remove: (paths: string[]) => {
            remove(bucket, paths);
            left[bucket] = [];
            return Promise.resolve({ data: [], error: null });
          },
        }),
      },
    });
    mocks.rpc.mockResolvedValue({ data: true, error: null });

    await expect(deleteAccountAction(initialDeleteAccountState, form(" Delete "))).rejects.toThrow("redirect:/login?account=deleted");
    expect(list).toHaveBeenCalledWith("avatars", "u-1");
    expect(remove).toHaveBeenCalledWith("avatars", ["u-1/a.webp"]);
    expect(remove).toHaveBeenCalledWith("post-photos", ["u-1/p1.webp", "u-1/p2.jpg"]);
    expect(remove).toHaveBeenCalledTimes(2);
    expect(remove.mock.invocationCallOrder[1]).toBeLessThan(mocks.rpc.mock.invocationCallOrder[0]!);
  });

  it("deletes, clears the local session and sends the user to sign in", async () => {
    mocks.rpc.mockResolvedValue({ data: true, error: null });
    mocks.signOut.mockRejectedValueOnce(new Error("already gone"));

    await expect(deleteAccountAction(initialDeleteAccountState, form(" Delete "))).rejects.toThrow("redirect:/login?account=deleted");
    expect(mocks.rpc).toHaveBeenCalledWith("delete_my_account");
    expect(mocks.signOut).toHaveBeenCalledWith({ scope: "local" });
  });

  it("reports a failed deletion and keeps the session", async () => {
    mocks.rpc.mockResolvedValueOnce({ data: null, error: { code: "x" } });
    await expect(deleteAccountAction(initialDeleteAccountState, form("delete"))).resolves.toMatchObject({ status: "error" });
    mocks.rpc.mockRejectedValueOnce(new Error("offline"));
    await expect(deleteAccountAction(initialDeleteAccountState, form("delete"))).resolves.toMatchObject({ status: "error" });
    expect(mocks.signOut).not.toHaveBeenCalled();
  });
});
