import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import MapScreen from "./MapScreen";
import { toIsoDay, toLiveRide } from "@/features/rides/live-ride";

vi.mock("next/dynamic", () => ({ default: () => () => <div data-testid="map" /> }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

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
