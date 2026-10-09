import Link from "next/link";
import { LEGAL_DOCUMENTS } from "./legal-content";

export default function LegalOverview() {
  return (
    <section className="pb-16" aria-labelledby="legal-overview-title">
      <header className="border-b-2 pb-8" style={{ borderColor: "var(--ink-0)" }}>
        <p className="text-mono-label" style={{ color: "var(--rust)" }}>
          Pistl Closed Beta
        </p>
        <h1
          id="legal-overview-title"
          className="text-display-md mt-3 text-balance sm:text-[36px]"
        >
          Rechtliches &amp; Sicherheit
        </h1>
        <p
          className="mt-4 max-w-2xl text-base leading-relaxed"
          style={{ color: "var(--ink-1)" }}
        >
          Transparenz für die geplante einladungsbasierte Beta ab 16 Jahre in
          Deutschland und Österreich. Alle Dokumente sind technische Entwürfe
          und vor Veröffentlichung rechtlich freizugeben.
        </p>
      </header>

      <div className="mt-8 divide-y-2" style={{ borderColor: "var(--ink-0)" }}>
        {LEGAL_DOCUMENTS.map((document) => (
          <article
            key={document.id}
            className="grid gap-4 border-b-2 py-6 sm:grid-cols-[1fr_auto] sm:items-end"
            style={{ borderColor: "var(--ink-0)" }}
          >
            <div>
              <p className="text-mono-label" style={{ color: "var(--rust)" }}>
                Entwurf · {document.version}
              </p>
              <h2 className="mt-2 text-xl font-bold">{document.title}</h2>
              <p
                className="mt-2 max-w-2xl text-sm leading-6"
                style={{ color: "var(--ink-1)" }}
              >
                {document.summary}
              </p>
            </div>
            <Link
              href={document.path}
              className="inline-flex min-h-11 items-center justify-center border-2 px-4 text-sm font-bold sm:min-w-28"
              style={{
                borderColor: "var(--ink-0)",
                boxShadow: "var(--shadow-print)",
              }}
            >
              Öffnen
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}
