import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import EventsScreen from "./EventsScreen";
import { toLiveRide, type RideRow } from "./live-ride";

const mocks = vi.hoisted(() => ({ join: vi.fn(), leave: vi.fn(), refresh: vi.fn() }));

vi.mock("./actions", () => ({
  joinRideAction: mocks.join,
  leaveRideAction: mocks.leave,
  cancelRideAction: vi.fn(),
  createRideAction: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  usePathname: () => "/events",
  useRouter: () => ({ refresh: mocks.refresh }),
}));

const NOW = new Date(2027, 0, 8, 9);

function row(patch: Partial<RideRow>): RideRow {
  return {
    id: "event-1",
    host_id: "host-1",
    host_display_name: "Julia Mayer",
    host_handle: "julia",
    host_is_minor: false,
    resort: "Axamer Lizum",
    city: "innsbruck",
    ability_level: "chill",
    ride_date: "2027-01-09",
    meet_time: "09:30:00",
    meet_point: null,
    meet_point_locked: true,
    total_spots: 10,
    taken_spots: 3,
    caption: null,
    title: "Freshers day",
    visibility: "public",
    created_at: "2027-01-08T07:00:00Z",
    is_host: false,
    is_joined: false,
    participants: [],
    ...patch,
  };
}

const live = (rows: RideRow[] | null) => ({
  rides: rows ? rows.map((r) => toLiveRide(r, NOW)) : null,
  defaultCity: "innsbruck" as const,
});

describe("EventsScreen with real data", () => {
  beforeEach(() => vi.clearAllMocks());

  it("lists only discoverable public events", () => {
    render(
      <EventsScreen
        live={live([
          row({}),
          row({ id: "e2", title: "Crew only", visibility: "friends" }),
          row({ id: "e3", title: "Minor host", host_is_minor: true }),
        ])}
      />,
    );

    expect(screen.getByText("Freshers day")).toBeInTheDocument();
    expect(screen.queryByText("Crew only")).not.toBeInTheDocument();
    expect(screen.queryByText("Minor host")).not.toBeInTheDocument();
  });

  it("joins on the server, which unlocks the meeting point on refresh", async () => {
    mocks.join.mockResolvedValue({ ok: true, message: "You are in." });
    const { rerender } = render(<EventsScreen live={live([row({})])} />);

    fireEvent.click(screen.getByText("Freshers day"));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText(/becomes visible once you join/)).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(within(dialog).getByRole("button", { name: "Join event" }));
    });
    expect(mocks.join).toHaveBeenCalledWith("event-1");
    expect(mocks.refresh).toHaveBeenCalled();

    rerender(
      <EventsScreen
        live={live([
          row({ is_joined: true, taken_spots: 4, meet_point: "Kinderland exit", meet_point_locked: false }),
        ])}
      />,
    );
    expect(within(screen.getByRole("dialog")).getByText("Kinderland exit")).toBeInTheDocument();
    expect(within(screen.getByRole("dialog")).getByText("4/10")).toBeInTheDocument();
  });

  it("shows a refusal from the server", async () => {
    mocks.join.mockResolvedValue({ ok: false, message: "This ride is full." });
    render(<EventsScreen live={live([row({})])} />);
    fireEvent.click(screen.getByText("Freshers day"));
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Join event" }));
    });
    expect(screen.getByText("This ride is full.")).toBeInTheDocument();
  });

  it("shows the host their own event without a join button", () => {
    render(<EventsScreen live={live([row({ is_host: true })])} />);
    fireEvent.click(screen.getByText("Freshers day"));
    expect(screen.getByText("You are hosting")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Join event" })).not.toBeInTheDocument();
  });

  it("says when events could not be loaded", () => {
    render(<EventsScreen live={live(null)} />);
    expect(screen.getByText(/Events could not be loaded/)).toBeInTheDocument();
  });
});
