import LegalShell from "../../components/LegalShell";
import { contactEmail, operatorName, operatorAddress } from "../../lib/site";

export const metadata = { title: "Impressum", robots: { index: false, follow: false } };
export default function Imprint() {
  const complete = contactEmail && operatorName && operatorAddress;
  return <LegalShell title="Impressum">
    {!complete && <p className="draft-note">Entwurf: Die vollständige Anbieterkennzeichnung und Kontaktadresse werden vor dem öffentlichen Start ergänzt. Diese Seite ist noch nicht veröffentlichungsfertig.</p>}
    <h2>Anbieter der Website</h2><p>{operatorName || "Betreiberangaben noch offen."}</p><address>{operatorAddress || "Anschrift noch offen."}</address>
    <h2>Kontakt</h2>{contactEmail ? <p><a href={`mailto:${contactEmail}`}>{contactEmail}</a></p> : <p>Die öffentliche Kontakt-E-Mail wird noch ergänzt.</p>}
    <h2>Über das Projekt</h2><p>Pistl wird von Philipp Fuchs entwickelt. Die App befindet sich in Entwicklung und richtet sich an Skifahrer und Snowboarder rund um Innsbruck und Salzburg.</p>
    <h2>Darstellungen auf dieser Website</h2><p>Die gezeigten App-Ansichten enthalten Beispieldaten und zeigen einen möglichen Entwicklungsstand. Funktionen und Gestaltung können sich bis zum Start ändern. Die Bergillustration wurde für diese Website mit KI-Unterstützung erstellt.</p>
  </LegalShell>;
}
