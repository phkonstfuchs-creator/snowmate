import { randomUUID } from "node:crypto";
import { expect, inviteFriend, test } from "./signed-in-fixtures";

test.describe("private Pistl Go day planning", () => {
  test.skip(process.env.LOCAL_SUPABASE_E2E !== "1", "Requires the isolated local Supabase stack.");
  test.setTimeout(90_000);

  test("saves, reloads and edits a private plan; sharing requires the existing publish form", async ({ riders: { a, b } }, testInfo) => {
    const meeting = `Seegrube ${randomUUID().slice(0, 8)}`;
    await a.page.goto("/feed");
    await a.page.getByRole("button", { name: /^Pistl Go/ }).click();
    const chooser = a.page.getByRole("dialog", { name: "Pistl Go", exact: true });
    await chooser.getByRole("button", { name: "Skitag planen", exact: true }).click();
    const planner = a.page.getByRole("dialog", { name: "Pistl Go", exact: true });
    await expect(planner.locator("#day-plan-resort")).toBeVisible();
    await planner.locator("#day-plan-resort").selectOption("Nordkette");
    await planner.locator("#day-plan-time").fill("12:30");
    await planner.getByRole("button", { name: "Weiter", exact: true }).click();
    await planner.getByRole("radio", { name: /^Ich brauche eine Mitfahrt/ }).check();
    await planner.getByRole("button", { name: "Weiter", exact: true }).click();
    await planner.locator("#day-plan-meeting-text").fill(meeting);
    await planner.getByRole("button", { name: "Privaten Plan speichern", exact: true }).click();
    await expect(planner).toHaveCount(0);
    await a.page.reload();
    const overview = a.page.getByRole("region", { name: "Deine privaten Skitage", exact: true });
    await expect(overview.getByText(meeting, { exact: true })).toBeVisible();
    expect(await a.page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
    await a.page.screenshot({ path: testInfo.outputPath("private-day-on-today.png") });

    await inviteFriend(a, b);
    const others = await b.account.client.rpc("list_my_day_plans");
    expect(others.error).toBeNull();
    expect(others.data).toEqual({ status: "ok", plans: [] });
    await b.page.goto("/feed");
    await expect(b.page.getByText(meeting, { exact: true })).toHaveCount(0);
    await a.page.goto("/feed");
    await overview.getByRole("button", { name: /Nordkette/ }).click();
    await planner.getByRole("button", { name: "Weiter", exact: true }).click();
    await planner.getByRole("button", { name: "Weiter", exact: true }).click();
    await planner.locator("#day-plan-meeting-text").fill(`${meeting} Eingang`);
    await planner.getByRole("button", { name: "Privaten Plan speichern", exact: true }).click();
    await expect(planner).toHaveCount(0);
    await a.page.reload();
    await expect(overview.getByText(`${meeting} Eingang`, { exact: true })).toBeVisible();

    const before = await a.account.client.rpc("list_rides");
    expect(before.error).toBeNull();
    await overview.getByRole("button", { name: "Ausfahrt vorbereiten", exact: true }).click();
    const ride = a.page.getByRole("dialog", { name: "Ride posten", exact: true });
    await expect(ride.getByLabel("Skigebiet", { exact: true })).toHaveValue("Nordkette");
    await expect(ride.getByRole("button", { name: "Weiter", exact: true })).toBeDisabled();
    await ride.getByRole("button", { name: /Park/ }).click();
    await ride.getByRole("button", { name: "Weiter", exact: true }).click();
    await expect(ride.getByLabel("Treffpunkt", { exact: true })).toHaveValue(`${meeting} Eingang`);
    await expect(ride.getByLabel("Zeit", { exact: true })).toHaveValue("12:30");
    const after = await a.account.client.rpc("list_rides");
    expect(after.error).toBeNull();
    expect(after.data).toEqual(before.data);
    await ride.getByRole("button", { name: "Zurück", exact: true }).click();
    await ride.getByRole("button", { name: "Abbrechen", exact: true }).click();
    await expect(ride).toHaveCount(0);

    await overview.getByRole("button", { name: /Nordkette/ }).click();
    await planner.getByRole("button", { name: "Plan löschen", exact: true }).click();
    await planner.getByRole("button", { name: "Löschen bestätigen", exact: true }).click();
    await expect(planner).toHaveCount(0);
    await a.page.reload();
    await expect(a.page.getByText(`${meeting} Eingang`, { exact: true })).toHaveCount(0);
    const empty = await a.account.client.rpc("list_my_day_plans");
    expect(empty.error).toBeNull();
    expect(empty.data).toEqual({ status: "ok", plans: [] });
  });
});
