import { getVisibleAvatar } from "@/features/profile/queries";
import { sanitizeStoredImage } from "@/features/profile/safe-upload";
import { AVATAR_MAX_BYTES, AVATAR_SIZE_PX } from "@/features/profile/avatar-image";

/* Serves a profile picture to people allowed to see it; the browser only
   ever talks to Pistl. 404 means no picture, or not for you. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const stored = await getVisibleAvatar(id);
  const file = stored ? await sanitizeStoredImage(stored, { maxSide: AVATAR_SIZE_PX, maxBytes: AVATAR_MAX_BYTES, square: true }) : null;
  /* "No picture" is never cached: a new upload shows up right away. */
  if (!file) return new Response(null, { status: 404, headers: { "Cache-Control": "no-store" } });
  return new Response(await file.arrayBuffer(), {
    headers: {
      "Content-Type": "image/webp",
      "Cache-Control": "private, no-store, max-age=0",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
