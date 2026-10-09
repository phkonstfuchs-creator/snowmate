import Link from "next/link";
import LaunchBlockerNotice from "./LaunchBlockerNotice";
import type { LegalDocument, LegalLink } from "./legal-types";

interface LegalDocumentPageProps {
  document: LegalDocument;
}

function SourceLink({ link }: { link: LegalLink }) {
  if (link.href.startsWith("/")) {
    return (
      <Link className="underline underline-offset-4" href={link.href}>
        {link.label}
      </Link>
    );
  }

  return (
    <a
      className="underline underline-offset-4"
      href={link.href}
      target="_blank"
      rel="noreferrer"
    >
      {link.label}
    </a>
  );
}

export default function LegalDocumentPage({
  document,
}: LegalDocumentPageProps) {
  return (
    <article aria-labelledby="document-title" className="pb-16">
      <header className="border-b-2 pb-8" style={{ borderColor: "var(--ink-0)" }}>
        <p className="text-mono-label" style={{ color: "var(--rust)" }}>
          Entwurf · Version {document.version}
        </p>
        <h1
          id="document-title"
          className="mt-3 max-w-full break-words text-[23px] leading-none font-bold uppercase sm:text-[36px]"
          style={{
            fontFamily: "var(--font-display-stack)",
            letterSpacing: 0,
            overflowWrap: "anywhere",
          }}
        >
          {document.title}
        </h1>
        <p
          className="mt-4 max-w-2xl text-base leading-relaxed"
          style={{ color: "var(--ink-1)" }}
        >
          {document.summary}
        </p>
        <p className="mt-4 text-xs font-semibold uppercase">
          Vorgesehener Gültigkeitsbeginn: {document.effectiveDate}
        </p>
      </header>

      <LaunchBlockerNotice blockers={document.launchBlockers} />

      <div className="mt-10 space-y-10">
        {document.sections.map((section) => (
          <section key={section.id} aria-labelledby={`${section.id}-title`}>
            <h2
              id={`${section.id}-title`}
              className="text-xl font-bold leading-tight"
            >
              {section.title}
            </h2>

            {section.paragraphs?.map((paragraph) => (
              <p
                key={paragraph}
                className="mt-3 max-w-3xl text-[15px] leading-7"
                style={{ color: "var(--ink-1)" }}
              >
                {paragraph}
              </p>
            ))}

            {section.bullets ? (
              <ul className="mt-4 max-w-3xl space-y-3 pl-5 text-[15px] leading-7">
                {section.bullets.map((bullet) => (
                  <li key={bullet} className="list-square pl-1">
                    {bullet}
                  </li>
                ))}
              </ul>
            ) : null}

            {section.callout ? (
              <p
                className="mt-5 border-l-4 px-4 py-3 text-sm font-semibold leading-6"
                style={{
                  borderColor: "var(--ochre)",
                  background: "var(--paper-1)",
                }}
              >
                {section.callout}
              </p>
            ) : null}

            {section.links ? (
              <div className="mt-4 flex flex-col items-start gap-2 text-sm">
                {section.links.map((link) => (
                  <SourceLink key={link.href} link={link} />
                ))}
              </div>
            ) : null}
          </section>
        ))}
      </div>
    </article>
  );
}
