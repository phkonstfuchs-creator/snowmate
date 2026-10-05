import type { City } from "./types";

/* Reference data, not fixtures: the ski areas Pistl covers, where they
   are and which region they belong to. Live conditions do not live here;
   the prototype's sample conditions are in lib/data. */
export interface Resort {
  name: string;
  city: City;
  /* [latitude, longitude] */
  coordinates: [number, number];
  /* Valley and top station in metres, approximate. Weather is asked for
     at these heights, so it describes the slopes, not the village. */
  baseM: number;
  topM: number;
}

export const RESORTS: readonly Resort[] = [
  { name: "Stubai Glacier", city: "innsbruck", coordinates: [47.083, 11.152], baseM: 1750, topM: 3210 },
  { name: "Nordkette", city: "innsbruck", coordinates: [47.3247, 11.3867], baseM: 860, topM: 2256 },
  { name: "Axamer Lizum", city: "innsbruck", coordinates: [47.1717, 11.2333], baseM: 1580, topM: 2340 },
  { name: "Schlick 2000", city: "innsbruck", coordinates: [47.233, 11.198], baseM: 1000, topM: 2240 },
  { name: "Kühtai", city: "innsbruck", coordinates: [47.208, 11.017], baseM: 2020, topM: 2520 },
  { name: "Glungezer", city: "innsbruck", coordinates: [47.239, 11.482], baseM: 930, topM: 2600 },
  { name: "Patscherkofel", city: "innsbruck", coordinates: [47.214, 11.47], baseM: 1010, topM: 2246 },
  { name: "Bergeralm", city: "innsbruck", coordinates: [47.211, 11.501], baseM: 1050, topM: 2100 },
  { name: "Rangger Köpfl", city: "innsbruck", coordinates: [47.198, 11.2], baseM: 850, topM: 1900 },
  { name: "Hochoetz", city: "innsbruck", coordinates: [47.2, 10.918], baseM: 820, topM: 2200 },
  { name: "Mutterer Alm", city: "innsbruck", coordinates: [47.209, 11.376], baseM: 830, topM: 1800 },
  { name: "Serlesbahnen Mieders", city: "innsbruck", coordinates: [47.162, 11.317], baseM: 950, topM: 1600 },
  { name: "Sölden", city: "innsbruck", coordinates: [46.967, 11], baseM: 1350, topM: 3340 },
  { name: "Saalbach-Hinterglemm", city: "salzburg", coordinates: [47.3917, 12.6333], baseM: 830, topM: 2100 },
  { name: "Flachau", city: "salzburg", coordinates: [47.333, 13.383], baseM: 930, topM: 2190 },
  { name: "Kitzsteinhorn", city: "salzburg", coordinates: [47.2242, 12.692], baseM: 910, topM: 3030 },
  { name: "Zell am See", city: "salzburg", coordinates: [47.3247, 12.7969], baseM: 760, topM: 1965 },
  { name: "Wagrain", city: "salzburg", coordinates: [47.35, 13.3], baseM: 840, topM: 2010 },
  { name: "Bad Gastein", city: "salzburg", coordinates: [47.117, 13.133], baseM: 1080, topM: 2250 },
  { name: "Hochkönig", city: "salzburg", coordinates: [47.4167, 13.0667], baseM: 800, topM: 1920 },
];

export function resortNamesIn(city: City): string[] {
  return RESORTS.filter((resort) => resort.city === city).map((resort) => resort.name);
}

export function resortCoordinates(name: string): [number, number] | undefined {
  return RESORTS.find((resort) => resort.name === name)?.coordinates;
}
