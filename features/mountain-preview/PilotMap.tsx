"use client";

import { useEffect, useRef, useState } from "react";
import { Map as MapLibreMap, Marker, setWorkerUrl, type FilterSpecification, type GeoJSONSourceSpecification } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { featureBounds, type PilotGeoFeature } from "./data/convert";
import { pilotFeatureFromProperties, pilotGeoJSON, type PilotFeature } from "./data/catalog";
import styles from "./pilot-map.module.css";

export type { PilotFeature } from "./data/catalog";

export interface PilotMapProps {
  mode: "map" | "day";
  selectedId: string | null;
  onSelect: (feature: PilotFeature) => void;
  replayProgress: number;
  terrain: boolean;
}

const CENTER: [number, number] = [11.3867, 47.304];
const STYLE_URL = "https://tiles.openfreemap.org/styles/positron";
const FALLBACK_STYLE = {
  version: 8 as const,
  sources: {},
  layers: [{ id: "pilot-background", type: "background" as const, paint: { "background-color": "#e7eee8" } }],
};
const TERRAIN_TILES = "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png";
const TERRAIN_ATTRIBUTION = 'Gelände: Mapzen · © offene Daten Österreichs · Copernicus / EU · USGS / NASA · <a href="https://github.com/tilezen/joerd/blob/master/docs/attribution.md">Quellen</a>';
const PILOT_SOURCE = "nordkette-pilot";
const WORKER_PATH = "/vendor/maplibre/maplibre-gl-worker.mjs";
const SAMPLE_ROUTE_ID = "pilot-day-sample-route";
const SAMPLE_AVATAR_ID = "pilot-day-sample-avatar";
const SAMPLE_LAYERS = ["pilot-day-sample-outline", "pilot-day-sample-line"] as const;

function replayFeature(): PilotGeoFeature | null {
  return pilotGeoJSON.features.find((feature) => feature.properties.kind === "piste" && feature.properties["piste:type"] === "downhill") ?? null;
}

function pointAlongRoute(coordinates: [number, number][], progress: number): [number, number] | null {
  if (coordinates.length === 0) return null;
  if (coordinates.length === 1) return coordinates[0] ?? null;
  const distances = coordinates.slice(1).map((point, index) => {
    const previous = coordinates[index] ?? point;
    const x = (point[0] - previous[0]) * Math.cos(((point[1] + previous[1]) / 2) * Math.PI / 180);
    const y = point[1] - previous[1];
    return Math.hypot(x, y);
  });
  const total = distances.reduce((sum, distance) => sum + distance, 0);
  if (total === 0) return coordinates[0] ?? null;
  let remaining = total * progress;
  for (let index = 0; index < distances.length; index += 1) {
    const distance = distances[index] ?? 0;
    if (remaining <= distance) {
      const from = coordinates[index] ?? coordinates[0]!;
      const to = coordinates[index + 1] ?? from;
      const fraction = distance === 0 ? 0 : remaining / distance;
      return [from[0] + (to[0] - from[0]) * fraction, from[1] + (to[1] - from[1]) * fraction];
    }
    remaining -= distance;
  }
  return coordinates[coordinates.length - 1] ?? null;
}

function boundsForFeature(feature: PilotGeoFeature): [[number, number], [number, number]] | null {
  const bounds = featureBounds({ type: "FeatureCollection", features: [feature] });
  return bounds ? [[bounds[0], bounds[1]], [bounds[2], bounds[3]]] : null;
}

function fitBoundsOptions(maxZoom: number, padding = 24) {
  const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
  return { padding, maxZoom, duration: reduced ? 0 : 450, essential: !reduced };
}

function installPilotLayers(map: MapLibreMap) {
  map.addSource(PILOT_SOURCE, {
    type: "geojson",
    data: pilotGeoJSON as GeoJSONSourceSpecification["data"],
    attribution: 'Data © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a> · <a href="https://opendatacommons.org/licenses/odbl/">ODbL</a>',
  });
  const beforeLabel = map.getStyle()?.layers?.find((layer) => layer.type === "symbol")?.id;
  map.addLayer({
    id: "pilot-piste-outline",
    type: "line",
    source: PILOT_SOURCE,
    filter: ["==", ["get", "kind"], "piste"],
    layout: { "line-cap": "round", "line-join": "round" },
    paint: { "line-color": "#fffdf8", "line-width": ["interpolate", ["linear"], ["zoom"], 10, 3, 15, 8], "line-opacity": 0.92 },
  }, beforeLabel);
  map.addLayer({
    id: "pilot-pistes",
    type: "line",
    source: PILOT_SOURCE,
    filter: ["==", ["get", "kind"], "piste"],
    layout: { "line-cap": "round", "line-join": "round" },
    paint: {
      "line-color": ["match", ["get", "piste:difficulty"], "novice", "#43a76e", "easy", "#287fc1", "intermediate", "#df5147", "advanced", "#302c32", "expert", "#302c32", "freeride", "#76858c", "#76858c"],
      "line-width": ["interpolate", ["linear"], ["zoom"], 10, 1.8, 15, 5],
      "line-opacity": 0.97,
    },
  });
  map.addLayer({
    id: "pilot-lift-outline",
    type: "line",
    source: PILOT_SOURCE,
    filter: ["==", ["get", "kind"], "lift"],
    layout: { "line-cap": "round", "line-join": "round" },
    paint: { "line-color": "#fffdf8", "line-width": ["interpolate", ["linear"], ["zoom"], 10, 3, 15, 7], "line-opacity": 0.95 },
  });
  map.addLayer({
    id: "pilot-lifts",
    type: "line",
    source: PILOT_SOURCE,
    filter: ["==", ["get", "kind"], "lift"],
    layout: { "line-cap": "round", "line-join": "round" },
    paint: { "line-color": "#433b34", "line-width": ["interpolate", ["linear"], ["zoom"], 10, 1.5, 15, 3], "line-dasharray": [2, 1.5], "line-opacity": 0.9 },
  });
  map.addLayer({
    id: "pilot-selected-outline",
    type: "line",
    source: PILOT_SOURCE,
    filter: ["==", ["get", "osm_id"], -1],
    layout: { "line-cap": "round", "line-join": "round" },
    paint: { "line-color": "#fffdf8", "line-width": 11, "line-opacity": 1 },
  });
  map.addLayer({
    id: "pilot-selected",
    type: "line",
    source: PILOT_SOURCE,
    filter: ["==", ["get", "osm_id"], -1],
    layout: { "line-cap": "round", "line-join": "round" },
    paint: { "line-color": "#e88754", "line-width": 6, "line-opacity": 1 },
  });
  if (beforeLabel) {
    for (const id of ["pilot-piste-outline", "pilot-pistes", "pilot-lift-outline", "pilot-lifts", "pilot-selected-outline", "pilot-selected"]) {
      map.moveLayer(id, beforeLabel);
    }
  }
}

export default function PilotMap({ mode, selectedId, onSelect, replayProgress, terrain }: PilotMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markerRef = useRef<Marker | null>(null);
  const onSelectRef = useRef(onSelect);
  const modeRef = useRef(mode);
  const [status, setStatus] = useState<"loading" | "ready" | "failed">("loading");
  const [fallbackUsed, setFallbackUsed] = useState(false);
  const [tileWarning, setTileWarning] = useState(false);
  const progress = Math.min(100, Math.max(0, Number.isFinite(replayProgress) ? replayProgress : 0));
  const selectedOsmId = selectedId?.startsWith("way/") ? Number(selectedId.slice(4)) : -1;
  useEffect(() => {
    onSelectRef.current = onSelect;
    modeRef.current = mode;
  }, [mode, onSelect]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let map: MapLibreMap;
    try {
      setWorkerUrl(new URL(WORKER_PATH, window.location.origin).href);
      map = new MapLibreMap({
        container,
        style: STYLE_URL,
        center: CENTER,
        zoom: 11,
        minZoom: 9,
        maxZoom: 17,
        attributionControl: { compact: true },
        dragRotate: false,
        pitchWithRotate: false,
      });
    } catch {
      queueMicrotask(() => setStatus("failed"));
      return;
    }
    map.touchZoomRotate.disableRotation();
    map.keyboard.disableRotation();
    mapRef.current = map;
    let styleReady = false;
    let fallbackInstalled = false;
    let failed = false;
    const installFallback = () => {
      if (styleReady || fallbackInstalled || failed) return;
      fallbackInstalled = true;
      setFallbackUsed(true);
      map.setStyle(FALLBACK_STYLE);
    };
    const failTimer = window.setTimeout(installFallback, 12_000);
    map.on("style.load", () => {
      if (styleReady) return;
      styleReady = true;
      window.clearTimeout(failTimer);
      installPilotLayers(map);
      map.addSource("pilot-terrain", { type: "raster-dem", tiles: [TERRAIN_TILES], encoding: "terrarium", tileSize: 256, maxzoom: 14, attribution: TERRAIN_ATTRIBUTION });
      map.addLayer({ id: "pilot-hillshade", type: "hillshade", source: "pilot-terrain", layout: { visibility: "none" }, paint: { "hillshade-exaggeration": 0.18, "hillshade-shadow-color": "#8a9d9c", "hillshade-highlight-color": "#ffffff", "hillshade-accent-color": "#a3b4b0" } }, "pilot-piste-outline");

      const route = replayFeature();
      if (route) {
        map.addSource(SAMPLE_ROUTE_ID, { type: "geojson", data: route as GeoJSONSourceSpecification["data"] });
        map.addLayer({ id: "pilot-day-sample-outline", type: "line", source: SAMPLE_ROUTE_ID, layout: { "visibility": "none", "line-cap": "round", "line-join": "round" }, paint: { "line-color": "#fffdf8", "line-width": 10, "line-opacity": 0.95 } });
        map.addLayer({ id: "pilot-day-sample-line", type: "line", source: SAMPLE_ROUTE_ID, layout: { "visibility": "none", "line-cap": "round", "line-join": "round" }, paint: { "line-color": "#d98b5d", "line-width": 5, "line-dasharray": [1.6, 1], "line-opacity": 0.96 } });
        const start = pointAlongRoute(route.geometry.coordinates, 0);
        if (start) {
          map.addSource(SAMPLE_AVATAR_ID, { type: "geojson", data: { type: "Feature", properties: {}, geometry: { type: "Point", coordinates: start } } });
          const element = document.createElement("div");
          element.className = styles.mapAvatar ?? "mapAvatar";
          element.textContent = "L";
          element.setAttribute("aria-hidden", "true");
          markerRef.current = new Marker({ element, anchor: "center" }).setLngLat(start).addTo(map);
        }
      }

      const bounds = featureBounds(pilotGeoJSON);
      if (bounds) map.fitBounds([[bounds[0], bounds[1]], [bounds[2], bounds[3]]], { ...fitBoundsOptions(14.5, 26), duration: 0 });
      else map.setCenter(CENTER);
      setStatus("ready");
    });
    map.on("error", () => {
      if (styleReady) {
        setTileWarning(true);
        return;
      }
      if (!fallbackInstalled) installFallback();
      else {
        failed = true;
        window.clearTimeout(failTimer);
        setStatus("failed");
      }
    });
    map.on("click", (event) => {
      if (modeRef.current === "day") return;
      const layers = ["pilot-pistes", "pilot-lifts"].filter((id) => map.getLayer(id));
      if (layers.length === 0) return;
      const feature = map.queryRenderedFeatures(event.point, { layers }).find((item) => item.source === PILOT_SOURCE);
      if (!feature?.properties) return;
      const item = pilotFeatureFromProperties(feature.properties);
      if (item) onSelectRef.current(item);
    });
    const observer = new ResizeObserver(() => map.resize());
    observer.observe(container);
    return () => {
      window.clearTimeout(failTimer);
      observer.disconnect();
      markerRef.current?.remove();
      markerRef.current = null;
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    for (const id of SAMPLE_LAYERS) {
      if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", mode === "day" ? "visible" : "none");
    }
    const marker = markerRef.current?.getElement();
    if (marker) marker.style.display = mode === "day" ? "grid" : "none";
  }, [mode, status]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || status !== "ready") return;
    map.resize();
    const filter = ["==", ["get", "osm_id"], Number.isFinite(selectedOsmId) ? selectedOsmId : -1] as FilterSpecification;
    map.setFilter("pilot-selected-outline", filter);
    map.setFilter("pilot-selected", filter);
    const feature = pilotGeoJSON.features.find((item) => item.properties.osm_id === selectedOsmId);
    const bounds = feature ? boundsForFeature(feature) : null;
    if (bounds) map.fitBounds(bounds, fitBoundsOptions(15, 34));
  }, [selectedOsmId, status]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || status !== "ready") return;
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    map.setTerrain(terrain ? { source: "pilot-terrain", exaggeration: 1.15 } : null);
    map.setLayoutProperty("pilot-hillshade", "visibility", "visible");
    map.easeTo({ pitch: terrain ? 48 : 0, duration: reduced ? 0 : 500, essential: !reduced });
  }, [terrain, status]);

  useEffect(() => {
    const map = mapRef.current;
    const route = replayFeature();
    const source = map?.getSource(SAMPLE_AVATAR_ID);
    if (!source || !route || mode !== "day") return;
    const coordinate = pointAlongRoute(route.geometry.coordinates, progress / 100);
    if (coordinate && "setData" in source) {
      (source as { setData: (data: GeoJSONSourceSpecification["data"]) => void }).setData({ type: "Feature", properties: {}, geometry: { type: "Point", coordinates: coordinate } });
      markerRef.current?.setLngLat(coordinate);
    }
  }, [mode, progress, status]);

  useEffect(() => {
    const map = mapRef.current;
    const route = replayFeature();
    if (!map || mode !== "day" || status !== "ready" || !route) return;
    const bounds = boundsForFeature(route);
    if (bounds) map.fitBounds(bounds, fitBoundsOptions(14.5, 60));
  }, [mode, status]);

  return (
    <section className={styles.root} aria-label="Nordkette Karte">
      <div ref={containerRef} className={styles.map} />
      {status === "loading" && <div className={styles.state} role="status"><span className={styles.spinner} />Karte wird geladen …</div>}
      {status === "failed" && <div className={styles.failure} role="status"><strong>Karte nicht verfügbar</strong><span>Die Kartenansicht konnte auf diesem Gerät nicht gestartet werden.</span></div>}
      {((fallbackUsed && status === "ready") || tileWarning) && <div className={styles.fallbackNote} role="status">Kartenanbieter nicht erreichbar · OSM-Linien bleiben eingeblendet</div>}
      {mode === "day" && <div className={styles.replayTag}><span />Beispielroute · kein Live-Standort</div>}
    </section>
  );
}
