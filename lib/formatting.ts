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

/** Format a number as a percentage. */
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
