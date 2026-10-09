import type { LaunchBlockerId, LegalDocument } from "./legal-types";

export const LAUNCH_BLOCKER_LABELS: Readonly<Record<LaunchBlockerId, string>> = {
  LEGAL_REVIEW_APPROVAL: "Schriftliche anwaltliche Freigabe dokumentieren",
  OPERATOR_LEGAL_NAME: "Vollständigen Namen des Betreibers einsetzen",
  OPERATOR_POSTAL_ADDRESS: "Ladungsfähige Betreiberanschrift einsetzen",
  PUBLIC_CONTACT_EMAIL: "Öffentliche Kontaktadresse aktivieren",
  DIRECT_CONTACT_METHOD:
    "Zusätzlichen schnellen direkten Kommunikationsweg festlegen",
  PRIVACY_CONTACT_EMAIL: "Datenschutz-Kontaktadresse aktivieren",
  DPO_REQUIREMENT_AND_CONTACT:
    "Pflicht zur Benennung eines Datenschutzbeauftragten prüfen und Kontakt ergänzen",
  COMPETENT_SUPERVISORY_AUTHORITY:
    "Zuständige Datenschutzaufsicht nach Betreibersitz bestimmen",
  DOCUMENT_EFFECTIVE_DATE: "Gültigkeitsdatum und Versionsstand festlegen",
  ACCOUNT_LEGAL_ACCEPTANCE_FLOW:
    "Versionierten Vertragsschluss und getrennte Einwilligungen implementieren",
  LOCATION_LEGAL_BASIS_AND_DPIA:
    "Standort-Rechtsgrundlage und abgeschlossene DPIA freigeben",
  PROCESSOR_CONTRACTS_AND_TRANSFERS:
    "AV-Verträge, Unterauftragsverarbeiter und Drittlandtransfers prüfen",
  RETENTION_TECHNICAL_ENFORCEMENT:
    "Löschfristen technisch implementieren und nachweisen",
  MINOR_CONTRACT_REVIEW:
    "Vertrags- und Jugendschutzkonzept für 16- und 17-Jährige freigeben",
  TERMS_CONSUMER_LAW_REVIEW:
    "Haftung, Leistungsumfang und Verbraucherrecht anwaltlich freigeben",
  REGISTER_AND_TAX_DETAILS:
    "Register- und Steuerangaben auf Anwendbarkeit prüfen und ergänzen",
  MSTV_RESPONSIBLE_PERSON:
    "Verantwortlichkeit nach § 18 Abs. 2 MStV prüfen und ggf. ergänzen",
  CONSUMER_DISPUTE_STATEMENT:
    "Erklärung zur Verbraucherstreitbeilegung festlegen",
  DSA_NOTICE_ACTION_ENDPOINT:
    "Öffentlichen DSA-Meldekanal technisch aktivieren und testen",
  DSA_POINT_OF_CONTACT: "DSA-Kontaktstelle benennen und besetzen",
  MODERATION_OPERATIONS_READY:
    "Moderationsdienst, Reaktionszeiten und Einspruchsweg betriebsbereit machen",
};

export function launchBlocker(id: LaunchBlockerId): string {
  return `LAUNCH_BLOCKER[${id}]`;
}

export function getLaunchBlockerTokens(
  document: LegalDocument,
): readonly LaunchBlockerId[] {
  const serializedDocument = JSON.stringify(document);

  return document.launchBlockers.filter((blocker) =>
    serializedDocument.includes(launchBlocker(blocker)),
  );
}
