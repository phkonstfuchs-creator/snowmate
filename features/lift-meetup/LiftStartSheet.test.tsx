import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LIFTS } from "@/lib/lifts";
import LiftStartSheet from "./LiftStartSheet";

const seegrube = LIFTS.find((lift) => lift.name === "Seegrubenbahn")!;
const atValley = { lat: seegrube.bottomCoordinates[0], lng: seegrube.bottomCoordinates[1], accuracy: 10 };

describe("LiftStartSheet", () => {
  it("guesses the lift from the position, shows the forecast and starts it in one tap", async () => {
    const onStart = vi.fn().mockResolvedValue(true);
    const props = { resortNames: ["Nordkette"], busy: false, result: null, onLocate: vi.fn(), onStart, onClose: vi.fn() };
    const { rerender } = render(<LiftStartSheet {...props} me={null} />);
    rerender(<LiftStartSheet {...props} me={{ ...atValley }} />);
    expect(screen.getByText("Seegrubenbahn")).toBeInTheDocument();
    expect(screen.getByText(/You'll be at the top, Seegrube, around \d\d:\d\d/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Tell my crew" }));
    expect(onStart).toHaveBeenCalledWith("Nordkette", seegrube.id);
  });

  it("ignores a position from before the sheet opened", () => {
    const onLocate = vi.fn();
    render(<LiftStartSheet resortNames={["Nordkette"]} me={atValley} busy={false} result={null} onLocate={onLocate} onStart={vi.fn()} onClose={vi.fn()} />);
    expect(onLocate).toHaveBeenCalledTimes(1);
    expect(screen.queryByText("Seegrubenbahn")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Tell my crew" })).toBeDisabled();
  });

  it("asks for the position on open and offers picking by hand", () => {
    const onLocate = vi.fn();
    render(<LiftStartSheet resortNames={["Nordkette"]} me={null} busy={false} result={null} onLocate={onLocate} onStart={vi.fn()} onClose={vi.fn()} />);
    expect(onLocate).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "Tell my crew" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Pick the lift myself" }));
    expect(screen.getByRole("combobox", { name: "Choose a lift" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Tell my crew" })).toBeEnabled();
  });
});
