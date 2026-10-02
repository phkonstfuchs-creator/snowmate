"use client";

import { useEffect, useRef, useState } from "react";
import type {
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

interface LeafletMapProps {
  city: ResortStatus["city"];
  resorts: readonly ResortStatus[];
  onSelect: (resort: ResortStatus) => void;
}

type LeafletModule = typeof import("leaflet");

export default function LeafletMap({
  city,
  resorts,
  onSelect,
}: LeafletMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMapInstance | null>(null);
  const markersRef = useRef<Marker[]>([]);
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
            maxZoom: 14,
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

  useEffect(() => {
    return () => {
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
      aria-label={`Map of ski resorts around ${city === "innsbruck" ? "Innsbruck" : "Salzburg"}`}
      className="printed-map"
      style={{ width: "100%", height: "100%", minHeight: 260 }}
    />
  );
}
