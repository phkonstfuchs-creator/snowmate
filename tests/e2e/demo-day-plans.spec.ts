import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("the English demo plans locally, edits and deletes the plan, and only prepares a ride", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.context().addCookies([{ name: "sm_locale", value: "en", domain: "127.0.0.1", path: "/" }]);

  const dayPlanRpcCalls: string[] = [];
  page.on("request", (request) => {
    const { pathname } = new URL(request.url());
    if (/\/rest\/v1\/rpc\/(list_my_day_plans|save_day_plan|delete_day_plan)$/u.test(pathname)) {
      dayPlanRpcCalls.push(`${request.method()} ${pathname}`);
    }
  });

  await page.goto("/demo/feed");
  await expect(page.getByRole("button", { name: /Pistl Go/ })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("demo-feed-390.png") });

  await page.getByRole("button", { name: /Pistl Go/ }).click();
  const chooser = page.getByRole("dialog", { name: "Pistl Go", exact: true });
  await expect(chooser).toBeVisible();
  await expect(chooser.getByText(/Private ski days/)).toBeVisible();
  await chooser.getByRole("button", { name: "Plan a ski day", exact: true }).click();

  const planner = page.getByRole("dialog", { name: "Pistl Go", exact: true });
  await planner.locator("#day-plan-resort").selectOption("Nordkette");
  await planner.locator("#day-plan-time").fill("10:45");
  await planner.getByRole("button", { name: "Next", exact: true }).click();
  await planner.getByRole("radio", { name: /I need a lift/ }).check();
  await expect(planner.getByText(/No seat is reserved/)).toBeVisible();
  await planner.getByRole("button", { name: "Next", exact: true }).click();
  await planner.locator("#day-plan-meeting-text").fill("Nordkette main entrance");

  await page.setViewportSize({ width: 320, height: 560 });
  await expect(planner).toBeVisible();
  const sheetBox = await planner.boundingBox();
  expect(sheetBox).not.toBeNull();
  expect(sheetBox!.y).toBeGreaterThanOrEqual(0);
  expect(sheetBox!.y + sheetBox!.height).toBeLessThanOrEqual(560);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
  await page.screenshot({ path: testInfo.outputPath("day-plan-sheet-320x560.png") });
  const plannerA11y = await new AxeBuilder({ page }).include('[role="dialog"]').withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  expect(plannerA11y.violations).toEqual([]);

  await planner.getByRole("button", { name: "Save private plan", exact: true }).click();
  await expect(planner).toHaveCount(0);
  const overview = page.getByRole("region", { name: "Your private ski days", exact: true });
  await expect(overview.getByText("Nordkette main entrance", { exact: true })).toBeVisible();
  await expect(overview.getByText(/Demo plans stay on this page until reload/)).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
  await page.screenshot({ path: testInfo.outputPath("day-plan-overview-320.png") });

  await page.setViewportSize({ width: 390, height: 844 });
  const overviewA11y = await new AxeBuilder({ page }).include('[aria-label="Your private ski days"]').withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  expect(overviewA11y.violations).toEqual([]);
  await page.screenshot({ path: testInfo.outputPath("day-plan-overview-390.png") });

  await overview.getByRole("button", { name: /Nordkette/ }).click();
  const editSheet = page.getByRole("dialog", { name: "Pistl Go", exact: true });
  await editSheet.getByRole("button", { name: "Next", exact: true }).click();
  await editSheet.getByRole("button", { name: "Next", exact: true }).click();
  await editSheet.locator("#day-plan-meeting-text").fill("Nordkette west entrance");
  await editSheet.getByRole("button", { name: "Save private plan", exact: true }).click();
  await expect(editSheet).toHaveCount(0);
  await expect(overview.getByText("Nordkette west entrance", { exact: true })).toBeVisible();
  await expect(overview.getByText("Nordkette main entrance", { exact: true })).toHaveCount(0);

  await overview.getByRole("button", { name: "Prepare a ride", exact: true }).click();
  const ride = page.getByRole("dialog", { name: "Post a ride", exact: true });
  await expect(ride.locator("#post-ride-resort")).toHaveValue("Nordkette");
  await expect(ride.getByRole("button", { name: "Next", exact: true })).toBeDisabled();
  await ride.getByRole("button", { name: /Park/ }).click();
  await ride.getByRole("button", { name: "Next", exact: true }).click();
  await expect(ride.locator("#post-ride-meeting-point")).toHaveValue("Nordkette west entrance");
  await expect(ride.locator("#post-ride-time")).toHaveValue("10:45");
  const rideA11y = await new AxeBuilder({ page }).include('[role="dialog"]').withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  expect(rideA11y.violations).toEqual([]);
  expect(dayPlanRpcCalls).toEqual([]);
  await ride.getByRole("button", { name: "Back", exact: true }).click();
  await ride.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(ride).toHaveCount(0);

  await overview.getByRole("button", { name: /Nordkette/ }).click();
  const deleteSheet = page.getByRole("dialog", { name: "Pistl Go", exact: true });
  await deleteSheet.getByRole("button", { name: "Delete plan", exact: true }).click();
  const confirm = deleteSheet.getByRole("group", { name: "Delete this plan?", exact: true });
  await expect(confirm).toBeVisible();
  await expect(confirm.getByRole("button", { name: "Cancel", exact: true })).toBeFocused();
  await confirm.getByRole("button", { name: "Confirm delete", exact: true }).click();
  await expect(deleteSheet).toHaveCount(0);
  await expect(page.getByText("Nordkette west entrance", { exact: true })).toHaveCount(0);
  expect(dayPlanRpcCalls).toEqual([]);
});
