import {
  createServerClient,
  type CookieOptions,
} from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getAuthRedirect } from "@/features/auth/route-access";
import { getSupabasePublicConfig } from "./config";
import { sessionCookieOptions } from "./cookie-options";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  let sessionCookies: Array<{
    name: string;
    value: string;
    options: CookieOptions;
  }> = [];
  let sessionHeaders: Record<string, string> = {};
  const { url, publishableKey } = getSupabasePublicConfig();

  const supabase = createServerClient(url, publishableKey, {
    cookieOptions: sessionCookieOptions(process.env.NODE_ENV === "production"),
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headersToSet) {
        sessionCookies = cookiesToSet;
        sessionHeaders = headersToSet;

        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });

        response = NextResponse.next({ request });

        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
        Object.entries(headersToSet).forEach(([name, value]) => {
          response.headers.set(name, value);
        });
      },
    },
  });

  let isAuthenticated = false;
  let needsSecondFactor = false;

  try {
    const { data, error } = await supabase.auth.getUser();
    isAuthenticated = !error && Boolean(data?.user?.email_confirmed_at);

    if (isAuthenticated) {
      const { data: aal, error: aalError } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (aalError || !aal) throw new Error("Assurance verification unavailable");
      needsSecondFactor = aal.nextLevel === "aal2" && aal.currentLevel !== "aal2";
    }
  } catch {
    // Fail closed when identity verification is unavailable.
    isAuthenticated = false;
  }

  const redirectPath = getAuthRedirect(
    request.nextUrl.pathname,
    isAuthenticated,
    needsSecondFactor,
  );

  if (redirectPath) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = redirectPath;
    redirectUrl.search = "";
    // Next's action client consumes this header. A Location redirect would
    // forward the action POST to /login and turn reauthentication into an error.
    const isServerAction = request.method === "POST" && request.headers.has("next-action");
    const redirectResponse = isServerAction
      ? new NextResponse(null, {
          status: 303,
          headers: { "x-action-redirect": `${redirectUrl};replace` },
        })
      : NextResponse.redirect(redirectUrl);

    sessionCookies.forEach(({ name, value, options }) => {
      redirectResponse.cookies.set(name, value, options);
    });
    Object.entries(sessionHeaders).forEach(([name, value]) => {
      redirectResponse.headers.set(name, value);
    });

    return redirectResponse;
  }

  return response;
}
