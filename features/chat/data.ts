import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import {
  parseConversationRows,
  parseMessageRows,
  parseOwnReportRows,
  type Conversation,
  type Message,
  type OwnReport,
} from "./dto";

export type ChatDataResult<T> =
  | Readonly<{ status: "ready"; data: T }>
  | Readonly<{ status: "unavailable" }>;

const conversationIdSchema = z.uuid();
const messageCursorSchema = z
  .object({
    createdAt: z
      .string()
      .refine((value) => Number.isFinite(Date.parse(value))),
    id: z.uuid(),
  })
  .strict()
  .optional();

export type MessageCursor = Readonly<{
  createdAt: string;
  id: string;
}>;

export async function getConversations(): Promise<
  ChatDataResult<Conversation[]>
> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("get_conversations");
    if (error) return { status: "unavailable" };

    const parsed = parseConversationRows(data);
    return parsed
      ? { status: "ready", data: parsed }
      : { status: "unavailable" };
  } catch {
    return { status: "unavailable" };
  }
}

export async function getMessages(
  conversationId: string,
  cursor?: MessageCursor,
): Promise<ChatDataResult<Message[]>> {
  const parsedId = conversationIdSchema.safeParse(conversationId);
  const parsedCursor = messageCursorSchema.safeParse(cursor);
  if (!parsedId.success || !parsedCursor.success) {
    return { status: "unavailable" };
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("get_messages", {
      p_before: parsedCursor.data?.createdAt ?? null,
      p_before_id: parsedCursor.data?.id ?? null,
      p_conversation_id: parsedId.data,
      p_limit: 50,
    });
    if (error) return { status: "unavailable" };

    const parsed = parseMessageRows(data);
    return parsed
      ? { status: "ready", data: parsed }
      : { status: "unavailable" };
  } catch {
    return { status: "unavailable" };
  }
}

export async function getOwnReports(): Promise<ChatDataResult<OwnReport[]>> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("get_own_reports");
    if (error) return { status: "unavailable" };

    const parsed = parseOwnReportRows(data);
    return parsed
      ? { status: "ready", data: parsed }
      : { status: "unavailable" };
  } catch {
    return { status: "unavailable" };
  }
}
