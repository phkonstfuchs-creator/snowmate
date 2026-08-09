"use client";

import { usePathname } from "next/navigation";

/* The clickable prototype under /demo reuses the same components
   as the app. A hardcoded href="/people" would throw a visitor out
   of the prototype into the protected route — and therefore into
   the login, where they have no business being. This hook derives
   the prefix from the URL instead of threading it through every
   component. */
export function useBasePath(): string {
  const pathname = usePathname();
  return pathname === "/demo" || pathname.startsWith("/demo/") ? "/demo" : "";
}
