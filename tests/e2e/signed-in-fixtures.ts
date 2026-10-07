import { randomBytes, randomUUID } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  devices, expect, test as base,
  type APIRequestContext, type Browser, type BrowserContext, type Page,
} from "@playwright/test";
import { waitForConfirmationCode } from "./local-supabase-auth";

type StorageState = Awaited<ReturnType<BrowserContext["storageState"]>>;
export interface LocalRider {
  client: SupabaseClient;
  id: string;
  email: string;
  password: string;
  handle: string;
  name: string;
  state: StorageState;
}
interface RiderPage { account: LocalRider; page: Page }
interface Accounts { a: LocalRider; b: LocalRider }
interface Journeys { a: RiderPage; b: RiderPage }

function localConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const mailpitUrl = process.env.MAILPIT_URL;
  if (!url || !key || !mailpitUrl ||
      !["127.0.0.1", "localhost"].includes(new URL(url).hostname) ||
      !["127.0.0.1", "localhost"].includes(new URL(mailpitUrl).hostname)) {
    throw new Error("Local Supabase URL, public key and Mailpit URL are required.");
  }
  // Never accept an administrative key, even on a mistakenly configured run.
  if (key.startsWith("sb_secret_")) throw new Error("A public Supabase key is required.");
  if (key.split(".").length === 3) {
    const claims = JSON.parse(Buffer.from(key.split(".")[1] ?? "", "base64url").toString()) as { role?: string };
    if (claims.role !== "anon") throw new Error("Only the anonymous public JWT key is allowed.");
  }
  return { url, key, mailpitUrl };
}

export function phoneContext(browser: Browser, baseURL: string, state?: StorageState) {
  return browser.newContext({ ...devices["iPhone 13"], baseURL, locale: "de-AT", storageState: state });
}

/** Real sign-up and email verification, then sign-in through the app UI.
 * Reuse accounts within this file to stay inside the unchanged Auth limits.
 * Every journey gets fresh browser contexts; no auth tables are seeded.
 */
export async function createRider(browser: Browser, request: APIRequestContext, baseURL: string, label: string): Promise<LocalRider> {
  const { url, key, mailpitUrl } = localConfig();
  const client = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
  const email = `pistl-journey-${randomUUID()}@example.com`;
  const password = `Pistl${randomBytes(12).toString("hex")}A1!`;
  const handle = `j${randomUUID().replaceAll("-", "").slice(0, 15)}`;
  const name = `Journey ${label} ${handle.slice(-5)}`;
  const signup = await client.auth.signUp({
    email, password,
    options: { data: { display_name: name, handle, city: "innsbruck", riding_styles: ["park"], birth_date: "2000-01-15" } },
  });
  expect(signup.error).toBeNull();
  const code = await waitForConfirmationCode(request, mailpitUrl, email);
  const verified = await client.auth.verifyOtp({ email, token: code, type: "email" });
  expect(verified.error).toBeNull();
  const id = verified.data.user?.id;
  if (!id || !verified.data.session) throw new Error("Local signup did not return a confirmed account.");
  const profile = await client.from("profiles").select("onboarding_completed").eq("id", id).single();
  expect(profile.error).toBeNull();
  expect(profile.data?.onboarding_completed).toBe(true);
  const context = await phoneContext(browser, baseURL);
  try {
    const page = await context.newPage();
    await page.goto("/login");
    await page.getByLabel("E-Mail", { exact: true }).fill(email);
    await page.getByLabel("Passwort", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Anmelden", exact: true }).click();
    await expect(page).toHaveURL(/\/feed$/);
    return { client, id, email, password, handle, name, state: await context.storageState() };
  } finally {
    await context.close();
  }
}

export const test = base.extend<{ riders: Journeys }, { accounts: Accounts }>({
  accounts: [async ({ browser, playwright }, provide, workerInfo) => {
    const baseURL = workerInfo.project.use.baseURL;
    if (!baseURL) throw new Error("Playwright baseURL is required.");
    const request = await playwright.request.newContext();
    try {
      const a = await createRider(browser, request, baseURL, "A");
      const b = await createRider(browser, request, baseURL, "B");
      await provide({ a, b });
    } finally {
      await request.dispose();
    }
  }, { scope: "worker", timeout: 90_000 }],
  riders: async ({ browser, accounts, baseURL }, provide) => {
    if (!baseURL) throw new Error("Playwright baseURL is required.");
    // Reset only our own relationship through public, authenticated RPCs.
    // Each test is independent, including retries and an earlier block.
    for (const [actor, other] of [[accounts.a, accounts.b], [accounts.b, accounts.a]] as const) {
      const unblocked = await actor.client.rpc("unblock_user", { target: other.id });
      expect(unblocked.error).toBeNull();
    }
    const removed = await accounts.a.client.rpc("remove_friendship", { other: accounts.b.id });
    expect(removed.error).toBeNull();
    const aContext = await phoneContext(browser, baseURL, accounts.a.state);
    const bContext = await phoneContext(browser, baseURL, accounts.b.state);
    try {
      await provide({
        a: { account: accounts.a, page: await aContext.newPage() },
        b: { account: accounts.b, page: await bContext.newPage() },
      });
    } finally {
      await aContext.close();
      await bContext.close();
    }
  },
});

export { expect };

export async function inviteFriend(a: RiderPage, b: RiderPage) {
  await a.page.goto("/crew");
  await a.page.getByRole("button", { name: "Einladungslink erstellen", exact: true }).click();
  const link = a.page.locator("p").filter({ hasText: /\/invite\/[a-f0-9]+/u });
  await expect(link).toHaveCount(1);
  const url = (await link.innerText()).trim();
  expect(new URL(url).origin).toBe(new URL(a.page.url()).origin);
  await b.page.goto(url);
  await expect(b.page.getByRole("heading")).toContainText(a.account.name);
  await b.page.getByRole("button", { name: "Zu meiner Crew hinzufügen", exact: true }).click();
  await expect(b.page.getByRole("status")).toHaveText("Ihr seid jetzt befreundet.");
  await b.page.getByRole("link", { name: "Zu deiner Crew", exact: true }).click();
  await expect(b.page).toHaveURL(/\/crew$/);
}

export async function createRide(page: Page, caption: string) {
  await page.goto("/feed");
  await page.getByRole("button", { name: "Ride posten", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Ride posten", exact: true });
  await dialog.getByLabel("Skigebiet", { exact: true }).selectOption({ label: "Nordkette" });
  await dialog.getByRole("button", { name: /Park/ }).click();
  await dialog.getByRole("button", { name: "Weiter", exact: true }).click();
  await dialog.getByLabel("Treffpunkt", { exact: true }).fill("Talstation");
  await dialog.locator("#post-ride-caption").fill(caption);
  await dialog.getByRole("button", { name: "Veröffentlichen", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole("article").filter({ hasText: caption })).toBeVisible();
}

export async function openRide(page: Page, caption: string) {
  await page.getByRole("article").filter({ hasText: caption }).click();
  const dialog = page.getByRole("dialog", { name: "Ride-Details", exact: true });
  await expect(dialog).toBeVisible();
  return dialog;
}

export async function openChat(page: Page, other: LocalRider) {
  await page.goto("/crew");
  await page.getByRole("button", { name: `Nachricht an ${other.name}`, exact: true }).click();
  await expect(page).toHaveURL(/\/crew\/chat\/[a-f0-9-]+/u);
  await expect(page.getByRole("heading", { name: other.name, exact: true })).toBeVisible();
}

export async function sendMessage(page: Page, body: string) {
  await page.getByLabel("Nachricht schreiben…", { exact: true }).fill(body);
  await page.getByRole("button", { name: "Senden", exact: true }).click();
  await expect(page.locator("ol").getByText(body, { exact: true })).toBeVisible();
}

export async function composePost(page: Page, body: string) {
  await page.goto("/feed");
  await page.getByRole("button", { name: "Skitag teilen", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Skitag teilen", exact: true });
  await dialog.getByLabel("Was war los?", { exact: true }).fill(body);
  return dialog;
}

/** Fail on read errors before checking absence, to avoid a false privacy pass. */
export async function postBodies(account: LocalRider): Promise<string[]> {
  const result = await account.client.rpc("list_post_feed");
  expect(result.error).toBeNull();
  expect(Array.isArray(result.data)).toBe(true);
  return (result.data as Array<{ body: string }>).map((row) => row.body);
}
