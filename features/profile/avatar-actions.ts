"use server";

import { revalidateApp } from "@/lib/revalidate";
import { createClient } from "@/lib/supabase/server";
import { AVATAR_BUCKET, AVATAR_MAX_BYTES, avatarPath, isOwnAvatarPath, sniffAvatarType } from "./avatar-image";
import type { AvatarVisibility } from "./profile-input";

export type AvatarOutcome = "saved" | "invalid" | "too_large" | "unauthenticated" | "unavailable";

async function currentUser() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  return { supabase, userId: typeof userId === "string" ? userId : null };
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

    const bytes = new Uint8Array(await file.arrayBuffer());
    const type = sniffAvatarType(bytes);
    if (!type) return "invalid";

    const { data: before } = await supabase.from("profiles").select("avatar_path").eq("id", userId).maybeSingle<{ avatar_path: string | null }>();
    const path = avatarPath(userId, type, crypto.randomUUID());

    const upload = await supabase.storage.from(AVATAR_BUCKET).upload(path, bytes, { contentType: type, upsert: false });
    if (upload.error) return "unavailable";

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
