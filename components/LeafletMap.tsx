"use client";

import { useEffect, useRef } from "react";
import { ResortStatus } from "@/lib/types";

const RESORT_COORDS: Record<string, [number, number]> = {
  // Innsbruck
  "Nordkette":               [47.3247, 11.3867],
  "Axamer Lizum":            [47.1717, 11.2333],
  "Patscherkofel":           [47.2140, 11.4700],
  "Mutterer Alm":            [47.2090, 11.3760],
  "Rangger Köpfl":           [47.1980, 11.2000],
  "Schlick 2000":            [47.2330, 11.1980],
  "Serlesbahnen Mieders":    [47.1620, 11.3170],
  "Bergeralm":               [47.2110, 11.5010],
  "Glungezer":               [47.2390, 11.4820],
  "Hochoetz":                [47.2000, 10.9180],
  "Kühtai":                  [47.2080, 11.0170],
  "Stubai Glacier":          [47.0830, 11.1520],
  "Sölden":                  [46.9670, 11.0000],
  // Salzburg
  "Zell am See":             [47.3247, 12.7969],
  "Kitzsteinhorn":           [47.2242, 12.6920],
  "Saalbach-Hinterglemm":    [47.3917, 12.6333],
  "Flachau":                 [47.3330, 13.3830],
  "Wagrain":                 [47.3500, 13.3000],
  "Bad Gastein":             [47.1170, 13.1330],
  "Hochkönig":               [47.4167, 13.0667],
};

const CITY_VIEWS = {
  innsbruck: { center: [47.22, 11.32] as [number, number], zoom: 10 },
  salzburg:  { center: [47.32, 13.00] as [number, number], zoom: 9  },
};

interface Props {
  city: "innsbruck" | "salzburg";
  resorts: ResortStatus[];
  onSelect: (resort: ResortStatus) => void;
}

export default function LeafletMap({ city, resorts, onSelect }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Dynamically import leaflet to avoid SSR
    import("leaflet").then((L) => {
      import("leaflet/dist/leaflet.css" as any);

      // Fix default icon (suppress 404)
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({ iconUrl: "data:,", shadowUrl: "data:," });

      if (!containerRef.current) return;

      // Init map
      if (!mapRef.current) {
        const view = CITY_VIEWS[city];
        const map = L.map(containerRef.current, {
          center: view.center,
          zoom: view.zoom,
          zoomControl: false,
          attributionControl: true,
        });

        // Dark tile layer
        L.tileLayer(
          "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
          {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" style="color:#666">OSM</a> &copy; <a href="https://carto.com/attributions" style="color:#666">CARTO</a>',
            maxZoom: 14,
          }
        ).addTo(map);

        mapRef.current = map;
      }

      // Update markers
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];

      const sorted = [...resorts].sort((a, b) => b.ridersNow - a.ridersNow);
      const hotName = sorted[0]?.name;

      resorts.forEach((resort) => {
        const coords = RESORT_COORDS[resort.name];
        if (!coords) return;

        const isHot = resort.name === hotName;
        const size = isHot ? 50 : Math.max(36, 32 + resort.ridersNow * 0.3);
        const bg = isHot ? "#4FC3F0" : "#202A34";
        const textColor = isHot ? "#0A0E12" : "#F5F9FB";
        const ring = isHot ? `box-shadow:0 0 0 3px rgba(79,195,240,0.35);` : "";

        const icon = (L as any).divIcon({
          className: "",
          html: `<div style="
            width:${size}px;height:${size}px;
            background:${bg};
            border-radius:50%;
            display:flex;flex-direction:column;
            align-items:center;justify-content:center;
            border:2px solid rgba(255,255,255,0.18);
            ${ring}
            cursor:pointer;
          ">
            <span style="font-family:var(--font-mono);font-size:${size < 42 ? 11 : 14}px;font-weight:700;color:${textColor};line-height:1">${resort.ridersNow}</span>
            ${size >= 42 ? `<span style="font-size:7px;color:${isHot ? "rgba(10,14,18,0.75)" : "#8A97A3"};white-space:nowrap;overflow:hidden;max-width:${size - 8}px;text-overflow:ellipsis;line-height:1;margin-top:1px;font-weight:800">${resort.name.split(" ")[0]}</span>` : ""}
          </div>`,
          iconSize: [size, size],
          iconAnchor: [size / 2, size / 2],
        });

        const marker = (L as any).marker(coords, { icon }).addTo(mapRef.current);
        marker.on("click", () => onSelect(resort));
        markersRef.current.push(marker);
      });
    });
  }, [city, resorts]); // eslint-disable-line

  // Fly to new city view
  useEffect(() => {
    if (!mapRef.current) return;
    const view = CITY_VIEWS[city];
    mapRef.current.flyTo(view.center, view.zoom, { animate: true, duration: 0.8 });
  }, [city]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{ width: "100%", height: "100%", minHeight: 260 }}
    />
  );
}
