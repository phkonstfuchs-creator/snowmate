import Link from "next/link";
import { getCurrentProfileContext } from "@/features/profile/data";
import { getRideResortCatalog } from "@/features/rides/RideCatalog";
import CarpoolForm from "@/features/rides/CarpoolForm";
export default async function NewCarpoolPage({
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
  const city =
    query.city === "salzburg" || query.city === "innsbruck"
      ? query.city
      : context.status === "authenticated" && context.profile?.city
        ? context.profile.city
        : "innsbruck";
  const catalog = await getRideResortCatalog(city);
  return (
    <div className="p-5 space-y-5">
      <Link href={`/carpool?city=${city}`} className="font-bold underline">
        ← Mitfahrten
      </Link>
      <h1 className="font-display text-2xl font-black">
        Mitfahrt veröffentlichen
      </h1>
      <p className="text-sm">
        Region:
        {city === "innsbruck" ? "Innsbruck" : "Salzburg"}
      </p>
      {catalog.status === "unavailable" ? (
        <p role="alert">
          Skigebiete konnten nicht geladen werden.
          <Link href={`/carpool/new?city=${city}`} className="underline">
            Erneut laden
          </Link>
        </p>
      ) : catalog.data.length === 0 ? (
        <p role="status">
          Für diese Region sind noch keine Skigebiete verfügbar.
        </p>
      ) : (
        <CarpoolForm city={city} resorts={catalog.data} />
      )}
    </div>
  );
}
