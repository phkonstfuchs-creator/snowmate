import { beforeEach, describe, expect, it, vi } from "vitest";
import { initialProfileActionState } from "./action-state";
import { adoptOnboardingDraftAction, updateProfileAction } from "./actions";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));

const USER_ID = "11111111-1111-4111-8111-111111111111";

function setup({
  sub = USER_ID as string | null,
  result = { data: [{ id: USER_ID }], error: null } as {
    data: unknown[] | null;
    error: { code: string } | null;
  },
  throws = false,
} = {}) {
  const calls: { update?: unknown; eq: [string, unknown][] } = { eq: [] };
  const builder = {
    update: vi.fn((values: unknown) => {
      calls.update = values;
      return builder;
    }),
    eq: vi.fn((column: string, value: unknown) => {
      calls.eq.push([column, value]);
      return builder;
    }),
    select: vi.fn(async () => {
      if (throws) throw new Error("network");
      return result;
    }),
  };
  mocks.createClient.mockResolvedValue({
    auth: {
      getClaims: vi.fn(async () => ({ data: sub ? { claims: { sub } } : null })),
    },
    from: vi.fn(() => builder),
  });
  return calls;
}

const draft = { city: "innsbruck", style: "park", displayName: "Lena Moser", handle: "lena_m" };

function form(values: Record<string, string>) {
  const data = new FormData();
  Object.entries(values).forEach(([key, value]) => data.set(key, value));
  return data;
}

const validForm = {
  displayName: "Lena Moser",
  handle: "lena_m",
  city: "salzburg",
  abilityLevel: "chill",
  bio: "Dawn patrol",
};

describe("adoptOnboardingDraftAction", () => {
  beforeEach(() => vi.clearAllMocks());

  it("writes the draft to the caller's incomplete profile", async () => {
    const calls = setup();

    await expect(adoptOnboardingDraftAction(draft)).resolves.toBe("saved");
    expect(calls.update).toEqual({
      display_name: "Lena Moser",
      handle: "lena_m",
      city: "innsbruck",
      ability_level: "park",
    });
    expect(calls.eq).toEqual([
      ["id", USER_ID],
      ["onboarding_completed", false],
    ]);
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/profile");
  });

  it("rejects an invalid draft without touching the database", async () => {
    setup();
    await expect(adoptOnboardingDraftAction({ city: null })).resolves.toBe("invalid");
    expect(mocks.createClient).not.toHaveBeenCalled();
  });

  it("skips a profile that is already complete", async () => {
    setup({ result: { data: [], error: null } });
    await expect(adoptOnboardingDraftAction(draft)).resolves.toBe("skipped");
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  it("reports a taken handle", async () => {
    setup({ result: { data: null, error: { code: "23505" } } });
    await expect(adoptOnboardingDraftAction(draft)).resolves.toBe("handle_taken");
  });

  it("requires a session", async () => {
    setup({ sub: null });
    await expect(adoptOnboardingDraftAction(draft)).resolves.toBe("unauthenticated");
  });

  it("fails closed when the backend throws", async () => {
    setup({ throws: true });
    await expect(adoptOnboardingDraftAction(draft)).resolves.toBe("unavailable");
  });
});

describe("updateProfileAction", () => {
  beforeEach(() => vi.clearAllMocks());

  it("saves a valid form including the bio", async () => {
    const calls = setup();
    const state = await updateProfileAction(initialProfileActionState, form(validForm));

    expect(state).toEqual({ status: "success", message: "Profile saved." });
    expect(calls.update).toMatchObject({ bio: "Dawn patrol", city: "salzburg" });
    expect(calls.eq).toEqual([["id", USER_ID]]);
  });

  it("returns field errors for invalid input", async () => {
    setup();
    const state = await updateProfileAction(
      initialProfileActionState,
      form({ ...validForm, handle: "x" }),
    );

    expect(state.status).toBe("error");
    expect(state.fieldErrors?.handle).toBe("Use at least 3 characters.");
    expect(mocks.createClient).not.toHaveBeenCalled();
  });

  it("treats missing form fields as empty", async () => {
    setup();
    const state = await updateProfileAction(initialProfileActionState, new FormData());
    expect(state.fieldErrors?.displayName).toBeDefined();
  });

  it("flags a taken handle on the field", async () => {
    setup({ result: { data: null, error: { code: "23505" } } });
    const state = await updateProfileAction(initialProfileActionState, form(validForm));
    expect(state.fieldErrors).toEqual({ handle: "That handle is taken." });
  });

  it("asks to sign in again without a session", async () => {
    setup({ sub: null });
    const state = await updateProfileAction(initialProfileActionState, form(validForm));
    expect(state.message).toBe("Your session ended. Sign in again.");
  });

  it.each([
    ["an unknown database error", { data: null, error: { code: "XX000" } }],
    ["no row updated", { data: [], error: null }],
  ])("reports unavailability for %s", async (_label, result) => {
    setup({ result });
    const state = await updateProfileAction(initialProfileActionState, form(validForm));
    expect(state.message).toBe("Saving is temporarily unavailable. Try again shortly.");
  });
});
