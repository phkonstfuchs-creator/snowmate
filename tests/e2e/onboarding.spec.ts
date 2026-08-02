import { expect, test } from "@playwright/test";

test("onboarding is outside the authenticated app shell", async ({ page }) => {
  await page.goto("/onboarding");

  await expect(
    page.getByRole("heading", { name: "Finde deine Crew" }),
  ).toBeVisible();
  await expect(
    page.getByRole("navigation", { name: "Hauptnavigation" }),
  ).toHaveCount(0);
});

test("a new user can finish onboarding and continue to account creation", async ({
  page,
}) => {
  await page.goto("/onboarding");

  await page.getByRole("button", { name: "Los geht\u2019s" }).click();
  await page.getByRole("button", { name: /Innsbruck/ }).click();
  await page.getByRole("button", { name: /Chill/ }).click();
  await page.getByPlaceholder("Alex Rider").fill("Alex Rider");
  await page.getByRole("button", { name: "Account erstellen" }).click();

  await expect(page).toHaveURL(/\/signup$/);
  await expect(
    page.getByRole("heading", { name: "Account erstellen" }),
  ).toBeVisible();
  await expect(
    page.getByRole("navigation", { name: "Hauptnavigation" }),
  ).toHaveCount(0);
});

test("app responses include the baseline security headers", async ({ page }) => {
  const response = await page.goto("/feed");

  await expect(page).toHaveURL(/\/login$/);
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
