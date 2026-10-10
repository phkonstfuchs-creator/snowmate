import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { convertOverpass } from "../features/mountain-data/convert.ts";
import { writePilotSnapshotAtomically } from "./pilot-map-import-utils.mjs";

const bbox = "47.285,11.37,47.315,11.40";
const query = `[out:json][timeout:30];(way["aerialway"](${bbox});way["piste:type"](${bbox}););out meta geom;`;
const target = resolve(import.meta.dirname, "../features/mountain-data/pilot.json");
const inputIndex = process.argv.indexOf("--from");

try {
  let payload;
  if (inputIndex >= 0 && process.argv[inputIndex + 1]) {
    payload = JSON.parse(await readFile(resolve(process.argv[inputIndex + 1]), "utf8"));
  } else {
    const response = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded", "user-agent": "PistlPilotMapImport/1.0 (one-time static data import)" },
      body: new URLSearchParams({ data: query }),
      signal: AbortSignal.timeout(35_000),
    });
    if (!response.ok) throw new Error(`Overpass returned HTTP ${response.status}`);
    payload = await response.json();
  }
  const collection = convertOverpass(payload);
  await writePilotSnapshotAtomically(collection, target);
  console.log(`Wrote ${collection.features.length} OSM ways to ${target}`);
} catch (error) {
  console.error(`Pilot map import failed; existing GeoJSON was left unchanged. ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}
