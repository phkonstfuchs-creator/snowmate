import "server-only";

import { createHmac } from "node:crypto";
import type { createClient } from "@/lib/supabase/server";

type MediaBucket = "avatars" | "post-photos";
type MediaClient = Pick<Awaited<ReturnType<typeof createClient>>, "rpc">;

export interface MediaAttestationKey {
  keyId: string;
  secret: Buffer;
}

interface MediaTuple {
  keyId: string;
  ownerId: string;
  objectId: string;
  bucket: MediaBucket;
  path: string;
  issuedSeconds: number;
}

type UploadedMedia = Omit<MediaTuple, "keyId" | "issuedSeconds">;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/u;
const BASE64_KEY = /^[A-Za-z0-9+/]{43}=$/u;
const KEY_ID = /^[a-z0-9_-]{1,32}$/u;

export function readMediaAttestationKey(): MediaAttestationKey | null {
  const encoded = process.env.MEDIA_ATTESTATION_KEY;
  const keyId = process.env.MEDIA_ATTESTATION_KEY_ID || "v1";
  if (!encoded || !BASE64_KEY.test(encoded) || !KEY_ID.test(keyId)) return null;
  const secret = Buffer.from(encoded, "base64");
  if (secret.length !== 32 || secret.toString("base64") !== encoded) return null;
  return { keyId, secret };
}

export function canonicalMediaAttestation(input: MediaTuple): string {
  return `v1\n${input.keyId}\n${input.ownerId}\n${input.objectId}\n${input.bucket}\n${input.path}\n${input.issuedSeconds}`;
}

export function signMediaAttestation(input: MediaTuple, secret: Buffer): string {
  return createHmac("sha256", secret).update(canonicalMediaAttestation(input), "utf8").digest("hex");
}

/** Only newly uploaded objects in the authenticated owner's folder may be attested. */
export async function attestUploadedMedia(client: MediaClient, media: UploadedMedia, key: MediaAttestationKey): Promise<boolean> {
  if (!UUID.test(media.ownerId) || !UUID.test(media.objectId)
    || !media.path.startsWith(`${media.ownerId}/`) || !media.path.endsWith(".webp")
    || !UUID.test(media.path.slice(media.ownerId.length + 1, -5))
    || !KEY_ID.test(key.keyId)
    || (media.bucket !== "avatars" && media.bucket !== "post-photos")) return false;

  const issuedSeconds = Math.floor(Date.now() / 1000);
  const signature = signMediaAttestation({ ...media, keyId: key.keyId, issuedSeconds }, key.secret);
  try {
    const { data, error } = await client.rpc("attest_my_media", {
      p_bucket: media.bucket,
      p_path: media.path,
      p_object_id: media.objectId,
      p_issued_at: issuedSeconds,
      p_key_id: key.keyId,
      p_signature: signature,
    });
    return !error && data === true;
  } catch {
    return false;
  }
}
