import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import SkiMap from "./SkiMap";

const map = vi.hoisted(() => ({ events: new Map<string, (event?: unknown) => void>(), style: vi.fn(), remove: vi.fn() }));
vi.mock("maplibre-gl", () => ({
  setWorkerUrl: vi.fn(),
  Map: class {
    touchZoomRotate = { disableRotation: vi.fn() };
    keyboard = { disableRotation: vi.fn() };
    on(name: string, fn: (event?: unknown) => void) { map.events.set(name, fn); }
    once(name: string, fn: (event?: unknown) => void) { map.events.set(name, fn); }
    getStyle() { return { layers: [], sources: { base: {} } }; }
    getSource() { return undefined; }
    addSource() {}
    addLayer() {}
    resize() {}
    setStyle = map.style;
    remove = map.remove;
  },
}));
beforeEach(() => { map.events.clear(); vi.clearAllMocks(); vi.useFakeTimers(); vi.stubGlobal("ResizeObserver", class { observe() {} disconnect() {} }); });
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

describe("map network readiness", () => {
  it("keeps a readable loading status through style load until visible tiles settle", () => {
    render(<SkiMap city="innsbruck" resorts={[]} onSelect={() => {}} />);
    expect(screen.getByRole("status")).toHaveTextContent("Loading map");
    act(() => map.events.get("style.load")?.());
    expect(screen.getByRole("status")).toHaveTextContent("Loading map");
    act(() => map.events.get("idle")?.());
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
  it("does not wait for optional piste tiles after the base map source settles", () => {
    render(<SkiMap city="innsbruck" resorts={[]} onSelect={() => {}} />);
    act(() => map.events.get("style.load")?.());
    act(() => map.events.get("sourcedata")?.({ sourceId: "pistes", sourceDataType: "idle", isSourceLoaded: true }));
    expect(screen.getByRole("status")).toBeInTheDocument();
    act(() => map.events.get("sourcedata")?.({ sourceId: "base", sourceDataType: "metadata", isSourceLoaded: true }));
    expect(screen.getByRole("status")).toBeInTheDocument();
    act(() => map.events.get("sourcedata")?.({ sourceId: "base", sourceDataType: "idle", isSourceLoaded: true }));
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
  it("ends the loading state on a blocked network without a modal or endless spinner", () => {
    render(<SkiMap city="innsbruck" resorts={[]} onSelect={() => {}} />);
    act(() => vi.advanceTimersByTime(15_000));
    expect(map.style).toHaveBeenCalledOnce();
    expect(screen.getByRole("status")).toHaveTextContent("Map is taking longer");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
  it("cleans up readiness timers when navigating away", () => {
    const { unmount } = render(<SkiMap city="innsbruck" resorts={[]} onSelect={() => {}} />);
    unmount();
    act(() => vi.advanceTimersByTime(20_000));
    expect(map.style).not.toHaveBeenCalled();
    expect(map.remove).toHaveBeenCalledOnce();
  });
});
