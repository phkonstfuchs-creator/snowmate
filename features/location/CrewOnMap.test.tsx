import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import CrewOnMap from "./CrewOnMap";

const fresh = new Date(Date.now() - 2 * 60_000).toISOString();

describe("CrewOnMap", () => {
  it("lists sharing friends with where they are, and flies the map there", () => {
    const onFocus = vi.fn();
    render(<CrewOnMap onFocus={onFocus} friends={[{ userId: "u1", name: "Lena", handle: "lena", lat: 47.3247, lng: 11.3867, accuracy: 10, updatedAt: fresh }]} />);
    const card = screen.getByRole("button", { name: /Lena/ });
    expect(card).toHaveTextContent("2 min ago");
    fireEvent.click(card);
    expect(onFocus).toHaveBeenCalledWith(47.3247, 11.3867);
  });

  it("says when nobody shares, and stays hidden before the first load", () => {
    const { rerender } = render(<CrewOnMap onFocus={vi.fn()} friends={[]} />);
    expect(screen.getByText(/Nobody in your crew is sharing right now/)).toBeInTheDocument();
    rerender(<CrewOnMap onFocus={vi.fn()} friends={null} />);
    expect(screen.queryByText(/crew on the mountain/i)).not.toBeInTheDocument();
  });
});
