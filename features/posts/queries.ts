import { createClient } from "@/lib/supabase/server";
import { POST_PHOTO_BUCKET, toPost, type Post, type PostRow } from "./post";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/u;

/* The caller's and their friends' posts (or only the caller's), newest
   first. null when the backend could not be reached. */
export async function listPosts(options: { onlyMine?: boolean } = {}): Promise<Post[] | null> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("list_post_feed", options.onlyMine ? { only_mine: true } : {});
    if (error || !Array.isArray(data)) return null;
    return (data as PostRow[]).map(toPost);
  } catch {
    return null;
  }
}

/* A post's photo if the caller may see the post, else null. */
export async function getVisiblePostPhoto(postId: string): Promise<Blob | null> {
  if (!UUID.test(postId)) return null;
  try {
    const supabase = await createClient();
    const { data: path, error } = await supabase.rpc("post_photo_path_for", { p_id: postId });
    if (error || typeof path !== "string") return null;
    const { data: file, error: downloadError } = await supabase.storage.from(POST_PHOTO_BUCKET).download(path);
    return downloadError || !file ? null : file;
  } catch {
    return null;
  }
}
