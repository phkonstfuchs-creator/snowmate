import { launchBlocker } from "../launch-blockers";
import type { LegalDocument } from "../legal-types";
import { TERMS_VERSION } from "../versions";

export const termsDocument: LegalDocument = {
  id: "terms",
  path: "/legal/nutzungsbedingungen",
  navigationLabel: "Bedingungen",
  title: "Nutzungsbedingungen",
  summary:
    "Diese Bedingungen regeln die kostenlose, einladungsbasierte Pistl-Closed-Beta für Personen ab 16 Jahre in Deutschland und Österreich.",
  status: "draft",
  version: TERMS_VERSION,
  effectiveDate: launchBlocker("DOCUMENT_EFFECTIVE_DATE"),
  launchBlockers: [
    "LEGAL_REVIEW_APPROVAL",
    "OPERATOR_LEGAL_NAME",
    "OPERATOR_POSTAL_ADDRESS",
    "PUBLIC_CONTACT_EMAIL",
    "DOCUMENT_EFFECTIVE_DATE",
    "ACCOUNT_LEGAL_ACCEPTANCE_FLOW",
    "MINOR_CONTRACT_REVIEW",
    "TERMS_CONSUMER_LAW_REVIEW",
  ],
  sections: [
    {
      id: "provider",
      title: "1. Anbieter und Vertragsgegenstand",
      paragraphs: [
        `Anbieter ist ${launchBlocker("OPERATOR_LEGAL_NAME")}, Einzelunternehmen, ${launchBlocker("OPERATOR_POSTAL_ADDRESS")}. Kontakt: ${launchBlocker("PUBLIC_CONTACT_EMAIL")}.`,
        "Pistl unterstützt eingeladene Mitglieder dabei, gemeinsame Ski- und Snowboardtage, Rides und Mitfahrgelegenheiten zu koordinieren. Die Closed Beta ist kostenlos, auf höchstens 100 Personen begrenzt und kein Beförderungs-, Reise-, Rettungs- oder Versicherungsdienst.",
        `Diese Bedingungen sind vor Verwendung anwaltlich freizugeben: ${launchBlocker("LEGAL_REVIEW_APPROVAL")}.`,
      ],
    },
    {
      id: "eligibility",
      title: "2. Teilnahmeberechtigung",
      bullets: [
        "Du musst mindestens 16 Jahre alt sein und deinen gewöhnlichen Aufenthalt in Deutschland oder Österreich haben.",
        "Du brauchst eine persönliche, gültige und noch nicht verwendete Einladung. Einladungen dürfen nicht verkauft oder öffentlich weitergegeben werden.",
        "Du musst richtige Kontoangaben machen und dein Konto selbst nutzen. Automatisierte, mehrfach angelegte oder fremde Konten sind unzulässig.",
      ],
      callout: `Die Wirksamkeit des Vertragsschlusses mit 16- und 17-Jährigen wird vor Launch gesondert geprüft: ${launchBlocker("MINOR_CONTRACT_REVIEW")}.`,
    },
    {
      id: "contract",
      title: "3. Vertragsschluss und Einwilligungen",
      paragraphs: [
        "Vor der Kontoerstellung müssen dir die gültigen Nutzungsbedingungen, Datenschutzerklärung und Community-Regeln zugänglich sein. Der Vertrag kommt erst durch deine eindeutige Annahme und die anschließende Kontobestätigung für die Closed Beta zustande.",
        "Optionale Einwilligungen, insbesondere für Produktanalyse und präzise Standortfreigabe, werden getrennt vom Vertrag und voneinander eingeholt. Ihre Ablehnung verhindert nicht die Nutzung der Funktionen, die ohne diese Daten bereitgestellt werden können.",
        `Version, Zeitpunkt und Konto der Annahme sowie getrennte Einwilligungen müssen manipulationsgeschützt nachweisbar sein: ${launchBlocker("ACCOUNT_LEGAL_ACCEPTANCE_FLOW")}.`,
      ],
    },
    {
      id: "account",
      title: "4. Konto und Sicherheit",
      paragraphs: [
        "Schütze dein Passwort, teile keinen Bestätigungslink und informiere Pistl bei einem vermuteten Kontomissbrauch. Du bist für Aktivitäten verantwortlich, die du vorsätzlich oder fahrlässig über dein Konto ermöglichst.",
        "Pistl darf eine Registrierung ablehnen, wenn Mindestalter, Einladung oder Sicherheitsanforderungen nicht erfüllt sind. Sicherheitsmaßnahmen dürfen nicht umgangen werden.",
      ],
    },
    {
      id: "mountain-safety",
      title: "5. Verantwortung am Berg",
      paragraphs: [
        "Du entscheidest selbst, ob Wetter, Lawinenlage, Gelände, Ausrüstung, Können und Gesundheitszustand eine Aktivität zulassen. Beachte örtliche Regeln, Pistensperren, FIS-Verhaltensregeln und Anweisungen von Pistenrettung und Behörden.",
        "Angaben anderer Mitglieder zu Können, Treffpunkt, freien Plätzen oder Bedingungen werden nicht von Pistl überprüft. In Notfällen nutze die örtlichen Rettungswege; Pistl ersetzt keinen Notruf. Europaweit erreichst du den Notruf unter 112.",
      ],
    },
    {
      id: "social-location",
      title: "6. Social Graph und Standort",
      paragraphs: [
        "Bestätige nur Personen, die du kennst oder denen du vertraust. Bei volljährigen Mitgliedern kann eine ausdrücklich freigegebene Resort-Präsenz Friends-of-Friends angezeigt werden. Minderjährige bleiben auf bestätigte Freunde beschränkt.",
        "Eine präzise Live-Position darf nur nach bewusstem Start und nur im vorgesehenen Empfängerkreis geteilt werden. Veröffentliche keine fremden Standorte und dränge niemanden zur Standortfreigabe. Stoppen oder Blockieren muss respektiert werden.",
      ],
    },
    {
      id: "content",
      title: "7. Deine Inhalte",
      paragraphs: [
        "Du behältst deine Rechte an Profilangaben, Avatar, Ride-Texten und Nachrichten. Du räumst Pistl nur die nicht ausschließlichen, räumlich erforderlichen und zeitlich auf die Bereitstellung begrenzten Rechte ein, die Inhalte zu speichern, technisch zu verarbeiten und dem von dir gewählten Empfängerkreis anzuzeigen.",
        "Du darfst nur Inhalte hochladen oder senden, für die du die nötigen Rechte hast. In der ersten Beta sind Medien ausschließlich als Profilbild vorgesehen; Chat und Ride-Inhalte bleiben textbasiert.",
      ],
    },
    {
      id: "prohibited",
      title: "8. Unzulässige Nutzung",
      bullets: [
        "Belästigung, Bedrohung, Hass, Diskriminierung, sexualisierte Ansprache Minderjähriger, Grooming oder Ausbeutung.",
        "Doxxing, Veröffentlichung fremder Standorte, Identitätsmissbrauch, Stalking oder Umgehung einer Blockierung.",
        "Illegale Inhalte, Gewaltverherrlichung, Betrug, Spam, Schadsoftware oder Aufrufe zu gefährlichem Verhalten.",
        "Verkauf von Fahrten oder Plätzen als gewerblicher Beförderungsdienst innerhalb der kostenlosen Beta.",
        "Scraping, Reverse Engineering von Schutzmechanismen, automatisierte Zugriffe oder Versuche, RLS und Zugriffskontrollen zu umgehen.",
      ],
    },
    {
      id: "moderation",
      title: "9. Meldungen, Moderation und Einspruch",
      paragraphs: [
        "Inhalte und Konten können gemeldet werden. Pistl kann Inhalte vorläufig verbergen, Funktionen beschränken, Verwarnungen aussprechen oder Konten sperren, wenn Community-Regeln, diese Bedingungen oder Gesetze verletzt werden oder ein konkretes Sicherheitsrisiko besteht.",
        "Betroffene erhalten grundsätzlich eine klare Begründung mit Regel- oder Rechtsbezug und Informationen zum kostenlosen Einspruch. Gesetzliche Geheimhaltung, laufende Ermittlungen oder der Schutz Betroffener können einzelne Angaben begrenzen.",
        "Meldende und gemeldete Personen werden fair behandelt. Meldungen allein beweisen keinen Verstoß; Entscheidungen werden nicht ausschließlich aufgrund der Anzahl von Meldungen getroffen.",
      ],
    },
    {
      id: "beta",
      title: "10. Beta-Betrieb und Änderungen",
      paragraphs: [
        "Die Beta dient dem begrenzten Test. Funktionen können fehlerhaft, vorübergehend nicht verfügbar oder aus Sicherheitsgründen deaktiviert sein. Pistl wird planbare wesentliche Einschränkungen möglichst vorher mitteilen.",
        "Neue kostenpflichtige Leistungen, Werbung oder eine öffentliche Öffnung werden nicht ohne gesonderte Information und erforderlichenfalls neue Zustimmung eingeführt.",
      ],
    },
    {
      id: "termination",
      title: "11. Beendigung und Löschung",
      paragraphs: [
        "Du kannst die Nutzung jederzeit beenden und die Kontolöschung anfordern. Pistl kann bei erheblichen oder wiederholten Verstößen kündigen oder sperren; bei akuter Gefahr ist eine sofortige vorläufige Sperre möglich.",
        "Soweit möglich erhältst du vor einer dauerhaften Sperre eine Begründung und Gelegenheit zum Einspruch. Gesetzliche Aufbewahrungspflichten und dokumentierte Sicherungen von Beweisen für laufende Verfahren bleiben vorbehalten.",
      ],
    },
    {
      id: "liability",
      title: "12. Gewährleistung und Haftung",
      paragraphs: [
        "Gesetzliche Rechte von Verbraucherinnen und Verbrauchern bleiben unberührt. Pistl schließt Haftung nicht aus, soweit sie gesetzlich zwingend besteht, insbesondere bei Vorsatz, grober Fahrlässigkeit sowie Verletzung von Leben, Körper oder Gesundheit.",
        `Die abschließende Haftungs-, Verfügbarkeits- und Gewährleistungsregel muss zum konkreten Beta-Angebot anwaltlich formuliert werden: ${launchBlocker("TERMS_CONSUMER_LAW_REVIEW")}.`,
      ],
    },
    {
      id: "law",
      title: "13. Anwendbares Recht und Streitbeilegung",
      paragraphs: [
        "Zwingende Verbraucherschutzvorschriften deines Aufenthaltsstaats bleiben unberührt. Gerichtsstand- und Rechtswahlklauseln werden vor Launch passend zum deutschen Einzelunternehmen und zur Nutzung in Deutschland und Österreich festgelegt.",
        `Gültigkeitsbeginn: ${launchBlocker("DOCUMENT_EFFECTIVE_DATE")}. Rechtliche Endprüfung: ${launchBlocker("LEGAL_REVIEW_APPROVAL")}.`,
      ],
    },
  ],
};
