"use client";

import Image from "next/image";
import ResortScene from "@/components/ResortScene";
import { useT } from "@/lib/i18n/client";
import type { ResortStatus } from "@/lib/types";
import type { ResortConditions } from "@/features/conditions/conditions";
import { ConditionsLine } from "@/features/conditions/ConditionsPanel";
import type { ResortPhoto } from "./resort-photo";
import ResortPhotoCredit from "./ResortPhotoCredit";

export default function ResortExplorer({ resorts, onSelect, conditions, photos, isLive }: {
  resorts: ResortStatus[];
  onSelect: (resort: ResortStatus) => void;
  conditions?: Record<string, ResortConditions | null> | null;
  photos?: Record<string, ResortPhoto>;
  isLive: boolean;
}) {
  const t = useT();
  return (
    <section className="min-w-0 py-4" aria-labelledby="resort-explorer-title">
      <h2 id="resort-explorer-title" className="px-4 text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{t("map.allResorts")}</h2>
      <ul className="mt-3 flex snap-x snap-proximity gap-3 overflow-x-auto px-4 pb-3">
        {resorts.map((resort) => {
          const photo = photos?.[resort.name];
          const weather = conditions?.[resort.name];
          return (
            <li key={resort.name} className="w-[220px] shrink-0 snap-start">
              <button type="button" onClick={() => onSelect(resort)} aria-label={resort.name}
                className="card-tap block w-full overflow-hidden rounded-[20px] text-left"
                style={{ background: "var(--bg-surface-1)", border: "1px solid var(--border-subtle)" }}>
                <div className="relative h-24 overflow-hidden">
                  {photo ? <Image src={photo.src} alt={resort.name} fill sizes="220px" className="object-cover" />
                    : <div aria-hidden="true" className="absolute inset-0"><ResortScene name={resort.name} className="h-full w-full" /></div>}
                </div>
                <div className="space-y-1.5 p-4">
                  <span className="block truncate text-base font-semibold" style={{ color: "var(--text-primary)" }}>{resort.name}</span>
                  <span className="block text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>
                    {isLive ? `${resort.ridersNow} ${t("map.ridingToday")}` : t("map.riding", { n: resort.ridersNow })}
                  </span>
                  {isLive && weather && <ConditionsLine conditions={weather} />}
                  {!isLive && <span className="flex flex-wrap gap-x-2 text-xs" style={{ color: "var(--text-tertiary)" }}><span>{resort.snowDepth} cm</span><span>{t("map.lifts", { open: resort.liftsOpen, total: resort.totalLifts })}</span></span>}
                </div>
              </button>
              {photo && <ResortPhotoCredit photo={photo} />}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
