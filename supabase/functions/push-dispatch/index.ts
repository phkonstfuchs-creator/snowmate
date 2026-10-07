// Only a verified user session can ask for dispatch. Queue access remains
// inside this edge function; no service-role key leaves Supabase.
import { createClient } from "npm:@supabase/supabase-js@2.110.8";
import { createDispatchHandler } from "../_shared/dispatch-handler.ts";
import { identityFromVerifiedToken } from "../_shared/dispatch-identity.ts";
import { sendWebPush, type Vapid } from "../_shared/web-push.ts";
import { deviceIsGone, noticePayload, noticeTopic, type QueuedNotice } from "../_shared/push-notice.ts";

interface Row extends QueuedNotice {
  endpoint: string;
  p256dh: string;
  auth: string;
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
    if (!vapid.publicKey || !vapid.privateKey || !vapid.subject) {
      throw new Error("Push not configured");
    }

    const { data, error } = await supabase.rpc("push_take_session_outbox", {
      p_actor_id: userId,
      p_session_id: sessionId,
    });
    if (error) throw new Error("Queue unavailable");

    await Promise.all(
      ((data ?? []) as Row[]).map(async (row) => {
        try {
          const status = await sendWebPush(row, noticePayload(row), vapid, noticeTopic(row));
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
