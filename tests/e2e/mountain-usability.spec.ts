import { expect, test } from "@playwright/test";

for (const width of [320, 390]) {
  test(`mountain screens stay within ${width}px and discovery accepts touch swipes`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 844 });
    for (const path of ["feed", "map", "people", "profile", "crew"]) {
      await page.goto(`/demo/${path}`);
      await expect(page.locator("main")).toBeVisible();
      expect(await page.evaluate(() => ({ document: document.documentElement.scrollWidth, body: document.body.scrollWidth }))).toEqual({ document: width, body: width });
      await page.screenshot({ path: testInfo.outputPath(`${path}-${width}.png`) });
      if (path === "map") await expect(page.getByRole("dialog")).toHaveCount(0);
    }
    await page.goto("/demo/people");
    await page.getByRole("switch").click();
    const heading = page.locator("h2").first();
    await expect(heading).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath(`people-active-${width}.png`) });
    const name = await heading.textContent();
    const surface = page.locator("section[aria-label]").filter({ has: heading }).locator("div").first();
    const box = (await surface.boundingBox())!;
    const touch = await page.context().newCDPSession(page);
    const x = box.x + box.width * 0.75;
    const y = box.y + Math.min(box.height / 2, 100);
    await touch.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] });
    await touch.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: x - 135, y }] });
    await expect(surface).not.toHaveCSS("transform", "matrix(1, 0, 0, 1, 0, 0)");
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
    await touch.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await expect(page.getByRole("heading", { name: name!, exact: true })).toHaveCount(0);
    await touch.detach();
  });
}
