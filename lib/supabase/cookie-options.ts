import type { CookieOptions } from "@supabase/ssr";

/* Auth runs exclusively on the server. Browser scripts never need tokens. */
export function sessionCookieOptions(production: boolean): CookieOptions {
  return { httpOnly: true, secure: production, sameSite: "lax", path: "/" };
}
