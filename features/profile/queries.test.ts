import { beforeEach, describe, expect, it, vi } from "vitest";
import { getOwnProfile } from "./queries";

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
