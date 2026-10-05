import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPostAction, deletePostAction } from "./actions";

const mocks = vi.hoisted(() => ({ client: null as unknown, upload: vi.fn(), remove: vi.fn(), rpc: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => mocks.client }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const USER = "c4a70000-0000-4000-8000-000000000001";
const POST = "c4a70000-0000-4000-8000-0000000000aa";
const WEBP = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50, 1, 2, 3]);

function client(userId: string | null = USER) {
  return {
    auth: { getClaims: async () => ({ data: { claims: userId ? { sub: userId } : {} } }) },
    storage: { from: () => ({ upload: mocks.upload, remove: mocks.remove }) },
    rpc: mocks.rpc,
  };
}

function form(fields: Record<string, string | Blob>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.append(key, value);
  return data;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.client = client();
  mocks.upload.mockResolvedValue({ data: {}, error: null });
  mocks.remove.mockResolvedValue({ data: [], error: null });
  mocks.rpc.mockResolvedValue({ data: "created", error: null });
});

describe("createPostAction", () => {
  it("posts text with a known resort and drops an unknown one", async () => {
    await expect(createPostAction(form({ body: " Bluebird day ", resort: "Nordkette" }))).resolves.toBe("created");
    expect(mocks.rpc).toHaveBeenCalledWith("create_post", { p_body: "Bluebird day", p_resort: "Nordkette", p_photo_path: null });

    await createPostAction(form({ body: "Hi", resort: "<script>" }));
    expect(mocks.rpc).toHaveBeenLastCalledWith("create_post", { p_body: "Hi", p_resort: null, p_photo_path: null });
    expect(mocks.upload).not.toHaveBeenCalled();
  });

  it("stores the photo in the caller's own folder", async () => {
    await expect(createPostAction(form({ body: "Pow", photo: new Blob([WEBP], { type: "image/webp" }) }))).resolves.toBe("created");
    const [path, , options] = mocks.upload.mock.calls[0]!;
    expect(path).toMatch(new RegExp(`^${USER}/[0-9a-f-]{36}\\.webp$`));
    expect(options).toMatchObject({ contentType: "image/webp", upsert: false });
    expect(mocks.rpc).toHaveBeenCalledWith("create_post", { p_body: "Pow", p_resort: null, p_photo_path: path });
  });

  it("checks the photo bytes and size before uploading", async () => {
    await expect(createPostAction(form({ body: "x", photo: new Blob(["<svg onload=alert(1)>"], { type: "image/webp" }) }))).resolves.toBe("invalid");
    await expect(createPostAction(form({ body: "x", photo: new Blob([new Uint8Array(2 * 1024 * 1024)]) }))).resolves.toBe("too_large");
    await expect(createPostAction(form({ body: "   " }))).resolves.toBe("invalid");
    expect(mocks.upload).not.toHaveBeenCalled();
  });

  it("needs a session and removes the photo when the database refuses", async () => {
    mocks.client = client(null);
    await expect(createPostAction(form({ body: "x" }))).resolves.toBe("unauthenticated");

    mocks.client = client();
    mocks.rpc.mockResolvedValueOnce({ data: "rate_limited", error: null });
    await expect(createPostAction(form({ body: "x", photo: new Blob([WEBP]) }))).resolves.toBe("rate_limited");
    expect(mocks.remove).toHaveBeenCalledWith([mocks.upload.mock.calls[0]![0]]);

    mocks.rpc.mockResolvedValueOnce({ data: null, error: { code: "XX000" } });
    await expect(createPostAction(form({ body: "x" }))).resolves.toBe("unavailable");
  });
});

describe("deletePostAction", () => {
  it("deletes an own post and its photo", async () => {
    mocks.rpc.mockResolvedValue({ data: [{ deleted: true, photo_path: `${USER}/a.webp` }], error: null });
    await expect(deletePostAction(POST)).resolves.toBe(true);
    expect(mocks.rpc).toHaveBeenCalledWith("delete_my_post", { p_id: POST });
    expect(mocks.remove).toHaveBeenCalledWith([`${USER}/a.webp`]);
  });

  it("does nothing for a foreign or malformed id", async () => {
    mocks.rpc.mockResolvedValue({ data: [{ deleted: false, photo_path: null }], error: null });
    await expect(deletePostAction(POST)).resolves.toBe(false);
    await expect(deletePostAction("../x")).resolves.toBe(false);
    expect(mocks.remove).not.toHaveBeenCalled();
  });
});
