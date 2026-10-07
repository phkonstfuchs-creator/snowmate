import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LIFTS } from "@/lib/lifts";
import LiftStartSheet from "./LiftStartSheet";

const seegrube = LIFTS.find((lift) => lift.name === "Seegrubenbahn")!;
const atValley = { lat: seegrube.bottomCoordinates[0], lng: seegrube.bottomCoordinates[1], accuracy: 10 };
const base = { resortNames: ["Nordkette"], busy: false, result: null, onClose: vi.fn() };

describe("LiftStartSheet", () => {
  it("takes one fresh fix, guesses the lift, shows the forecast and starts it in one tap", async () => {
    const onStart = vi.fn().mockResolvedValue(true);
    const requestPosition = vi.fn().mockResolvedValue(atValley);
    render(<LiftStartSheet {...base} requestPosition={requestPosition} onStart={onStart} />);
    expect(requestPosition).toHaveBeenCalledTimes(1);
    expect(await screen.findByText("Seegrubenbahn")).toBeInTheDocument();
    expect(screen.getByText(/You'll be at the top, Seegrube, around \d\d:\d\d/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Tell my crew" }));
    expect(onStart).toHaveBeenCalledWith("Nordkette", seegrube.id);
  });

  it("starts nothing while locating, and offers picking by hand", () => {
    const requestPosition = vi.fn(() => new Promise<null>(() => undefined));
    render(<LiftStartSheet {...base} requestPosition={requestPosition} onStart={vi.fn()} />);
    expect(screen.getByText("Finding your lift …")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Tell my crew" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Pick the lift myself" }));
    expect(screen.getByRole("combobox", { name: "Choose a lift" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Tell my crew" })).toBeEnabled();
  });

  it("falls back to the lists when no position comes", async () => {
    render(<LiftStartSheet {...base} requestPosition={vi.fn().mockResolvedValue(null)} onStart={vi.fn()} />);
    expect(await screen.findByText("No lift detected nearby. Pick it quickly.")).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Choose a lift" })).toBeInTheDocument();
  });
});
