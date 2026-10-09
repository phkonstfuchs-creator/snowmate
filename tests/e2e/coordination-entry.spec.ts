import { expect, inviteFriend, test } from "./signed-in-fixtures";
import { randomUUID } from "node:crypto";

test.describe("prominent coordination entries", () => {
  test.skip(process.env.LOCAL_SUPABASE_E2E !== "1", "Requires the isolated local Supabase stack.");
  test.setTimeout(90_000);

  test("Go and lift are visible without any plans and the lift entry never starts sharing", async ({ riders: { a } }, testInfo) => {
    await a.page.addInitScript(() => {
      Object.defineProperty(navigator.geolocation, "getCurrentPosition", { value: () => undefined });
    });
    for (const width of [390, 320]) {
      await a.page.setViewportSize({ width, height: 844 });
      await a.page.goto("/feed");
      const go = a.page.getByRole("button", { name: /^Pistl Go/ });
      const lift = a.page.getByRole("link", { name: /^Lift-Treffpunkt/ });
      for (const entry of [go, lift]) {
        await expect(entry).toBeVisible();
        const box = await entry.boundingBox();
        expect(box!.y).toBeGreaterThan(0);
        expect(box!.y + box!.height).toBeLessThan(500);
        expect(box!.height).toBeGreaterThanOrEqual(44);
      }
      expect(await a.page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
      await a.page.screenshot({ path: testInfo.outputPath(`today-${width}.png`) });
      await go.click();
      const chooser = a.page.getByRole("dialog", { name: /^Pistl Go/ });
      await expect(chooser).toBeVisible();
      await expect(chooser.getByRole("link", { name: "Crew finden" })).toBeVisible();
      await chooser.getByRole("button", { name: "Schließen", exact: true }).click();
      await expect(chooser).toHaveCount(0);
    }
    await a.page.getByRole("link", { name: /^Lift-Treffpunkt/ }).click();
    const picker = a.page.getByRole("dialog", { name: "Lift-Treffpunkt starten", exact: true });
    await expect(picker).toBeVisible();
    await expect(a.page).toHaveURL(/\/map$/);
    await picker.getByRole("button", { name: "Lift selbst wählen", exact: true }).click();
    await expect(picker.getByRole("combobox", { name: "Lift auswählen", exact: true })).toBeVisible();
    const before = await a.account.client.rpc("my_lift_meetup");
    expect(before.error).toBeNull();
    expect(before.data).toEqual([]);
    const location = await a.account.client.rpc("my_location_sharing");
    expect(location.error).toBeNull();
    expect(location.data).toBeNull();
    await a.page.screenshot({ path: testInfo.outputPath("lift-direct-entry.png") });
    await picker.getByRole("button", { name: "Schließen", exact: true }).click();
    await expect(picker).toHaveCount(0);
    await a.page.reload();
    await expect(a.page.getByRole("dialog")).toHaveCount(0);
  });

  test("the Go entry opens an actual crew ride with the wish form immediately visible", async ({ riders: { a, b } }, testInfo) => {
    await inviteFriend(a, b);
    const caption = `Visible Go ${randomUUID()}`;
    const tomorrow = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Vienna", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(Date.now() + 36 * 60 * 60 * 1000));
    const created = await a.account.client.from("rides").insert({
      resort: "Nordkette", city: "innsbruck", ability_level: "park", ride_date: tomorrow,
      meet_time: "10:00", meet_point: "Talstation", total_spots: 4, caption, visibility: "friends",
    });
    expect(created.error).toBeNull();
    await b.page.goto("/feed");
    await b.page.getByRole("button", { name: /^Pistl Go/ }).click();
    const chooser = b.page.getByRole("dialog", { name: /^Pistl Go/ });
    await expect(chooser).toBeVisible();
    await chooser.getByRole("button", { name: /Nordkette/ }).click();
    await expect(chooser).toHaveCount(0);
    const detail = b.page.getByRole("dialog", { name: "Ride-Details", exact: true });
    const minimum = detail.getByRole("combobox", { name: "Mindestgruppe inklusive dir", exact: true });
    await expect(minimum).toBeVisible();
    const box = await minimum.boundingBox();
    expect(box!.y + box!.height).toBeLessThan(b.page.viewportSize()!.height - 80);
    await minimum.selectOption("2");
    await detail.getByRole("button", { name: "Wunsch speichern", exact: true }).click();
    await expect(detail.getByText("Wunsch gespeichert. Kein Platz reserviert.", { exact: true })).toBeVisible();
    await b.page.screenshot({ path: testInfo.outputPath("go-direct-entry.png") });
    const rides = await b.account.client.rpc("list_rides");
    expect(rides.error).toBeNull();
    expect(rides.data.find((ride: { caption: string }) => ride.caption === caption).is_joined).toBe(false);
  });
});
