import LegalShell from "../../components/LegalShell";
import {
  contactEmail, contactPhone, operatorCountry, operatorName,
  operatorPostalCity, operatorStreet,
} from "../../lib/site";

export const metadata = { title: "Impressum", robots: { index: false, follow: false } };

export default function Imprint() {
  return <LegalShell title="Impressum">
    <h2>Angaben gemäß § 5 DDG</h2>
    <p>{operatorName}<br/>Einzelunternehmen</p>
    <address>{operatorStreet}<br/>{operatorPostalCity}<br/>{operatorCountry}</address>

    <h2>Kontakt</h2>
    <p>Telefon: <a href="tel:+4915116477919">{contactPhone}</a><br/>
      E-Mail: <a href={`mailto:${contactEmail}`}>{contactEmail}</a></p>

    <h2>Verantwortlich für den Inhalt</h2>
    <p>{operatorName}, Anschrift wie oben.</p>

    <h2>Bild- und Designnachweise</h2>
    <p>Die Bergillustration und das Pistl-Zeichen wurden eigens für diese Website erstellt; die Bergillustration entstand mit KI-Unterstützung. Die Hintergrundfarben beruhen auf dem vom Betreiber bereitgestellten <a href="https://21st.dev/community/gradients/editor?from=85ea2692-591f-4b2b-928f-de88da3d1a88">Jade-Sky-Verlauf von 21st.dev</a>, der für Pistl angepasst wurde. Es werden keine Bilddateien von 21st.dev eingebunden.</p>
    <p>Die lokal eingebundenen Schriften <a href="/licenses/hanken-grotesk.txt">Hanken Grotesk</a> und <a href="/licenses/space-mono.txt">Space Mono</a> stehen unter der SIL Open Font License 1.1. Für Menü- und Formularsymbole nutzen wir <a href="/licenses/lucide.txt">Lucide Icons</a> unter den dort aufgeführten Lizenzen.</p>
  </LegalShell>;
}
