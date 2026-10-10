"use client";

import { useMemo, useState } from "react";
import Sheet from "@/components/ui/Sheet";
import { useLocale, useT } from "@/lib/i18n/client";
import { mountainFeatures, MOUNTAIN_SNAPSHOT_DATE } from "@/features/mountain-data/catalog";
import type { MountainFeature } from "@/features/mountain-data/catalog";
import styles from "./mountain-features.module.css";

type Filter = "all" | MountainFeature["kind"];

export default function MountainFeatureExplorer({
  onSelect,
  onClose,
}: {
  onSelect: (id: string) => void;
  onClose: () => void;
}) {
  const t = useT();
  const locale = useLocale();
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const features = useMemo(() => mountainFeatures.filter((feature) => {
    if (filter !== "all" && feature.kind !== filter) return false;
    if (!normalizedQuery) return true;
    return `${feature.name} ${feature.id}`.toLocaleLowerCase().includes(normalizedQuery);
  }), [filter, normalizedQuery]);
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
        {features.length > 0 ? (
          <ul className={styles.featureList}>
            {features.map((feature) => {
              const nameTotal = nameTotals.get(feature.name) ?? 1;
              const nameOrdinal = nameOrdinals.get(feature.id) ?? 1;
              const section = nameTotal > 1 ? t("mountain.sectionOrdinal", { index: nameOrdinal, total: nameTotal }) : null;
              return (
                <li key={feature.id}>
                  <button
                    type="button"
                    className={styles.featureRow}
                    aria-label={section ? `${feature.name}, ${section}` : feature.name}
                    onClick={() => onSelect(feature.id)}
                  >
                    <span className={styles.featureMain}>
                      <strong>{feature.name}</strong>
                      <small>
                        {feature.kind === "piste" ? t("mountain.kind.piste") : t("mountain.kind.lift")}
                        {section && <span className={styles.sectionOrdinal}>{section}</span>}
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
  if (value === "easy" || value === "beginner") return t("mountain.difficulty.easy");
  if (value === "intermediate") return t("mountain.difficulty.intermediate");
  if (value === "advanced" || value === "expert") return t("mountain.difficulty.advanced");
  return t("mountain.difficultyUnknown");
}

function formatSnapshotDate(value: string, locale: "en" | "de"): string {
  const date = new Date(`${value}T00:00:00Z`);
  return new Intl.DateTimeFormat(locale === "de" ? "de-AT" : "en-GB", { dateStyle: "medium", timeZone: "UTC" }).format(date);
}
