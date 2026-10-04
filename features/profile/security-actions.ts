"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { rateLimiter } from "@/lib/rate-limit";
import { getT } from "@/lib/i18n/server";
import { parseOtpCode } from "@/features/auth/credentials";

export type MfaEnrollment =
  | { status: "ok"; factorId: string; qrCode: string; secret: string }
  | { status: "error"; message: string };

export type MfaResult = { status: "ok" | "error"; message: string };

async function signedInClient() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  return { supabase, userId: data?.claims?.sub ?? null };
}

/* Starts a TOTP enrolment. Earlier abandoned attempts are removed first,
   so a person who closed the sheet can simply start again. */
export async function enrollMfaAction(): Promise<MfaEnrollment> {
  const t = await getT();
  const { supabase, userId } = await signedInClient();
  if (!userId) return { status: "error", message: t("profile.sessionEnded") };
  if (!rateLimiter.hit("mfaUser", userId)) return { status: "error", message: t("auth.tooManyAttempts") };

  try {
    const { data: factors } = await supabase.auth.mfa.listFactors();
    if (factors?.totp.some((factor) => factor.status === "verified")) {
      return { status: "error", message: t("mfa.alreadyOn") };
    }
    for (const factor of factors?.all ?? []) {
      if (factor.status !== "verified") await supabase.auth.mfa.unenroll({ factorId: factor.id });
    }

    const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: "Pistl" });
    if (error || !data) return { status: "error", message: t("mfa.unavailable") };

    /* Only an SVG data URI is ever rendered as an image. */
    const qrCode = data.totp.qr_code.startsWith("data:image/svg+xml") ? data.totp.qr_code : "";
    return { status: "ok", factorId: data.id, qrCode, secret: data.totp.secret };
  } catch {
    return { status: "error", message: t("mfa.unavailable") };
  }
}

/* Confirms the enrolment with the first code from the app. */
export async function confirmMfaAction(factorId: string, rawCode: string): Promise<MfaResult> {
  const t = await getT();
  const code = parseOtpCode(String(rawCode ?? ""));
  if (!code || typeof factorId !== "string" || !/^[0-9a-f-]{36}$/i.test(factorId)) {
    return { status: "error", message: t("mfa.codeFormat") };
  }
  const { supabase, userId } = await signedInClient();
  if (!userId) return { status: "error", message: t("profile.sessionEnded") };
  if (!rateLimiter.hit("mfaUser", userId)) return { status: "error", message: t("auth.tooManyAttempts") };

  try {
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code });
    if (error) return { status: "error", message: t("mfa.wrongCode") };
  } catch {
    return { status: "error", message: t("mfa.unavailable") };
  }

  revalidatePath("/profile");
  return { status: "ok", message: t("mfa.enabled") };
}

/* Turning 2FA off asks for a current code, so a session left open on a
   shared device cannot quietly remove it. */
export async function disableMfaAction(rawCode: string): Promise<MfaResult> {
  const t = await getT();
  const code = parseOtpCode(String(rawCode ?? ""));
  if (!code) return { status: "error", message: t("mfa.codeFormat") };
  const { supabase, userId } = await signedInClient();
  if (!userId) return { status: "error", message: t("profile.sessionEnded") };
  if (!rateLimiter.hit("mfaUser", userId)) return { status: "error", message: t("auth.tooManyAttempts") };

  try {
    const { data: factors } = await supabase.auth.mfa.listFactors();
    const factor = factors?.totp.find((item) => item.status === "verified");
    if (!factor) return { status: "ok", message: t("mfa.disabled") };

    const verified = await supabase.auth.mfa.challengeAndVerify({ factorId: factor.id, code });
    if (verified.error) return { status: "error", message: t("mfa.wrongCode") };

    const { error } = await supabase.auth.mfa.unenroll({ factorId: factor.id });
    if (error) return { status: "error", message: t("mfa.unavailable") };
  } catch {
    return { status: "error", message: t("mfa.unavailable") };
  }

  revalidatePath("/profile");
  return { status: "ok", message: t("mfa.disabled") };
}
