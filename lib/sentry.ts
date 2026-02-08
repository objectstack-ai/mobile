/**
 * Sentry integration — crash reporting and performance monitoring.
 *
 * Wraps `@sentry/react-native` with app-specific configuration.
 * Call `initSentry()` once at app startup (e.g. in _layout.tsx).
 */
import * as Sentry from "@sentry/react-native";

/** Configuration options for Sentry initialisation */
export interface SentryConfig {
  /** Sentry DSN (Data Source Name) */
  dsn: string;
  /** Environment name (e.g. "production", "staging") */
  environment?: string;
  /** Release version string */
  release?: string;
  /** Sample rate for error events (0–1). Default 1.0 */
  sampleRate?: number;
  /** Sample rate for performance traces (0–1). Default 0.2 */
  tracesSampleRate?: number;
  /** Enable performance monitoring. Default true */
  enablePerformance?: boolean;
  /** Enable debug mode. Default false */
  debug?: boolean;
}

const DEFAULT_CONFIG: Partial<SentryConfig> = {
  environment: __DEV__ ? "development" : "production",
  sampleRate: 1.0,
  tracesSampleRate: 0.2,
  enablePerformance: true,
  debug: false,
};

let _initialised = false;

/**
 * Initialise Sentry with crash reporting and performance monitoring.
 * Safe to call multiple times — subsequent calls are no-ops.
 */
export function initSentry(config: SentryConfig): void {
  if (_initialised) return;

  const merged = { ...DEFAULT_CONFIG, ...config };

  Sentry.init({
    dsn: merged.dsn,
    environment: merged.environment,
    release: merged.release,
    sampleRate: merged.sampleRate,
    tracesSampleRate: merged.enablePerformance ? merged.tracesSampleRate : 0,
    debug: merged.debug,
    enableAutoSessionTracking: true,
    attachStacktrace: true,
  });

  _initialised = true;
}

/**
 * Capture an exception and send it to Sentry.
 */
export function captureException(
  error: unknown,
  context?: Record<string, unknown>,
): string {
  return Sentry.captureException(error, context ? { extra: context } : undefined);
}

/**
 * Capture a plain message.
 */
export function captureMessage(
  message: string,
  level: Sentry.SeverityLevel = "info",
): string {
  return Sentry.captureMessage(message, level);
}

/**
 * Set the current user context on all future events.
 */
export function setUser(user: { id: string; email?: string; username?: string } | null): void {
  Sentry.setUser(user);
}

/**
 * Add a breadcrumb for debugging context.
 */
export function addBreadcrumb(breadcrumb: Sentry.Breadcrumb): void {
  Sentry.addBreadcrumb(breadcrumb);
}

/**
 * Start a performance transaction span.
 * Returns a span that should be finished by calling `.end()`.
 */
export function startSpan<T>(
  options: { name: string; op?: string },
  callback: (span: Sentry.Span) => T,
): T {
  return Sentry.startSpan(options, callback);
}

/**
 * Reset initialisation state (for testing only).
 */
export function _resetForTesting(): void {
  _initialised = false;
}
