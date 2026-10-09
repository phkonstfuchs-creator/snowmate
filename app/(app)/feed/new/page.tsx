import Link from "next/link";
import { getCurrentProfileContext } from "@/features/profile/data";
import { getRideResortCatalog } from "@/features/rides/RideCatalog";
import RideCreateForm from "@/features/rides/RideCreateForm";
export default async function NewRidePage({
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
      : context.status === "authenticated"
        ? (context.profile?.city ?? "innsbruck")
        : "innsbruck";
  const catalog = await getRideResortCatalog(city);
  return (
    <div className="p-4 space-y-5">
      <Link href={`/feed?city=${city}`} className="underline">
        ← Ausfahrten
      </Link>
      <h1 className="text-2xl font-bold">Plane deine Ausfahrt</h1>
      {catalog.status === "ready" && catalog.data.length > 0 ? (
        <RideCreateForm resorts={catalog.data} />
      ) : (
        <p role="alert">
          Skigebiete gerade nicht verfügbar. Bitte versuche es später erneut.
        </p>
      )}
    </div>
  );
}
