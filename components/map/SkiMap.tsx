"use client";

import { useEffect, useRef, useState } from "react";
import { Map as MapLibreMap, Marker, setWorkerUrl, type GeoJSONSource, type StyleSpecification } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

import type { ResortStatus } from "@/lib/types";
import { useT } from "@/lib/i18n/client";
import { resortCoordinates } from "@/lib/resorts";
import { createMarkerContent } from "@/features/resorts/marker-content";
import {
  PISTE_ATTRIBUTION,
  PISTE_TILES,
  RASTER_FALLBACK_STYLE,
  TERRAIN_TILES,
  VECTOR_STYLE_URL,
  accuracyCircle,
  clampAccuracy,
  paperTint,
} from "./map-style";

const CITY_VIEWS = {
  innsbruck: { center: [11.32, 47.22] as [number, number], zoom: 9.4 },
  salzburg: { center: [13, 47.32] as [number, number], zoom: 8.4 },
} satisfies Record<ResortStatus["city"], { center: [number, number]; zoom: number }>;

/* The vector style gets this long before the raster fallback takes over. */
const STYLE_TIMEOUT_MS = 7000;
const ACCURACY_SOURCE = "me-accuracy";
/* Copied there by scripts/copy-maplibre-worker.mjs before dev and build. */
const WORKER_PATH = "/vendor/maplibre/maplibre-gl-worker.mjs";

export interface MapPerson {
  id: string;
  label: string;
  initials: string;
  lat: number;
  lng: number;
}

interface SkiMapProps {
  city: ResortStatus["city"];
  resorts: readonly ResortStatus[];
  onSelect: (resort: ResortStatus) => void;
  /* The viewer's own position, shown as a dot with its accuracy. */
  me?: { lat: number; lng: number; accuracy: number | null } | null;
  /* Friends who share their position. */
  people?: readonly MapPerson[];
  onPersonSelect?: (id: string) => void;
  /* Changes when the view should jump to a point (e.g. a friend). */
  focus?: { lat: number; lng: number; zoom: number; key: number } | null;
  /* Changes on "show my location": fly to the next known own position. */
  locateRequest?: number;
  /* A position sent in a chat. */
  pin?: { lat: number; lng: number; label: string } | null;
  ariaLabel?: string;
}

function addAccuracyLayer(map: MapLibreMap) {
  if (map.getSource(ACCURACY_SOURCE)) return;
  map.addSource(ACCURACY_SOURCE, { type: "geojson", data: { type: "FeatureCollection", features: [] } });
  map.addLayer({
    id: "me-accuracy-fill",
    type: "fill",
    source: ACCURACY_SOURCE,
    paint: { "fill-color": "#2f6fb2", "fill-opacity": 0.12 },
  });
  map.addLayer({
    id: "me-accuracy-line",
    type: "line",
    source: ACCURACY_SOURCE,
    paint: { "line-color": "#2f6fb2", "line-width": 1, "line-opacity": 0.5 },
  });
}

/* Hill shading under the labels, pistes and lifts on top. Both are
   extras: if their tiles fail, the base map still works. */
function addSkiLayers(map: MapLibreMap) {
  if (map.getSource("pistes")) return;
  const firstLabel = map.getStyle()?.layers?.find((layer) => layer.type === "symbol")?.id;
  map.addSource("terrain", {
    type: "raster-dem",
    tiles: [TERRAIN_TILES],
    encoding: "terrarium",
    tileSize: 256,
    maxzoom: 14,
  });
  map.addLayer(
    {
      id: "hillshade",
      type: "hillshade",
      source: "terrain",
      paint: { "hillshade-exaggeration": 0.35, "hillshade-shadow-color": "#5b5446", "hillshade-highlight-color": "#ffffff" },
    },
    firstLabel,
  );
  map.addSource("pistes", {
    type: "raster",
    tiles: [PISTE_TILES],
    tileSize: 256,
    maxzoom: 18,
    attribution: PISTE_ATTRIBUTION,
  });
  map.addLayer({ id: "pistes", type: "raster", source: "pistes", paint: { "raster-opacity": 0.95 } });
}

function tintStyle(map: MapLibreMap) {
  for (const layer of map.getStyle()?.layers ?? []) {
    const tint = paperTint(layer.id, layer.type);
    if (tint) map.setPaintProperty(layer.id, tint.property, tint.value);
  }
}

export default function SkiMap({
  city,
  resorts,
  onSelect,
  me = null,
  people = [],
  onPersonSelect,
  focus = null,
  locateRequest = 0,
  pin = null,
  ariaLabel,
}: SkiMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const resortMarkers = useRef<Marker[]>([]);
  const peopleMarkers = useRef<Marker[]>([]);
  const meMarker = useRef<Marker | null>(null);
  const pinMarker = useRef<Marker | null>(null);
  const handledLocate = useRef(0);
  const shownCity = useRef(city);
  const latestMe = useRef(me);
  const [styleReady, setStyleReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const t = useT();

  /* Create the map once. Markers are DOM elements and survive a style
     change; the accuracy layer is re-added on every style load. */
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let map: MapLibreMap;
    try {
      setWorkerUrl(new URL(WORKER_PATH, window.location.origin).href);
      const view = CITY_VIEWS[shownCity.current];
      map = new MapLibreMap({
        container,
        style: VECTOR_STYLE_URL,
        center: view.center,
        zoom: view.zoom,
        minZoom: 6,
        maxZoom: 17,
        attributionControl: { compact: true },
        dragRotate: false,
        pitchWithRotate: false,
        fadeDuration: 150,
      });
    } catch {
      /* No WebGL on this device. */
      queueMicrotask(() => setFailed(true));
      return;
    }
    map.touchZoomRotate.disableRotation();
    map.keyboard.disableRotation();
    mapRef.current = map;

    let loaded = false;
    let fellBack = false;
    const fallBack = () => {
      if (loaded || fellBack) return;
      fellBack = true;
      map.setStyle(RASTER_FALLBACK_STYLE as StyleSpecification);
    };
    const timer = window.setTimeout(fallBack, STYLE_TIMEOUT_MS);

    map.on("style.load", () => {
      loaded = true;
      window.clearTimeout(timer);
      if (!fellBack) tintStyle(map);
      addSkiLayers(map);
      addAccuracyLayer(map);
      setStyleReady(true);
    });
    map.on("error", () => {
      if (!loaded) fallBack();
    });

    /* The container changes size with the page (e.g. dvh while the
       browser bar collapses); keep the canvas in step. */
    const observer = new ResizeObserver(() => map.resize());
    observer.observe(container);

    return () => {
      window.clearTimeout(timer);
      observer.disconnect();
      map.remove();
      mapRef.current = null;
      resortMarkers.current = [];
      peopleMarkers.current = [];
      meMarker.current = null;
      pinMarker.current = null;
    };
  }, []);

  /* Region switch: glide over instead of reloading. */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || shownCity.current === city) return;
    shownCity.current = city;
    const view = CITY_VIEWS[city];
    map.flyTo({ center: view.center, zoom: view.zoom, duration: 900, essential: true });
  }, [city]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    resortMarkers.current.forEach((marker) => marker.remove());
    const hotResort = [...resorts].sort((left, right) => right.ridersNow - left.ridersNow)[0];

    resortMarkers.current = resorts.flatMap((resort) => {
      const coordinates = resortCoordinates(resort.name);
      if (!coordinates) return [];
      const isHot = resort.name === hotResort?.name;
      const size = isHot ? 56 : Math.max(44, 40 + resort.ridersNow * 0.3);
      const element = createMarkerContent(resort, isHot, size);
      element.setAttribute("role", "button");
      element.setAttribute("aria-label", resort.name);
      element.tabIndex = 0;
      element.addEventListener("click", (event) => {
        event.stopPropagation();
        onSelect(resort);
      });
      element.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") onSelect(resort);
      });
      return [new Marker({ element }).setLngLat([coordinates[1], coordinates[0]]).addTo(map)];
    });
  }, [resorts, onSelect]);

  /* Friends' positions: initials in a pin, name underneath. Text goes in
     through textContent, never as HTML. */
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    peopleMarkers.current.forEach((marker) => marker.remove());
    peopleMarkers.current = people.map((person) => {
      const pin = document.createElement("button");
      pin.type = "button";
      pin.className = "friend-pin";
      pin.setAttribute("aria-label", person.label);
      const badge = document.createElement("span");
      badge.className = "friend-pin-badge";
      badge.textContent = person.initials;
      const name = document.createElement("span");
      name.className = "friend-pin-name";
      name.textContent = person.label;
      pin.append(badge, name);
      pin.addEventListener("click", (event) => {
        event.stopPropagation();
        onPersonSelect?.(person.id);
      });
      return new Marker({ element: pin, anchor: "top", offset: [0, -17] })
        .setLngLat([person.lng, person.lat])
        .addTo(map);
    });
  }, [people, onPersonSelect]);

  /* A pin from a chat: a marker with the sender's name (as text). */
  useEffect(() => {
    const map = mapRef.current;
    pinMarker.current?.remove();
    pinMarker.current = null;
    if (!map || !pin) return;
    const element = document.createElement("div");
    element.className = "chat-pin";
    element.setAttribute("role", "img");
    element.setAttribute("aria-label", `${t("map.sharedPin")}: ${pin.label}`);
    const name = document.createElement("span");
    name.className = "chat-pin-name";
    name.textContent = pin.label;
    element.append(name);
    pinMarker.current = new Marker({ element, anchor: "bottom" }).setLngLat([pin.lng, pin.lat]).addTo(map);
  }, [pin, t]);

  /* Own position: a pulsing blue dot plus the accuracy circle. */
  useEffect(() => {
    latestMe.current = me;
    const map = mapRef.current;
    if (!map) return;

    if (!me) {
      meMarker.current?.remove();
      meMarker.current = null;
    } else if (meMarker.current) {
      meMarker.current.setLngLat([me.lng, me.lat]);
    } else {
      const dot = document.createElement("div");
      dot.className = "me-dot";
      dot.setAttribute("aria-hidden", "true");
      meMarker.current = new Marker({ element: dot }).setLngLat([me.lng, me.lat]).addTo(map);
    }

    const source = styleReady ? (map.getSource(ACCURACY_SOURCE) as GeoJSONSource | undefined) : undefined;
    source?.setData({
      type: "FeatureCollection",
      features: me ? [accuracyCircle(me.lng, me.lat, clampAccuracy(me.accuracy))] : [],
    });
  }, [me, styleReady]);

  useEffect(() => {
    const map = mapRef.current;
    const position = latestMe.current;
    if (!map || !position || locateRequest === 0 || handledLocate.current === locateRequest) return;
    handledLocate.current = locateRequest;
    map.flyTo({ center: [position.lng, position.lat], zoom: Math.max(map.getZoom(), 14), duration: 800, essential: true });
  }, [me, locateRequest]);

  useEffect(() => {
    if (!focus || !mapRef.current) return;
    mapRef.current.flyTo({ center: [focus.lng, focus.lat], zoom: focus.zoom, duration: 800, essential: true });
  }, [focus]);

  if (failed) {
    return (
      <div
        className="flex h-full min-h-[260px] items-center justify-center px-6 text-center text-sm"
        role="alert"
        style={{ color: "var(--text-tertiary)", background: "var(--paper-2)" }}
      >
        {t("map.noWebgl")}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      role="region"
      aria-label={ariaLabel ?? t("map.region", { city: city === "innsbruck" ? "Innsbruck" : "Salzburg" })}
      className="ski-map"
      data-ready={styleReady ? "true" : "false"}
      style={{ width: "100%", height: "100%", minHeight: 260 }}
    />
  );
}
