import { describe, expect, it } from "vitest";
import { conditionsUrl, parseConditions, weatherKind } from "./conditions";

const resorts = [
  { name: "Axamer Lizum", coordinates: [47.1717, 11.2333] as [number, number], baseM: 1580, topM: 2340 },
  { name: "Kühtai", coordinates: [47.208, 11.017] as [number, number], baseM: 2020, topM: 2520 },
];

function point(temp: number, overrides: Record<string, unknown> = {}) {
  return {
    current: { time: "2026-12-20T10:00", temperature_2m: temp, weather_code: 73, wind_speed_10m: 18.4, snow_depth: 1.234, ...overrides },
    daily: {
      time: ["2026-12-19", "2026-12-20", "2026-12-21", "2026-12-22", "2026-12-23"],
      snowfall_sum: [6.2, 4.1, 0, 12.6, null],
      weather_code: [73, 71, 0, 75, null],
      temperature_2m_max: [-3, -2, 1.6, -4, null],
      temperature_2m_min: [-9, -8, -6, -10, null],
    },
  };
}

describe("resort conditions", () => {
  it("asks once for every resort at its top and valley height", () => {
    const url = new URL(conditionsUrl(resorts));
    expect(url.origin).toBe("https://api.open-meteo.com");
    expect(url.searchParams.get("latitude")).toBe("47.1717,47.1717,47.208,47.208");
    expect(url.searchParams.get("elevation")).toBe("2340,1580,2520,2020");
    expect(url.searchParams.get("past_days")).toBe("1");
    expect(url.searchParams.get("forecast_days")).toBe("4");
  });

  it("turns the answer into snow and weather per resort", () => {
    const parsed = parseConditions(resorts, [point(-6.6), point(-1.2), point(-8), point(-5)]);
    expect(parsed["Axamer Lizum"]).toEqual({
      topTempC: -7,
      baseTempC: -1,
      windKmh: 18,
      kind: "snow",
      snowDepthCm: 123,
      newSnowCm: 10,
      forecastSnowCm: 13,
      days: [
        { date: "2026-12-21", snowCm: 0, kind: "sun", maxC: 2, minC: -6 },
        { date: "2026-12-22", snowCm: 13, kind: "snow", maxC: -4, minC: -10 },
        { date: "2026-12-23", snowCm: 0, kind: "cloud", maxC: -7, minC: -7 },
      ],
      updatedAt: "2026-12-20T10:00",
    });
    expect(parsed["Kühtai"]?.topTempC).toBe(-8);
  });

  it("gives null for a resort with a malformed answer instead of guessing", () => {
    const parsed = parseConditions(resorts, [point(-6), point(-1), { error: true }, point(-5)]);
    expect(parsed["Axamer Lizum"]).not.toBeNull();
    expect(parsed["Kühtai"]).toBeNull();
    expect(parseConditions(resorts, { reason: "quota" })).toEqual({ "Axamer Lizum": null, Kühtai: null });
  });

  it("never reports negative snow", () => {
    const parsed = parseConditions(resorts.slice(0, 1), [point(-6, { snow_depth: -0.2 }), point(-1)]);
    expect(parsed["Axamer Lizum"]?.snowDepthCm).toBe(0);
  });

  it("maps weather codes", () => {
    expect([0, 2, 3, 45, 61, 73, 86, 95].map(weatherKind)).toEqual(["sun", "partly", "cloud", "fog", "rain", "snow", "snow", "storm"]);
  });
});
