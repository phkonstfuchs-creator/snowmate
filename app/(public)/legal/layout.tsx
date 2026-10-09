import type { Metadata } from "next";
import type { ReactNode } from "react";
import LegalShell from "@/features/compliance/LegalShell";

export const metadata: Metadata = {
  title: {
    default: "Rechtliches | Pistl",
    template: "%s | Pistl",
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default function LegalLayout({ children }: { children: ReactNode }) {
  return <LegalShell>{children}</LegalShell>;
}
