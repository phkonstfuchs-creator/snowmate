import { z } from "zod";

const safeUrlSchema = z
  .string()
  .trim()
  .url()
  .refine((value) => {
    const url = new URL(value);
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

    throw new Error(`Supabase public configuration is invalid: ${details}`);
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
