import { expect, test } from "@playwright/test";
import {
  createLocalCrew,
  disposeLocalRider,
  localDepartureTime,
  loginLocalRider,
} from "./local-crew-fixtures";

test.describe("persistent crew coordination", () => {
  test.use({ actionTimeout: 15_000, navigationTimeout: 20_000 });
  test.skip(
    process.env.LOCAL_SUPABASE_E2E !== "1",
    "Requires an explicitly configured local Supabase stack.",
  );

  test("two accounts confirm a ride and a seat, reload, leave and cancel", async ({
    page: hostPage,
    browser,
  }) => {
    test.setTimeout(120_000);
    const [host, member] = await createLocalCrew();
    const memberContext = await browser.newContext();
    const memberPage = await memberContext.newPage();
    try {
      await loginLocalRider(hostPage, host);
      await loginLocalRider(memberPage, member);

      await hostPage.goto("/feed/new?city=innsbruck");
      await hostPage
        .getByRole("combobox", { name: "Skigebiet", exact: true })
        .selectOption({ index: 1 });
      await hostPage
        .getByLabel("Datum und Uhrzeit (deine lokale Zeit)")
        .fill(localDepartureTime());
      await hostPage
        .getByLabel("Genauer Treffpunkt")
        .fill("Talstation Crew-Test");
      await hostPage
        .getByLabel("Notiz", { exact: true })
        .fill("Gemeinsame Test-Ausfahrt");
      await hostPage
        .getByRole("button", { name: "Ausfahrt veröffentlichen" })
        .click();
      await expect(hostPage).toHaveURL(/\/feed\/[0-9a-f-]{36}$/);
      const rideUrl = hostPage.url();

      await memberPage.goto(rideUrl);
      await memberPage
        .getByRole("button", { name: "Teilnahme anfragen", exact: true })
        .click();
      await expect(
        memberPage.getByText(
          "Anfrage gesendet – die Bestätigung steht noch aus.",
        ),
      ).toBeVisible();
      await expect(
        memberPage.getByText("Du bist bestätigt dabei."),
      ).toHaveCount(0);
      await memberPage.reload();
      await expect(
        memberPage.getByText(
          "Anfrage gesendet – die Bestätigung steht noch aus.",
        ),
      ).toBeVisible();
      await hostPage.reload();
      await hostPage
        .getByRole("button", { name: "Annehmen", exact: true })
        .click();
      await memberPage.reload();
      await expect(
        memberPage.getByText("Du bist bestätigt dabei."),
      ).toBeVisible();
      await expect(memberPage.getByText("Talstation Crew-Test")).toBeVisible();
      await memberPage
        .getByRole("button", { name: "Teilnahme absagen", exact: true })
        .click();
      await expect(
        memberPage.getByText("Du bist bestätigt dabei."),
      ).toHaveCount(0);
      await hostPage.reload();
      await hostPage
        .getByRole("button", { name: "Ausfahrt absagen", exact: true })
        .click();
      await memberPage.reload();
      await expect(
        memberPage.getByRole("button", {
          name: "Teilnahme anfragen",
          exact: true,
        }),
      ).toHaveCount(0);

      await hostPage.goto("/carpool/new?city=innsbruck");
      await hostPage
        .getByRole("combobox", { name: "Zielgebiet", exact: true })
        .selectOption({ index: 1 });
      await hostPage
        .getByLabel("Abfahrt: Datum und Uhrzeit")
        .fill(localDepartureTime());
      await hostPage
        .getByLabel("Genauer Abfahrtsort")
        .fill("Bahnhof Crew-Test");
      await hostPage.getByLabel("Freie Plätze für Mitfahrer").fill("1");
      await hostPage
        .getByLabel("Notiz", { exact: true })
        .fill("Gemeinsame Test-Mitfahrt");
      await hostPage
        .getByRole("button", { name: "Inserat veröffentlichen" })
        .click();
      await expect(hostPage).toHaveURL(/\/carpool\/[0-9a-f-]{36}$/);
      const carpoolUrl = hostPage.url();
      await memberPage.goto(carpoolUrl);
      await memberPage
        .getByRole("button", { name: "Platz anfragen", exact: true })
        .click();
      await expect(
        memberPage.getByText("Anfrage offen · noch keine Bestätigung"),
      ).toBeVisible();
      await expect(
        memberPage.getByText("Dein Platz ist bestätigt."),
      ).toHaveCount(0);
      await hostPage.reload();
      await hostPage
        .getByRole("button", { name: "Annehmen", exact: true })
        .click();
      await memberPage.reload();
      await expect(
        memberPage.getByText("Dein Platz ist bestätigt."),
      ).toBeVisible();
      await memberPage.reload();
      await expect(
        memberPage.getByText("Dein Platz ist bestätigt."),
      ).toBeVisible();
      await expect(memberPage.getByText("Bahnhof Crew-Test")).toBeVisible();
      await memberPage
        .getByRole("button", { name: "Mitfahrt verlassen", exact: true })
        .click();
      await expect(
        memberPage.getByText("Dein Platz ist bestätigt."),
      ).toHaveCount(0);
      await hostPage.reload();
      hostPage.once("dialog", (dialog) => dialog.accept());
      await hostPage
        .getByRole("button", { name: "Mitfahrt absagen", exact: true })
        .click();
      await memberPage.reload();
      await expect(
        memberPage.getByRole("button", { name: "Platz anfragen", exact: true }),
      ).toHaveCount(0);
    } finally {
      await memberContext.close();
      await disposeLocalRider(member);
      await disposeLocalRider(host);
    }
  });
});
