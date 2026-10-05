import { beforeEach, describe, expect, it, vi } from "vitest";
import { getVisiblePostPhoto, listPosts } from "./queries";

const mocks = vi.hoisted(() => ({ rpc: vi.fn(), download: vi.fn(), from: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ rpc: mocks.rpc, storage: { from: (bucket: string) => (mocks.from(bucket), { download: mocks.download }) } }),
}));

const POST = "c4a70000-0000-4000-8000-0000000000aa";

beforeEach(() => vi.clearAllMocks());

describe("listPosts", () => {
  it("asks for the feed or only the caller's posts", async () => {
    mocks.rpc.mockResolvedValue({ data: [{ id: "p1", author_id: "u1", author_name: "Lena", author_handle: null, body: "Hi", resort: null, has_photo: true, created_at: "2026-01-01T00:00:00Z", is_mine: false }], error: null });
    await expect(listPosts()).resolves.toMatchObject([{ id: "p1", hasPhoto: true }]);
    expect(mocks.rpc).toHaveBeenCalledWith("list_post_feed", {});
    await listPosts({ onlyMine: true });
    expect(mocks.rpc).toHaveBeenLastCalledWith("list_post_feed", { only_mine: true });
  });

  it("returns null when the backend fails", async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { code: "42501" } });
    await expect(listPosts()).resolves.toBeNull();
  });
});

describe("getVisiblePostPhoto", () => {
  it("downloads only the path the database allows", async () => {
    const file = new Blob(["x"], { type: "image/webp" });
    mocks.rpc.mockResolvedValue({ data: "u1/a.webp", error: null });
    mocks.download.mockResolvedValue({ data: file, error: null });
    await expect(getVisiblePostPhoto(POST)).resolves.toBe(file);
    expect(mocks.rpc).toHaveBeenCalledWith("post_photo_path_for", { p_id: POST });
    expect(mocks.from).toHaveBeenCalledWith("post-photos");
    expect(mocks.download).toHaveBeenCalledWith("u1/a.webp");
  });

  it("returns null for hidden posts and malformed ids", async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: null });
    await expect(getVisiblePostPhoto(POST)).resolves.toBeNull();
    await expect(getVisiblePostPhoto("nope")).resolves.toBeNull();
    expect(mocks.download).not.toHaveBeenCalled();
  });
});
