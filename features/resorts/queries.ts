import { WIKI_USER_AGENT, articlesUrl, fileInfoUrl, leadImages, photosFrom, RESORT_ARTICLES, type ResortPhoto } from "./resort-photo";

const WEEK = 60 * 60 * 24 * 7;

/* Resort photos from Wikipedia, cached for a week on the server. No user
   data is sent; on any failure the map keeps its illustrations. */
export async function getResortPhotos(): Promise<Record<string, ResortPhoto>> {
  try {
    const headers = { "User-Agent": WIKI_USER_AGENT, "Api-User-Agent": WIKI_USER_AGENT };
    const articles = await fetch(articlesUrl(Object.values(RESORT_ARTICLES)), {
      headers, next: { revalidate: WEEK }, signal: AbortSignal.timeout(5000),
    });
    if (!articles.ok) return {};
    const images = leadImages(await articles.json());
    const files = [...new Set(Object.values(images))];
    if (files.length === 0) return {};
    const info = await fetch(fileInfoUrl(files), { headers, next: { revalidate: WEEK }, signal: AbortSignal.timeout(5000) });
    if (!info.ok) return {};
    return photosFrom(images, await info.json());
  } catch {
    return {};
  }
}
