import type { Metadata } from "next";
import LegalDocumentPage from "@/features/compliance/LegalDocumentPage";
import { getLegalDocument } from "@/features/compliance/legal-content";

export const metadata: Metadata = {
  title: "Meldestelle",
  description:
    "Informationen zum Melden illegaler Inhalte und von Sicherheitsproblemen bei Pistl.",
};

export default function ReportingPage() {
  return <LegalDocumentPage document={getLegalDocument("reporting")} />;
}
