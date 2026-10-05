import { z } from "zod";
import type { Resort } from "@/lib/resorts";

/* Live snow and weather per resort from Open-Meteo (open data, CC BY 4.0).
   Asked at the top and valley station heights, so it describes the
   slopes. Snow depth is a model value, not a measurement on the piste;
   the UI says so. Lift status has no open source and is not shown. */

export const CONDITIONS_SOURCE = "https://api.open-meteo.com/v1/forecast";

export type WeatherKind = "sun" | "partly" | "cloud" | "fog" | "rain" | "snow" | "storm";

export interface ForecastDay {
  date: string;
  snowCm: number;
  kind: WeatherKind;
  maxC: number;
  minC: number;
}

export interface ResortConditions {
  topTempC: number;
  baseTempC: number;
  windKmh: number;
  kind: WeatherKind;
  snowDepthCm: number;
  /* Fallen yesterday and today. */
  newSnowCm: number;
  /* Expected over the next three days. */
  forecastSnowCm: number;
  days: ForecastDay[];
  updatedAt: string;
}

/* WMO weather interpretation codes, as Open-Meteo returns them. */
export function weatherKind(code: number): WeatherKind {
  if (code === 0) return "sun";
  if (code <= 2) return "partly";
  if (code === 3) return "cloud";
  if (code === 45 || code === 48) return "fog";
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return "snow";
  if (code >= 95) return "storm";
  return "rain";
}

/* One request for every resort, two points each: top, then valley. */
export function conditionsUrl(resorts: readonly Pick<Resort, "coordinates" | "baseM" | "topM">[]): string {
  const points = resorts.flatMap((resort) => [
    { lat: resort.coordinates[0], lng: resort.coordinates[1], m: resort.topM },
    { lat: resort.coordinates[0], lng: resort.coordinates[1], m: resort.baseM },
  ]);
  const params = new URLSearchParams({
    latitude: points.map((p) => p.lat).join(","),
    longitude: points.map((p) => p.lng).join(","),
    elevation: points.map((p) => p.m).join(","),
    current: "temperature_2m,weather_code,wind_speed_10m,snow_depth",
    daily: "snowfall_sum,weather_code,temperature_2m_max,temperature_2m_min",
    past_days: "1",
    forecast_days: "4",
    timezone: "Europe/Vienna",
  });
  return `${CONDITIONS_SOURCE}?${params.toString()}`;
}

const finite = z.number().finite();
const point = z.object({
  current: z.object({
    time: z.string(),
    temperature_2m: finite,
    weather_code: finite,
    wind_speed_10m: finite,
    snow_depth: finite.nullable(),
  }),
  daily: z.object({
    time: z.array(z.string()).length(5),
    snowfall_sum: z.array(finite.nullable()).length(5),
    weather_code: z.array(finite.nullable()).length(5),
    temperature_2m_max: z.array(finite.nullable()).length(5),
    temperature_2m_min: z.array(finite.nullable()).length(5),
  }),
});

const round = (value: number) => Math.round(value);
const cm = (value: number | null) => Math.max(0, value ?? 0);

/* Maps the answer to the resorts it was asked for, by name. Anything
   malformed yields null for that resort instead of a guess. */
export function parseConditions(
  resorts: readonly Pick<Resort, "name">[],
  body: unknown,
): Record<string, ResortConditions | null> {
  const list = Array.isArray(body) ? body : [body];
  const result: Record<string, ResortConditions | null> = {};
  resorts.forEach((resort, index) => {
    const top = point.safeParse(list[index * 2]);
    const base = point.safeParse(list[index * 2 + 1]);
    if (!top.success || !base.success) {
      result[resort.name] = null;
      return;
    }
    const { current, daily } = top.data;
    const days = [2, 3, 4].map((i) => ({
      date: daily.time[i]!,
      snowCm: round(cm(daily.snowfall_sum[i]!)),
      kind: weatherKind(daily.weather_code[i] ?? 3),
      maxC: round(daily.temperature_2m_max[i] ?? current.temperature_2m),
      minC: round(daily.temperature_2m_min[i] ?? current.temperature_2m),
    }));
    result[resort.name] = {
      topTempC: round(current.temperature_2m),
      baseTempC: round(base.data.current.temperature_2m),
      windKmh: round(current.wind_speed_10m),
      kind: weatherKind(current.weather_code),
      snowDepthCm: round(cm(current.snow_depth) * 100),
      newSnowCm: round(cm(daily.snowfall_sum[0]!) + cm(daily.snowfall_sum[1]!)),
      forecastSnowCm: days.reduce((sum, day) => sum + day.snowCm, 0),
      days,
      updatedAt: current.time,
    };
  });
  return result;
}
