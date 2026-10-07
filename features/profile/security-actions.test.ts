import { beforeEach, describe, expect, it, vi } from "vitest";
import { confirmMfaAction, disableMfaAction, enrollMfaAction } from "./security-actions";

const mfa = { listFactors: vi.fn(), unenroll: vi.fn(), enroll: vi.fn(), challengeAndVerify: vi.fn() };
const mocks = vi.hoisted(() => ({ createClient: vi.fn(), revalidatePath: vi.fn(), sub: { value: "user-1" as string | null } }));
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));

let counter = 0;
beforeEach(() => {
  vi.clearAllMocks();
  counter += 1;
  mocks.sub.value = `user-${counter}`;
  mfa.unenroll.mockResolvedValue({ error: null });
  mocks.createClient.mockResolvedValue({
    auth: { getUser: async () => ({ data: { user: mocks.sub.value ? { id: mocks.sub.value } : null }, error: null }), mfa },
  });
});

const FACTOR = "11111111-2222-4333-8444-555555555555";

describe("security actions", () => {
  it("fails closed when the authentication service is unavailable", async () => {
    mocks.createClient.mockRejectedValueOnce(new Error("unavailable"));
    await expect(enrollMfaAction()).resolves.toMatchObject({ status: "error" });
    expect(mfa.enroll).not.toHaveBeenCalled();
  });

  it("does not disable or enroll factors when the factor lookup fails", async () => {
    mfa.listFactors.mockResolvedValue({ data: null, error: { message: "unavailable" } });
    await expect(disableMfaAction("123456")).resolves.toMatchObject({ status: "error" });
    await expect(enrollMfaAction()).resolves.toMatchObject({ status: "error" });
    expect(mfa.unenroll).not.toHaveBeenCalled();
    expect(mfa.enroll).not.toHaveBeenCalled();
  });
  it("removes abandoned enrolments and returns only an SVG QR code", async () => {
    mfa.listFactors.mockResolvedValue({ data: { totp: [], all: [{ id: "old", status: "unverified" }] } });
    mfa.enroll.mockResolvedValue({ data: { id: FACTOR, totp: { qr_code: "data:image/svg+xml;utf-8,<svg/>", secret: "S" } }, error: null });

    await expect(enrollMfaAction()).resolves.toEqual({ status: "ok", factorId: FACTOR, qrCode: "data:image/svg+xml;utf-8,<svg/>", secret: "S" });
    expect(mfa.unenroll).toHaveBeenCalledWith({ factorId: "old" });

    mfa.enroll.mockResolvedValue({ data: { id: FACTOR, totp: { qr_code: "javascript:alert(1)", secret: "S" } }, error: null });
    await expect(enrollMfaAction()).resolves.toMatchObject({ qrCode: "" });
  });

  it("refuses to enrol twice or without a session", async () => {
    mfa.listFactors.mockResolvedValue({ data: { totp: [{ id: FACTOR, status: "verified" }], all: [] } });
    await expect(enrollMfaAction()).resolves.toEqual({ status: "error", message: "Two-factor sign-in is already on." });
    mocks.sub.value = null;
    await expect(enrollMfaAction()).resolves.toEqual({ status: "error", message: "Your session ended. Sign in again." });
  });

  it("confirms only a well-formed code for a well-formed factor", async () => {
    await expect(confirmMfaAction("not-a-uuid", "123456")).resolves.toMatchObject({ status: "error" });
    await expect(confirmMfaAction(FACTOR, "12")).resolves.toMatchObject({ status: "error" });
    expect(mfa.challengeAndVerify).not.toHaveBeenCalled();

    mfa.challengeAndVerify.mockResolvedValue({ error: { code: "mfa_verification_failed" } });
    await expect(confirmMfaAction(FACTOR, "123456")).resolves.toMatchObject({ status: "error" });
    mfa.challengeAndVerify.mockResolvedValue({ error: null });
    await expect(confirmMfaAction(FACTOR, "123 456")).resolves.toEqual({ status: "ok", message: "Two-factor sign-in is on." });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/profile");
  });

  it("turns two-factor off only with a correct current code", async () => {
    mfa.listFactors.mockResolvedValue({ data: { totp: [{ id: FACTOR, status: "verified" }] } });
    mfa.challengeAndVerify.mockResolvedValue({ error: { code: "mfa_verification_failed" } });
    await expect(disableMfaAction("123456")).resolves.toMatchObject({ status: "error" });
    expect(mfa.unenroll).not.toHaveBeenCalled();

    mfa.challengeAndVerify.mockResolvedValue({ error: null });
    mfa.unenroll.mockResolvedValue({ error: null });
    await expect(disableMfaAction("123456")).resolves.toEqual({ status: "ok", message: "Two-factor sign-in is off." });
    expect(mfa.unenroll).toHaveBeenCalledWith({ factorId: FACTOR });
  });

  it("limits code guessing per account", async () => {
    mfa.listFactors.mockResolvedValue({ data: { totp: [{ id: FACTOR, status: "verified" }] } });
    mfa.challengeAndVerify.mockResolvedValue({ error: { code: "mfa_verification_failed" } });
    for (let i = 0; i < 10; i += 1) await disableMfaAction("000000");
    await expect(disableMfaAction("000000")).resolves.toEqual({ status: "error", message: "Too many attempts. Wait a few minutes and try again." });
  });
});
