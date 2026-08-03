import { beforeEach, describe, expect, it, vi } from "vitest";
import { getCurrentProfileContext } from "./data";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: mocks.createClient,
}));

const getClaims = vi.fn();
const maybeSingle = vi.fn();
const eq = vi.fn(() => ({ maybeSingle }));
const select = vi.fn(() => ({ eq }));
const from = vi.fn(() => ({ select }));

describe("getCurrentProfileContext", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createClient.mockResolvedValue({ auth: { getClaims }, from });
    getClaims.mockResolvedValue({
      data: { claims: { sub: "11111111-1111-4111-8111-111111111111" } },
      error: null,
    });
  });

  it("returns signed-out without querying profile data", async () => {
    getClaims.mockResolvedValue({ data: { claims: null }, error: null });

    await expect(getCurrentProfileContext()).resolves.toEqual({
      status: "signed-out",
    });
    expect(from).not.toHaveBeenCalled();
  });

  it("maps an explicit profile projection to the application DTO", async () => {
    maybeSingle.mockResolvedValue({
      data: {
        display_name: "Philipp Fuchs",
        handle: "philipp_f",
        city: "innsbruck",
        ability_level: "park",
        onboarding_completed: true,
      },
      error: null,
    });

    await expect(getCurrentProfileContext()).resolves.toEqual({
      status: "authenticated",
      profile: {
        displayName: "Philipp Fuchs",
        handle: "philipp_f",
        city: "innsbruck",
        abilityLevel: "park",
        onboardingCompleted: true,
      },
    });
    expect(select).toHaveBeenCalledWith(
      "display_name, handle, city, ability_level, onboarding_completed",
    );
    expect(eq).toHaveBeenCalledWith(
      "id",
      "11111111-1111-4111-8111-111111111111",
    );
  });

  it("fails closed when the profile query is unavailable", async () => {
    maybeSingle.mockResolvedValue({
      data: null,
      error: { code: "request_failed" },
    });

    await expect(getCurrentProfileContext()).resolves.toEqual({
      status: "unavailable",
    });
  });

  it("fails closed when the trigger-created profile row is missing", async () => {
    maybeSingle.mockResolvedValue({ data: null, error: null });

    await expect(getCurrentProfileContext()).resolves.toEqual({
      status: "unavailable",
    });
  });

  it("maps a fresh nullable profile shell without inventing values", async () => {
    maybeSingle.mockResolvedValue({
      data: {
        display_name: null,
        handle: null,
        city: null,
        ability_level: null,
        onboarding_completed: false,
      },
      error: null,
    });

    await expect(getCurrentProfileContext()).resolves.toEqual({
      status: "authenticated",
      profile: {
        displayName: null,
        handle: null,
        city: null,
        abilityLevel: null,
        onboardingCompleted: false,
      },
    });
  });
});
