import { useCallback, useState } from "react";
import { useClient } from "@objectstack/client-react";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

export interface RLSPolicy {
  id: string;
  object: string;
  name: string;
  operation: "select" | "insert" | "update" | "delete" | "all";
  condition: string;
  enabled: boolean;
}

export interface RLSEvaluation {
  allowed: boolean;
  appliedPolicies: string[];
  deniedBy?: string;
}

export interface UseRLSResult {
  /** Cached RLS policies from the last fetch */
  policies: RLSPolicy[];
  /** Fetch RLS policies for a given object */
  getPolicies: (object: string) => Promise<RLSPolicy[]>;
  /** Evaluate RLS for a specific record and operation */
  evaluate: (object: string, recordId: string, operation?: string) => Promise<RLSEvaluation>;
  /** Whether an RLS operation is in progress */
  isLoading: boolean;
  /** Last error */
  error: Error | null;
}

/* ------------------------------------------------------------------ */
/*  Hook                                                                */
/* ------------------------------------------------------------------ */

/**
 * Hook for Row-Level Security awareness per spec/security RLS,
 * RowLevelSecurityPolicy, and RLSConfig schemas.
 *
 * Wraps `client.security.rls.*` with React state management.
 *
 * ```ts
 * const { policies, getPolicies, evaluate, isLoading } = useRLS();
 * const list = await getPolicies("Account");
 * const result = await evaluate("Account", "001", "select");
 * ```
 */
export function useRLS(): UseRLSResult {
  const client = useClient();
  const [policies, setPolicies] = useState<RLSPolicy[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const getPolicies = useCallback(
    async (object: string): Promise<RLSPolicy[]> => {
      setIsLoading(true);
      setError(null);
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result = await (client as any).security?.rls?.list({ object });
        const list: RLSPolicy[] = result ?? [];
        setPolicies(list);
        return list;
      } catch (err: unknown) {
        const rlsError =
          err instanceof Error ? err : new Error("Failed to fetch RLS policies");
        setError(rlsError);
        throw rlsError;
      } finally {
        setIsLoading(false);
      }
    },
    [client],
  );

  const evaluate = useCallback(
    async (
      object: string,
      recordId: string,
      operation?: string,
    ): Promise<RLSEvaluation> => {
      setIsLoading(true);
      setError(null);
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return await (client as any).security?.rls?.evaluate({
          object,
          recordId,
          ...(operation ? { operation } : {}),
        });
      } catch (err: unknown) {
        const evalError =
          err instanceof Error ? err : new Error("RLS evaluation failed");
        setError(evalError);
        throw evalError;
      } finally {
        setIsLoading(false);
      }
    },
    [client],
  );

  return { policies, getPolicies, evaluate, isLoading, error };
}
