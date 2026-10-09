import { expect, test } from "@playwright/test";
import {
  createLocalCrew,
  disposeLocalRider,
  loginLocalRider,
} from "./local-crew-fixtures";

test("Pistl Go rechecks crew and confirmed transport without automatically joining", async ({
  page,
}) => {
  test.skip(
    process.env.LOCAL_SUPABASE_E2E !== "1",
    "Requires isolated local Supabase.",
  );
  test.setTimeout(120_000);
  const [host, member] = await createLocalCrew();
  const [friend, spare] = await createLocalCrew();
  async function command(
    client: typeof host.client,
    rpc: string,
    args: Record<string, unknown>,
  ) {
    const result = await client.rpc(rpc, {
      ...args,
      p_idempotency_key: crypto.randomUUID(),
    });
    expect(result.error, rpc).toBeNull();
    return result.data;
  }
  try {
    const friendship = await command(host.client, "request_friendship", {
      p_target_id: friend.id,
    });
    await command(friend.client, "respond_friendship", {
      p_friendship_id: friendship,
      p_accept: true,
    });
    const startsAt = new Date(Date.now() + 26 * 3_600_000).toISOString();
    const rideId = await command(host.client, "create_ride", {
      p_resort_id: "stubai-glacier",
      p_ability_level: "chill",
      p_starts_at: startsAt,
      p_capacity: 4,
      p_audience: "friends",
      p_caption: "Go-Test",
      p_meeting_point: "Talstation Go-Test",
    });
    await loginLocalRider(page, member);
    await page.goto(`/feed/${rideId}`);
    await page
      .getByRole("combobox", {
        name: "Mindestgruppe inklusive dir und Gastgeber",
      })
      .selectOption("3");
    await page.getByLabel("Ich brauche einen bestätigten Mitfahrplatz").check();
    await page.getByRole("button", { name: "Bedingungen speichern" }).click();
    await expect(
      page.getByText("1 bereits bestätigt · Mindestgruppe 3 inklusive dir.", {
        exact: true,
      }),
    ).toBeVisible();
    await page.reload();
    await expect(
      page.getByText("1 bereits bestätigt · Mindestgruppe 3 inklusive dir.", {
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Teilnahme anfragen", exact: true }),
    ).toHaveCount(0);

    await page.goto("/feed");
    const overview = page.getByRole("region", { name: "Deine Pistl-Go-Pläne" });
    await expect(overview).toBeVisible();
    await expect(overview.getByText("Dein bestätigter Mitfahrplatz fehlt noch.")).toBeVisible();
    await expect(overview.getByText("1 bereits bestätigt · Mindestgruppe 3 inklusive dir.")).toBeVisible();
    await page.goto(`/feed/${rideId}`);

    const request = await command(friend.client, "request_ride", {
      p_ride_id: rideId,
    });
    await command(host.client, "respond_ride_request", {
      p_request_id: request,
      p_accept: true,
    });
    const seatId = await command(host.client, "create_carpool", {
      p_resort_id: "stubai-glacier",
      p_city: "innsbruck",
      p_role: "driver",
      p_departs_at: new Date(Date.parse(startsAt) - 3_600_000).toISOString(),
      p_seat_capacity: 1,
      p_audience: "friends",
      p_note: "Go-Test",
      p_departure_point: "Bahnhof Go-Test",
    });
    const seatRequest = await command(member.client, "request_carpool", {
      p_carpool_id: seatId,
    });
    await page.reload();
    await expect(
      page.getByRole("button", { name: "Teilnahme anfragen", exact: true }),
    ).toHaveCount(0);
    await command(host.client, "respond_carpool_request", {
      p_request_id: seatRequest,
      p_accept: true,
    });
    await page.reload();
    await expect(
      page.getByRole("button", { name: "Teilnahme anfragen", exact: true }),
    ).toBeVisible();

    await page.goto("/feed");
    await expect(overview.getByRole("link", { name: "Teilnahme anfragen: Stubai Glacier" })).toBeVisible();
    await page.goto(`/feed/${rideId}`);
    await expect(
      page.getByText("Du bist bestätigt dabei.", { exact: true }),
    ).toHaveCount(0);

    await command(member.client, "leave_carpool", { p_carpool_id: seatId });
    await page.reload();
    await expect(
      page.getByRole("button", { name: "Teilnahme anfragen", exact: true }),
    ).toHaveCount(0);
    await page
      .getByRole("button", { name: "Bedingungen zurückziehen" })
      .click();
    await expect(
      page.getByRole("button", { name: "Teilnahme anfragen", exact: true }),
    ).toBeVisible();
  } finally {
    for (const rider of [member, host, friend, spare])
      await disposeLocalRider(rider);
  }
});
