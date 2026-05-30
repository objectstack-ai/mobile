import { parseDateValue } from "~/components/ui/DatePicker";
import { toStringArray } from "~/components/ui/MultiSelect";

describe("parseDateValue", () => {
  it("returns null for empty values", () => {
    expect(parseDateValue(null)).toBeNull();
    expect(parseDateValue(undefined)).toBeNull();
    expect(parseDateValue("")).toBeNull();
  });

  it("parses an epoch-millisecond number", () => {
    const ms = Date.UTC(2026, 4, 15, 0, 1);
    const d = parseDateValue(ms);
    expect(d).toBeInstanceOf(Date);
    expect(d?.getTime()).toBe(ms);
  });

  it("parses a numeric epoch string", () => {
    const ms = 1748534400000;
    expect(parseDateValue(String(ms))?.getTime()).toBe(ms);
  });

  it("parses an ISO date string", () => {
    const d = parseDateValue("2026-05-15");
    expect(d?.getFullYear()).toBe(2026);
    expect(d?.getMonth()).toBe(4);
  });

  it("parses an HH:MM time string onto today", () => {
    const d = parseDateValue("09:30");
    expect(d?.getHours()).toBe(9);
    expect(d?.getMinutes()).toBe(30);
  });

  it("returns null for unparseable junk", () => {
    expect(parseDateValue("not-a-date")).toBeNull();
    expect(parseDateValue({})).toBeNull();
  });

  it("passes through a valid Date and rejects an invalid one", () => {
    const now = new Date(2026, 0, 1);
    expect(parseDateValue(now)).toBe(now);
    expect(parseDateValue(new Date("nope"))).toBeNull();
  });
});

describe("toStringArray", () => {
  it("returns [] for empty values", () => {
    expect(toStringArray(null)).toEqual([]);
    expect(toStringArray(undefined)).toEqual([]);
    expect(toStringArray("")).toEqual([]);
  });

  it("maps an array to strings", () => {
    expect(toStringArray([1, "a", 2])).toEqual(["1", "a", "2"]);
  });

  it("splits a comma-separated string", () => {
    expect(toStringArray("a, b ,c")).toEqual(["a", "b", "c"]);
  });

  it("wraps a scalar", () => {
    expect(toStringArray(42)).toEqual(["42"]);
  });
});
