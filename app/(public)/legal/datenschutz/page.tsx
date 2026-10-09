import type { Metadata } from "next";
import LegalDocumentPage from "@/features/compliance/LegalDocumentPage";
import { getLegalDocument } from "@/features/compliance/legal-content";

export const metadata: Metadata = {
  title: "Datenschutzerklärung",
  description: "Datenschutzinformationen für die Pistl Closed Beta.",
};

export default function PrivacyPage() {
  return <LegalDocumentPage document={getLegalDocument("privacy")} />;
}
