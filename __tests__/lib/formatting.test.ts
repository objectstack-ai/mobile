import {
  formatDate,
  formatDateTime,
  formatNumber,
  formatPercent,
  formatCurrency,
  formatByPattern,
} from "~/lib/formatting";

describe("formatDate", () => {
  it("formats a Date object", () => {
    const result = formatDate(new Date(2025, 0, 15));
    expect(result).toContain("2025");
    expect(result).toContain("15");
  });

  it("formats an ISO string", () => {
    const result = formatDate("2025-06-01T00:00:00Z");
    expect(result).toContain("2025");
  });

  it("returns the raw string for invalid dates", () => {
    expect(formatDate("not-a-date")).toBe("not-a-date");
  });
});

describe("formatDateTime", () => {
  it("includes time component", () => {
    const result = formatDateTime(new Date(2025, 5, 15, 14, 30));
    // Should contain at least the hour
    expect(result).toMatch(/\d/);
  });
});

describe("formatNumber", () => {
  it("formats integers", () => {
    const result = formatNumber(1234);
    // Locale-dependent, but should contain digits
    expect(result).toMatch(/1.*2.*3.*4/);
  });

  it("respects fraction digits", () => {
    const result = formatNumber(1.5, { minimumFractionDigits: 2 });
    expect(result).toContain("50");
  });
});

describe("formatPercent", () => {
  it("formats 50 as 50%", () => {
    const result = formatPercent(50);
    expect(result).toContain("50");
    expect(result).toContain("%");
  });
});

describe("formatCurrency", () => {
  it("formats in USD by default", () => {
    const result = formatCurrency(9.99);
    expect(result).toContain("9");
    // Should contain currency symbol or code
    expect(result).toMatch(/\$|USD/);
  });

  it("supports custom currency", () => {
    const result = formatCurrency(100, { currency: "EUR" });
    expect(result).toContain("100");
    expect(result).toMatch(/€|EUR/);
  });
});

describe("formatDateTime — invalid input", () => {
  it("returns the raw value for an unparseable date", () => {
    expect(formatDateTime("nope")).toBe("nope");
  });
});

describe("formatByPattern", () => {
  it("falls back to a grouped number when no pattern is given", () => {
    expect(formatByPattern(1234)).toBe("1,234");
  });

  it("returns an em dash for non-finite values", () => {
    expect(formatByPattern(Infinity, "$0,0")).toBe("—");
    expect(formatByPattern(NaN)).toBe("—");
  });

  it("formats a percent pattern with the declared fraction digits", () => {
    expect(formatByPattern(50, "0%")).toBe("50%");
    expect(formatByPattern(12.5, "0.0%")).toBe("12.5%");
  });

  it("formats a currency pattern", () => {
    expect(formatByPattern(1000, "$0,0")).toContain("$");
    expect(formatByPattern(1000, "$0,0")).toContain("1,000");
    expect(formatByPattern(9.99, "$0,0.00")).toContain("9.99");
  });

  it("abbreviates with a compact notation pattern", () => {
    expect(formatByPattern(1500, "0a")).toMatch(/1\.5\s?K/i);
    const m = formatByPattern(1_500_000, "$0.0a");
    expect(m).toContain("$");
    expect(m).toMatch(/1\.5\s?M/i);
  });

  it("honours fraction digits in a plain decimal pattern", () => {
    expect(formatByPattern(1234.5, "0,0.0")).toBe("1,234.5");
  });
});
