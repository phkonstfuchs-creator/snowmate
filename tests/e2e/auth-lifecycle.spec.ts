import {
  expect,
  test,
  type APIRequestContext,
  type Page,
} from "@playwright/test";

interface MailpitSearchResult {
  messages?: Array<{
    ID?: string;
  }>;
}

const localSupabaseEnabled = process.env.LOCAL_SUPABASE_E2E === "1";

/* The sign-up asks for the profile first, then the account. */
async function signUp(page: Page, email: string, password: string, handle: string) {
  await page.goto("/signup");
  await page.getByRole("button", { name: /Innsbruck/ }).click();
  await page.getByRole("button", { name: /Chill/ }).click();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await page.getByPlaceholder("Alex Rider").fill("E2E Rider");
  await page.getByLabel("Handle").fill(handle);
  await page.getByLabel("Birth date").fill("2000-01-15");
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByLabel("Confirm password").fill(password);
  await page.getByRole("button", { name: "Create account" }).click();
}

/* The confirmation email carries a code (typed into the app) and a link
   (fallback). Returns the code. */
async function waitForConfirmationCode(
  request: APIRequestContext,
  mailpitUrl: string,
  email: string,
): Promise<string> {
  const deadline = Date.now() + 20_000;

  while (Date.now() < deadline) {
    const searchResponse = await request.get(`${mailpitUrl}/api/v1/search`, {
      params: { query: `to:"${email}"`, limit: 1 },
    });

    if (searchResponse.ok()) {
      const result = (await searchResponse.json()) as MailpitSearchResult;
      const messageId = result.messages?.[0]?.ID;

      if (messageId) {
        const emailResponse = await request.get(
          `${mailpitUrl}/view/${encodeURIComponent(messageId)}.html`,
        );
        const code = emailResponse.ok()
          ? />\s*(\d{6,10})\s*</u.exec(await emailResponse.text())?.[1]
          : undefined;
        if (code) return code;
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  throw new Error(`No confirmation email arrived for ${email}.`);
}

test.describe("account lifecycle", () => {
  test.skip(
    !localSupabaseEnabled,
    "Requires the local Supabase stack used by CI.",
  );

  test("signs up, confirms, signs out and signs back in", async ({
    page,
    request,
  }) => {
    const mailpitUrl = process.env.MAILPIT_URL;

    if (!mailpitUrl) {
      throw new Error("MAILPIT_URL is required for the local auth E2E test.");
    }

    const email = `pistl-e2e-${crypto.randomUUID()}@example.com`;
    const password = "Pistl2026Pass";

    const handle = `e2e_${crypto.randomUUID().slice(0, 8)}`;
    await signUp(page, email, password, handle);

    await expect(page).toHaveURL(/\/signup\/verify$/);
    await expect(page.getByRole("heading", { name: "Check your inbox" })).toBeVisible();

    const code = await waitForConfirmationCode(request, mailpitUrl, email);
    await page.getByLabel("Code from the email").fill("000000");
    await page.getByRole("button", { name: "Confirm" }).click();
    await expect(page.getByText(/wrong or has expired/)).toBeVisible();

    await page.getByLabel("Code from the email").fill(code);
    await page.getByRole("button", { name: "Confirm" }).click();
    await expect(page).toHaveURL(/\/feed$/);
    await expect(page.getByText("Pistl").first()).toBeVisible();

    /* Every list loads through the real PostgREST and its request guard
       (a regression: the guard once broke all read-only functions). */
    for (const path of ["/feed", "/carpool", "/crew", "/map"]) {
      await page.goto(new URL(path, page.url()).toString());
      await expect(page.locator('[aria-busy="true"]')).toHaveCount(0);
      await expect(page.getByText(/could not be loaded/i)).toHaveCount(0);
    }

    await page.goto(new URL("/profile", page.url()).toString());
    /* The answers from the sign-up are the profile. */
    await expect(page.getByText(`@${handle}`)).toBeVisible();
    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page).toHaveURL(/\/login$/);

    await page.goto(new URL("/feed", page.url()).toString());
    await expect(page).toHaveURL(/\/login$/);

    await signUp(page, email, password, `e2e_${crypto.randomUUID().slice(0, 8)}`);

    /* An address that already has an account gets the same screen. */
    await expect(page).toHaveURL(/\/signup\/verify$/);
    await expect(page.getByRole("heading", { name: "Check your inbox" })).toBeVisible();
    await page.getByRole("link", { name: "Back to sign in" }).click();

    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Sign in" }).click();

    /* Either the feed opens or the form says why not; a failure then
       names the message instead of only the URL. */
    const formError = page.locator("p[role=alert]").filter({ hasText: /\S/ });
    await Promise.race([page.waitForURL(/\/feed$/), formError.waitFor()]);
    await expect(formError).toHaveCount(0);
    await expect(page).toHaveURL(/\/feed$/);
  });
});
