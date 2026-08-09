"use client";

import { usePathname } from "next/navigation";

/* Der klickbare Prototyp unter /demo verwendet dieselben
   Komponenten wie die App. Ein fest verdrahtetes href="/people"
   wuerde einen Besucher aus dem Prototyp heraus in die geschuetzte
   Route werfen — und damit in den Login, hinter dem er nichts zu
   suchen hat. Der Hook leitet das Praefix aus der Adresse ab,
   statt es durch jede Komponente zu reichen. */
export function useBasePath(): string {
  const pathname = usePathname();
  return pathname === "/demo" || pathname.startsWith("/demo/") ? "/demo" : "";
}
