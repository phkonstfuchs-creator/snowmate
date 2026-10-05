/* The parts of a browser push subscription Pistl stores (ADR 0025). The
   database checks the same shapes again. */

export interface PushSubscriptionInput {
  endpoint: string;
  p256dh: string;
  auth: string;
}

const ENDPOINT = /^https:\/\/(fcm\.googleapis\.com|web\.push\.apple\.com|updates\.push\.services\.mozilla\.com|[a-z0-9-]+\.notify\.windows\.com)\/[!-~]+$/u;

/* From PushSubscription.toJSON(); null when it is not a usable one. */
export function toSubscriptionInput(value: unknown): PushSubscriptionInput | null {
  if (typeof value !== "object" || value === null) return null;
  const { endpoint, keys } = value as { endpoint?: unknown; keys?: { p256dh?: unknown; auth?: unknown } };
  const p256dh = keys?.p256dh;
  const auth = keys?.auth;
  if (typeof endpoint !== "string" || endpoint.length > 1000 || !ENDPOINT.test(endpoint)) return null;
  if (typeof p256dh !== "string" || !/^[A-Za-z0-9_-]{87}$/u.test(p256dh)) return null;
  if (typeof auth !== "string" || !/^[A-Za-z0-9_-]{22}$/u.test(auth)) return null;
  return { endpoint, p256dh, auth };
}

/* The VAPID public key as PushManager.subscribe() wants it. */
export function applicationServerKey(base64Url: string): Uint8Array<ArrayBuffer> {
  const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(base64Url.length / 4) * 4, "=");
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}
