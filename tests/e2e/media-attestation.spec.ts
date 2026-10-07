import { randomBytes, randomUUID } from "node:crypto";
import sharp from "sharp";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { expect, test, type APIRequestContext } from "@playwright/test";
import { waitForConfirmationCode } from "./local-supabase-auth";

const localSupabaseEnabled = process.env.LOCAL_SUPABASE_E2E === "1";

interface TestAccount {
  client: SupabaseClient;
  id: string;
  email: string;
  password: string;
  handle: string;
}

async function createLocalAccount(request: APIRequestContext, url: string, key: string, mailpitUrl: string): Promise<TestAccount> {
  const client = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
  const email = `pistl-media-${randomUUID()}@example.com`;
  const password = `Pistl${randomBytes(12).toString("hex")}A1!`;
  const handle = `m${randomUUID().replaceAll("-", "").slice(0, 15)}`;
  const signup = await client.auth.signUp({
    email, password,
    options: { data: { display_name: "Media Test Rider", handle, city: "innsbruck", riding_styles: ["chill"], birth_date: "2000-01-15" } },
  });
  expect(signup.error).toBeNull();
  const code = await waitForConfirmationCode(request, mailpitUrl, email);
  const verified = await client.auth.verifyOtp({ email, token: code, type: "email" });
  expect(verified.error).toBeNull();
  expect(verified.data.session).not.toBeNull();
  const id = verified.data.user?.id;
  if (!id) throw new Error("Local account confirmation returned no user.");
  const profile = await client.from("profiles").select("onboarding_completed").eq("id", id).single();
  expect(profile.error).toBeNull();
  expect(profile.data?.onboarding_completed).toBe(true);
  return { client, id, email, password, handle };
}

test.describe("local media attestation", () => {
  test.skip(!localSupabaseEnabled, "Requires the local Supabase stack used by CI.");

  test("raw direct uploads stay private; certified app uploads are immutable and metadata-free", async ({ page, request }) => {
    test.setTimeout(120_000);
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    const mailpitUrl = process.env.MAILPIT_URL;
    if (!url || !key || !mailpitUrl || !["127.0.0.1", "localhost"].includes(new URL(url).hostname)) {
      throw new Error("Local Supabase URL, publishable key and Mailpit URL are required.");
    }

    const owner = await createLocalAccount(request, url, key, mailpitUrl);
    const friend = await createLocalAccount(request, url, key, mailpitUrl);
    const requested = await owner.client.rpc("request_friendship", { target_handle: friend.handle });
    expect(requested.error).toBeNull();
    expect(requested.data).toBe("requested");
    const accepted = await friend.client.rpc("accept_friendship", { requester: owner.id });
    expect(accepted.error).toBeNull();
    expect(accepted.data).toBe(true);

    const raw = await sharp({ create: { width: 30, height: 20, channels: 3, background: "white" } })
      .jpeg().withExif({ IFD0: { Copyright: "private-location-marker" } }).toBuffer();
    expect((await sharp(raw).metadata()).exif).toBeDefined();
    const rawAvatarPath = `${owner.id}/${randomUUID()}.jpg`;
    const rawAvatar = await owner.client.storage.from("avatars").upload(rawAvatarPath, raw, { contentType: "image/jpeg", upsert: false });
    expect(rawAvatar.error).toBeNull();
    const rawPointer = await owner.client.from("profiles").update({ avatar_path: rawAvatarPath }).eq("id", owner.id);
    expect(rawPointer.error).not.toBeNull();
    const rawAvatarRead = await friend.client.storage.from("avatars").download(rawAvatarPath);
    expect(rawAvatarRead.error).not.toBeNull();

    const rawPostPath = `${owner.id}/${randomUUID()}.jpg`;
    const rawPost = await owner.client.storage.from("post-photos").upload(rawPostPath, raw, { contentType: "image/jpeg", upsert: false });
    expect(rawPost.error).toBeNull();
    const rawPostPublish = await owner.client.rpc("create_post", { p_body: "Raw photo", p_resort: null, p_photo_path: rawPostPath });
    expect(rawPostPublish.error).toBeNull();
    expect(rawPostPublish.data).toBe("invalid");
    const rawPostRead = await friend.client.storage.from("post-photos").download(rawPostPath);
    expect(rawPostRead.error).not.toBeNull();

    await page.goto("/login");
    await page.getByLabel("Email").fill(owner.email);
    await page.getByLabel("Password", { exact: true }).fill(owner.password);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/feed$/);
    await page.goto("/profile");
    await page.getByRole("button", { name: "Edit profile" }).click();
    await page.locator('input[type="file"]').setInputFiles({ name: "location.jpg", mimeType: "image/jpeg", buffer: raw });
    await expect(page.getByRole("status").filter({ hasText: "Saved." })).toBeVisible();

    const profile = await owner.client.from("profiles").select("avatar_path").eq("id", owner.id).single();
    expect(profile.error).toBeNull();
    const certifiedPath = profile.data?.avatar_path as string | null;
    expect(certifiedPath).toMatch(new RegExp(`^${owner.id}/[0-9a-f-]{36}\\.webp$`));
    if (!certifiedPath) throw new Error("App upload did not publish an avatar path.");

    const friendRead = await friend.client.storage.from("avatars").download(certifiedPath);
    expect(friendRead.error).toBeNull();
    if (!friendRead.data) throw new Error("Friend could not read certified image.");
    const metadata = await sharp(Buffer.from(await friendRead.data.arrayBuffer())).metadata();
    expect(metadata.format).toBe("webp");
    expect(metadata.exif).toBeUndefined();
    expect(metadata.icc).toBeUndefined();

    const overwrite = await owner.client.storage.from("avatars").update(certifiedPath, raw, { contentType: "image/jpeg" });
    expect(overwrite.error).not.toBeNull();
    const upsert = await owner.client.storage.from("avatars").upload(certifiedPath, raw, { contentType: "image/jpeg", upsert: true });
    expect(upsert.error).not.toBeNull();
    const afterOverwrite = await friend.client.storage.from("avatars").download(certifiedPath);
    expect(afterOverwrite.error).toBeNull();
    if (!afterOverwrite.data) throw new Error("Certified image disappeared after denied overwrite.");
    expect((await sharp(Buffer.from(await afterOverwrite.data.arrayBuffer())).metadata()).exif).toBeUndefined();
  });
});
