import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

for (const width of [320, 390]) {
  test(`a rider finds a sourced lift and webcam without sharing at ${width}px`, async ({ page }, testInfo) => {
    await page.context().addCookies([{ name: "sm_locale", value: "en", domain: "127.0.0.1", path: "/" }]);
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/demo/map");
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
