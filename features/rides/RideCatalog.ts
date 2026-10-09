import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import type { City } from "@/lib/types";
import type { DataResult } from "./data";
const catalogSchema = z.array(
  z.object({
    id: z.string().regex(/^[a-z0-9-]{2,64}$/),
    name: z.string().min(2).max(100),
  }),
);
export type RideResortOption = Readonly<{
  id: string;
  name: string;
}>;
export async function getRideResortCatalog(
  city: City,
): Promise<DataResult<RideResortOption[]>> {
  try {
    const client = await createClient();
    const { data, error } = await client
      .from("resorts")
      .select("id, name")
      .eq("city", city)
      .order("name");
    if (error) return { status: "unavailable" };
    const parsed = catalogSchema.safeParse(data);
    return parsed.success
      ? { status: "ready", data: parsed.data }
      : { status: "unavailable" };
  } catch {
    return { status: "unavailable" };
  }
}
