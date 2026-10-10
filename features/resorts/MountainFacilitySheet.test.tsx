import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { I18nProvider } from "@/lib/i18n/client";
import type { MountainFacility } from "@/features/mountain-data/facilities";
import MountainFacilitySheet from "./MountainFacilitySheet";

const officialInventory = "https://nordkette.com/lifte-pisten/";
const timetable = "https://nordkette.com/anlagen-fahrplan/";
const operatorFacts = "https://nordkette.com/top-of-innsbruck/technik/";

function renderFacility(facility: MountainFacility, locale: "en" | "de" = "en") {
  const onClose = vi.fn();
  const view = render(
    <I18nProvider locale={locale}>
      <MountainFacilitySheet facility={facility} onClose={onClose} />
    </I18nProvider>,
  );
  return { onClose, ...view };
}

const hungerburg: MountainFacility = {
  id: "hungerburgbahn",
  name: "Hungerburgbahn",
  resort: "Nordkette",
  sourceUrl: officialInventory,
  checkedAt: "2026-10-10T10:00:00+02:00",
  geometry: { status: "missing", featureId: null },
  rideTime: { kind: "conflicting", values: [6, 8], sourceUrls: [operatorFacts, "https://nordkette.com/top-of-innsbruck/hungerburgbahn/"] },
  departureInterval: { minutes: 15, sourceUrl: timetable },
};

const seegrube: MountainFacility = {
  id: "seegrubenbahn",
  name: "Seegrubenbahn",
  resort: "Nordkette",
  sourceUrl: officialInventory,
  checkedAt: "2026-10-10T10:00:00+02:00",
  geometry: { status: "matched", featureId: "way/25170582" },
  rideTime: { kind: "minimum", minutes: 6.5, sourceUrl: operatorFacts },
  departureInterval: { minutes: 15, sourceUrl: timetable },
};

const hafelekar: MountainFacility = {
  ...seegrube,
  id: "hafelekarbahn",
  name: "Hafelekarbahn",
  geometry: { status: "matched", featureId: "way/25282282" },
  rideTime: { kind: "approximate", minutes: 4, sourceUrl: operatorFacts },
  departureInterval: null,
};

const frauHitt: MountainFacility = {
  ...seegrube,
  id: "frau-hitt-warte",
  name: "Sessellift Frau-Hitt-Warte",
  geometry: { status: "matched", featureId: "way/227203761" },
  rideTime: null,
  departureInterval: null,
};

const carpet: MountainFacility = {
  ...frauHitt,
  id: "zauberteppich",
  name: "Förderband Zauberteppich",
  geometry: { status: "candidate", featureId: "way/706193014" },
};

describe("MountainFacilitySheet", () => {
  it("states missing geometry and conflicting Hungerburg times without choosing one", () => {
    renderFacility(hungerburg);
    const dialog = screen.getByRole("dialog", { name: "Hungerburgbahn" });
    expect(within(dialog).getByText("No mapped geometry" )).toBeInTheDocument();
    expect(within(dialog).getByText(/6 min.*8 min|8 min.*6 min/u)).toBeInTheDocument();
    expect(within(dialog).getByText(/sources disagree.*no verified ride time/u)).toBeInTheDocument();
    expect(within(dialog).getByText(/Inventory checked.*10 Oct 2026/u)).toBeInTheDocument();
    expect(within(dialog).getByRole("link", { name: "Nordkette lift and piste status" })).toHaveAttribute("href", officialInventory);
    expect(within(dialog).queryByText(/next departure|queue|open now|closed now/u)).not.toBeInTheDocument();
  });

  it("shows Seegrube minimum time and its limited 15-minute timetable note", () => {
    renderFacility(seegrube);
    const dialog = screen.getByRole("dialog", { name: "Seegrubenbahn" });
    expect(within(dialog).getByText("Minimum 6.5 min")).toBeInTheDocument();
    expect(within(dialog).getByText(/departures every 15 min/iu)).toBeInTheDocument();
    expect(within(dialog).getByText(/at high demand, lifts may run continuously/iu)).toBeInTheDocument();
    expect(within(dialog).getByRole("link", { name: "Ride-time source" })).toHaveAttribute("href", operatorFacts);
    expect(within(dialog).getByRole("link", { name: "Timetable source" })).toHaveAttribute("href", timetable);
    expect(within(dialog).queryByText(/queue|next departure/u)).not.toBeInTheDocument();
  });

  it("labels the Hafelekar time as approximate and does not infer an interval", () => {
    renderFacility(hafelekar);
    const dialog = screen.getByRole("dialog", { name: "Hafelekarbahn" });
    expect(within(dialog).getByText("About 4 min")).toBeInTheDocument();
    expect(within(dialog).queryByText(/departures every/u)).not.toBeInTheDocument();
  });

  it("keeps chairlift ride times unavailable and marks candidate carpet geometry as uncertain", () => {
    const { unmount } = renderFacility(frauHitt);
    expect(screen.getByRole("dialog", { name: "Sessellift Frau-Hitt-Warte" })).toHaveTextContent("Ride time unavailable");
    unmount();

    renderFacility(carpet);
    const dialog = screen.getByRole("dialog", { name: "Förderband Zauberteppich" });
    expect(within(dialog).getByText("Possible geometry match · unconfirmed" )).toBeInTheDocument();
    expect(within(dialog).getByRole("link", { name: "Candidate OpenStreetMap way 706193014" })).toHaveAttribute("href", "https://www.openstreetmap.org/way/706193014");
    expect(within(dialog).getByText("Ride time unavailable")).toBeInTheDocument();
  });

  it("localizes facility facts and the inventory timestamp in German", () => {
    renderFacility(seegrube, "de");
    const dialog = screen.getByRole("dialog", { name: "Seegrubenbahn" });
    expect(within(dialog).getByText("Mindestens 6,5 Min.")).toBeInTheDocument();
    expect(within(dialog).getByText(/Abfahrten alle 15 Min/iu)).toBeInTheDocument();
    expect(within(dialog).getByText(/bei hoher Nachfrage können die Lifte durchgehend fahren/iu)).toBeInTheDocument();
    expect(within(dialog).getByText(/Inventar geprüft.*10. Okt. 2026/u)).toBeInTheDocument();
  });
});
