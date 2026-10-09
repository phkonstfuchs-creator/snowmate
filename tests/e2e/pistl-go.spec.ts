import { randomUUID } from "node:crypto";
import { expect, inviteFriend, openRide, test } from "./signed-in-fixtures";

test.describe("private Pistl Go against local Supabase", () => {
  test.skip(process.env.LOCAL_SUPABASE_E2E !== "1", "Requires the local Supabase stack.");
  test.setTimeout(90_000);

  test("a saved wish remains private, requires an accepted seat and never silently joins or removes participation", async ({ riders: { a, b } }) => {
    await inviteFriend(a, b);
    const caption = `Pistl Go ${randomUUID()}`;
    const tomorrow = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Vienna", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(Date.now() + 36 * 60 * 60 * 1000));
    const created = await a.account.client.from("rides").insert({
      resort: "Nordkette", city: "innsbruck", ability_level: "park", ride_date: tomorrow,
      meet_time: "10:00", meet_point: "Talstation", total_spots: 4, caption, visibility: "friends",
    });
    expect(created.error).toBeNull();
    const hosted = await a.account.client.rpc("list_rides");
    expect(hosted.error).toBeNull();
    const rideId = hosted.data.find((row: { caption: string }) => row.caption === caption).id as string;
    await b.page.goto("/feed");
    let detail = await openRide(b.page, caption);
    await detail.getByRole("combobox", { name: "Mindestgruppe inklusive dir", exact: true }).selectOption("2");
    await detail.getByRole("checkbox", { name: "Ich brauche einen bestätigten Mitfahrplatz", exact: true }).check();
    await detail.getByRole("button", { name: "Wunsch speichern", exact: true }).click();
    await expect(detail.getByText("Wunsch gespeichert. Kein Platz reserviert.", { exact: true })).toBeVisible();
    await b.page.reload();
    await expect(b.page.getByRole("heading", { name: "Deine Pistl-Go-Pläne", exact: true })).toBeVisible();
    const before = await b.account.client.rpc("list_rides");
    expect(before.error).toBeNull();
    expect(before.data.find((row: { id: string }) => row.id === rideId).is_joined).toBe(false);
    const hostWishes = await a.account.client.rpc("list_my_ride_go_interests");
    expect(hostWishes.error).toBeNull();
    expect(hostWishes.data).toEqual([]);
    const premature = await b.account.client.rpc("join_ride", { target_ride: rideId });
    expect(premature.error?.message).toContain("go_conditions_not_ready");
    detail = await openRide(b.page, caption);
    await detail.getByRole("button", { name: "Wunsch zurückziehen", exact: true }).click();
    await expect(detail.getByText("Wunsch zurückgezogen.", { exact: true })).toBeVisible();
    await b.page.reload();
    await expect(b.page.getByRole("heading", { name: "Deine Pistl-Go-Pläne", exact: true })).toHaveCount(0);
    detail = await openRide(b.page, caption);
    await detail.getByRole("combobox", { name: "Mindestgruppe inklusive dir", exact: true }).selectOption("2");
    await detail.getByRole("checkbox", { name: "Ich brauche einen bestätigten Mitfahrplatz", exact: true }).check();
    await detail.getByRole("button", { name: "Wunsch speichern", exact: true }).click();
    await expect(detail.getByText("Wunsch gespeichert. Kein Platz reserviert.", { exact: true })).toBeVisible();

    const offer = await a.account.client.from("carpools").insert({
      role: "driver", resort: "Nordkette", city: "innsbruck", ride_date: tomorrow,
      departure_point: "Test station", departure_time: "09:00", seats: 1, note: caption,
    });
    expect(offer.error).toBeNull();
    const pools = await a.account.client.rpc("list_carpools");
    expect(pools.error).toBeNull();
    const poolId = pools.data.find((row: { note: string }) => row.note === caption).id as string;
    const requested = await b.account.client.rpc("request_carpool", { target_carpool: poolId });
    expect(requested.error).toBeNull();
    expect(requested.data).toBe("requested");
    await b.page.reload();
    detail = await openRide(b.page, caption);
    await expect(detail.getByText("Bedingungen erfüllt. Tritt unten ausdrücklich bei.", { exact: true })).toHaveCount(0);
    const accepted = await a.account.client.rpc("respond_carpool_request", { target_carpool: poolId, requester: b.account.id, accept: true });
    expect(accepted.error).toBeNull();
    expect(accepted.data).toBe("accepted");
    await b.page.reload();
    detail = await openRide(b.page, caption);
    await expect(detail.getByText("Bedingungen erfüllt. Tritt unten ausdrücklich bei.", { exact: true })).toBeVisible();
    await detail.getByRole("button", { name: "Bin dabei", exact: true }).click();
    await expect(detail.getByRole("button", { name: "Du bist dabei, tippen zum Verlassen", exact: true })).toBeVisible();
    const cancelled = await a.account.client.rpc("cancel_carpool", { target_carpool: poolId });
    expect(cancelled.error).toBeNull();
    await b.page.reload();
    detail = await openRide(b.page, caption);
    await expect(detail.getByText("Bedingungen haben sich nach deinem Beitritt geändert. Deine Teilnahme bleibt bestätigt.", { exact: true })).toBeVisible();
    const after = await b.account.client.rpc("list_rides");
    expect(after.error).toBeNull();
    expect(after.data.find((row: { id: string }) => row.id === rideId).is_joined).toBe(true);
  });
});
