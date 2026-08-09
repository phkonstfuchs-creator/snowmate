import { chromium } from "playwright";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

/* Nimmt die Screenshots fuer die Startseite neu auf.
 *
 *   npm run dev
 *   node scripts/capture-shots.mjs
 *
 * Aufnahme bei 430px Geraetebreite und Faktor 2, danach auf 860px
 * skaliert — das ist genau die Breite, in der die Startseite die
 * Bilder ausgibt. Groesser waere nur Ballast.
 */

const BASE = process.env.SHOT_BASE ?? "http://localhost:3000";
const OUT = path.resolve("public/shots");

/* Aus dem Demo-Bereich aufgenommen, weil dort dieselben Screens
   ohne Anmeldung erreichbar sind. Das Demo-Banner wird vor der
   Aufnahme entfernt, es gehoert nicht ins Produktbild. */
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

  // Demo-Banner ausblenden: es beschriftet den Prototyp, nicht das Produkt.
  await page.evaluate(() => {
    const banner = document.querySelector(".app-shell > div:first-child");
    if (banner && banner.textContent?.includes("Demo")) banner.remove();
  });

  // Karten und Animationen zur Ruhe kommen lassen
  await page.waitForTimeout(name === "map" ? 2500 : 700);

  const file = path.join(staging, `${name}.png`);
  await page.screenshot({ path: file });

  /* Skalieren und nach WebP ueber Pillow — cwebp ist auf dem Rechner
     nicht installiert, Pillow schon. */
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
