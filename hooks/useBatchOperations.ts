import { useCallback, useState } from "react";
import { useClient } from "@objectstack/client-react";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

export type BatchOperation = "create" | "update" | "delete";

export interface BatchItem {
  operation: BatchOperation;
  recordId?: string;
  data?: Record<string, unknown>;
}

export interface BatchProgress {
  total: number;
  completed: number;
  failed: number;
}

export interface BatchResult {
  succeeded: number;
  failed: number;
  errors: Array<{ index: number; recordId?: string; message: string }>;
}

/* ------------------------------------------------------------------ */
/*  Hook                                                                */
/* ------------------------------------------------------------------ */

/**
 * Hook for executing batch create/update/delete operations.
 *
 * Provides progress tracking and partial-failure reporting.
 */
export function useBatchOperations(objectName: string) {
  const client = useClient();
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<BatchProgress>({ total: 0, completed: 0, failed: 0 });
  const [lastResult, setLastResult] = useState<BatchResult | null>(null);

  /**
   * Execute a batch of operations sequentially with progress tracking.
   */
  const executeBatch = useCallback(
    async (items: BatchItem[]): Promise<BatchResult> => {
      setIsProcessing(true);
      setProgress({ total: items.length, completed: 0, failed: 0 });
      setLastResult(null);

      const result: BatchResult = { succeeded: 0, failed: 0, errors: [] };

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        try {
          switch (item.operation) {
            case "create":
              await client.data.create(objectName, item.data ?? {});
              break;
            case "update":
              if (item.recordId) {
                await client.data.update(objectName, item.recordId, item.data ?? {});
              }
              break;
            case "delete":
              if (item.recordId) {
                await client.data.delete(objectName, item.recordId);
              }
              break;
          }
          result.succeeded++;
        } catch (err: unknown) {
          result.failed++;
          result.errors.push({
            index: i,
            recordId: item.recordId,
            message: err instanceof Error ? err.message : "Unknown error",
          });
        }

        setProgress({
          total: items.length,
          completed: result.succeeded + result.failed,
          failed: result.failed,
        });
      }

      setIsProcessing(false);
      setLastResult(result);
      return result;
    },
    [client, objectName],
  );

  /**
   * Batch delete a list of record IDs.
   */
  const batchDelete = useCallback(
    async (recordIds: string[]): Promise<BatchResult> => {
      return executeBatch(
        recordIds.map((id) => ({ operation: "delete" as const, recordId: id })),
      );
    },
    [executeBatch],
  );

  /**
   * Batch update records with the same data patch.
   */
  const batchUpdate = useCallback(
    async (recordIds: string[], data: Record<string, unknown>): Promise<BatchResult> => {
      return executeBatch(
        recordIds.map((id) => ({ operation: "update" as const, recordId: id, data })),
      );
    },
    [executeBatch],
  );

  return {
    executeBatch,
    batchDelete,
    batchUpdate,
    isProcessing,
    progress,
    lastResult,
  };
}
