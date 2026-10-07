import { expect, test } from "@playwright/test";

test("lift meetup sample works without signing in or sharing a real position", async ({ page }) => {
  await page.goto("/demo/map");

  const tryout = page.getByRole("region", { name: "Try the lift meetup" });
  await expect(tryout).toBeVisible();
  await expect(tryout.getByText(/No account needed; no GPS, push notification, or saved data/)).toBeVisible();

  await tryout.getByRole("button", { name: "Start sample" }).click();
  await expect(tryout.getByText(/Lena is estimated at Seegrube/)).toBeVisible();
  await expect(tryout.getByText(/For you: take Seegrubenbahn/)).toBeVisible();

  await tryout.getByRole("button", { name: "Reset sample" }).click();
  await expect(tryout.getByText(/Lena is estimated/)).toHaveCount(0);
});
