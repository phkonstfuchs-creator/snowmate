"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidateApp } from "@/lib/revalidate";
import { sniffAvatarType } from "@/features/profile/avatar-image";
import { RESORTS } from "@/lib/resorts";
import { POST_PHOTO_BUCKET, POST_PHOTO_MAX_BYTES, normalizePostBody, type CreatePostOutcome } from "./post";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/u;
const OUTCOMES: readonly CreatePostOutcome[] = ["created", "invalid", "rate_limited", "profile_incomplete", "unauthenticated"];

/* Stores the photo (if any) in the author's folder, then the post. Who
   sees it is decided in the database: the author and confirmed friends. */
export async function createPostAction(formData: FormData): Promise<CreatePostOutcome> {
  const text = formData.get("body");
  const body = typeof text === "string" ? normalizePostBody(text) : null;
  const resortValue = formData.get("resort");
  const resort = typeof resortValue === "string" && RESORTS.some((r) => r.name === resortValue) ? resortValue : null;
  const photo = formData.get("photo");
  if (!body) return "invalid";
  if (photo instanceof Blob && photo.size > POST_PHOTO_MAX_BYTES) return "too_large";

  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getClaims();
    const userId = data?.claims?.sub;
    if (typeof userId !== "string") return "unauthenticated";

    let path: string | null = null;
    if (photo instanceof Blob && photo.size > 0) {
      const bytes = new Uint8Array(await photo.arrayBuffer());
      const type = sniffAvatarType(bytes);
      if (!type) return "invalid";
      path = `${userId}/${crypto.randomUUID()}.${type === "image/webp" ? "webp" : "jpg"}`;
      const upload = await supabase.storage.from(POST_PHOTO_BUCKET).upload(path, bytes, { contentType: type, upsert: false });
      if (upload.error) return "unavailable";
    }

    const { data: outcome, error } = await supabase.rpc("create_post", { p_body: body, p_resort: resort, p_photo_path: path });
    if (error || outcome !== "created") {
      if (path) await supabase.storage.from(POST_PHOTO_BUCKET).remove([path]);
      if (error) return "unavailable";
      return OUTCOMES.includes(outcome as CreatePostOutcome) ? (outcome as CreatePostOutcome) : "unavailable";
    }
    revalidateApp();
    return "created";
  } catch {
    return "unavailable";
  }
}

export async function deletePostAction(postId: string): Promise<boolean> {
  if (!UUID.test(postId)) return false;
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("delete_my_post", { p_id: postId });
    const row = Array.isArray(data) ? (data[0] as { deleted?: boolean; photo_path?: string | null } | undefined) : undefined;
    if (error || !row?.deleted) return false;
    if (row.photo_path) await supabase.storage.from(POST_PHOTO_BUCKET).remove([row.photo_path]);
    revalidateApp();
    return true;
  } catch {
    return false;
  }
}
