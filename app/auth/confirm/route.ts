import { type NextRequest, NextResponse } from "next/server";
import { getSupabasePublicConfig } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

function noStoreRedirect(url: URL) {
  const response = NextResponse.redirect(url);
  response.headers.set(
    "Cache-Control",
    "private, no-cache, no-store, must-revalidate, max-age=0",
  );
  response.headers.set("Expires", "0");
  response.headers.set("Pragma", "no-cache");
  return response;
}

export async function GET(request: NextRequest) {
  const { siteUrl } = getSupabasePublicConfig();
  const code = request.nextUrl.searchParams.get("code");
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return noStoreRedirect(new URL("/feed", siteUrl));
    }
  }

  if (tokenHash && type === "email") {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: "email",
    });

    if (!error) {
      return noStoreRedirect(new URL("/feed", siteUrl));
    }
  }

  return noStoreRedirect(
    new URL("/login?confirmation=failed", siteUrl),
  );
}
