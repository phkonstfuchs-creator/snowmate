// Only a verified user session can ask for dispatch. Queue access remains
// inside this edge function; no service-role key leaves Supabase.
import { createClient } from "npm:@supabase/supabase-js@2.110.8";
import { createDispatchHandler } from "../_shared/dispatch-handler.ts";
import { identityFromVerifiedToken } from "../_shared/dispatch-identity.ts";
import { sendWebPush, type Vapid } from "../_shared/web-push.ts";
import { deviceIsGone, noticePayload, noticeTopic, type QueuedNotice } from "../_shared/push-notice.ts";
import { apnsTokenIsGone, readApnsConfig, sendApns } from "../_shared/apns.ts";

/* "web": a browser subscription; "ios": an APNs device token in endpoint. */
interface Row extends QueuedNotice {
  channel: string;
  endpoint: string;
  p256dh: string | null;
  auth: string | null;
}

const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
  auth: { persistSession: false, autoRefreshToken: false },
});

Deno.serve(createDispatchHandler({
  authenticate: async (token) => {
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data.user?.email_confirmed_at) return null;
    return identityFromVerifiedToken(token, data.user.id);
  },
  dispatch: async ({ userId, sessionId }) => {
    const vapid: Vapid = {
      publicKey: Deno.env.get("VAPID_PUBLIC_KEY") ?? "",
      privateKey: Deno.env.get("VAPID_PRIVATE_KEY") ?? "",
      subject: Deno.env.get("VAPID_SUBJECT") ?? "",
    };
    const webReady = Boolean(vapid.publicKey && vapid.privateKey && vapid.subject);
    /* The store apps' sender; optional until the Apple key is set. */
    const apns = readApnsConfig((name) => Deno.env.get(name));
    if (!webReady && !apns) throw new Error("Push not configured");

    const { data, error } = await supabase.rpc("push_take_session_outbox", {
      p_actor_id: userId,
      p_session_id: sessionId,
    });
    if (error) throw new Error("Queue unavailable");

    await Promise.all(
      ((data ?? []) as Row[]).map(async (row) => {
        try {
          if (row.channel === "ios") {
            if (!apns) return;
            const { status, reason } = await sendApns(row.endpoint, row, apns);
            if (apnsTokenIsGone(status, reason)) {
              await supabase.rpc("push_forget_native_token", { p_token: row.endpoint });
            }
            return;
          }
          if (!webReady || !row.p256dh || !row.auth) return;
          const target = { endpoint: row.endpoint, p256dh: row.p256dh, auth: row.auth };
          const status = await sendWebPush(target, noticePayload(row), vapid, noticeTopic(row));
          if (deviceIsGone(status)) {
            await supabase.rpc("push_forget_subscription", { p_endpoint: row.endpoint });
          }
        } catch {
          // One device failing must not stop the others.
        }
      }),
    );
  },
}));
