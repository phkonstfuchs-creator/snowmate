"use client";

import { useT } from "@/lib/i18n/client";
import type { ResortPhoto } from "./resort-photo";

/* The attribution the licence asks for: author, licence with link,
   source with link, and that the picture was cropped. */
export default function ResortPhotoCredit({ photo }: { photo: ResortPhoto }) {
  const t = useT();
  const link = "underline underline-offset-2";
  return (
    <p className="mx-5 mt-1.5 text-[0.65rem] leading-snug" style={{ color: "var(--ink-2)" }}>
      {t("photo.by", { author: photo.author })} ·{" "}
      {photo.licenseUrl ? (
        <a href={photo.licenseUrl} target="_blank" rel="noopener noreferrer license" className={link}>{photo.license}</a>
      ) : (
        photo.license
      )}{" "}
      ·{" "}
      <a href={photo.sourceUrl} target="_blank" rel="noopener noreferrer" className={link}>{t("photo.source")}</a>
      {" "}· {t("photo.cropped")}
    </p>
  );
}
