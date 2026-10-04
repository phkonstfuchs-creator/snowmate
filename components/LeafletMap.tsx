"use client";

import { useEffect, useRef, useState } from "react";
import type {
  Circle,
  CircleMarker,
  Map as LeafletMapInstance,
  Marker,
} from "leaflet";

import type { ResortStatus } from "@/lib/types";
import { resortCoordinates } from "@/lib/resorts";
import { createMarkerContent } from "@/features/resorts/marker-content";


const CITY_VIEWS = {
  innsbruck: { center: [47.22, 11.32] as [number, number], zoom: 10 },
  salzburg: { center: [47.32, 13] as [number, number], zoom: 9 },
} satisfies Record<
  ResortStatus["city"],
  { center: [number, number]; zoom: number }
>;

export interface MapPerson {
  id: string;
  label: string;
  initials: string;
  lat: number;
  lng: number;
}

interface LeafletMapProps {
  city: ResortStatus["city"];
  resorts: readonly ResortStatus[];
  onSelect: (resort: ResortStatus) => void;
  /* The viewer's own position, shown as a dot with its accuracy. */
  me?: { lat: number; lng: number; accuracy: number | null } | null;
  /* Friends who share their position. */
  people?: readonly MapPerson[];
  onPersonSelect?: (id: string) => void;
  /* Changes when the view should jump to a point (e.g. "locate me"). */
  focus?: { lat: number; lng: number; zoom: number; key: number } | null;
  /* Changes on "show my location": fly to the next known own position. */
  locateRequest?: number;
  ariaLabel?: string;
}

type LeafletModule = typeof import("leaflet");

export default function LeafletMap({
  city,
  resorts,
  onSelect,
  me = null,
  people = [],
  onPersonSelect,
  focus = null,
  locateRequest = 0,
  ariaLabel,
}: LeafletMapProps) {
  const handledLocate = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMapInstance | null>(null);
  const markersRef = useRef<Marker[]>([]);
  const peopleRef = useRef<Marker[]>([]);
  const meRef = useRef<{ dot: CircleMarker; ring: Circle } | null>(null);
  const [leaflet, setLeaflet] = useState<LeafletModule | null>(null);
  const [hasLoadError, setHasLoadError] = useState(false);

  useEffect(() => {
    let isActive = true;

    void Promise.all([
      import("leaflet"),
      import("leaflet/dist/leaflet.css"),
    ])
      .then(([leafletModule]) => {
        if (isActive) setLeaflet(leafletModule);
      })
      .catch(() => {
        if (isActive) setHasLoadError(true);
      });

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    if (!leaflet || !containerRef.current) return;

    const view = CITY_VIEWS[city];
    const map =
      mapRef.current ??
      leaflet.map(containerRef.current, {
        center: view.center,
        zoom: view.zoom,
        zoomControl: false,
        attributionControl: true,
      });

    if (!mapRef.current) {
      leaflet
        .tileLayer(
          "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
          {
            attribution:
              '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
            maxZoom: 17,
          },
        )
        .addTo(map);
      mapRef.current = map;
    } else {
      map.flyTo(view.center, view.zoom, { animate: true, duration: 0.8 });
    }

    markersRef.current.forEach((marker) => marker.remove());

    const hotResort = [...resorts].sort(
      (left, right) => right.ridersNow - left.ridersNow,
    )[0];

    markersRef.current = resorts.flatMap((resort) => {
      const coordinates = resortCoordinates(resort.name);
      if (!coordinates) return [];

      const isHot = resort.name === hotResort?.name;
      const size = isHot ? 56 : Math.max(44, 40 + resort.ridersNow * 0.3);
      const icon = leaflet.divIcon({
        className: "",
        html: createMarkerContent(resort, isHot, size),
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
      });
      const marker = leaflet.marker(coordinates, { icon }).addTo(map);
      marker.on("click", () => onSelect(resort));

      return [marker];
    });
  }, [city, leaflet, onSelect, resorts]);

  /* Friends' positions: initials in a pin, name underneath. Text goes in
     through textContent, never as HTML. */
  useEffect(() => {
    const map = mapRef.current;
    if (!leaflet || !map) return;

    peopleRef.current.forEach((marker) => marker.remove());
    peopleRef.current = people.map((person) => {
      const pin = document.createElement("div");
      pin.className = "friend-pin";
      const badge = document.createElement("span");
      badge.className = "friend-pin-badge";
      badge.textContent = person.initials;
      const name = document.createElement("span");
      name.className = "friend-pin-name";
      name.textContent = person.label;
      pin.append(badge, name);

      const marker = leaflet
        .marker([person.lat, person.lng], {
          icon: leaflet.divIcon({ className: "", html: pin, iconSize: [40, 40], iconAnchor: [20, 20] }),
          zIndexOffset: 500,
          keyboard: true,
          title: person.label,
        })
        .addTo(map);
      marker.on("click", () => onPersonSelect?.(person.id));
      return marker;
    });
  }, [leaflet, people, onPersonSelect, city]);

  useEffect(() => {
    const map = mapRef.current;
    if (!leaflet || !map) return;

    if (!me) {
      meRef.current?.dot.remove();
      meRef.current?.ring.remove();
      meRef.current = null;
      return;
    }

    const radius = Math.min(Math.max(me.accuracy ?? 0, 5), 2000);
    if (meRef.current) {
      meRef.current.dot.setLatLng([me.lat, me.lng]);
      meRef.current.ring.setLatLng([me.lat, me.lng]).setRadius(radius);
    } else {
      meRef.current = {
        ring: leaflet.circle([me.lat, me.lng], { radius, color: "#2f6fb2", weight: 1, fillOpacity: 0.12 }).addTo(map),
        dot: leaflet
          .circleMarker([me.lat, me.lng], { radius: 8, color: "#ffffff", weight: 3, fillColor: "#2f6fb2", fillOpacity: 1 })
          .addTo(map),
      };
    }
  }, [leaflet, me, city]);

  useEffect(() => {
    if (!me || !mapRef.current || locateRequest === 0 || handledLocate.current === locateRequest) return;
    handledLocate.current = locateRequest;
    mapRef.current.flyTo([me.lat, me.lng], 14, { animate: true, duration: 0.8 });
  }, [me, locateRequest]);

  useEffect(() => {
    if (!focus || !mapRef.current) return;
    mapRef.current.flyTo([focus.lat, focus.lng], focus.zoom, { animate: true, duration: 0.8 });
  }, [focus]);

  useEffect(() => {
    return () => {
      peopleRef.current.forEach((marker) => marker.remove());
      markersRef.current.forEach((marker) => marker.remove());
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  if (hasLoadError) {
    return (
      <div
        className="flex h-full min-h-[260px] items-center justify-center px-6 text-center text-sm"
        role="alert"
        style={{ color: "var(--text-tertiary)" }}
      >
        Die Karte konnte nicht geladen werden.
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      aria-label={ariaLabel ?? `Map of ski resorts around ${city === "innsbruck" ? "Innsbruck" : "Salzburg"}`}
      className="printed-map"
      style={{ width: "100%", height: "100%", minHeight: 260 }}
    />
  );
}
