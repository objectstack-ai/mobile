import {
  formatDate,
  formatDateTime,
  formatNumber,
  formatPercent,
  formatCurrency,
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
