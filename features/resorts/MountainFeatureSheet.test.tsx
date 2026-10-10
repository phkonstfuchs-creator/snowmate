import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { I18nProvider } from "@/lib/i18n/client";
import type { MountainFeature } from "@/features/mountain-data/catalog";
import { mountainFeatureById } from "@/features/mountain-data/catalog";
import MountainFeatureSheet from "./MountainFeatureSheet";

const piste: MountainFeature = {
  id: "way/24559397",
  name: "2 - Zweier Skiroute",
  kind: "piste",
  difficulty: undefined,
  duration: undefined,
  osmVersion: 35,
  osmTimestamp: "2026-09-20T11:14:03Z",
  resort: "Nordkette",
};

const lift: MountainFeature = {
  id: "way/25170582",
  name: "Seegrubenbahn",
  kind: "lift",
  difficulty: undefined,
  duration: "5.166666667",
  osmVersion: 25,
  osmTimestamp: "2026-08-02T07:45:00Z",
  resort: "Nordkette",
};

function renderSheet(feature: MountainFeature, locale: "en" | "de" = "en") {
  const onClose = vi.fn();
  const onBrowse = vi.fn();
  const { unmount } = render(
    <I18nProvider locale={locale}>
      <MountainFeatureSheet feature={feature} onClose={onClose} onBrowse={onBrowse} />
    </I18nProvider>,
  );
  return { onClose, onBrowse, unmount };
}

describe("MountainFeatureSheet", () => {
  it("explains unknown piste difficulty and operational status without implying live conditions", () => {
    renderSheet(piste);

    expect(screen.getByRole("dialog", { name: piste.name })).toBeInTheDocument();
    expect(screen.getByText("Difficulty not mapped")).toBeInTheDocument();
    expect(screen.getByText("Operational status unavailable")).toBeInTheDocument();
    expect(screen.getByText(/inventory snapshot.*not live/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "View on OpenStreetMap" })).toHaveAttribute(
      "href",
      "https://www.openstreetmap.org/way/24559397",
    );
    expect(screen.getByRole("link", { name: "Live lift and piste status" })).toHaveAttribute("href", "https://nordkette.com/en/lifts-slopes/");
    expect(screen.getByRole("link", { name: "Nordkette webcams" })).toHaveAttribute("href", "https://nordkette.com/en/cams/");
  });

  it("labels lift duration as unverified OSM data and leaves queue information unknown", () => {
    renderSheet(lift);

    expect(screen.getByText("5.2 min")).toBeInTheDocument();
    expect(screen.getByText(/estimated duration.*OpenStreetMap.*unverified/i)).toBeInTheDocument();
    expect(screen.getByText("Queue time unavailable")).toBeInTheDocument();
    expect(screen.queryByText(/open now|closed now/i)).not.toBeInTheDocument();
  });

  it("uses the operator facility name for a mapped chairlift and preserves its OSM feature name", () => {
    const mappedChair = mountainFeatureById("way/25750412");
    expect(mappedChair).not.toBeNull();
    renderSheet(mappedChair!);

    expect(screen.getByRole("dialog", { name: "Sessellift 3er Stütze" })).toBeInTheDocument();
    expect(screen.getByText(/OpenStreetMap feature name: Seegrube/u)).toBeInTheDocument();
  });

  it("omits malformed durations and invalid OSM IDs instead of creating unsupported links", () => {
    renderSheet({ ...lift, id: "way/0", duration: "999999" });

    expect(screen.queryByText(/min/)).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "View on OpenStreetMap" })).not.toBeInTheDocument();
  });

  it("uses German copy while preserving localized duration formatting", () => {
    renderSheet(lift, "de");

    expect(screen.getByText("5,2 min")).toBeInTheDocument();
    expect(screen.getByText("Wartezeit nicht verfügbar")).toBeInTheDocument();
  });

  it.each([
    { difficulty: "freeride", english: "Freeride", german: "Freeride" },
    { difficulty: "novice", english: "Novice", german: "Anfänger" },
  ])("translates the $difficulty OSM difficulty for both locales", ({ difficulty, english, german }) => {
    const feature = { ...piste, difficulty };
    const { unmount } = renderSheet(feature, "en");
    expect(screen.getByText(english, { exact: true })).toBeInTheDocument();
    unmount();

    renderSheet(feature, "de");
    expect(screen.getByText(german, { exact: true })).toBeInTheDocument();
  });

  it("offers the optional inventory browse action and closes through the shared sheet", async () => {
    const { onClose, onBrowse } = renderSheet(piste);
    fireEvent.click(screen.getByRole("button", { name: "Browse all pistes and lifts" }));
    expect(onBrowse).toHaveBeenCalledOnce();

    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() => expect(onClose).toHaveBeenCalledOnce());
  });
});
