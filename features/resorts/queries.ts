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
  if (!response.ok) throw new Error(`wikipedia ${response.status}`);
  return response.json();
}

/* Resort photos from Wikipedia, cached for a week on the server. First the
   article's lead image; where that is a logo or coat of arms, the first
   suitable photo among the article's images. No user data is sent; on
   any failure the map keeps its illustrations. */
export async function getResortPhotos(): Promise<Record<string, ResortPhoto>> {
  let lead: Record<string, ResortPhoto> = {};
  try {
    const images = leadImages(await getJson(articlesUrl(Object.values(RESORT_ARTICLES))));
    const files = [...new Set(Object.values(images))];
    if (files.length > 0) lead = photosFrom(images, await getJson(fileInfoUrl(files)));
  } catch {
    lead = {};
  }

  const missing = Object.entries(RESORT_ARTICLES).filter(([resort]) => !lead[resort]);
  const found = await Promise.all(
    missing.map(async ([resort, article]) => {
      try {
        return [resort, pickArticlePhoto(await getJson(articleImagesUrl(article)))] as const;
      } catch {
        return [resort, null] as const;
      }
    }),
  );
  const result = { ...lead };
  for (const [resort, photo] of found) if (photo) result[resort] = photo;
  return result;
}
