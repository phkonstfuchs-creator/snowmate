"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { FRIEND_REQUEST_MESSAGES, type FriendRequestOutcome } from "./friendships";

export interface FriendActionState {
  status: "idle" | "success" | "error";
  message: string;
}

const UNAVAILABLE = "That did not work. Try again shortly.";
const HANDLE_PATTERN = /^[a-z0-9_]{3,20}$/;

/* Friendship changes the audience of every ride, so both ride screens
   are revalidated along with the crew screen. */
function revalidateGraph() {
  ["/crew", "/feed", "/events"].forEach((path) => revalidatePath(path));
}

export async function requestFriendshipAction(
  _previous: FriendActionState,
  formData: FormData,
): Promise<FriendActionState> {
  const raw = formData.get("handle");
  const handle = typeof raw === "string" ? raw.trim().replace(/^@/, "").toLowerCase() : "";

  if (!HANDLE_PATTERN.test(handle)) {
    return { status: "error", message: "Handles are 3 to 20 letters, numbers or underscores." };
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("request_friendship", { target_handle: handle });

    if (error) return { status: "error", message: UNAVAILABLE };

    const outcome = FRIEND_REQUEST_MESSAGES[data as FriendRequestOutcome];
    if (!outcome) return { status: "error", message: UNAVAILABLE };

    if (outcome.ok) revalidateGraph();
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
    return true;
  } catch {
    return false;
  }
}

export async function acceptFriendshipAction(userId: string): Promise<boolean> {
  return callGraphFunction("accept_friendship", { requester: userId });
}

export async function removeFriendshipAction(userId: string): Promise<boolean> {
  return callGraphFunction("remove_friendship", { other: userId });
}
