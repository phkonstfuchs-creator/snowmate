/* Runtime sweep for docs/qa/DEBUG_PROTOCOL.md: visits every public and
   demo screen on phone viewports, in German and English, light and dark,
   and reports console errors, failed requests, horizontal overflow,
   tap targets under 44 px and serious axe violations.

   Usage (against a running app, e.g. `npm run build && npx next start -p 3100`):
     QA_BASE_URL=http://localhost:3100 node scripts/qa/sweep.mjs [out-dir]
   Set PLAYWRIGHT_CHROMIUM_PATH when Playwright's own browser is not installed. */
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright";
import { AxeBuilder } from "@axe-core/playwright";

const BASE = process.env.QA_BASE_URL ?? "http://localhost:3100";
const OUT = process.argv[2] ?? "qa-sweep";
mkdirSync(OUT, { recursive: true });

const ROUTES = [
  "/login", "/signup", "/onboarding", "/forgot-password", "/impressum", "/datenschutz", "/lizenzen", "/nutzungsbedingungen",
  "/demo/feed", "/demo/map", "/demo/people", "/demo/crew", "/demo/profile", "/demo/carpool", "/demo/events",
  "/does-not-exist",
];
const VIEWPORTS = [
  { name: "se", width: 375, height: 667 },
  { name: "13", width: 390, height: 844 },
  { name: "max", width: 430, height: 932 },
];
const MODES = [
  { locale: "de", scheme: "light" },
  { locale: "en", scheme: "dark" },
];

const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined });
const findings = [];
const add = (route, variant, kind, detail) => findings.push({ route, variant, kind, detail: String(detail).slice(0, 300) });

for (const viewport of VIEWPORTS) {
  for (const mode of MODES) {
    const variant = `${viewport.name}/${mode.locale}/${mode.scheme}`;
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      deviceScaleFactor: 2, isMobile: true, hasTouch: true,
      colorScheme: mode.scheme, locale: mode.locale,
    });
    await context.addCookies([{ name: "sm_locale", value: mode.locale, url: BASE }]);
    for (const route of ROUTES) {
      const page = await context.newPage();
      page.on("console", (msg) => { if (["error", "warning"].includes(msg.type())) add(route, variant, `console-${msg.type()}`, msg.text()); });
      page.on("pageerror", (error) => add(route, variant, "page-error", error.message));
      page.on("requestfailed", (request) => add(route, variant, "request-failed", `${request.url()} ${request.failure()?.errorText}`));
      page.on("response", (response) => { if (response.status() >= 500) add(route, variant, "http-5xx", `${response.status()} ${response.url()}`); });
      try {
        await page.goto(BASE + route, { waitUntil: "networkidle", timeout: 30_000 });
      } catch (error) {
        add(route, variant, "navigation", error.message);
      }
      await page.waitForTimeout(400);

      const layout = await page.evaluate(() => {
        const width = document.documentElement.clientWidth;
        const overflow = [...document.querySelectorAll("body *")]
          .filter((el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.right > width + 1; })
          .slice(0, 5).map((el) => `${el.tagName.toLowerCase()}.${(el.className?.toString?.() ?? "").split(" ").slice(0, 2).join(".")} right=${Math.round(el.getBoundingClientRect().right)}`);
        const small = [...document.querySelectorAll("a[href], button, [role=button], [role=switch], input, select, label[for]")]
          .filter((el) => {
            const r = el.getBoundingClientRect();
            const style = getComputedStyle(el);
            if (r.width === 0 || r.height === 0 || style.visibility === "hidden") return false;
            if (el.closest("p, li") && el.tagName === "A") return false; // inline text links
            return r.height < 44 || r.width < 44;
          })
          .slice(0, 8).map((el) => `${el.tagName.toLowerCase()} "${(el.getAttribute("aria-label") ?? el.textContent ?? "").trim().slice(0, 30)}" ${Math.round(el.getBoundingClientRect().width)}x${Math.round(el.getBoundingClientRect().height)}`);
        return { pageScroll: document.documentElement.scrollWidth > width, overflow, small };
      });
      if (layout.pageScroll) add(route, variant, "horizontal-scroll", layout.overflow.join(" | "));
      for (const target of layout.small) add(route, variant, "small-target", target);

      if (viewport.name === "13") {
        try {
          const axe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
          for (const violation of axe.violations.filter((v) => v.impact === "serious" || v.impact === "critical")) {
            add(route, variant, `axe-${violation.impact}`, `${violation.id}: ${violation.nodes.slice(0, 3).map((n) => n.target.join(" ")).join(" , ")}`);
          }
        } catch (error) {
          add(route, variant, "axe-failed", error.message);
        }
        const file = `${route.replace(/\//g, "_") || "_root"}-${mode.locale}-${mode.scheme}.png`;
        await page.screenshot({ path: path.join(OUT, file), fullPage: false });
      }
      await page.close();
    }
    await context.close();
  }
}
await browser.close();

writeFileSync(path.join(OUT, "findings.json"), JSON.stringify(findings, null, 2));
const summary = {};
for (const f of findings) summary[f.kind] = (summary[f.kind] ?? 0) + 1;
console.log(JSON.stringify(summary, null, 2));
console.log(`${findings.length} findings, written to ${path.join(OUT, "findings.json")}`);
