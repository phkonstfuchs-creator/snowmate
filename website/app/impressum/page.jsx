import LegalShell from "../../components/LegalShell";
import { contactEmail, operatorAddress, operatorBusiness, operatorName } from "../../lib/site";

export const metadata = { title: "Impressum", alternates: { canonical: "/impressum" } };

export default function Imprint() {
  return <LegalShell title="Impressum">
    <h2>Angaben gemäß § 5 DDG</h2>
    <p>{operatorName}<br />{operatorBusiness}</p>
    <address>{operatorAddress}</address>
    <h2>Kontakt</h2>
    <p>E-Mail: <a href={`mailto:${contactEmail}`}>{contactEmail}</a></p>
    <h2>Verantwortlich für den Inhalt gemäß § 18 Abs. 2 MStV</h2>
    <p>{operatorName}, {operatorAddress}</p>
    <h2>Verbraucherstreitbeilegung</h2>
    <p>Wir sind nicht bereit und nicht verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.</p>
    <h2>Über das Projekt</h2>
    <p>Pistl wird von {operatorName} entwickelt. Die App befindet sich in Entwicklung und richtet sich an Skifahrer und Snowboarder rund um Innsbruck und Salzburg.</p>
    <h2>Darstellungen auf dieser Website</h2>
    <p>Die gezeigten App-Ansichten enthalten Beispieldaten und zeigen einen möglichen Entwicklungsstand. Funktionen und Gestaltung können sich bis zum Start ändern. Die Bergillustration wurde für diese Website mit KI-Unterstützung erstellt.</p>
  </LegalShell>;
}
