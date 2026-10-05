import { after } from "next/server";

/* After a write that may have queued push notices (a message, a friend
   request, a ride join), ask the push-dispatch edge function to send
   them once the response is out (ADR 0025). The function needs no
   secret from the app; without a configured key nothing is sent. */
export function dispatchPushSoon(): void {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key || !process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) return;
  after(async () => {
    try {
      await fetch(`${url}/functions/v1/push-dispatch`, {
        method: "POST",
        headers: { apikey: key },
        signal: AbortSignal.timeout(8000),
      });
    } catch {
      // Waiting notices go out with the next write, or expire after an hour.
    }
  });
}
