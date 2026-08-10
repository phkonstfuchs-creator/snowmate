"use client";

import { useEffect, useRef, useState } from "react";
import type {
  Map as LeafletMapInstance,
  Marker,
} from "leaflet";

import type { ResortStatus } from "@/lib/types";
import { createMarkerContent } from "@/features/resorts/marker-content";

const RESORT_COORDS: Record<string, [number, number]> = {
  Nordkette: [47.3247, 11.3867],
  "Axamer Lizum": [47.1717, 11.2333],
  Patscherkofel: [47.214, 11.47],
  "Mutterer Alm": [47.209, 11.376],
  "Rangger Köpfl": [47.198, 11.2],
  "Schlick 2000": [47.233, 11.198],
  "Serlesbahnen Mieders": [47.162, 11.317],
  Bergeralm: [47.211, 11.501],
  Glungezer: [47.239, 11.482],
  Hochoetz: [47.2, 10.918],
  Kühtai: [47.208, 11.017],
  "Stubai Glacier": [47.083, 11.152],
  Sölden: [46.967, 11],
  "Zell am See": [47.3247, 12.7969],
  Kitzsteinhorn: [47.2242, 12.692],
  "Saalbach-Hinterglemm": [47.3917, 12.6333],
  Flachau: [47.333, 13.383],
  Wagrain: [47.35, 13.3],
  "Bad Gastein": [47.117, 13.133],
  Hochkönig: [47.4167, 13.0667],
};

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
      const coordinates = RESORT_COORDS[resort.name];
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
