import { beforeEach, describe, expect, it, vi } from "vitest";
import { initialProfileActionState } from "./action-state";
import { completeProfileAction } from "./actions";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  redirect: vi.fn((path: string) => {
    throw new Error(`redirect:${path}`);
  }),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: mocks.createClient,
}));

vi.mock("next/navigation", () => ({
  redirect: mocks.redirect,
}));

const auth = { getClaims: vi.fn() };
const rpc = vi.fn();

function formData(values: Record<string, string>): FormData {
  const data = new FormData();
  Object.entries(values).forEach(([name, value]) => data.set(name, value));
  return data;
}

const validProfile = {
  displayName: "Philipp Fuchs",
  handle: "philipp_f",
  city: "innsbruck",
  abilityLevel: "chill",
};

describe("completeProfileAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createClient.mockResolvedValue({ auth, rpc });
    auth.getClaims.mockResolvedValue({
      data: { claims: { sub: "11111111-1111-4111-8111-111111111111" } },
      error: null,
    });
    rpc.mockResolvedValue({ data: true, error: null });
  });

  it("rejects invalid input before contacting Supabase", async () => {
    const result = await completeProfileAction(
      initialProfileActionState,
      formData({ ...validProfile, handle: "invalid handle" }),
    );

    expect(result.status).toBe("error");
    expect(result.fieldErrors?.handle).toBeDefined();
    expect(mocks.createClient).not.toHaveBeenCalled();
  });

  it("requires an authenticated account", async () => {
    auth.getClaims.mockResolvedValue({ data: { claims: null }, error: null });

    await expect(
      completeProfileAction(
        initialProfileActionState,
        formData(validProfile),
      ),
    ).rejects.toThrow("redirect:/login");

    expect(rpc).not.toHaveBeenCalled();
  });

  it("completes only the authenticated profile through the database RPC", async () => {
    const input = formData(validProfile);
    input.set("userId", "22222222-2222-4222-8222-222222222222");
    input.set("onboardingCompleted", "true");

    await expect(
      completeProfileAction(
        initialProfileActionState,
        input,
      ),
    ).rejects.toThrow("redirect:/feed");

    expect(rpc).toHaveBeenCalledWith("complete_own_profile", {
      p_ability_level: "chill",
      p_city: "innsbruck",
      p_display_name: "Philipp Fuchs",
      p_handle: "philipp_f",
    });
  });

  it("fails closed when claims cannot be verified", async () => {
    auth.getClaims.mockResolvedValue({
      data: { claims: null },
      error: { code: "claims_unavailable" },
    });

    const result = await completeProfileAction(
      initialProfileActionState,
      formData(validProfile),
    );

    expect(result).toMatchObject({
      status: "error",
      message:
        "Dein Profil konnte gerade nicht gespeichert werden. Versuche es gleich noch einmal.",
    });
    expect(rpc).not.toHaveBeenCalled();
  });

  it("returns a handle error without leaking database details", async () => {
    rpc.mockResolvedValue({
      error: { code: "23505", message: "profiles_handle_unique" },
    });

    const result = await completeProfileAction(
      initialProfileActionState,
      formData(validProfile),
    );

    expect(result).toMatchObject({
      status: "error",
      message: "Dieses Handle ist bereits vergeben.",
      fieldErrors: { handle: ["Wähle ein anderes Handle."] },
    });
    expect(JSON.stringify(result)).not.toContain("profiles_handle_unique");
  });

  it("fails safely when profile completion is unavailable", async () => {
    rpc.mockRejectedValue(new Error("network details"));

    const result = await completeProfileAction(
      initialProfileActionState,
      formData(validProfile),
    );

    expect(result).toMatchObject({
      status: "error",
      message:
        "Dein Profil konnte gerade nicht gespeichert werden. Versuche es gleich noch einmal.",
    });
    expect(JSON.stringify(result)).not.toContain("network details");
  });

  it("does not accept a silent RPC update miss as success", async () => {
    rpc.mockResolvedValue({ data: false, error: null });

    const result = await completeProfileAction(
      initialProfileActionState,
      formData(validProfile),
    );

    expect(result).toMatchObject({
      status: "error",
      message:
        "Dein Profil konnte gerade nicht gespeichert werden. Versuche es gleich noch einmal.",
    });
  });
});
