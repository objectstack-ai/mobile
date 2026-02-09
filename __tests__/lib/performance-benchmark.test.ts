/**
 * Tests for lib/performance-benchmark — performance measurement utility
 */
import {
  createPerformanceBenchmark,
  DEFAULT_THRESHOLDS,
} from "~/lib/performance-benchmark";

describe("createPerformanceBenchmark", () => {
  it("starts with no measurements", () => {
    const bench = createPerformanceBenchmark();
    expect(bench.getMeasurements()).toEqual([]);
  });

  describe("measure", () => {
    it("records a measurement without a category", () => {
      const bench = createPerformanceBenchmark();
      const m = bench.measure("custom-op", 150);

      expect(m.name).toBe("custom-op");
      expect(m.durationMs).toBe(150);
      expect(m.passed).toBe(true); // no threshold → always pass
      expect(m.thresholdMs).toBeUndefined();
      expect(bench.getMeasurements()).toHaveLength(1);
    });

    it("passes when duration is within threshold", () => {
      const bench = createPerformanceBenchmark();
      const m = bench.measure("fast-api", 500, "apiResponse");

      expect(m.passed).toBe(true);
      expect(m.thresholdMs).toBe(DEFAULT_THRESHOLDS.apiResponse);
    });

    it("fails when duration exceeds threshold", () => {
      const bench = createPerformanceBenchmark();
      const m = bench.measure("slow-api", 5000, "apiResponse");

      expect(m.passed).toBe(false);
      expect(m.thresholdMs).toBe(DEFAULT_THRESHOLDS.apiResponse);
    });

    it("passes at exactly the threshold boundary", () => {
      const bench = createPerformanceBenchmark();
      const m = bench.measure("exact", DEFAULT_THRESHOLDS.screenRender, "screenRender");

      expect(m.passed).toBe(true);
    });

    it("records metadata", () => {
      const bench = createPerformanceBenchmark();
      const m = bench.measure("op", 100, undefined, { screen: "Home" });

      expect(m.metadata).toEqual({ screen: "Home" });
    });

    it("respects custom thresholds", () => {
      const bench = createPerformanceBenchmark({ apiResponse: 100 });
      const m = bench.measure("fast-but-over", 150, "apiResponse");

      expect(m.passed).toBe(false);
      expect(m.thresholdMs).toBe(100);
    });
  });

  describe("timeSync", () => {
    it("times a synchronous function and records measurement", () => {
      const bench = createPerformanceBenchmark();
      const { result, measurement } = bench.timeSync("compute", () => 42);

      expect(result).toBe(42);
      expect(measurement.name).toBe("compute");
      expect(measurement.durationMs).toBeGreaterThanOrEqual(0);
      expect(measurement.passed).toBe(true);
      expect(bench.getMeasurements()).toHaveLength(1);
    });

    it("applies the given category threshold", () => {
      const bench = createPerformanceBenchmark({ screenRender: 0 });
      const { measurement } = bench.timeSync(
        "slow-render",
        () => {
          // simulate some work
          let sum = 0;
          for (let i = 0; i < 1000; i++) sum += i;
          return sum;
        },
        "screenRender",
      );

      // The threshold is 0ms so practically any execution will fail
      expect(measurement.thresholdMs).toBe(0);
    });
  });

  describe("timeAsync", () => {
    it("times an async function and records measurement", async () => {
      const bench = createPerformanceBenchmark();
      const { result, measurement } = await bench.timeAsync(
        "async-op",
        async () => "done",
      );

      expect(result).toBe("done");
      expect(measurement.name).toBe("async-op");
      expect(measurement.durationMs).toBeGreaterThanOrEqual(0);
      expect(bench.getMeasurements()).toHaveLength(1);
    });
  });

  describe("getReport", () => {
    it("returns correct aggregate report", () => {
      const bench = createPerformanceBenchmark();
      bench.measure("pass1", 100, "apiResponse");
      bench.measure("pass2", 200, "apiResponse");
      bench.measure("fail1", 5000, "apiResponse");

      const report = bench.getReport();

      expect(report.measurements).toHaveLength(3);
      expect(report.passedCount).toBe(2);
      expect(report.failedCount).toBe(1);
      expect(report.passRate).toBeCloseTo(2 / 3);
      expect(report.thresholds).toEqual(DEFAULT_THRESHOLDS);
      expect(report.generatedAt).toBeTruthy();
    });

    it("returns 100% pass rate with no measurements", () => {
      const bench = createPerformanceBenchmark();
      const report = bench.getReport();

      expect(report.passRate).toBe(1);
      expect(report.passedCount).toBe(0);
      expect(report.failedCount).toBe(0);
    });
  });

  describe("reset", () => {
    it("clears all measurements", () => {
      const bench = createPerformanceBenchmark();
      bench.measure("a", 10);
      bench.measure("b", 20);
      expect(bench.getMeasurements()).toHaveLength(2);

      bench.reset();
      expect(bench.getMeasurements()).toEqual([]);
    });
  });
});
