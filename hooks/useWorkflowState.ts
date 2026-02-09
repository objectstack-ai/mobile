import { useCallback, useEffect, useState } from "react";
import { useClient } from "@objectstack/client-react";
import type {
  GetWorkflowStateResponse,
  WorkflowTransitionResponse,
  WorkflowApproveResponse,
  WorkflowRejectResponse,
} from "@objectstack/client";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

export interface WorkflowTransition {
  name: string;
  targetState: string;
  label?: string;
  requiresApproval: boolean;
}

export interface WorkflowHistoryEntry {
  fromState: string;
  toState: string;
  action: string;
  userId: string;
  timestamp: string;
  comment?: string;
}

export interface WorkflowState {
  currentState: string;
  availableTransitions: WorkflowTransition[];
  history?: WorkflowHistoryEntry[];
}

export interface UseWorkflowStateResult {
  /** Current workflow state for the record */
  state: WorkflowState | null;
  /** Whether the state is still loading */
  isLoading: boolean;
  /** Error that occurred while fetching */
  error: Error | null;
  /** Execute a state transition */
  transition: (
    transitionName: string,
    comment?: string,
  ) => Promise<WorkflowTransitionResponse>;
  /** Approve a workflow step */
  approve: (comment?: string) => Promise<WorkflowApproveResponse>;
  /** Reject a workflow step */
  reject: (comment?: string) => Promise<WorkflowRejectResponse>;
  /** Refetch the workflow state */
  refetch: () => Promise<void>;
}

/* ------------------------------------------------------------------ */
/*  Hook                                                                */
/* ------------------------------------------------------------------ */

/**
 * Hook for managing workflow state of a specific record via
 * `client.workflow.getState()`, `.transition()`, `.approve()`, `.reject()`.
 */
export function useWorkflowState(
  objectName: string,
  recordId: string,
): UseWorkflowStateResult {
  const client = useClient();
  const [state, setState] = useState<WorkflowState | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchState = useCallback(async () => {
    if (!recordId) return;
    setIsLoading(true);
    setError(null);
    try {
      const result: GetWorkflowStateResponse =
        await client.workflow.getState(objectName, recordId);
      setState(result.state);
    } catch (err) {
      setError(
        err instanceof Error
          ? err
          : new Error("Failed to fetch workflow state"),
      );
    } finally {
      setIsLoading(false);
    }
  }, [client, objectName, recordId]);

  const doTransition = useCallback(
    async (
      transitionName: string,
      comment?: string,
    ): Promise<WorkflowTransitionResponse> => {
      const result = await client.workflow.transition({
        object: objectName,
        recordId,
        transition: transitionName,
        comment,
      });
      // Refresh state after transition
      await fetchState();
      return result;
    },
    [client, objectName, recordId, fetchState],
  );

  const doApprove = useCallback(
    async (comment?: string): Promise<WorkflowApproveResponse> => {
      const result = await client.workflow.approve({
        object: objectName,
        recordId,
        comment,
      });
      await fetchState();
      return result;
    },
    [client, objectName, recordId, fetchState],
  );

  const doReject = useCallback(
    async (comment?: string): Promise<WorkflowRejectResponse> => {
      const result = await client.workflow.reject({
        object: objectName,
        recordId,
        comment,
      });
      await fetchState();
      return result;
    },
    [client, objectName, recordId, fetchState],
  );

  useEffect(() => {
    void fetchState();
  }, [fetchState]);

  return {
    state,
    isLoading,
    error,
    transition: doTransition,
    approve: doApprove,
    reject: doReject,
    refetch: fetchState,
  };
}
