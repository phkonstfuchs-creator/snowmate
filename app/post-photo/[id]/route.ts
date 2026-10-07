import { getVisiblePostPhoto } from "@/features/posts/queries";
import { sanitizeStoredImage } from "@/features/profile/safe-upload";
import { POST_PHOTO_MAX_BYTES, POST_PHOTO_MAX_SIDE } from "@/features/posts/post";

/* Serves a post's photo to the author and their friends only. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const stored = await getVisiblePostPhoto(id);
  const file = stored ? await sanitizeStoredImage(stored, { maxSide: POST_PHOTO_MAX_SIDE, maxBytes: POST_PHOTO_MAX_BYTES, square: false }) : null;
  if (!file) return new Response(null, { status: 404, headers: { "Cache-Control": "no-store" } });
  return new Response(await file.arrayBuffer(), {
    headers: {
      "Content-Type": "image/webp",
      "Cache-Control": "private, no-store, max-age=0",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
