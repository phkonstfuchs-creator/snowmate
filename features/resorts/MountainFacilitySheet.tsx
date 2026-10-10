"use client";

import Sheet from "@/components/ui/Sheet";
import { useLocale, useT } from "@/lib/i18n/client";
import type { MountainFacility } from "@/features/mountain-data/facilities";
import styles from "./mountain-features.module.css";

function osmWayUrl(id: string | null): string | null {
  if (!id) return null;
  const match = /^way\/([1-9]\d*)$/u.exec(id);
  if (!match || !Number.isSafeInteger(Number(match[1]))) return null;
  return `https://www.openstreetmap.org/way/${match[1]}`;
}

function formatDate(value: string, locale: "en" | "de"): string | null {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat(locale === "de" ? "de-DE" : "en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function formatMinutes(minutes: number, locale: "en" | "de"): string {
  const value = new Intl.NumberFormat(locale === "de" ? "de-AT" : "en-GB", { maximumFractionDigits: 1 }).format(minutes);
  return locale === "de" ? `${value} Min.` : `${value} min`;
}

export default function MountainFacilitySheet({
  facility,
  onClose,
  onBrowse,
}: {
  facility: MountainFacility;
  onClose: () => void;
  onBrowse?: () => void;
}) {
  const t = useT();
  const locale = useLocale();
  const checkedDate = formatDate(facility.checkedAt, locale);
  const candidateOsm = facility.geometry.status === "candidate" ? osmWayUrl(facility.geometry.featureId) : null;

  return (
    <Sheet title={facility.name} subtitle={facility.resort} onClose={onClose} className={styles.sheet}>
      <article className={styles.details}>
        <section className={styles.detailCard} aria-label={t("mountain.geometry.label")}>
          <span className={styles.detailLabel}>{t("mountain.geometry.label")}</span>
          <strong>{t(`mountain.geometry.${facility.geometry.status}`)}</strong>
          {candidateOsm && (
            <a href={candidateOsm} target="_blank" rel="noopener noreferrer" className={styles.sourceLink}>
              {t("mountain.candidateOsm", { id: facility.geometry.featureId?.replace(/^way\//u, "") ?? "" })}
            </a>
          )}
        </section>

        <section className={styles.detailCard} aria-label={t("mountain.operatorFacts")}>
          <span className={styles.detailLabel}>{t("mountain.operatorFacts")}</span>
          {facility.rideTime?.kind === "minimum" && (
            <strong>{t("mountain.rideTime.minimum", { duration: formatMinutes(facility.rideTime.minutes, locale) })}</strong>
          )}
          {facility.rideTime?.kind === "approximate" && (
            <strong>{t("mountain.rideTime.approximate", { duration: formatMinutes(facility.rideTime.minutes, locale) })}</strong>
          )}
          {facility.rideTime?.kind === "conflicting" && (
            <>
              <strong>{facility.rideTime.values.map((value) => formatMinutes(value, locale)).join(" · ")}</strong>
              <p>{t("mountain.rideTime.conflicting")}</p>
            </>
          )}
          {!facility.rideTime && <strong>{t("mountain.rideTime.unavailable")}</strong>}
          {facility.rideTime && (facility.rideTime.kind === "minimum" || facility.rideTime.kind === "approximate") && (
            <a href={facility.rideTime.sourceUrl} target="_blank" rel="noopener noreferrer" className={styles.sourceLink}>
              {t("mountain.rideTime.source")}
            </a>
          )}
          {facility.rideTime?.kind === "conflicting" && facility.rideTime.sourceUrls.map((url) => (
            <a key={url} href={url} target="_blank" rel="noopener noreferrer" className={styles.sourceLink}>
              {t("mountain.rideTime.source")}
            </a>
          ))}
        </section>

        {facility.departureInterval && (
          <section className={styles.detailCard} aria-label={t("mountain.timetable")}>
            <span className={styles.detailLabel}>{t("mountain.timetable")}</span>
            <strong>{t("mountain.departureNote", { minutes: facility.departureInterval.minutes })}</strong>
            <a href={facility.departureInterval.sourceUrl} target="_blank" rel="noopener noreferrer" className={styles.sourceLink}>
              {t("mountain.timetable.source")}
            </a>
          </section>
        )}

        <p className={styles.unknownStatus}>{t("mountain.statusUnknown")}</p>
        <p className={styles.unknownStatus}>{t("mountain.queueUnknown")}</p>

        <section className={styles.sourceCard} aria-label={t("mountain.operatorSource")}>
          <strong>{t("mountain.operatorSource")}</strong>
          <p>{checkedDate ? t("mountain.inventoryChecked", { date: checkedDate }) : t("mountain.inventoryDateUnknown")}</p>
          <a href={facility.sourceUrl} target="_blank" rel="noopener noreferrer" className={styles.sourceLink}>
            {t("mountain.inventorySourceLink")}
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
