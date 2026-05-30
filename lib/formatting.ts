/**
 * Locale-aware formatting utilities for dates, numbers, and currencies.
 *
 * Uses the Intl API so the output respects the currently active i18n language.
 */

import i18n from "./i18n";

/* ------------------------------------------------------------------ */
/*  Internal helper                                                     */
/* ------------------------------------------------------------------ */

function getLocale(): string {
  return i18n.language ?? "en";
}

/* ------------------------------------------------------------------ */
/*  Date formatting                                                     */
/* ------------------------------------------------------------------ */

export interface DateFormatOptions {
  style?: "short" | "medium" | "long" | "full";
}

const dateStyles: Record<string, Intl.DateTimeFormatOptions> = {
  short: { year: "numeric", month: "numeric", day: "numeric" },
  medium: { year: "numeric", month: "short", day: "numeric" },
  long: { year: "numeric", month: "long", day: "numeric" },
  full: { weekday: "long", year: "numeric", month: "long", day: "numeric" },
};

/** Format a Date (or ISO string) for display in the current locale. */
export function formatDate(
  value: Date | string | number,
  opts: DateFormatOptions = {},
): string {
  const date = value instanceof Date ? value : new Date(value);
  if (isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat(getLocale(), dateStyles[opts.style ?? "medium"]).format(date);
}

/** Format a Date with time component. */
export function formatDateTime(
  value: Date | string | number,
  opts: DateFormatOptions = {},
): string {
  const date = value instanceof Date ? value : new Date(value);
  if (isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat(getLocale(), {
    ...dateStyles[opts.style ?? "medium"],
    hour: "numeric",
    minute: "numeric",
  }).format(date);
}

/* ------------------------------------------------------------------ */
/*  Number formatting                                                   */
/* ------------------------------------------------------------------ */

export interface NumberFormatOptions {
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
}

/** Format a number in the current locale. */
export function formatNumber(
  value: number,
  opts: NumberFormatOptions = {},
): string {
  return new Intl.NumberFormat(getLocale(), opts).format(value);
}

/** Format a number as a percentage. Expects a whole number (e.g. 50 → "50%"). */
export function formatPercent(value: number): string {
  return new Intl.NumberFormat(getLocale(), {
    style: "percent",
    maximumFractionDigits: 2,
  }).format(value / 100);
}

/* ------------------------------------------------------------------ */
/*  Currency formatting                                                 */
/* ------------------------------------------------------------------ */

export interface CurrencyFormatOptions {
  currency?: string;
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
}

/** Format a number as currency in the current locale. */
export function formatCurrency(
  value: number,
  opts: CurrencyFormatOptions = {},
): string {
  return new Intl.NumberFormat(getLocale(), {
    style: "currency",
    currency: opts.currency ?? "USD",
    minimumFractionDigits: opts.minimumFractionDigits,
    maximumFractionDigits: opts.maximumFractionDigits,
  }).format(value);
}

/* ------------------------------------------------------------------ */
/*  Pattern-driven formatting                                           */
/* ------------------------------------------------------------------ */

/**
 * Format a number against a numeral.js-style pattern string as published by
 * dashboard widget `chartConfig.format` (e.g. `"$0,0"`, `"$0,0.00"`, `"0,0"`,
 * `"0.0%"`, `"$0.0a"` for abbreviated). Only the features the platform actually
 * emits are honoured; an unrecognized pattern falls back to a grouped number.
 */
export function formatByPattern(value: number, pattern?: string): string {
  if (!isFinite(value)) return "—";
  if (!pattern) return formatNumber(value);

  const isCurrency = pattern.includes("$");
  const isPercent = pattern.includes("%");
  const isAbbrev = /a\b|a$/.test(pattern);

  // Decimal places: count the digits after the dot in the pattern.
  const dot = pattern.indexOf(".");
  const fractionDigits = dot >= 0 ? (pattern.slice(dot + 1).match(/0/g)?.length ?? 0) : 0;

  if (isPercent) {
    return new Intl.NumberFormat(getLocale(), {
      style: "percent",
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    }).format(value / 100);
  }

  if (isAbbrev) {
    return new Intl.NumberFormat(getLocale(), {
      notation: "compact",
      maximumFractionDigits: fractionDigits || 1,
      ...(isCurrency ? { style: "currency", currency: "USD" } : {}),
    }).format(value);
  }

  if (isCurrency) {
    return formatCurrency(value, {
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    });
  }

  return formatNumber(value, {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits || undefined,
  });
}
