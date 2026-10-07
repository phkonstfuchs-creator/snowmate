import { createHmac, randomBytes } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { attestUploadedMedia, canonicalMediaAttestation, readMediaAttestationKey, signMediaAttestation } from "./media-attestation";

const OWNER = "c4a70000-0000-4000-8000-000000000001";
const OBJECT = "c4a70000-0000-4000-8000-000000000002";
const PATH = `${OWNER}/c4a70000-0000-4000-8000-000000000003.webp`;

afterEach(() => vi.unstubAllEnvs());

describe("media attestation", () => {
  it("signs the exact newline-delimited tuple with HMAC-SHA256", () => {
    const secret = randomBytes(32);
    const input = { keyId: "v1", ownerId: OWNER, objectId: OBJECT, bucket: "avatars" as const, path: PATH, issuedSeconds: 1_790_000_000 };
    const canonical = `v1\nv1\n${OWNER}\n${OBJECT}\navatars\n${PATH}\n1790000000`;
    expect(canonicalMediaAttestation(input)).toBe(canonical);
    expect(signMediaAttestation(input, secret)).toBe(createHmac("sha256", secret).update(canonical, "utf8").digest("hex"));
  });

  it("fails closed for an absent, malformed, or wrong-sized key", () => {
    vi.stubEnv("MEDIA_ATTESTATION_KEY", "");
    expect(readMediaAttestationKey()).toBeNull();
    vi.stubEnv("MEDIA_ATTESTATION_KEY", "not base64!");
    expect(readMediaAttestationKey()).toBeNull();
    vi.stubEnv("MEDIA_ATTESTATION_KEY", randomBytes(16).toString("base64"));
    expect(readMediaAttestationKey()).toBeNull();
    vi.stubEnv("MEDIA_ATTESTATION_KEY", randomBytes(32).toString("base64"));
    expect(readMediaAttestationKey()?.keyId).toBe("v1");
    vi.stubEnv("MEDIA_ATTESTATION_KEY_ID", "v1\nforged");
    expect(readMediaAttestationKey()).toBeNull();
  });

  it("submits a valid owner-bound attestation to the RPC", async () => {
    const key = { keyId: "v1", secret: randomBytes(32) };
    const rpc = vi.fn().mockResolvedValue({ data: true, error: null });
    vi.setSystemTime(new Date("2026-10-07T12:00:00.000Z"));
    try {
      await expect(attestUploadedMedia({ rpc }, { ownerId: OWNER, objectId: OBJECT, bucket: "post-photos", path: PATH }, key)).resolves.toBe(true);
      const args = rpc.mock.calls[0]?.[1];
      expect(rpc).toHaveBeenCalledWith("attest_my_media", expect.objectContaining({
        p_bucket: "post-photos", p_path: PATH, p_object_id: OBJECT, p_issued_at: 1_791_374_400, p_key_id: "v1",
      }));
      expect(args.p_signature).toBe(signMediaAttestation({
        keyId: "v1", ownerId: OWNER, objectId: OBJECT, bucket: "post-photos", path: PATH, issuedSeconds: 1_791_374_400,
      }, key.secret));
    } finally {
      vi.useRealTimers();
    }
  });

  it("rejects forged paths before calling the RPC", async () => {
    const rpc = vi.fn();
    const key = { keyId: "v1", secret: randomBytes(32) };
    await expect(attestUploadedMedia({ rpc }, { ownerId: OWNER, objectId: OBJECT, bucket: "avatars", path: `${OBJECT}/foreign.webp` }, key)).resolves.toBe(false);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("refuses invalid filename UUIDs before signing or calling the RPC", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: true, error: null });
    await expect(attestUploadedMedia({ rpc }, {
      ownerId: OWNER, objectId: OBJECT, bucket: "avatars", path: `${OWNER}/${"-".repeat(36)}.webp`,
    }, { keyId: "v1", secret: randomBytes(32) })).resolves.toBe(false);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("fails closed for rejected or unavailable attestation RPCs", async () => {
    const key = { keyId: "v1", secret: randomBytes(32) };
    const media = { ownerId: OWNER, objectId: OBJECT, bucket: "avatars" as const, path: PATH };
    const rpc = vi.fn().mockResolvedValueOnce({ data: true, error: { message: "denied" } })
      .mockResolvedValueOnce({ data: false, error: null })
      .mockRejectedValueOnce(new Error("offline"));
    for (let attempt = 0; attempt < 3; attempt += 1) {
      await expect(attestUploadedMedia({ rpc }, media, key)).resolves.toBe(false);
    }
  });
});
