import { beforeEach, describe, expect, it, vi } from "vitest";
import { INVITE_MESSAGES, inviteUrl, isInviteStatus, isInviteToken } from "./invites";
import { translator } from "@/lib/i18n/translate";

const t = translator("en");
import { acceptInviteAction, createInviteAction } from "./invite-actions";
import { previewInvite } from "./queries";

const mocks = vi.hoisted(() => ({ createClient: vi.fn(), rpc: vi.fn(), revalidatePath: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));
vi.mock("@/lib/supabase/config", () => ({ getSupabasePublicConfig: () => ({ siteUrl: "https://pistl.example" }) }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));

const TOKEN = "0123456789abcdef0123456789abcdef";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.createClient.mockResolvedValue({ rpc: mocks.rpc });
});

describe("invite rules", () => {
  it("recognises tokens and statuses", () => {
    expect(isInviteToken(TOKEN)).toBe(true);
    expect(isInviteToken("../../etc")).toBe(false);
    expect(isInviteToken(42)).toBe(false);
    expect(isInviteStatus("used")).toBe(true);
    expect(isInviteStatus("valid")).toBe(true);
    expect(isInviteStatus("weird")).toBe(false);
    expect(inviteUrl("https://pistl.example", TOKEN)).toBe(`https://pistl.example/invite/${TOKEN}`);
  });
});

describe("createInviteAction", () => {
  it("returns the link for a created invite", async () => {
    mocks.rpc.mockResolvedValue({ data: [{ status: "created", token: TOKEN }], error: null });
    await expect(createInviteAction()).resolves.toEqual({ ok: true, url: `https://pistl.example/invite/${TOKEN}` });
  });

  it.each([
    [{ data: [{ status: "too_many" }], error: null }, "10 open invite links"],
    [{ data: [{ status: "profile_incomplete" }], error: null }, "Finish your profile"],
    [{ data: [{ status: "created", token: "bad" }], error: null }, "did not work"],
    [{ data: null, error: { code: "x" } }, "did not work"],
  ])("explains refusals", async (answer, text) => {
    mocks.rpc.mockResolvedValue(answer);
    const result = await createInviteAction();
    expect(result.ok).toBe(false);
    expect("message" in result && result.message).toContain(text);
  });

  it("fails closed when the client cannot be created", async () => {
    mocks.createClient.mockRejectedValueOnce(new Error("env"));
    await expect(createInviteAction()).resolves.toMatchObject({ ok: false });
  });
});

describe("acceptInviteAction", () => {
  it("befriends and revalidates", async () => {
    mocks.rpc.mockResolvedValue({ data: "accepted", error: null });
    await expect(acceptInviteAction(TOKEN)).resolves.toEqual({ ok: true, message: t(INVITE_MESSAGES.accepted) });
    expect(mocks.rpc).toHaveBeenCalledWith("accept_friend_invite", { invite_token: TOKEN });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/crew");
  });

  it.each([
    ["used", false],
    ["expired", false],
    ["self", false],
    ["already_friends", true],
  ])("maps %s", async (data, ok) => {
    mocks.rpc.mockResolvedValue({ data, error: null });
    await expect(acceptInviteAction(TOKEN)).resolves.toMatchObject({ ok, message: t(INVITE_MESSAGES[data as "used"]) });
  });

  it("refuses malformed tokens without asking the database", async () => {
    await expect(acceptInviteAction("nope")).resolves.toMatchObject({ ok: false });
    expect(mocks.createClient).not.toHaveBeenCalled();
  });

  it("fails closed on errors", async () => {
    mocks.rpc.mockResolvedValueOnce({ data: "valid", error: null });
    await expect(acceptInviteAction(TOKEN)).resolves.toMatchObject({ ok: false });
    mocks.rpc.mockResolvedValueOnce({ data: null, error: { code: "x" } });
    await expect(acceptInviteAction(TOKEN)).resolves.toMatchObject({ ok: false });
    mocks.createClient.mockRejectedValueOnce(new Error("env"));
    await expect(acceptInviteAction(TOKEN)).resolves.toMatchObject({ ok: false });
  });
});

describe("previewInvite", () => {
  it("reads who invited", async () => {
    mocks.rpc.mockResolvedValue({ data: [{ status: "valid", inviter_display_name: "Lena", inviter_handle: "lena_m" }], error: null });
    await expect(previewInvite(TOKEN)).resolves.toEqual({ status: "valid", inviterName: "Lena", inviterHandle: "lena_m" });
  });

  it("handles bad tokens, missing names and failures", async () => {
    await expect(previewInvite("bad")).resolves.toMatchObject({ status: "not_found" });
    mocks.rpc.mockResolvedValueOnce({ data: [{ status: "not_found" }], error: null });
    await expect(previewInvite(TOKEN)).resolves.toEqual({ status: "not_found", inviterName: null, inviterHandle: null });
    mocks.rpc.mockResolvedValueOnce({ data: null, error: { code: "x" } });
    await expect(previewInvite(TOKEN)).resolves.toBeNull();
    mocks.createClient.mockRejectedValueOnce(new Error("env"));
    await expect(previewInvite(TOKEN)).resolves.toBeNull();
  });
});
