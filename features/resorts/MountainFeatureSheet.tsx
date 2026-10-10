"use client";

import Sheet from "@/components/ui/Sheet";
import { useLocale, useT } from "@/lib/i18n/client";
import type { MountainFeature } from "@/features/mountain-data/catalog";
import { formatMountainDuration } from "@/features/mountain-data/duration";
import { MOUNTAIN_SNAPSHOT_DATE } from "@/features/mountain-data/catalog";
import { mountainFacilityForFeature } from "@/features/mountain-data/facilities";
import styles from "./mountain-features.module.css";

function osmUrl(id: string): string | null {
  const match = /^way\/([1-9]\d*)$/u.exec(id);
  if (!match || !Number.isSafeInteger(Number(match[1]))) return null;
  return `https://www.openstreetmap.org/way/${match[1]}`;
}

function formatDate(value: string | null | undefined, locale: "en" | "de"): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat(locale === "de" ? "de-DE" : "en-GB", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(date);
}

export default function MountainFeatureSheet({
  feature,
  onClose,
  onBrowse,
}: {
  feature: MountainFeature;
  onClose: () => void;
  onBrowse?: () => void;
}) {
  const t = useT();
  const locale = useLocale();
  const sourceDate = formatDate(feature.osmTimestamp, locale);
  const duration = feature.kind === "lift" ? formatMountainDuration(feature.duration, locale) : null;
  const facility = feature.kind === "lift" ? mountainFacilityForFeature(feature.id) : null;
  const osm = osmUrl(feature.id);
  const snapshotDate = formatDate(`${MOUNTAIN_SNAPSHOT_DATE}T00:00:00Z`, locale);
  const operatorCheckedDate = facility ? formatDate(facility.checkedAt, locale) : null;

  return (
    <Sheet title={facility?.name ?? feature.name} subtitle={t(`mountain.kind.${feature.kind}`)} onClose={onClose} className={styles.sheet}>
      <article className={styles.details}>
        <p className={styles.resort}>{feature.resort}</p>

        {feature.kind === "piste" ? (
          <section className={styles.detailCard} aria-label={t("mountain.difficultyLabel")}>
            <span className={styles.detailLabel}>{t("mountain.difficultyLabel")}</span>
            <strong>{feature.difficulty ? difficultyLabel(feature.difficulty, t) : t("mountain.difficultyUnknown")}</strong>
          </section>
        ) : (
          <>
            {facility?.rideTime && (
              <section className={styles.detailCard}>
                <span className={styles.detailLabel}>{t("mountain.operatorRideTime")}</span>
                {facility.rideTime.kind === "minimum" && (
                  <strong>{t("mountain.rideTime.minimum", { duration: formatFacilityMinutes(facility.rideTime.minutes, locale) })}</strong>
                )}
                {facility.rideTime.kind === "approximate" && (
                  <strong>{t("mountain.rideTime.approximate", { duration: formatFacilityMinutes(facility.rideTime.minutes, locale) })}</strong>
                )}
                {facility.rideTime.kind === "conflicting" && (
                  <>
                    <strong>{facility.rideTime.values.map((value) => formatFacilityMinutes(value, locale)).join(" · ")}</strong>
                    <small>{t("mountain.rideTime.conflicting")}</small>
                  </>
                )}
                {facility.rideTime.kind !== "conflicting" && (
                  <a href={facility.rideTime.sourceUrl} target="_blank" rel="noopener noreferrer" className={styles.sourceLink}>
                    {t("mountain.rideTime.source")}
                  </a>
                )}
              </section>
            )}
            {facility?.departureInterval && (
              <section className={styles.detailCard}>
                <span className={styles.detailLabel}>{t("mountain.timetable")}</span>
                <strong>{t("mountain.departureNote", { minutes: facility.departureInterval.minutes })}</strong>
                <a href={facility.departureInterval.sourceUrl} target="_blank" rel="noopener noreferrer" className={styles.sourceLink}>
                  {t("mountain.timetable.source")}
                </a>
              </section>
            )}
            {duration && (
              <section className={styles.detailCard}>
                <span className={styles.detailLabel}>{t("mountain.durationLabel")}</span>
                <strong>{duration}</strong>
                <small>{t("mountain.durationCaveat")}</small>
              </section>
            )}
            <p className={styles.unknownStatus}>{t("mountain.queueUnknown")}</p>
          </>
        )}

        <p className={styles.unknownStatus}>{t("mountain.statusUnknown")}</p>

        <section className={styles.sourceCard} aria-label={t("mountain.sourceTitle")}>
          <strong>{t("mountain.sourceTitle")}</strong>
          <p>{t("mountain.snapshotDetail", { date: snapshotDate ?? MOUNTAIN_SNAPSHOT_DATE })}</p>
          {facility && operatorCheckedDate && (
            <p>{t("mountain.operatorChecked", { date: operatorCheckedDate })}</p>
          )}
          {facility && facility.name !== feature.name && <p>{t("mountain.osmFeatureName", { name: feature.name })}</p>}
          <p>{sourceDate
            ? t("mountain.osmRevision", { version: feature.osmVersion ?? t("mountain.versionUnknown"), date: sourceDate })
            : t("mountain.osmRevisionUnknown")}</p>
          {osm && (
            <a href={osm} target="_blank" rel="noopener noreferrer" className={styles.sourceLink}>
              {t("mountain.osmLink")}
            </a>
          )}
          <a
            href={locale === "de" ? "https://nordkette.com/lifte-pisten/" : "https://nordkette.com/en/lifts-slopes/"}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.sourceLink}
          >
            {t("mountain.officialStatus")}
          </a>
          <a
            href={locale === "de" ? "https://nordkette.com/cams/" : "https://nordkette.com/en/cams/"}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.sourceLink}
          >
            {t("mountain.webcams")}
          </a>
        </section>

        {onBrowse && (
          <button type="button" className={styles.browseButton} onClick={onBrowse}>
            {t("mountain.browse")}
          </button>
        )}
      </article>
    </Sheet>
  );
}

function formatFacilityMinutes(minutes: number, locale: "en" | "de"): string {
  const value = new Intl.NumberFormat(locale === "de" ? "de-AT" : "en-GB", { maximumFractionDigits: 1 }).format(minutes);
  return locale === "de" ? `${value} Min.` : `${value} min`;
}

function difficultyLabel(value: string, t: ReturnType<typeof useT>): string {
  if (value === "novice") return t("mountain.difficulty.novice");
  if (value === "easy" || value === "beginner") return t("mountain.difficulty.easy");
  if (value === "intermediate") return t("mountain.difficulty.intermediate");
  if (value === "advanced" || value === "expert") return t("mountain.difficulty.advanced");
  if (value === "freeride") return t("mountain.difficulty.freeride");
  return t("mountain.difficultyUnknown");
}
