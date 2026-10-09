import { launchBlocker } from "../launch-blockers";
import type { LegalDocument } from "../legal-types";
import { PRIVACY_VERSION } from "../versions";

export const privacyDocument: LegalDocument = {
  id: "privacy",
  path: "/legal/datenschutz",
  navigationLabel: "Datenschutz",
  title: "Datenschutzerklärung",
  summary:
    "Hier erklären wir verständlich, welche Daten Pistl für die geschlossene Beta verarbeitet, warum das geschieht und welche Rechte du hast.",
  status: "draft",
  version: PRIVACY_VERSION,
  effectiveDate: launchBlocker("DOCUMENT_EFFECTIVE_DATE"),
  launchBlockers: [
    "LEGAL_REVIEW_APPROVAL",
    "OPERATOR_LEGAL_NAME",
    "OPERATOR_POSTAL_ADDRESS",
    "PRIVACY_CONTACT_EMAIL",
    "DPO_REQUIREMENT_AND_CONTACT",
    "COMPETENT_SUPERVISORY_AUTHORITY",
    "DOCUMENT_EFFECTIVE_DATE",
    "LOCATION_LEGAL_BASIS_AND_DPIA",
    "PROCESSOR_CONTRACTS_AND_TRANSFERS",
    "RETENTION_TECHNICAL_ENFORCEMENT",
    "MINOR_CONTRACT_REVIEW",
  ],
  sections: [
    {
      id: "short-version",
      title: "Das Wichtigste kurz erklärt",
      paragraphs: [
        "Pistl ist für Personen ab 16 Jahre in Deutschland und Österreich gedacht. Wir verkaufen keine personenbezogenen Daten und schalten in der Closed Beta keine Werbung.",
        "Dein Konto, dein Profil, deine Crew, Fahrten und Nachrichten brauchen Daten, damit die App funktioniert. Präzise Standortdaten sollen nur nach deinem bewussten Start, nur für kurze Zeit und nur für den freigegebenen Personenkreis verarbeitet werden. Eine manuelle Resort-Auswahl bleibt möglich.",
        "Analyse mit PostHog darf erst geladen werden, nachdem du freiwillig zugestimmt hast. Du kannst diese Zustimmung jederzeit mit Wirkung für die Zukunft widerrufen.",
      ],
      callout:
        "Diese Fassung ist eine technische Vorlage und keine rechtliche Freigabe. Vor der Beta müssen alle oben genannten Launch-Blocker entfernt und die Aussagen gegen die tatsächliche Implementierung geprüft werden.",
    },
    {
      id: "controller",
      title: "1. Verantwortlicher und Kontakt",
      paragraphs: [
        `Verantwortlicher im Sinne der DSGVO: ${launchBlocker("OPERATOR_LEGAL_NAME")}, Einzelunternehmen, ${launchBlocker("OPERATOR_POSTAL_ADDRESS")}.`,
        `Datenschutzanfragen: ${launchBlocker("PRIVACY_CONTACT_EMAIL")}.`,
        `Ob ein Datenschutzbeauftragter zu benennen ist und welche Kontaktdaten dann zu veröffentlichen sind, wird vor Launch dokumentiert: ${launchBlocker("DPO_REQUIREMENT_AND_CONTACT")}.`,
        `Diese Erklärung darf erst mit dokumentierter Freigabe veröffentlicht werden: ${launchBlocker("LEGAL_REVIEW_APPROVAL")}.`,
      ],
    },
    {
      id: "scope",
      title: "2. Für wen diese Erklärung gilt",
      paragraphs: [
        "Sie gilt für die Pistl-PWA und die geschlossene, kostenlose Beta mit höchstens 100 eingeladenen Personen in Deutschland und Österreich. Eine native iOS-App, Zahlungen, Werbung und öffentliche Registrierung gehören nicht zu dieser Fassung.",
        `Die vertragliche Einordnung von 16- und 17-Jährigen sowie die altersgerechte Information müssen vor dem Start abschließend geprüft werden: ${launchBlocker("MINOR_CONTRACT_REVIEW")}.`,
      ],
    },
    {
      id: "data-categories",
      title: "3. Welche Daten wir verarbeiten",
      bullets: [
        "Einladung und Konto: Einladungskennung, E-Mail-Adresse, Authentifizierungsdaten, Konto-ID, Bestätigungs- und Sicherheitsereignisse.",
        "Altersschutz: Geburtsdatum in einem nicht öffentlich erreichbaren Bereich sowie daraus abgeleitete Altersgruppe und Minderjährigenstatus. Ausweiskopien sind nicht vorgesehen.",
        "Profil und Social Graph: Anzeigename, Handle, Stadt, Fahrkönnen, Bio, Avatar-Pfad, Freundschafts-, Block- und Crew-Beziehungen.",
        "Koordination: Resorts, Fahrten, Teilnahme- und Mitfahranfragen, angenommene Teilnehmer, Treffpunkte und Abfahrtsdetails.",
        "Kommunikation und Sicherheit: Direkt- und Ride-Gruppennachrichten, Meldungen, beigefügte Nachweise, Moderationsentscheidungen und Einsprüche.",
        "Standort: freiwillig gewählte Resort-Präsenz und, nur bei aktiv gestarteter Session, die jeweils letzte präzise Position mit Zeitstempel. Bewegungsverläufe sind nicht vorgesehen.",
        "Technik und Support: notwendige Sitzungsdaten, IP-Adresse in Sicherheitsprotokollen, Geräte-/Browserinformationen, Fehlerdaten und Supportkommunikation.",
        "Optionale Analyse: ausschließlich freigegebene Produkt-Ereignisse mit pseudonymer Analyse-ID; keine Namen, E-Mails, Nachrichten, Social-Graph-Daten oder Koordinaten.",
      ],
      paragraphs: [
        "Die Daten stammen von dir, aus deinen freiwilligen Browser-/Gerätefreigaben, aus Interaktionen anderer Mitglieder mit dir (zum Beispiel Freundschaftsanfrage oder Meldung) sowie aus technisch erzeugten Sicherheits- und Zustellereignissen unserer Dienstleister.",
        "Einladung, E-Mail, Passwort und Altersprüfung sind für ein Konto erforderlich; ohne sie ist die Teilnahme nicht möglich. Zusätzliche Profilfelder, Avatar, präziser Standort und Produktanalyse sind freiwillig. Einzelne Koordinationsfunktionen funktionieren ohne die dafür benötigte Ride- oder Beziehungsangabe nicht.",
      ],
    },
    {
      id: "purposes",
      title: "4. Zwecke und vorgesehene Rechtsgrundlagen",
      bullets: [
        "Konto, Profil, Freundschaften, Rides, Carpools und Chat: Bereitstellung des angeforderten Dienstes, vorgesehen auf Grundlage von Art. 6 Abs. 1 lit. b DSGVO.",
        "Einladung, Mindestalter und Missbrauchsschutz: Zugangskontrolle, Schutz Minderjähriger und Systemsicherheit; die endgültige Zuordnung zu Art. 6 Abs. 1 lit. b, c oder f DSGVO ist anwaltlich festzulegen.",
        "Meldungen und Moderation: Durchsetzung der Community-Regeln, Schutz der Community sowie Erfüllung gesetzlicher Pflichten, vorgesehen nach Art. 6 Abs. 1 lit. c und f DSGVO.",
        "Transaktions-E-Mails: Registrierung, Bestätigung, Sicherheit und angeforderte Service-Nachrichten nach Art. 6 Abs. 1 lit. b DSGVO.",
        "Optionale Produktanalyse: nur nach Einwilligung gemäß Art. 6 Abs. 1 lit. a DSGVO und, soweit einschlägig, § 25 Abs. 1 TDDDG.",
        "Sicherheitsprotokolle: Abwehr, Aufklärung und Nachweis von Angriffen auf Grundlage berechtigter Interessen nach Art. 6 Abs. 1 lit. f DSGVO.",
      ],
      callout: `Die Rechtsgrundlage für präzise Standortdaten und ihre Auswirkungen auf Minderjährige sind erst nach abgeschlossener Datenschutz-Folgenabschätzung final: ${launchBlocker("LOCATION_LEGAL_BASIS_AND_DPIA")}.`,
    },
    {
      id: "location",
      title: "5. Standort und Sichtbarkeit",
      paragraphs: [
        "Die PWA soll die Browser-Berechtigung erst anfordern, wenn du eine Standort-Session selbst startest. Bei Ablehnung kannst du dein Resort manuell auswählen. Die Session soll im Vordergrund laufen, jederzeit stoppbar sein und automatisch enden.",
        "Friends-of-Friends dürfen bei volljährigen Personen höchstens die freigegebene Resort-Präsenz sehen. Eine präzise Live-Position ist nur für bestätigte Freunde oder angenommene volljährige Ride-Teilnehmer vorgesehen. Bei Minderjährigen bleibt auch diese Sichtbarkeit auf bestätigte Freunde beschränkt. Blockieren beendet jede Sichtbarkeit.",
        "Geplant sind: nur der jeweils letzte Punkt, keine Standort-Historie, Unsichtbarkeit und Löschung nach fünf Minuten ohne Aktualisierung sowie eine Sessiondauer von standardmäßig vier und höchstens acht Stunden.",
      ],
      callout: `Diese Garantien müssen vor ihrer Veröffentlichung technisch nachgewiesen werden: ${launchBlocker("RETENTION_TECHNICAL_ENFORCEMENT")} und ${launchBlocker("LOCATION_LEGAL_BASIS_AND_DPIA")}.`,
    },
    {
      id: "minors",
      title: "6. Schutz von 16- und 17-Jährigen",
      paragraphs: [
        "Unter 16-Jährige dürfen kein Konto erstellen. Das Geburtsdatum dient der Altersprüfung und wird nicht im Profil angezeigt. Pistl plant keine standardmäßige Ausweiskontrolle; die Altersprüfung muss angemessen, wirksam und möglichst datensparsam sein.",
        "Minderjährige werden nicht über Friends-of-Friends entdeckt. Profile, Rides, Nachrichten und Standorte werden für sie auf bestätigte Freunde begrenzt. Es gibt keine Fremden-DMs und keine auf Minderjährige ausgerichtete Werbung.",
      ],
    },
    {
      id: "processors",
      title: "7. Dienstleister und Empfänger",
      bullets: [
        "Supabase: Authentifizierung, PostgreSQL-Datenbank, Storage und Realtime; für die Beta ist die Projektregion Frankfurt vorgesehen.",
        "Vercel: Hosting und Ausführung der Webanwendung; die Funktionsregion Frankfurt begrenzt nicht automatisch sämtliche Support-, Netzwerk-, Protokoll- oder Unterauftragsverarbeitungen auf die EU.",
        "Brevo: Versand notwendiger Konto- und Sicherheits-E-Mails; kein Marketingversand in der Closed Beta.",
        "PostHog EU: optionale Produktanalyse ausschließlich nach Opt-in und mit deaktiviertem Autocapture, Session Replay und Personenprofilen.",
        "Behörden, Gerichte oder Beratende erhalten Daten nur, wenn dies gesetzlich erforderlich ist oder Rechte geltend gemacht, ausgeübt oder verteidigt werden müssen.",
      ],
      callout: `Verträge, tatsächliche Regionen, Unterauftragsverarbeiter, Löschoptionen und internationale Übermittlungen sind vor Launch zu dokumentieren: ${launchBlocker("PROCESSOR_CONTRACTS_AND_TRANSFERS")}.`,
    },
    {
      id: "international-transfers",
      title: "8. Internationale Datenübermittlungen",
      paragraphs: [
        "Ein Frankfurter Projekt- oder Ausführungsstandort bedeutet nicht, dass jede Verarbeitung ausschließlich im Europäischen Wirtschaftsraum stattfindet. Anbieter oder deren Unterauftragsverarbeiter können Daten in Drittländern verarbeiten oder von dort darauf zugreifen.",
        "Vor der Beta werden für jede Übermittlung Angemessenheitsbeschlüsse, EU-Standardvertragsklauseln, Transfer Impact Assessments und zusätzliche technische sowie organisatorische Maßnahmen geprüft. Die endgültige Anbieterliste und Transfergrundlage wird hier erst nach dieser Prüfung veröffentlicht.",
      ],
    },
    {
      id: "analytics",
      title: "9. Einwilligung und Analyse",
      paragraphs: [
        "Notwendige Sitzungsinformationen werden verwendet, damit Anmeldung und Sicherheit funktionieren. Optionale PostHog-Analyse wird weder geladen noch auf deinem Gerät gespeichert, bevor du zugestimmt hast.",
        "Ablehnen und Zustimmen müssen gleich leicht sein. Ein Widerruf beendet weitere Analyse, setzt die lokale Analyse-ID zurück und löst den dokumentierten Löschprozess für bereits zuordenbare Analysedaten aus.",
      ],
    },
    {
      id: "retention",
      title: "10. Speicherdauer",
      bullets: [
        "Konto- und Profildaten: bis zur Kontolöschung; danach sofortige Deaktivierung und vorgesehene endgültige Löschung innerhalb von 24 Stunden, spätestens sieben Tagen.",
        "Präzise Live-Position: höchstens fünf Minuten nach der letzten Aktualisierung; keine Historie. Resort-Präsenz: höchstens 24 Stunden.",
        "Ride-Gruppenchat: 90 Tage nach dem Ride. Direktnachrichten: zwölf Monate nach letzter Aktivität.",
        "Meldungsinhalte und Nachweise: 90 Tage nach Abschluss; reine Entscheidungsmetadaten: zwölf Monate.",
        "Einladungen: bis 30 Tage nach Ablauf oder Einlösung. Sicherheitsprotokolle: grundsätzlich höchstens 30 Tage, bei konkretem Vorfall bis zur Klärung.",
        "Backups: Löschung mit dem vertraglich und technisch bestätigten Backup-Zyklus. Gesetzliche Aufbewahrung oder ein dokumentierter Legal Hold können im Einzelfall vorgehen.",
      ],
      callout: `Alle Fristen sind Launch-Ziele und noch kein Nachweis ihrer Implementierung: ${launchBlocker("RETENTION_TECHNICAL_ENFORCEMENT")}.`,
    },
    {
      id: "rights",
      title: "11. Deine Rechte",
      paragraphs: [
        "Du kannst Auskunft, Berichtigung, Löschung, Einschränkung, Datenübertragbarkeit und gegebenenfalls Widerspruch verlangen. Eine Einwilligung kannst du jederzeit mit Wirkung für die Zukunft widerrufen. Außerdem kannst du dich bei einer Datenschutzaufsichtsbehörde beschweren.",
        `Kontakt für diese Rechte: ${launchBlocker("PRIVACY_CONTACT_EMAIL")}. Zuständige federführende Aufsicht: ${launchBlocker("COMPETENT_SUPERVISORY_AUTHORITY")}. Du kannst dich auch an die Aufsicht deines Aufenthaltsorts in Deutschland oder Österreich wenden.`,
        "Zur Identitätsprüfung nutzen wir vorrangig deine angemeldete Sitzung oder bestätigte Konto-E-Mail. Einen Ausweis fordern wir nicht standardmäßig an.",
      ],
    },
    {
      id: "moderation",
      title: "12. Moderation und automatisierte Entscheidungen",
      paragraphs: [
        "Technische Filter können verdächtige Inhalte markieren oder den Versand eindeutig verbotener Inhalte vorläufig begrenzen. Entscheidungen mit wesentlicher Auswirkung auf ein Konto sollen von einem Menschen überprüft und mit einer Begründung sowie einem Einspruchsweg versehen werden.",
        "Es sind keine ausschließlich automatisierten Entscheidungen mit rechtlicher oder ähnlich erheblicher Wirkung im Sinne von Art. 22 DSGVO vorgesehen.",
      ],
    },
    {
      id: "security",
      title: "13. Sicherheit",
      paragraphs: [
        "Vorgesehen sind unter anderem verschlüsselte Übertragung, private Datenbereiche, Row Level Security, kurzlebige signierte Avatar-URLs, rollenbasierte Zugriffe, Mehrfaktor-Authentifizierung für Betreiberkonten, Protokollierung sicherheitsrelevanter Aktionen und regelmäßige Wiederherstellungstests.",
        "Kein Onlinedienst ist vollkommen risikofrei. Vermutete Sicherheitsvorfälle kannst du über die Meldestelle mitteilen.",
      ],
    },
    {
      id: "updates",
      title: "14. Stand und Änderungen",
      paragraphs: [
        `Vorgesehener Gültigkeitsbeginn: ${launchBlocker("DOCUMENT_EFFECTIVE_DATE")}. Wesentliche Änderungen werden vor ihrem Wirksamwerden transparent angekündigt und, falls erforderlich, erneut zur Zustimmung gestellt.`,
      ],
      links: [
        {
          label: "Datenschutz-Grundverordnung bei EUR-Lex",
          href: "https://eur-lex.europa.eu/eli/reg/2016/679/oj?locale=de",
        },
        {
          label: "§ 25 TDDDG beim Bundesministerium der Justiz",
          href: "https://www.gesetze-im-internet.de/ttdsg/__25.html",
        },
      ],
    },
  ],
};
