import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "./server";

export type CommandResult =
  | Readonly<{ ok: true; id: string }>
  | Readonly<{ ok: false; message: string }>;

type RpcError = Readonly<{ code?: string }> | null;
const resultIdSchema = z.uuid();

function commandError(error: RpcError): CommandResult {
  if (error?.code === "P0001") {
    return {
      ok: false,
      message: "Zu viele Anfragen. Warte kurz und versuche es erneut.",
    };
  }
  if (error?.code === "42501") {
    return { ok: false, message: "Diese Aktion ist für dich nicht verfügbar." };
  }
  if (error?.code === "23514") {
    return { ok: false, message: "Diese Aktion ist gerade nicht möglich." };
  }
  return {
    ok: false,
    message: "Die Änderung konnte nicht gespeichert werden. Versuche es erneut.",
  };
}

export function invalidCommandInput(): CommandResult {
  return { ok: false, message: "Bitte prüfe deine Angaben." };
}

export async function executeUuidCommand(
  rpcName: string,
  args: Record<string, unknown>,
  revalidate: string,
): Promise<CommandResult> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc(rpcName, args);
    if (error) return commandError(error);

    const parsedId = resultIdSchema.safeParse(data);
    if (!parsedId.success) return commandError(null);

    revalidatePath(revalidate);
    return { ok: true, id: parsedId.data };
  } catch {
    return commandError(null);
  }
}
