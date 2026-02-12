import { useCallback, useState } from "react";
import { useClient } from "@objectstack/client-react";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

export interface AuditEntry {
  id: string;
  action: string;
  object: string;
  recordId: string;
  userId: string;
  timestamp: string;
  changes?: Array<{ field: string; oldValue: unknown; newValue: unknown }>;
  metadata?: Record<string, unknown>;
}

export interface UseAuditLogResult {
  /** Fetched audit log entries */
  entries: AuditEntry[];
  /** Fetch audit log for a specific object/record */
  getAuditLog: (
    object: string,
    recordId: string,
    options?: { limit?: number; offset?: number },
  ) => Promise<AuditEntry[]>;
  /** Whether an audit log operation is in progress */
  isLoading: boolean;
  /** Last error */
  error: Error | null;
}

/* ------------------------------------------------------------------ */
/*  Hook                                                                */
/* ------------------------------------------------------------------ */

/**
 * Hook for fetching audit log entries for objects and records
 * via `client.system.audit.list()`.
 *
 * Satisfies spec/system: AuditEvent, AuditConfig schemas.
 *
 * ```ts
 * const { entries, getAuditLog, isLoading } = useAuditLog();
 * await getAuditLog("tasks", "task-123", { limit: 50 });
 * ```
 */
export function useAuditLog(): UseAuditLogResult {
  const client = useClient();
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const getAuditLog = useCallback(
    async (
      object: string,
      recordId: string,
      options?: { limit?: number; offset?: number },
    ): Promise<AuditEntry[]> => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await (client as any).system?.audit?.list({
          object,
          recordId,
          ...options,
        });
        const items: AuditEntry[] = result ?? [];
        setEntries(items);
        return items;
      } catch (err: unknown) {
        const auditError =
          err instanceof Error ? err : new Error("Failed to fetch audit log");
        setError(auditError);
        throw auditError;
      } finally {
        setIsLoading(false);
      }
    },
    [client],
  );

  return { entries, getAuditLog, isLoading, error };
}
