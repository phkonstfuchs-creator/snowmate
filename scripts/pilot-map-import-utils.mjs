import { randomUUID } from "node:crypto";
import { rename, unlink, writeFile } from "node:fs/promises";
import { basename, dirname, join } from "node:path";

export async function writePilotSnapshotAtomically(collection, target) {
  if (!collection || collection.type !== "FeatureCollection" || !Array.isArray(collection.features)) {
    throw new TypeError("Pilot import must produce a GeoJSON FeatureCollection");
  }
  if (collection.features.length === 0) {
    throw new Error("Pilot import produced zero usable features; existing snapshot was not changed");
  }

  const temporary = join(dirname(target), `.${basename(target)}.${randomUUID()}.tmp`);
  try {
    await writeFile(temporary, `${JSON.stringify(collection, null, 2)}\n`, { flag: "wx" });
    await rename(temporary, target);
  } catch (error) {
    await unlink(temporary).catch(() => undefined);
    throw error;
  }
}
