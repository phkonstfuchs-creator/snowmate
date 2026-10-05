import { beforeEach, describe, expect, it, vi } from "vitest";
import { getMfaEnabled, getOwnProfile, getVisibleAvatar, refreshOwnAge } from "./queries";

const mocks = vi.hoisted(() => ({ createClient: vi.fn() }));

vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));

const row = {
  display_name: "Lena Moser",
  handle: "lena_m",
  city: "innsbruck",
  ability_level: "chill",
  bio: null,
  is_minor: true,
  onboarding_completed: true,
};

function setup(sub: string | null, result: { data: unknown; error: unknown }) {
  const eq = vi.fn(() => ({ maybeSingle: vi.fn(async () => result) }));
  mocks.createClient.mockResolvedValue({
    auth: { getClaims: vi.fn(async () => ({ data: sub ? { claims: { sub } } : null })) },
    from: vi.fn(() => ({ select: vi.fn(() => ({ eq })) })),
  });
  return eq;
}

describe("getOwnProfile", () => {
  beforeEach(() => vi.clearAllMocks());

  it("reads the caller's row by the session id", async () => {
    const eq = setup("user-1", { data: row, error: null });
    await expect(getOwnProfile()).resolves.toMatchObject({ displayName: "Lena Moser", city: "innsbruck" });
    expect(eq).toHaveBeenCalledWith("id", "user-1");
  });

  it("returns null when signed out", async () => {
    setup(null, { data: row, error: null });
    await expect(getOwnProfile()).resolves.toBeNull();
  });

  it("returns null on a query error or a missing row", async () => {
    setup("user-1", { data: null, error: { code: "42501" } });
    await expect(getOwnProfile()).resolves.toBeNull();
    setup("user-1", { data: null, error: null });
    await expect(getOwnProfile()).resolves.toBeNull();
  });

  it("returns null when the client cannot be created", async () => {
    mocks.createClient.mockRejectedValue(new Error("missing env"));
    await expect(getOwnProfile()).resolves.toBeNull();
  });
});

describe("refreshOwnAge", () => {
  it("asks the database to refresh the caller's own age", async () => {
    const rpc = vi.fn(async () => ({ data: null, error: null }));
    mocks.createClient.mockResolvedValue({ rpc });
    await refreshOwnAge();
    expect(rpc).toHaveBeenCalledWith("refresh_my_age");
  });

  it("never throws when the backend is unreachable", async () => {
    mocks.createClient.mockRejectedValue(new Error("offline"));
    await expect(refreshOwnAge()).resolves.toBeUndefined();
  });
});

describe("getMfaEnabled", () => {
  it("reports whether a verified authenticator exists", async () => {
    const listFactors = vi.fn().mockResolvedValue({ data: { totp: [{ status: "verified" }] }, error: null });
    mocks.createClient.mockResolvedValue({ auth: { mfa: { listFactors } } });
    await expect(getMfaEnabled()).resolves.toBe(true);

    listFactors.mockResolvedValue({ data: { totp: [{ status: "unverified" }] }, error: null });
    await expect(getMfaEnabled()).resolves.toBe(false);

    listFactors.mockResolvedValue({ data: null, error: { code: "x" } });
    await expect(getMfaEnabled()).resolves.toBeNull();
  });
});

describe("getVisibleAvatar", () => {
  const OWNER = "c4a70000-0000-4000-8000-000000000002";

  it("returns the picture only when the database names a path", async () => {
    const file = new Blob([new Uint8Array([1])], { type: "image/webp" });
    const download = vi.fn().mockResolvedValue({ data: file, error: null });
    const rpc = vi.fn().mockResolvedValueOnce({ data: `${OWNER}/a.webp`, error: null }).mockResolvedValueOnce({ data: null, error: null });
    mocks.createClient.mockResolvedValue({ rpc, storage: { from: () => ({ download }) } });

    await expect(getVisibleAvatar(OWNER)).resolves.toBe(file);
    expect(rpc).toHaveBeenCalledWith("avatar_path_for", { owner: OWNER });
    expect(download).toHaveBeenCalledWith(`${OWNER}/a.webp`);
    await expect(getVisibleAvatar(OWNER)).resolves.toBeNull();
  });

  it("refuses ids that are not ids and fails closed", async () => {
    await expect(getVisibleAvatar("../etc")).resolves.toBeNull();
    mocks.createClient.mockRejectedValue(new Error("down"));
    await expect(getVisibleAvatar(OWNER)).resolves.toBeNull();
  });
});
