import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { I18nProvider } from "@/lib/i18n/client";
import MountainFeatureExplorer from "./MountainFeatureExplorer";

vi.mock("@/features/mountain-data/catalog", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/features/mountain-data/catalog")>();
  return {
    ...actual,
    mountainFeatures: [...actual.mountainFeatures, {
      id: "way/999001", name: "Imported funicular", kind: "lift", resort: "Nordkette", osmVersion: 1, osmTimestamp: "2026-10-10T12:00:00Z",
    }, {
      id: "way/999002", name: "OSM lift 999002", kind: "lift", aerialwayType: "chair_lift", resort: "Nordkette", osmVersion: 1, osmTimestamp: "2026-10-10T12:00:00Z",
    }],
  };
});

describe("imported unassigned lift discovery", () => {
  it("preserves a named funicular instead of presenting it as an unnamed conveyor", () => {
    const onSelect = vi.fn();
    render(<I18nProvider locale="en"><MountainFeatureExplorer onSelect={onSelect} onSelectFacility={vi.fn()} onClose={vi.fn()} /></I18nProvider>);
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "Imported funicular" } });
    const lift = screen.getByRole("button", { name: /Imported funicular.*unassigned/iu });
    expect(lift).toHaveTextContent("Imported funicular");
    expect(lift).not.toHaveTextContent("Unnamed conveyor lift");
    fireEvent.click(lift);
    expect(onSelect).toHaveBeenCalledWith("way/999001");
  });
  it("does not relabel an unnamed chairlift as a conveyor", () => {
    render(<I18nProvider locale="en"><MountainFeatureExplorer onSelect={vi.fn()} onSelectFacility={vi.fn()} onClose={vi.fn()} /></I18nProvider>);
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "999002" } });
    const lift = screen.getByRole("button", { name: /OSM lift 999002.*unassigned/iu });
    expect(lift).toHaveTextContent("OSM lift 999002");
    expect(lift).not.toHaveTextContent("Unnamed conveyor lift");
  });
});
