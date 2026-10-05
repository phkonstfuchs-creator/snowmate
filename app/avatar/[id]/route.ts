import { getVisibleAvatar } from "@/features/profile/queries";

/* Serves a profile picture to people allowed to see it; the browser only
   ever talks to Pistl. 404 means no picture, or not for you. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const file = await getVisibleAvatar(id);
  if (!file) return new Response(null, { status: 404, headers: { "Cache-Control": "private, max-age=300" } });
  return new Response(file, {
    headers: {
      "Content-Type": file.type === "image/jpeg" ? "image/jpeg" : "image/webp",
      "Cache-Control": "private, max-age=600",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
