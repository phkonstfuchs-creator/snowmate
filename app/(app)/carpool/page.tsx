import Link from "next/link";
import { getCarpoolFeed } from "@/features/rides/data";
import { getCurrentProfileContext } from "@/features/profile/data";
import Avatar from "@/components/ui/Avatar";
import ResortScene from "@/components/ResortScene";
export default async function CarpoolPage({
  searchParams,
}: {
  searchParams: Promise<{
    city?: string;
    resort?: string;
  }>;
}) {
  const [query, context] = await Promise.all([
    searchParams,
    getCurrentProfileContext(),
  ]);
  const city =
    query.city === "salzburg" || query.city === "innsbruck"
      ? query.city
      : context.status === "authenticated" && context.profile?.city
        ? context.profile.city
        : "innsbruck";
  const feed = await getCarpoolFeed(city);
  const result =
    feed.status === "ready" && query.resort
      ? {
          status: "ready" as const,
          data: feed.data.filter((post) => post.resort.id === query.resort),
        }
      : feed;
  return (
    <>
      <header
        className="sticky top-0 z-50 px-4 pt-4 pb-3 space-y-3"
        style={{
          background: "var(--paper-0)",
          borderBottom: "var(--rule-heavy)",
        }}
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-black">Mitfahrt</h1>
            <p className="text-xs font-semibold">
              Mitfahren oder jemanden mitnehmen
            </p>
          </div>
          <Link
            href={`/carpool/new?city=${city}`}
            className="px-4 py-3 font-black text-sm"
            style={{
              background: "var(--accent-primary)",
              color: "var(--text-on-accent)",
            }}
          >
            + Inserat
          </Link>
        </div>

        <nav aria-label="Region" className="flex gap-3">
          {(["innsbruck", "salzburg"] as const).map((region) => (
            <Link
              key={region}
              href={`/carpool?city=${region}`}
              aria-current={region === city ? "page" : undefined}
              className="flex-1 text-center py-2 font-bold"
              style={{
                background:
                  region === city
                    ? "var(--accent-primary-subtle)"
                    : "var(--bg-surface-1)",
              }}
            >
              {region === "innsbruck" ? "Innsbruck" : "Salzburg"}
            </Link>
          ))}
        </nav>
      </header>

      <div className="px-4 py-5 space-y-6">
        {result.status === "unavailable" ? (
          <div role="alert">
            <p className="font-bold">
              Mitfahrten konnten nicht geladen werden.
            </p>
            <Link href={`/carpool?city=${city}`} className="underline">
              Erneut laden
            </Link>
          </div>
        ) : result.data.length === 0 ? (
          <div className="py-14 text-center">
            <h2 className="font-black text-lg">Noch keine Mitfahrten</h2>
            <p className="text-sm mt-2">
              Biete eine Fahrt an oder suche einen Platz in deiner Crew.
            </p>
          </div>
        ) : (
          (["driver", "rider"] as const).map((role) => {
            const posts = result.data.filter((post) => post.role === role);
            return (
              posts.length > 0 && (
                <section key={role}>
                  <h2 className="font-black text-xs uppercase mb-3">
                    {role === "driver" ? "Fahrtangebote" : "Sucht Mitfahrt"} ·
                    {posts.length}
                  </h2>
                  <div className="space-y-3">
                    {posts.map((post) => (
                      <article
                        key={post.id}
                        style={{
                          background: "var(--bg-surface-1)",
                          border: "1px solid var(--border-subtle)",
                        }}
                      >
                        <div className="relative h-20 overflow-hidden">
                          <ResortScene
                            name={post.resort.name}
                            className="absolute inset-0 w-full h-full"
                          />
                          <div
                            className="absolute inset-0"
                            style={{ background: "rgba(0,0,0,.55)" }}
                          />
                          <div className="absolute inset-0 flex items-center px-4 gap-3 text-white">
                            <Avatar
                              id={post.host.id}
                              initials={post.host.displayName
                                .slice(0, 2)
                                .toUpperCase()}
                              size={40}
                            />
                            <div>
                              <p className="font-black">
                                {post.host.displayName}
                              </p>
                              <p className="text-sm">{post.resort.name}</p>
                            </div>
                          </div>
                        </div>

                        <div className="p-4 space-y-2">
                          <p className="text-sm font-bold">
                            {new Date(post.departsAt).toLocaleString("de-AT", {
                              timeZone: "Europe/Vienna",
                              dateStyle: "medium",
                              timeStyle: "short",
                            })}
                          </p>
                          <p className="text-xs">
                            {role === "driver"
                              ? `${post.availableSeats} von ${post.seatCapacity} Plätzen frei`
                              : "Sucht einen Platz"}{" "}
                            ·
                            {post.audience === "friends"
                              ? "Freunde"
                              : "Freunde & deren Freunde"}
                          </p>
                          {post.note && <p className="text-sm">{post.note}</p>}
                          <Link
                            href={`/carpool/${post.id}`}
                            className="block text-center py-3 font-black text-sm"
                            style={{
                              background: "var(--accent-primary)",
                              color: "var(--text-on-accent)",
                            }}
                          >
                            Details & Anfragen
                          </Link>
                        </div>
                      </article>
                    ))}
                  </div>
                </section>
              )
            );
          })
        )}
      </div>
    </>
  );
}
