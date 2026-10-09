import type { Metadata } from "next";
import LegalOverview from "@/features/compliance/LegalOverview";

export const metadata: Metadata = {
  title: "Rechtliches & Sicherheit",
  description:
    "Rechtliche Informationen und Sicherheitsregeln für die Pistl Closed Beta.",
};

export default function LegalPage() {
  return <LegalOverview />;
}
