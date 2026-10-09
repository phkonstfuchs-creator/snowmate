import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const REQUIRED_ARTIFACTS = [
  "README.md",
  "ropa.md",
  "toms.md",
  "dpia.md",
  "retention.md",
  "dsar.md",
  "data-breach.md",
  "dpa-tia.md",
  "dsa-notice-action.md",
] as const;

function readArtifact(name: (typeof REQUIRED_ARTIFACTS)[number]): string {
  return readFileSync(resolve(process.cwd(), "docs/compliance", name), "utf8");
}

describe("compliance artifacts", () => {
  it.each(REQUIRED_ARTIFACTS)(
    "keeps %s visibly draft and launch-blocked",
    (name) => {
      const artifact = readArtifact(name);

      expect(artifact).toMatch(/DRAFT|Entwurf/i);
      expect(artifact).toContain("LAUNCH_BLOCKER[");
      expect(artifact).not.toMatch(
        /Pistl (ist|wurde) (vollständig )?(rechtlich|anwaltlich|DSGVO-)freigegeben/i,
      );
    },
  );

  it("tracks every planned processor without an EU-only shortcut", () => {
    const assessment = readArtifact("dpa-tia.md");

    for (const provider of ["Supabase", "Vercel", "Brevo", "PostHog"]) {
      expect(assessment).toContain(provider);
    }

    expect(assessment).toMatch(/Drittland|Übermittlung/);
    expect(assessment).toMatch(/SCC|Standardvertragsklauseln/);
    expect(assessment).not.toMatch(/Pistl-Daten.*ausschließlich.*EU/i);
  });

  it("keeps the high-risk and DSA operating gates explicit", () => {
    expect(readArtifact("dpia.md")).toContain(
      "LAUNCH_BLOCKER[LOCATION_LEGAL_BASIS_AND_DPIA]",
    );

    const noticeAndAction = readArtifact("dsa-notice-action.md");
    expect(noticeAndAction).toContain("Art. 16");
    expect(noticeAndAction).toContain("Art. 17");
    expect(noticeAndAction).toContain("Art. 20");
    expect(noticeAndAction).toMatch(/Begründung/);
    expect(noticeAndAction).toMatch(/Einspruch/);
  });

  it("documents the risk-based breach deadline correctly", () => {
    const runbook = readArtifact("data-breach.md");

    expect(runbook).toMatch(/binnen 72 Stunden/);
    expect(runbook).toMatch(/voraussichtlich kein Risiko/);
    expect(runbook).toMatch(/voraussichtlich hohes Risiko/i);
  });
});
