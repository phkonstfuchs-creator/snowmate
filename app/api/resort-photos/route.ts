import { getResortPhotos } from "@/features/resorts/queries";
import { RESORT_ARTICLES } from "@/features/resorts/resort-photo";

/* Which resorts have a usable photo, with its credit. Public data only;
   lets the operator check the Wikipedia lookup on the live site. */
export async function GET() {
  const photos = await getResortPhotos();
  const resorts = Object.keys(RESORT_ARTICLES);
  return Response.json(
    {
      found: resorts.filter((name) => photos[name]).map((name) => ({ resort: name, author: photos[name]!.author, license: photos[name]!.license, source: photos[name]!.sourceUrl })),
      missing: resorts.filter((name) => !photos[name]),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
