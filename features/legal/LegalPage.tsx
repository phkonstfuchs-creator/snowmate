import Link from "next/link";
import type { ReactNode } from "react";
import Wordmark from "@/components/ui/Wordmark";

/* Shared frame for the imprint and the privacy policy: plain, readable,
   reachable without an account. */
export default function LegalPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main className="mx-auto min-h-dvh max-w-[680px] px-5 py-8" style={{ background: "var(--paper-0)", color: "var(--ink-0)" }}>
      <nav className="flex flex-wrap items-center gap-x-4 text-sm font-semibold underline [&>a]:inline-flex [&>a]:min-h-11 [&>a]:min-w-11 [&>a]:items-center [&>a]:justify-center" style={{ color: "var(--ink-1)" }}>
        <Link href="/" className="no-underline"><Wordmark size={24} /></Link>
        <Link href="/impressum">Impressum</Link>
        <Link href="/datenschutz">Datenschutz</Link>
        <Link href="/lizenzen">Lizenzen</Link>
        <Link href="/nutzungsbedingungen">Nutzungsbedingungen</Link>
      </nav>
      <h1 className="text-display-lg mt-6">{title}</h1>
      <div className="legal-text mt-6">{children}</div>
    </main>
  );
}
