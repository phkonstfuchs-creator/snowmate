import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import SkiMap from "./SkiMap";
import pilotSource from "@/features/mountain-data/pilot.json";

const map = vi.hoisted(() => ({
  events: new Map<string, Set<(event?: unknown) => void>>(),
  layerEvents: new Map<string, Set<(event?: unknown) => void>>(),
  sources: new Map<string, unknown>(),
  layers: new Map<string, Record<string, unknown>>(),
  layerOrder: [] as string[],
  center: { lng: 11.38, lat: 47.3 },
  zoom: 13,
  sourceAdds: vi.fn(),
  layerAdds: vi.fn(),
  filters: vi.fn(),
  layout: vi.fn(),
  failLayerId: null as string | null,
  failSourceId: null as string | null,
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
    addSource(id: string, source: unknown) {
      if (id === map.failSourceId) throw new Error("Invalid optional GeoJSON source");
      map.sourceAdds(id, source);
      let data = (source as { data?: unknown }).data;
      map.sources.set(id, { ...(source as object), setData: (nextData: unknown) => { data = nextData; }, get data() { return data; } });
    }
    addLayer(layer: { id: string; [key: string]: unknown }, beforeId?: string) {
      if (layer.id === map.failLayerId) throw new Error("Invalid optional style layer");
      map.layerAdds(layer, beforeId);
      map.layers.set(layer.id, layer);
      const index = beforeId ? map.layerOrder.indexOf(beforeId) : -1;
      map.layerOrder.splice(index < 0 ? map.layerOrder.length : index, 0, layer.id);
    }
    getLayer(id: string) { return map.layers.get(id); }
    setFilter(id: string, filter: unknown) { map.filters(id, filter); }
    setLayoutProperty(id: string, name: string, value: unknown) { map.layout(id, name, value); }
    getCenter() { return map.center; }
    getZoom() { return map.zoom; }
    flyTo() {}
    resize() {}
    setStyle = map.style;
    remove = map.remove;
  },
}));
const emit = (name: string, event?: unknown) => { for (const listener of [...(map.events.get(name) ?? [])]) listener(event); };
const withLayer = (layer: string, event?: unknown) => {
  if (!event || typeof event !== "object" || !Array.isArray((event as { features?: unknown }).features)) return event;
  return { ...event, features: (event as { features: Array<Record<string, unknown>> }).features.map((feature) => ({ ...feature, layer: feature.layer ?? { id: layer } })) };
};
const emitLayer = (layer: string, event?: unknown) => {
  for (const listener of [...(map.layerEvents.get(`click:${layer}`) ?? [])]) listener(withLayer(layer, event));
};
const emitLayerGroup = (layers: string[], event?: unknown) => {
  const listeners = new Set(layers.flatMap((layer) => [...(map.layerEvents.get(`click:${layer}`) ?? [])]));
  for (const listener of listeners) listener(event);
};
beforeEach(() => {
  map.events.clear(); map.layerEvents.clear(); map.sources.clear(); map.layers.clear(); map.layerOrder = [];
  map.center = { lng: 11.38, lat: 47.3 }; map.zoom = 13;
  map.failLayerId = null;
  map.failSourceId = null;
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
  it("reaches ready state when an optional style layer fails to install", () => {
    map.failLayerId = "hillshade";
    const warning = vi.spyOn(console, "warn").mockImplementation(() => {});
    render(<SkiMap city="innsbruck" resorts={[]} onSelect={() => {}} />);
    act(() => emit("style.load"));
    act(() => emit("idle"));
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(warning).toHaveBeenCalledWith("Optional ski map terrain layer could not be added", expect.any(Error));
    warning.mockRestore();
  });
  it("reports an unavailable mountain overlay without keeping the base map loading", () => {
    map.failSourceId = "mountain-features";
    const warning = vi.spyOn(console, "warn").mockImplementation(() => {});
    render(<SkiMap city="innsbruck" resorts={[]} onSelect={() => {}} />);
    act(() => emit("style.load"));
    act(() => emit("idle"));
    expect(screen.getByText("Piste lines unavailable. You can still use the piste list.")).toBeInTheDocument();
    expect(screen.queryByText("Loading map")).not.toBeInTheDocument();
    expect(warning).toHaveBeenCalledWith("Optional mountain feature overlay could not be added", expect.any(Error));
    warning.mockRestore();
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
    expect(map.layerOrder.indexOf("pistes")).toBeLessThan(map.layerOrder.indexOf("mountain-pistes"));
    expect(map.layerOrder.indexOf("mountain-pistes")).toBeLessThan(map.layerOrder.indexOf("mountain-piste-hit"));
  });
  it("selects canonical piste and lift ids, ignores unknown features, and highlights only the selected id", () => {
    const onFeatureSelect = vi.fn();
    const { rerender } = render(<SkiMap city="innsbruck" resorts={[]} onSelect={() => {}} onFeatureSelect={onFeatureSelect} />);
    act(() => emit("style.load"));

    act(() => emitLayer("mountain-piste-hit", { features: [{ properties: { osm_id: 24559397, kind: "piste" } }] }));
    expect(onFeatureSelect).toHaveBeenCalledWith("way/24559397");
    rerender(<SkiMap city="innsbruck" resorts={[]} onSelect={() => {}} onFeatureSelect={onFeatureSelect} selectedFeatureId="way/25170582" />);
    expect(map.filters).toHaveBeenLastCalledWith("mountain-selected-lift", ["all", ["==", ["get", "kind"], "lift"], ["==", ["id"], "way/25170582"]]);
    act(() => emitLayer("mountain-lift-hit", { features: [{ properties: { osm_id: 25170582, kind: "lift" } }] }));
    expect(onFeatureSelect).toHaveBeenLastCalledWith("way/25170582");
    act(() => emitLayer("mountain-piste-hit", { features: [{ properties: { osm_id: 42, kind: "piste" } }] }));
    expect(onFeatureSelect).toHaveBeenCalledTimes(2);
  });
  it("ignores base-map and malformed click events", () => {
    const onFeatureSelect = vi.fn();
    render(<SkiMap city="innsbruck" resorts={[]} onSelect={() => {}} onFeatureSelect={onFeatureSelect} />);
    act(() => emit("style.load"));
    act(() => emitLayer("base-roads", { features: [{ properties: { osm_id: 24559397, kind: "piste" } }] }));
    act(() => emitLayer("mountain-piste-hit", { features: [] }));
    act(() => emitLayer("mountain-piste-hit", { features: [{ properties: { osm_id: 25170582, kind: "lift" } }] }));
    expect(onFeatureSelect).not.toHaveBeenCalled();
  });
  it("keeps the newest callback and one layer listener across style reloads, then cleans it up", () => {
    const firstCallback = vi.fn();
    const latestCallback = vi.fn();
    const { rerender, unmount } = render(<SkiMap city="innsbruck" resorts={[]} onSelect={() => {}} onFeatureSelect={firstCallback} />);
    act(() => emit("style.load"));
    rerender(<SkiMap city="innsbruck" resorts={[]} onSelect={() => {}} onFeatureSelect={latestCallback} />);
    map.sources.clear(); map.layers.clear(); map.layerOrder = [];
    act(() => emit("style.load"));
    expect(map.layerEvents.get("click:mountain-piste-hit")?.size).toBe(1);
    expect(map.layerEvents.get("click:mountain-lift-hit")?.size).toBe(1);
    act(() => emitLayer("mountain-piste-hit", { features: [{ properties: { osm_id: 24559397, kind: "piste" } }] }));
    expect(firstCallback).not.toHaveBeenCalled();
    expect(latestCallback).toHaveBeenCalledWith("way/24559397");
    unmount();
    expect(map.layerEvents.get("click:mountain-piste-hit")?.size).toBe(0);
    expect(map.layerEvents.get("click:mountain-lift-hit")?.size).toBe(0);
  });
  it("dispatches only the topmost canonical feature when piste and lift targets overlap", () => {
    const onFeatureSelect = vi.fn();
    render(<SkiMap city="innsbruck" resorts={[]} onSelect={() => {}} onFeatureSelect={onFeatureSelect} />);
    act(() => emit("style.load"));
    act(() => emitLayerGroup(["mountain-piste-hit", "mountain-lift-hit"], {
      features: [
        { properties: { osm_id: 24559397, kind: "piste" }, layer: { id: "mountain-piste-hit" } },
        { properties: { osm_id: 25170582, kind: "lift" }, layer: { id: "mountain-lift-hit" } },
      ],
    }));
    expect(onFeatureSelect).toHaveBeenCalledOnce();
    expect(onFeatureSelect).toHaveBeenCalledWith("way/25170582");
  });
  it("keeps the selectable snapshot Innsbruck-only when the city changes", () => {
    const onFeatureSelect = vi.fn();
    const { rerender } = render(<SkiMap city="innsbruck" resorts={[]} onSelect={() => {}} onFeatureSelect={onFeatureSelect} selectedFeatureId="way/24559397" />);
    act(() => emit("style.load"));
    expect(map.sources.has("mountain-features")).toBe(true);
    rerender(<SkiMap city="salzburg" resorts={[]} onSelect={() => {}} onFeatureSelect={onFeatureSelect} selectedFeatureId={null} />);
    expect(map.sources.get("mountain-features")).toMatchObject({ data: { type: "FeatureCollection", features: [] } });
    expect(screen.queryByText("Piste lines unavailable. You can still use the piste list.")).not.toBeInTheDocument();
    expect(map.filters).toHaveBeenLastCalledWith("mountain-selected-lift", ["all", ["==", ["get", "kind"], "lift"], ["==", ["id"], ""]]);
    act(() => emitLayer("mountain-piste-hit", { features: [{ properties: { osm_id: 24559397, kind: "piste" } }] }));
    expect(onFeatureSelect).not.toHaveBeenCalled();
  });
  it("hides raster detail only inside the pilot bounds at high zoom and restores it outside or in Salzburg", () => {
    const { rerender } = render(<SkiMap city="innsbruck" resorts={[]} onSelect={() => {}} />);
    act(() => emit("style.load"));
    map.center = { lng: 11.38, lat: 47.3 };
    act(() => emit("move"));
    expect(map.layout).toHaveBeenLastCalledWith("pistes", "visibility", "visible");
    map.zoom = 14;
    act(() => emit("move"));
    expect(map.layout).toHaveBeenLastCalledWith("pistes", "visibility", "none");

    map.center = { lng: 11.32, lat: 47.22 };
    act(() => emit("move"));
    expect(map.layout).toHaveBeenLastCalledWith("pistes", "visibility", "visible");

    map.center = { lng: 11.38, lat: 47.3 };
    rerender(<SkiMap city="salzburg" resorts={[]} onSelect={() => {}} />);
    act(() => emit("move"));
    expect(map.layout).toHaveBeenLastCalledWith("pistes", "visibility", "visible");
  });
});
