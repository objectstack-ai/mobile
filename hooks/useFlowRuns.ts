import { useQuery, useQueryClient, type UseQueryResult } from "@tanstack/react-query";
import { useClient } from "@objectstack/client-react";
import { useCallback, useState } from "react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface FlowStepLog {
  nodeId: string;
  nodeType: string;
  nodeLabel?: string;
  status: "success" | "failure" | "skipped";
  startedAt?: string;
  completedAt?: string;
  durationMs?: number;
  error?: { code?: string; message?: string };
}

/** A single flow execution, mirroring service-automation `ExecutionLogEntry`. */
export interface FlowRun {
  id: string;
  flowName: string;
  flowVersion?: number;
  status: string;
  startedAt?: string;
  completedAt?: string;
  durationMs?: number;
  trigger?: { type?: string; userId?: string; object?: string; recordId?: string };
  steps?: FlowStepLog[];
  error?: { code?: string; message?: string };
}

export interface FlowRunsResult {
  runs: FlowRun[];
  hasMore: boolean;
}

/* ------------------------------------------------------------------ */
/*  Run history                                                        */
/* ------------------------------------------------------------------ */

/**
 * List recent executions of a flow (`GET /automation/{name}/runs`). Returns an
 * empty list (not an error) when the server has no automation engine, so the UI
 * can render an empty state rather than a failure.
 */
export function useFlowRuns(
  flowName: string | undefined,
): UseQueryResult<FlowRunsResult, Error> {
  const client = useClient();
  return useQuery({
    queryKey: ["flow-runs", flowName],
    enabled: !!flowName,
    queryFn: async (): Promise<FlowRunsResult> => {
      const res = await client.automation.listRuns<{
        runs?: FlowRun[];
        hasMore?: boolean;
      }>(flowName!, { limit: 25 });
      return { runs: res?.runs ?? [], hasMore: res?.hasMore ?? false };
    },
  });
}

/** Fetch a single run with its step log (`GET /automation/{name}/runs/{id}`). */
export function useFlowRun(
  flowName: string | undefined,
  runId: string | undefined,
): UseQueryResult<FlowRun | null, Error> {
  const client = useClient();
  return useQuery({
    queryKey: ["flow-run", flowName, runId],
    enabled: !!flowName && !!runId,
    queryFn: async () => (await client.automation.getRun<FlowRun>(flowName!, runId!)) ?? null,
  });
}

/* ------------------------------------------------------------------ */
/*  Trigger                                                            */
/* ------------------------------------------------------------------ */

export interface TriggerResult {
  ok: boolean;
  error?: string;
  data?: unknown;
}

/**
 * Run a flow on demand (`POST /automation/{name}/trigger`). The engine wraps the
 * handler result, so an HTTP 200 can still carry `{ success: false, error }` —
 * surface that as a failure rather than reporting a false success.
 */
export function useTriggerFlow(): {
  trigger: (flowName: string, ctx?: Record<string, unknown>) => Promise<TriggerResult>;
  isTriggering: boolean;
} {
  const client = useClient();
  const queryClient = useQueryClient();
  const [isTriggering, setIsTriggering] = useState(false);

  const trigger = useCallback(
    async (flowName: string, ctx?: Record<string, unknown>): Promise<TriggerResult> => {
      setIsTriggering(true);
      try {
        const data = await client.automation.execute<unknown>(flowName, ctx ?? {});
        // Unwrapped handler result may itself signal a logical failure.
        const inner = data as { success?: boolean; error?: string } | null;
        if (inner && inner.success === false) {
          return { ok: false, error: inner.error ?? "Flow execution failed", data };
        }
        return { ok: true, data };
      } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : "Flow execution failed" };
      } finally {
        setIsTriggering(false);
        // Refresh the run history regardless of outcome.
        void queryClient.invalidateQueries({ queryKey: ["flow-runs", flowName] });
      }
    },
    [client, queryClient],
  );

  return { trigger, isTriggering };
}
