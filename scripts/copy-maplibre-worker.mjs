// MapLibre 6 runs tile parsing in a module worker that it loads by URL.
// Bundlers cannot follow that URL, so the worker and the module it
// imports are copied to public/ and the map points at them
// (setWorkerUrl in components/map/SkiMap.tsx). Runs before dev and build.
import { copyFileSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(import.meta.url);
const dist = path.dirname(require.resolve("maplibre-gl/package.json"));
const target = path.resolve(import.meta.dirname, "../public/vendor/maplibre");

mkdirSync(target, { recursive: true });
for (const file of ["maplibre-gl-worker.mjs", "maplibre-gl-shared.mjs"]) {
  copyFileSync(path.join(dist, "dist", file), path.join(target, file));
}
