import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import sharp from "sharp";

for (const width of [320, 390]) {
  test(`a rider finds a sourced lift and webcam without sharing at ${width}px`, async ({ page }, testInfo) => {
    await page.context().addCookies([{ name: "sm_locale", value: "en", domain: "127.0.0.1", path: "/" }]);
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/demo/map");
    await expect(page.locator(".maplibregl-canvas")).toBeVisible();
    const entry = page.getByRole("button", { name: "Pistes & lifts", exact: true });
    await expect(entry).toBeInViewport();
    await entry.click();
    const inventory = page.getByRole("dialog", { name: "Pistes & lifts", exact: true });
    await expect(inventory.getByText("25 mapped piste sections · 5 mapped lifts")).toBeVisible();
    await inventory.getByRole("searchbox").fill("Seegrubenbahn");
    await page.screenshot({ path: testInfo.outputPath(`inventory-${width}.png`) });
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    const inventoryA11y = await new AxeBuilder({ page }).include('[role="dialog"]').withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
    expect(inventoryA11y.violations).toEqual([]);
    await inventory.getByRole("button", { name: "Seegrubenbahn", exact: true }).click();
    const detail = page.getByRole("dialog", { name: "Seegrubenbahn", exact: true });
    await expect(page.getByRole("dialog")).toHaveCount(1);
    await expect(detail.getByText("Operational status unavailable", { exact: true })).toBeVisible();
    await expect(detail.getByText("Queue time unavailable", { exact: true })).toBeVisible();
    await expect(detail.getByRole("link", { name: "Nordkette webcams" })).toHaveAttribute("href", "https://nordkette.com/en/cams/");
    await expect(detail.getByRole("link", { name: "View on OpenStreetMap" })).toHaveAttribute("href", "https://www.openstreetmap.org/way/25170582");
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    const detailA11y = await new AxeBuilder({ page }).include('[role="dialog"]').withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
    expect(detailA11y.violations).toEqual([]);
    await page.screenshot({ path: testInfo.outputPath(`lift-${width}.png`) });
    await detail.getByRole("button", { name: "Close", exact: true }).click();
    await expect(detail).toHaveCount(0);
    await expect(entry).toBeInViewport();
    await page.screenshot({ path: testInfo.outputPath(`selected-map-${width}.png`) });
  });
}

test("the static inventory remains useful when map providers fail and stops at its region", async ({ page }) => {
  await page.context().addCookies([{ name: "sm_locale", value: "en", domain: "127.0.0.1", path: "/" }]);
  await page.route("https://tiles.openfreemap.org/**", (route) => route.abort());
  await page.route("https://*.tile.openstreetmap.org/**", (route) => route.abort());
  await page.goto("/demo/map");
  await expect(page.locator(".maplibregl-canvas")).toBeVisible();
  await page.getByRole("button", { name: "Pistes & lifts", exact: true }).click();
  const inventory = page.getByRole("dialog", { name: "Pistes & lifts", exact: true });
  await inventory.getByRole("searchbox").fill("Zweier");
  const sections = inventory.getByRole("button", { name: /2 - Zweier Skiroute.*Section/ });
  await expect(sections).toHaveCount(12);
  await sections.last().click();
  const detail = page.getByRole("dialog", { name: "2 - Zweier Skiroute", exact: true });
  await expect(detail).toBeVisible();
  await detail.getByRole("button", { name: "Close", exact: true }).click();
  await expect(detail).toHaveCount(0);
  await page.getByRole("button", { name: "Salzburg", exact: true }).click();
  await expect(page.getByRole("button", { name: "Pistes & lifts", exact: true })).toHaveCount(0);
});

test("tapping the rendered lift opens its canonical details", async ({ page }, testInfo) => {
  await page.context().addCookies([{ name: "sm_locale", value: "en", domain: "127.0.0.1", path: "/" }]);
  // Keep this renderer test independent of external tile services.
  await page.route("https://tiles.openfreemap.org/styles/positron", (route) => route.fulfill({
    json: { version: 8, sources: {}, layers: [{ id: "paper", type: "background", paint: { "background-color": "#edf1ec" } }] },
  }));
  await page.route("https://tiles.opensnowmap.org/**", (route) => route.abort());
  await page.route("https://s3.amazonaws.com/elevation-tiles-prod/**", (route) => route.abort());
  await page.goto("/demo/map");
  const canvas = page.locator(".maplibregl-canvas");
  await expect(canvas).toBeVisible();
  await page.getByRole("button", { name: "Pistes & lifts", exact: true }).click();
  const inventory = page.getByRole("dialog", { name: "Pistes & lifts", exact: true });
  await inventory.getByRole("searchbox").fill("Seegrubenbahn");
  await inventory.getByRole("button", { name: "Seegrubenbahn", exact: true }).click();
  await page.getByRole("dialog", { name: "Seegrubenbahn", exact: true }).getByRole("button", { name: "Close", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  // The documented camera flight lasts 800 ms; project a source coordinate
  // after it completes, without exposing MapLibre internals on the window.
  await page.waitForTimeout(1000);
  const box = await canvas.boundingBox();
  expect(box).not.toBeNull();
  if (!box) throw new Error("The rendered map must have a viewport");
  const mercatorY = (lat: number) => (1 - Math.log(Math.tan(Math.PI / 4 + lat * Math.PI / 360)) / Math.PI) / 2;
  const center = { lng: (11.3797446 + 11.3990069) / 2, lat: (47.2861686 + 47.3063876) / 2 };
  const point = { lng: 11.3904186, lat: 47.2951844 };
  const scale = 512 * 2 ** 12;
  const screenshot = await page.screenshot({ path: testInfo.outputPath("rendered-lift.png") });
  const pixels = await sharp(screenshot).removeAlpha().raw().toBuffer();
  let highlightedPixels = 0;
  for (let i = 0; i < pixels.length; i += 3) {
    const red = pixels[i] ?? 0;
    const green = pixels[i + 1] ?? 0;
    const blue = pixels[i + 2] ?? 0;
    if (red > 230 && green > 140 && green < 190 && blue < 100) highlightedPixels++;
  }
  expect(highlightedPixels, "The selected lift must remain visibly highlighted after closing its details").toBeGreaterThan(30);
  await page.mouse.click(box.x + box.width / 2 + (point.lng - center.lng) / 360 * scale,
    box.y + box.height / 2 + (mercatorY(point.lat) - mercatorY(center.lat)) * scale);
  await expect(page.getByRole("dialog", { name: "Seegrubenbahn", exact: true })).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(1);
});

test("resort scene keeps its snow-depth badge in front", async ({ page }) => {
  await page.context().addCookies([{ name: "sm_locale", value: "en", domain: "127.0.0.1", path: "/" }]);
  await page.goto("/demo/map");
  await page.getByRole("region", { name: "All resorts", exact: true }).getByRole("button", { name: "Nordkette", exact: true }).click();
  const detail = page.getByRole("dialog", { name: /Nordkette/ });
  const badge = detail.getByText("85 cm", { exact: true });
  await expect(badge).toBeVisible();
  await expect.poll(() => badge.evaluate((element) => {
    const box = element.getBoundingClientRect();
    return element.contains(document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2));
  })).toBe(true);
});
