import Link from "next/link";
import type { ReactNode } from "react";
import { LEGAL_DOCUMENTS } from "./legal-content";

interface LegalShellProps {
  children: ReactNode;
}

export default function LegalShell({ children }: LegalShellProps) {
  return (
    <div className="min-h-dvh" style={{ background: "var(--ink-0)" }}>
      <div
        className="paper-grain mx-auto min-h-dvh w-full max-w-[920px]"
        style={{ background: "var(--paper-0)" }}
      >
        <a
          href="#legal-content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:border-2 focus:bg-[var(--paper-0)] focus:px-4 focus:py-3"
        >
          Zum Inhalt
        </a>
        <header className="border-b-2 px-5 py-5 sm:px-8" style={{ borderColor: "var(--ink-0)" }}>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <Link href="/onboarding" className="text-mono-label py-2">
              Pistl
            </Link>
            <Link href="/legal" className="text-sm font-bold underline underline-offset-4">
              Rechtliches
            </Link>
          </div>
          <nav aria-label="Rechtliche Dokumente" className="mt-4">
            <ul className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
              {LEGAL_DOCUMENTS.map((document) => (
                <li key={document.id}>
                  <Link
                    href={document.path}
                    className="inline-flex min-h-11 items-center underline decoration-transparent underline-offset-4 hover:decoration-current focus:decoration-current"
                  >
                    {document.navigationLabel}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </header>

        <main id="legal-content" className="px-5 pt-8 sm:px-8 sm:pt-12">
          {children}
        </main>

        <footer
          className="border-t-2 px-5 py-8 text-sm sm:px-8"
          style={{ borderColor: "var(--ink-0)" }}
        >
          <p className="font-semibold">Pistl · Closed-Beta-Vorbereitung</p>
          <p className="mt-2" style={{ color: "var(--ink-1)" }}>
            Keine externe Veröffentlichung, solange LAUNCH_BLOCKER offen sind.
          </p>
        </footer>
      </div>
    </div>
  );
}
