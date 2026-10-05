/* What one queued notice becomes on the wire: no message text, only its
   kind, who caused it and the page to open. The service worker turns it
   into a sentence in the device's language. */

export interface QueuedNotice {
  kind: string;
  actor_name: string | null;
  url: string;
}

export function noticePayload(notice: QueuedNotice): string {
  return JSON.stringify({ kind: notice.kind, name: (notice.actor_name ?? "").slice(0, 60), url: notice.url });
}

/* Push services allow a 32-character base64url topic; one per page, so a
   newer notice for the same chat replaces a waiting one. */
export function noticeTopic(notice: QueuedNotice): string {
  return `${notice.kind}${notice.url}`.replace(/[^A-Za-z0-9_-]/g, "").slice(-32);
}

/* The push service says the device will never accept anything again. */
export function deviceIsGone(status: number): boolean {
  return status === 404 || status === 410;
}
