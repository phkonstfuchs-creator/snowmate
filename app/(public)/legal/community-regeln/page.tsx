import type { Metadata } from "next";
import LegalDocumentPage from "@/features/compliance/LegalDocumentPage";
import { getLegalDocument } from "@/features/compliance/legal-content";

export const metadata: Metadata = {
  title: "Community-Regeln",
  description: "Community- und Sicherheitsregeln für Pistl.",
};

export default function CommunityRulesPage() {
  return <LegalDocumentPage document={getLegalDocument("community")} />;
}
