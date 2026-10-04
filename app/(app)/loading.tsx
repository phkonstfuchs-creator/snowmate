"use client";

import { useT } from "@/lib/i18n/client";

/* Shown the moment a tab is tapped, while the server loads its data.
   Without it the old screen stays frozen until everything has arrived. */
export default function Loading() {
  const t = useT();
  return (
    <div role="status" aria-busy="true" className="px-4 pt-4">
      <span className="sr-only">{t("common.oneMoment")}</span>
      <div className="skeleton h-7 w-32" />
      <div className="skeleton mt-2 h-3 w-48" />
      <div className="skeleton mt-4 h-11 w-full" />
      <div className="mt-5 space-y-3">
        {[0, 1, 2].map((row) => (
          <div key={row} className="skeleton h-28 w-full" />
        ))}
      </div>
    </div>
  );
}
