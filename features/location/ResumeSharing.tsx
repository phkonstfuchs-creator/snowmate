"use client";

import { useEffect } from "react";
import { useT } from "@/lib/i18n/client";
import { resumeBackgroundSharing } from "./background-sharing";

/* Store apps: after a restart, sharing that is still running carries on
   in the background, whichever tab opens first. Renders nothing. */
export default function ResumeSharing() {
  const t = useT();
  useEffect(() => {
    resumeBackgroundSharing({ title: t("loc.backgroundTitle"), message: t("loc.backgroundMessage") });
  }, [t]);
  return null;
}
