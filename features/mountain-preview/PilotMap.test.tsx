import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import PilotMap from "./PilotMap";
import { pilotGeoJSON } from "./data/catalog";
import { featureBounds } from "./data/convert";

const state = vi.hoisted(() => ({
  events: new Map<string, (event?: unknown) => void>(),
  layers: new Map<string, { layout?: Record<string, unknown> }>(),
  sources: new Map<string, { setData: ReturnType<typeof vi.fn> }>(),
  addLayer: vi.fn(),
  addSource: vi.fn(),
  setLayoutProperty: vi.fn(),
  setTerrain: vi.fn(),
  easeTo: vi.fn(),
  fitBounds: vi.fn(),
  setFilter: vi.fn(),
  setStyle: vi.fn(),
  remove: vi.fn(),
  markerAddTo: vi.fn(),
  markerRemove: vi.fn(),
  markerElement: null as HTMLElement | null,
}));

vi.mock("maplibre-gl", () => ({
  setWorkerUrl: vi.fn(),
  Map: class {
    touchZoomRotate = { disableRotation: vi.fn() };
    keyboard = { disableRotation: vi.fn() };
    on(name: string, fn: (event?: unknown) => void) { state.events.set(name, fn); }
    once(name: string, fn: (event?: unknown) => void) { state.events.set(name, fn); }
    getStyle() { return { layers: [{ id: "road-label", type: "symbol" }] }; }
    getSource(id: string) { return state.sources.get(id); }
    getLayer(id: string) { return state.layers.has(id) ? { id } : undefined; }
    addSource(id: string) { state.sources.set(id, { setData: vi.fn() }); state.addSource(id); }
    addLayer(layer: { id: string }) { state.layers.set(layer.id, { layout: {} }); state.addLayer(layer); }
    moveLayer() {}
    setLayoutProperty(id: string, key: string, value: unknown) { state.setLayoutProperty(id, key, value); }
    setTerrain(...args: unknown[]) { state.setTerrain(...args); }
    easeTo(...args: unknown[]) { state.easeTo(...args); }
    fitBounds(...args: unknown[]) { state.fitBounds(...args); }
    setFilter(...args: unknown[]) { state.setFilter(...args); }
    setStyle(...args: unknown[]) { state.setStyle(...args); }
    queryRenderedFeatures() { return []; }
    resize() {}
    remove = state.remove;
  },
  Marker: class {
    element: HTMLElement;
    constructor(options: { element: HTMLElement }) { this.element = options.element; state.markerElement = options.element; }
    setLngLat() { return this; }
    addTo() { state.markerAddTo(); return this; }
    getElement() { return this.element; }
    remove() { state.markerRemove(); }
  },
}));

const ready = () => act(() => state.events.get("style.load")?.());

beforeEach(() => {
  state.events.clear(); state.layers.clear(); state.sources.clear();
  vi.clearAllMocks();
  state.markerElement = null;
  vi.stubGlobal("ResizeObserver", class { observe() {} disconnect() {} });
  vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: false })));
});
afterEach(() => vi.unstubAllGlobals());

describe("PilotMap lifecycle", () => {
  it("hides the sample route in map mode and enables DEM terrain when requested", () => {
    const { rerender } = render(<PilotMap mode="map" selectedId={null} onSelect={() => {}} replayProgress={0} terrain={false} />);
    ready();
    expect(state.fitBounds.mock.calls[0]?.[1]).toMatchObject({ duration: 0 });
    expect(state.setLayoutProperty).toHaveBeenCalledWith("pilot-day-sample-line", "visibility", "none");
    expect(screen.queryByText(/Beispielroute/u)).not.toBeInTheDocument();

    rerender(<PilotMap mode="day" selectedId={null} onSelect={() => {}} replayProgress={35} terrain />);
    expect(state.setLayoutProperty).toHaveBeenCalledWith("pilot-day-sample-line", "visibility", "visible");
    expect(state.setTerrain).toHaveBeenLastCalledWith({ source: "pilot-terrain", exaggeration: 1.15 });
    expect(state.easeTo).toHaveBeenLastCalledWith(expect.objectContaining({ pitch: 48, duration: 500 }));
    expect(state.markerAddTo).toHaveBeenCalledOnce();
    expect(screen.getByText("Beispielroute · kein Live-Standort")).toBeInTheDocument();

    rerender(<PilotMap mode="map" selectedId={null} onSelect={() => {}} replayProgress={35} terrain={false} />);
    expect(state.setTerrain).toHaveBeenLastCalledWith(null);
    expect(state.easeTo).toHaveBeenLastCalledWith(expect.objectContaining({ pitch: 0 }));
    expect(state.markerElement?.style.display).toBe("none");
  });

  it("frames real data and a selected way, respects reduced motion, and cleans up", () => {
    vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: true })));
    const { unmount } = render(<PilotMap mode="map" selectedId="way/25170582" onSelect={() => {}} replayProgress={0} terrain />);
    ready();
    expect(state.fitBounds).toHaveBeenCalledTimes(2);
    const allBounds = featureBounds(pilotGeoJSON);
    expect(state.fitBounds.mock.calls[0]?.[0]).toEqual([[allBounds?.[0], allBounds?.[1]], [allBounds?.[2], allBounds?.[3]]]);
    const selected = pilotGeoJSON.features.find((feature) => feature.id === "way/25170582");
    const selectedBounds = selected ? featureBounds({ type: "FeatureCollection", features: [selected] }) : null;
    expect(state.fitBounds.mock.calls[1]?.[0]).toEqual([[selectedBounds?.[0], selectedBounds?.[1]], [selectedBounds?.[2], selectedBounds?.[3]]]);
    expect(state.fitBounds.mock.calls.every((call) => (call[1] as { duration?: number }).duration === 0)).toBe(true);
    expect(state.easeTo).toHaveBeenCalledWith(expect.objectContaining({ pitch: 48, duration: 0 }));
    expect(state.setTerrain).toHaveBeenCalledWith({ source: "pilot-terrain", exaggeration: 1.15 });
    unmount();
    expect(state.markerRemove).toHaveBeenCalledOnce();
    expect(state.remove).toHaveBeenCalledOnce();
  });

  it("falls back to a local OSM geometry style when the remote style fails", () => {
    render(<PilotMap mode="map" selectedId={null} onSelect={() => {}} replayProgress={0} terrain={false} />);
    act(() => state.events.get("error")?.());
    expect(state.setStyle).toHaveBeenCalledOnce();
    expect(state.setStyle.mock.calls[0]?.[0]).toMatchObject({ version: 8, sources: {}, layers: [{ id: "pilot-background" }] });
    ready();
    expect(state.addSource).toHaveBeenCalledWith("nordkette-pilot");
    expect(screen.getByText(/Kartenanbieter nicht erreichbar/u)).toBeInTheDocument();
    expect(screen.queryByText(/Karte auf diesem Gerät/u)).not.toBeInTheDocument();
    act(() => state.events.get("error")?.({ sourceId: "openmaptiles" }));
    expect(screen.getByText(/OSM-Linien bleiben eingeblendet/u)).toBeInTheDocument();
  });
});
