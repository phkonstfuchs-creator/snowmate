import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const exportIdSchema = z.uuid();
const privateHeaders = {
  "Cache-Control": "private, no-store",
  Pragma: "no-cache",
  "X-Content-Type-Options": "nosniff",
};

function notFound(): Response {
  return Response.json(
    { error: "not_found" },
    { status: 404, headers: privateHeaders },
  );
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const parsedId = exportIdSchema.safeParse((await params).id);
  if (!parsedId.success) return notFound();

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("download_account_export", {
      p_export_id: parsedId.data,
    });
    if (error || data === null) return notFound();

    return new Response(JSON.stringify(data, null, 2), {
      status: 200,
      headers: {
        ...privateHeaders,
        "Content-Disposition":
          'attachment; filename="pistl-data-export.json"',
        "Content-Type": "application/json; charset=utf-8",
      },
    });
  } catch {
    return notFound();
  }
}
