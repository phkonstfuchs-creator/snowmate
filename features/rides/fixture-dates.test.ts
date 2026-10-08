import { describe, expect, it } from "vitest";
import { localizeFixtureRide, fixtureDay, fixtureMessageTime, fixtureTimestamp } from "./fixture-dates";

/* Wednesday, 7 October 2026, 10:00 in Vienna. */
const NOW = new Date("2026-10-07T08:00:00Z");

describe("fixture dates", () => {
  it("turns a sample weekday into the next real one, so weekday and date always match", () => {
    expect(fixtureDay("Today", NOW)).toBe("2026-10-07");
    expect(fixtureDay("Tomorrow", NOW)).toBe("2026-10-08");
    expect(fixtureDay("Sat 12 Jan", NOW)).toBe("2026-10-10");
    expect(fixtureDay("Fri 11 Jan", NOW)).toBe("2026-10-09");
    expect(fixtureDay("Sun 13 Jan", NOW)).toBe("2026-10-11");
    expect(fixtureDay("whenever", NOW)).toBe("2026-10-07");
  });

  it("reads 'n min/hr/day ago' as a time before now", () => {
    expect(fixtureTimestamp("23 min ago", NOW)).toBe(new Date(NOW.getTime() - 23 * 60_000).toISOString());
    expect(fixtureTimestamp("2 hr ago", NOW)).toBe(new Date(NOW.getTime() - 2 * 3_600_000).toISOString());
    expect(fixtureTimestamp("1 day ago", NOW)).toBe(new Date(NOW.getTime() - 86_400_000).toISOString());
    expect(fixtureTimestamp("Jetzt", NOW)).toBe(NOW.toISOString());
  });

  it("shows a sample ride in the reader's language", () => {
    const post = { date: "Sat 12 Jan", postedAt: "1 hr ago" };
    expect(localizeFixtureRide(post, NOW, "de")).toEqual({ date: "Sa., 10. Okt.", postedAt: "vor 1 Std." });
    expect(localizeFixtureRide({ date: "Today", postedAt: "23 min ago" }, NOW, "en")).toEqual({ date: "Today", postedAt: "23 min ago" });
  });

  it("keeps the clock time of sample chat messages, so old ones never read as new", () => {
    expect(fixtureMessageTime("Yesterday 21:14", NOW, "de")).toBe("Gestern 21:14");
    expect(fixtureMessageTime("Today 09:12", NOW, "en")).toBe("Today 09:12");
    expect(fixtureMessageTime("0 min ago", NOW, "de")).toBe("gerade eben");
  });
});
