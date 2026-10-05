"use server";

import { getT } from "@/lib/i18n/server";
import { translateValidation } from "@/lib/i18n/translate";
import { revalidateApp } from "@/lib/revalidate";
import { getSupabasePublicConfig } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { INVITE_MESSAGES, inviteUrl, isInviteStatus, isInviteToken } from "./invites";

export type CreateInviteResult = { ok: true; url: string } | { ok: false; message: string };
export type AcceptInviteResult = { ok: boolean; message: string };

const UNAVAILABLE = "common.unavailable";

async function createInviteActionImpl(): Promise<CreateInviteResult> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("create_friend_invite");
    const row = Array.isArray(data) ? data[0] : null;

    if (error || !row) return { ok: false, message: UNAVAILABLE };
    if (row.status === "too_many") {
      return { ok: false, message: "invite.tooMany" };
    }
    if (row.status === "profile_incomplete") {
      return { ok: false, message: INVITE_MESSAGES.profile_incomplete };
    }
    if (row.status !== "created" || !isInviteToken(row.token)) {
      return { ok: false, message: UNAVAILABLE };
    }

    return { ok: true, url: inviteUrl(getSupabasePublicConfig().siteUrl, row.token) };
  } catch {
    return { ok: false, message: UNAVAILABLE };
  }
}

async function acceptInviteActionImpl(token: string): Promise<AcceptInviteResult> {
  if (!isInviteToken(token)) return { ok: false, message: INVITE_MESSAGES.not_found };

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("accept_friend_invite", { invite_token: token });

    if (error || !isInviteStatus(data) || data === "valid") return { ok: false, message: UNAVAILABLE };
    if (data === "accepted") {
      revalidateApp();
    }
    return { ok: data === "accepted" || data === "already_friends", message: INVITE_MESSAGES[data] };
  } catch {
    return { ok: false, message: UNAVAILABLE };
  }
}

/* Results carry message keys; the exported actions translate them once,
   in the caller's language. */
async function localize<T>(result: T): Promise<T> {
  if (typeof result !== "object" || result === null || !("message" in result)) return result;
  const t = await getT();
  return { ...result, message: translateValidation(t, String(result.message)) };
}

export async function createInviteAction(): Promise<CreateInviteResult> {
  return localize(await createInviteActionImpl());
}

export async function acceptInviteAction(token: string): Promise<AcceptInviteResult> {
  return localize(await acceptInviteActionImpl(token));
}
