import type { Metadata } from "next";
import LegalPage from "@/features/legal/LegalPage";
import { OPERATOR } from "@/features/legal/operator";

export const metadata: Metadata = { title: "Datenschutz · Pistl" };

export default function DatenschutzPage() {
  return (
    <LegalPage title="Datenschutzerklärung">
      <p lang="en">
        <em>
          Privacy policy under the GDPR. In short: Pistl stores only what the app needs, shows your data only to the
          people the rules allow, uses no tracking or advertising, and you can download or delete everything in your
          profile at any time.
        </em>
      </p>
      <p>Stand: {OPERATOR.updated}</p>

      <h2>1. Verantwortlicher</h2>
      <p>
        {OPERATOR.name}, {OPERATOR.street}, {OPERATOR.city}, {OPERATOR.country}
        <br />
        E-Mail: <a href={`mailto:${OPERATOR.email}`}>{OPERATOR.email}</a>
      </p>

      <h2>2. Was Pistl ist</h2>
      <p>
        Pistl hilft Ski- und Snowboard-Crews rund um Innsbruck und Salzburg, gemeinsame Skitage zu planen: Rides,
        Mitfahrgelegenheiten, Freunde, Chat und, wenn du es einschaltest, der Live-Standort oder Lift-Treffpunkt für Freunde. Pistl ist
        für Personen ab 14 Jahren.
      </p>

      <h2>3. Welche Daten wir verarbeiten und warum</h2>
      <h3>Konto</h3>
      <p>
        E-Mail-Adresse und Passwort (nur als sicherer Hash gespeichert), optional eine Zwei-Faktor-App. Zweck:
        Anmeldung und Schutz deines Kontos. Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO (Vertrag).
      </p>
      <h3>Profil</h3>
      <p>
        Name, Handle, Region, Fahrstile, Bio und Geburtsdatum. Das Geburtsdatum siehst nur du; wir nutzen es, um das
        Mindestalter zu prüfen und für Minderjährige strengere Sichtbarkeitsregeln anzuwenden. Rechtsgrundlage: Art. 6
        Abs. 1 lit. b DSGVO.
      </p>
      <h3>Profilbild</h3>
      <p>
        Freiwillig. Dein Handy verkleinert das Bild vor dem Hochladen und entfernt dabei Ort und Kameradaten. Du legst
        fest, wer es sieht: nur Freunde, oder zusätzlich Freunde von Freunden und Leute aus deinen Rides. Unter 18
        sehen es immer nur bestätigte Freunde. Gespeichert wird es bei Supabase in Frankfurt, bis du es entfernst oder
        dein Konto löschst. Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO.
      </p>
      <h3>Skitag-Posts</h3>
      <p>
        Freiwillig: kurzer Text, optional ein Foto und ein Skigebiet. Sehen können sie nur du und deine bestätigten
        Freunde, egal wie alt du bist. Dein Handy verkleinert das Foto vor dem Hochladen und entfernt dabei Ort und
        Kameradaten. Gespeichert wird alles bei Supabase in Frankfurt, bis du den Post oder dein Konto löschst.
        Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO.
      </p>
      <h3>Rides, Mitfahrgelegenheiten, Freundschaften, Chat</h3>
      <p>
        Was du anlegst oder schreibst, und mit wem du befreundet bist. Sichtbar ist es nur für die Personen, die die
        Regeln der App vorsehen (zum Beispiel bestätigte Freunde oder Mitglieder eines Rides). Chatnachrichten sind
        nicht Ende-zu-Ende verschlüsselt. Ab 16 kannst du im Chat deinen genauen Standort schicken; ihn sehen nur
        die Mitglieder dieses Chats, und nach 24 Stunden löschen wir die Koordinaten. Rechtsgrundlage: Art. 6 Abs. 1
        lit. b DSGVO.
      </p>
      <h3>Live-Standort</h3>
      <p>
        Ab 16 Jahren und nur, wenn du ihn ausdrücklich einschaltest, für 1, 4 oder 12 Stunden. Gespeichert wird nur die letzte Position,
        auf etwa 10 m gerundet, ohne Verlauf; sie ist nur für bestätigte Freunde sichtbar und wird beim Beenden, nach
        Ablauf der Zeit, beim Blockieren oder Entfreunden sofort unsichtbar. Rechtsgrundlage: deine Einwilligung,
        Art. 6 Abs. 1 lit. a DSGVO, die du jederzeit mit „Stopp“ widerrufen kannst.
      </p>
      <h3>Lift-Treffpunkt</h3>
      <p>
        Ab 16 kannst du freiwillig mitteilen, welchen Lift du gerade nimmst. Wir speichern den Lift und die Zeiten
        für Beginn, geschätzte Ankunft und Ablauf, keine GPS-Spur. Nur du und bestätigte Freunde sehen den Status;
        Blockieren und Entfreunden beenden die Sichtbarkeit sofort. Mit „Stopp“ beendest du ihn jederzeit, spätestens
        nach 30 Minuten läuft er automatisch ab und ist nicht mehr sichtbar. Abgelaufene Daten werden beim nächsten
        Statusabruf oder -start entfernt, spätestens mit der Kontolöschung. Die Ankunft und die Wartezeit sind Schätzungen aus statischen
        Liftdaten und einer einfachen Heuristik, keine gemessenen Wartezeiten. Wenn dein eigener Standort auf deinem
        Gerät bekannt ist, berechnet es dort einen Liftvorschlag für dich; deine Position wird dafür nicht an unseren
        Server oder Dritte gesendet. Rechtsgrundlage: deine Einwilligung, Art. 6 Abs. 1 lit. a DSGVO.
      </p>
      <h3>Skitag-Tracking</h3>
      <p>
        Nur wenn du auf der Karte einen Skitag startest. Dein Handy zeichnet dann deine GPS-Position auf und
        berechnet daraus Strecke, Höhenmeter, Topspeed und Abfahrten. Die GPS-Spur bleibt auf deinem Gerät (im
        Speicher dieses Browsers) und wird beim Beenden gelöscht. Wenn du den Tag speicherst, übertragen wir nur diese
        Zusammenfassung mit Datum, Uhrzeit und Skigebiet; sie siehst nur du. Gespeichert bei Supabase in Frankfurt,
        bis du den Tag oder dein Konto löschst. Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO.
      </p>
      <h3>Leute kennenlernen (Swipen)</h3>
      <p>
        Nur wenn du es einschaltest und dein Geburtsdatum hinterlegt ist. Dann zeigen wir dich anderen, die
        ebenfalls mitmachen: Name, Profilbild (nach deiner Bild-Einstellung), Fahrstile, Bio und die Zahl gemeinsamer
        Freunde. Erwachsene sehen nur Erwachsene aus ihrer Region. Unter 18 siehst und triffst du nur Freunde deiner
        Freunde aus deiner Altersgruppe (14–15 oder 16–17). Ob du jemanden magst oder überspringst, sieht niemand;
        mögt ihr euch gegenseitig, werdet ihr Freunde. Wir speichern deine Entscheidungen, damit niemand doppelt
        erscheint, bis du dein Konto löschst. Rechtsgrundlage: deine Einwilligung, Art. 6 Abs. 1 lit. a DSGVO, die du
        jederzeit mit dem Schalter widerrufen kannst.
      </p>
      <h3>Ranglisten und Abzeichen</h3>
      <p>
        Aus deinen gespeicherten Skitagen berechnen wir Saisonwerte (Höhenmeter, Kilometer, Tage, Topspeed). Deine
        bestätigten Freunde sehen sie in ihrer Rangliste, solange du das in den Einstellungen nicht ausschaltest.
        In der Regions-Rangliste erscheinst du nur, wenn du sie selbst einschaltest. Dann sehen alle aus deiner
        Region auf Pistl deinen Namen und deine Saisonwerte. Unter 18 erscheinst du dort immer anonym, ohne Namen
        und Bild. Einzelne Tage oder Uhrzeiten sieht niemand. Abzeichen berechnet nur dein Gerät; sie siehst nur du.
        Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO, für die Regions-Rangliste deine Einwilligung (Art. 6 Abs. 1
        lit. a DSGVO), die du jederzeit in den Einstellungen widerrufen kannst.
      </p>
      <h3>Push-Benachrichtigungen</h3>
      <p>
        Nur wenn du sie in den Einstellungen einschaltest, und nur für das Gerät, auf dem du das tust. Dann speichern
        wir die Push-Adresse, die dein Browser dafür erzeugt, und schicken über den Push-Dienst deines Browsers
        (Apple, Google, Mozilla oder Microsoft) kurze Hinweise: wer dir geschrieben, dich als Freund angefragt oder
        deinen Ride betreffend etwas getan hat. Der Inhalt ist Ende-zu-Ende verschlüsselt, sodass der Push-Dienst ihn
        nicht lesen kann, und enthält nie den Text einer Nachricht. Der Push-Dienst sieht nur, dass und wann eine
        Benachrichtigung an dein Gerät geht. Ausschalten kannst du sie jederzeit in Pistl oder in den
        Geräte-Einstellungen; wir löschen die Push-Adresse dann bzw. sobald der Push-Dienst sie für ungültig erklärt.
        Rechtsgrundlage: deine Einwilligung, Art. 6 Abs. 1 lit. a DSGVO und § 25 Abs. 1 TDDDG.
      </p>
      <h3>Meldungen und Blockierungen</h3>
      <p>
        Wenn du jemanden meldest oder blockierst, speichern wir das, um Missbrauch zu verhindern und Meldungen zu
        prüfen. Rechtsgrundlage: Art. 6 Abs. 1 lit. f DSGVO (Schutz der Nutzerinnen und Nutzer).
      </p>
      <h3>Sicherheit und Technik</h3>
      <p>
        Beim Aufruf verarbeiten unsere Dienstleister technisch notwendige Daten wie IP-Adresse, Zeitpunkt und
        aufgerufene Adresse (Server-Logs). Für die Begrenzung von Anmeldeversuchen merken wir uns IP-Adressen kurz im
        Arbeitsspeicher, für die Begrenzung von Schreibzugriffen den Zeitpunkt deiner Anfragen für zwei Minuten.
        Rechtsgrundlage: Art. 6 Abs. 1 lit. f DSGVO (Sicherheit und Missbrauchsschutz).
      </p>

      <h2>4. Cookies und Speicher im Browser</h2>
      <p>
        Pistl setzt nur technisch notwendige Cookies: die Anmeldesitzung, die gewählte Sprache und, während einer
        Registrierung, für höchstens eine Stunde die E-Mail-Adresse, an die der Bestätigungscode ging. Im Browser
        werden außerdem Antworten aus der Registrierung und ein offener Einladungslink zwischengespeichert. Es gibt
        keine Analyse-, Werbe- oder Tracking-Cookies. Rechtsgrundlage: § 25 Abs. 2 Nr. 2 TDDDG.
      </p>

      <h2>5. Dienstleister (Auftragsverarbeiter)</h2>
      <ul>
        <li>
          <strong>Supabase</strong> (Supabase Inc., USA): Datenbank und Anmeldung. Die Daten liegen in einem
          Rechenzentrum in Frankfurt am Main.
        </li>
        <li>
          <strong>Vercel</strong> (Vercel Inc., USA): Hosting der App. Die Server-Funktionen laufen in Frankfurt;
          Seiten können über weltweite Server ausgeliefert werden.
        </li>
        <li>
          <strong>Resend</strong> (USA): Versand der Bestätigungs- und Sicherheits-E-Mails, Versand über Server in
          Irland.
        </li>
        <li>
          <strong>OpenFreeMap</strong> und ersatzweise <strong>CARTO</strong>: Kartenkacheln. Dein Browser lädt sie
          direkt; die Anbieter sehen dabei deine IP-Adresse und den angezeigten Kartenausschnitt, aber nicht deine
          gespeicherte Position und nicht, wer seinen Standort teilt.
        </li>
        <li>
          <strong>OpenSnowMap</strong> (Pisten und Lifte) und <strong>Amazon Web Services</strong> (offene
          Höhendaten für die Geländeschattierung): ebenfalls Kartenkacheln, die dein Browser direkt lädt, mit
          denselben Daten wie oben.
        </li>
        <li>
          <strong>Open-Meteo</strong>: Schnee- und Wetterdaten der Skigebiete. Die fragt der Pistl-Server ab; dabei
          werden keine Daten über dich übertragen.
        </li>
        <li>
          <strong>Wikipedia / Wikimedia Commons</strong>: Fotos der Skigebiete. Der Pistl-Server lädt sie und liefert
          sie selbst aus; dein Browser hat keinen Kontakt zu Wikimedia.
        </li>
      </ul>
      <p>
        Soweit dabei Daten in die USA gelangen, geschieht das auf Grundlage des EU-US Data Privacy Framework oder von
        EU-Standardvertragsklauseln (Art. 45, 46 DSGVO). Schriften und alle anderen Dateien der App werden von Pistl
        selbst ausgeliefert, nicht von Drittanbietern.
      </p>

      <h2>6. Wie lange wir Daten speichern</h2>
      <ul>
        <li>Konto, Profil, Rides, Freundschaften und Chatnachrichten: bis du dein Konto löschst.</li>
        <li>Live-Standort: höchstens bis zum Ende der gewählten Zeit (maximal 12 Stunden).</li>
        <li>Lift-Treffpunkt: höchstens 30 Minuten sichtbar, jederzeit vorher beendbar; abgelaufene Daten werden beim nächsten Statusabruf oder -start gelöscht.</li>
        <li>Standort, den du im Chat schickst: 24 Stunden, danach löschen wir die Koordinaten.</li>
        <li>Anfragezähler zum Missbrauchsschutz: zwei Minuten.</li>
        <li>Meldungen: so lange, wie es für ihre Prüfung und den Schutz anderer nötig ist.</li>
      </ul>

      <h2>7. Deine Rechte</h2>
      <p>
        Du hast das Recht auf Auskunft (Art. 15), Berichtigung (Art. 16), Löschung (Art. 17), Einschränkung (Art. 18),
        Datenübertragbarkeit (Art. 20) und Widerspruch (Art. 21 DSGVO) sowie das Recht, eine Einwilligung jederzeit zu
        widerrufen. In der App kannst du unter <strong>Profil → Deine Daten</strong> alle gespeicherten Daten
        herunterladen und dein Konto selbst löschen; alles andere per E-Mail an{" "}
        <a href={`mailto:${OPERATOR.email}`}>{OPERATOR.email}</a>.
      </p>
      <p>
        Du kannst dich bei einer Datenschutz-Aufsichtsbehörde beschweren, zum Beispiel bei der für uns zuständigen:{" "}
        {OPERATOR.authority.name}, {OPERATOR.authority.address},{" "}
        <a href={OPERATOR.authority.url}>{OPERATOR.authority.url.replace("https://", "")}</a>.
      </p>

      <h2>8. Minderjährige</h2>
      <p>
        Pistl ist ab 14 Jahren. Für Minderjährige gelten strengere Regeln: Ihre Rides und ihr Standort sind nur für
        bestätigte Freunde sichtbar. Den eigenen Standort teilen kann man erst ab 16; jüngere Nutzer sehen nur die
        Positionen ihrer Freunde. Auch einen eigenen Lift-Treffpunkt kann man erst ab 16 teilen. Das Alter ergibt sich
        aus dem Geburtsdatum, das du bei der Registrierung angibst.
      </p>

      <h2>9. Keine automatisierten Entscheidungen</h2>
      <p>Pistl trifft keine automatisierten Entscheidungen im Sinne von Art. 22 DSGVO und erstellt keine Werbeprofile.</p>
    </LegalPage>
  );
}
