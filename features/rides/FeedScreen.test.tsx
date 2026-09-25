import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import FeedScreen from "./FeedScreen";
import { toIsoDay, toLiveRide, type RideRow } from "./live-ride";

const mocks = vi.hoisted(() => ({
  join: vi.fn(),
  leave: vi.fn(),
  cancel: vi.fn(),
  create: vi.fn(),
  refresh: vi.fn(),
}));

vi.mock("./actions", () => ({
  joinRideAction: mocks.join,
  leaveRideAction: mocks.leave,
  cancelRideAction: mocks.cancel,
  createRideAction: mocks.create,
}));
vi.mock("next/navigation", () => ({
  usePathname: () => "/feed",
  useRouter: () => ({ refresh: mocks.refresh }),
}));

const NOW = new Date();
const today = toIsoDay(NOW);

function row(patch: Partial<RideRow>): RideRow {
  return {
    id: "ride-1",
    host_id: "host-1",
    host_display_name: "Lena Moser",
    host_handle: "lena_m",
    host_is_minor: false,
    resort: "Nordkette",
    city: "innsbruck",
    ability_level: "park",
    ride_date: today,
    meet_time: "09:00:00",
    meet_point: null,
    meet_point_locked: true,
    total_spots: 3,
    taken_spots: 0,
    caption: "Rails are set",
    title: null,
    visibility: "friends",
    created_at: NOW.toISOString(),
    is_host: false,
    is_joined: false,
    participants: [],
    ...patch,
  };
}

function live(rows: RideRow[] | null, viewerIsMinor = false) {
  return {
    rides: rows ? rows.map((r) => toLiveRide(r, NOW)) : null,
    viewerIsMinor,
    defaultCity: "innsbruck" as const,
  };
}

describe("FeedScreen with real data", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shows friends rides of the region and leaves public events to their screen", () => {
    render(
      <FeedScreen
        live={live([
          row({}),
          row({ id: "ride-2", resort: "Stubai Glacier", visibility: "public", title: "Open day" }),
          row({ id: "ride-3", resort: "Zell am See", city: "salzburg" }),
        ])}
      />,
    );

    expect(screen.getAllByText("Nordkette").length).toBeGreaterThan(0);
    expect(screen.queryByText("Stubai Glacier")).not.toBeInTheDocument();
    expect(screen.queryByText("Zell am See")).not.toBeInTheDocument();
    expect(screen.getByText("Meeting point unlocks when you join")).toBeInTheDocument();
  });

  it("joins through the server and refreshes", async () => {
    mocks.join.mockResolvedValue({ ok: true, message: "You are in." });
    render(<FeedScreen live={live([row({})])} />);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Join" }));
    });

    expect(mocks.join).toHaveBeenCalledWith("ride-1");
    expect(mocks.refresh).toHaveBeenCalled();
    expect(screen.getByText(/You are in/)).toBeInTheDocument();
  });

  it("leaves a joined ride", async () => {
    mocks.leave.mockResolvedValue({ ok: true, message: "You left the ride." });
    render(<FeedScreen live={live([row({ is_joined: true, taken_spots: 1 })])} />);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Joined" }));
    });

    expect(mocks.leave).toHaveBeenCalledWith("ride-1");
  });

  it("shows the server's refusal and lets it be dismissed", async () => {
    mocks.join.mockResolvedValue({ ok: false, message: "This ride is full." });
    render(<FeedScreen live={live([row({})])} />);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Join" }));
    });

    expect(screen.getByText("This ride is full.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(screen.queryByText("This ride is full.")).not.toBeInTheDocument();
  });

  it("marks the viewer's own ride and lets the host cancel it", async () => {
    mocks.cancel.mockResolvedValue({ ok: true, message: "Ride cancelled." });
    render(<FeedScreen live={live([row({ is_host: true, meet_point: "Congress", meet_point_locked: false })])} />);

    expect(screen.getByText("Your ride")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Rails are set"));
    const dialog = screen.getByRole("dialog", { name: "Ride details" });
    await act(async () => {
      fireEvent.click(within(dialog).getByRole("button", { name: "Cancel this ride" }));
    });

    expect(mocks.cancel).toHaveBeenCalledWith("ride-1");
  });

  it("points an unfinished profile to the profile tab", () => {
    render(<FeedScreen live={{ ...live([]), profileComplete: false }} />);
    expect(screen.getByRole("link", { name: /Finish your profile/ })).toHaveAttribute("href", "/profile");
  });

  it("says when rides could not be loaded", () => {
    render(<FeedScreen live={live(null)} />);
    expect(screen.getByText(/Rides could not be loaded/)).toBeInTheDocument();
    expect(screen.queryByText("No rides today yet")).not.toBeInTheDocument();
  });

  it("points an empty feed to the open events", () => {
    render(<FeedScreen live={live([])} />);
    expect(screen.getByRole("link", { name: "Browse open events" })).toHaveAttribute("href", "/events");
  });

  it("posts a ride through the server", async () => {
    mocks.create.mockResolvedValue({ ok: true, message: "Ride posted." });
    render(<FeedScreen live={live([])} />);

    fireEvent.click(screen.getByRole("button", { name: "Post a ride" }));
    fireEvent.change(screen.getByLabelText("Resort"), { target: { value: "Nordkette" } });
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    fireEvent.change(screen.getByLabelText("Meeting point"), { target: { value: "Congress station" } });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Publish" }));
    });

    expect(mocks.create).toHaveBeenCalledWith(
      expect.objectContaining({ resort: "Nordkette", city: "innsbruck", meetPoint: "Congress station", visibility: "friends" }),
    );
    expect(mocks.refresh).toHaveBeenCalled();
  });

  it("keeps the post sheet open and shows the error when posting fails", async () => {
    mocks.create.mockResolvedValue({ ok: false, message: "Public events are 18 and over only." });
    render(<FeedScreen live={live([])} />);

    fireEvent.click(screen.getByRole("button", { name: "Post a ride" }));
    fireEvent.change(screen.getByLabelText("Resort"), { target: { value: "Nordkette" } });
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    fireEvent.click(screen.getByRole("button", { name: /Public/ }));
    fireEvent.change(screen.getByLabelText("Meeting point"), { target: { value: "Congress station" } });
    expect(screen.getByRole("button", { name: "Publish" })).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Event name"), { target: { value: "Park day" } });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Publish" }));
    });

    expect(screen.getByRole("alert")).toHaveTextContent("Public events are 18 and over only.");
  });

  it("locks the public option for a minor", () => {
    render(<FeedScreen live={live([], true)} />);
    fireEvent.click(screen.getByRole("button", { name: "Post a ride" }));
    fireEvent.change(screen.getByLabelText("Resort"), { target: { value: "Nordkette" } });
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByRole("button", { name: /Public/ })).toBeDisabled();
  });
});

describe("FeedScreen demo", () => {
  it("still runs on fixtures and joins locally", () => {
    render(<FeedScreen />);
    const joinButtons = screen.getAllByRole("button", { name: "Join" });
    fireEvent.click(joinButtons[0]!);
    expect(mocks.join).not.toHaveBeenCalled();
    expect(screen.getAllByRole("button", { name: "Joined" }).length).toBeGreaterThan(0);
  });
});
