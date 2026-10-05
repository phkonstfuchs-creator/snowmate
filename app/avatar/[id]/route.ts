import { getVisibleAvatar } from "@/features/profile/queries";

/* Serves a profile picture to people allowed to see it; the browser only
   ever talks to Pistl. 404 means no picture, or not for you. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const file = await getVisibleAvatar(id);
  /* "No picture" is never cached: a new upload shows up right away. */
  if (!file) return new Response(null, { status: 404, headers: { "Cache-Control": "no-store" } });
  return new Response(file, {
    headers: {
      "Content-Type": file.type === "image/jpeg" ? "image/jpeg" : "image/webp",
      "Cache-Control": "private, max-age=120",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
