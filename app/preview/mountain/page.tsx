import type { Metadata } from "next";
import MountainPreview from "@/features/mountain-preview/MountainPreview";
import { I18nProvider } from "@/lib/i18n/client";

export const metadata: Metadata = {
  title: "Pistl · Dein Bergtag — Designvorschau",
  robots: { index: false, follow: false },
};

export default function MountainPreviewPage() {
  return <I18nProvider locale="de"><MountainPreview /></I18nProvider>;
}
