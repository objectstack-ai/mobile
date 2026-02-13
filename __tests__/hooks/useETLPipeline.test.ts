/**
 * Tests for useETLPipeline – validates ETL pipeline
 * listing, running, monitoring, and control operations.
 */
import { renderHook, act } from "@testing-library/react-native";

/* ---- Mock useClient from SDK ---- */
const mockList = jest.fn();
const mockRun = jest.fn();
const mockRuns = jest.fn();
const mockPause = jest.fn();

const mockClient = {
  automation: { etl: { list: mockList, run: mockRun, runs: mockRuns, pause: mockPause } },
};

jest.mock("@objectstack/client-react", () => ({
  useClient: () => mockClient,
}));

import { useETLPipeline } from "~/hooks/useETLPipeline";

beforeEach(() => {
  mockList.mockReset();
  mockRun.mockReset();
  mockRuns.mockReset();
  mockPause.mockReset();
});

describe("useETLPipeline", () => {
  it("lists ETL pipelines", async () => {
    const pipelines = [
      { id: "pipe-1", name: "Salesforce Sync", source: { type: "salesforce", config: {} }, destination: { type: "postgres", config: {} }, transformations: [], status: "active", createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
    ];
    mockList.mockResolvedValue(pipelines);

    const { result } = renderHook(() => useETLPipeline());

    let listed: unknown;
    await act(async () => {
      listed = await result.current.listPipelines();
    });

    expect(mockList).toHaveBeenCalled();
    expect(listed).toEqual(pipelines);
    expect(result.current.pipelines).toEqual(pipelines);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("triggers a pipeline run", async () => {
    const run = {
      id: "run-1",
      pipelineId: "pipe-1",
      status: "running",
      recordsProcessed: 0,
      recordsFailed: 0,
      startedAt: "2026-01-01T00:00:00Z",
    };
    mockRun.mockResolvedValue(run);

    const { result } = renderHook(() => useETLPipeline());

    let started: unknown;
    await act(async () => {
      started = await result.current.runPipeline("pipe-1");
    });

    expect(mockRun).toHaveBeenCalledWith("pipe-1");
    expect(started).toEqual(run);
    expect(result.current.runs).toContainEqual(run);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("gets runs for a pipeline", async () => {
    const runs = [
      { id: "run-1", pipelineId: "pipe-1", status: "completed", recordsProcessed: 1000, recordsFailed: 2, startedAt: "2026-01-01T00:00:00Z", completedAt: "2026-01-01T00:10:00Z" },
      { id: "run-2", pipelineId: "pipe-1", status: "failed", recordsProcessed: 500, recordsFailed: 500, startedAt: "2026-01-02T00:00:00Z", completedAt: "2026-01-02T00:05:00Z", error: "Connection timeout" },
    ];
    mockRuns.mockResolvedValue(runs);

    const { result } = renderHook(() => useETLPipeline());

    let fetched: unknown;
    await act(async () => {
      fetched = await result.current.getRuns("pipe-1");
    });

    expect(mockRuns).toHaveBeenCalledWith("pipe-1");
    expect(fetched).toEqual(runs);
    expect(result.current.runs).toEqual(runs);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("pauses a pipeline", async () => {
    const paused = { id: "pipe-1", name: "Salesforce Sync", source: { type: "salesforce", config: {} }, destination: { type: "postgres", config: {} }, transformations: [], status: "paused", createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-03T00:00:00Z" };
    mockPause.mockResolvedValue(paused);
    mockList.mockResolvedValue([
      { id: "pipe-1", name: "Salesforce Sync", source: { type: "salesforce", config: {} }, destination: { type: "postgres", config: {} }, transformations: [], status: "active", createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
    ]);

    const { result } = renderHook(() => useETLPipeline());

    await act(async () => {
      await result.current.listPipelines();
    });

    let updated: unknown;
    await act(async () => {
      updated = await result.current.pausePipeline("pipe-1");
    });

    expect(mockPause).toHaveBeenCalledWith("pipe-1");
    expect(updated).toEqual(paused);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("handles list error", async () => {
    mockList.mockRejectedValue(new Error("Failed to list ETL pipelines"));

    const { result } = renderHook(() => useETLPipeline());

    await act(async () => {
      await expect(result.current.listPipelines()).rejects.toThrow("Failed to list ETL pipelines");
    });

    expect(result.current.error?.message).toBe("Failed to list ETL pipelines");
  });

  it("handles run error", async () => {
    mockRun.mockRejectedValue(new Error("Failed to run ETL pipeline"));

    const { result } = renderHook(() => useETLPipeline());

    await act(async () => {
      await expect(result.current.runPipeline("pipe-1")).rejects.toThrow("Failed to run ETL pipeline");
    });

    expect(result.current.error?.message).toBe("Failed to run ETL pipeline");
  });
});
