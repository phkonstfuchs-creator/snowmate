import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import TrackingProvider from "./TrackingProvider";
import { clearStoredSkiDay } from "./useSkiDayTracker";
import TrackPanel from "./TrackPanel";

const mocks = vi.hoisted(() => ({ save: vi.fn(), pathname: "/map" }));
vi.mock("./actions", () => ({ saveSkiDayAction: mocks.save, deleteSkiDayAction: vi.fn() }));
vi.mock("@/features/posts/actions", () => ({ createPostAction: vi.fn() }));
vi.mock("next/navigation", () => ({ usePathname: () => mocks.pathname, useRouter: () => ({ refresh: vi.fn() }) }));

let onFix: ((position: GeolocationPosition) => void) | null = null;
const clearWatch = vi.fn();
const USER = "c4a70000-0000-4000-8000-000000000001";
const OTHER = "c4a70000-0000-4000-8000-000000000002";

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
    render(<TrackingProvider userId={USER}><TrackPanel /></TrackingProvider>);
    fireEvent.click(screen.getByRole("button", { name: /Start/ }));
    expect(screen.getByText("Ski day running")).toBeInTheDocument();
    expect(JSON.parse(window.localStorage.getItem("pistl.skiday.v1")!)).toMatchObject({ userId: USER, state: { distanceM: 0 } });

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

  it("finishes with one tap and no browser dialog; saving is the second", async () => {
    render(<TrackingProvider userId={USER}><TrackPanel /></TrackingProvider>);
    expect(screen.getByText(/Keep Pistl open/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Start/ }));
    fireEvent.click(screen.getByRole("button", { name: "Finish" }));
    expect(window.confirm).not.toHaveBeenCalled();
    expect(await screen.findByRole("dialog")).toHaveTextContent("Your ski day");
  });

  it("asks before throwing away an unsaved day", async () => {
    render(<TrackingProvider userId={USER}><TrackPanel /></TrackingProvider>);
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
    render(<TrackingProvider userId={USER}><TrackPanel /></TrackingProvider>);
    fireEvent.click(screen.getByRole("button", { name: /Start/ }));
    expect(screen.getByRole("link", { name: /Ski day running/ })).toHaveAttribute("href", "/map");
    mocks.pathname = "/map";
  });

  it("explains a blocked location", () => {
    render(<TrackingProvider userId={USER}><TrackPanel /></TrackingProvider>);
    vi.mocked(navigator.geolocation.watchPosition).mockImplementation((_s, error) => {
      error?.({ code: 1, message: "denied", PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3 } as GeolocationPositionError);
      return 8;
    });
    fireEvent.click(screen.getByRole("button", { name: /Start/ }));
    expect(screen.getByText(/Location is blocked/)).toBeInTheDocument();
  });

  it("drops an old account's stored GPS track instead of restoring it for another account", () => {
    const first = render(<TrackingProvider userId={USER}><TrackPanel /></TrackingProvider>);
    fireEvent.click(screen.getByRole("button", { name: /Start/ }));
    expect(window.localStorage.getItem("pistl.skiday.v1")).not.toBeNull();
    first.rerender(<TrackingProvider userId={OTHER}><TrackPanel /></TrackingProvider>);
    expect(clearWatch).toHaveBeenCalledWith(7);
    expect(screen.getByRole("button", { name: /Start/ })).toBeInTheDocument();
    expect(window.localStorage.getItem("pistl.skiday.v1")).toBeNull();
  });

  it("resumes a stored day only for the same account after a reload", async () => {
    const first = render(<TrackingProvider userId={USER}><TrackPanel /></TrackingProvider>);
    fireEvent.click(screen.getByRole("button", { name: /Start/ }));
    expect(window.localStorage.getItem("pistl.skiday.v1")).not.toBeNull();
    first.unmount();
    expect(window.localStorage.getItem("pistl.skiday.v1")).not.toBeNull();

    render(<TrackingProvider userId={USER}><TrackPanel /></TrackingProvider>);
    expect(await screen.findByText("Ski day running")).toBeInTheDocument();
    act(() => clearStoredSkiDay());
    expect(window.localStorage.getItem("pistl.skiday.v1")).toBeNull();
  });

  it("stops the active GPS watch when sign-out clears the stored day", () => {
    render(<TrackingProvider userId={USER}><TrackPanel /></TrackingProvider>);
    fireEvent.click(screen.getByRole("button", { name: /Start/ }));
    act(() => clearStoredSkiDay());
    expect(clearWatch).toHaveBeenCalledWith(7);
    expect(screen.getByRole("button", { name: /Start/ })).toBeInTheDocument();
    expect(window.localStorage.getItem("pistl.skiday.v1")).toBeNull();
  });

  it("discards legacy GPS tracks that have no account owner", () => {
    window.localStorage.setItem("pistl.skiday.v1", JSON.stringify({ startedAt: Date.now(), track: [[11.39, 47.3]] }));
    render(<TrackingProvider userId={USER}><TrackPanel /></TrackingProvider>);
    expect(window.localStorage.getItem("pistl.skiday.v1")).toBeNull();
    expect(screen.getByRole("button", { name: /Start/ })).toBeInTheDocument();
  });
});
