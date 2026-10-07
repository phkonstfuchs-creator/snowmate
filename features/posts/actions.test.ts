import sharp from "sharp";
import { randomBytes } from "node:crypto";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { createPostAction, deletePostAction } from "./actions";

const mocks = vi.hoisted(() => ({ client: null as unknown, upload: vi.fn(), remove: vi.fn(), rpc: vi.fn(), attest: vi.fn(), hit: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => mocks.client }));
vi.mock("@/lib/rate-limit", () => ({ rateLimiter: { hit: mocks.hit } }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const USER = "c4a70000-0000-4000-8000-000000000001";
const POST = "c4a70000-0000-4000-8000-0000000000aa";
const OBJECT = "c4a70000-0000-4000-8000-000000000002";
let WEBP: Uint8Array<ArrayBuffer>;
beforeAll(async () => {
  WEBP = new Uint8Array(await sharp({ create: { width: 20, height: 10, channels: 3, background: "white" } }).webp().toBuffer());
});

function client(userId: string | null = USER) {
  return {
    auth: { getUser: async () => ({ data: { user: userId ? { id: userId } : null } }) },
    storage: { from: () => ({ upload: mocks.upload, remove: mocks.remove }) },
    rpc: (name: string, args: unknown) => name === "attest_my_media" ? mocks.attest(name, args) : mocks.rpc(name, args),
  };
}

function form(fields: Record<string, string | Blob>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.append(key, value);
  return data;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("MEDIA_ATTESTATION_KEY", randomBytes(32).toString("base64"));
  vi.stubEnv("MEDIA_ATTESTATION_KEY_ID", "v1");
  mocks.client = client();
  mocks.upload.mockResolvedValue({ data: { id: OBJECT }, error: null });
  mocks.remove.mockResolvedValue({ data: [], error: null });
  mocks.rpc.mockResolvedValue({ data: "created", error: null });
  mocks.attest.mockResolvedValue({ data: true, error: null });
  mocks.hit.mockReturnValue(true);
});
afterEach(() => vi.unstubAllEnvs());

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
    const [path, uploaded, options] = mocks.upload.mock.calls[0]!;
    expect(path).toMatch(new RegExp(`^${USER}/[0-9a-f-]{36}\\.webp$`));
    expect(options).toMatchObject({ contentType: "image/webp", upsert: false });
    expect((await sharp(uploaded).metadata()).exif).toBeUndefined();
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

  it("rejects unauthenticated and over-quota photos before reading bytes", async () => {
    const photo = new Blob([WEBP]);
    const data = form({ body: "x", photo });
    const read = vi.spyOn(data.get("photo") as Blob, "arrayBuffer");
    mocks.client = client(null);
    await expect(createPostAction(data)).resolves.toBe("unauthenticated");
    expect(read).not.toHaveBeenCalled();
    expect(mocks.hit).not.toHaveBeenCalled();

    mocks.client = client();
    mocks.hit.mockReturnValue(false);
    await expect(createPostAction(data)).resolves.toBe("unavailable");
    expect(mocks.hit).toHaveBeenCalledWith("mediaUploadUser", USER);
    expect(read).not.toHaveBeenCalled();
    expect(mocks.upload).not.toHaveBeenCalled();
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("fails before decoding without a configured signing key", async () => {
    vi.stubEnv("MEDIA_ATTESTATION_KEY", "");
    const data = form({ body: "x", photo: new Blob([WEBP]) });
    const read = vi.spyOn(data.get("photo") as Blob, "arrayBuffer");
    await expect(createPostAction(data)).resolves.toBe("unavailable");
    expect(read).not.toHaveBeenCalled();
    expect(mocks.upload).not.toHaveBeenCalled();
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("deletes uploaded photo when attestation fails before creating a post", async () => {
    mocks.attest.mockResolvedValue({ data: false, error: null });
    await expect(createPostAction(form({ body: "x", photo: new Blob([WEBP]) }))).resolves.toBe("unavailable");
    expect(mocks.attest).toHaveBeenCalledWith("attest_my_media", expect.objectContaining({ p_bucket: "post-photos", p_object_id: OBJECT }));
    expect(mocks.remove).toHaveBeenCalledWith([mocks.upload.mock.calls[0]![0]]);
    expect(mocks.rpc).not.toHaveBeenCalled();
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
