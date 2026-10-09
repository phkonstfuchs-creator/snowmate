"use client";
import { useT } from "@/lib/i18n/client";
import type { GoOverviewResult } from "./go-status";
export default function GoOverview({
  result,
  onOpen,
  onRetry,
}: {
  result: GoOverviewResult;
  onOpen: (rideId: string) => void;
  onRetry: () => void;
}) {
  const t = useT();
  if (result.status === "ok" && result.interests.length === 0) return null;
  return (
    <section className="px-5 pb-4" aria-label={t("go.overview")}>
      <h2 className="font-display text-xl">{t("go.overview")}</h2>
      {result.status === "unavailable" ? (
        <>
          <p role="alert">{t("go.unavailable")}</p>
          <button
            type="button"
            onClick={onRetry}
            className="min-h-11 underline"
          >
            {t("go.retry")}
          </button>
        </>
      ) : (
        result.interests.map(({ ride, go }) => (
          <article
            key={ride.id}
            className="mt-3 border p-3"
            style={{ borderColor: "var(--border-subtle)" }}
          >
            <h3 className="font-bold">{ride.resort}</h3>
            <p>
              {ride.rideDate} · {ride.meetTime.slice(0, 5)}
            </p>
            <p>
              {t("go.group", { n: go.confirmedGroup, min: go.minimumGroup })}
            </p>
            {go.needsCarpool && (
              <p>
                {t(go.hasConfirmedCarpool ? "go.seatReady" : "go.missingSeat")}
              </p>
            )}
            <p
              role={go.status === "confirmed" && !go.ready ? "alert" : "status"}
            >
              {t(
                go.status === "confirmed" && !go.ready
                  ? "go.lost"
                  : go.status === "confirmed"
                    ? "go.confirmed"
                    : go.status === "requested"
                      ? "go.pending"
                      : go.ready
                        ? "go.ready"
                        : "go.waiting",
              )}
            </p>
            <button
              type="button"
              onClick={() => onOpen(ride.id)}
              aria-label={t("go.open", { resort: ride.resort })}
              className="min-h-11 font-semibold underline"
            >
              {t("ride.details")}
            </button>
          </article>
        ))
      )}
    </section>
  );
}
