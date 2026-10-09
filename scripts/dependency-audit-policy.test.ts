import { describe, expect, it } from "vitest";
import { evaluateDependencyAudit } from "./dependency-audit-policy";

const advisory = { name: "braces", url: "https://github.com/advisories/GHSA-vfj7-8cjw-p6xm" };
const report = { auditReportVersion: 2, vulnerabilities: {
  braces: { name: "braces", severity: "high", via: [advisory], nodes: ["node_modules/braces"] },
  micromatch: { name: "micromatch", severity: "high", via: ["braces"], nodes: ["node_modules/micromatch"] },
} };
const lock = { packages: { "node_modules/braces": { dev: true }, "node_modules/micromatch": { dev: true } } };
const now = new Date("2026-10-09T00:00:00Z");
describe("bounded development dependency audit exception", () => {
  it("accepts clean production and the one reviewed dev advisory before expiry", () => {
    expect(evaluateDependencyAudit({ auditReportVersion: 2, vulnerabilities: {} }, lock, now).failures).toEqual([]);
    expect(evaluateDependencyAudit(report, lock, now)).toEqual({ failures: [], exceptions: ["braces", "micromatch"] });
  });
  it("never applies exceptions to production dependencies or after expiry", () => {
    expect(evaluateDependencyAudit(report, { packages: { ...lock.packages, "node_modules/braces": {} } }, now).failures.length).toBeGreaterThan(0);
    expect(evaluateDependencyAudit(report, lock, new Date("2026-10-31T00:00:00Z")).failures.length).toBeGreaterThan(0);
    expect(evaluateDependencyAudit(report, lock, now, true).failures.length).toBeGreaterThan(0);
  });
  it("rejects another advisory, unknown dependency path, missing node and broken graph", () => {
    for (const vulnerabilities of [
      { braces: { ...report.vulnerabilities.braces, via: [{ ...advisory, url: "https://github.com/advisories/another" }] } },
      { attacker: { ...report.vulnerabilities.braces, name: "attacker" } },
      { braces: { ...report.vulnerabilities.braces, nodes: ["missing"] } },
      { braces: { ...report.vulnerabilities.braces, via: ["unknown"] } },
      { braces: { ...report.vulnerabilities.braces, via: ["braces"] } },
    ]) expect(evaluateDependencyAudit({ auditReportVersion: 2, vulnerabilities }, lock, now).failures.length).toBeGreaterThan(0);
  });
  it("fails closed on unavailable or malformed audit/lock data", () => {
    for (const bad of [null, {}, { error: "network unavailable" }, { auditReportVersion: 2, vulnerabilities: [] }]) {
      expect(evaluateDependencyAudit(bad, lock, now).failures.length).toBeGreaterThan(0);
    }
    expect(evaluateDependencyAudit(report, {}, now).failures.length).toBeGreaterThan(0);
  });
});
