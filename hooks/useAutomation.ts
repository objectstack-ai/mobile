import { useCallback, useState } from "react";
import { useClient } from "@objectstack/client-react";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

export interface AutomationTriggerResult {
  success: boolean;
  executionId?: string;
  message?: string;
  data?: Record<string, unknown>;
}

export interface ApprovalItem {
  id: string;
  objectName: string;
  recordId: string;
  stepName: string;
  status: "pending" | "approved" | "rejected";
  requestedBy?: string;
  requestedAt?: string;
  comment?: string;
}

export interface UseAutomationResult {
  /** Trigger an automation flow by name */
  trigger: (
    flowName: string,
    payload?: Record<string, unknown>,
  ) => Promise<AutomationTriggerResult>;
  /** Approve a pending workflow step */
  approve: (
    objectName: string,
    recordId: string,
    comment?: string,
  ) => Promise<void>;
  /** Reject a pending workflow step */
  reject: (
    objectName: string,
    recordId: string,
    reason: string,
    comment?: string,
  ) => Promise<void>;
  /** Whether an automation operation is in progress */
  isLoading: boolean;
  /** Last error */
  error: Error | null;
}

/* ------------------------------------------------------------------ */
/*  Hook                                                                */
/* ------------------------------------------------------------------ */

/**
 * Hook for triggering automation flows and managing approval processes
 * via `client.automation.trigger()` and `client.workflow.approve/reject()`.
 *
 * Satisfies spec/automation: AutomationTrigger + ApprovalProcess protocol.
 *
 * ```ts
 * const { trigger, approve, reject, isLoading } = useAutomation();
 * await trigger("onboard-user", { userId: "123" });
 * ```
 */
export function useAutomation(): UseAutomationResult {
  const client = useClient();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const trigger = useCallback(
    async (
      flowName: string,
      payload?: Record<string, unknown>,
    ): Promise<AutomationTriggerResult> => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await client.automation.trigger(flowName, payload ?? {});
        return {
          success: true,
          executionId: result?.executionId,
          message: result?.message,
          data: result?.data,
        };
      } catch (err: unknown) {
        const automationError =
          err instanceof Error ? err : new Error("Automation trigger failed");
        setError(automationError);
        throw automationError;
      } finally {
        setIsLoading(false);
      }
    },
    [client],
  );

  const approve = useCallback(
    async (
      objectName: string,
      recordId: string,
      comment?: string,
    ): Promise<void> => {
      setIsLoading(true);
      setError(null);
      try {
        await client.workflow.approve({ object: objectName, recordId, comment });
      } catch (err: unknown) {
        const approvalError =
          err instanceof Error ? err : new Error("Approval failed");
        setError(approvalError);
        throw approvalError;
      } finally {
        setIsLoading(false);
      }
    },
    [client],
  );

  const reject = useCallback(
    async (
      objectName: string,
      recordId: string,
      reason: string,
      comment?: string,
    ): Promise<void> => {
      setIsLoading(true);
      setError(null);
      try {
        await client.workflow.reject({
          object: objectName,
          recordId,
          reason,
          comment,
        });
      } catch (err: unknown) {
        const rejectError =
          err instanceof Error ? err : new Error("Rejection failed");
        setError(rejectError);
        throw rejectError;
      } finally {
        setIsLoading(false);
      }
    },
    [client],
  );

  return { trigger, approve, reject, isLoading, error };
}
