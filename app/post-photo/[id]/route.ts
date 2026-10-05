import { getVisiblePostPhoto } from "@/features/posts/queries";

/* Serves a post's photo to the author and their friends only. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const file = await getVisiblePostPhoto(id);
  if (!file) return new Response(null, { status: 404, headers: { "Cache-Control": "no-store" } });
  return new Response(file, {
    headers: {
      "Content-Type": file.type === "image/jpeg" ? "image/jpeg" : "image/webp",
      "Cache-Control": "private, max-age=3600",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
