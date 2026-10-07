"use server";

import { getT } from "@/lib/i18n/server";
import { translateValidation } from "@/lib/i18n/translate";
import { revalidateApp } from "@/lib/revalidate";
import { createClient } from "@/lib/supabase/server";
import { dispatchPushSoon } from "@/lib/push/dispatch";
import { FRIEND_REQUEST_MESSAGES, type FriendRequestOutcome } from "./friendships";

export interface FriendActionState {
  status: "idle" | "success" | "error";
  message: string;
}

const UNAVAILABLE = "common.unavailable";
const HANDLE_PATTERN = /^[a-z0-9_]{3,20}$/;

/* Friendship changes the audience of every ride, so both ride screens
   are revalidated along with the crew screen. */
function revalidateGraph() {
  revalidateApp();
}

async function requestFriendshipActionImpl(
  _previous: FriendActionState,
  formData: FormData,
): Promise<FriendActionState> {
  const raw = formData.get("handle");
  const handle = typeof raw === "string" ? raw.trim().replace(/^@/, "").toLowerCase() : "";

  if (!HANDLE_PATTERN.test(handle)) {
    return { status: "error", message: "v.handleFormat" };
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("request_friendship", { target_handle: handle });

    if (error) return { status: "error", message: UNAVAILABLE };

    const outcome = FRIEND_REQUEST_MESSAGES[data as FriendRequestOutcome];
    if (!outcome) return { status: "error", message: UNAVAILABLE };

    if (outcome.ok) {
      revalidateGraph();
      await dispatchPushSoon(supabase);
    }
    return { status: outcome.ok ? "success" : "error", message: outcome.message };
  } catch {
    return { status: "error", message: UNAVAILABLE };
  }
}

async function callGraphFunction(
  fn: "accept_friendship" | "remove_friendship",
  args: Record<string, string>,
): Promise<boolean> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc(fn, args);
    if (error || data !== true) return false;
    revalidateGraph();
    if (fn === "accept_friendship") await dispatchPushSoon(supabase);
    return true;
  } catch {
    return false;
  }
}

async function acceptFriendshipActionImpl(userId: string): Promise<boolean> {
  return callGraphFunction("accept_friendship", { requester: userId });
}

async function removeFriendshipActionImpl(userId: string): Promise<boolean> {
  return callGraphFunction("remove_friendship", { other: userId });
}

/* Results carry message keys; the exported actions translate them once,
   in the caller's language. */
async function localize<T>(result: T): Promise<T> {
  if (typeof result !== "object" || result === null || !("message" in result)) return result;
  const t = await getT();
  return { ...result, message: translateValidation(t, String(result.message)) };
}

export async function requestFriendshipAction(_previous: FriendActionState,
  formData: FormData,): Promise<FriendActionState> {
  return localize(await requestFriendshipActionImpl(_previous, formData));
}

export async function acceptFriendshipAction(userId: string): Promise<boolean> {
  return localize(await acceptFriendshipActionImpl(userId));
}

export async function removeFriendshipAction(userId: string): Promise<boolean> {
  return localize(await removeFriendshipActionImpl(userId));
}
