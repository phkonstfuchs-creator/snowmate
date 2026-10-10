import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { I18nProvider } from "@/lib/i18n/client";
import { nordketteFacilities } from "@/features/mountain-data/facilities";
import MountainFeatureExplorer from "./MountainFeatureExplorer";

vi.mock("@/features/mountain-data/catalog", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/features/mountain-data/catalog")>();
  const fixtureId = actual.mountainFeatures.find((feature) => feature.kind === "piste" && feature.id !== "way/24559397")?.id;
  return {
    ...actual,
    mountainFeatures: actual.mountainFeatures.map((feature) =>
      feature.id === fixtureId ? { ...feature, difficulty: "novice" } : feature,
    ),
  };
});

function renderExplorer(locale: "en" | "de" = "en") {
  const onSelect = vi.fn();
  render(
    <I18nProvider locale={locale}>
      <MountainFeatureExplorer onSelect={onSelect} onSelectFacility={vi.fn()} onClose={vi.fn()} />
    </I18nProvider>,
  );
  return onSelect;
}

describe("MountainFeatureExplorer", () => {
  it("shows the honest partial inventory counts and filters semantic feature buttons", () => {
    renderExplorer();

    expect(screen.getByRole("dialog", { name: "Pistes & lifts" })).toBeInTheDocument();
    expect(screen.getByText(/25 mapped piste sections/i)).toBeInTheDocument();
    expect(screen.getByText(/5 mapped lifts/i)).toBeInTheDocument();
    expect(screen.getByText(/partial.*coverage/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Lifts" }));
    expect(screen.getByRole("button", { name: "Seegrubenbahn" })).toBeInTheDocument();
    expect(screen.queryAllByRole("button", { name: "2 - Zweier Skiroute" })).toHaveLength(0);

    fireEvent.click(screen.getByRole("button", { name: "Pistes" }));
    expect(screen.getAllByRole("button", { name: /2 - Zweier Skiroute, Section \d+ of \d+/u }).length).toBeGreaterThan(0);
    expect(screen.queryByRole("button", { name: "Seegrubenbahn" })).not.toBeInTheDocument();
  });

  it("searches by feature name or number and reports an empty result accessibly", () => {
    renderExplorer();
    const search = screen.getByRole("searchbox", { name: "Search pistes and lifts" });

    fireEvent.change(search, { target: { value: "25170582" } });
    expect(screen.getByRole("button", { name: "Seegrubenbahn" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "2 - Zweier Skiroute" })).not.toBeInTheDocument();

    fireEvent.change(search, { target: { value: "not on the mountain" } });
    expect(screen.getByRole("status")).toHaveTextContent("No matching pistes or lifts");
  });

  it("selects the chosen catalog feature and localizes its controls", () => {
    const onSelect = renderExplorer("de");
    fireEvent.change(screen.getByRole("searchbox", { name: "Pisten und Lifte suchen" }), { target: { value: "24559397" } });
    const piste = screen.getByRole("button", { name: /2 - Zweier Skiroute, Abschnitt \d+ von \d+/u });
    expect(screen.getByRole("button", { name: "Alle" })).toBeInTheDocument();
    fireEvent.click(piste);

    expect(onSelect).toHaveBeenCalledWith("way/24559397");
  });

  it("exposes every filter as a labeled pressed-state control", () => {
    renderExplorer();
    expect(screen.getByRole("button", { name: "All" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Pistes" })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("button", { name: "Lifts" })).toHaveAttribute("aria-pressed", "false");
    expect(within(screen.getByRole("dialog")).getByRole("list")).toBeInTheDocument();
  });

  it("shows recognized freeride and novice levels in English and German", () => {
    const english = vi.fn();
    const { unmount } = render(
      <I18nProvider locale="en">
        <MountainFeatureExplorer onSelect={english} onSelectFacility={vi.fn()} onClose={vi.fn()} />
      </I18nProvider>,
    );
    expect(screen.getAllByText("Freeride", { exact: true }).length).toBeGreaterThan(0);
    expect(screen.getByText("Novice", { exact: true })).toBeInTheDocument();
    unmount();

    renderExplorer("de");
    expect(screen.getAllByText("Freeride", { exact: true }).length).toBeGreaterThan(0);
    expect(screen.getByText("Anfänger", { exact: true })).toBeInTheDocument();
  });

  it("lists the six official facilities exactly once and keeps the candidate carpet way unassigned", () => {
    renderExplorer();
    const inventory = screen.getByRole("dialog", { name: "Pistes & lifts" });
    for (const facility of nordketteFacilities) {
      expect(within(inventory).getAllByRole("button", { name: new RegExp(facility.name, "u") })).toHaveLength(1);
    }
    expect(within(inventory).getAllByRole("button", { name: /2 - Zweier Skiroute/u }).length).toBeGreaterThan(0);
    expect(within(inventory).getByRole("button", { name: /OSM lift 706193014.*unassigned/u })).toBeInTheDocument();
  });

  it("routes confirmed facilities to mapped geometry and missing or candidate facilities to facts", () => {
    const onSelect = vi.fn();
    const onSelectFacility = vi.fn();
    render(
      <I18nProvider locale="en">
        <MountainFeatureExplorer onSelect={onSelect} onSelectFacility={onSelectFacility} onClose={vi.fn()} />
      </I18nProvider>,
    );

    const matched = nordketteFacilities.find(({ name }) => name === "Seegrubenbahn")!;
    fireEvent.click(screen.getByRole("button", { name: /Seegrubenbahn/u }));
    expect(onSelect).toHaveBeenCalledWith("way/25170582");
    expect(onSelectFacility).not.toHaveBeenCalled();

    const missing = nordketteFacilities.find(({ name }) => name === "Hungerburgbahn")!;
    fireEvent.click(screen.getByRole("button", { name: /Hungerburgbahn/u }));
    expect(onSelectFacility).toHaveBeenCalledWith(missing.id);
    expect(onSelect).toHaveBeenCalledTimes(1);

    const candidate = nordketteFacilities.find(({ geometry }) => geometry.status === "candidate")!;
    fireEvent.click(screen.getByRole("button", { name: /Förderband Zauberteppich/u }));
    expect(onSelectFacility).toHaveBeenLastCalledWith(candidate.id);
    expect(matched.geometry).toMatchObject({ status: "matched", featureId: "way/25170582" });
  });
});
