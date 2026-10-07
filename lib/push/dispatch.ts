import "server-only";
import { after } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";

/* After a write that may have queued push notices (a message, a friend
   request, a ride join), ask the push-dispatch edge function to send
   them once the response is out (ADR 0025). A current user session is
   required; no service-role or VAPID secret is held by the app. */
export async function dispatchPushSoon(client: SupabaseClient): Promise<void> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key || !process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) return;
  let token: string;
  try {
    /* Read the token only; authorization was enforced by the successful
       database write and is verified again by the edge function. */
    const { data, error } = await client.auth.getSession();
    if (error || !data.session?.access_token) return;
    token = data.session.access_token;
  } catch {
    return;
  }
  try {
    after(async () => {
      try {
        await fetch(`${url}/functions/v1/push-dispatch`, {
          method: "POST",
          headers: { apikey: key, Authorization: `Bearer ${token}` },
          signal: AbortSignal.timeout(8000),
        });
      } catch {
        // Waiting notices go out with the next write, or expire after an hour.
      }
    });
  } catch {
    // Scheduling a notice must not fail the successful write.
  }
}
