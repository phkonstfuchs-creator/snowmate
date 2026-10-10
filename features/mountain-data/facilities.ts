import { mountainFeatureById } from "./catalog";

/** Operator inventory review date; distinct from the OSM geometry fetch date. */
export const NORDKETTE_INVENTORY_DATE = "2026-10-10" as const;
const inventorySource = "https://nordkette.com/lifte-pisten/";
const technicalSource = "https://nordkette.com/top-of-innsbruck/technik/";
const timetableSource = "https://nordkette.com/anlagen-fahrplan/";

type RideTime =
  | { readonly kind: "minimum" | "approximate"; readonly minutes: number; readonly sourceUrl: string }
  | { readonly kind: "conflicting"; readonly values: readonly number[]; readonly sourceUrls: readonly string[] };

export interface MountainFacility {
  readonly id: string;
  readonly name: string;
  readonly resort: "Nordkette";
  readonly sourceUrl: string;
  readonly checkedAt: string;
  readonly geometry: { readonly status: "matched" | "candidate" | "missing"; readonly featureId: string | null };
  readonly rideTime: RideTime | null;
  readonly departureInterval: { readonly minutes: 15; readonly sourceUrl: string } | null;
}

type FacilityEntry = Omit<MountainFacility, "resort" | "sourceUrl" | "checkedAt">;
const departureInterval = { minutes: 15, sourceUrl: timetableSource } as const;

// Name/local-name evidence is documented in docs/qa/PILOT_MAP_DATA.md.
// The unnamed carpet is only a candidate; no station coordinates or status are inferred.
const entries: readonly FacilityEntry[] = [
  { id: "nordkette-hungerburgbahn", name: "Hungerburgbahn", geometry: { status: "missing", featureId: null },
    rideTime: { kind: "conflicting", values: [6, 8], sourceUrls: [technicalSource, "https://nordkette.com/top-of-innsbruck/hungerburgbahn/"] }, departureInterval },
  { id: "nordkette-seegrubenbahn", name: "Seegrubenbahn", geometry: { status: "matched", featureId: "way/25170582" },
    rideTime: { kind: "minimum", minutes: 6.5, sourceUrl: technicalSource }, departureInterval },
  { id: "nordkette-hafelekarbahn", name: "Hafelekarbahn", geometry: { status: "matched", featureId: "way/25282282" },
    rideTime: { kind: "approximate", minutes: 4, sourceUrl: technicalSource }, departureInterval },
  { id: "nordkette-dreierstuetze", name: "Sessellift 3er Stütze", geometry: { status: "matched", featureId: "way/25750412" }, rideTime: null, departureInterval: null },
  { id: "nordkette-frau-hitt", name: "Sessellift Frau-Hitt-Warte", geometry: { status: "matched", featureId: "way/227203761" }, rideTime: null, departureInterval: null },
  { id: "nordkette-zauberteppich", name: "Förderband Zauberteppich", geometry: { status: "candidate", featureId: "way/706193014" }, rideTime: null, departureInterval: null },
];

export const nordketteFacilities: readonly MountainFacility[] = entries.map((entry) => {
  const feature = entry.geometry.featureId ? mountainFeatureById(entry.geometry.featureId) : null;
  return {
    ...entry,
    resort: "Nordkette",
    sourceUrl: inventorySource,
    checkedAt: NORDKETTE_INVENTORY_DATE,
    // A later geometry refresh may remove a matched way. Never leave a stale association selectable.
    geometry: entry.geometry.featureId && feature?.kind !== "lift" ? { status: "missing", featureId: null } : entry.geometry,
  };
});

export function mountainFacilityById(id: string): MountainFacility | null {
  return nordketteFacilities.find((facility) => facility.id === id) ?? null;
}

export function mountainFacilityForFeature(id: string): MountainFacility | null {
  return nordketteFacilities.find(({ geometry }) => geometry.status === "matched" && geometry.featureId === id) ?? null;
}
