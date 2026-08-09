import { chromium } from "playwright";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

/* Recaptures the screenshots for the landing page.
 *
 *   npx next build && npx next start -p 3100
 *   SHOT_BASE=http://localhost:3100 node scripts/capture-shots.mjs
 *
 * Captured at 430px device width and scale factor 2, then resized to
 * 860px — exactly the width the landing page renders them at.
 * Anything larger is dead weight. Run against a production build,
 * otherwise the Next.js dev badge ends up in the picture.
 */

const BASE = process.env.SHOT_BASE ?? "http://localhost:3000";
const OUT = path.resolve("public/shots");

/* Captured from the demo area, because the same screens are
   reachable there without signing in. The demo banner is removed
   before the shot; it labels the prototype, not the product. */
const SHOTS = [
  ["feed", "/demo/feed"],
  ["events", "/demo/events"],
  ["map", "/demo/map"],
  ["carpool", "/demo/carpool"],
  ["crew", "/demo/crew"],
  ["people", "/demo/people"],
  ["profile", "/demo/profile"],
  ["onboarding", "/onboarding"],
  ["login", "/login"],
];

const staging = mkdtempSync(path.join(tmpdir(), "snowmate-shots-"));

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 430, height: 932 },
  deviceScaleFactor: 2,
});

for (const [name, route] of SHOTS) {
  await page.goto(`${BASE}${route}`, { waitUntil: "networkidle" });

  // Hide the demo banner: it labels the prototype, not the product.
  await page.evaluate(() => {
    const banner = document.querySelector(".app-shell > div:first-child");
    if (banner && banner.textContent?.includes("Demo")) banner.remove();
  });

  // Let maps and animations settle
  await page.waitForTimeout(name === "map" ? 2500 : 700);

  const file = path.join(staging, `${name}.png`);
  await page.screenshot({ path: file });

  /* Resize and convert to WebP via Pillow — cwebp is not installed
     on this machine, Pillow is. */
  execFileSync(
    "python3",
    [
      "-c",
      [
        "import sys",
        "from PIL import Image",
        "src, dst = sys.argv[1], sys.argv[2]",
        "img = Image.open(src).convert('RGB')",
        "w = 860",
        "img = img.resize((w, round(img.height * w / img.width)), Image.LANCZOS)",
        "img.save(dst, 'WEBP', quality=82, method=6)",
      ].join("\n"),
      file,
      path.join(OUT, `${name}.webp`),
    ],
    { stdio: "inherit" },
  );
  console.log(`${name} -> public/shots/${name}.webp`);
}

await browser.close();
rmSync(staging, { recursive: true, force: true });
