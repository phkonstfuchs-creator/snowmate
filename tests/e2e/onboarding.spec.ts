import { expect, test } from "@playwright/test";

test("onboarding is outside the authenticated app shell", async ({ page }) => {
  await page.goto("/onboarding");

  await expect(
    page.getByRole("heading", { name: "Find your crew. Today." }),
  ).toBeVisible();
  await expect(
    page.getByRole("navigation", { name: "Main navigation" }),
  ).toHaveCount(0);
});

test("a new user can finish onboarding and enter the app shell", async ({
  page,
}) => {
  await page.goto("/onboarding");

  await page.getByRole("button", { name: "Get started" }).click();
  await page.getByRole("button", { name: /Innsbruck/ }).click();
  await page.getByRole("button", { name: /Chill/ }).click();
  await page.getByPlaceholder("Alex Rider").fill("Alex Rider");
  await page.getByRole("button", { name: "Let's go" }).click();

  await expect(page).toHaveURL(/\/feed$/);
  await expect(
    page.getByRole("navigation", { name: "Main navigation" }),
  ).toBeVisible();
});

test("app responses include the baseline security headers", async ({ page }) => {
  const response = await page.goto("/feed");

  expect(response?.headers()["x-content-type-options"]).toBe("nosniff");
  expect(response?.headers()["x-frame-options"]).toBe("DENY");
  expect(response?.headers()["referrer-policy"]).toBe(
    "strict-origin-when-cross-origin",
  );
  expect(response?.headers()["content-security-policy"]).toContain(
    "default-src 'self'",
  );
  expect(response?.headers()["permissions-policy"]).toBe(
    "camera=(), microphone=(), geolocation=()",
  );
  expect(response?.headers()["strict-transport-security"]).toBe(
    "max-age=31536000",
  );
});
