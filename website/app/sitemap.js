import { siteUrl, launchReady } from "../lib/site";
export default function sitemap() { return launchReady ? [{ url: siteUrl, changeFrequency: "weekly", priority: 1 }, { url: `${siteUrl}/kontakt`, changeFrequency: "monthly", priority: .3 }] : []; }
