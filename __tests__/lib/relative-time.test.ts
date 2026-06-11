import { dateGroup, relativeTime, startOfDay } from "~/lib/relative-time";

// Local noon — keeps day-bucket math deterministic regardless of the test TZ.
const NOW = new Date(2026, 5, 11, 12, 0, 0).getTime();
const MIN = 60_000;
const HOUR = 3_600_000;
const DAY = 86_400_000;

describe("dateGroup", () => {
  it("buckets by calendar day relative to now", () => {
    expect(dateGroup(NOW - HOUR, NOW)).toBe("today");
    expect(dateGroup(NOW - DAY, NOW)).toBe("yesterday");
    expect(dateGroup(NOW - 3 * DAY, NOW)).toBe("week");
    expect(dateGroup(NOW - 10 * DAY, NOW)).toBe("earlier");
  });

  it("startOfDay is idempotent and lands on local midnight", () => {
    const s = startOfDay(NOW);
    expect(startOfDay(s)).toBe(s);
    expect(new Date(s).getHours()).toBe(0);
  });
});

describe("relativeTime", () => {
  it("just now under a minute", () => {
    expect(relativeTime(NOW - 30_000, NOW)).toEqual({ kind: "justNow" });
  });

  it("minutes under an hour", () => {
    expect(relativeTime(NOW - 5 * MIN, NOW)).toEqual({ kind: "minutes", n: 5 });
  });

  it("hours within the same day", () => {
    expect(relativeTime(NOW - 2 * HOUR, NOW)).toEqual({ kind: "hours", n: 2 });
  });

  it("yesterday for the prior calendar day", () => {
    expect(relativeTime(NOW - DAY, NOW)).toEqual({ kind: "yesterday" });
  });

  it("falls back to an absolute date for older timestamps", () => {
    const ts = NOW - 5 * DAY;
    expect(relativeTime(ts, NOW)).toEqual({ kind: "date", ts });
  });
});
