"use server";

import { revalidateApp } from "@/lib/revalidate";
import { createClient } from "@/lib/supabase/server";
import { rateLimiter } from "@/lib/rate-limit";
import { attestUploadedMedia, readMediaAttestationKey } from "@/lib/media-attestation";
import { AVATAR_BUCKET, AVATAR_MAX_BYTES, AVATAR_SIZE_PX, avatarPath, isOwnAvatarPath } from "./avatar-image";
import { prepareImageUpload } from "./safe-upload";
import type { AvatarVisibility } from "./profile-input";

export type AvatarOutcome = "saved" | "invalid" | "too_large" | "unauthenticated" | "unavailable";

async function currentUser() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  return { supabase, userId: error ? null : data.user?.id ?? null };
}

/* Stores a new picture in the caller's own folder, points the profile at
   it and removes the previous one. Identity comes from the session; the
   storage policy only allows the caller's folder anyway. */
export async function uploadAvatarAction(formData: FormData): Promise<AvatarOutcome> {
  const file = formData.get("avatar");
  if (!(file instanceof Blob)) return "invalid";
  if (file.size > AVATAR_MAX_BYTES) return "too_large";
  if (file.size === 0) return "invalid";

  try {
    const { supabase, userId } = await currentUser();
    if (!userId) return "unauthenticated";
    if (!rateLimiter.hit("mediaUploadUser", userId)) return "unavailable";
    const signingKey = readMediaAttestationKey();
    if (!signingKey) return "unavailable";

    const bytes = new Uint8Array(await file.arrayBuffer());
    const prepared = await prepareImageUpload(bytes, { maxSide: AVATAR_SIZE_PX, maxBytes: AVATAR_MAX_BYTES, square: true });
    if (prepared.status !== "ready") return prepared.status;

    const { data: before } = await supabase.from("profiles").select("avatar_path").eq("id", userId).maybeSingle<{ avatar_path: string | null }>();
    const path = avatarPath(userId, prepared.type, crypto.randomUUID());

    const upload = await supabase.storage.from(AVATAR_BUCKET).upload(path, prepared.bytes, { contentType: prepared.type, upsert: false });
    if (upload.error) return "unavailable";
    const attested = typeof upload.data?.id === "string" && await attestUploadedMedia(supabase, {
      ownerId: userId, objectId: upload.data.id, bucket: AVATAR_BUCKET, path,
    }, signingKey);
    if (!attested) {
      await supabase.storage.from(AVATAR_BUCKET).remove([path]);
      return "unavailable";
    }

    const { error } = await supabase.from("profiles").update({ avatar_path: path }).eq("id", userId);
    if (error) {
      await supabase.storage.from(AVATAR_BUCKET).remove([path]);
      return "unavailable";
    }

    if (before?.avatar_path && isOwnAvatarPath(userId, before.avatar_path) && before.avatar_path !== path) {
      await supabase.storage.from(AVATAR_BUCKET).remove([before.avatar_path]);
    }
    revalidateApp();
    return "saved";
  } catch {
    return "unavailable";
  }
}

export async function removeAvatarAction(): Promise<AvatarOutcome> {
  try {
    const { supabase, userId } = await currentUser();
    if (!userId) return "unauthenticated";
    const { data: before } = await supabase.from("profiles").select("avatar_path").eq("id", userId).maybeSingle<{ avatar_path: string | null }>();
    const { error } = await supabase.from("profiles").update({ avatar_path: null }).eq("id", userId);
    if (error) return "unavailable";
    if (before?.avatar_path && isOwnAvatarPath(userId, before.avatar_path)) {
      await supabase.storage.from(AVATAR_BUCKET).remove([before.avatar_path]);
    }
    revalidateApp();
    return "saved";
  } catch {
    return "unavailable";
  }
}

export async function setAvatarVisibilityAction(visibility: AvatarVisibility): Promise<AvatarOutcome> {
  if (visibility !== "friends" && visibility !== "contacts") return "invalid";
  try {
    const { supabase, userId } = await currentUser();
    if (!userId) return "unauthenticated";
    const { error } = await supabase.from("profiles").update({ avatar_visibility: visibility }).eq("id", userId);
    if (error) return "unavailable";
    revalidateApp();
    return "saved";
  } catch {
    return "unavailable";
  }
}
