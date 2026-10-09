import { createClient } from "@/lib/supabase/server";
import {
  parseAccountDeletionStatusRows,
  parseExportRequestRows,
  type AccountDeletionStatus,
  type ExportRequest,
} from "./dto";

export type AccountLifecycleDataResult<T> =
  | Readonly<{ status: "ready"; data: T }>
  | Readonly<{ status: "unavailable" }>;

async function readRows<T>(
  rpcName: string,
  parse: (value: unknown) => T[] | null,
): Promise<AccountLifecycleDataResult<T[]>> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc(rpcName);
    if (error) return { status: "unavailable" };

    const parsed = parse(data);
    return parsed
      ? { status: "ready", data: parsed }
      : { status: "unavailable" };
  } catch {
    return { status: "unavailable" };
  }
}

export function getExportRequests(): Promise<
  AccountLifecycleDataResult<ExportRequest[]>
> {
  return readRows("get_export_requests", parseExportRequestRows);
}

export function getAccountDeletionStatus(): Promise<
  AccountLifecycleDataResult<AccountDeletionStatus[]>
> {
  return readRows(
    "get_account_deletion_status",
    parseAccountDeletionStatusRows,
  );
}
