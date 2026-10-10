# Nordkette pilot map data

**Snapshot date:** 2026-10-09

**Source geometry:** OpenStreetMap API map extract, fetched once from `https://api.openstreetmap.org/api/0.6/map?bbox=11.37,47.285,11.40,47.315`.

**Bundled snapshot:** 30 OSM ways: 5 passenger aerialway ways and 25 piste ways, including multiple mapped sections with the same piste name. Snapshot-wide geometry bounds: `[11.3755319, 47.2861686, 11.3990069, 47.3121155]` (longitude, latitude).

**Shared production location (2026-10-10):** `features/mountain-data/pilot.json` is the single snapshot used by both the normal map and the design preview. The importer targets this shared directory; preview TypeScript modules keep compatibility re-exports. Moving the snapshot does not refresh or expand its coverage.

## Coverage and provenance

The query area is a compact Nordkette ski-area box. It does not include the full city-to-Hungerburg approach or prove full resort coverage. The 25 piste ways are source features and fragments, not 25 distinct complete runs. `disused:piste:type` and non-passenger aerialways are excluded. The import preserves every selected way's OSM id, version, timestamp and source tags; catalog ids link to `https://www.openstreetmap.org/way/<id>`. The app treats operational status as **unknown** because this extract does not establish current status.

The operator's [current lifts and slopes inventory](https://nordkette.com/en/lifts-slopes/) listed six facilities on 2026-10-09: Hungerburgbahn, Seegrubenbahn, Hafelekar, Sessellift 3er Stütze, Sessellift Frau-Hitt-Warte and Förderband Zauberteppich. The extract contains five passenger aerialway ways: Seegrubenbahn (`way/25170582`), Hafelekarbahn (`way/25282282`), Seegrube / local name Dreierstützenlift (`way/25750412`), Frau-Hitt Warte (`way/227203761`) and one unnamed magic carpet (`way/706193014`). The source does not include a Hungerburgbahn way inside this bbox. These are not a verified one-to-one identity match to all six operator facilities; this pilot makes no completeness claim. The older app reference has three Nordkette lift records and endpoint pairs only in [`lib/lifts.ts`](../../lib/lifts.ts); those endpoints were not used to draw geometry.

The importer first attempted public Overpass, but the sandbox could not resolve `overpass-api.de`; escalated retries received connection failure or HTTP 500 from public instances. The official OSM API's small read-only map endpoint succeeded. The checked-in snapshot was converted from its XML nodes/ways using the shared converter and contains no hand-drawn or endpoint-interpolated lines.

## Rights, cost and runtime

OpenStreetMap data is © OpenStreetMap contributors and available under the [ODbL](https://www.openstreetmap.org/copyright). Attribution is shown on the map. A distributed derived database must follow ODbL share-alike requirements. Re-import only when needed and follow the [OSM API usage policy](https://operations.osmfoundation.org/policies/api/); the API extract used here was about 5.3 MB. No paid account or key was used.

[`scripts/import-pilot-map-osmapi.py`](../../scripts/import-pilot-map-osmapi.py) converts a previously saved OSM XML extract, and [`scripts/import-pilot-map.mjs`](../../scripts/import-pilot-map.mjs) runs the shared conversion into static GeoJSON. These are maintainer import tools; the app never queries OSM or Overpass. OpenFreeMap basemap and AWS DEM tiles remain network requests and show provider attribution. The preview does not stack a non-selectable OpenSnowMap raster overlay onto the sourced vector network. No operational status is inferred from geometry or OSM tags.

## Re-import and review

For recurring updates use regional extracts or the read-only Overpass service. The OSM editing API fallback was a one-time pilot read, not the recommended refresh pipeline under its usage policy. Convert a saved XML extract with `python3 scripts/import-pilot-map-osmapi.py --from /path/to/extract.osm`. Alternatively, save an Overpass response and run `node scripts/import-pilot-map.mjs --from /path/to/overpass-response.json`. Review way ids, tags, versions, timestamps, feature count and bounds against a dated operator inventory before expanding a coverage claim. Keep missing ways missing; do not replace their geometry with straight station connections.

## Source, package and cost matrix — 2026-10-09

| Resource | Phase A use / cost evidence | Offline and next-stage constraint |
|---|---|---|
| [OSM](https://www.openstreetmap.org/copyright) geometry | Bundled ODbL-derived snapshot, source/revision tags retained. Winter route names take precedence; `osm_name` retains the original summer/general name. No provider purchase. `pilot.json`: 37,347 bytes, gzip 4,098 bytes; measured locally. Hosting transfer still belongs to app hosting. | Attributed/share-alike derived data can form part of a package. All facility identities, full routes and station topology need verification. Repeated editing-API reads are not the refresh strategy; use extracts/read-only providers. |
| [OpenFreeMap](https://openfreemap.org/) basemap | The public service lists commercial use as free, with no request quota or API key, and no SLA. Preview makes ordinary online requests with provider attribution. | Self-hosting and downloadable datasets are offered. That does not by itself establish a regional offline package, storage budget or support guarantee; package format and actual transfer cost remain to measure. |
| [OpenSnowMap data/packages](https://www.opensnowmap.org/iframes/data.html) | Candidate wider ski-data source; ODbL geometry and CC-BY-SA tiles. No preview raster requests after the vector pilot replaced the duplicate layer. | Published extracts/packages are an option. Tile bulk fetching by an app is explicitly prohibited without acknowledgement; do not build the download button by scraping raster tiles. |
| [AWS Terrain Tiles](https://registry.opendata.aws/terrain-tiles/) / [source attribution](https://github.com/tilezen/joerd/blob/master/docs/attribution.md) | Online DEM for MapLibre hillshade/terrain, no paid key in the preview. Austrian/European/global source credits and link shown. | Dataset sources have their own terms; a distributed DEM package needs source/licence verification, resolution checks and measured size. No accuracy advantage claimed. |
| [Nordkette webcams](https://nordkette.com/en/cams/) / [Stubai webcams](https://www.stubaier-gletscher.com/stubai-live/webcams/) | Explicit external operator links, including from Go. No media download, mirror, embed, provider fee or cookie-loading player in Pistl. | Media reuse, embedding and offline image caching are not cleared. Image capture time must come from the source, not Pistl's fetch timestamp. |
| Lift operating status, queues and arrival ETA | Not provided by the static geometry. UI explicitly says unknown; OSM minutes are rounded and marked unvalidated. | Operator/API agreements, facility matching and field measurements remain open. No price or completeness estimate without evidence. |

No paid service, support plan or provider contract was opened. No arbitrary euro forecast is assigned to unmeasured native/device tests, tile hosting, operator status feeds or package storage. The current snapshot's measured small size supports plain GeoJSON for this pilot; it does not decide the multi-resort format.
