import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import MapScreen from "./MapScreen";
import { toIsoDay, toLiveRide } from "@/features/rides/live-ride";

const mapMock = vi.hoisted(() => ({ props: vi.fn(), replace: vi.fn() }));
vi.mock("next/dynamic", () => ({ default: () => (props: object) => { mapMock.props(props); return <div data-testid="map" />; } }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn(), replace: mapMock.replace }) }));

const now = new Date();
const today = toIsoDay(now);

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
  Element.prototype.scrollIntoView = vi.fn();
  it("opens the requested lift picker directly for eligible riders", () => {
    render(<MapScreen live={{ rides: [], defaultCity: "innsbruck", canShareLift: true, initialAction: "lift" }} />);
    expect(screen.getByRole("dialog", { name: "Choose your lift" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Stop sharing" })).not.toBeInTheDocument();
  });

  it("explains an ineligible direct lift entry without mounting the picker", () => {
    const view = render(<MapScreen live={{ rides: [], defaultCity: "innsbruck", canShareLift: false, initialAction: "lift" }} />);
    view.rerender(<MapScreen live={{ rides: [], defaultCity: "innsbruck", canShareLift: false, initialAction: null }} />);
    expect(screen.queryByRole("dialog", { name: "Choose your lift" })).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("16");
  });

  it("consumes a direct entry without losing the pin or reopening on refresh", () => {
    window.history.replaceState(null, "", "/map?action=lift&lat=47&lng=11&label=Top");
    mapMock.replace.mockClear();
    render(<MapScreen live={{ rides: [], defaultCity: "innsbruck", canShareLift: true, initialAction: "lift" }} />);
    expect(mapMock.replace).toHaveBeenCalledOnce();
    expect(mapMock.replace).toHaveBeenCalledWith("/map?lat=47&lng=11&label=Top", { scroll: false });
    window.history.replaceState(null, "", "/");
  });

  it("keeps the lift action in the map surface and opens a direct lift picker", () => {
    render(<MapScreen live={{ rides: [], defaultCity: "innsbruck", canShareLift: true }} />);
    const cta = screen.getByRole("button", { name: "I'm taking a lift now" });
    const map = screen.getByTestId("map");
    expect(cta.closest(".mountain-map-stage")).toContainElement(map);
    fireEvent.click(cta);
    const dialog = screen.getByRole("dialog", { name: "Choose your lift" });
    /* Without a position yet, picking by hand is one tap away. */
    fireEvent.click(within(dialog).getByRole("button", { name: "Pick the lift myself" }));
    expect(within(dialog).getByRole("combobox", { name: "Resort" })).toBeInTheDocument();
    expect(within(dialog).getByRole("combobox", { name: "Choose a lift" })).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "Tell my crew" })).toBeEnabled();
  });

  it("exposes ski day and location controls beside the map without coupling consent", () => {
    render(<MapScreen live={{ rides: [], defaultCity: "innsbruck", canShareLift: true }} />);
    const sharing = screen.getByRole("button", { name: "My location" });
    expect(screen.getByRole("button", { name: "Ski day" })).toBeInTheDocument();
    expect(sharing).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("region", { name: "Live location" })).not.toBeInTheDocument();
    fireEvent.click(sharing);
    expect(sharing).toHaveAttribute("aria-expanded", "true");
    const details = screen.getByRole("region", { name: "Live location" });
    expect(details).toBeInTheDocument();
    expect(details.compareDocumentPosition(screen.getByRole("heading", { name: "Your crew on the mountain" })) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("opens on location sharing while it is on, so stopping is one tap away", () => {
    const sharingEnd = new Date(Date.now() + 30 * 60_000).toISOString();
    render(<MapScreen live={{ rides: [], defaultCity: "innsbruck", canShareLift: true, sharingEnd }} />);
    expect(screen.getByRole("button", { name: "Stop sharing" })).toBeInTheDocument();
  });

  it("reports unavailable friend positions instead of an empty crew", () => {
    render(<MapScreen live={{ rides: [], defaultCity: "innsbruck", friends: null }} />);
    expect(screen.getByText("Friends' positions could not be loaded.")).toBeInTheDocument();
    expect(screen.queryByText("Nobody in your crew is sharing their location right now.")).not.toBeInTheDocument();
  });

  it("ages pins and crew together when no new position array arrives", () => {
    vi.useFakeTimers();
    try {
      const friend = { userId: "u1", name: "Lena", handle: "lena", lat: 47.2, lng: 11.3, accuracy: 20, updatedAt: new Date(Date.now() - 14 * 60_000).toISOString() };
      render(<MapScreen live={{ rides: [], defaultCity: "innsbruck", friends: [friend] }} />);
      expect(mapMock.props.mock.lastCall![0].people[0].stale).toBe(false);
      act(() => vi.advanceTimersByTime(2 * 60_000));
      expect(mapMock.props.mock.lastCall![0].people[0].stale).toBe(true);
      expect(screen.getByRole("button", { name: /Lena/ })).toHaveTextContent("16 min ago");
    } finally {
      vi.useRealTimers();
    }
  });

  it("selects the clicked friend even when friends share identical coordinates", () => {
    const friend = { userId: "u1", name: "Lena", handle: "lena", lat: 47.2, lng: 11.3, accuracy: 20, updatedAt: new Date().toISOString() };
    render(<MapScreen live={{ rides: [], defaultCity: "innsbruck", friends: [friend, { ...friend, userId: "u2", name: "Max", handle: "max" }] }} />);
    fireEvent.click(screen.getByRole("button", { name: /Max/ }));
    expect(screen.getByRole("button", { name: /Max/ })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: /Lena/ })).toHaveAttribute("aria-pressed", "false");
    act(() => mapMock.props.mock.lastCall![0].onPersonSelect("u1"));
    expect(screen.getByRole("button", { name: /Lena/ })).toHaveAttribute("aria-pressed", "true");
  });

  it("marks stale map positions and focuses the same person from their crew card", () => {
    const friend = { userId: "friend", name: "Lena", handle: "lena", lat: 47.2, lng: 11.3, accuracy: 20, updatedAt: new Date(Date.now() - 20 * 60_000).toISOString() };
    render(<MapScreen live={{ rides: [], defaultCity: "innsbruck", friends: [friend] }} />);
    expect(mapMock.props.mock.lastCall![0].people[0]).toMatchObject({ id: "friend", stale: true });
    fireEvent.click(screen.getByRole("button", { name: /Lena/ }));
    expect(mapMock.props.mock.lastCall![0].focus).toMatchObject({ lat: friend.lat, lng: friend.lng });
    expect(screen.getByRole("button", { name: /Lena/ })).toHaveAttribute("aria-pressed", "true");
  });

  it("only offers lift sharing after an explicit age-eligibility check", () => {
    render(<MapScreen live={{ rides: [], defaultCity: "innsbruck", canShareLift: false }} />);
    fireEvent.click(screen.getAllByRole("button", { name: /Nordkette/ })[0]!);
    const dialog = screen.getByRole("dialog", { name: "Details for Nordkette" });
    expect(within(dialog).getByText(/from 16/)).toBeInTheDocument();
    expect(within(dialog).queryByRole("button", { name: "Tell my crew" })).not.toBeInTheDocument();
  });

  it("lets an eligible rider choose a referenced lift", () => {
    render(<MapScreen live={{ rides: [], defaultCity: "innsbruck", canShareLift: true }} />);
    fireEvent.click(screen.getAllByRole("button", { name: /Nordkette/ })[0]!);
    const dialog = screen.getByRole("dialog", { name: "Details for Nordkette" });
    expect(within(dialog).getByRole("combobox", { name: "Choose a lift" })).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "Tell my crew" })).toBeEnabled();
  });

  it("shows real activity and hides unsourced conditions", () => {
    render(<MapScreen live={{ rides: [liveRide], defaultCity: "innsbruck" }} />);

    expect(screen.getAllByText(/2 riding today/).length).toBeGreaterThan(0);
    expect(screen.queryByText("deepest snow")).not.toBeInTheDocument();

    fireEvent.click(screen.getAllByRole("button", { name: /Nordkette/ })[0]!);
    const dialog = screen.getByRole("dialog", { name: "Details for Nordkette" });
    expect(within(dialog).getByText("spots open")).toBeInTheDocument();
    expect(within(dialog).getByText("Lena Moser")).toBeInTheDocument();
    expect(within(dialog).queryByText("lifts open")).not.toBeInTheDocument();
  });

  it("reports load failures", () => {
    render(<MapScreen live={{ rides: null, defaultCity: "salzburg" }} />);
    expect(screen.getByText(/could not be loaded/)).toBeInTheDocument();
  });

  it("keeps the sample conditions in the demo", () => {
    render(<MapScreen />);
    expect(screen.getByText("deepest snow")).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole("button", { name: /Nordkette/ })[0]!);
    expect(within(screen.getByRole("dialog")).getByText("lifts open")).toBeInTheDocument();
  });

  it("shows live snow and weather from the provider", () => {
    const conditions = {
      topTempC: -7, baseTempC: -1, windKmh: 18, kind: "snow" as const, snowDepthCm: 123,
      newSnowCm: 25, forecastSnowCm: 13, updatedAt: "2026-12-20T10:00",
      days: [
        { date: "2026-12-21", snowCm: 0, kind: "sun" as const, maxC: 2, minC: -6 },
        { date: "2026-12-22", snowCm: 13, kind: "snow" as const, maxC: -4, minC: -10 },
        { date: "2026-12-23", snowCm: 0, kind: "cloud" as const, maxC: -7, minC: -7 },
      ],
    };
    render(<MapScreen live={{ rides: [liveRide], defaultCity: "innsbruck", conditions: { Nordkette: conditions, Kühtai: null } }} />);

    expect(screen.getByText(/new snow · Nordkette/)).toBeInTheDocument();
    expect(screen.getByText("25 cm new · -7° top")).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole("button", { name: /Nordkette/ })[0]!);
    const dialog = screen.getByRole("dialog", { name: "Details for Nordkette" });
    expect(within(dialog).getByText("123 cm")).toBeInTheDocument();
    expect(within(dialog).getByText(/13 cm expected/)).toBeInTheDocument();
    expect(within(dialog).getByText(/Open-Meteo/)).toBeInTheDocument();
  });

  it("says when snow and weather are unavailable", () => {
    render(<MapScreen live={{ rides: [liveRide], defaultCity: "innsbruck", conditions: null }} />);
    fireEvent.click(screen.getAllByRole("button", { name: /Nordkette/ })[0]!);
    expect(within(screen.getByRole("dialog")).getByText("Snow and weather are not available right now.")).toBeInTheDocument();
  });

  it("shows a resort photo with its credit when one is free to use", () => {
    const photo = {
      src: "https://upload.wikimedia.org/wikipedia/commons/thumb/x/xy/Nordkette.jpg/1200px-Nordkette.jpg",
      width: 1200, height: 800, author: "Anna K.", license: "CC BY-SA 4.0",
      licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0", sourceUrl: "https://commons.wikimedia.org/wiki/File:Nordkette.jpg",
    };
    render(<MapScreen live={{ rides: [liveRide], defaultCity: "innsbruck", photos: { Nordkette: photo } }} />);
    fireEvent.click(screen.getAllByRole("button", { name: /Nordkette/ })[0]!);
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByRole("img", { name: "Nordkette" })).toBeInTheDocument();
    expect(within(dialog).getByText(/Photo: Anna K\./)).toBeInTheDocument();
    expect(within(dialog).getByRole("link", { name: "CC BY-SA 4.0" })).toHaveAttribute("href", photo.licenseUrl);
    expect(within(dialog).getByRole("link", { name: "Wikimedia Commons" })).toHaveAttribute("href", photo.sourceUrl);
  });
});
