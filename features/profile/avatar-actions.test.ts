import { beforeEach, describe, expect, it, vi } from "vitest";
import { removeAvatarAction, setAvatarVisibilityAction, uploadAvatarAction } from "./avatar-actions";

const mocks = vi.hoisted(() => ({ client: null as unknown, upload: vi.fn(), remove: vi.fn(), update: vi.fn(), before: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => mocks.client }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const USER = "c4a70000-0000-4000-8000-000000000001";
const WEBP = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50, 1, 2, 3]);

function client(userId: string | null = USER) {
  return {
    auth: { getClaims: async () => ({ data: { claims: userId ? { sub: userId } : {} } }) },
    storage: { from: () => ({ upload: mocks.upload, remove: mocks.remove }) },
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
  mocks.client = client();
  mocks.upload.mockResolvedValue({ data: {}, error: null });
  mocks.remove.mockResolvedValue({ data: [], error: null });
  mocks.update.mockResolvedValue({ error: null });
  mocks.before.mockResolvedValue({ data: { avatar_path: `${USER}/old.webp` } });
});

describe("profile picture actions", () => {
  it("uploads into the caller's folder, points the profile at it and removes the old file", async () => {
    await expect(uploadAvatarAction(form(new Blob([WEBP], { type: "image/webp" })))).resolves.toBe("saved");
    const [path, , options] = mocks.upload.mock.calls[0]!;
    expect(path).toMatch(new RegExp(`^${USER}/[0-9a-f-]{36}\\.webp$`));
    expect(options).toMatchObject({ contentType: "image/webp", upsert: false });
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
