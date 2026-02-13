import { useCallback, useState } from "react";
import { useClient } from "@objectstack/client-react";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

export interface ETLPipeline {
  id: string;
  name: string;
  source: { type: string; config: Record<string, unknown> };
  destination: { type: string; config: Record<string, unknown> };
  transformations: Array<{ type: string; config: Record<string, unknown> }>;
  schedule?: string;
  status: "active" | "paused" | "error";
  createdAt: string;
  updatedAt: string;
}

export interface ETLPipelineRun {
  id: string;
  pipelineId: string;
  status: "running" | "completed" | "failed" | "cancelled";
  recordsProcessed: number;
  recordsFailed: number;
  startedAt: string;
  completedAt?: string;
  error?: string;
}

export interface UseETLPipelineResult {
  /** Available ETL pipelines */
  pipelines: ETLPipeline[];
  /** Runs for the currently selected pipeline */
  runs: ETLPipelineRun[];
  /** List all ETL pipelines */
  listPipelines: () => Promise<ETLPipeline[]>;
  /** Trigger a pipeline run */
  runPipeline: (pipelineId: string) => Promise<ETLPipelineRun>;
  /** Get runs for a pipeline */
  getRuns: (pipelineId: string) => Promise<ETLPipelineRun[]>;
  /** Pause a pipeline */
  pausePipeline: (pipelineId: string) => Promise<ETLPipeline>;
  /** Whether an operation is in progress */
  isLoading: boolean;
  /** Last error */
  error: Error | null;
}

/* ------------------------------------------------------------------ */
/*  Hook                                                                */
/* ------------------------------------------------------------------ */

/**
 * Hook for ETL pipeline management — list, run, monitor, and control
 * via `client.automation.etl.*`.
 *
 * Satisfies spec/automation: ETLPipeline, ETLPipelineRun, ETLSource,
 * ETLDestination, ETLTransformation schemas.
 *
 * ```ts
 * const { pipelines, listPipelines, runPipeline } = useETLPipeline();
 * await listPipelines();
 * const run = await runPipeline("pipeline-1");
 * ```
 */
export function useETLPipeline(): UseETLPipelineResult {
  const client = useClient();
  const [pipelines, setPipelines] = useState<ETLPipeline[]>([]);
  const [runs, setRuns] = useState<ETLPipelineRun[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const listPipelines = useCallback(async (): Promise<ETLPipeline[]> => {
    setIsLoading(true);
    setError(null);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await (client as any).automation.etl.list();
      setPipelines(result);
      return result;
    } catch (err: unknown) {
      const e = err instanceof Error ? err : new Error("Failed to list ETL pipelines");
      setError(e);
      throw e;
    } finally {
      setIsLoading(false);
    }
  }, [client]);

  const runPipeline = useCallback(
    async (pipelineId: string): Promise<ETLPipelineRun> => {
      setIsLoading(true);
      setError(null);
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result = await (client as any).automation.etl.run(pipelineId);
        setRuns((prev) => [result, ...prev]);
        return result;
      } catch (err: unknown) {
        const e = err instanceof Error ? err : new Error("Failed to run ETL pipeline");
        setError(e);
        throw e;
      } finally {
        setIsLoading(false);
      }
    },
    [client],
  );

  const getRuns = useCallback(
    async (pipelineId: string): Promise<ETLPipelineRun[]> => {
      setIsLoading(true);
      setError(null);
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result = await (client as any).automation.etl.runs(pipelineId);
        setRuns(result);
        return result;
      } catch (err: unknown) {
        const e = err instanceof Error ? err : new Error("Failed to get pipeline runs");
        setError(e);
        throw e;
      } finally {
        setIsLoading(false);
      }
    },
    [client],
  );

  const pausePipeline = useCallback(
    async (pipelineId: string): Promise<ETLPipeline> => {
      setIsLoading(true);
      setError(null);
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result = await (client as any).automation.etl.pause(pipelineId);
        setPipelines((prev) =>
          prev.map((p) => (p.id === pipelineId ? result : p)),
        );
        return result;
      } catch (err: unknown) {
        const e = err instanceof Error ? err : new Error("Failed to pause pipeline");
        setError(e);
        throw e;
      } finally {
        setIsLoading(false);
      }
    },
    [client],
  );

  return { pipelines, runs, listPipelines, runPipeline, getRuns, pausePipeline, isLoading, error };
}
