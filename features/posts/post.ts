/* Ski-day posts: short text, an optional photo and resort, for friends
   (ADR 0024). The database checks the same rules again (create_post). */

export const MAX_POST_LENGTH = 500;
export const POST_PHOTO_MAX_BYTES = 1536 * 1024;
export const POST_PHOTO_MAX_SIDE = 1600;
export const POST_PHOTO_BUCKET = "post-photos";

const FORBIDDEN_CHARS = /[\u0001-\u0009\u000b\u000c\u000e-\u001f\u007f‪-‮⁦-⁩]/u;

export type CreatePostOutcome = "created" | "invalid" | "blocked" | "rate_limited" | "profile_incomplete" | "unauthenticated" | "too_large" | "unavailable";

export interface Post {
  id: string;
  authorId: string;
  authorName: string;
  authorHandle: string | null;
  body: string;
  resort: string | null;
  hasPhoto: boolean;
  createdAt: string;
  isMine: boolean;
}

export interface PostRow {
  id: string;
  author_id: string;
  author_name: string | null;
  author_handle: string | null;
  body: string;
  resort: string | null;
  has_photo: boolean | null;
  created_at: string;
  is_mine: boolean | null;
}

/* The text as it will be stored, or null when it cannot be posted. */
export function normalizePostBody(text: string): string | null {
  const clean = text.replace(/^\s+|\s+$/gu, "");
  if (clean.length === 0 || [...clean].length > MAX_POST_LENGTH || FORBIDDEN_CHARS.test(clean)) return null;
  return clean;
}

export function toPost(row: PostRow): Post {
  return {
    id: row.id,
    authorId: row.author_id,
    authorName: row.author_name ?? (row.author_handle ? `@${row.author_handle}` : "Rider"),
    authorHandle: row.author_handle,
    body: row.body,
    resort: row.resort,
    hasPhoto: row.has_photo === true,
    createdAt: row.created_at,
    isMine: row.is_mine === true,
  };
}

/* Width and height that fit within the longest side, keeping the ratio. */
export function fitWithin(width: number, height: number, max: number): [number, number] {
  const scale = Math.min(1, max / Math.max(width, height));
  return [Math.round(width * scale), Math.round(height * scale)];
}
