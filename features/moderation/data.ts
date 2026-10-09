import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import {
  parseModerationAppealRows,
  parseModerationQueueRows,
  type ModerationAppeal,
  type ModerationQueueItem,
} from "./dto";

export type ModerationDataResult<T> =
  | Readonly<{ status: "ready"; data: T }>
  | Readonly<{ status: "unavailable" }>;

const queueLimitSchema = z.number().int().min(1).max(500);
const reportIdSchema = z.uuid();

export async function getModerationQueue(
  limit = 100,
): Promise<ModerationDataResult<ModerationQueueItem[]>> {
  const parsedLimit = queueLimitSchema.safeParse(limit);
  if (!parsedLimit.success) return { status: "unavailable" };

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("get_moderation_queue", {
      p_limit: parsedLimit.data,
    });
    if (error) return { status: "unavailable" };

    const parsed = parseModerationQueueRows(data);
    return parsed
      ? { status: "ready", data: parsed }
      : { status: "unavailable" };
  } catch {
    return { status: "unavailable" };
  }
}

export async function getModerationAppeals(
  reportId: string,
): Promise<ModerationDataResult<ModerationAppeal[]>> {
  const parsedId = reportIdSchema.safeParse(reportId);
  if (!parsedId.success) return { status: "unavailable" };

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("get_moderation_appeals", {
      p_report_id: parsedId.data,
    });
    if (error) return { status: "unavailable" };

    const parsed = parseModerationAppealRows(data);
    return parsed
      ? { status: "ready", data: parsed }
      : { status: "unavailable" };
  } catch {
    return { status: "unavailable" };
  }
}
