import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { I18nProvider } from "@/lib/i18n/client";
import MountainFeatureExplorer from "./MountainFeatureExplorer";

function renderExplorer(locale: "en" | "de" = "en") {
  const onSelect = vi.fn();
  render(
    <I18nProvider locale={locale}>
      <MountainFeatureExplorer onSelect={onSelect} onClose={vi.fn()} />
    </I18nProvider>,
  );
  return onSelect;
}

describe("MountainFeatureExplorer", () => {
  it("shows the honest partial inventory counts and filters semantic feature buttons", () => {
    renderExplorer();

    expect(screen.getByRole("dialog", { name: "Pistes & lifts" })).toBeInTheDocument();
    expect(screen.getByText(/25 mapped pistes/i)).toBeInTheDocument();
    expect(screen.getByText(/5 lifts/i)).toBeInTheDocument();
    expect(screen.getByText(/partial coverage/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Lifts" }));
    expect(screen.getByRole("button", { name: "Seegrubenbahn" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "2 - Zweier Skiroute" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Pistes" }));
    expect(screen.getByRole("button", { name: "2 - Zweier Skiroute" })).toBeInTheDocument();
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
    const piste = screen.getByRole("button", { name: "2 - Zweier Skiroute" });
    expect(screen.getByRole("button", { name: "Alle" })).toBeInTheDocument();
    fireEvent.click(piste);

    expect(onSelect).toHaveBeenCalledWith("way/24559397");
  });

  it("keeps list controls large enough without horizontal scrolling", () => {
    renderExplorer();
    for (const name of ["All", "Pistes", "Lifts"]) {
      const button = screen.getByRole("button", { name });
      expect(button).toHaveClass("mountainFilter");
    }
    expect(within(screen.getByRole("dialog")).getByRole("list")).toBeInTheDocument();
  });
});
