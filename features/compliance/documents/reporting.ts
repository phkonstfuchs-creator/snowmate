import { launchBlocker } from "../launch-blockers";
import type { LegalDocument } from "../legal-types";

export const reportingDocument: LegalDocument = {
  id: "reporting",
  path: "/legal/meldestelle",
  navigationLabel: "Meldestelle",
  title: "Meldestelle",
  summary:
    "Hier sollen illegale Inhalte, Verstöße gegen die Community-Regeln, Datenschutz- und Sicherheitsprobleme einfach und auch ohne Konto gemeldet werden können.",
  status: "draft",
  version: "0.1-template",
  effectiveDate: launchBlocker("DOCUMENT_EFFECTIVE_DATE"),
  launchBlockers: [
    "LEGAL_REVIEW_APPROVAL",
    "PUBLIC_CONTACT_EMAIL",
    "PRIVACY_CONTACT_EMAIL",
    "DOCUMENT_EFFECTIVE_DATE",
    "DSA_NOTICE_ACTION_ENDPOINT",
    "DSA_POINT_OF_CONTACT",
    "MODERATION_OPERATIONS_READY",
  ],
  sections: [
    {
      id: "emergency",
      title: "Akute Gefahr",
      paragraphs: [
        "Bei unmittelbarer Gefahr für Leib oder Leben, einem vermissten Menschen oder einem Unfall rufe 112 beziehungsweise die örtliche Berg- oder Pistenrettung. Diese Meldestelle ist kein Notruf und wird nicht rund um die Uhr in Echtzeit überwacht.",
      ],
      callout:
        "Sichere dich zuerst selbst. Konfrontiere keine gefährliche Person und veröffentliche keine sensiblen Standort- oder Identitätsdaten.",
    },
    {
      id: "what",
      title: "Was du melden kannst",
      bullets: [
        "Möglicherweise illegale Inhalte oder Handlungen, einschließlich Bedrohung, Betrug, Stalking oder unerlaubter Veröffentlichung personenbezogener Daten.",
        "Gefährdung, Grooming oder sexuelle Ausbeutung von Minderjährigen.",
        "Belästigung, Hass, Diskriminierung, Identitätsmissbrauch oder Umgehung einer Blockierung.",
        "Unbefugte Weitergabe einer präzisen Live-Position, einer Adresse oder privater Nachrichten.",
        "Sicherheitslücken, Kontoübernahmen oder ein Datenleck. Poste ausnutzbare Details nicht öffentlich.",
        "Entscheidungen von Pistl, gegen die du Einspruch einlegen möchtest.",
      ],
    },
    {
      id: "how",
      title: "So reichst du eine Meldung ein",
      paragraphs: [
        `Der öffentliche Meldekanal muss vor Launch ohne Anmeldung erreichbar und erfolgreich getestet sein: ${launchBlocker("DSA_NOTICE_ACTION_ENDPOINT")}. Alternativer Kontakt: ${launchBlocker("PUBLIC_CONTACT_EMAIL")}.`,
        "Eine Meldung soll mindestens deine Kontaktmöglichkeit, eine genaue Fundstelle oder betroffene Konto-/Ride-Kennung, den Grund, deine verständliche Begründung und auf Wunsch geeignete Nachweise enthalten. Gib nur Daten an, die für die Prüfung nötig sind.",
        "Anonyme Hinweise können geprüft werden; ohne Kontaktmöglichkeit können wir jedoch keine Rückfragen stellen oder den Ausgang mitteilen. Eine Anmeldung darf für Meldungen illegaler Inhalte nicht erforderlich sein.",
      ],
      callout: `Der Meldeweg ist noch nicht betriebsbereit: ${launchBlocker("DSA_NOTICE_ACTION_ENDPOINT")}. Diese Seite stellt derzeit kein funktionierendes Meldeformular dar.`,
    },
    {
      id: "process",
      title: "Was nach deiner Meldung passiert",
      bullets: [
        "Wir bestätigen den Eingang, sofern eine Kontaktmöglichkeit vorliegt, und vergeben eine Referenz.",
        "Geschultes Personal prüft Meldung, Kontext und geltende Regel beziehungsweise Rechtsgrundlage sorgfältig und unparteiisch.",
        "Akute Minderjährigen-, Gewalt-, Doxxing- und Standortgefahren werden sofort priorisiert; für die besetzte Beta ist eine erste Bewertung innerhalb von vier betreuten Stunden vorgesehen. Für normale Meldungen gilt ein Ziel von 24 Stunden.",
        "Mögliche Maßnahmen sind keine Maßnahme, Rückfrage, Warnung, Sichtbarkeitsbegrenzung, Entfernung, Funktionsbeschränkung, vorläufige Sperre oder dauerhafte Sperre.",
        "Meldende und betroffene Personen erhalten grundsätzlich die Entscheidung und eine klare Begründung mit Regel- oder Rechtsbezug. Schutzinteressen, Geheimhaltung oder Ermittlungen können Details begrenzen.",
        "Erforderliche Meldungen an Behörden erfolgen nur nach dokumentierter rechtlicher Bewertung.",
      ],
      callout: `Moderation, Vertretung und Eskalation müssen vor Einladungen nachgewiesen werden: ${launchBlocker("MODERATION_OPERATIONS_READY")}.`,
    },
    {
      id: "appeal",
      title: "Einspruch gegen eine Entscheidung",
      paragraphs: [
        "Du kannst kostenlos Einspruch einlegen. Nenne die Entscheidungsreferenz, erkläre knapp, warum die Entscheidung falsch oder unverhältnismäßig ist, und füge nur notwendige neue Informationen bei.",
        `Einspruchskanal und verantwortliche Kontaktstelle: ${launchBlocker("DSA_POINT_OF_CONTACT")}. Die erneute Prüfung erfolgt nicht rein automatisiert. Das Ergebnis wird begründet.`,
      ],
    },
    {
      id: "confidentiality",
      title: "Vertraulichkeit und Datenschutz",
      paragraphs: [
        "Die Identität einer meldenden Person wird nur offengelegt, soweit dies für ein faires Verfahren oder aufgrund einer gesetzlichen Pflicht erforderlich ist. Wir geben nicht automatisch Namen oder Kontaktdaten an die gemeldete Person weiter.",
        `Datenschutzfragen oder Betroffenenrechte richtest du an ${launchBlocker("PRIVACY_CONTACT_EMAIL")}. Meldungsinhalte und Nachweise sollen nach Abschluss höchstens 90 Tage, reine Entscheidungsmetadaten höchstens zwölf Monate gespeichert werden, sofern kein dokumentierter Rechtsgrund für eine längere Aufbewahrung besteht.`,
      ],
    },
    {
      id: "misuse",
      title: "Missbrauch der Meldestelle",
      paragraphs: [
        "Gutgläubige Meldungen haben keine Nachteile, auch wenn sich kein Verstoß bestätigt. Bewusst falsche Meldungen, Drohungen, Spam oder das Einreichen unnötiger intimer Daten können begrenzt und nach den Community-Regeln behandelt werden.",
        `Gültigkeitsbeginn: ${launchBlocker("DOCUMENT_EFFECTIVE_DATE")}. Rechtliche Endprüfung: ${launchBlocker("LEGAL_REVIEW_APPROVAL")}.`,
      ],
      links: [
        {
          label: "Digital Services Act – Überblick der Europäischen Kommission",
          href: "https://digital-strategy.ec.europa.eu/en/policies/digital-services-act",
        },
        {
          label: "DSA-Fragen und Antworten der Europäischen Kommission",
          href: "https://digital-strategy.ec.europa.eu/en/faqs/digital-services-act-questions-and-answers",
        },
      ],
    },
  ],
};
