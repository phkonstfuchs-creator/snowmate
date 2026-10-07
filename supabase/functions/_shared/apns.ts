/* Native push to iPhones through Apple's APNs (ADR 0025, ADR 0031), on
   WebCrypto only like web-push.ts, so it runs in Deno and in the tests.

   Like web push, a notice carries no message text. The sentence comes
   from the app's Localizable.strings (loc-key), so it appears in the
   phone's language; only the actor's name is filled in. */

import type { QueuedNotice } from "./push-notice";

export interface ApnsConfig {
  /* The .p8 key from the Apple Developer account, PEM text. */
  keyPem: string;
  keyId: string;
  teamId: string;
  /* The app's bundle id. */
  topic: string;
  /* api.push.apple.com for TestFlight and the App Store,
     api.sandbox.push.apple.com for builds run from Xcode. */
  host: string;
}

/* Kinds the app has a sentence for; anything else gets the fallback. */
export const APNS_KINDS = ["message", "friend_request", "friend_accepted", "ride_request", "ride_joined", "ride_accepted", "lift_meetup"] as const;

const encoder = new TextEncoder();

/* Local copies: shared modules here only import types from each other,
   so Deno and the Node tests resolve them the same way. */
function base64Decode(value: string): Uint8Array<ArrayBuffer> {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/u, "");
}

export function readApnsConfig(env: (name: string) => string | undefined): ApnsConfig | null {
  const config = {
    keyPem: env("APNS_KEY") ?? "",
    keyId: env("APNS_KEY_ID") ?? "",
    teamId: env("APNS_TEAM_ID") ?? "",
    topic: env("APNS_TOPIC") || "app.pistl",
    host: env("APNS_HOST") || "api.push.apple.com",
  };
  if (!config.keyPem || !/^[A-Z0-9]{10}$/.test(config.keyId) || !/^[A-Z0-9]{10}$/.test(config.teamId)) return null;
  if (config.host !== "api.push.apple.com" && config.host !== "api.sandbox.push.apple.com") return null;
  return config;
}

function pemToPkcs8(pem: string): Uint8Array<ArrayBuffer> {
  return base64Decode(pem.replace(/-----(BEGIN|END) PRIVATE KEY-----/g, "").replace(/\s+/g, ""));
}

/* Provider token (ES256 JWT). Apple accepts one for up to an hour and
   refuses a new one more often than every 20 minutes, so it is cached. */
let cached: { key: string; token: string; at: number } | null = null;

export async function apnsJwt(config: ApnsConfig, now = Date.now()): Promise<string> {
  const cacheKey = `${config.teamId}.${config.keyId}`;
  if (cached && cached.key === cacheKey && now - cached.at < 40 * 60_000) return cached.token;

  const header = base64UrlEncode(encoder.encode(JSON.stringify({ alg: "ES256", kid: config.keyId })));
  const claims = base64UrlEncode(encoder.encode(JSON.stringify({ iss: config.teamId, iat: Math.floor(now / 1000) })));
  const key = await crypto.subtle.importKey("pkcs8", pemToPkcs8(config.keyPem), { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
  const signature = new Uint8Array(await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, encoder.encode(`${header}.${claims}`)));
  const token = `${header}.${claims}.${base64UrlEncode(signature)}`;
  cached = { key: cacheKey, token, at: now };
  return token;
}

export function resetApnsJwtCache(): void {
  cached = null;
}

export function apnsPayload(notice: QueuedNotice): string {
  const name = (notice.actor_name ?? "").trim().slice(0, 60);
  const known = (APNS_KINDS as readonly string[]).includes(notice.kind);
  const alert = known && name
    ? { "loc-key": `push.${notice.kind}`, "loc-args": [name] }
    : { "loc-key": "push.fallback" };
  return JSON.stringify({
    aps: { alert, sound: "default", "thread-id": notice.url.slice(0, 64) },
    url: notice.url,
  });
}

/* Apple says this token will never work again for this app. */
export function apnsTokenIsGone(status: number, reason: string | null): boolean {
  return status === 410 || (status === 400 && (reason === "BadDeviceToken" || reason === "DeviceTokenNotForTopic"));
}

export async function sendApns(
  token: string,
  notice: QueuedNotice,
  config: ApnsConfig,
  send: typeof fetch = fetch,
): Promise<{ status: number; reason: string | null }> {
  if (!/^[0-9a-f]{64,200}$/.test(token)) throw new Error("bad device token");
  const response = await send(`https://${config.host}/3/device/${token}`, {
    method: "POST",
    headers: {
      authorization: `bearer ${await apnsJwt(config)}`,
      "apns-topic": config.topic,
      "apns-push-type": "alert",
      "apns-priority": "10",
      "apns-expiration": String(Math.floor(Date.now() / 1000) + 3600),
      "apns-collapse-id": `${notice.kind}${notice.url}`.slice(0, 64),
      "content-type": "application/json",
    },
    body: apnsPayload(notice),
  });
  let reason: string | null = null;
  if (!response.ok) {
    try {
      const body: unknown = await response.json();
      if (body && typeof body === "object" && "reason" in body && typeof body.reason === "string") reason = body.reason;
    } catch {
      reason = null;
    }
  }
  return { status: response.status, reason };
}
