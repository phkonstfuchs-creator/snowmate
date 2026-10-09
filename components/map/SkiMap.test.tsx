import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import SkiMap from "./SkiMap";
import pilotSource from "@/features/mountain-preview/data/pilot.json";

const map = vi.hoisted(() => ({
  events: new Map<string, Set<(event?: unknown) => void>>(),
  layerEvents: new Map<string, Set<(event?: unknown) => void>>(),
  sources: new Map<string, unknown>(),
  layers: new Map<string, Record<string, unknown>>(),
  sourceAdds: vi.fn(),
  layerAdds: vi.fn(),
  filters: vi.fn(),
  style: vi.fn(),
  remove: vi.fn(),
}));
vi.mock("maplibre-gl", () => ({
  setWorkerUrl: vi.fn(),
  Map: class {
    touchZoomRotate = { disableRotation: vi.fn() };
    keyboard = { disableRotation: vi.fn() };
    on(name: string, layerOrFn: string | string[] | ((event?: unknown) => void), maybeFn?: (event?: unknown) => void) {
      if (typeof layerOrFn === "function") {
        const listeners = map.events.get(name) ?? new Set();
        listeners.add(layerOrFn);
        map.events.set(name, listeners);
      } else {
        const layers = Array.isArray(layerOrFn) ? layerOrFn : [layerOrFn];
        for (const layer of layers) {
          const listeners = map.layerEvents.get(`${name}:${layer}`) ?? new Set();
          if (maybeFn) listeners.add(maybeFn);
          map.layerEvents.set(`${name}:${layer}`, listeners);
        }
      }
    }
    off(name: string, layerOrFn: string | string[] | ((event?: unknown) => void), maybeFn?: (event?: unknown) => void) {
      if (typeof layerOrFn === "function") {
        map.events.get(name)?.delete(layerOrFn);
      } else {
        const layers = Array.isArray(layerOrFn) ? layerOrFn : [layerOrFn];
        for (const layer of layers) if (maybeFn) map.layerEvents.get(`${name}:${layer}`)?.delete(maybeFn);
      }
    }
    once(name: string, fn: (event?: unknown) => void) {
      const once = (event?: unknown) => { this.off(name, once); fn(event); };
      this.on(name, once);
    }
    getStyle() { return { layers: [], sources: { base: {} } }; }
    getSource(id: string) { return map.sources.get(id); }
    addSource(id: string, source: unknown) { map.sourceAdds(id, source); map.sources.set(id, { ...(source as object), setData: vi.fn(), data: (source as { data?: unknown }).data }); }
    addLayer(layer: { id: string; [key: string]: unknown }) { map.layerAdds(layer); map.layers.set(layer.id, layer); }
    setFilter(id: string, filter: unknown) { map.filters(id, filter); }
    resize() {}
    setStyle = map.style;
    remove = map.remove;
  },
}));
const emit = (name: string, event?: unknown) => { for (const listener of [...(map.events.get(name) ?? [])]) listener(event); };
const emitLayer = (layer: string, event?: unknown) => { for (const listener of [...(map.layerEvents.get(`click:${layer}`) ?? [])]) listener(event); };
beforeEach(() => {
  map.events.clear(); map.layerEvents.clear(); map.sources.clear(); map.layers.clear();
  vi.clearAllMocks(); vi.useFakeTimers();
  vi.stubGlobal("ResizeObserver", class { observe() {} disconnect() {} });
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

describe("map network readiness", () => {
  it("keeps a readable loading status through style load until visible tiles settle", () => {
    render(<SkiMap city="innsbruck" resorts={[]} onSelect={() => {}} />);
    expect(screen.getByRole("status")).toHaveTextContent("Loading map");
    act(() => emit("style.load"));
    expect(screen.getByRole("status")).toHaveTextContent("Loading map");
    act(() => emit("idle"));
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
  it("does not wait for optional piste tiles after the base map source settles", () => {
    render(<SkiMap city="innsbruck" resorts={[]} onSelect={() => {}} />);
    act(() => emit("style.load"));
    act(() => emit("sourcedata", { sourceId: "pistes", sourceDataType: "idle", isSourceLoaded: true }));
    expect(screen.getByRole("status")).toBeInTheDocument();
    act(() => emit("sourcedata", { sourceId: "base", sourceDataType: "metadata", isSourceLoaded: true }));
    expect(screen.getByRole("status")).toBeInTheDocument();
    act(() => emit("sourcedata", { sourceId: "base", sourceDataType: "idle", isSourceLoaded: true }));
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
  it("installs the bundled GeoJSON as the source for real piste and lift layers on Innsbruck", () => {
    render(<SkiMap city="innsbruck" resorts={[]} onSelect={() => {}} />);
    act(() => emit("style.load"));

    expect(map.sourceAdds).toHaveBeenCalledWith("mountain-features", expect.objectContaining({ type: "geojson", data: pilotSource }));
    expect(map.layers.has("mountain-pistes")).toBe(true);
    expect(map.layers.has("mountain-lifts")).toBe(true);
  });
  it("selects canonical piste and lift ids, ignores unknown features, and highlights only the selected id", () => {
    const onFeatureSelect = vi.fn();
    const { rerender } = render(<SkiMap city="innsbruck" resorts={[]} onSelect={() => {}} onFeatureSelect={onFeatureSelect} />);
    act(() => emit("style.load"));

    act(() => emitLayer("mountain-pistes", { features: [{ properties: { osm_id: 24559397, kind: "piste" } }] }));
    expect(onFeatureSelect).toHaveBeenCalledWith("way/24559397");
    expect(map.filters).toHaveBeenCalledWith("mountain-selected-piste", ["==", ["get", "osm_id"], 24559397]);

    rerender(<SkiMap city="innsbruck" resorts={[]} onSelect={() => {}} onFeatureSelect={onFeatureSelect} selectedFeatureId="way/25170582" />);
    expect(map.filters).toHaveBeenCalledWith("mountain-selected-lift", ["==", ["get", "osm_id"], 25170582]);
    act(() => emitLayer("mountain-lifts", { features: [{ properties: { osm_id: 25170582, kind: "lift" } }] }));
    expect(onFeatureSelect).toHaveBeenLastCalledWith("way/25170582");
    act(() => emitLayer("mountain-pistes", { features: [{ properties: { osm_id: 42, kind: "piste" } }] }));
    expect(onFeatureSelect).toHaveBeenCalledTimes(2);
  });
  it("ignores base-map and malformed click events", () => {
    const onFeatureSelect = vi.fn();
    render(<SkiMap city="innsbruck" resorts={[]} onSelect={() => {}} onFeatureSelect={onFeatureSelect} />);
    act(() => emit("style.load"));
    act(() => emitLayer("base-roads", { features: [{ properties: { osm_id: 24559397, kind: "piste" } }] }));
    act(() => emitLayer("mountain-pistes", { features: [] }));
    act(() => emitLayer("mountain-pistes", { features: [{ properties: { osm_id: 25170582, kind: "lift" } }] }));
    expect(onFeatureSelect).not.toHaveBeenCalled();
  });
  it("keeps the newest callback and one layer listener across style reloads, then cleans it up", () => {
    const firstCallback = vi.fn();
    const latestCallback = vi.fn();
    const { rerender, unmount } = render(<SkiMap city="innsbruck" resorts={[]} onSelect={() => {}} onFeatureSelect={firstCallback} />);
    act(() => emit("style.load"));
    rerender(<SkiMap city="innsbruck" resorts={[]} onSelect={() => {}} onFeatureSelect={latestCallback} />);
    map.sources.clear(); map.layers.clear();
    act(() => emit("style.load"));
    expect(map.layerEvents.get("click:mountain-pistes")?.size).toBe(1);
    act(() => emitLayer("mountain-pistes", { features: [{ properties: { osm_id: 24559397, kind: "piste" } }] }));
    expect(firstCallback).not.toHaveBeenCalled();
    expect(latestCallback).toHaveBeenCalledWith("way/24559397");
    unmount();
    expect(map.layerEvents.get("click:mountain-pistes")?.size).toBe(0);
  });
  it("keeps the selectable snapshot Innsbruck-only when the city changes", () => {
    const { rerender } = render(<SkiMap city="innsbruck" resorts={[]} onSelect={() => {}} />);
    act(() => emit("style.load"));
    expect(map.sources.has("mountain-features")).toBe(true);
    rerender(<SkiMap city="salzburg" resorts={[]} onSelect={() => {}} />);
    expect(map.sources.get("mountain-features")).toMatchObject({ data: { type: "FeatureCollection", features: [] } });
  });
});
