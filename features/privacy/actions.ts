"use server";

import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

const analyticsConsentSchema = z
  .object({
    enabled: z.boolean(),
    idempotencyKey: z.uuid(),
  })
  .strict();

const analyticsIdSchema = z.uuid().nullable();

export type AnalyticsConsentResult =
  | Readonly<{ ok: true; analyticsId: string | null }>
  | Readonly<{ ok: false; message: string }>;

const FAILED_MESSAGE = "Die Datenschutzauswahl konnte nicht gespeichert werden.";

export async function setAnalyticsConsentAction(
  input: unknown,
): Promise<AnalyticsConsentResult> {
  const validation = analyticsConsentSchema.safeParse(input);
  if (!validation.success) {
    return { ok: false, message: "Bitte prüfe deine Angaben." };
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("set_analytics_consent", {
      p_enabled: validation.data.enabled,
      p_idempotency_key: validation.data.idempotencyKey,
    });
    if (error) return { ok: false, message: FAILED_MESSAGE };

    const parsedId = analyticsIdSchema.safeParse(data);
    if (!parsedId.success || (validation.data.enabled && !parsedId.data)) {
      return { ok: false, message: FAILED_MESSAGE };
    }

    return { ok: true, analyticsId: parsedId.data };
  } catch {
    return { ok: false, message: FAILED_MESSAGE };
  }
}
