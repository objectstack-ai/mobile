import { useCallback, useState } from "react";
import { useClient } from "@objectstack/client-react";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

export interface AICostEntry {
  model: string;
  operation: string;
  inputTokens: number;
  outputTokens: number;
  cost: number;
  timestamp: string;
}

export interface AICostSummary {
  totalCost: number;
  totalTokens: number;
  byModel: Record<string, number>;
  period: string;
  budgetLimit?: number;
  budgetUsed?: number;
}

export interface UseAICostResult {
  /** Fetch an aggregated cost summary for a given period */
  getCostSummary: (period?: string) => Promise<AICostSummary>;
  /** Fetch detailed cost history entries */
  getCostHistory: (
    options?: { limit?: number; model?: string },
  ) => Promise<AICostEntry[]>;
  /** Set a budget limit for AI usage */
  setBudgetLimit: (limit: number, period?: string) => Promise<void>;
  /** Most recently fetched summary */
  summary: AICostSummary | null;
  /** Whether a cost operation is in progress */
  isLoading: boolean;
  /** Last error */
  error: Error | null;
}

/* ------------------------------------------------------------------ */
/*  Hook                                                                */
/* ------------------------------------------------------------------ */

/**
 * Hook for AI cost analytics and budget management via `client.ai.cost.*`.
 *
 * Satisfies spec/ai: CostAnalytics schema – retrieve cost summaries,
 * detailed history, and configure budget limits.
 *
 * ```ts
 * const { getCostSummary, setBudgetLimit, summary, isLoading } = useAICost();
 * await getCostSummary("monthly");
 * await setBudgetLimit(100, "monthly");
 * ```
 */
export function useAICost(): UseAICostResult {
  const client = useClient();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [summary, setSummary] = useState<AICostSummary | null>(null);

  const getCostSummary = useCallback(
    async (period?: string): Promise<AICostSummary> => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await (client as any).ai.cost.summary({
          ...(period ? { period } : {}),
        });
        setSummary(result);
        return result;
      } catch (err: unknown) {
        const costError =
          err instanceof Error ? err : new Error("Failed to fetch cost summary");
        setError(costError);
        throw costError;
      } finally {
        setIsLoading(false);
      }
    },
    [client],
  );

  const getCostHistory = useCallback(
    async (
      options?: { limit?: number; model?: string },
    ): Promise<AICostEntry[]> => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await (client as any).ai.cost.history({
          ...options,
        });
        return result;
      } catch (err: unknown) {
        const costError =
          err instanceof Error ? err : new Error("Failed to fetch cost history");
        setError(costError);
        throw costError;
      } finally {
        setIsLoading(false);
      }
    },
    [client],
  );

  const setBudgetLimit = useCallback(
    async (limit: number, period?: string): Promise<void> => {
      setIsLoading(true);
      setError(null);
      try {
        await (client as any).ai.cost.setBudget({
          limit,
          ...(period ? { period } : {}),
        });
        setSummary((prev) => (prev ? { ...prev, budgetLimit: limit } : prev));
      } catch (err: unknown) {
        const costError =
          err instanceof Error ? err : new Error("Failed to set budget limit");
        setError(costError);
        throw costError;
      } finally {
        setIsLoading(false);
      }
    },
    [client],
  );

  return { getCostSummary, getCostHistory, setBudgetLimit, summary, isLoading, error };
}
