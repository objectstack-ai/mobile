import { useCallback, useRef, useState } from "react";
import { useClient } from "@objectstack/client-react";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

export interface OptimisticState<T> {
  data: T;
  pending: boolean;
  rolledBack: boolean;
}

export interface UseOptimisticUpdateResult<T> {
  /** Current optimistic data (or null when idle) */
  optimisticData: T | null;
  /** Apply an optimistic update — sets local value immediately, then syncs */
  apply: (
    object: string,
    recordId: string,
    update: Partial<T>,
    optimisticValue: T,
  ) => Promise<T>;
  /** Manually rollback to the previous value */
  rollback: () => void;
  /** Whether a server call is in flight */
  isPending: boolean;
  /** Whether the last update was rolled back */
  isRolledBack: boolean;
  /** Last error */
  error: Error | null;
}

/* ------------------------------------------------------------------ */
/*  Hook                                                                */
/* ------------------------------------------------------------------ */

/**
 * Hook for optimistic updates with automatic rollback on failure.
 *
 * ```ts
 * const { apply, optimisticData, isPending } = useOptimisticUpdate<Task>();
 * await apply("tasks", "task-1", { status: "done" }, optimisticTask);
 * ```
 */
export function useOptimisticUpdate<T>(): UseOptimisticUpdateResult<T> {
  const client = useClient();
  const [optimisticData, setOptimisticData] = useState<T | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [isRolledBack, setIsRolledBack] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const previousRef = useRef<T | null>(null);

  const apply = useCallback(
    async (
      object: string,
      recordId: string,
      update: Partial<T>,
      optimisticValue: T,
    ): Promise<T> => {
      previousRef.current = optimisticData;
      setOptimisticData(optimisticValue);
      setIsPending(true);
      setIsRolledBack(false);
      setError(null);

      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result = await (client as any).api?.update(
          object,
          recordId,
          update,
        );
        const serverData: T = result ?? optimisticValue;
        setOptimisticData(serverData);
        return serverData;
      } catch (err: unknown) {
        const updateError =
          err instanceof Error ? err : new Error("Optimistic update failed");
        setError(updateError);
        setOptimisticData(previousRef.current);
        setIsRolledBack(true);
        throw updateError;
      } finally {
        setIsPending(false);
      }
    },
    [client, optimisticData],
  );

  const rollback = useCallback(() => {
    setOptimisticData(previousRef.current);
    setIsRolledBack(true);
  }, []);

  return {
    optimisticData,
    apply,
    rollback,
    isPending,
    isRolledBack,
    error,
  };
}
