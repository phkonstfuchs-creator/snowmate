import { execFileSync } from "node:child_process";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Page } from "@playwright/test";
import {
  TERMS_VERSION,
  PRIVACY_VERSION,
} from "../../features/compliance/versions";

export interface LocalRider {
  id: string;
  email: string;
  password: string;
  client: SupabaseClient;
}

function localStack() {
  if (process.env.LOCAL_SUPABASE_E2E !== "1") {
    throw new Error("Local fixture access must be explicitly enabled.");
  }
  const workdir = process.env.LOCAL_SUPABASE_WORKDIR;
  const args = ["supabase", "status", "--output", "json"];
  if (workdir) args.push("--workdir", workdir);
  const status = JSON.parse(
    execFileSync("npx", args, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }),
  );
  const url = new URL(status.API_URL);
  if (process.env.LOCAL_SUPABASE_E2E !== "1" || url.hostname !== "127.0.0.1") {
    throw new Error(
      "Crew fixtures require the explicitly enabled local Supabase stack.",
    );
  }
  if (status.API_URL !== process.env.NEXT_PUBLIC_SUPABASE_URL) {
    throw new Error(
      "Browser app and test fixtures must use the same local Supabase stack.",
    );
  }
  const container =
    process.env.LOCAL_SUPABASE_DB_CONTAINER ?? "supabase_db_snowmate-dev";
  if (!/^supabase_db_[a-z0-9-]+$/.test(container))
    throw new Error("Invalid local test container.");
  return { status, container };
}

function requireLocalFixtureEmail(email: string): string {
  if (!/^(?:pistl|crew)-e2e-[a-z0-9-]{8,64}@example\.com$/.test(email)) {
    throw new Error("Invalid generated local fixture email.");
  }
  return email;
}

export function createLocalBetaInvite(email: string): string {
  const safeEmail = requireLocalFixtureEmail(email);
  const { container } = localStack();
  return execFileSync(
    "docker",
    [
      "exec",
      container,
      "psql",
      "-U",
      "postgres",
      "-d",
      "postgres",
      "-At",
      "-c",
      `select private.create_beta_invite('${safeEmail}');`,
    ],
    { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
  ).trim();
}

export async function cleanupLocalAccountByEmail(email: string): Promise<void> {
  const safeEmail = requireLocalFixtureEmail(email);
  const { status, container } = localStack();
  const id = execFileSync(
    "docker",
    [
      "exec",
      container,
      "psql",
      "-U",
      "postgres",
      "-d",
      "postgres",
      "-At",
      "-c",
      `select id from auth.users where email = '${safeEmail}';`,
    ],
    { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
  ).trim();
  if (id) {
    if (!/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(id)) {
      throw new Error("Invalid local fixture account identifier.");
    }
    const admin = createClient(status.API_URL, status.SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const result = await admin.auth.admin.deleteUser(id);
    if (result.error) throw new Error("Local auth fixture cleanup failed.");
  }
  execFileSync(
    "docker",
    [
      "exec",
      container,
      "psql",
      "-U",
      "postgres",
      "-d",
      "postgres",
      "-At",
      "-c",
      `begin; delete from private.signup_admissions where email = '${safeEmail}'; delete from private.beta_invites where email = '${safeEmail}'; commit;`,
    ],
    { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
  );
}

export async function createLocalCrew(): Promise<
  readonly [LocalRider, LocalRider]
> {
  const { status } = localStack();
  const options = { auth: { persistSession: false, autoRefreshToken: false } };
  const admin = createClient(status.API_URL, status.SERVICE_ROLE_KEY, options);
  async function rider(name: string): Promise<LocalRider> {
    const suffix = crypto.randomUUID().replaceAll("-", "");
    const email = `crew-e2e-${suffix}@example.com`;
    const password = `Sm9!${crypto.randomUUID()}`;
    // Generated email contains no SQL metacharacters; this command only reaches the local test container.
    const token = createLocalBetaInvite(email);
    const client = createClient(
      status.API_URL,
      status.PUBLISHABLE_KEY ?? status.ANON_KEY,
      options,
    );
    const signup = await client.auth.signUp({
      email,
      password,
      options: {
        data: {
          invite_token: token,
          birth_date: "2000-01-01",
          terms_version: TERMS_VERSION,
          privacy_version: PRIVACY_VERSION,
        },
      },
    });
    if (signup.error || !signup.data.user)
      throw new Error("Local crew account creation failed.");
    const id = signup.data.user.id;
    const confirmation = await admin.auth.admin.updateUserById(id, {
      email_confirm: true,
    });
    if (confirmation.error) throw new Error("Local crew confirmation failed.");
    const signin = await client.auth.signInWithPassword({ email, password });
    if (signin.error) throw new Error("Local crew sign-in failed.");
    const profile = await client.rpc("complete_own_profile", {
      p_display_name: name,
      p_handle: `crew_${suffix.slice(0, 12)}`,
      p_city: "innsbruck",
      p_ability_level: "chill",
    });
    if (profile.error || profile.data !== true)
      throw new Error("Local crew profile completion failed.");
    return { id, email, password, client };
  }
  const host = await rider("Crew Host");
  const member = await rider("Crew Member");
  const friendship = await host.client.rpc("request_friendship", {
    p_target_id: member.id,
    p_idempotency_key: crypto.randomUUID(),
  });
  if (friendship.error)
    throw new Error("Local crew friendship request failed.");
  const accepted = await member.client.rpc("respond_friendship", {
    p_friendship_id: friendship.data,
    p_accept: true,
    p_idempotency_key: crypto.randomUUID(),
  });
  if (accepted.error)
    throw new Error("Local crew friendship confirmation failed.");
  return [host, member];
}

export async function loginLocalRider(page: Page, rider: LocalRider) {
  await page.goto("/login");
  await page.getByLabel("E-Mail").fill(rider.email);
  await page.getByLabel("Passwort", { exact: true }).fill(rider.password);
  await page.getByRole("button", { name: "Anmelden" }).click();
  await page.waitForURL("**/feed", { timeout: 15_000 });
}

export async function disposeLocalRider(rider: LocalRider) {
  const { status } = localStack();
  const admin = createClient(status.API_URL, status.SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const result = await admin.auth.admin.deleteUser(rider.id);
  if (result.error) throw new Error("Local crew fixture cleanup failed.");
}

export function localDepartureTime(): string {
  const value = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const local = new Date(value.getTime() - value.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}
