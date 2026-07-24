import {
  expect,
  test,
  type APIRequestContext,
  type BrowserContext,
} from "@playwright/test";

interface MailpitSearchResult {
  messages?: Array<{
    ID?: string;
  }>;
}

const localSupabaseEnabled = process.env.LOCAL_SUPABASE_E2E === "1";

async function waitForConfirmationLink(
  request: APIRequestContext,
  context: BrowserContext,
  mailpitUrl: string,
  email: string,
): Promise<string> {
  const deadline = Date.now() + 20_000;
  const messagePage = await context.newPage();

  try {
    while (Date.now() < deadline) {
      const searchResponse = await request.get(
        `${mailpitUrl}/api/v1/search`,
        {
          params: {
            query: `to:"${email}"`,
            limit: 1,
          },
        },
      );

      if (searchResponse.ok()) {
        const result = (await searchResponse.json()) as MailpitSearchResult;
        const messageId = result.messages?.[0]?.ID;

        if (messageId) {
          const emailResponse = await request.get(
            `${mailpitUrl}/view/${encodeURIComponent(messageId)}.html`,
          );

          if (emailResponse.ok()) {
            await messagePage.setContent(await emailResponse.text());
            const confirmationLink = await messagePage
              .locator('a[href*="/auth/confirm"]')
              .first()
              .getAttribute("href");

            if (confirmationLink) {
              return confirmationLink;
            }
          }
        }
      }

      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  } finally {
    await messagePage.close();
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
    context,
  }) => {
    const mailpitUrl = process.env.MAILPIT_URL;

    if (!mailpitUrl) {
      throw new Error("MAILPIT_URL is required for the local auth E2E test.");
    }

    const email = `snowmate-e2e-${crypto.randomUUID()}@example.com`;
    const password = "Snowmate2026Pass";

    await page.goto("/signup");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page.getByLabel("Confirm password").fill(password);
    await page.getByRole("button", { name: "Create account" }).click();

    await expect(page.getByText("Request received")).toBeVisible();

    const confirmationLink = await waitForConfirmationLink(
      request,
      context,
      mailpitUrl,
      email,
    );

    await page.goto(confirmationLink);
    await expect(page).toHaveURL(/\/feed$/);
    await expect(page.getByText("Snowmate").first()).toBeVisible();

    await page.goto(new URL("/profile", page.url()).toString());
    await page.getByRole("button", { name: "Log out" }).click();
    await expect(page).toHaveURL(/\/login$/);

    await page.goto(new URL("/feed", page.url()).toString());
    await expect(page).toHaveURL(/\/login$/);

    await page.goto(new URL("/signup", page.url()).toString());
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page.getByLabel("Confirm password").fill(password);
    await page.getByRole("button", { name: "Create account" }).click();

    await expect(page.getByText("Request received")).toBeVisible();
    await expect(
      page.getByText(
        "If this address can be used, you'll receive a confirmation email shortly.",
      ),
    ).toBeVisible();
    await page.getByRole("link", { name: "Back to login" }).click();

    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: "Log in" }).click();

    await expect(page).toHaveURL(/\/feed$/);
  });
});
