import type { City } from "./types";

/* Reference data, not fixtures: the ski areas Snowmate covers, where they
   are and which region they belong to. Live conditions do not live here;
   the prototype's sample conditions are in lib/data. */
export interface Resort {
  name: string;
  city: City;
  /* [latitude, longitude] */
  coordinates: [number, number];
}

export const RESORTS: readonly Resort[] = [
  { name: "Stubai Glacier", city: "innsbruck", coordinates: [47.083, 11.152] },
  { name: "Nordkette", city: "innsbruck", coordinates: [47.3247, 11.3867] },
  { name: "Axamer Lizum", city: "innsbruck", coordinates: [47.1717, 11.2333] },
  { name: "Schlick 2000", city: "innsbruck", coordinates: [47.233, 11.198] },
  { name: "Kühtai", city: "innsbruck", coordinates: [47.208, 11.017] },
  { name: "Glungezer", city: "innsbruck", coordinates: [47.239, 11.482] },
  { name: "Patscherkofel", city: "innsbruck", coordinates: [47.214, 11.47] },
  { name: "Bergeralm", city: "innsbruck", coordinates: [47.211, 11.501] },
  { name: "Rangger Köpfl", city: "innsbruck", coordinates: [47.198, 11.2] },
  { name: "Hochoetz", city: "innsbruck", coordinates: [47.2, 10.918] },
  { name: "Mutterer Alm", city: "innsbruck", coordinates: [47.209, 11.376] },
  { name: "Serlesbahnen Mieders", city: "innsbruck", coordinates: [47.162, 11.317] },
  { name: "Sölden", city: "innsbruck", coordinates: [46.967, 11] },
  { name: "Saalbach-Hinterglemm", city: "salzburg", coordinates: [47.3917, 12.6333] },
  { name: "Flachau", city: "salzburg", coordinates: [47.333, 13.383] },
  { name: "Kitzsteinhorn", city: "salzburg", coordinates: [47.2242, 12.692] },
  { name: "Zell am See", city: "salzburg", coordinates: [47.3247, 12.7969] },
  { name: "Wagrain", city: "salzburg", coordinates: [47.35, 13.3] },
  { name: "Bad Gastein", city: "salzburg", coordinates: [47.117, 13.133] },
  { name: "Hochkönig", city: "salzburg", coordinates: [47.4167, 13.0667] },
];

export function resortNamesIn(city: City): string[] {
  return RESORTS.filter((resort) => resort.city === city).map((resort) => resort.name);
}

export function resortCoordinates(name: string): [number, number] | undefined {
  return RESORTS.find((resort) => resort.name === name)?.coordinates;
}
