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
  skipped: number;
}

export interface BatchResult {
  succeeded: number;
  failed: number;
  skipped: number;
  errors: Array<{ index: number; recordId?: string; message: string }>;
}

/* ------------------------------------------------------------------ */
/*  Hook                                                                */
/* ------------------------------------------------------------------ */

/**
 * Hook for executing batch create/update/delete operations.
 *
 * Uses SDK-native `client.data.batch()`, `createMany()`, and `deleteMany()`
 * for optimal performance.  Falls back to sequential execution when the
 * batch contains mixed operation types.
 *
 * Provides progress tracking and partial-failure reporting including
 * succeeded / failed / skipped counts.
 */
export function useBatchOperations(objectName: string) {
  const client = useClient();
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<BatchProgress>({ total: 0, completed: 0, failed: 0, skipped: 0 });
  const [lastResult, setLastResult] = useState<BatchResult | null>(null);

  /**
   * Execute a batch of mixed operations using `client.data.batch()`.
   *
   * Items that lack required fields (e.g. update/delete without recordId)
   * are counted as "skipped".
   */
  const executeBatch = useCallback(
    async (items: BatchItem[]): Promise<BatchResult> => {
      setIsProcessing(true);
      setLastResult(null);

      const result: BatchResult = { succeeded: 0, failed: 0, skipped: 0, errors: [] };

      // Separate valid items from skipped ones
      const validOps: Array<{ index: number; op: Record<string, unknown> }> = [];
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if ((item.operation === "update" || item.operation === "delete") && !item.recordId) {
          result.skipped++;
          continue;
        }
        validOps.push({
          index: i,
          op: {
            operation: item.operation,
            object: objectName,
            ...(item.recordId ? { id: item.recordId } : {}),
            ...(item.data ? { data: item.data } : {}),
          },
        });
      }

      const total = items.length;
      setProgress({ total, completed: result.skipped, failed: 0, skipped: result.skipped });

      if (validOps.length === 0) {
        setIsProcessing(false);
        setLastResult(result);
        return result;
      }

      try {
        const batchPayload = validOps.map((v) => v.op);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const response = await (client.data as any).batch(batchPayload);

        // Parse batch response — SDK returns an array of results
        const results: Array<{ success?: boolean; error?: string }> =
          Array.isArray(response) ? response : response?.results ?? [];

        for (let i = 0; i < results.length; i++) {
          const r = results[i];
          if (r?.error || r?.success === false) {
            result.failed++;
            result.errors.push({
              index: validOps[i].index,
              recordId: items[validOps[i].index].recordId,
              message: r?.error ?? "Operation failed",
            });
          } else {
            result.succeeded++;
          }
          setProgress({
            total,
            completed: result.succeeded + result.failed + result.skipped,
            failed: result.failed,
            skipped: result.skipped,
          });
        }

        // If SDK returned fewer results than ops, count remainder as failed
        if (results.length < validOps.length) {
          const missing = validOps.length - results.length;
          result.failed += missing;
          result.errors.push({
            index: validOps[results.length]?.index ?? 0,
            message: `Server returned ${results.length} results for ${validOps.length} operations`,
          });
        }
      } catch (err: unknown) {
        // Batch call itself failed — mark all remaining as failed
        result.failed += validOps.length;
        result.errors.push({
          index: 0,
          message: err instanceof Error ? err.message : "Batch operation failed",
        });
      }

      setProgress({
        total,
        completed: total,
        failed: result.failed,
        skipped: result.skipped,
      });
      setIsProcessing(false);
      setLastResult(result);
      return result;
    },
    [client, objectName],
  );

  /**
   * Batch create records using SDK-native `client.data.createMany()`.
   */
  const batchCreate = useCallback(
    async (dataItems: Record<string, unknown>[]): Promise<BatchResult> => {
      setIsProcessing(true);
      setLastResult(null);

      const total = dataItems.length;
      const result: BatchResult = { succeeded: 0, failed: 0, skipped: 0, errors: [] };
      setProgress({ total, completed: 0, failed: 0, skipped: 0 });

      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const response = await (client.data as any).createMany(objectName, dataItems);
        const created: unknown[] = Array.isArray(response)
          ? response
          : response?.records ?? response?.created ?? [];
        result.succeeded = created.length;
        result.failed = total - created.length;
      } catch (err: unknown) {
        result.failed = total;
        result.errors.push({
          index: 0,
          message: err instanceof Error ? err.message : "Batch create failed",
        });
      }

      setProgress({ total, completed: total, failed: result.failed, skipped: 0 });
      setIsProcessing(false);
      setLastResult(result);
      return result;
    },
    [client, objectName],
  );

  /**
   * Batch delete records using SDK-native `client.data.deleteMany()`.
   */
  const batchDelete = useCallback(
    async (recordIds: string[]): Promise<BatchResult> => {
      setIsProcessing(true);
      setLastResult(null);

      const total = recordIds.length;
      const result: BatchResult = { succeeded: 0, failed: 0, skipped: 0, errors: [] };
      setProgress({ total, completed: 0, failed: 0, skipped: 0 });

      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const response = await (client.data as any).deleteMany(objectName, recordIds);
        const deleted: number =
          typeof response === "number"
            ? response
            : response?.deleted ?? response?.count ?? total;
        result.succeeded = deleted;
        result.failed = total - deleted;
      } catch (err: unknown) {
        result.failed = total;
        result.errors.push({
          index: 0,
          message: err instanceof Error ? err.message : "Batch delete failed",
        });
      }

      setProgress({ total, completed: total, failed: result.failed, skipped: 0 });
      setIsProcessing(false);
      setLastResult(result);
      return result;
    },
    [client, objectName],
  );

  /**
   * Batch update records with the same data patch.
   *
   * Uses `client.data.batch()` under the hood since there is no
   * dedicated `updateMany` with a shared patch in the SDK.
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
    batchCreate,
    batchDelete,
    batchUpdate,
    isProcessing,
    progress,
    lastResult,
  };
}
