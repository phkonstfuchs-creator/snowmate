export const LEGAL_DOCUMENT_IDS = [
  "privacy",
  "terms",
  "community",
  "imprint",
  "reporting",
] as const;

export type LegalDocumentId = (typeof LEGAL_DOCUMENT_IDS)[number];

export type LaunchBlockerId =
  | "LEGAL_REVIEW_APPROVAL"
  | "OPERATOR_LEGAL_NAME"
  | "OPERATOR_POSTAL_ADDRESS"
  | "PUBLIC_CONTACT_EMAIL"
  | "DIRECT_CONTACT_METHOD"
  | "PRIVACY_CONTACT_EMAIL"
  | "DPO_REQUIREMENT_AND_CONTACT"
  | "COMPETENT_SUPERVISORY_AUTHORITY"
  | "DOCUMENT_EFFECTIVE_DATE"
  | "ACCOUNT_LEGAL_ACCEPTANCE_FLOW"
  | "LOCATION_LEGAL_BASIS_AND_DPIA"
  | "PROCESSOR_CONTRACTS_AND_TRANSFERS"
  | "RETENTION_TECHNICAL_ENFORCEMENT"
  | "MINOR_CONTRACT_REVIEW"
  | "TERMS_CONSUMER_LAW_REVIEW"
  | "REGISTER_AND_TAX_DETAILS"
  | "MSTV_RESPONSIBLE_PERSON"
  | "CONSUMER_DISPUTE_STATEMENT"
  | "DSA_NOTICE_ACTION_ENDPOINT"
  | "DSA_POINT_OF_CONTACT"
  | "MODERATION_OPERATIONS_READY";

export interface LegalLink {
  label: string;
  href: string;
}

export interface LegalSection {
  id: string;
  title: string;
  paragraphs?: readonly string[];
  bullets?: readonly string[];
  callout?: string;
  links?: readonly LegalLink[];
}

export interface LegalDocument {
  id: LegalDocumentId;
  path: `/legal/${string}`;
  navigationLabel: string;
  title: string;
  summary: string;
  status: "draft";
  version: string;
  effectiveDate: string;
  launchBlockers: readonly LaunchBlockerId[];
  sections: readonly LegalSection[];
}
