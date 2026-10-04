import "server-only";

import { headers } from "next/headers";

/* The visitor's address as the hosting edge reports it. Vercel sets
   x-forwarded-for itself (a client cannot prepend to it there), so the
   first entry is the visitor. Used only as a rate-limit key, never for
   access decisions. */
export async function getRequestIp(): Promise<string> {
  try {
    const list = await headers();
    const forwarded = list.get("x-forwarded-for")?.split(",")[0]?.trim();
    return forwarded || list.get("x-real-ip")?.trim() || "unknown";
  } catch {
    return "unknown";
  }
}
