import Link from "next/link";
import type { Metadata } from "next";
import BottomNav from "@/components/BottomNav";

/* Clickable prototype outside the login. Shows the same screens as
   the app but runs on sample data. The banner stays visible at all
   times so nobody mistakes this for real user data. */

export const metadata: Metadata = {
  title: "Snowmate demo: clickable prototype",
  description:
    "Click through the Snowmate screens. Sample data, no real users, nothing is saved.",
  robots: { index: false },
};

export default function DemoLayout({ children }: { children: React.ReactNode }) {
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
        <span>Demo · sample data · nothing is saved</span>
        <Link href="/" className="underline whitespace-nowrap">
          Back
        </Link>
      </div>
      <main className="page-content">{children}</main>
      <BottomNav basePath="/demo" />
    </div>
  );
}
