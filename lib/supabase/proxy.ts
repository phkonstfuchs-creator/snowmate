import {
  createServerClient,
  type CookieOptions,
} from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getAuthRedirect } from "@/features/auth/route-access";
import { getSupabasePublicConfig } from "./config";

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

  try {
    const { data } = await supabase.auth.getClaims();
    isAuthenticated = Boolean(data?.claims);
  } catch {
    // Fail closed when identity verification is unavailable.
  }

  const redirectPath = getAuthRedirect(
    request.nextUrl.pathname,
    isAuthenticated,
  );

  if (redirectPath) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = redirectPath;
    redirectUrl.search = "";
    const redirectResponse = NextResponse.redirect(redirectUrl);

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
