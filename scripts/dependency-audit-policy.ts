const reviewedAdvisory = "https://github.com/advisories/GHSA-vfj7-8cjw-p6xm";
const exceptionExpires = Date.parse("2026-10-31T00:00:00Z");
const reviewedPackages = new Set([
  "braces",
  "micromatch",
  "fast-glob",
  "@next/eslint-plugin-next",
  "eslint-config-next",
]);
type RecordValue = Record<string, unknown>;
function record(value: unknown): value is RecordValue {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function evaluateDependencyAudit(
  input: unknown,
  lock: unknown,
  now: Date,
  production = false,
): { failures: string[]; exceptions: string[] } {
  if (
    !record(input) ||
    input.auditReportVersion !== 2 ||
    input.error ||
    !record(input.vulnerabilities) ||
    !record(lock) ||
    !record(lock.packages) ||
    !Number.isFinite(now.getTime())
  ) {
    return {
      failures: ["Audit or lock data is unavailable or malformed."],
      exceptions: [],
    };
  }
  const vulnerabilities = input.vulnerabilities;
  const packages = lock.packages;
  function reviewedDevChain(name: string, visited: readonly string[]): boolean {
    const item = vulnerabilities[name];
    if (
      !reviewedPackages.has(name) ||
      visited.includes(name) ||
      !record(item) ||
      item.name !== name ||
      item.severity !== "high" ||
      !Array.isArray(item.nodes) ||
      item.nodes.length === 0 ||
      !item.nodes.every(
        (node) =>
          typeof node === "string" &&
          record(packages[node]) &&
          packages[node].dev === true,
      ) ||
      !Array.isArray(item.via) ||
      item.via.length === 0
    )
      return false;
    return item.via.every((via) =>
      typeof via === "string"
        ? reviewedDevChain(via, [...visited, name])
        : record(via) &&
          name === "braces" &&
          via.name === "braces" &&
          via.severity === "high" &&
          via.url === reviewedAdvisory,
    );
  }
  const failures: string[] = [];
  const exceptions: string[] = [];
  for (const [name, item] of Object.entries(vulnerabilities)) {
    if (
      !record(item) ||
      !["info", "low", "moderate", "high", "critical"].includes(
        String(item.severity),
      )
    ) {
      failures.push(`${name}: malformed vulnerability entry.`);
    } else if (item.severity === "high" || item.severity === "critical") {
      if (
        !production &&
        item.severity !== "critical" &&
        now.getTime() < exceptionExpires &&
        reviewedDevChain(name, [])
      ) {
        exceptions.push(name);
      } else
        failures.push(
          `${name}: ${item.severity} vulnerability blocks verification.`,
        );
    }
  }
  return { failures, exceptions };
}
