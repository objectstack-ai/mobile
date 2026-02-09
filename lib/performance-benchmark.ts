/**
 * Performance benchmarking — measure and report app performance metrics.
 *
 * Provides utilities for tracking render times, API response latency,
 * app startup duration, and memory thresholds.  Results are collected
 * into a structured report that can be used in CI or manual audits.
 */

/** A single benchmark measurement */
export interface BenchmarkMeasurement {
  /** Metric name (e.g. "api_response", "screen_render") */
  name: string;
  /** Duration in milliseconds */
  durationMs: number;
  /** ISO-8601 timestamp of measurement */
  timestamp: string;
  /** Pass / fail against threshold */
  passed: boolean;
  /** The threshold that was applied (ms), if any */
  thresholdMs?: number;
  /** Additional context */
  metadata?: Record<string, unknown>;
}

/** Default thresholds (ms) for common mobile operations */
export interface PerformanceThresholds {
  /** Max acceptable app cold-start time */
  appStartup: number;
  /** Max acceptable screen transition / render */
  screenRender: number;
  /** Max acceptable API round-trip */
  apiResponse: number;
  /** Max acceptable list scroll frame time (16.67 ms = 60 fps) */
  frameTime: number;
  /** Max acceptable image load time */
  imageLoad: number;
}

export const DEFAULT_THRESHOLDS: PerformanceThresholds = {
  appStartup: 3000,
  screenRender: 500,
  apiResponse: 2000,
  frameTime: 16.67,
  imageLoad: 1000,
};

/** Aggregate benchmark report */
export interface BenchmarkReport {
  /** Measurements collected */
  measurements: BenchmarkMeasurement[];
  /** Thresholds used */
  thresholds: PerformanceThresholds;
  /** Number of measurements that passed */
  passedCount: number;
  /** Number of measurements that failed */
  failedCount: number;
  /** Overall pass rate (0–1) */
  passRate: number;
  /** Timestamp of report generation */
  generatedAt: string;
}

export interface PerformanceBenchmark {
  /** Record a measurement against a named threshold category */
  measure: (
    name: string,
    durationMs: number,
    category?: keyof PerformanceThresholds,
    metadata?: Record<string, unknown>,
  ) => BenchmarkMeasurement;

  /** Time a synchronous function and record its duration */
  timeSync: <T>(
    name: string,
    fn: () => T,
    category?: keyof PerformanceThresholds,
  ) => { result: T; measurement: BenchmarkMeasurement };

  /** Time an asynchronous function and record its duration */
  timeAsync: <T>(
    name: string,
    fn: () => Promise<T>,
    category?: keyof PerformanceThresholds,
  ) => Promise<{ result: T; measurement: BenchmarkMeasurement }>;

  /** Get all collected measurements */
  getMeasurements: () => BenchmarkMeasurement[];

  /** Generate the aggregate report */
  getReport: () => BenchmarkReport;

  /** Reset all measurements */
  reset: () => void;
}

/**
 * Create a performance benchmark instance with optional custom thresholds.
 */
export function createPerformanceBenchmark(
  thresholds: Partial<PerformanceThresholds> = {},
): PerformanceBenchmark {
  const merged: PerformanceThresholds = { ...DEFAULT_THRESHOLDS, ...thresholds };
  const measurements: BenchmarkMeasurement[] = [];

  function measure(
    name: string,
    durationMs: number,
    category?: keyof PerformanceThresholds,
    metadata?: Record<string, unknown>,
  ): BenchmarkMeasurement {
    const thresholdMs = category ? merged[category] : undefined;
    const passed = thresholdMs === undefined ? true : durationMs <= thresholdMs;

    const measurement: BenchmarkMeasurement = {
      name,
      durationMs,
      timestamp: new Date().toISOString(),
      passed,
      thresholdMs,
      metadata,
    };

    measurements.push(measurement);
    return measurement;
  }

  function timeSync<T>(
    name: string,
    fn: () => T,
    category?: keyof PerformanceThresholds,
  ): { result: T; measurement: BenchmarkMeasurement } {
    const start = Date.now();
    const result = fn();
    const durationMs = Date.now() - start;
    const measurement = measure(name, durationMs, category);
    return { result, measurement };
  }

  async function timeAsync<T>(
    name: string,
    fn: () => Promise<T>,
    category?: keyof PerformanceThresholds,
  ): Promise<{ result: T; measurement: BenchmarkMeasurement }> {
    const start = Date.now();
    const result = await fn();
    const durationMs = Date.now() - start;
    const measurement = measure(name, durationMs, category);
    return { result, measurement };
  }

  function getMeasurements(): BenchmarkMeasurement[] {
    return [...measurements];
  }

  function getReport(): BenchmarkReport {
    const passedCount = measurements.filter((m) => m.passed).length;
    const failedCount = measurements.length - passedCount;
    const passRate = measurements.length > 0 ? passedCount / measurements.length : 1;

    return {
      measurements: [...measurements],
      thresholds: { ...merged },
      passedCount,
      failedCount,
      passRate,
      generatedAt: new Date().toISOString(),
    };
  }

  function reset(): void {
    measurements.length = 0;
  }

  return { measure, timeSync, timeAsync, getMeasurements, getReport, reset };
}
