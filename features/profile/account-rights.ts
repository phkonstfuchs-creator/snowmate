import { createClient } from "@/lib/supabase/server";

const NO_STORE = "private, no-cache, no-store, must-revalidate, max-age=0";

/* GDPR art. 15 and 20: everything stored about the caller as a JSON
   download. export_my_data() only ever reads the caller's own records. */
export async function exportMyDataResponse(now: Date = new Date()): Promise<Response> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("export_my_data");

    if (error || data === null || typeof data !== "object") {
      return new Response("Your data could not be exported. Try again shortly.", {
        status: error?.code === "42501" ? 401 : 503,
        headers: { "Cache-Control": NO_STORE, "Content-Type": "text/plain; charset=utf-8" },
      });
    }

    const day = now.toISOString().slice(0, 10);
    return new Response(JSON.stringify(data, null, 2), {
      status: 200,
      headers: {
        "Cache-Control": NO_STORE,
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="snowmate-data-${day}.json"`,
      },
    });
  } catch {
    return new Response("Your data could not be exported. Try again shortly.", {
      status: 503,
      headers: { "Cache-Control": NO_STORE, "Content-Type": "text/plain; charset=utf-8" },
    });
  }
}
