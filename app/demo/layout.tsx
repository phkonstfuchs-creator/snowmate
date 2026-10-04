import Link from "next/link";
import type { Metadata } from "next";
import BottomNav from "@/components/BottomNav";
import { getT } from "@/lib/i18n/server";

/* Clickable prototype outside the login. Shows the same screens as
   the app but runs on sample data. The banner stays visible at all
   times so nobody mistakes this for real user data. */

export const metadata: Metadata = {
  title: "Pistl demo: clickable prototype",
  description:
    "Click through the Pistl screens. Sample data, no real users, nothing is saved.",
  robots: { index: false },
};

export default async function DemoLayout({ children }: { children: React.ReactNode }) {
  const t = await getT();
  return (
    <div className="app-shell">
      <div
        className="text-mono-label flex items-center justify-between gap-3 px-3 py-2"
        style={{
          background: "var(--ochre)",
          color: "var(--ink-0)",
          borderBottom: "var(--rule-thick)",
        }}
      >
        <span>{t("demo.banner")}</span>
        <Link href="/" className="-my-2 flex min-h-11 items-center whitespace-nowrap px-3 underline">
          {t("common.back")}
        </Link>
      </div>
      <main className="page-content">{children}</main>
      <BottomNav basePath="/demo" />
    </div>
  );
}
