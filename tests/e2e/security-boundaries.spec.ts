import { expect, test } from "@playwright/test";

test("request CSP nonce cannot be supplied by a visitor and client UI hydrates", async ({ page }) => {
  await page.setExtraHTTPHeaders({ "x-nonce": "attacker-chosen-nonce" });
  const response = await page.goto("/demo/map");
  expect(response?.status()).toBe(200);

  const policy = response?.headers()["content-security-policy"] ?? "";
  const nonce = /'nonce-([A-Za-z0-9+/=]+)'/u.exec(policy)?.[1];
  expect(nonce).toBeTruthy();
  expect(policy).not.toContain("attacker-chosen-nonce");
  const scriptSource = policy.split(";").find((part) => part.trim().startsWith("script-src"));
  expect(scriptSource).not.toContain("'unsafe-inline'");
  expect(scriptSource).not.toContain("'unsafe-eval'");
  expect(response?.headers()["cache-control"]).toContain("no-store");

  const scriptNonces = await page.locator("script").evaluateAll((scripts) => scripts.map((element) => {
    const script = element as HTMLScriptElement;
    return { nonce: script.nonce, src: script.src, id: script.id, type: script.type, attributes: [...script.attributes].map((attribute) => attribute.name) };
  }));
  expect(scriptNonces.length).toBeGreaterThan(0);
  // Next injects additional external chunks after hydration. strict-dynamic
  // allows trusted scripts to load them without copying the nonce.
  expect(scriptNonces.filter((script) => !script.src).every((script) => script.nonce === nonce),
    `Inline scripts without the response nonce: ${JSON.stringify(scriptNonces.filter((script) => !script.src && script.nonce !== nonce))}`)
    .toBe(true);
  expect(scriptNonces.some((script) => script.nonce === nonce)).toBe(true);

  const tryout = page.getByRole("region", { name: "Try the lift meetup" });
  await tryout.getByRole("button", { name: "Start sample" }).click();
  await expect(tryout.getByText(/Lena is estimated at Seegrube/)).toBeVisible();
});

test("photo route failures cannot be cached across accounts", async ({ request }) => {
  for (const route of ["/avatar/invalid", "/post-photo/invalid"]) {
    const response = await request.get(route);
    expect(response.status()).toBe(404);
    expect(response.headers()["cache-control"]).toContain("no-store");
  }
});

test("login hydrates under the nonce policy without contacting a real account", async ({ page }) => {
  const response = await page.goto("/login");
  expect(response?.status()).toBe(200);
  expect(response?.headers()["content-security-policy"]).toMatch(/script-src[^;]*'nonce-[A-Za-z0-9+/=]+'/u);

  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByText("Enter a valid email address.")).toBeVisible();
  await expect(page).toHaveURL(/\/login$/u);
});
