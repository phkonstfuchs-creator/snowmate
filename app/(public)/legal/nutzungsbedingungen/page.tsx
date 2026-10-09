import type { Metadata } from "next";
import LegalDocumentPage from "@/features/compliance/LegalDocumentPage";
import { getLegalDocument } from "@/features/compliance/legal-content";

export const metadata: Metadata = {
  title: "Nutzungsbedingungen",
  description: "Nutzungsbedingungen für die Pistl Closed Beta.",
};

export default function TermsPage() {
  return <LegalDocumentPage document={getLegalDocument("terms")} />;
}
