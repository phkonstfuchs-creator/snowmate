import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LIFTS } from "@/lib/lifts";
import CrewOnMap from "./CrewOnMap";

const fresh = new Date(Date.now() - 2 * 60_000).toISOString();

describe("CrewOnMap", () => {
  it("lists sharing friends with where they are, and flies the map there", () => {
    const onFocus = vi.fn();
    render(<CrewOnMap onFocus={onFocus} friends={[{ userId: "u1", name: "Lena", handle: "lena", lat: 47.3247, lng: 11.3867, accuracy: 10, updatedAt: fresh }]} />);
    const card = screen.getByRole("button", { name: /Lena/ });
    expect(card).toHaveTextContent("2 min ago");
    fireEvent.click(card);
    expect(onFocus).toHaveBeenCalledWith(47.3247, 11.3867, "u1");
  });

  it("says when nobody shares, and stays hidden before the first load", () => {
    const { rerender } = render(<CrewOnMap onFocus={vi.fn()} friends={[]} canStartLift />);
    expect(screen.getByText(/Taking a lift\? Let them know with the lift button/)).toBeInTheDocument();
    /* Under 16 there is no lift button below to point to. */
    rerender(<CrewOnMap onFocus={vi.fn()} friends={[]} />);
    expect(screen.getByText("Nobody in your crew is sharing their location right now.")).toBeInTheDocument();
    rerender(<CrewOnMap onFocus={vi.fn()} friends={null} />);
    expect(screen.queryByText(/crew on the mountain/i)).not.toBeInTheDocument();
  });
});


describe("compact crew controls", () => {
  it("qualifies projected arrival without a new GPS fix in the main status", () => {
    const lift = LIFTS[0]!;
    const friend = { userId: "u1", name: "Lena", handle: "lena", lat: (lift.bottomCoordinates[0] + lift.topCoordinates[0]) / 2, lng: (lift.bottomCoordinates[1] + lift.topCoordinates[1]) / 2, accuracy: 10, updatedAt: new Date(Date.now() - 5 * 60_000).toISOString() };
    render(<CrewOnMap compact onFocus={vi.fn()} friends={[friend]} />);
    expect(screen.getByRole("button", { name: /Lena/ })).toHaveTextContent("Estimated near");
  });

  it("keeps selection and map focusing accessible", () => {
    const onFocus = vi.fn();
    render(<CrewOnMap compact selectedId="u1" onFocus={onFocus} friends={[{ userId: "u1", name: "Lena", handle: "lena", lat: 47.3247, lng: 11.3867, accuracy: 10, updatedAt: fresh }]} />);
    const card = screen.getByRole("button", { name: /Lena/ });
    expect(card).toHaveAttribute("aria-pressed", "true");
    expect(card).toHaveClass("min-h-11");
    fireEvent.click(card);
    expect(onFocus).toHaveBeenCalledWith(47.3247, 11.3867, "u1");
  });

  it("marks station guesses as estimates and suppresses stale lift claims", () => {
    const lift = LIFTS[0]!;
    const friend = { userId: "u1", name: "Lena", handle: "lena", lat: lift.topCoordinates[0], lng: lift.topCoordinates[1], accuracy: 10, updatedAt: new Date().toISOString() };
    const { rerender } = render(<CrewOnMap compact onFocus={vi.fn()} friends={[friend]} />);
    expect(screen.getByRole("button", { name: /Lena/ })).toHaveTextContent("estimate");
    rerender(<CrewOnMap compact onFocus={vi.fn()} friends={[{ ...friend, updatedAt: new Date(Date.now() - 20 * 60_000).toISOString() }]} />);
    expect(screen.getByRole("button", { name: /Lena/ })).not.toHaveTextContent("estimate");
    expect(screen.getByRole("button", { name: /Lena/ })).toHaveTextContent("20 min ago");
  });
});
