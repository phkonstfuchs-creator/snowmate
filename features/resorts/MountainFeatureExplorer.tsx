"use client";

import { useMemo, useState } from "react";
import Sheet from "@/components/ui/Sheet";
import { useLocale, useT } from "@/lib/i18n/client";
import { mountainFeatures, MOUNTAIN_SNAPSHOT_DATE } from "@/features/mountain-data/catalog";
import type { MountainFeature } from "@/features/mountain-data/catalog";
import { nordketteFacilities } from "@/features/mountain-data/facilities";
import type { MountainFacility } from "@/features/mountain-data/facilities";
import styles from "./mountain-features.module.css";

type Filter = "all" | "piste" | "lift";
type InventoryRow =
  | { type: "facility"; facility: MountainFacility }
  | { type: "feature"; feature: MountainFeature; unassigned: boolean };

export default function MountainFeatureExplorer({
  onSelect,
  onSelectFacility,
  onClose,
}: {
  onSelect: (id: string) => void;
  onSelectFacility: (id: string) => void;
  onClose: () => void;
}) {
  const t = useT();
  const locale = useLocale();
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLocaleLowerCase(locale);
  const rows = useMemo<InventoryRow[]>(() => {
    const mappedIds = new Set(nordketteFacilities
      .filter(({ geometry }) => geometry.status === "matched" && geometry.featureId)
      .map(({ geometry }) => geometry.featureId));
    const inventory: InventoryRow[] = [
      ...nordketteFacilities.map((facility) => ({ type: "facility" as const, facility })),
      ...mountainFeatures
        .filter((feature) => feature.kind === "piste" || !mappedIds.has(feature.id))
        .map((feature) => ({ type: "feature" as const, feature, unassigned: feature.kind === "lift" })),
    ];
    return inventory.filter((row) => {
      const kind = row.type === "facility" || row.feature.kind === "lift" ? "lift" : "piste";
      if (filter !== "all" && kind !== filter) return false;
      if (!normalizedQuery) return true;
      const sourceFeature = row.type === "facility" && row.facility.geometry.status === "matched"
        ? mountainFeatures.find(({ id }) => id === row.facility.geometry.featureId)
        : undefined;
      const searchable = row.type === "facility"
        ? `${row.facility.name} ${sourceFeature?.name ?? ""} ${row.facility.id} ${row.facility.geometry.featureId ?? ""}`
        : `${row.feature.name} ${row.feature.id}`;
      return searchable.toLocaleLowerCase(locale).includes(normalizedQuery);
    });
  }, [filter, locale, normalizedQuery]);
  const pisteCount = mountainFeatures.filter(({ kind }) => kind === "piste").length;
  const liftCount = mountainFeatures.filter(({ kind }) => kind === "lift").length;
  const nameTotals = new Map<string, number>();
  const nameOrdinals = new Map<string, number>();
  const nameCounters = new Map<string, number>();
  mountainFeatures.forEach((feature) => {
    nameTotals.set(feature.name, (nameTotals.get(feature.name) ?? 0) + 1);
    const ordinal = (nameCounters.get(feature.name) ?? 0) + 1;
    nameCounters.set(feature.name, ordinal);
    nameOrdinals.set(feature.id, ordinal);
  });

  return (
    <Sheet title={t("mountain.title")} subtitle={t("mountain.resort")} onClose={onClose} className={styles.sheet}>
      <section className={styles.explorer} aria-label={t("mountain.inventory")}>
        <p className={styles.coverage}>{t("mountain.coverageSummary", { pistes: pisteCount, lifts: liftCount })}</p>
        <p className={styles.coverage}>{t("mountain.facilityCount", { count: nordketteFacilities.length })}</p>
        <p className={styles.partialCoverage}>{t("mountain.partialCoverage")}</p>

        <label className={styles.searchField}>
          <span>{t("mountain.searchLabel")}</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.currentTarget.value)}
            placeholder={t("mountain.searchPlaceholder")}
            aria-label={t("mountain.searchLabel")}
          />
        </label>

        <div className={styles.filters} role="group" aria-label={t("mountain.filterLabel")}>
          {(["all", "piste", "lift"] as const).map((value) => (
            <button
              key={value}
              type="button"
              className={styles.mountainFilter}
              aria-pressed={filter === value}
              onClick={() => setFilter(value)}
            >
              {t(value === "all" ? "mountain.filter.all" : value === "piste" ? "mountain.filter.piste" : "mountain.filter.lift")}
            </button>
          ))}
        </div>

        <p className={styles.snapshot}>{t("mountain.snapshot", { date: formatSnapshotDate(MOUNTAIN_SNAPSHOT_DATE, locale) })}</p>
        {rows.length > 0 ? (
          <ul className={styles.featureList}>
            {rows.map((row) => {
              if (row.type === "facility") {
                const { facility } = row;
                const geometryLabel = facility.geometry.status === "matched"
                  ? t("mountain.geometry.matched")
                  : facility.geometry.status === "candidate"
                    ? t("mountain.geometry.candidate")
                    : t("mountain.geometry.missing");
                return (
                  <li key={`facility:${facility.id}`}>
                    <button
                      type="button"
                      className={styles.featureRow}
                      aria-label={facility.name}
                      onClick={() => facility.geometry.status === "matched" && facility.geometry.featureId
                        ? onSelect(facility.geometry.featureId)
                        : onSelectFacility(facility.id)}
                    >
                      <span className={styles.featureMain}>
                        <strong>{facility.name}</strong>
                        <small>{t("mountain.kind.lift")} · {geometryLabel}</small>
                      </span>
                      <span className={styles.inventoryMark}>{facility.geometry.status === "matched" ? t("mountain.mapped") : t("mountain.details")}</span>
                    </button>
                  </li>
                );
              }

              const { feature } = row;
              const nameTotal = nameTotals.get(feature.name) ?? 1;
              const nameOrdinal = nameOrdinals.get(feature.id) ?? 1;
              const section = nameTotal > 1 ? t("mountain.sectionOrdinal", { index: nameOrdinal, total: nameTotal }) : null;
              const isUnnamedConveyor = feature.aerialwayType === "magic_carpet"
                && feature.name === `OSM lift ${feature.id.replace(/^way\//u, "")}`;
              const displayName = isUnnamedConveyor ? t("mountain.unassignedWayName") : feature.name;
              const label = row.unassigned
                ? `${displayName}, ${t("mountain.unassignedWay", { id: feature.id.replace(/^way\//u, "") })}`
                : section ? `${feature.name}, ${section}` : feature.name;
              return (
                <li key={`feature:${feature.id}`}>
                  <button
                    type="button"
                    className={styles.featureRow}
                    aria-label={label}
                    onClick={() => onSelect(feature.id)}
                  >
                    <span className={styles.featureMain}>
                      <strong>{displayName}</strong>
                      <small>
                        {feature.kind === "piste" ? t("mountain.kind.piste") : t("mountain.kind.lift")}
                        {section && <span className={styles.sectionOrdinal}>{section}</span>}
                        {row.unassigned && <span className={styles.sectionOrdinal}>{t("mountain.geometry.unassigned")}</span>}
                      </small>
                    </span>
                    {feature.difficulty ? (
                      <span className={`${styles.difficulty} ${styles[`difficulty_${feature.difficulty}`] ?? ""}`}>
                        {difficultyLabel(feature.difficulty, t)}
                      </span>
                    ) : feature.kind === "piste" ? (
                      <span className={styles.unknown}>{t("mountain.difficultyUnknown")}</span>
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className={styles.empty} role="status">{t("mountain.noResults")}</p>
        )}
      </section>
    </Sheet>
  );
}

function difficultyLabel(value: string, t: ReturnType<typeof useT>): string {
  if (value === "novice") return t("mountain.difficulty.novice");
  if (value === "easy" || value === "beginner") return t("mountain.difficulty.easy");
  if (value === "intermediate") return t("mountain.difficulty.intermediate");
  if (value === "advanced" || value === "expert") return t("mountain.difficulty.advanced");
  if (value === "freeride") return t("mountain.difficulty.freeride");
  return t("mountain.difficultyUnknown");
}

function formatSnapshotDate(value: string, locale: "en" | "de"): string {
  const date = new Date(`${value}T00:00:00Z`);
  return new Intl.DateTimeFormat(locale === "de" ? "de-AT" : "en-GB", { dateStyle: "medium", timeZone: "UTC" }).format(date);
}
