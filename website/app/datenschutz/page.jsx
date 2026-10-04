import LegalShell from "../../components/LegalShell";
import { contactEmail, operatorAddress, operatorName, supervisoryAuthority } from "../../lib/site";

export const metadata = { title: "Datenschutz", alternates: { canonical: "/datenschutz" } };

export default function Privacy() {
  return <LegalShell title="Datenschutz">
    <p>Stand: 5. Oktober 2026. Diese Erklärung gilt für die öffentliche Website von Pistl und ihre Warteliste. Für die App gibt es eigene Datenschutzinformationen in der App.</p>

    <h2>Wer ist verantwortlich?</h2>
    <p>{operatorName}</p>
    <address>{operatorAddress}</address>
    <p>E-Mail: <a href={`mailto:${contactEmail}`}>{contactEmail}</a></p>

    <h2>Warteliste und Early Access</h2>
    <p>Bei deiner Anmeldung speichern wir deine E-Mail-Adresse, ob du am Early Access interessiert bist, sowie Zeitpunkt und Version deiner Einwilligung. Wir verwenden diese Angaben ausschließlich, um dich über den Start von Pistl zu informieren und, wenn du es angekreuzt hast, zum Testen einzuladen. Rechtsgrundlage ist deine Einwilligung (Art. 6 Abs. 1 lit. a DSGVO).</p>
    <p>Early Access ist optional. Die Anmeldung erstellt kein Konto in der App und ist kein allgemeiner Newsletter. Du kannst deine Einwilligung jederzeit mit Wirkung für die Zukunft widerrufen, eine formlose E-Mail an die oben genannte Adresse genügt.</p>

    <h2>Speicherdauer</h2>
    <p>Wir löschen deine Anmeldung, sobald du widerrufst oder die Löschung verlangst, spätestens aber zwölf Monate nach dem öffentlichen Start der App. Technische Prüfwerte für das Anfragelimit werden nach spätestens 24 Stunden gelöscht.</p>

    <h2>Hosting und Speicherung</h2>
    <ul>
      <li><strong>Vercel</strong> (Vercel Inc., USA) betreibt die Website. Die serverseitige Verarbeitung der Warteliste läuft in Frankfurt am Main; Seiten können über weltweite Server ausgeliefert werden. Beim Aufruf verarbeitet Vercel technisch notwendige Verbindungsdaten wie IP-Adresse und Zeitpunkt (Art. 6 Abs. 1 lit. f DSGVO, sicherer Betrieb).</li>
      <li><strong>Supabase</strong> (Supabase Inc., USA) speichert die Warteliste in einem Rechenzentrum in Frankfurt am Main.</li>
    </ul>
    <p>Soweit dabei Daten in die USA gelangen, geschieht das auf Grundlage des EU-US Data Privacy Framework oder von EU-Standardvertragsklauseln (Art. 45, 46 DSGVO).</p>

    <h2>Schutz vor Missbrauch</h2>
    <p>Zum Schutz des Formulars bilden wir serverseitig einen pseudonymisierten Prüfwert aus deiner IP-Adresse und begrenzen damit die Zahl der Anmeldungen pro Stunde. Die rohe IP-Adresse wird nicht in der Warteliste gespeichert (Art. 6 Abs. 1 lit. f DSGVO).</p>

    <h2>Cookies und lokale Speicherung</h2>
    <p>Diese Website setzt keine Cookies, keine Analyse- oder Werbewerkzeuge und kein Besuchertracking. Schriftarten und Bilder werden von der Website selbst ausgeliefert. Formulareingaben werden nicht im Browser gespeichert.</p>

    <h2>Deine Rechte</h2>
    <p>Du hast das Recht auf Auskunft (Art. 15), Berichtigung (Art. 16), Löschung (Art. 17), Einschränkung (Art. 18), Datenübertragbarkeit (Art. 20) und Widerspruch (Art. 21 DSGVO) sowie das Recht, deine Einwilligung jederzeit zu widerrufen. Schreibe dafür an <a href={`mailto:${contactEmail}`}>{contactEmail}</a>.</p>
    <p>Du kannst dich bei einer Datenschutz-Aufsichtsbehörde beschweren, zum Beispiel bei der für uns zuständigen: {supervisoryAuthority.name}, {supervisoryAuthority.address}, <a href={supervisoryAuthority.url}>{supervisoryAuthority.url.replace("https://", "")}</a>.</p>

    <h2>Keine automatisierten Entscheidungen</h2>
    <p>Wir treffen keine automatisierten Entscheidungen im Sinne von Art. 22 DSGVO und erstellen keine Profile.</p>
  </LegalShell>;
}
