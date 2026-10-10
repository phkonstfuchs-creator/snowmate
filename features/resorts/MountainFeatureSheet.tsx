"use client";

import Sheet from "@/components/ui/Sheet";
import { useLocale, useT } from "@/lib/i18n/client";
import type { MountainFeature } from "@/features/mountain-data/catalog";
import { formatMountainDuration } from "@/features/mountain-data/duration";
import { MOUNTAIN_SNAPSHOT_DATE } from "@/features/mountain-data/catalog";
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
  return new Intl.DateTimeFormat(locale === "de" ? "de-AT" : "en-GB", {
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
  const osm = osmUrl(feature.id);
  const snapshotDate = formatDate(`${MOUNTAIN_SNAPSHOT_DATE}T00:00:00Z`, locale);

  return (
    <Sheet title={feature.name} subtitle={t(`mountain.kind.${feature.kind}`)} onClose={onClose} className={styles.sheet}>
      <article className={styles.details}>
        <p className={styles.resort}>{feature.resort}</p>

        {feature.kind === "piste" ? (
          <section className={styles.detailCard} aria-label={t("mountain.difficultyLabel")}>
            <span className={styles.detailLabel}>{t("mountain.difficultyLabel")}</span>
            <strong>{feature.difficulty ? difficultyLabel(feature.difficulty, t) : t("mountain.difficultyUnknown")}</strong>
          </section>
        ) : (
          <>
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

function difficultyLabel(value: string, t: ReturnType<typeof useT>): string {
  if (value === "easy" || value === "beginner") return t("mountain.difficulty.easy");
  if (value === "intermediate") return t("mountain.difficulty.intermediate");
  if (value === "advanced" || value === "expert") return t("mountain.difficulty.advanced");
  return t("mountain.difficultyUnknown");
}
