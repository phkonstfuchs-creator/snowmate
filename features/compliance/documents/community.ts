import { launchBlocker } from "../launch-blockers";
import type { LegalDocument } from "../legal-types";

export const communityDocument: LegalDocument = {
  id: "community",
  path: "/legal/community-regeln",
  navigationLabel: "Community",
  title: "Community-Regeln",
  summary:
    "Pistl soll spontane Tage am Berg leichter machen. Diese Regeln schützen die Crew, besonders Minderjährige und Personen, die ihren Standort teilen.",
  status: "draft",
  version: "0.1-template",
  effectiveDate: launchBlocker("DOCUMENT_EFFECTIVE_DATE"),
  launchBlockers: [
    "LEGAL_REVIEW_APPROVAL",
    "PUBLIC_CONTACT_EMAIL",
    "DOCUMENT_EFFECTIVE_DATE",
    "MODERATION_OPERATIONS_READY",
  ],
  sections: [
    {
      id: "principle",
      title: "1. Crew heißt Verantwortung",
      paragraphs: [
        "Behandle andere so, dass sie sich sicher entscheiden können. Ein Ride, eine Mitfahrt, ein Chat oder eine Standortfreigabe begründet keinen Anspruch auf Nähe, Antwort oder Teilnahme.",
        `Diese Regeln werden vor dem Beta-Start rechtlich und operativ freigegeben: ${launchBlocker("LEGAL_REVIEW_APPROVAL")} und ${launchBlocker("MODERATION_OPERATIONS_READY")}.`,
      ],
    },
    {
      id: "minors",
      title: "2. Minderjährige besonders schützen",
      bullets: [
        "Pistl ist ab 16 Jahre. Versuche nicht, die Altersgrenze zu umgehen oder ein Konto für eine jüngere Person anzulegen.",
        "Keine sexualisierte Ansprache, kein Grooming, keine Bitte um intime Bilder und kein Ausnutzen eines Alters-, Erfahrungs- oder Machtgefälles.",
        "Minderjährige werden nicht über Friends-of-Friends entdeckt. Kontaktiere sie nur innerhalb der vorgesehenen bestätigten Freundschaftsbeziehung.",
        "Teile keine Schule, Wohnadresse, Routinen oder anderen sensiblen Informationen einer minderjährigen Person.",
      ],
    },
    {
      id: "respect",
      title: "3. Respekt statt Druck",
      bullets: [
        "Keine Belästigung, Bedrohung, Einschüchterung, Diskriminierung oder menschenverachtende Sprache.",
        "Ein Nein ist ein Nein. Wiederholte Kontaktaufnahme nach Ablehnung oder Blockierung ist unzulässig.",
        "Kein Identitätsmissbrauch, keine täuschenden Profile und keine Veröffentlichung privater Kommunikation ohne Berechtigung.",
        "Keine Werbung, Kettennachrichten, Betrugsversuche oder bezahlte Vermittlung in der Closed Beta.",
      ],
    },
    {
      id: "location",
      title: "4. Standort bleibt freiwillig",
      bullets: [
        "Starte deine Live-Position nur für einen konkreten Zweck und stoppe sie, sobald sie nicht mehr gebraucht wird.",
        "Fordere niemanden unter Druck zur Freigabe auf. Eine Ablehnung darf keine sozialen Nachteile haben.",
        "Speichere, fotografiere oder verbreite keinen fremden Live-Standort außerhalb des vorgesehenen Kreises.",
        "Blockieren beendet Kontakt und Standortzugriff. Versuche niemals, eine Blockierung über andere Konten oder Personen zu umgehen.",
      ],
    },
    {
      id: "mountain",
      title: "5. Sicher am Berg",
      bullets: [
        "Passe Geschwindigkeit und Route an Können, Wetter, Lawinenlage und Gelände an.",
        "Dränge niemanden zu riskanten Abfahrten, Alkohol- oder Drogenkonsum, Fahren ohne geeignete Ausrüstung oder Missachtung von Sperren.",
        "Täusche nicht über dein Können, freie Autositze, Fahrerlaubnis oder den Zustand eines Fahrzeugs.",
        "Pistl ist kein Rettungsdienst. Bei akuter Gefahr gilt 112 und der örtliche Pistenrettungsweg.",
      ],
    },
    {
      id: "content",
      title: "6. Inhalte mit Grenzen",
      bullets: [
        "Keine illegalen Inhalte, Gewaltandrohungen, personenbezogenen Daten ohne Erlaubnis oder Anleitungen zu Straftaten.",
        "Keine Inhalte, die sexuelle Ausbeutung Minderjähriger darstellen, fördern oder verharmlosen. Solche Inhalte werden unverzüglich gesichert, gesperrt und nach rechtlicher Prüfung gemeldet.",
        "Profilbilder müssen die abgebildete Person zeigen dürfen. In Chat und Ride-Texten sind während der ersten Beta keine Medien erlaubt.",
        "Melde Sicherheitsprobleme vertraulich über die Meldestelle statt sie mit ausnutzbaren Details öffentlich zu posten.",
      ],
    },
    {
      id: "report-block",
      title: "7. Melden und Blockieren",
      paragraphs: [
        "Melde illegale Inhalte, Regelverstöße oder Sicherheitsrisiken mit möglichst genauer Fundstelle. Du kannst blockieren, ohne eine Meldung abzuschicken. Für eine Meldung illegaler Inhalte soll kein Konto nötig sein.",
        "Missbrauche die Meldestelle nicht für Einschüchterung oder erfundene Vorwürfe. Gutgläubige Meldungen werden nicht sanktioniert, auch wenn sich kein Verstoß bestätigt.",
      ],
    },
    {
      id: "enforcement",
      title: "8. Mögliche Maßnahmen",
      paragraphs: [
        "Je nach Kontext und Schwere kann Pistl Inhalte verbergen oder entfernen, Funktionen begrenzen, verwarnen, Verbindungen aufheben oder ein Konto vorläufig beziehungsweise dauerhaft sperren. Akute Gefahren für Minderjährige oder Leib und Leben werden priorisiert.",
        "Betroffene erhalten grundsätzlich eine verständliche Begründung und einen kostenlosen Einspruchsweg. Ein Einspruch wird von einer anderen oder erneut prüfenden Person bewertet, soweit dies bei der kleinen Closed Beta organisatorisch möglich ist.",
      ],
    },
    {
      id: "help",
      title: "9. Kontakt",
      paragraphs: [
        `Fragen zu den Regeln: ${launchBlocker("PUBLIC_CONTACT_EMAIL")}. Vorgesehener Gültigkeitsbeginn: ${launchBlocker("DOCUMENT_EFFECTIVE_DATE")}.`,
      ],
    },
  ],
};
