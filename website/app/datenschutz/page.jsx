import LegalShell from "../../components/LegalShell";
import { contactEmail, operatorName, operatorAddress } from "../../lib/site";

export const metadata = { title: "Datenschutz", robots: { index: false, follow: false } };
export default function Privacy() {
  return <LegalShell title="Datenschutz">
    <p className="draft-note">Entwurf für die Website: Vor dem öffentlichen Start werden Verantwortlicher, Kontakt, eingesetzte Hosting-Regionen und konkrete Löschfristen abschließend ergänzt und geprüft.</p>
    <h2>Wer ist verantwortlich?</h2><p>{operatorName || "Die Angaben zum Verantwortlichen werden noch ergänzt."}</p>{operatorAddress && <address>{operatorAddress}</address>}{contactEmail && <p><a href={`mailto:${contactEmail}`}>{contactEmail}</a></p>}
    <h2>Warteliste und Early Access</h2><p>Bei deiner Anmeldung speichern wir deine E-Mail-Adresse, ob du am Early Access interessiert bist, sowie Zeitpunkt und Version deiner Einwilligung. Wir verwenden diese Angaben, um dich über den Start von Pistl zu informieren und gegebenenfalls zum Testen einzuladen. Grundlage ist deine ausdrückliche Einwilligung im Formular.</p>
    <p>Early Access ist optional. Die Anmeldung erstellt noch kein Konto in der App. Du kannst deine Einwilligung jederzeit mit Wirkung für die Zukunft widerrufen und die Löschung deiner Anmeldung verlangen.</p>
    <h2>Technischer Betrieb und Schutz vor Missbrauch</h2><p>Die Website ist für Hosting bei Vercel vorgesehen; die Warteliste verwendet Supabase als Speicher. Beim Aufruf können diese Anbieter technische Verbindungsdaten verarbeiten. Die konkreten Vertrags- und Regionseinstellungen werden vor dem Start dokumentiert.</p>
    <p>Zum Schutz des Formulars verwenden wir einen serverseitig pseudonymisierten Prüfwert deiner IP-Adresse für ein zeitlich begrenztes Anfragelimit. Die Wartelisten-Tabelle speichert keine rohe IP-Adresse. Technische Protokolle beim Hosting sind davon getrennt.</p>
    <h2>Cookies und lokale Speicherung</h2><p>Diese Website setzt keine Analyse- oder Werbe-Cookies und verwendet kein Besuchertracking. Schriftarten und Bilder werden von der Website selbst ausgeliefert. Formulareingaben werden nicht im Browser dauerhaft gespeichert.</p>
    <h2>Speicherung und Löschung</h2><p>Wartelistendaten sollen nur so lange gespeichert werden, wie sie für die angekündigten Startinformationen und Einladungen benötigt werden. Die verbindliche Aufbewahrungsfrist und der Löschablauf werden vor Aktivierung der öffentlichen Warteliste festgelegt. Technische Werte für die Anfragelimits, deren Zeitfenster älter als 24 Stunden ist, werden bei der nächsten angenommenen Anmeldung bereinigt.</p>
    <h2>Deine Anliegen</h2><p>Du kannst Auskunft, Berichtigung und Löschung deiner Daten sowie den Widerruf deiner Einwilligung anfragen. Du kannst dich außerdem an die zuständige Datenschutzaufsicht wenden.</p>{contactEmail ? <p>Schreibe dafür an <a href={`mailto:${contactEmail}`}>{contactEmail}</a>.</p> : <p>Die hierfür notwendige Kontaktadresse ist noch offen. Sie wird vor dem öffentlichen Start ergänzt.</p>}
    <h2>Website und App</h2><p>Diese Informationen betreffen die öffentliche Website und ihre Warteliste. Für die spätere Nutzung der App werden eigene, auf deren Funktionen abgestimmte Datenschutzinformationen bereitgestellt.</p>
  </LegalShell>;
}
