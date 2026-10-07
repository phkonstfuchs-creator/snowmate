import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import NextStep from "./NextStep";

describe("NextStep", () => {
  it("offers one action, as a link or a button", () => {
    const onAction = vi.fn();
    const { rerender } = render(<NextStep icon="user-plus" text="Hol deine Crew rein" action="Einladen" href="/crew" />);
    expect(screen.getByRole("note")).toHaveTextContent("Hol deine Crew rein");
    expect(screen.getByRole("link", { name: "Einladen" })).toHaveAttribute("href", "/crew");
    rerender(<NextStep icon="user-plus" text="Noch kein Ride" action="Ride posten" onAction={onAction} />);
    fireEvent.click(screen.getByRole("button", { name: "Ride posten" }));
    expect(onAction).toHaveBeenCalled();
  });
});
