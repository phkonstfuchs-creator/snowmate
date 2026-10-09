import { describe, expect, it } from "vitest";
import {
  LEGAL_DOCUMENTS,
  getLaunchBlockerTokens,
  getLegalDocument,
  hasUnresolvedLaunchBlockers,
} from "./legal-content";

const REQUIRED_DOCUMENT_IDS = [
  "privacy",
  "terms",
  "community",
  "imprint",
  "reporting",
] as const;

describe("legal content", () => {
  it("provides every public legal document at a unique route", () => {
    expect(LEGAL_DOCUMENTS.map(({ id }) => id)).toEqual(
      REQUIRED_DOCUMENT_IDS,
    );
    expect(new Set(LEGAL_DOCUMENTS.map(({ path }) => path)).size).toBe(
      LEGAL_DOCUMENTS.length,
    );
    expect(LEGAL_DOCUMENTS.every(({ path }) => path.startsWith("/legal/"))).toBe(
      true,
    );
  });

  it("keeps every document visibly blocked until operator data and legal approval exist", () => {
    for (const document of LEGAL_DOCUMENTS) {
      expect(document.status).toBe("draft");
      expect(document.launchBlockers).toContain("LEGAL_REVIEW_APPROVAL");
      expect(getLaunchBlockerTokens(document)).toEqual(
        expect.arrayContaining([...document.launchBlockers]),
      );
      expect(hasUnresolvedLaunchBlockers(document)).toBe(true);
    }
  });

  it("documents the intended privacy scope without claiming an EU-only stack", () => {
    const privacyText = JSON.stringify(getLegalDocument("privacy"));

    expect(privacyText).toMatch(/16 Jahre/);
    expect(privacyText).toContain("Deutschland");
    expect(privacyText).toContain("Österreich");
    expect(privacyText).toContain("präzise Standortdaten");
    expect(privacyText).toContain("Supabase");
    expect(privacyText).toContain("Vercel");
    expect(privacyText).toContain("Brevo");
    expect(privacyText).toContain("PostHog");
    expect(privacyText).toMatch(/Drittland|international/i);
    expect(privacyText).not.toMatch(/ausschließlich in der EU/i);
  });

  it("covers notice, action, reasons and appeal in the reporting path", () => {
    const reportingText = JSON.stringify(getLegalDocument("reporting"));

    expect(reportingText).toMatch(/illegale Inhalte/i);
    expect(reportingText).toMatch(/ohne (ein )?Konto|ohne Anmeldung/i);
    expect(reportingText).toMatch(/Begründung/);
    expect(reportingText).toMatch(/Einspruch/);
    expect(reportingText).toContain("112");
  });

  it("makes minor and location safety enforceable community expectations", () => {
    const communityText = JSON.stringify(getLegalDocument("community"));

    expect(communityText).toMatch(/Minderjährig/);
    expect(communityText).toMatch(/Live-Standort|Live-Position/);
    expect(communityText).toMatch(/Belästigung/);
    expect(communityText).toMatch(/Blockier/);
  });

  it("rejects unknown legal document identifiers", () => {
    expect(() => getLegalDocument("cookies" as "privacy")).toThrow(
      "Unknown legal document: cookies",
    );
  });
});
