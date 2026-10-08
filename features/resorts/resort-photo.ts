/* Photos of the resorts: the lead image of each resort's German Wikipedia
   article, used only under a free licence, with the author and licence
   taken from Wikimedia's own file metadata and shown under the picture.
   Nothing about the photos (author, licence) is typed in by hand. */

export interface ResortPhoto {
  src: string;
  width: number;
  height: number;
  author: string;
  license: string;
  licenseUrl: string | null;
  sourceUrl: string;
}

const API = "https://de.wikipedia.org/w/api.php";
/* Wikimedia asks API clients to identify themselves with a contact. */
export const WIKI_USER_AGENT = "Pistl/1.0 (https://pistl.app; support@pistl.app)";

/* German Wikipedia article per resort. A missing or wrong title only
   means no photo: the illustration stays. */
export const RESORT_ARTICLES: Readonly<Record<string, string>> = {
  "Stubai Glacier": "Stubaier Gletscher",
  Nordkette: "Nordkette",
  "Axamer Lizum": "Axamer Lizum",
  "Schlick 2000": "Schlick 2000",
  Kühtai: "Kühtai",
  Glungezer: "Glungezer",
  Patscherkofel: "Patscherkofel",
  Bergeralm: "Bergeralm",
  "Rangger Köpfl": "Rangger Köpfl",
  Hochoetz: "Hochoetz",
  "Mutterer Alm": "Mutterer Alm",
  "Serlesbahnen Mieders": "Serles",
  Sölden: "Sölden",
  "Saalbach-Hinterglemm": "Saalbach-Hinterglemm",
  Flachau: "Flachau",
  Kitzsteinhorn: "Kitzsteinhorn",
  "Zell am See": "Schmittenhöhe",
  Wagrain: "Wagrain",
  "Bad Gastein": "Bad Gastein",
  Hochkönig: "Hochkönig",
};

/* Free licences we may use with attribution. GFDL-only, non-free or
   restricted files are left out. */
const FREE_LICENSE = /^(cc0( 1\.0)?|cc by(-sa)? [1-4]\.0( [a-z]{2,3})?|public domain|pd(-[a-z0-9-]+)?|gemeinfrei)$/iu;

export function isFreeLicense(name: string): boolean {
  return FREE_LICENSE.test(name.trim());
}

const fileKey = (name: string) => name.replace(/^(datei|file|bild|image):/iu, "").replace(/_/gu, " ").trim().toLowerCase();

export function articlesUrl(titles: readonly string[]): string {
  const params = new URLSearchParams({
    action: "query", format: "json", formatversion: "2", redirects: "1",
    prop: "pageimages", piprop: "name", pilicense: "free", titles: titles.join("|"),
  });
  return `${API}?${params.toString()}`;
}

/* All images used in one article, with the data needed to choose and
   credit one: a single request per resort. */
export function articleImagesUrl(article: string): string {
  const params = new URLSearchParams({
    action: "query", format: "json", formatversion: "2", redirects: "1",
    generator: "images", gimlimit: "50", titles: article,
    prop: "imageinfo", iiprop: "url|mime|size|extmetadata", iiurlwidth: "1200",
  });
  return `${API}?${params.toString()}`;
}

export function fileInfoUrl(files: readonly string[]): string {
  const params = new URLSearchParams({
    action: "query", format: "json", formatversion: "2",
    prop: "imageinfo", iiprop: "url|mime|extmetadata", iiurlwidth: "1200",
    titles: files.map((file) => `Datei:${file}`).join("|"),
  });
  return `${API}?${params.toString()}`;
}

interface ArticlesAnswer {
  query?: {
    normalized?: { from: string; to: string }[];
    redirects?: { from: string; to: string }[];
    pages?: { title: string; pageimage?: string; missing?: boolean }[];
  };
}

/* Resort name → file name of its article's lead image. */
export function leadImages(answer: unknown): Record<string, string> {
  const query = (answer as ArticlesAnswer)?.query;
  if (!query?.pages) return {};
  const follow = (title: string) => {
    let current = title;
    for (const step of [query.normalized ?? [], query.redirects ?? []]) {
      current = step.find((entry) => entry.from === current)?.to ?? current;
    }
    return current;
  };
  const result: Record<string, string> = {};
  for (const [resort, article] of Object.entries(RESORT_ARTICLES)) {
    const page = query.pages.find((candidate) => candidate.title === follow(article));
    if (page?.pageimage && !page.missing) result[resort] = page.pageimage;
  }
  return result;
}

interface Meta { value?: unknown }
interface FileAnswer {
  query?: {
    pages?: {
      title: string;
      imageinfo?: {
        thumburl?: string; thumbwidth?: number; thumbheight?: number;
        descriptionurl?: string; mime?: string;
        extmetadata?: Record<string, Meta | undefined>;
      }[];
    }[];
  };
}

const text = (meta: Meta | undefined) => (typeof meta?.value === "string" ? meta.value : "");

/* Wikimedia's author field is HTML; keep the words, drop the markup.
   &amp; is decoded last, so "&amp;quot;" stays the literal "&quot;". */
export function plainText(html: string): string {
  return html
    .replace(/<[^>]*>/gu, " ")
    .replace(/&quot;/gu, '"').replace(/&#0?39;/gu, "'").replace(/&nbsp;/gu, " ")
    .replace(/&(?!amp;)[a-z#0-9]+;/giu, "")
    .replace(/&amp;/gu, "&")
    .replace(/\s+/gu, " ")
    .trim()
    .slice(0, 120);
}

const SAFE_IMAGE = /^https:\/\/upload\.wikimedia\.org\/wikipedia\/[^?#\s]+$/u;
const SAFE_PAGE = /^https:\/\/(commons|de)\.wikimedia\.org\/|^https:\/\/de\.wikipedia\.org\//u;

/* Coats of arms, logos, maps and diagrams are not photos of the slopes. */
const NOT_A_PHOTO = /(wappen|logo|karte|map|lage|plan|panorama-?karte|schema|diagram|flag|signet)/iu;

interface ImageInfo {
  thumburl?: string; thumbwidth?: number; thumbheight?: number;
  width?: number; height?: number;
  descriptionurl?: string; mime?: string;
  extmetadata?: Record<string, Meta | undefined>;
}

function toPhoto(info: ImageInfo | undefined): ResortPhoto | null {
  if (!info?.thumburl || !info.descriptionurl || info.mime !== "image/jpeg") return null;
  const meta = info.extmetadata ?? {};
  const license = text(meta.LicenseShortName);
  if (!isFreeLicense(license) || text(meta.Restrictions).trim() !== "") return null;
  if (!SAFE_IMAGE.test(info.thumburl) || !SAFE_PAGE.test(info.descriptionurl)) return null;
  const licenseUrl = text(meta.LicenseUrl);
  return {
    src: info.thumburl,
    width: info.thumbwidth ?? 1200,
    height: info.thumbheight ?? 800,
    author: plainText(text(meta.Artist)) || plainText(text(meta.Credit)) || "Wikimedia Commons",
    license,
    licenseUrl: /^https?:\/\//u.test(licenseUrl) ? licenseUrl : null,
    sourceUrl: info.descriptionurl,
  };
}

/* From all images of an article: the first wide photo (landscape, at
   least 800 px) under a free licence that is not a logo, map or coat of
   arms. */
export function pickArticlePhoto(answer: unknown): ResortPhoto | null {
  const pages = (answer as FileAnswer)?.query?.pages ?? [];
  for (const page of [...pages].sort((a, b) => a.title.localeCompare(b.title))) {
    if (NOT_A_PHOTO.test(page.title)) continue;
    const info = page.imageinfo?.[0] as ImageInfo | undefined;
    if (!info || (info.width ?? 0) < 800 || (info.width ?? 0) <= (info.height ?? 0)) continue;
    const photo = toPhoto(info);
    if (photo) return photo;
  }
  return null;
}

/* Resort name → photo, only for JPEG photos under a free licence without
   restrictions (logos and maps are SVG/PNG and drop out). */
export function photosFrom(images: Record<string, string>, answer: unknown): Record<string, ResortPhoto> {
  const pages = (answer as FileAnswer)?.query?.pages ?? [];
  const result: Record<string, ResortPhoto> = {};
  for (const [resort, file] of Object.entries(images)) {
    if (NOT_A_PHOTO.test(file)) continue;
    const photo = toPhoto(pages.find((page) => fileKey(page.title) === fileKey(file))?.imageinfo?.[0]);
    if (photo) result[resort] = photo;
  }
  return result;
}
