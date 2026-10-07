import { beforeEach, describe, expect, it, vi } from "vitest";
import { apnsJwt, apnsPayload, apnsTokenIsGone, readApnsConfig, resetApnsJwtCache, sendApns, type ApnsConfig } from "./apns";

const TOKEN = "ab".repeat(32);
const NOTICE = { kind: "message", actor_name: "Lena", url: "/crew/chat/1" };

async function makeConfig(): Promise<{ config: ApnsConfig; publicKey: CryptoKey }> {
  const pair = (await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"])) as CryptoKeyPair;
  const pkcs8 = new Uint8Array(await crypto.subtle.exportKey("pkcs8", pair.privateKey));
  const base64 = btoa(String.fromCharCode(...pkcs8)).replace(/(.{64})/g, "$1\n");
  return {
    config: { keyPem: `-----BEGIN PRIVATE KEY-----\n${base64}\n-----END PRIVATE KEY-----`, keyId: "ABC123DEFG", teamId: "TEAM123456", topic: "app.pistl", host: "api.push.apple.com" },
    publicKey: pair.publicKey,
  };
}

const decode = (part: string) => JSON.parse(atob(part.replace(/-/g, "+").replace(/_/g, "/"))) as Record<string, unknown>;

beforeEach(() => resetApnsJwtCache());

describe("readApnsConfig", () => {
  it("needs a key, a key id and a team id, and only Apple's hosts", () => {
    const env = (values: Record<string, string>) => (name: string) => values[name];
    const base = { APNS_KEY: "pem", APNS_KEY_ID: "ABC123DEFG", APNS_TEAM_ID: "TEAM123456" };
    expect(readApnsConfig(env(base))).toMatchObject({ topic: "app.pistl", host: "api.push.apple.com" });
    expect(readApnsConfig(env({ ...base, APNS_HOST: "api.sandbox.push.apple.com" }))?.host).toBe("api.sandbox.push.apple.com");
    expect(readApnsConfig(env({ ...base, APNS_HOST: "evil.example.com" }))).toBeNull();
    expect(readApnsConfig(env({ ...base, APNS_KEY: "" }))).toBeNull();
    expect(readApnsConfig(env({ ...base, APNS_TEAM_ID: "x" }))).toBeNull();
  });
});

describe("apnsJwt", () => {
  it("is a verifiable ES256 token with the key and team ids, reused for a while", async () => {
    const { config, publicKey } = await makeConfig();
    const token = await apnsJwt(config, 1_700_000_000_000);
    const [header, claims, signature] = token.split(".");
    expect(decode(header!)).toEqual({ alg: "ES256", kid: "ABC123DEFG" });
    expect(decode(claims!)).toEqual({ iss: "TEAM123456", iat: 1_700_000_000 });
    const raw = Uint8Array.from(atob(signature!.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));
    const valid = await crypto.subtle.verify({ name: "ECDSA", hash: "SHA-256" }, publicKey, raw, new TextEncoder().encode(`${header}.${claims}`));
    expect(valid).toBe(true);

    expect(await apnsJwt(config, 1_700_000_000_000 + 10 * 60_000)).toBe(token);
    expect(await apnsJwt(config, 1_700_000_000_000 + 45 * 60_000)).not.toBe(token);
  });
});

describe("apnsPayload", () => {
  it("names the sentence by key and fills in only the name", () => {
    expect(JSON.parse(apnsPayload(NOTICE))).toEqual({
      aps: { alert: { "loc-key": "push.message", "loc-args": ["Lena"] }, sound: "default", "thread-id": "/crew/chat/1" },
      url: "/crew/chat/1",
    });
  });

  it("falls back for unknown kinds and missing names", () => {
    expect(JSON.parse(apnsPayload({ ...NOTICE, kind: "surprise" })).aps.alert).toEqual({ "loc-key": "push.fallback" });
    expect(JSON.parse(apnsPayload({ ...NOTICE, actor_name: null })).aps.alert).toEqual({ "loc-key": "push.fallback" });
  });
});

describe("sendApns", () => {
  it("posts to the device with Apple's headers", async () => {
    const { config } = await makeConfig();
    const send = vi.fn(async () => new Response(null, { status: 200 }));
    await expect(sendApns(TOKEN, NOTICE, config, send)).resolves.toEqual({ status: 200, reason: null });
    const [url, init] = send.mock.calls[0] as unknown as [string, RequestInit & { headers: Record<string, string> }];
    expect(url).toBe(`https://api.push.apple.com/3/device/${TOKEN}`);
    expect(init.headers).toMatchObject({ "apns-topic": "app.pistl", "apns-push-type": "alert" });
    expect(init.headers.authorization).toMatch(/^bearer [\w-]+\.[\w-]+\.[\w-]+$/);
  });

  it("reports Apple's reason and refuses malformed tokens", async () => {
    const { config } = await makeConfig();
    const send = vi.fn(async () => new Response(JSON.stringify({ reason: "BadDeviceToken" }), { status: 400 }));
    await expect(sendApns(TOKEN, NOTICE, config, send)).resolves.toEqual({ status: 400, reason: "BadDeviceToken" });
    await expect(sendApns("../x", NOTICE, config, send)).rejects.toThrow();
  });
});

describe("apnsTokenIsGone", () => {
  it("only for tokens Apple will never accept again", () => {
    expect(apnsTokenIsGone(410, "Unregistered")).toBe(true);
    expect(apnsTokenIsGone(400, "BadDeviceToken")).toBe(true);
    expect(apnsTokenIsGone(400, "PayloadEmpty")).toBe(false);
    expect(apnsTokenIsGone(429, "TooManyRequests")).toBe(false);
  });
});
