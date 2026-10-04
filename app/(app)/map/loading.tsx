"use client";

import { useT } from "@/lib/i18n/client";

export default function Loading() {
  const t = useT();
  return (
    <div role="status" aria-busy="true">
      <span className="sr-only">{t("common.oneMoment")}</span>
      <div className="px-4 pt-4 pb-3">
        <div className="skeleton h-7 w-24" />
        <div className="skeleton mt-2 h-3 w-48" />
        <div className="skeleton mt-4 h-11 w-full" />
      </div>
      <div className="ski-map-placeholder" style={{ height: "52dvh" }} />
    </div>
  );
}
