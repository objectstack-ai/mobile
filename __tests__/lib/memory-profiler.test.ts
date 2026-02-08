/**
 * Tests for memory-profiler — leak detection utility
 */
import { createMemoryTracker } from "~/lib/memory-profiler";

describe("createMemoryTracker", () => {
  it("starts with no tracked entries", () => {
    const tracker = createMemoryTracker();
    expect(tracker.getTracked()).toEqual([]);
  });

  it("tracks and untracks entries", () => {
    const tracker = createMemoryTracker();
    tracker.track("Component-A");
    tracker.track("Component-B");
    expect(tracker.getTracked()).toHaveLength(2);

    tracker.untrack("Component-A");
    expect(tracker.getTracked()).toHaveLength(1);
    expect(tracker.getTracked()[0].label).toBe("Component-B");
  });

  it("track stores timestamp", () => {
    const tracker = createMemoryTracker();
    const before = Date.now();
    tracker.track("MyComponent");
    const entry = tracker.getTracked()[0];
    expect(entry.trackedAt).toBeGreaterThanOrEqual(before);
    expect(entry.trackedAt).toBeLessThanOrEqual(Date.now());
  });

  it("reportLeaks returns entries older than threshold", () => {
    const tracker = createMemoryTracker();
    tracker.track("OldComponent");

    // With threshold 0ms everything is a "leak"
    const leaks = tracker.reportLeaks(0);
    expect(leaks).toHaveLength(1);
    expect(leaks[0].label).toBe("OldComponent");
  });

  it("reportLeaks returns empty for fresh entries with high threshold", () => {
    const tracker = createMemoryTracker();
    tracker.track("FreshComponent");
    const leaks = tracker.reportLeaks(60_000);
    expect(leaks).toEqual([]);
  });

  it("disposeAll calls cleanup callbacks and clears", () => {
    const tracker = createMemoryTracker();
    const cleanup1 = jest.fn();
    const cleanup2 = jest.fn();
    tracker.track("Sub1", cleanup1);
    tracker.track("Sub2", cleanup2);

    tracker.disposeAll();
    expect(cleanup1).toHaveBeenCalledTimes(1);
    expect(cleanup2).toHaveBeenCalledTimes(1);
    expect(tracker.getTracked()).toEqual([]);
  });

  it("disposeAll handles entries without cleanup", () => {
    const tracker = createMemoryTracker();
    tracker.track("NoCleanup");
    expect(() => tracker.disposeAll()).not.toThrow();
    expect(tracker.getTracked()).toEqual([]);
  });

  it("reset clears all entries without calling cleanup", () => {
    const tracker = createMemoryTracker();
    const cleanup = jest.fn();
    tracker.track("Sub1", cleanup);
    tracker.reset();
    expect(cleanup).not.toHaveBeenCalled();
    expect(tracker.getTracked()).toEqual([]);
  });

  it("overwrites entry when tracking same label", () => {
    const tracker = createMemoryTracker();
    const cleanup1 = jest.fn();
    const cleanup2 = jest.fn();
    tracker.track("Same", cleanup1);
    tracker.track("Same", cleanup2);
    expect(tracker.getTracked()).toHaveLength(1);
    tracker.disposeAll();
    expect(cleanup1).not.toHaveBeenCalled();
    expect(cleanup2).toHaveBeenCalledTimes(1);
  });
});
