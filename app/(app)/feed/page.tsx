import Link from "next/link";
import { getCurrentProfileContext } from "@/features/profile/data";
import { getRideFeed } from "@/features/rides/data";
import type { City } from "@/lib/types";
import PenguinMascot from "@/components/PenguinMascot";
import GoOverview from "@/features/go/GoOverview";
import { getOwnGoInterests } from "@/features/go/data";
export default async function FeedPage({
  searchParams,
}: {
  searchParams: Promise<{
    city?: string;
  }>;
}) {
  const [query, context] = await Promise.all([
    searchParams,
    getCurrentProfileContext(),
  ]);
  const city: City =
    query.city === "salzburg" || query.city === "innsbruck"
      ? query.city
      : context.status === "authenticated"
        ? (context.profile?.city ?? "innsbruck")
        : "innsbruck";
  const [result, interests] = await Promise.all([
    getRideFeed(city),
    getOwnGoInterests(),
  ]);
  return (
    <>
      <header
        className="sticky top-0 z-40 px-4 pt-4 pb-3 space-y-4"
        style={{
          background: "var(--paper-0)",
          borderBottom: "var(--rule-heavy)",
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PenguinMascot size={28} />
            <h1 className="text-mono-label">Pistl</h1>
          </div>
          <Link
            href={`/feed/new?city=${city}`}
            className="card-tap px-3 py-2 text-mono-label"
            style={{ background: "var(--rust)", color: "var(--paper-0)" }}
          >
            Ausfahrt posten
          </Link>
        </div>
        <nav aria-label="Region" className="flex gap-3">
          {(["innsbruck", "salzburg"] as const).map((value) => (
            <Link
              key={value}
              href={`/feed?city=${value}`}
              aria-current={city === value ? "page" : undefined}
              className="px-3 py-2 font-bold"
              style={{
                border: "var(--rule-thin)",
                background: city === value ? "var(--paper-2)" : "transparent",
              }}
            >
              {value === "innsbruck" ? "Innsbruck" : "Salzburg"}
            </Link>
          ))}
        </nav>
      </header>
      <GoOverview result={interests} />
      <section className="p-4 space-y-3" aria-label="Ausfahrten">
        {result.status === "unavailable" ? (
          <div
            role="alert"
            className="p-4"
            style={{ border: "var(--rule-thin)" }}
          >
            <h2 className="font-bold">Ausfahrten gerade nicht verfügbar</h2>
            <p className="text-sm mt-2">
              Wir können deine Ausfahrten gerade nicht laden. Bitte versuche es
              erneut.
            </p>
            <Link href={`/feed?city=${city}`} className="underline">
              Erneut laden
            </Link>
          </div>
        ) : result.data.length === 0 ? (
          <div className="py-12 text-center">
            <h2 className="font-bold">Noch keine sichtbare Ausfahrt</h2>
            <p className="text-sm mt-2">
              Plane einen Tag mit deiner Crew und lade sie ein.
            </p>
          </div>
        ) : (
          result.data.map((ride) => (
            <Link
              key={ride.id}
              href={`/feed/${ride.id}`}
              className="block p-4 space-y-2 card-tap"
              style={{
                border: "var(--rule-thin)",
                background: "var(--paper-0)",
                boxShadow: "var(--shadow-print)",
              }}
            >
              <p className="text-mono-label">
                {ride.host.displayName} ·{" "}
                {ride.abilityLevel === "off-piste"
                  ? "Off-Piste"
                  : ride.abilityLevel === "park"
                    ? "Park"
                    : "Chill"}
              </p>
              <h2 className="text-xl font-bold">{ride.resort.name}</h2>
              <p className="text-sm">
                {new Intl.DateTimeFormat("de-DE", {
                  dateStyle: "medium",
                  timeStyle: "short",
                  timeZone: "Europe/Berlin",
                }).format(new Date(ride.startsAt))}
              </p>
              <p className="text-sm">
                {ride.takenSpots} / {ride.capacity} bestätigt ·{" "}
                {ride.status === "cancelled"
                  ? "Abgesagt"
                  : ride.status === "completed"
                    ? "Abgeschlossen"
                    : ride.status === "active"
                      ? "Aktiv"
                      : "Geplant"}
              </p>
              {ride.caption && <p className="text-sm">{ride.caption}</p>}
              <p className="font-bold text-sm">Details und Teilnahme →</p>
            </Link>
          ))
        )}
      </section>
    </>
  );
}
