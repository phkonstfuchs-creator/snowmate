import { siteUrl, launchReady } from "../lib/site";
export default function robots() { return { rules: { userAgent: "*", ...(launchReady ? { allow: "/", disallow: "/api/" } : { disallow: "/" }) }, ...(launchReady ? { sitemap: `${siteUrl}/sitemap.xml` } : {}) }; }
