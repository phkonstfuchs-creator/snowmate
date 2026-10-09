import { launchBlocker } from "../launch-blockers";
import type { LegalDocument } from "../legal-types";

export const imprintDocument: LegalDocument = {
  id: "imprint",
  path: "/legal/impressum",
  navigationLabel: "Impressum",
  title: "Impressum",
  summary:
    "Pflichtangaben zum verantwortlichen Anbieter von Pistl. Sämtliche geschützten Betreiberangaben müssen unmittelbar vor Veröffentlichung eingesetzt werden.",
  status: "draft",
  version: "0.1-template",
  effectiveDate: launchBlocker("DOCUMENT_EFFECTIVE_DATE"),
  launchBlockers: [
    "LEGAL_REVIEW_APPROVAL",
    "OPERATOR_LEGAL_NAME",
    "OPERATOR_POSTAL_ADDRESS",
    "PUBLIC_CONTACT_EMAIL",
    "DIRECT_CONTACT_METHOD",
    "DOCUMENT_EFFECTIVE_DATE",
    "REGISTER_AND_TAX_DETAILS",
    "MSTV_RESPONSIBLE_PERSON",
    "CONSUMER_DISPUTE_STATEMENT",
    "DSA_POINT_OF_CONTACT",
  ],
  sections: [
    {
      id: "provider",
      title: "Angaben gemäß § 5 DDG",
      paragraphs: [
        `${launchBlocker("OPERATOR_LEGAL_NAME")}`,
        "Einzelunternehmen",
        `${launchBlocker("OPERATOR_POSTAL_ADDRESS")}`,
        `E-Mail: ${launchBlocker("PUBLIC_CONTACT_EMAIL")}`,
        `Weiterer schneller direkter Kommunikationsweg: ${launchBlocker("DIRECT_CONTACT_METHOD")}`,
      ],
    },
    {
      id: "register-tax",
      title: "Register- und Steuerangaben",
      paragraphs: [
        `Handels-, Gewerbe- und Registerangaben sowie Umsatzsteuer- oder Wirtschafts-Identifikationsnummer sind auf ihre Anwendbarkeit zu prüfen: ${launchBlocker("REGISTER_AND_TAX_DETAILS")}. Eine persönliche Steuernummer wird nicht veröffentlicht.`,
      ],
    },
    {
      id: "editorial",
      title: "Inhaltlich Verantwortlicher",
      paragraphs: [
        `Ob und welche Angabe nach § 18 Abs. 2 MStV für redaktionell-journalistische Angebote erforderlich ist, wird vor Launch geprüft: ${launchBlocker("MSTV_RESPONSIBLE_PERSON")}.`,
      ],
    },
    {
      id: "dsa-contact",
      title: "Kontaktstelle nach dem Digital Services Act",
      paragraphs: [
        `Kontakt für Nutzende, Behörden und die Europäische Kommission: ${launchBlocker("DSA_POINT_OF_CONTACT")}. Kommunikation ist auf Deutsch und Englisch möglich, sobald die Kontaktstelle besetzt und getestet ist.`,
        "Illegale Inhalte und Sicherheitsprobleme können über die öffentlich erreichbare Meldestelle gemeldet werden.",
      ],
    },
    {
      id: "consumer-disputes",
      title: "Verbraucherstreitbeilegung",
      paragraphs: [
        `Die nach dem Verbraucherstreitbeilegungsgesetz erforderliche Erklärung zur Teilnahmebereitschaft und zuständigen Stelle wird passend zum Unternehmen ergänzt: ${launchBlocker("CONSUMER_DISPUTE_STATEMENT")}.`,
      ],
    },
    {
      id: "status",
      title: "Vor Veröffentlichung",
      paragraphs: [
        `Gültigkeitsbeginn: ${launchBlocker("DOCUMENT_EFFECTIVE_DATE")}. Anwaltliche Freigabe: ${launchBlocker("LEGAL_REVIEW_APPROVAL")}.`,
        "Dieses Template ist kein veröffentlichtes Impressum und darf mit Platzhaltern nicht für eine externe Beta verwendet werden.",
      ],
      links: [
        {
          label: "§ 5 DDG beim Bundesministerium der Justiz",
          href: "https://www.gesetze-im-internet.de/ddg/__5.html",
        },
      ],
    },
  ],
};
