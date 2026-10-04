import { type NextRequest, NextResponse } from "next/server";
import { getSiteUrl } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { safeNextPath } from "@/features/auth/safe-next";

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
  const siteUrl = getSiteUrl();
  const code = request.nextUrl.searchParams.get("code");
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type");
  /* Only known in-app paths; anything else (another site, "//evil") falls
     back to the feed, so the link cannot be used as an open redirect. */
  const next = safeNextPath(request.nextUrl.searchParams.get("next"));

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return noStoreRedirect(new URL(next, siteUrl));
    }
  }

  if (tokenHash && (type === "email" || type === "recovery")) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type,
    });

    if (!error) {
      return noStoreRedirect(new URL(type === "recovery" ? "/reset-password" : next, siteUrl));
    }
  }

  return noStoreRedirect(
    new URL("/login?confirmation=failed", siteUrl),
  );
}
