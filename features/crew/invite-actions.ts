"use server";

import { revalidatePath } from "next/cache";
import { getSupabasePublicConfig } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { INVITE_MESSAGES, inviteUrl, isInviteStatus, isInviteToken } from "./invites";

export type CreateInviteResult = { ok: true; url: string } | { ok: false; message: string };
export type AcceptInviteResult = { ok: boolean; message: string };

const UNAVAILABLE = "That did not work. Try again shortly.";

export async function createInviteAction(): Promise<CreateInviteResult> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("create_friend_invite");
    const row = Array.isArray(data) ? data[0] : null;

    if (error || !row) return { ok: false, message: UNAVAILABLE };
    if (row.status === "too_many") {
      return { ok: false, message: "You have 10 open invite links. Wait until some are used or expire." };
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

export async function acceptInviteAction(token: string): Promise<AcceptInviteResult> {
  if (!isInviteToken(token)) return { ok: false, message: INVITE_MESSAGES.not_found };

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("accept_friend_invite", { invite_token: token });

    if (error || !isInviteStatus(data) || data === "valid") return { ok: false, message: UNAVAILABLE };
    if (data === "accepted") {
      ["/crew", "/feed", "/events"].forEach((path) => revalidatePath(path));
    }
    return { ok: data === "accepted" || data === "already_friends", message: INVITE_MESSAGES[data] };
  } catch {
    return { ok: false, message: UNAVAILABLE };
  }
}
