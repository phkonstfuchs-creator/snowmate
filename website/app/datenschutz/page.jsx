import LegalShell from "../../components/LegalShell";
import {
  contactEmail, operatorCountry, operatorName, operatorPostalCity, operatorStreet,
} from "../../lib/site";

export const metadata = { title: "Datenschutz", robots: { index: false, follow: false } };
export default function Privacy() {
  return <LegalShell title="Datenschutz">
    <p>Diese Hinweise gelten für pistl.app und die Anmeldung zur Pistl-Warteliste. Stand: Oktober 2026.</p>

    <h2>Verantwortlicher</h2>
    <p>{operatorName}, Einzelunternehmen</p>
    <address>{operatorStreet}<br/>{operatorPostalCity}<br/>{operatorCountry}</address>
    <p>E-Mail: <a href={`mailto:${contactEmail}`}>{contactEmail}</a></p>

    <h2>Aufruf der Website</h2>
    <p>Beim Aufruf übermittelt dein Browser technische Daten, insbesondere IP-Adresse, aufgerufene Seite, Zeitpunkt sowie Browser- und Geräteinformationen. Unser Hostinganbieter Vercel verarbeitet diese Daten, um die Website auszuliefern, Fehler zu erkennen und Angriffe abzuwehren. Rechtsgrundlage ist unser berechtigtes Interesse an einem sicheren und funktionierenden Webangebot (Art. 6 Abs. 1 lit. f DSGVO).</p>

    <h2>Warteliste und Early Access</h2>
    <p>Wenn du dich anmeldest, speichern wir deine E-Mail-Adresse, deine optionale Auswahl für Early Access, den Zeitpunkt der Einwilligung und deren Version. Wir verwenden die Daten nur für Informationen zum Pistl-Start und, bei gewähltem Early Access, für mögliche Testeinladungen. Rechtsgrundlage ist deine Einwilligung (Art. 6 Abs. 1 lit. a DSGVO). Die E-Mail-Adresse ist für die Anmeldung nötig; Early Access ist freiwillig. Deine Anmeldung erstellt kein App-Konto und garantiert keine Einladung.</p>
    <p>Du kannst die Einwilligung jederzeit mit Wirkung für die Zukunft per E-Mail an <a href={`mailto:${contactEmail}`}>{contactEmail}</a> widerrufen. Wir löschen deine Wartelistenangaben dann, soweit keine gesetzliche Pflicht entgegensteht. Ohne Widerruf speichern wir sie bis zum Abschluss der Startinformationen und Testeinladungen und löschen sie danach.</p>

    <h2>Schutz des Formulars</h2>
    <p>Um automatisierte Anmeldungen zu begrenzen, bildet der Server aus der beim Hosting übermittelten IP-Adresse einen geheimnisbasierten Prüfwert. In einer separaten Tabelle speichern wir diesen Wert, den Beginn eines einstündigen Zeitfensters und die Zahl der Versuche. Die Wartelistentabelle enthält keine rohe IP-Adresse. Der Prüfwert dient ausschließlich der Missbrauchsabwehr (Art. 6 Abs. 1 lit. f DSGVO); Einträge mit einem Zeitfenster älter als 24 Stunden werden bei weiteren angenommenen Anmeldungen bereinigt.</p>

    <h2>Dienstleister und Übermittlungen</h2>
    <p>Die Website läuft bei <a href="https://vercel.com/legal/privacy-notice">Vercel</a>. Wartelistenangaben werden über unseren Server an <a href="https://supabase.com/privacy">Supabase</a> als Datenbankanbieter übertragen. Eine Verarbeitung durch diese Dienstleister oder ihre Unterauftragnehmer außerhalb des Europäischen Wirtschaftsraums ist möglich. Für solche Übermittlungen sehen ihre Vertragsunterlagen EU-Standardvertragsklauseln vor. Informationen dazu findest du in den <a href="https://vercel.com/legal/dpa">Datenschutzbedingungen von Vercel</a> und im <a href="https://supabase.com/legal/customer-resources/data-processing-addendum">Datenverarbeitungszusatz von Supabase</a>.</p>

    <h2>Cookies und Tracking</h2>
    <p>Diese Website verwendet keine Analyse- oder Werbe-Cookies und kein Besuchertracking. Schriften und Bilder werden von der Website selbst geladen. Formulareingaben speichern wir nicht dauerhaft in deinem Browser.</p>

    <h2>Deine Rechte</h2>
    <p>Du kannst Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung und Datenübertragbarkeit verlangen sowie einer Verarbeitung auf Grundlage berechtigter Interessen widersprechen. Eine erteilte Einwilligung kannst du jederzeit widerrufen. Schreibe an <a href={`mailto:${contactEmail}`}>{contactEmail}</a>. Es findet keine automatisierte Entscheidung über dich statt.</p>
    <p>Du kannst dich bei einer Datenschutzaufsichtsbehörde beschweren. Für uns ist das <a href="https://www.datenschutz.saarland.de/">Unabhängige Datenschutzzentrum Saarland</a>, Fritz-Dobisch-Straße 12, 66111 Saarbrücken.</p>

    <h2>Website und App</h2>
    <p>Die spätere Pistl-App erhält eigene Datenschutzinformationen für ihre Funktionen. Diese Seite beschreibt die öffentliche Website und die Warteliste.</p>
  </LegalShell>;
}
