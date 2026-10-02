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
