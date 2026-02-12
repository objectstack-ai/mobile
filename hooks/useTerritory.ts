import { useCallback, useState } from "react";
import { useClient } from "@objectstack/client-react";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

export interface Territory {
  id: string;
  name: string;
  parentId?: string;
  type: string;
  description?: string;
}

export interface TerritoryAssignment {
  recordId: string;
  territoryId: string;
  assignedAt: string;
}

export interface UseTerritoryResult {
  /** Cached territories from the last fetch */
  territories: Territory[];
  /** Fetch all territories */
  getTerritories: () => Promise<Territory[]>;
  /** Fetch territory assignments for a specific record */
  getRecordTerritories: (object: string, recordId: string) => Promise<TerritoryAssignment[]>;
  /** Assign a record to a territory */
  assignTerritory: (object: string, recordId: string, territoryId: string) => Promise<void>;
  /** Remove a record from a territory */
  removeTerritory: (object: string, recordId: string, territoryId: string) => Promise<void>;
  /** Whether a territory operation is in progress */
  isLoading: boolean;
  /** Last error */
  error: Error | null;
}

/* ------------------------------------------------------------------ */
/*  Hook                                                                */
/* ------------------------------------------------------------------ */

/**
 * Hook for territory management per spec/security Territory and
 * TerritoryModel schemas.
 *
 * Wraps `client.security.territories.*` with React state management.
 *
 * ```ts
 * const { getTerritories, assignTerritory, removeTerritory, isLoading } = useTerritory();
 * const list = await getTerritories();
 * await assignTerritory("Account", "001", "t1");
 * await removeTerritory("Account", "001", "t1");
 * ```
 */
export function useTerritory(): UseTerritoryResult {
  const client = useClient();
  const [territories, setTerritories] = useState<Territory[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const getTerritories = useCallback(async (): Promise<Territory[]> => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await (client as any).security?.territories?.list();
      const list: Territory[] = result ?? [];
      setTerritories(list);
      return list;
    } catch (err: unknown) {
      const territoryError =
        err instanceof Error ? err : new Error("Failed to fetch territories");
      setError(territoryError);
      throw territoryError;
    } finally {
      setIsLoading(false);
    }
  }, [client]);

  const getRecordTerritories = useCallback(
    async (object: string, recordId: string): Promise<TerritoryAssignment[]> => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await (client as any).security?.territories?.getAssignments({
          object,
          recordId,
        });
        return (result as TerritoryAssignment[]) ?? [];
      } catch (err: unknown) {
        const assignError =
          err instanceof Error ? err : new Error("Failed to fetch territory assignments");
        setError(assignError);
        throw assignError;
      } finally {
        setIsLoading(false);
      }
    },
    [client],
  );

  const assignTerritory = useCallback(
    async (
      object: string,
      recordId: string,
      territoryId: string,
    ): Promise<void> => {
      setIsLoading(true);
      setError(null);
      try {
        await (client as any).security?.territories?.assign({
          object,
          recordId,
          territoryId,
        });
      } catch (err: unknown) {
        const assignError =
          err instanceof Error ? err : new Error("Territory assignment failed");
        setError(assignError);
        throw assignError;
      } finally {
        setIsLoading(false);
      }
    },
    [client],
  );

  const removeTerritory = useCallback(
    async (
      object: string,
      recordId: string,
      territoryId: string,
    ): Promise<void> => {
      setIsLoading(true);
      setError(null);
      try {
        await (client as any).security?.territories?.remove({
          object,
          recordId,
          territoryId,
        });
      } catch (err: unknown) {
        const removeError =
          err instanceof Error ? err : new Error("Territory removal failed");
        setError(removeError);
        throw removeError;
      } finally {
        setIsLoading(false);
      }
    },
    [client],
  );

  return {
    territories,
    getTerritories,
    getRecordTerritories,
    assignTerritory,
    removeTerritory,
    isLoading,
    error,
  };
}
