import { useCallback, useState } from "react";
import { useClient } from "@objectstack/client-react";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

export interface DevOpsAgentConfig {
  id: string;
  name: string;
  type: "ci_cd" | "monitoring" | "security" | "infrastructure";
  status: "active" | "paused" | "error";
  tools: string[];
  createdAt: string;
  updatedAt: string;
}

export interface DevOpsMonitoringResult {
  agentId: string;
  metrics: Array<{ name: string; value: number; unit: string; timestamp: string }>;
  alerts: Array<{ severity: "critical" | "warning" | "info"; message: string; timestamp: string }>;
  status: "healthy" | "degraded" | "down";
}

export interface SelfHealingAction {
  id: string;
  trigger: string;
  action: string;
  status: "pending" | "executing" | "completed" | "failed";
  startedAt: string;
  completedAt?: string;
}

export interface UseDevOpsAgentResult {
  /** Configured DevOps agents */
  agents: DevOpsAgentConfig[];
  /** Latest monitoring result */
  monitoring: DevOpsMonitoringResult | null;
  /** Self-healing action history */
  healingActions: SelfHealingAction[];
  /** List all DevOps agents */
  listAgents: () => Promise<DevOpsAgentConfig[]>;
  /** Get monitoring data for an agent */
  getMonitoring: (agentId: string) => Promise<DevOpsMonitoringResult>;
  /** Trigger a self-healing action */
  triggerHealing: (agentId: string, trigger: string) => Promise<SelfHealingAction>;
  /** Whether an operation is in progress */
  isLoading: boolean;
  /** Last error */
  error: Error | null;
}

/* ------------------------------------------------------------------ */
/*  Hook                                                                */
/* ------------------------------------------------------------------ */

/**
 * Hook for DevOps agent configuration and monitoring
 * via `client.ai.devops.*`.
 *
 * Satisfies spec/ai: DevOpsAgent, DevOpsTool, SelfHealingConfig schemas.
 *
 * ```ts
 * const { agents, listAgents, getMonitoring, triggerHealing } = useDevOpsAgent();
 * await listAgents();
 * ```
 */
export function useDevOpsAgent(): UseDevOpsAgentResult {
  const client = useClient();
  const [agents, setAgents] = useState<DevOpsAgentConfig[]>([]);
  const [monitoring, setMonitoring] = useState<DevOpsMonitoringResult | null>(null);
  const [healingActions, setHealingActions] = useState<SelfHealingAction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const listAgents = useCallback(async (): Promise<DevOpsAgentConfig[]> => {
    setIsLoading(true);
    setError(null);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await (client as any).ai.devops.list();
      setAgents(result);
      return result;
    } catch (err: unknown) {
      const e = err instanceof Error ? err : new Error("Failed to list DevOps agents");
      setError(e);
      throw e;
    } finally {
      setIsLoading(false);
    }
  }, [client]);

  const getMonitoring = useCallback(
    async (agentId: string): Promise<DevOpsMonitoringResult> => {
      setIsLoading(true);
      setError(null);
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result = await (client as any).ai.devops.monitor(agentId);
        setMonitoring(result);
        return result;
      } catch (err: unknown) {
        const e = err instanceof Error ? err : new Error("Failed to get monitoring data");
        setError(e);
        throw e;
      } finally {
        setIsLoading(false);
      }
    },
    [client],
  );

  const triggerHealing = useCallback(
    async (agentId: string, trigger: string): Promise<SelfHealingAction> => {
      setIsLoading(true);
      setError(null);
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result = await (client as any).ai.devops.heal({ agentId, trigger });
        setHealingActions((prev) => [result, ...prev]);
        return result;
      } catch (err: unknown) {
        const e = err instanceof Error ? err : new Error("Failed to trigger healing");
        setError(e);
        throw e;
      } finally {
        setIsLoading(false);
      }
    },
    [client],
  );

  return { agents, monitoring, healingActions, listAgents, getMonitoring, triggerHealing, isLoading, error };
}
