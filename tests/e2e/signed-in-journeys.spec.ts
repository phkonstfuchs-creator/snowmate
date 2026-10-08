import { randomUUID } from "node:crypto";
import {
  composePost, createRide, createRider, expect, inviteFriend,
  openChat, openRide, phoneContext, postBodies, sendMessage, test,
} from "./signed-in-fixtures";

test.describe("signed-in journeys against local Supabase", () => {
  test.skip(process.env.LOCAL_SUPABASE_E2E !== "1", "Requires the local Supabase stack used by CI integration.");
  // One file worker reuses two real accounts without raising Auth limits.
  // Fresh contexts and relationship reset keep the seven tests independent.
  test.describe.configure({ mode: "default" });
  test.setTimeout(90_000);

  test("A invites B by link; both see each other in their Crew after reload", async ({ riders: { a, b } }) => {
    await inviteFriend(a, b);
    for (const [actor, other] of [[a, b], [b, a]] as const) {
      await actor.page.goto("/crew");
      await actor.page.reload();
      const friends = actor.page.locator("section").filter({ has: actor.page.getByRole("heading", { name: "Freunde", exact: true }) });
      await expect(friends.getByText(`@${other.account.handle}`, { exact: false })).toBeVisible();
      await expect(friends.getByRole("button", { name: `Nachricht an ${other.account.name}`, exact: true })).toBeVisible();
    }
  });

  test("B joins A's ride, persists on both phones, then leaves and stays out after reload", async ({ riders: { a, b } }) => {
    await inviteFriend(a, b);
    const caption = `Park session ${randomUUID()}`;
    await createRide(a.page, caption);
    await b.page.goto("/feed");
    const card = b.page.getByRole("article").filter({ hasText: caption });
    await card.getByRole("button", { name: /^Bin dabei:/ }).click();
    await expect(card.getByRole("button", { name: /^Dabei ✓:/ })).toBeVisible();
    await expect(card.getByRole("button", { name: /^Dabei ✓:/ })).toBeEnabled();
    for (const actor of [a, b]) {
      await actor.page.reload();
      const detail = await openRide(actor.page, caption);
      await expect(detail.getByText(`@${b.account.handle}`, { exact: true })).toBeVisible();
      await detail.getByRole("button", { name: "Ride-Details schließen", exact: true }).click();
      await expect(detail).toHaveCount(0);
    }
    /* A second tap on the card opens the ride; leaving happens there. */
    await card.getByRole("button", { name: /^Dabei ✓:/ }).click();
    await b.page.getByRole("button", { name: "Du bist dabei, tippen zum Verlassen", exact: true }).click();
    await expect(card.getByRole("button", { name: /^Bin dabei:/ })).toBeVisible();
    for (const actor of [a, b]) {
      await actor.page.reload();
      const detail = await openRide(actor.page, caption);
      await expect(detail.getByText(`@${a.account.handle}`, { exact: true })).toBeVisible();
      await expect(detail.getByText(`@${b.account.handle}`, { exact: true })).toHaveCount(0);
    }
  });

  test("A and B exchange chat messages; both messages survive reload on both phones", async ({ riders: { a, b } }) => {
    await inviteFriend(a, b);
    const first = `Park at nine? ${randomUUID()}\n${"Meeting point at the valley station.\n".repeat(20)}`.trim();
    const reply = `See you there! ${randomUUID()}\n${"Bring your helmet and check the lift times.\n".repeat(20)}`.trim();
    await openChat(a.page, b.account);
    await sendMessage(a.page, first);
    const avatarRequests: string[] = [];
    b.page.on("request", (request) => {
      if (new URL(request.url()).pathname === `/avatar/${a.account.id}`) avatarRequests.push(request.url());
    });
    await openChat(b.page, a.account);
    await expect(b.page.locator("ol").getByText(first, { exact: true })).toBeVisible();
    await sendMessage(b.page, reply);
    const thread = b.page.locator(".chat-thread");
    await expect(thread.locator(".msg-bubble-them").filter({ hasText: first })).toBeVisible();
    const profile = thread.locator("header").getByRole("button", { name: a.account.name, exact: true });
    await expect.poll(() => avatarRequests.length).toBeGreaterThan(0);
    expect(new URL(avatarRequests[0]!).pathname).toBe(`/avatar/${a.account.id}`);
    await expect(profile.locator(".avatar-initials")).toBeVisible();
    await profile.click();
    await expect(b.page.getByRole("dialog")).toContainText(`@${a.account.handle}`);
    const sheet = await b.page.getByRole("dialog").boundingBox();
    expect(sheet).not.toBeNull();
    expect(Math.abs(sheet!.y + sheet!.height - b.page.viewportSize()!.height)).toBeLessThanOrEqual(2);
    await b.page.getByRole("dialog").getByRole("button", { name: "Schließen", exact: true }).click();
    const list = thread.getByRole("list");
    const geometry = await list.evaluate((element) => ({ scrollHeight: element.scrollHeight, clientHeight: element.clientHeight }));
    expect(geometry.scrollHeight).toBeGreaterThan(geometry.clientHeight);
    await list.hover();
    await b.page.mouse.wheel(0, -500);
    await expect.poll(() => list.evaluate((element) => element.scrollTop)).toBeLessThan(geometry.scrollHeight - geometry.clientHeight);
    expect(await b.page.evaluate(() => window.scrollY)).toBe(0);
    const composer = await thread.locator("form").boundingBox();
    const nav = await b.page.getByRole("navigation", { name: "Hauptnavigation" }).boundingBox();
    expect(composer).not.toBeNull();
    expect(nav).not.toBeNull();
    expect(Math.abs(nav!.y - (composer!.y + composer!.height))).toBeLessThanOrEqual(8);
    for (const actor of [a, b]) {
      await actor.page.reload();
      for (const body of [first, reply]) {
        await expect(actor.page.locator("ol").getByText(body, { exact: true })).toBeVisible();
      }
    }
  });

  test("A's text post is visible to friend B but absent for stranger C", async ({ riders: { a, b }, browser, request, baseURL }) => {
    if (!baseURL) throw new Error("Playwright baseURL is required.");
    await inviteFriend(a, b);
    const c = await createRider(browser, request, baseURL, "C");
    const cContext = await phoneContext(browser, baseURL, c.state);
    try {
      const cPage = await cContext.newPage();
      const body = `Crew-only park day ${randomUUID()}`;
      const dialog = await composePost(a.page, body);
      await dialog.getByRole("button", { name: "Teilen", exact: true }).click();
      await expect(dialog).toHaveCount(0);
      await expect(a.page.getByRole("article").getByText(body, { exact: true })).toBeVisible();
      await b.page.goto("/feed");
      await b.page.reload();
      await expect(b.page.getByRole("article").getByText(body, { exact: true })).toBeVisible();
      await cPage.goto("/feed");
      await cPage.reload();
      await expect(cPage.getByRole("button", { name: "Neu", exact: true })).toBeVisible();
      await expect(cPage.getByText("Die Posts konnten nicht geladen werden.")).toHaveCount(0);
      await expect(cPage.getByRole("article").getByText(body, { exact: true })).toHaveCount(0);
      expect(await postBodies(b.account)).toContain(body);
      expect(await postBodies(c)).not.toContain(body);
    } finally {
      await cContext.close();
    }
  });

  test("a slur shows the German rephrase hint and is never persisted", async ({ riders: { a, b } }) => {
    await inviteFriend(a, b);
    const body = `Hurensohn ${randomUUID()}`;
    const before = await postBodies(a.account);
    const dialog = await composePost(a.page, body);
    await dialog.getByRole("button", { name: "Teilen", exact: true }).click();
    await expect(dialog.getByRole("alert")).toHaveText("Bitte formuliere das ohne Beleidigungen oder Hassbegriffe.");
    await expect(dialog.getByLabel("Was war los?", { exact: true })).toHaveValue(body);
    await a.page.reload();
    expect(await postBodies(a.account)).toEqual(before);
    expect(await postBodies(b.account)).not.toContain(body);
    await expect(a.page.getByRole("article").getByText(body, { exact: true })).toHaveCount(0);
  });

  test("B blocks A; A loses B's ride and cannot reopen their direct chat", async ({ riders: { a, b } }) => {
    await inviteFriend(a, b);
    const caption = `B's private ride ${randomUUID()}`;
    const body = `Chat before block ${randomUUID()}`;
    await createRide(b.page, caption);
    await a.page.goto("/feed");
    await expect(a.page.getByRole("article").filter({ hasText: caption })).toBeVisible();
    await openChat(a.page, b.account);
    await sendMessage(a.page, body);
    const chatURL = a.page.url();
    await openChat(b.page, a.account);
    await b.page.getByRole("button", { name: `${a.account.name} melden oder blockieren`, exact: true }).click();
    b.page.once("dialog", (dialog) => dialog.accept());
    await b.page.getByRole("dialog", { name: "Melden oder blockieren", exact: true })
      .getByRole("button", { name: `${a.account.name} blockieren`, exact: true }).click();
    await expect(b.page.getByRole("main").getByRole("alert")).toHaveText("Dieser Chat ist nicht verfügbar. Du kannst nur mit Freunden und Leuten aus demselben Ride schreiben.");
    await a.page.goto("/feed");
    await a.page.reload();
    await expect(a.page.getByText(/Rides konnten nicht geladen werden/)).toHaveCount(0);
    await expect(a.page.getByRole("article").filter({ hasText: caption })).toHaveCount(0);
    const rides = await a.account.client.rpc("list_rides");
    expect(rides.error).toBeNull();
    expect(Array.isArray(rides.data)).toBe(true);
    expect((rides.data as Array<{ caption: string }>).some((ride) => ride.caption === caption)).toBe(false);
    await a.page.goto("/crew");
    await expect(a.page.getByRole("link", { name: new RegExp(b.account.name) })).toHaveCount(0);
    await a.page.goto(chatURL);
    await a.page.reload();
    await expect(a.page.getByRole("main").getByRole("alert")).toHaveText("Dieser Chat ist nicht verfügbar. Du kannst nur mit Freunden und Leuten aus demselben Ride schreiben.");
    await expect(a.page.getByLabel("Nachricht schreiben…", { exact: true })).toHaveCount(0);
    await expect(a.page.getByText(body, { exact: true })).toHaveCount(0);
  });

  test("signing out revokes the same session on another device before its next write", async ({ riders: { b }, browser, request, baseURL }) => {
    if (!baseURL) throw new Error("Playwright baseURL is required.");
    // A dedicated account keeps global logout from revoking other tests' sessions.
    const account = await createRider(browser, request, baseURL, "Logout A");
    const signingOut = await phoneContext(browser, baseURL, account.state);
    const a = { account, page: await signingOut.newPage() };
    await inviteFriend(a, b);
    await a.page.goto("/feed");
    // Independent cookie jar: logout cannot merely clear the second tab's cookies.
    const snapshot = await a.page.context().storageState();
    expect(snapshot.cookies.some((cookie) => cookie.name.startsWith("sb-") && cookie.httpOnly)).toBe(true);
    const otherDevice = await phoneContext(browser, baseURL, snapshot);
    try {
      const otherTab = await otherDevice.newPage();
      const body = `Must never save ${randomUUID()}`;
      const composer = await composePost(otherTab, body);
      await a.page.goto("/profile");
      await a.page.getByRole("button", { name: "Abmelden", exact: true }).click();
      await expect(a.page).toHaveURL(/\/login$/);
      await composer.getByRole("button", { name: "Teilen", exact: true }).click();
      const denied = await account.client.rpc("create_post", { p_body: body, p_resort: null, p_photo_path: null });
      expect(denied.error?.code, denied.error?.message).toBe("session_expired");
      await expect(otherTab).toHaveURL(/\/login$/);
      // Check the write independently through B's still-valid friend session.
      expect(await postBodies(b.account)).not.toContain(body);
    } finally {
      await otherDevice.close();
      await signingOut.close();
    }
  });
});
