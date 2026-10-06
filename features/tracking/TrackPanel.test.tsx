import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import TrackingProvider from "./TrackingProvider";
import TrackPanel from "./TrackPanel";

const mocks = vi.hoisted(() => ({ save: vi.fn(), pathname: "/map" }));
vi.mock("./actions", () => ({ saveSkiDayAction: mocks.save, deleteSkiDayAction: vi.fn() }));
vi.mock("@/features/posts/actions", () => ({ createPostAction: vi.fn() }));
vi.mock("next/navigation", () => ({ usePathname: () => mocks.pathname, useRouter: () => ({ refresh: vi.fn() }) }));

let onFix: ((position: GeolocationPosition) => void) | null = null;
const clearWatch = vi.fn();

function fix(lat: number, alt: number, t: number): GeolocationPosition {
  return { coords: { latitude: lat, longitude: 11.39, altitude: alt, accuracy: 6, speed: 12, altitudeAccuracy: null, heading: null, toJSON: () => ({}) }, timestamp: t, toJSON: () => ({}) } as GeolocationPosition;
}

beforeEach(() => {
  vi.clearAllMocks();
  window.localStorage.clear();
  onFix = null;
  Object.defineProperty(navigator, "geolocation", {
    configurable: true,
    value: { watchPosition: vi.fn((success) => { onFix = success; return 7; }), clearWatch },
  });
  vi.spyOn(window, "confirm").mockReturnValue(true);
  mocks.save.mockResolvedValue("saved");
});
afterEach(() => vi.restoreAllMocks());

describe("ski-day tracking", () => {
  it("starts, records, survives in storage and saves only the summary", async () => {
    render(<TrackingProvider><TrackPanel /></TrackingProvider>);
    fireEvent.click(screen.getByRole("button", { name: /Start/ }));
    expect(screen.getByText("Ski day running")).toBeInTheDocument();
    expect(JSON.parse(window.localStorage.getItem("pistl.skiday.v1")!)).toMatchObject({ distanceM: 0 });

    const start = Date.now();
    act(() => {
      for (let i = 0; i <= 120; i += 1) onFix!(fix(47.3 - i * 0.0002, 1500 - i * 4, start + i * 2000));
    });
    vi.spyOn(Date, "now").mockReturnValue(start + 5 * 60_000);
    fireEvent.click(screen.getByRole("button", { name: "Finish" }));
    expect(clearWatch).toHaveBeenCalledWith(7);
    expect(window.localStorage.getItem("pistl.skiday.v1")).toBeNull();

    const dialog = await screen.findByRole("dialog");
    expect(dialog).toHaveTextContent("Your ski day");
    fireEvent.click(screen.getByRole("button", { name: "Save day" }));
    await vi.waitFor(() => expect(screen.getByRole("button", { name: /Share with friends/ })).toBeInTheDocument());
    const [summary, resort] = mocks.save.mock.calls[0]!;
    expect(Object.keys(summary).sort()).toEqual(["distanceM", "endedAt", "maxSpeedKmh", "runs", "startedAt", "verticalM"]);
    expect(summary.runs).toBe(1);
    expect(summary.verticalM).toBeGreaterThan(300);
    expect(resort).toBe("Nordkette");
  });

  it("asks before throwing away an unsaved day", async () => {
    render(<TrackingProvider><TrackPanel /></TrackingProvider>);
    fireEvent.click(screen.getByRole("button", { name: /Start/ }));
    const start = Date.now();
    act(() => {
      for (let i = 0; i <= 120; i += 1) onFix!(fix(47.3 - i * 0.0002, 1500 - i * 4, start + i * 2000));
    });
    vi.spyOn(Date, "now").mockReturnValue(start + 5 * 60_000);
    fireEvent.click(screen.getByRole("button", { name: "Finish" }));
    await screen.findByRole("dialog");
    vi.mocked(window.confirm).mockReturnValue(false);
    fireEvent.click(screen.getByRole("button", { name: "Discard" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("shows a running day on other tabs as one line back to the map", () => {
    mocks.pathname = "/crew";
    render(<TrackingProvider><TrackPanel /></TrackingProvider>);
    fireEvent.click(screen.getByRole("button", { name: /Start/ }));
    expect(screen.getByRole("link", { name: /Ski day running/ })).toHaveAttribute("href", "/map");
    mocks.pathname = "/map";
  });

  it("explains a blocked location", () => {
    render(<TrackingProvider><TrackPanel /></TrackingProvider>);
    vi.mocked(navigator.geolocation.watchPosition).mockImplementation((_s, error) => {
      error?.({ code: 1, message: "denied", PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3 } as GeolocationPositionError);
      return 8;
    });
    fireEvent.click(screen.getByRole("button", { name: /Start/ }));
    expect(screen.getByText(/Location is blocked/)).toBeInTheDocument();
  });
});
