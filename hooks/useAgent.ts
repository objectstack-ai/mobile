import { useCallback, useState } from "react";
import { useClient } from "@objectstack/client-react";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

export interface AgentTask {
  id: string;
  status: "pending" | "running" | "completed" | "failed" | "cancelled";
  progress: number;
  result?: unknown;
  error?: string;
  agentId: string;
  createdAt: string;
}

export interface UseAgentResult {
  /** Start a new agent task */
  startTask: (
    agentId: string,
    input: Record<string, unknown>,
  ) => Promise<AgentTask>;
  /** Poll the status of an existing task */
  getTaskStatus: (taskId: string) => Promise<AgentTask>;
  /** Cancel a running task */
  cancelTask: (taskId: string) => Promise<void>;
  /** The most recently started or queried task */
  currentTask: AgentTask | null;
  /** Whether an agent operation is in progress */
  isLoading: boolean;
  /** Last error */
  error: Error | null;
}

/* ------------------------------------------------------------------ */
/*  Hook                                                                */
/* ------------------------------------------------------------------ */

/**
 * Hook for AI agent orchestration via `client.ai.agents.*`.
 *
 * Satisfies spec/ai: AgentSchema + MultiAgentGroup – start tasks,
 * poll status, and cancel running agent work.
 *
 * ```ts
 * const { startTask, getTaskStatus, cancelTask, isLoading } = useAgent();
 * const task = await startTask("summarizer", { documentId: "abc" });
 * ```
 */
export function useAgent(): UseAgentResult {
  const client = useClient();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [currentTask, setCurrentTask] = useState<AgentTask | null>(null);

  const startTask = useCallback(
    async (
      agentId: string,
      input: Record<string, unknown>,
    ): Promise<AgentTask> => {
      setIsLoading(true);
      setError(null);
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const task = await (client as any).ai.agents.startTask({
          agentId,
          input,
        });
        setCurrentTask(task);
        return task;
      } catch (err: unknown) {
        const agentError =
          err instanceof Error ? err : new Error("Failed to start agent task");
        setError(agentError);
        throw agentError;
      } finally {
        setIsLoading(false);
      }
    },
    [client],
  );

  const getTaskStatus = useCallback(
    async (taskId: string): Promise<AgentTask> => {
      setIsLoading(true);
      setError(null);
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const task = await (client as any).ai.agents.getTask(taskId);
        setCurrentTask(task);
        return task;
      } catch (err: unknown) {
        const agentError =
          err instanceof Error ? err : new Error("Failed to get task status");
        setError(agentError);
        throw agentError;
      } finally {
        setIsLoading(false);
      }
    },
    [client],
  );

  const cancelTask = useCallback(
    async (taskId: string): Promise<void> => {
      setIsLoading(true);
      setError(null);
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (client as any).ai.agents.cancelTask(taskId);
        setCurrentTask((prev) =>
          prev?.id === taskId ? { ...prev, status: "cancelled" } : prev,
        );
      } catch (err: unknown) {
        const agentError =
          err instanceof Error ? err : new Error("Failed to cancel task");
        setError(agentError);
        throw agentError;
      } finally {
        setIsLoading(false);
      }
    },
    [client],
  );

  return { startTask, getTaskStatus, cancelTask, currentTask, isLoading, error };
}
