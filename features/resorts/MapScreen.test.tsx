import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import MapScreen from "./MapScreen";
import { toLiveRide } from "@/features/rides/live-ride";

vi.mock("next/dynamic", () => ({ default: () => () => <div data-testid="map" /> }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

const now = new Date();
const today = [now.getFullYear(), String(now.getMonth() + 1).padStart(2, "0"), String(now.getDate()).padStart(2, "0")].join("-");

const liveRide = toLiveRide(
  {
    id: "r1",
    host_id: "h",
    host_display_name: "Lena Moser",
    host_handle: "lena_m",
    host_is_minor: false,
    resort: "Nordkette",
    city: "innsbruck",
    ability_level: "park",
    ride_date: today,
    meet_time: "10:00:00",
    meet_point: null,
    meet_point_locked: true,
    total_spots: 4,
    taken_spots: 1,
    caption: null,
    title: null,
    visibility: "friends",
    created_at: now.toISOString(),
    is_host: false,
    is_joined: false,
    participants: [],
  },
  now,
);

describe("MapScreen", () => {
  it("shows real activity and hides unsourced conditions", () => {
    render(<MapScreen live={{ rides: [liveRide], defaultCity: "innsbruck" }} />);

    expect(screen.getAllByText(/2 riding today/).length).toBeGreaterThan(0);
    expect(screen.queryByText("deepest snow")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Hotspot/ }));
    const dialog = screen.getByRole("dialog", { name: "Details for Nordkette" });
    expect(within(dialog).getByText("spots open")).toBeInTheDocument();
    expect(within(dialog).getByText("Lena Moser")).toBeInTheDocument();
    expect(within(dialog).queryByText("lifts open")).not.toBeInTheDocument();
  });

  it("drops the hotspot when nobody is out and reports load failures", () => {
    render(<MapScreen live={{ rides: null, defaultCity: "salzburg" }} />);
    expect(screen.queryByRole("button", { name: /Hotspot/ })).not.toBeInTheDocument();
    expect(screen.getByText(/could not be loaded/)).toBeInTheDocument();
  });

  it("keeps the sample conditions in the demo", () => {
    render(<MapScreen />);
    expect(screen.getByText("deepest snow")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Hotspot/ }));
    expect(within(screen.getByRole("dialog")).getByText("lifts open")).toBeInTheDocument();
  });
});
