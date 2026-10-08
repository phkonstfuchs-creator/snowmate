import { expect, test } from "@playwright/test";

for (const viewport of [{ width: 320, height: 568 }, { width: 390, height: 844 }]) {
  test(`map remains the primary surface at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto("/demo/map");
    const stage = page.locator(".mountain-map-stage");
    await expect(stage).toBeVisible();
    const bounds = await stage.boundingBox();
    expect(bounds!.y).toBeLessThan(150);
    expect(bounds!.height).toBeGreaterThanOrEqual(260);
    expect(bounds!.y + bounds!.height).toBeLessThan(viewport.height - 70);
    expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);
    await expect(stage.getByRole("button", { name: "Salzburg", exact: true })).toBeVisible();
    await stage.getByRole("button", { name: "Salzburg", exact: true }).click();
    await expect(stage.getByRole("button", { name: "Salzburg", exact: true })).toHaveAttribute("aria-pressed", "true");
    const gallery = page.getByRole("region", { name: "All resorts" });
    await gallery.scrollIntoViewIfNeeded();
    const resort = gallery.getByRole("button").first();
    const name = await resort.getAttribute("aria-label");
    await resort.click();
    await expect(page.getByRole("dialog", { name: `Details for ${name}` })).toBeVisible();
  });
}
