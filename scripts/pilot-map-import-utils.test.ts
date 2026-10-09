import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { writePilotSnapshotAtomically } from "./pilot-map-import-utils.mjs";

let directory: string;
afterEach(async () => { if (directory) await rm(directory, { recursive: true, force: true }); });

describe("pilot map snapshot writer", () => {
  it("writes a valid snapshot atomically and leaves no temporary file", async () => {
    directory = await mkdtemp(join(tmpdir(), "pilot-map-import-"));
    const target = join(directory, "pilot.json");
    const snapshot = { type: "FeatureCollection", features: [{ type: "Feature", id: "way/8" }] };
    await writePilotSnapshotAtomically(snapshot, target);
    expect(JSON.parse(await readFile(target, "utf8"))).toEqual(snapshot);
    expect(await readdir(directory)).toEqual(["pilot.json"]);
  });

  it("rejects invalid or empty snapshots without changing the last good file", async () => {
    directory = await mkdtemp(join(tmpdir(), "pilot-map-import-"));
    const target = join(directory, "pilot.json");
    await writeFile(target, "previous-valid-snapshot");
    await expect(writePilotSnapshotAtomically({ type: "FeatureCollection", features: [] }, target)).rejects.toThrow(/zero usable features/u);
    expect(await readFile(target, "utf8")).toBe("previous-valid-snapshot");
    await expect(writePilotSnapshotAtomically({ remark: "API failure" }, target)).rejects.toThrow(/FeatureCollection/u);
    expect(await readFile(target, "utf8")).toBe("previous-valid-snapshot");
  });
});
