/* Web Push without dependencies, on WebCrypto only, so the same code runs
   in the Supabase edge runtime (Deno) and in the unit tests (Node).
   Payload encryption: RFC 8291 (aes128gcm, RFC 8188).
   Sender identification: VAPID, RFC 8292 (ES256 JWT). */

export interface PushTarget {
  endpoint: string;
  /* The browser's P-256 public key (65 bytes) and auth secret (16 bytes), base64url. */
  p256dh: string;
  auth: string;
}

export interface Vapid {
  /* Uncompressed P-256 public key (65 bytes) and private scalar (32 bytes), base64url. */
  publicKey: string;
  privateKey: string;
  /* mailto: or https: contact for push services. */
  subject: string;
}

const encoder = new TextEncoder();
const RECORD_SIZE = 4096;

export function base64UrlDecode(value: string): Uint8Array<ArrayBuffer> {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export function base64UrlEncode(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/u, "");
}

function concat(...parts: Uint8Array[]): Uint8Array<ArrayBuffer> {
  const out = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

async function hkdf(salt: Uint8Array<ArrayBuffer>, ikm: Uint8Array<ArrayBuffer>, info: Uint8Array<ArrayBuffer>, length: number) {
  const key = await crypto.subtle.importKey("raw", ikm, "HKDF", false, ["deriveBits"]);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: "HKDF", hash: "SHA-256", salt, info }, key, length * 8));
}

/* The encrypted body for one device (RFC 8291 section 3.4). */
export async function encryptPayload(target: Pick<PushTarget, "p256dh" | "auth">, payload: Uint8Array<ArrayBuffer>, salt = crypto.getRandomValues(new Uint8Array(16))) {
  const receiverKey = base64UrlDecode(target.p256dh);
  const authSecret = base64UrlDecode(target.auth);
  if (receiverKey.length !== 65 || authSecret.length !== 16) throw new Error("bad subscription keys");
  if (payload.length > RECORD_SIZE - 17 - 86) throw new Error("payload too large");

  const local = (await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"])) as CryptoKeyPair;
  const localPublic = new Uint8Array(await crypto.subtle.exportKey("raw", local.publicKey));
  const receiver = await crypto.subtle.importKey("raw", receiverKey, { name: "ECDH", namedCurve: "P-256" }, false, []);
  const shared = new Uint8Array(await crypto.subtle.deriveBits({ name: "ECDH", public: receiver }, local.privateKey, 256));

  const ikm = await hkdf(authSecret, shared, concat(encoder.encode("WebPush: info\0"), receiverKey, localPublic), 32);
  const cek = await hkdf(salt, ikm, encoder.encode("Content-Encoding: aes128gcm\0"), 16);
  const nonce = await hkdf(salt, ikm, encoder.encode("Content-Encoding: nonce\0"), 12);

  const key = await crypto.subtle.importKey("raw", cek, "AES-GCM", false, ["encrypt"]);
  const sealed = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, key, concat(payload, new Uint8Array([2]))));

  const header = new Uint8Array(21);
  header.set(salt, 0);
  new DataView(header.buffer).setUint32(16, RECORD_SIZE);
  header[20] = localPublic.length;
  return concat(header, localPublic, sealed);
}

/* The Authorization header value identifying Pistl to the push service. */
export async function vapidAuthorization(endpoint: string, vapid: Vapid, now = Date.now()) {
  const publicKey = base64UrlDecode(vapid.publicKey);
  if (publicKey.length !== 65) throw new Error("bad VAPID public key");
  const jwk: JsonWebKey = {
    kty: "EC",
    crv: "P-256",
    d: vapid.privateKey,
    x: base64UrlEncode(publicKey.slice(1, 33)),
    y: base64UrlEncode(publicKey.slice(33, 65)),
    ext: true,
  };
  const key = await crypto.subtle.importKey("jwk", jwk, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
  const header = base64UrlEncode(encoder.encode(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const claims = base64UrlEncode(
    encoder.encode(JSON.stringify({ aud: new URL(endpoint).origin, exp: Math.floor(now / 1000) + 12 * 3600, sub: vapid.subject })),
  );
  const signature = new Uint8Array(await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, encoder.encode(`${header}.${claims}`)));
  return `vapid t=${header}.${claims}.${base64UrlEncode(signature)}, k=${vapid.publicKey}`;
}

/* Sends one notice. Returns the push service's status; 404 and 410 mean
   the device is gone for good. */
export async function sendWebPush(target: PushTarget, payload: string, vapid: Vapid, topic?: string): Promise<number> {
  const body = await encryptPayload(target, encoder.encode(payload));
  const headers: Record<string, string> = {
    Authorization: await vapidAuthorization(target.endpoint, vapid),
    "Content-Encoding": "aes128gcm",
    "Content-Type": "application/octet-stream",
    TTL: "3600",
    Urgency: "normal",
  };
  /* A newer notice with the same topic replaces one still waiting. */
  if (topic) headers.Topic = topic;
  const response = await fetch(target.endpoint, { method: "POST", headers, body, signal: AbortSignal.timeout(10_000) });
  return response.status;
}
