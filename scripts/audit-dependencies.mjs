import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { evaluateDependencyAudit } from "./dependency-audit-policy.ts";

const directory = resolve(process.argv[2] ?? process.cwd());
const lock = JSON.parse(
  readFileSync(resolve(directory, "package-lock.json"), "utf8"),
);
function audit(production) {
  const args = ["audit", "--json", ...(production ? ["--omit=dev"] : [])];
  let output;
  try {
    output = execFileSync("npm", args, {
      cwd: directory,
      encoding: "utf8",
      timeout: 60_000,
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch (error) {
    output = error.stdout;
  }
  try {
    return JSON.parse(output);
  } catch {
    return null;
  }
}
let failed = false;
for (const production of [true, false]) {
  const result = evaluateDependencyAudit(
    audit(production),
    lock,
    new Date(),
    production,
  );
  const scope = production ? "production" : "all dependencies";
  for (const failure of result.failures) console.error(`${scope}: ${failure}`);
  failed ||= result.failures.length > 0;
  if (result.exceptions.length)
    console.log(
      `${scope}: reviewed dev-only braces exception through 2026-10-30 (${result.exceptions.join(", ")}).`,
    );
  else if (!result.failures.length)
    console.log(`${scope}: no high or critical findings.`);
}
process.exitCode = failed ? 1 : 0;
