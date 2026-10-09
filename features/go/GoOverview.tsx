import Link from "next/link";
import type { DataResult } from "@/features/rides/data";
import type { GoInterestSummary, GoStatus } from "./dto";

function summary(go: GoStatus): string {
  if (go.status === "confirmed") {
    return go.ready
      ? "Teilnahme bestätigt. Deine Bedingungen sind erfüllt."
      : "Teilnahme bestätigt, aber eine Bedingung ist wieder offen.";
  }
  if (go.status === "requested") {
    return "Teilnahme angefragt; die Bestätigung des Gastgebers steht aus.";
  }
  if (go.status === "expired") return "Dein Interesse ist abgelaufen.";
  if (go.status === "withdrawn") return "Deine Bedingungen sind zurückgezogen.";
  return go.ready
    ? "Deine Bedingungen sind erfüllt. Frage deine Teilnahme selbst an."
    : "Deine Bedingungen sind noch offen.";
}

function nextStep(go: GoStatus): string {
  if (go.status === "confirmed" && !go.ready) return "Teilnahme prüfen";
  if (go.status === "ready" && go.ready) return "Teilnahme anfragen";
  if (
    go.status === "interested" &&
    go.needsCarpool &&
    !go.hasConfirmedCarpool
  ) {
    return "Mitfahrt klären";
  }
  return "Bedingungen ansehen";
}

const dateFormat = new Intl.DateTimeFormat("de-AT", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Vienna",
});

export default function GoOverview({
  result,
}: {
  result: DataResult<readonly GoInterestSummary[]>;
}) {
  if (result.status === "ready" && result.data.length === 0) return null;
  return (
    <section className="p-4 space-y-3" aria-label="Deine Pistl-Go-Pläne">
      <h2 className="text-xl font-bold">Deine Pistl-Go-Pläne</h2>
      {result.status === "unavailable" ? (
        <div className="space-y-2">
          <p role="alert">
            Deine Pistl-Go-Bedingungen sind gerade nicht verfügbar.
          </p>
          <Link href="/feed" className="underline">
            Bedingungen erneut laden
          </Link>
        </div>
      ) : (
        result.data.map(({ ride, go }) => (
          <article
            key={go.id}
            className="p-4 space-y-2"
            style={{
              border: "var(--rule-thin)",
              background: "var(--paper-0)",
              boxShadow: "var(--shadow-print)",
            }}
          >
            <h3 className="text-lg font-bold">{ride.resort.name}</h3>
            <time className="block text-sm" dateTime={ride.startsAt}>
              {dateFormat.format(new Date(ride.startsAt))}
            </time>
            <p
              className="font-bold text-sm"
              role={
                go.status === "confirmed" && !go.ready ? "alert" : undefined
              }
            >
              {summary(go)}
            </p>
            <p className="text-sm">
              {go.confirmedGroup} bereits bestätigt · Mindestgruppe{" "}
              {go.minimumGroup} inklusive dir.
            </p>
            {!go.groupReady && (
              <p className="text-sm">
                Es fehlen noch bestätigte Personen für deine Mindestgruppe.
              </p>
            )}
            {go.needsCarpool && (
              <p className="text-sm">
                {go.hasConfirmedCarpool
                  ? "Dein Mitfahrplatz ist bestätigt."
                  : "Dein bestätigter Mitfahrplatz fehlt noch."}
              </p>
            )}
            {go.status === "requested" && !go.ready && (
              <p role="alert" className="text-sm">
                Eine Bedingung ist wieder offen. Prüfe deine Anfrage und
                Mitfahrt.
              </p>
            )}
            <Link
              href={`/feed/${ride.id}`}
              className="block underline font-bold text-sm"
              aria-label={`${nextStep(go)}: ${ride.resort.name}`}
            >
              {nextStep(go)}
            </Link>
          </article>
        ))
      )}
    </section>
  );
}
