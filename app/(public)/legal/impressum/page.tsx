import type { Metadata } from "next";
import LegalDocumentPage from "@/features/compliance/LegalDocumentPage";
import { getLegalDocument } from "@/features/compliance/legal-content";

export const metadata: Metadata = {
  title: "Impressum",
  description: "Anbieterkennzeichnung für Pistl.",
};

export default function ImprintPage() {
  return <LegalDocumentPage document={getLegalDocument("imprint")} />;
}
