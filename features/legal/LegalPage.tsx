import Link from "next/link";
import type { ReactNode } from "react";

/* Shared frame for the imprint and the privacy policy: plain, readable,
   reachable without an account. */
export default function LegalPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main className="mx-auto min-h-dvh max-w-[680px] px-5 py-8" style={{ background: "var(--paper-0)", color: "var(--ink-0)" }}>
      <nav className="flex gap-4 text-sm font-semibold underline" style={{ color: "var(--ink-1)" }}>
        <Link href="/">Pistl</Link>
        <Link href="/impressum">Impressum</Link>
        <Link href="/datenschutz">Datenschutz</Link>
      </nav>
      <h1 className="text-display-lg mt-6">{title}</h1>
      <div className="legal-text mt-6">{children}</div>
    </main>
  );
}
