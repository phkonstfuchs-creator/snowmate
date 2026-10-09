import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import GoPlanner, { type PreviewDayPlan } from "./GoPlanner";

function advanceToMeetingStep() {
  fireEvent.click(screen.getByRole("button", { name: "Weiter" }));
  fireEvent.click(screen.getByRole("button", { name: "Weiter" }));
}

describe("GoPlanner", () => {
  it("lets someone plan a private day without a ride or crew", () => {
    const onComplete = vi.fn<(plan: PreviewDayPlan) => void>();
    render(<GoPlanner onClose={vi.fn()} onComplete={onComplete} />);

    expect(screen.getByRole("dialog", { name: /Pistl Go/ })).toBeInTheDocument();
    expect(screen.getByText(/keine bestehende Fahrt/i)).toBeInTheDocument();
    advanceToMeetingStep();
    fireEvent.click(screen.getByRole("button", { name: /Skitag vormerken/i }));

    expect(onComplete).toHaveBeenCalledWith(expect.objectContaining({
      resort: "Nordkette",
      transport: "need",
      meeting: "Seegrube",
      crew: [],
    }));
  });

  it("keeps crew opt-in and reports a blank custom meeting point accessibly", async () => {
    const onComplete = vi.fn<(plan: PreviewDayPlan) => void>();
    const onClose = vi.fn();
    render(<GoPlanner onClose={onClose} onComplete={onComplete} />);

    fireEvent.click(screen.getByRole("button", { name: "Weiter" }));
    expect(screen.getByText(/Beispielprofile/i)).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText(/Mia/));
    fireEvent.click(screen.getByRole("radio", { name: /Kann Platz anbieten/i }));
    fireEvent.click(screen.getByRole("button", { name: "Weiter" }));
    fireEvent.click(screen.getByRole("radio", { name: /Eigener Treffpunkt/i }));
    fireEvent.click(screen.getByRole("button", { name: /Skitag vormerken/i }));

    expect(screen.getByRole("alert")).toHaveTextContent(/Bitte gib deinen Treffpunkt ein/i);
    fireEvent.change(screen.getByRole("textbox", { name: "Eigener Treffpunkt" }), { target: { value: "  Talstation  " } });
    fireEvent.click(screen.getByRole("button", { name: /Skitag vormerken/i }));

    expect(onComplete).toHaveBeenCalledWith(expect.objectContaining({
      resort: "Nordkette",
      transport: "offer",
      meeting: "Talstation",
      crew: ["Mia"],
    }));
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  });

  it("closes on Escape", async () => {
    const onClose = vi.fn();
    render(<GoPlanner onClose={onClose} onComplete={vi.fn()} />);

    fireEvent.keyDown(document, { key: "Escape" });

    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  });

  it("keeps the planner on step one when the date is cleared", () => {
    render(<GoPlanner onClose={vi.fn()} onComplete={vi.fn()} />);

    fireEvent.change(screen.getByLabelText("Datum"), { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: "Weiter" }));

    expect(screen.getByRole("alert")).toHaveTextContent(/Datum ab heute/i);
    expect(screen.getByRole("heading", { name: "Wo geht’s hin?" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Wer wär dabei?" })).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Datum"), { target: { value: "2000-01-01" } });
    fireEvent.click(screen.getByRole("button", { name: "Weiter" }));
    expect(screen.getByRole("alert")).toHaveTextContent(/Datum ab heute/i);
    expect(screen.queryByRole("heading", { name: "Wer wär dabei?" })).not.toBeInTheDocument();
  });

  it("uses Stubai meetups and preserves editable choices when going back", () => {
    const onComplete = vi.fn<(plan: PreviewDayPlan) => void>();
    render(<GoPlanner onClose={vi.fn()} onComplete={onComplete} />);

    fireEvent.click(screen.getByRole("button", { name: "Stubai" }));
    fireEvent.click(screen.getByRole("button", { name: "Weiter" }));
    fireEvent.click(screen.getByLabelText(/Mia/));
    fireEvent.click(screen.getByRole("radio", { name: /Bin mobil/i }));
    fireEvent.click(screen.getByRole("button", { name: "Weiter" }));

    expect(screen.getByText("Treffpunkt · Stubai")).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /Mutterberg Talstation/i })).toBeChecked();
    fireEvent.click(screen.getByRole("radio", { name: /Gamsgarten/i }));
    fireEvent.click(screen.getByRole("button", { name: "Zurück" }));

    expect(screen.getByLabelText(/Mia/)).toBeChecked();
    expect(screen.getByRole("radio", { name: /Bin mobil/i })).toBeChecked();
    fireEvent.click(screen.getByLabelText(/Mia/));
    fireEvent.click(screen.getByRole("button", { name: "Weiter" }));

    expect(screen.getByRole("radio", { name: /Gamsgarten/i })).toBeChecked();
    expect(screen.getByText(/Solo starten geht klar · Eigene Anreise/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Skitag vormerken/i }));

    expect(onComplete).toHaveBeenCalledWith(expect.objectContaining({
      resort: "Stubai",
      transport: "own",
      meeting: "Gamsgarten",
      crew: [],
    }));
  });
});
