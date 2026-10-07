import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import TrackingProvider from "./TrackingProvider";

const nav = vi.hoisted(() => ({ pathname: "/feed" }));
vi.mock("next/navigation", () => ({ usePathname: () => nav.pathname }));
vi.mock("./useSkiDayTracker", () => ({
  useSkiDayTracker: () => ({
    state: { startedAt: Date.now() - 60_000, distanceM: 1200, track: [] },
    now: Date.now(),
    finished: null,
    clearFinished: vi.fn(),
  }),
}));

describe("TrackingProvider bar", () => {
  beforeEach(() => {
    nav.pathname = "/feed";
  });

  it("leads back to the map while a day runs", () => {
    render(<TrackingProvider userId="u1"><p>page</p></TrackingProvider>);
    expect(screen.getByRole("link", { name: /Ski day running/ })).toHaveAttribute("href", "/map");
  });

  it("stays out of the way of the message box in a chat thread", () => {
    nav.pathname = "/crew/chat/123";
    render(<TrackingProvider userId="u1"><p>page</p></TrackingProvider>);
    expect(screen.queryByRole("link", { name: /Ski day running/ })).not.toBeInTheDocument();
  });
});
