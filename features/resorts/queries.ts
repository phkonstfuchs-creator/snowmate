import {
  RESORT_ARTICLES,
  WIKI_USER_AGENT,
  articleImagesUrl,
  articlesUrl,
  fileInfoUrl,
  leadImages,
  photosFrom,
  pickArticlePhoto,
  type ResortPhoto,
} from "./resort-photo";

const WEEK = 60 * 60 * 24 * 7;
const headers = { "User-Agent": WIKI_USER_AGENT, "Api-User-Agent": WIKI_USER_AGENT };

async function getJson(url: string): Promise<unknown> {
  const response = await fetch(url, { headers, next: { revalidate: WEEK }, signal: AbortSignal.timeout(6000) });
  if (!response.ok) throw new Error(`HTTP ${response.status} ${response.statusText}`.trim());
  const body = (await response.json()) as { error?: { code?: string; info?: string } };
  if (body?.error) throw new Error(`API ${body.error.code ?? ""}: ${body.error.info ?? ""}`.trim());
  return body;
}

const describe = (error: unknown) => (error instanceof Error ? `${error.name}: ${error.message}` : String(error)).slice(0, 200);

/* Resort photos from Wikipedia, cached for a week on the server. First the
   article's lead image; where that is a logo or coat of arms, the first
   suitable photo among the article's images. No user data is sent; on
   any failure the map keeps its illustrations. */
export async function getResortPhotos(): Promise<Record<string, ResortPhoto>> {
  return (await getResortPhotosWithReport()).photos;
}

/* The same lookup, plus what went wrong where (for /api/resort-photos). */
export async function getResortPhotosWithReport(): Promise<{ photos: Record<string, ResortPhoto>; problems: string[] }> {
  const problems: string[] = [];
  let lead: Record<string, ResortPhoto> = {};
  try {
    const images = leadImages(await getJson(articlesUrl(Object.values(RESORT_ARTICLES))));
    problems.push(`lead images: ${Object.keys(images).length}`);
    const files = [...new Set(Object.values(images))];
    if (files.length > 0) lead = photosFrom(images, await getJson(fileInfoUrl(files)));
  } catch (error) {
    problems.push(`lead lookup failed: ${describe(error)}`);
    lead = {};
  }

  const missing = Object.entries(RESORT_ARTICLES).filter(([resort]) => !lead[resort]);
  const found = await Promise.all(
    missing.map(async ([resort, article]) => {
      try {
        const photo = pickArticlePhoto(await getJson(articleImagesUrl(article)));
        if (!photo) problems.push(`${resort}: no suitable free photo in "${article}"`);
        return [resort, photo] as const;
      } catch (error) {
        problems.push(`${resort}: ${describe(error)}`);
        return [resort, null] as const;
      }
    }),
  );
  const photos = { ...lead };
  for (const [resort, photo] of found) if (photo) photos[resort] = photo;
  return { photos, problems };
}
