import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import BottomNav from "./BottomNav";

vi.mock("next/navigation", () => ({ usePathname: () => "/people" }));

describe("BottomNav", () => {
  it("shows waiting counts and caps them", () => {
    render(<BottomNav badges={{ "/crew": 3, "/feed": 12 }} />);

    expect(screen.getByRole("link", { name: "Crew, 3 waiting" })).not.toHaveAttribute("aria-current");
    expect(screen.getByRole("link", { name: "Today, 12 waiting" })).toHaveTextContent("9+");
    expect(screen.getByRole("link", { name: "Discover" })).toHaveAttribute("aria-current", "page");
  });

  it("shows no badge without a count", () => {
    render(<BottomNav />);
    expect(screen.getByRole("link", { name: "Crew" })).toBeInTheDocument();
  });

  it("keeps to the five core destinations", () => {
    render(<BottomNav />);
    expect(screen.getAllByRole("link")).toHaveLength(5);
    expect(screen.queryByRole("link", { name: "Events" })).not.toBeInTheDocument();
    /* Carpools are reached from the feed; meeting riders has the tab. */
    expect(screen.queryByRole("link", { name: "Carpool" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Discover" })).toHaveAttribute("href", "/people");
  });
});
