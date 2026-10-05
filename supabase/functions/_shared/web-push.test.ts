import { describe, expect, it } from "vitest";
import { base64UrlDecode, base64UrlEncode, encryptPayload, vapidAuthorization } from "./web-push";

const encoder = new TextEncoder();

async function hkdf(salt: Uint8Array<ArrayBuffer>, ikm: Uint8Array<ArrayBuffer>, info: string | Uint8Array<ArrayBuffer>, length: number) {
  const key = await crypto.subtle.importKey("raw", ikm, "HKDF", false, ["deriveBits"]);
  const infoBytes = typeof info === "string" ? encoder.encode(info) : info;
  return new Uint8Array(await crypto.subtle.deriveBits({ name: "HKDF", hash: "SHA-256", salt, info: infoBytes }, key, length * 8));
}

/* A browser: its key pair and auth secret, and the decryption it does. */
async function browser() {
  const pair = (await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"])) as CryptoKeyPair;
  const publicKey = new Uint8Array(await crypto.subtle.exportKey("raw", pair.publicKey));
  const auth = crypto.getRandomValues(new Uint8Array(16));
  const decrypt = async (body: Uint8Array<ArrayBuffer>) => {
    const salt = body.slice(0, 16);
    const idLength = body[20]!;
    const senderKey = body.slice(21, 21 + idLength);
    const sealed = body.slice(21 + idLength);
    const sender = await crypto.subtle.importKey("raw", senderKey, { name: "ECDH", namedCurve: "P-256" }, false, []);
    const shared = new Uint8Array(await crypto.subtle.deriveBits({ name: "ECDH", public: sender }, pair.privateKey, 256));
    const info = new Uint8Array([...encoder.encode("WebPush: info\0"), ...publicKey, ...senderKey]);
    const ikm = await hkdf(auth, shared, info, 32);
    const cek = await hkdf(salt, ikm, "Content-Encoding: aes128gcm\0", 16);
    const nonce = await hkdf(salt, ikm, "Content-Encoding: nonce\0", 12);
    const key = await crypto.subtle.importKey("raw", cek, "AES-GCM", false, ["decrypt"]);
    const plain = new Uint8Array(await crypto.subtle.decrypt({ name: "AES-GCM", iv: nonce }, key, sealed));
    return { recordSize: new DataView(body.buffer).getUint32(16), padding: plain.at(-1), text: new TextDecoder().decode(plain.slice(0, -1)) };
  };
  return { p256dh: base64UrlEncode(publicKey), auth: base64UrlEncode(auth), decrypt };
}

describe("encryptPayload", () => {
  it("produces a body only the browser can read", async () => {
    const device = await browser();
    const body = await encryptPayload(device, encoder.encode('{"kind":"message","name":"Lena"}'));
    await expect(device.decrypt(body)).resolves.toEqual({ recordSize: 4096, padding: 2, text: '{"kind":"message","name":"Lena"}' });

    const other = await browser();
    await expect(other.decrypt(body)).rejects.toThrow();
  });

  it("refuses malformed keys", async () => {
    await expect(encryptPayload({ p256dh: "abc", auth: "abc" }, encoder.encode("x"))).rejects.toThrow("bad subscription keys");
  });
});

describe("vapidAuthorization", () => {
  it("signs a short-lived token for the push service's origin", async () => {
    const pair = (await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"])) as CryptoKeyPair;
    const publicKey = base64UrlEncode(new Uint8Array(await crypto.subtle.exportKey("raw", pair.publicKey)));
    const privateKey = (await crypto.subtle.exportKey("jwk", pair.privateKey)).d!;
    const now = Date.UTC(2026, 0, 10, 8);

    const header = await vapidAuthorization("https://fcm.googleapis.com/fcm/send/abc", { publicKey, privateKey, subject: "mailto:a@example.com" }, now);
    const match = /^vapid t=([^.]+)\.([^.]+)\.([^,]+), k=(.+)$/u.exec(header);
    expect(match?.[4]).toBe(publicKey);
    const claims = JSON.parse(new TextDecoder().decode(base64UrlDecode(match![2]!)));
    expect(claims).toEqual({ aud: "https://fcm.googleapis.com", exp: now / 1000 + 12 * 3600, sub: "mailto:a@example.com" });

    const valid = await crypto.subtle.verify(
      { name: "ECDSA", hash: "SHA-256" },
      pair.publicKey,
      base64UrlDecode(match![3]!),
      encoder.encode(`${match![1]}.${match![2]}`),
    );
    expect(valid).toBe(true);
  });
});
