import { z } from "zod";

const safeUrlSchema = z
  .string()
  .trim()
  .url()
  .refine((value) => {
    /* Zod runs this even when .url() already failed, so a malformed or
       empty value must not throw here: it would replace the readable
       "which variable is wrong" error with a bare "Invalid URL". */
    let url: URL;
    try {
      url = new URL(value);
    } catch {
      return false;
    }
    const isLocal =
      url.hostname === "localhost" || url.hostname === "127.0.0.1";

    return url.protocol === "https:" || (isLocal && url.protocol === "http:");
  }, "Use HTTPS outside local development.");

const publicConfigSchema = z.object({
  url: safeUrlSchema,
  publishableKey: z
    .string()
    .trim()
    .min(1)
    .refine(
      (value) =>
        value.startsWith("sb_publishable_") || value.startsWith("eyJ"),
      "Use a publishable or legacy anon key, never a secret key.",
    ),
  siteUrl: safeUrlSchema,
});

export type SupabasePublicConfig = z.infer<typeof publicConfigSchema>;

export function parseSupabasePublicConfig(input: {
  url?: string;
  publishableKey?: string;
  siteUrl?: string;
}): SupabasePublicConfig {
  const result = publicConfigSchema.safeParse(input);

  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");

    throw new Error(
      `Supabase public configuration is invalid: ${details}. ` +
        "Check NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY and NEXT_PUBLIC_SITE_URL in .env.local (see .env.example) and restart the dev server.",
    );
  }

  return result.data;
}

export function getSupabasePublicConfig(): SupabasePublicConfig {
  return parseSupabasePublicConfig({
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    publishableKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL,
  });
}

/* Where links in auth emails point. A deployment whose
   NEXT_PUBLIC_SITE_URL still says localhost (copied from .env.local)
   would send every confirmation link to the reader's own machine; on
   Vercel the production domain is known at runtime, so that wins. */
export function resolveSiteUrl(
  configured: string,
  env: { VERCEL_ENV?: string; VERCEL_PROJECT_PRODUCTION_URL?: string; VERCEL_URL?: string },
): string {
  let isLocal = false;
  try {
    const host = new URL(configured).hostname;
    isLocal = host === "localhost" || host === "127.0.0.1";
  } catch {
    isLocal = true;
  }
  if (!isLocal) return configured;

  const host = env.VERCEL_ENV === "production" ? env.VERCEL_PROJECT_PRODUCTION_URL : env.VERCEL_URL;
  return host && /^[a-z0-9.-]+$/i.test(host) ? `https://${host}` : configured;
}

export function getSiteUrl(): string {
  return resolveSiteUrl(getSupabasePublicConfig().siteUrl, {
    VERCEL_ENV: process.env.VERCEL_ENV,
    VERCEL_PROJECT_PRODUCTION_URL: process.env.VERCEL_PROJECT_PRODUCTION_URL,
    VERCEL_URL: process.env.VERCEL_URL,
  });
}
