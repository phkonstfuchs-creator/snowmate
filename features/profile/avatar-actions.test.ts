import sharp from "sharp";
import { randomBytes } from "node:crypto";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { removeAvatarAction, setAvatarVisibilityAction, uploadAvatarAction } from "./avatar-actions";

const mocks = vi.hoisted(() => ({ client: null as unknown, upload: vi.fn(), remove: vi.fn(), update: vi.fn(), before: vi.fn(), hit: vi.fn(), attest: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => mocks.client }));
vi.mock("@/lib/rate-limit", () => ({ rateLimiter: { hit: mocks.hit } }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const USER = "c4a70000-0000-4000-8000-000000000001";
const OBJECT = "c4a70000-0000-4000-8000-000000000002";
let WEBP: Uint8Array<ArrayBuffer>;
beforeAll(async () => {
  WEBP = new Uint8Array(await sharp({ create: { width: 20, height: 10, channels: 3, background: "white" } }).webp().toBuffer());
});

function client(userId: string | null = USER) {
  return {
    auth: { getUser: async () => ({ data: { user: userId ? { id: userId } : null } }) },
    storage: { from: () => ({ upload: mocks.upload, remove: mocks.remove }) },
    rpc: mocks.attest,
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: mocks.before }) }),
      update: (values: unknown) => ({ eq: (column: string, value: string) => mocks.update(values, column, value) }),
    }),
  };
}

const form = (blob: Blob | string) => {
  const data = new FormData();
  data.append("avatar", blob);
  return data;
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("MEDIA_ATTESTATION_KEY", randomBytes(32).toString("base64"));
  vi.stubEnv("MEDIA_ATTESTATION_KEY_ID", "v1");
  mocks.client = client();
  mocks.upload.mockResolvedValue({ data: { id: OBJECT }, error: null });
  mocks.attest.mockResolvedValue({ data: true, error: null });
  mocks.remove.mockResolvedValue({ data: [], error: null });
  mocks.update.mockResolvedValue({ error: null });
  mocks.before.mockResolvedValue({ data: { avatar_path: `${USER}/old.webp` } });
  mocks.hit.mockReturnValue(true);
});
afterEach(() => vi.unstubAllEnvs());

describe("profile picture actions", () => {
  it("uploads into the caller's folder, points the profile at it and removes the old file", async () => {
    await expect(uploadAvatarAction(form(new Blob([WEBP], { type: "image/webp" })))).resolves.toBe("saved");
    const [path, uploaded, options] = mocks.upload.mock.calls[0]!;
    expect(path).toMatch(new RegExp(`^${USER}/[0-9a-f-]{36}\\.webp$`));
    expect(options).toMatchObject({ contentType: "image/webp", upsert: false });
    expect((await sharp(uploaded).metadata()).width).toBe(512);
    expect(mocks.update).toHaveBeenCalledWith({ avatar_path: path }, "id", USER);
    expect(mocks.remove).toHaveBeenCalledWith([`${USER}/old.webp`]);
  });

  it("checks the bytes, not the declared type", async () => {
    const svg = new Blob(["<svg onload=alert(1)>"], { type: "image/webp" });
    await expect(uploadAvatarAction(form(svg))).resolves.toBe("invalid");
    await expect(uploadAvatarAction(form("text"))).resolves.toBe("invalid");
    await expect(uploadAvatarAction(form(new Blob([new Uint8Array(600 * 1024)])))).resolves.toBe("too_large");
    expect(mocks.upload).not.toHaveBeenCalled();
  });

  it("needs a session and cleans up when the profile cannot be updated", async () => {
    mocks.client = client(null);
    await expect(uploadAvatarAction(form(new Blob([WEBP])))).resolves.toBe("unauthenticated");
    mocks.client = client();
    mocks.update.mockResolvedValueOnce({ error: { code: "XX000" } });
    await expect(uploadAvatarAction(form(new Blob([WEBP])))).resolves.toBe("unavailable");
    const uploaded = mocks.upload.mock.calls[0]![0];
    expect(mocks.remove).toHaveBeenCalledWith([uploaded]);
  });

  it("rejects unauthenticated and over-quota photos before reading image bytes", async () => {
    const file = new Blob([WEBP]);
    const data = form(file);
    const read = vi.spyOn(data.get("avatar") as Blob, "arrayBuffer");
    mocks.client = client(null);
    await expect(uploadAvatarAction(data)).resolves.toBe("unauthenticated");
    expect(read).not.toHaveBeenCalled();
    expect(mocks.hit).not.toHaveBeenCalled();

    mocks.client = client();
    mocks.hit.mockReturnValue(false);
    await expect(uploadAvatarAction(data)).resolves.toBe("unavailable");
    expect(mocks.hit).toHaveBeenCalledWith("mediaUploadUser", USER);
    expect(read).not.toHaveBeenCalled();
    expect(mocks.upload).not.toHaveBeenCalled();
  });

  it("fails before decoding without a configured signing key", async () => {
    vi.stubEnv("MEDIA_ATTESTATION_KEY", "");
    const data = form(new Blob([WEBP]));
    const read = vi.spyOn(data.get("avatar") as Blob, "arrayBuffer");
    await expect(uploadAvatarAction(data)).resolves.toBe("unavailable");
    expect(read).not.toHaveBeenCalled();
    expect(mocks.upload).not.toHaveBeenCalled();
  });

  it("deletes the uploaded object when attestation fails before publishing the path", async () => {
    mocks.attest.mockResolvedValue({ data: false, error: null });
    await expect(uploadAvatarAction(form(new Blob([WEBP])))).resolves.toBe("unavailable");
    expect(mocks.attest).toHaveBeenCalledWith("attest_my_media", expect.objectContaining({ p_bucket: "avatars", p_object_id: OBJECT }));
    expect(mocks.remove).toHaveBeenCalledWith([mocks.upload.mock.calls[0]![0]]);
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("removes the picture and sets who may see it", async () => {
    await expect(removeAvatarAction()).resolves.toBe("saved");
    expect(mocks.update).toHaveBeenCalledWith({ avatar_path: null }, "id", USER);
    expect(mocks.remove).toHaveBeenCalledWith([`${USER}/old.webp`]);

    await expect(setAvatarVisibilityAction("contacts")).resolves.toBe("saved");
    expect(mocks.update).toHaveBeenCalledWith({ avatar_visibility: "contacts" }, "id", USER);
    await expect(setAvatarVisibilityAction("everyone" as never)).resolves.toBe("invalid");
  });

  it("never removes a file outside the caller's folder", async () => {
    mocks.before.mockResolvedValue({ data: { avatar_path: "someone-else/x.webp" } });
    await expect(removeAvatarAction()).resolves.toBe("saved");
    expect(mocks.remove).not.toHaveBeenCalled();
  });
});
