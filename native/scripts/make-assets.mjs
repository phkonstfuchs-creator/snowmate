/* Renders the store app icons and splash screens from the "pistl."
   wordmark, so they match the web icons. Run from the repo root after
   `npm ci`:  node native/scripts/make-assets.mjs
   Uses the root project's Playwright, Chromium and sharp. */
import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

const root = process.cwd();
const require = createRequire(path.join(root, "package.json"));
const { chromium } = require("playwright");
const sharp = require("sharp");

const font = readFileSync(path.join(root, "node_modules/@fontsource-variable/hanken-grotesk/files/hanken-grotesk-latin-wght-normal.woff2")).toString("base64");
const INK = "#202d27";
const PAPER = "#f6f7f4";

/* scale: font size as a share of the shorter side; background false = transparent */
function html(width, height, scale, background) {
  const size = Math.min(width, height);
  return `<!doctype html><html><head><style>
  @font-face { font-family: H; src: url(data:font/woff2;base64,${font}) format("woff2"); font-weight: 100 900; }
  html,body{margin:0;width:${width}px;height:${height}px;background:${background ? PAPER : "transparent"}}
  .c{width:${width}px;height:${height}px;display:flex;align-items:center;justify-content:center}
  .w{font-family:H;font-weight:800;font-size:${size * scale}px;letter-spacing:-0.075em;line-height:1;color:${INK};
     transform:translate(${size * -0.004}px, ${-size * scale * 0.06}px)}
  .w span{margin-left:0.05em}
  </style></head><body><div class="c"><div class="w">pistl<span>.</span></div></div></body></html>`;
}

const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined });
async function render(file, width, height, scale, { background = true } = {}) {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
  await page.setContent(html(width, height, scale, background));
  await page.evaluate(() => document.fonts.ready);
  const png = await page.screenshot({ omitBackground: !background, type: "png" });
  await page.close();
  /* Store icons must not carry an alpha channel when opaque. */
  const out = background ? await sharp(png).flatten({ background: PAPER }).removeAlpha().png().toBuffer() : png;
  writeFileSync(path.join(root, "native", file), out);
}

const ios = "ios/App/App/Assets.xcassets";
await render(`${ios}/AppIcon.appiconset/AppIcon-512@2x.png`, 1024, 1024, 0.36);
for (const name of ["splash-2732x2732.png", "splash-2732x2732-1.png", "splash-2732x2732-2.png"]) {
  await render(`${ios}/Splash.imageset/${name}`, 2732, 2732, 0.07);
}

const res = "android/app/src/main/res";
const densities = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };
for (const [density, factor] of Object.entries(densities)) {
  const icon = Math.round(48 * factor);
  await render(`${res}/mipmap-${density}/ic_launcher.png`, icon, icon, 0.36);
  await render(`${res}/mipmap-${density}/ic_launcher_round.png`, icon, icon, 0.32);
  /* Adaptive icons crop to the inner 66%: keep the word smaller. */
  const fg = Math.round(108 * factor);
  await render(`${res}/mipmap-${density}/ic_launcher_foreground.png`, fg, fg, 0.24, { background: false });
}
const splashes = {
  "drawable/splash.png": [480, 320],
  "drawable-land-mdpi/splash.png": [480, 320], "drawable-land-hdpi/splash.png": [800, 480],
  "drawable-land-xhdpi/splash.png": [1280, 720], "drawable-land-xxhdpi/splash.png": [1600, 960],
  "drawable-land-xxxhdpi/splash.png": [1920, 1280],
  "drawable-port-mdpi/splash.png": [320, 480], "drawable-port-hdpi/splash.png": [480, 800],
  "drawable-port-xhdpi/splash.png": [720, 1280], "drawable-port-xxhdpi/splash.png": [960, 1600],
  "drawable-port-xxxhdpi/splash.png": [1280, 1920],
};
for (const [file, [width, height]] of Object.entries(splashes)) {
  await render(`${res}/${file}`, width, height, 0.16);
}
await browser.close();
