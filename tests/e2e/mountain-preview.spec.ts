import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

for (const width of [320, 390]) {
  test(`preview stays within ${width}px; meetup and Go are visible immediately`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/preview/mountain");
    const nav = page.getByRole("navigation", { name: "Hauptnavigation" });
    await expect(page.getByRole("button", { name: "Treffpunkt ansehen", exact: true })).toBeInViewport();
    await expect(page.getByRole("button", { name: "Skitag planen", exact: true })).toBeInViewport();
    await page.screenshot({ path: testInfo.outputPath(`today-${width}.png`) });
    for (const name of ["Heute", "Berg", "Crew", "Ich"]) {
      await nav.getByRole("button", { name, exact: true }).click();
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
      await expect(nav).toBeInViewport();
      await page.screenshot({ path: testInfo.outputPath(`${name}-${width}.png`) });
    }
    await nav.getByRole("button", { name: "Heute", exact: true }).click();
    await page.getByRole("button", { name: "Skitag planen", exact: true }).click();
    await expect(page.getByRole("dialog", { name: "Pistl Go" })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
    await page.screenshot({ path: testInfo.outputPath(`go-${width}.png`) });
  });
}

test("a new rider plans privately, then scrubs and plays an explicitly sample replay", async ({ page }) => {
  await page.goto("/preview/mountain");
  await page.getByRole("button", { name: "Skitag planen", exact: true }).click();
  await page.getByRole("button", { name: "Stubai", exact: true }).click();
  await page.getByRole("button", { name: "Weiter", exact: true }).click();
  await page.getByRole("radio", { name: "Bin mobil", exact: true }).check();
  await page.getByRole("button", { name: "Weiter", exact: true }).click();
  await page.getByRole("button", { name: "Skitag vormerken", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Dein Plan steht.", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Treffpunkt ansehen", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Mutterberg Talstation", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Schließen", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("button", { name: "Berg", exact: true }).click();
  await page.getByRole("button", { name: "Mein Tag", exact: true }).click();
  await expect(page.getByRole("button", { name: "Wiedergabe starten", exact: true })).toBeVisible();
  await expect(page.getByText("Beispielroute · keine GPS-Aufnahme", { exact: true })).toBeVisible();
  await page.getByRole("slider", { name: "Wiedergabezeit" }).fill("50");
  await expect(page.getByRole("heading", { name: "Wiedergabe · 10:33:00", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Wiedergabe starten", exact: true }).click();
  await page.getByRole("button", { name: "Heute", exact: true }).click();
  await page.getByRole("button", { name: "Berg", exact: true }).click();
  await expect(page.getByRole("button", { name: "Wiedergabe starten", exact: true })).toBeVisible();
});

test("map provider outage retains the imported feature picker and honest status", async ({ page }) => {
  await page.route("https://tiles.openfreemap.org/**", (route) => route.abort());
  await page.goto("/preview/mountain");
  await page.getByRole("button", { name: "Berg", exact: true }).click();
  await expect(page.getByText(/Kartenanbieter nicht erreichbar/)).toBeVisible();
  await page.getByRole("searchbox", { name: "Piste oder Lift suchen" }).fill("Seegrubenbahn");
  await page.getByRole("button", { name: "Seegrubenbahn auswählen", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Seegrubenbahn", exact: true })).toBeVisible();
  await expect(page.getByText("Betriebsstatus unbekannt", { exact: true })).toBeVisible();
  await expect(page.getByText(/Wartezeit unbekannt/)).toBeVisible();
});

test("crew tabs accept a real touch swipe and retain accessible keyboard tabs", async ({ page }) => {
  await page.goto("/preview/mountain");
  await page.getByRole("button", { name: "Crew", exact: true }).click();
  const box = (await page.getByRole("tabpanel").boundingBox())!;
  const touch = await page.context().newCDPSession(page);
  const x = box.x + box.width * .8;
  const y = box.y + 20;
  await touch.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] });
  await touch.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: x - 150, y: y + 3 }] });
  await touch.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await expect(page.getByRole("tab", { name: "Entdecken", exact: true })).toHaveAttribute("aria-selected", "true");
  await page.getByRole("tab", { name: "Entdecken", exact: true }).press("ArrowLeft");
  await expect(page.getByRole("tab", { name: "Meine Crew", exact: true })).toBeFocused();
  await page.getByRole("tab", { name: "Entdecken", exact: true }).click();
  const card = (await page.getByRole("group", { name: "Rider-Vorschau" }).boundingBox())!;
  const cardX = card.x + card.width * .75;
  const cardY = card.y + 80;
  await touch.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: cardX, y: cardY }] });
  await touch.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: cardX - 140, y: cardY + 2 }] });
  await touch.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await expect(page.getByRole("heading", { name: "Noah", exact: true })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Entdecken", exact: true })).toHaveAttribute("aria-selected", "true");
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
  await touch.detach();
});

test("main screens and planning sheet meet automated accessibility checks", async ({ page }) => {
  await page.goto("/preview/mountain");
  for (const name of ["Heute", "Crew", "Ich"]) {
    await page.getByRole("navigation").getByRole("button", { name, exact: true }).click();
    const result = await new AxeBuilder({ page }).include("main").withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
    expect(result.violations).toEqual([]);
  }
  await page.getByRole("button", { name: "Heute", exact: true }).click();
  await page.getByRole("button", { name: "Skitag planen", exact: true }).click();
  const result = await new AxeBuilder({ page }).include('[role="dialog"]').withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  expect(result.violations).toEqual([]);
});

test("all winter route sections remain reachable in the scrollable search", async ({ page }) => {
  await page.goto("/preview/mountain");
  await page.getByRole("button", { name: "Berg", exact: true }).click();
  await page.getByRole("searchbox", { name: "Piste oder Lift suchen" }).fill("Zweier");
  const sections = page.getByRole("button", { name: "2 - Zweier Skiroute auswählen", exact: true });
  await expect(sections).toHaveCount(12);
  await sections.last().click();
  await expect(page.getByRole("heading", { name: "2 - Zweier Skiroute", exact: true })).toBeVisible();
});

test("webcam, offline and meetup sheets stay reachable on short landscape screens", async ({ page }) => {
  await page.setViewportSize({ width: 844, height: 390 });
  await page.goto("/preview/mountain");
  for (const name of ["Webcams", "Offlinekarte", "Treffpunkt ansehen"]) {
    await page.getByRole("button", { name, exact: true }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    const bounds = await dialog.boundingBox();
    expect(bounds!.y).toBeGreaterThanOrEqual(0);
    expect(bounds!.height).toBeLessThanOrEqual(390);
    await expect(dialog.getByRole("heading", { level: 2 })).toBeInViewport();
    await expect(dialog.getByRole("button", { name: "Schließen", exact: true })).toBeInViewport();
    await dialog.getByRole("button", { name: "Schließen", exact: true }).click();
    await expect(dialog).toHaveCount(0);
  }
});
