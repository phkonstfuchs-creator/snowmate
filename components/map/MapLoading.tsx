"use client";

import { useT } from "@/lib/i18n/client";

/** A stable, non-interactive status keeps map controls usable during loading. */
export default function MapLoading({ slow = false }: { slow?: boolean }) {
  const t = useT();
  return (
    <div role="status" className="pointer-events-none absolute left-3 right-3 top-[76px] rounded-2xl px-3 py-2 text-sm" style={{ background: "var(--paper-0)", color: "var(--ink-1)", boxShadow: "var(--shadow-card)" }}>
      {t(slow ? "map.loadingSlow" : "map.loading")}
    </div>
  );
}
