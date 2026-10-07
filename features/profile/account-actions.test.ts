import { beforeEach, describe, expect, it, vi } from "vitest";
import { deleteAccountAction } from "./account-actions";

const mocks = vi.hoisted(() => ({ getUser: vi.fn(), list: vi.fn(), remove: vi.fn(), rpc: vi.fn(), signOut: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({
  auth: { getUser: mocks.getUser, signOut: mocks.signOut }, rpc: mocks.rpc,
  storage: { from: () => ({ list: mocks.list, remove: mocks.remove }) },
}) }));
vi.mock("next/navigation", () => ({ redirect: (path: string) => { throw new Error(`redirect:${path}`); } }));

const form = new FormData();
form.set("confirmation", "DELETE");
describe("account deletion storage safety", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getUser.mockResolvedValue({ data: { user: { id: "owner" } }, error: null });
    mocks.list.mockResolvedValue({ data: [], error: null });
    mocks.remove.mockResolvedValue({ error: null });
    mocks.rpc.mockResolvedValue({ data: true, error: null });
  });

  it("keeps the account when storage enumeration fails", async () => {
    mocks.list.mockResolvedValue({ data: null, error: { message: "storage down" } });
    expect(await deleteAccountAction({ status: "idle", message: "" }, form)).toMatchObject({ status: "error" });
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("keeps the account when removing an old photo fails", async () => {
    mocks.list.mockResolvedValue({ data: [{ name: "old.webp" }], error: null });
    mocks.remove.mockResolvedValue({ error: { message: "remove failed" } });
    expect(await deleteAccountAction({ status: "idle", message: "" }, form)).toMatchObject({ status: "error" });
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("deletes only after both storage folders are empty", async () => {
    await expect(deleteAccountAction({ status: "idle", message: "" }, form)).rejects.toThrow("redirect:/login?account=deleted");
    expect(mocks.list).toHaveBeenCalledTimes(2);
    expect(mocks.rpc).toHaveBeenCalledWith("delete_my_account");
  });
});
