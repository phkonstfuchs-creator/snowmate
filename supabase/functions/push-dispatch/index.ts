// Sends the waiting push notices (ADR 0025). Anyone may call it: it only
// empties the queue that the database fills, so a call can at most send
// a notice a little earlier. The service role never leaves Supabase.
import { createClient } from "npm:@supabase/supabase-js@2";
import { sendWebPush, type Vapid } from "../_shared/web-push.ts";
import { deviceIsGone, noticePayload, noticeTopic, type QueuedNotice } from "../_shared/push-notice.ts";

interface Row extends QueuedNotice {
  endpoint: string;
  p256dh: string;
  auth: string;
}

Deno.serve(async (request) => {
  if (request.method !== "POST") return new Response(null, { status: 405 });

  const vapid: Vapid = {
    publicKey: Deno.env.get("VAPID_PUBLIC_KEY") ?? "",
    privateKey: Deno.env.get("VAPID_PRIVATE_KEY") ?? "",
    subject: Deno.env.get("VAPID_SUBJECT") ?? "",
  };
  if (!vapid.publicKey || !vapid.privateKey || !vapid.subject) {
    return Response.json({ error: "not configured" }, { status: 503 });
  }

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });
  const { data, error } = await supabase.rpc("push_take_outbox");
  if (error) return Response.json({ error: "queue unavailable" }, { status: 502 });

  let sent = 0;
  let gone = 0;
  await Promise.all(
    ((data ?? []) as Row[]).map(async (row) => {
      try {
        const status = await sendWebPush(row, noticePayload(row), vapid, noticeTopic(row));
        if (status >= 200 && status < 300) sent += 1;
        if (deviceIsGone(status)) {
          gone += 1;
          await supabase.rpc("push_forget_subscription", { p_endpoint: row.endpoint });
        }
      } catch {
        // One device failing must not stop the others.
      }
    }),
  );

  return Response.json({ sent, gone });
});
