import { communityDocument } from "./documents/community";
import { imprintDocument } from "./documents/imprint";
import { privacyDocument } from "./documents/privacy";
import { reportingDocument } from "./documents/reporting";
import { termsDocument } from "./documents/terms";
import { getLaunchBlockerTokens } from "./launch-blockers";
import type { LegalDocument, LegalDocumentId } from "./legal-types";

export { getLaunchBlockerTokens } from "./launch-blockers";
export type {
  LaunchBlockerId,
  LegalDocument,
  LegalDocumentId,
  LegalSection,
} from "./legal-types";

export const LEGAL_DOCUMENTS = [
  privacyDocument,
  termsDocument,
  communityDocument,
  imprintDocument,
  reportingDocument,
] as const satisfies readonly LegalDocument[];

const DOCUMENTS_BY_ID = new Map<LegalDocumentId, LegalDocument>(
  LEGAL_DOCUMENTS.map((document) => [document.id, document]),
);

export function getLegalDocument(id: LegalDocumentId): LegalDocument {
  const document = DOCUMENTS_BY_ID.get(id);

  if (!document) {
    throw new Error(`Unknown legal document: ${id}`);
  }

  return document;
}

export function hasUnresolvedLaunchBlockers(document: LegalDocument): boolean {
  return getLaunchBlockerTokens(document).length > 0;
}
