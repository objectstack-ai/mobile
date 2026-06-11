/**
 * Time helpers for grouping and labelling timestamps in feeds (notifications,
 * activity). Kept pure — the i18n layer maps the returned descriptors to
 * localized strings, so these are unit-testable without a `t` function and
 * sidestep Hermes's missing `Intl.PluralRules` (the labels use compact "5m" /
 * "2h" forms with no pluralization).
 */

/** Coarse bucket a timestamp falls into, relative to `now`. */
export type DateGroup = "today" | "yesterday" | "week" | "earlier";

/** Midnight (local) of the day containing `ms`, as epoch ms. */
export function startOfDay(ms: number): number {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

const DAY_MS = 86_400_000;

/** Which day-bucket `ts` belongs to relative to `now` (both epoch ms). */
export function dateGroup(ts: number, now: number): DateGroup {
  const days = Math.round((startOfDay(now) - startOfDay(ts)) / DAY_MS);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 7) return "week";
  return "earlier";
}

/**
 * A relative-time descriptor for a timestamp. The component formats it via
 * i18n; older-than-yesterday falls back to an absolute calendar date.
 */
export type RelTime =
  | { kind: "justNow" }
  | { kind: "minutes"; n: number }
  | { kind: "hours"; n: number }
  | { kind: "yesterday" }
  | { kind: "date"; ts: number };

const MIN_MS = 60_000;
const HOUR_MS = 3_600_000;

/** Compact relative-time descriptor for `ts` relative to `now` (epoch ms). */
export function relativeTime(ts: number, now: number): RelTime {
  const diff = now - ts;
  if (diff < MIN_MS) return { kind: "justNow" };
  if (diff < HOUR_MS) return { kind: "minutes", n: Math.floor(diff / MIN_MS) };
  // Within the same calendar day → hours; otherwise fall to day buckets so a
  // 23:00→01:00 span reads "Yesterday", not "2h".
  if (dateGroup(ts, now) === "today") {
    return { kind: "hours", n: Math.max(1, Math.floor(diff / HOUR_MS)) };
  }
  if (dateGroup(ts, now) === "yesterday") return { kind: "yesterday" };
  return { kind: "date", ts };
}
