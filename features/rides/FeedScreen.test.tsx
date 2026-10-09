import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import FeedScreen from "./FeedScreen";
import { I18nProvider } from "@/lib/i18n/client";
import { toIsoDay, toLiveRide, type RideRow } from "./live-ride";

const mocks = vi.hoisted(() => ({
  join: vi.fn(),
  leave: vi.fn(),
  cancel: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  respond: vi.fn(),
  refresh: vi.fn(),
}));

vi.mock("./actions", () => ({
  joinRideAction: mocks.join,
  leaveRideAction: mocks.leave,
  cancelRideAction: mocks.cancel,
  createRideAction: mocks.create,
  updateRideAction: mocks.update,
  respondRideRequestAction: mocks.respond,
}));
vi.mock("@/features/notifications/PushSettings", () => ({ default: () => <div>push switch</div> }));
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

  it("keeps Go and lift meetup above feed content, even without rides", () => {
    render(<FeedScreen live={live([])} />);
    const go = screen.getByRole("button", { name: /Pistl Go/ });
    const lift = screen.getByRole("link", { name: /Lift meetup/ });
    expect(lift).toHaveAttribute("href", "/map?action=lift");
    expect(go.compareDocumentPosition(screen.getByRole("note")) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    fireEvent.click(go);
    const sheet = screen.getByRole("dialog", { name: "Pistl Go" });
    expect(within(sheet).getByText(/Choose a ride\. Set/)).toBeInTheDocument();
    expect(within(sheet).getByRole("link", { name: "Find your crew" })).toHaveAttribute("href", "/people");
    expect(within(sheet).getByRole("link", { name: "Browse open events" })).toHaveAttribute("href", "/events");
    expect(mocks.join).not.toHaveBeenCalled();
  });

  it("opens an eligible Go ride only after the chooser closes, without joining", async () => {
    const tomorrow = toIsoDay(new Date(NOW.getTime() + 86400000));
    render(<FeedScreen live={{ ...live([row({ ride_date: tomorrow }), row({ id: "own", is_host: true, ride_date: tomorrow, resort: "Stubai Glacier" })]), goInterests: { status: "ok", interests: [] } }} />);
    fireEvent.click(screen.getByRole("button", { name: /Pistl Go/ }));
    const chooser = screen.getByRole("dialog", { name: "Pistl Go" });
    expect(within(chooser).queryByText("Stubai Glacier")).not.toBeInTheDocument();
    fireEvent.click(within(chooser).getByRole("button", { name: /Nordkette/ }));
    expect(screen.queryByRole("dialog", { name: "Ride details" })).not.toBeInTheDocument();
    expect(await screen.findByRole("dialog", { name: "Ride details" })).toBeInTheDocument();
    expect(screen.queryByRole("dialog", { name: "Pistl Go" })).not.toBeInTheDocument();
    expect(mocks.join).not.toHaveBeenCalled();
  });

  it("keeps the Go entry honest when live data is unavailable", () => {
    render(<FeedScreen live={{ ...live(null), goInterests: { status: "unavailable" } }} />);
    fireEvent.click(screen.getByRole("button", { name: /Pistl Go/ }));
    const chooser = screen.getByRole("dialog", { name: "Pistl Go" });
    expect(within(chooser).getByRole("alert")).toHaveTextContent("Pistl Go is unavailable");
    expect(within(chooser).queryByRole("button", { name: /Nordkette/ })).not.toBeInTheDocument();
  });

  it("shows the owner's meeting prominently and prepares a ride without publishing", async () => {
    const planDate = toIsoDay(new Date(NOW.getTime() + 86400000));
    const plan = {
      id: "550e8400-e29b-41d4-a716-446655440000", version: 1,
      city: "salzburg" as const, resort: "Zell am See", planDate, meetTime: "12:30",
      transport: "own" as const, meetingText: "Main entrance",
      createdAt: NOW.toISOString(), updatedAt: NOW.toISOString(),
      expiresAt: new Date(NOW.getTime() + 3 * 86400000).toISOString(),
    };
    render(<FeedScreen live={{ ...live([]), viewerIsMinor: true, dayPlans: { status: "ok", plans: [plan] } }} />);
    const overview = screen.getByRole("region", { name: "Your private ski days" });
    expect(within(overview).getByText("Main entrance")).toBeVisible();
    fireEvent.click(within(overview).getByRole("button", { name: "Prepare a ride" }));
    const modal = screen.getByRole("dialog", { name: "Post a ride" });
    expect(within(modal).getByLabelText("Resort")).toHaveValue("Zell am See");
    expect(within(modal).getByRole("button", { name: "Next" })).toBeDisabled();
    fireEvent.click(within(modal).getByRole("button", { name: /Park/ }));
    fireEvent.click(within(modal).getByRole("button", { name: "Next" }));
    expect(within(modal).getByLabelText("Meeting point")).toHaveValue("Main entrance");
    expect(within(modal).getByLabelText("Time")).toHaveValue("12:30");
    expect(within(modal).getByLabelText("Day")).toHaveValue(planDate);
    expect(mocks.create).not.toHaveBeenCalled();
  });

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
      fireEvent.click(screen.getByRole("button", { name: /^I'm in/ }));
    });

    expect(mocks.join).toHaveBeenCalledWith("ride-1");
    expect(mocks.refresh).toHaveBeenCalled();
    expect(screen.getByText(/You are in/)).toBeInTheDocument();
  });

  it("offers notifications once, right after the first join", async () => {
    window.localStorage.clear();
    mocks.join.mockResolvedValue({ ok: true, message: "You are in." });
    const { unmount } = render(<FeedScreen live={live([row({})])} />);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /^I'm in/ }));
    });
    expect(screen.getByRole("dialog", { name: "Want to know when your crew heads out?" })).toHaveTextContent("push switch");
    fireEvent.click(screen.getByRole("button", { name: "Later" }));
    await waitFor(() => expect(screen.queryByRole("dialog", { name: /Want to know/ })).not.toBeInTheDocument());
    unmount();

    render(<FeedScreen live={live([row({ id: "ride-2" })])} />);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /^I'm in/ }));
    });
    expect(screen.queryByRole("dialog", { name: /Want to know/ })).not.toBeInTheDocument();
  });

  it("waits with the notification offer until the ride sheet it was joined from is closed", async () => {
    window.localStorage.clear();
    mocks.join.mockResolvedValue({ ok: true, message: "You are in." });
    render(<FeedScreen live={live([row({})])} />);
    fireEvent.click(screen.getByText("Rails are set"));
    const sheet = screen.getByRole("dialog");
    await act(async () => {
      fireEvent.click(within(sheet).getByRole("button", { name: /I'm in/ }));
    });
    expect(screen.queryByRole("dialog", { name: /Want to know/ })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Close ride details" }));
    await waitFor(() => expect(screen.getByRole("dialog", { name: "Want to know when your crew heads out?" })).toBeInTheDocument());
  });

  it("counts only today's riders as out today", () => {
    const later = new Date(NOW.getTime() + 3 * 24 * 60 * 60 * 1000);
    render(
      <FeedScreen
        live={live([row({ taken_spots: 2 }), row({ id: "ride-9", ride_date: toIsoDay(later), taken_spots: 5 })])}
      />,
    );
    expect(screen.getByText("3 out today")).toBeInTheDocument();
  });

  it("says which ride a join button is for", () => {
    render(<FeedScreen live={live([row({})])} />);
    expect(screen.getByRole("button", { name: "I'm in: Nordkette, Park, 09:00" })).toBeInTheDocument();
  });

  it("names the friends who are out today instead of a number", () => {
    const participants = [{ id: "friend-2", display_name: "Julia Mayer", handle: "juli" }];
    render(<FeedScreen live={{ ...live([row({ taken_spots: 1, participants })]), friendIds: ["host-1", "friend-2"] }} />);
    expect(screen.getByText("Lena and Julia are out today")).toBeInTheDocument();
  });

  it("recovers when the server cannot be reached", async () => {
    mocks.join.mockRejectedValue(new Error("offline"));
    render(<FeedScreen live={live([row({})])} />);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /^I'm in/ }));
    });

    expect(screen.getByText("No connection. Try again in a moment.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^I'm in/ })).toBeEnabled();
  });

  it("asks to join as a friend of a friend without the joined toast", async () => {
    mocks.join.mockResolvedValue({ ok: true, message: "Asked. The host lets you in.", pending: true });
    render(<FeedScreen live={live([row({})])} />);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /^I'm in/ }));
    });

    expect(mocks.join).toHaveBeenCalledWith("ride-1");
    expect(screen.queryByText(/You are in/)).not.toBeInTheDocument();
  });

  it("withdraws a pending request", async () => {
    mocks.leave.mockResolvedValue({ ok: true, message: "You left the ride." });
    render(<FeedScreen live={live([row({ my_status: "pending" })])} />);

    /* A second tap on the card never withdraws: it opens the ride. */
    fireEvent.click(screen.getByRole("button", { name: /^Asked/ }));
    expect(mocks.leave).not.toHaveBeenCalled();
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Asked · tap to withdraw" }));
    });
    expect(mocks.leave).toHaveBeenCalledWith("ride-1");
  });

  it("lets the host answer requests", async () => {
    mocks.respond.mockResolvedValue({ ok: true, message: "Let in." });
    render(
      <FeedScreen
        live={live([
          row({
            is_host: true,
            meet_point: "Congress",
            meet_point_locked: false,
            requests: [{ id: "u9", display_name: "Max Rider", handle: "max_r" }],
          }),
        ])}
      />,
    );

    expect(screen.getByText("Your ride · 1 asking")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Rails are set"));
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Let in" }));
    });
    expect(mocks.respond).toHaveBeenCalledWith("ride-1", "u9", true);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Decline Max Rider" }));
    });
    expect(mocks.respond).toHaveBeenCalledWith("ride-1", "u9", false);
  });

  it("leaves a joined ride", async () => {
    mocks.leave.mockResolvedValue({ ok: true, message: "You left the ride." });
    render(<FeedScreen live={live([row({ is_joined: true, taken_spots: 1 })])} />);

    /* A second tap on the card never leaves: it opens the ride. */
    const joinedButton = screen.getByRole("button", { name: /^Joined/ });
    expect(joinedButton).toHaveTextContent("Joined ✓");
    expect(joinedButton).toBeEnabled();
    expect(joinedButton).toHaveStyle({ background: "var(--pine)", color: "var(--on-accent)" });
    fireEvent.click(joinedButton);
    expect(mocks.leave).not.toHaveBeenCalled();
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "You are in, tap to leave" }));
    });

    expect(mocks.leave).toHaveBeenCalledWith("ride-1");
  });

  it("shows the server's refusal and lets it be dismissed", async () => {
    mocks.join.mockResolvedValue({ ok: false, message: "This ride is full." });
    render(<FeedScreen live={live([row({})])} />);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /^I'm in/ }));
    });

    expect(screen.getByText("This ride is full.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(screen.queryByText("This ride is full.")).not.toBeInTheDocument();
  });

  it("marks the viewer's own ride and lets the host cancel it", async () => {
    mocks.cancel.mockResolvedValue({ ok: true, message: "Ride cancelled." });
    const confirm = vi.spyOn(window, "confirm").mockReturnValueOnce(false).mockReturnValueOnce(true);
    render(<FeedScreen live={live([row({ is_host: true, meet_point: "Congress", meet_point_locked: false })])} />);

    expect(screen.getByText("Your ride")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Rails are set"));
    const dialog = screen.getByRole("dialog", { name: "Ride details" });
    fireEvent.click(within(dialog).getByRole("button", { name: "Cancel this ride" }));
    expect(mocks.cancel).not.toHaveBeenCalled();
    await act(async () => {
      fireEvent.click(within(dialog).getByRole("button", { name: "Cancel this ride" }));
    });

    expect(mocks.cancel).toHaveBeenCalledWith("ride-1");
    confirm.mockRestore();
  });

  it("points an unfinished profile to the profile tab", () => {
    render(<FeedScreen live={{ ...live([]), profileComplete: false }} />);
    expect(screen.getByRole("link", { name: /Finish your profile/ })).toHaveAttribute("href", "/profile");
  });

  it("lets the host edit their ride and shows a refusal", async () => {
    mocks.update.mockResolvedValueOnce({ ok: false, message: "More people have already joined than that. Pick more spots." });
    mocks.update.mockResolvedValueOnce({ ok: true, message: "Ride updated." });
    render(<FeedScreen live={live([row({ is_host: true, meet_point: "Congress", meet_point_locked: false, taken_spots: 1 })])} />);

    fireEvent.click(screen.getByText("Rails are set"));
    fireEvent.click(screen.getByRole("button", { name: "Edit ride" }));
    const dialog = screen.getByRole("dialog", { name: "Edit ride" });
    expect(within(dialog).getByLabelText("Meeting point")).toHaveValue("Congress");
    expect(within(dialog).queryByRole("option", { name: "1" })).toBeInTheDocument();
    fireEvent.change(within(dialog).getByLabelText("Meeting point"), { target: { value: "Hungerburg" } });

    await act(async () => {
      fireEvent.click(within(dialog).getByRole("button", { name: "Save" }));
    });
    expect(within(dialog).getByRole("alert")).toHaveTextContent("Pick more spots");

    await act(async () => {
      fireEvent.click(within(dialog).getByRole("button", { name: "Save" }));
    });
    expect(mocks.update).toHaveBeenLastCalledWith("ride-1", expect.objectContaining({ meetPoint: "Hungerburg", meetTime: "09:00" }));
    expect(mocks.refresh).toHaveBeenCalled();
  });

  it("opens report or block for the host of someone else's ride", () => {
    render(<FeedScreen live={live([row({})])} />);
    fireEvent.click(screen.getByText("Rails are set"));
    fireEvent.click(screen.getByRole("button", { name: "Report or block Lena Moser" }));
    expect(screen.getByRole("dialog", { name: "Report or block" })).toBeInTheDocument();
  });

  it("lets a rider report or block someone else who joined, never themselves", () => {
    const participants = [
      { id: "me-1", display_name: "Me Myself", handle: "me_1" },
      { id: "rider-2", display_name: "Tom Fremd", handle: "tom_f" },
    ];
    render(<FeedScreen live={{ ...live([row({ is_joined: true, taken_spots: 2, participants })]), viewerId: "me-1" }} />);
    fireEvent.click(screen.getByText("Rails are set"));
    expect(screen.queryByRole("button", { name: "Report or block Me Myself" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Report or block Tom Fremd" }));
    expect(screen.getByRole("dialog", { name: "Report or block" })).toBeInTheDocument();
  });

  it("says when rides could not be loaded", () => {
    render(<FeedScreen live={live(null)} />);
    expect(screen.getByText(/Rides could not be loaded/)).toBeInTheDocument();
    expect(screen.queryByText("No rides today yet")).not.toBeInTheDocument();
  });

  it("starts everything from one + button, and suggests a ride when today is empty", async () => {
    render(<FeedScreen live={live([])} />);
    expect(screen.getByRole("note")).toHaveTextContent("No ride today yet");
    fireEvent.click(screen.getByRole("button", { name: "New" }));
    const menu = screen.getByRole("dialog", { name: "What do you want to start?" });
    expect(within(menu).getByRole("link", { name: /Carpool/ })).toHaveAttribute("href", "/carpool");
    expect(within(menu).getByRole("link", { name: /Events/ })).toHaveAttribute("href", "/events");
    expect(within(menu).getByRole("button", { name: /Share your ski day/ })).toBeInTheDocument();
    fireEvent.click(within(menu).getByRole("button", { name: /Post a ride/ }));
    /* The ride sheet opens only after the menu has gone. */
    expect(screen.queryByLabelText("Resort")).not.toBeInTheDocument();
    expect(await screen.findByLabelText("Resort")).toBeInTheDocument();
    expect(screen.queryByRole("dialog", { name: "What do you want to start?" })).not.toBeInTheDocument();
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
    fireEvent.click(screen.getByRole("button", { name: /^Chill/ }));
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
    fireEvent.click(screen.getByRole("button", { name: /^Chill/ }));
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
    fireEvent.click(screen.getByRole("button", { name: /^Chill/ }));
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByRole("button", { name: /Public/ })).toBeDisabled();
    /* Under 18, friends of friends never see the ride: the copy says so. */
    expect(screen.getByRole("button", { name: /Friends.*Only your confirmed friends/ })).toBeInTheDocument();
  });

  it("limits the meeting point and note to what the server accepts", () => {
    render(<FeedScreen live={live([], false)} />);
    fireEvent.click(screen.getByRole("button", { name: "Post a ride" }));
    fireEvent.change(screen.getByLabelText("Resort"), { target: { value: "Nordkette" } });
    fireEvent.click(screen.getByRole("button", { name: /^Chill/ }));
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByLabelText("Meeting point")).toHaveAttribute("maxLength", "120");
    expect(screen.getByLabelText(/^Note/)).toHaveAttribute("maxLength", "280");
    const note = screen.getByLabelText(/^Note/);
    expect(note).toHaveAccessibleDescription("0 / 280 characters");
    fireEvent.change(note, { target: { value: "Powder" } });
    expect(note).toHaveAccessibleDescription("6 / 280 characters");
  });

  it("tells an adult that friends of friends see a friends ride", () => {
    render(<FeedScreen live={live([], false)} />);
    fireEvent.click(screen.getByRole("button", { name: "Post a ride" }));
    fireEvent.change(screen.getByLabelText("Resort"), { target: { value: "Nordkette" } });
    fireEvent.click(screen.getByRole("button", { name: /^Chill/ }));
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByRole("button", { name: /Friends.*Friends and their friends/ })).toBeInTheDocument();
  });
});

describe("FeedScreen demo", () => {
  it("still finds today's demo rides in German, where 'Today' is translated", () => {
    render(<I18nProvider locale="de"><FeedScreen /></I18nProvider>);
    expect(screen.getByText(/sind heute unterwegs/)).toBeInTheDocument();
    expect(screen.getAllByText("vor 23 Min.").length).toBeGreaterThan(0);
  });

  it("names demo friends and invents no rider count", () => {
    render(<FeedScreen />);
    expect(screen.queryByText(/174/)).not.toBeInTheDocument();
    expect(screen.getByText(/are out today/)).toBeInTheDocument();
  });

  it("still runs on fixtures and joins locally", () => {
    render(<FeedScreen />);
    const joinButtons = screen.getAllByRole("button", { name: /^I'm in/ });
    fireEvent.click(joinButtons[0]!);
    expect(mocks.join).not.toHaveBeenCalled();
    expect(screen.getAllByRole("button", { name: /^Joined/ }).length).toBeGreaterThan(0);
  });
});
