import { useQuery, useQueryClient, type UseQueryResult } from "@tanstack/react-query";
import { useClient } from "@objectstack/client-react";
import { useCallback, useState } from "react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

/** A pending approval request row (`sys_approval_request`). */
export interface ApprovalRequest {
  id: string;
  process_name?: string;
  /** Business object + record the request is about. */
  object_name?: string;
  record_id?: string;
  submitter_id?: string;
  submitter_comment?: string;
  status?: string;
  current_step?: string;
  created_at?: string;
}

export interface DecisionResult {
  ok: boolean;
  error?: string;
}

/* ------------------------------------------------------------------ */
/*  Inbox                                                             */
/* ------------------------------------------------------------------ */

const PENDING_KEY = ["approvals", "pending"] as const;

/**
 * The "my pending approvals" inbox — `sys_approval_request` rows awaiting a
 * decision. Returns an empty list (not an error) when the approvals object
 * isn't registered, so the screen renders an empty state.
 */
export function useApprovals(): UseQueryResult<ApprovalRequest[], Error> {
  const client = useClient();
  return useQuery({
    queryKey: PENDING_KEY,
    queryFn: async (): Promise<ApprovalRequest[]> => {
      const res = await client.data.find<ApprovalRequest>("sys_approval_request", {
        filter: ["status", "=", "pending"],
        sort: "created_at desc",
        top: 50,
      });
      return res?.records ?? [];
    },
  });
}

/** Fetch a single approval request by id. */
export function useApproval(
  id: string | undefined,
): UseQueryResult<ApprovalRequest | null, Error> {
  const client = useClient();
  return useQuery({
    queryKey: ["approval", id],
    enabled: !!id,
    queryFn: async () => {
      const res = await client.data.get<ApprovalRequest>("sys_approval_request", id!);
      return (res?.record ?? null) as ApprovalRequest | null;
    },
  });
}

/** The business record an approval request is about, plus its object metadata. */
export function useApprovalTarget(req: ApprovalRequest | null | undefined): {
  record: Record<string, unknown> | null;
  isLoading: boolean;
  error: Error | null;
} {
  const client = useClient();
  const object = req?.object_name;
  const recordId = req?.record_id;
  const { data, isLoading, error } = useQuery({
    queryKey: ["approval-target", object, recordId],
    enabled: !!object && !!recordId,
    queryFn: async () => {
      const res = await client.data.get<Record<string, unknown>>(object!, recordId!);
      return (res?.record ?? res ?? null) as Record<string, unknown> | null;
    },
  });
  return { record: data ?? null, isLoading, error: error ?? null };
}

/* ------------------------------------------------------------------ */
/*  Decide                                                            */
/* ------------------------------------------------------------------ */

/**
 * Approve / reject a pending request by recording the decision on the
 * `sys_approval_request` row (`status` → `approved` / `rejected`), which drops
 * it from the pending inbox. The reject reason is appended to the row's comment
 * for an audit trail. The pending list is refreshed afterwards regardless of
 * outcome.
 *
 * Note: this records the decision; resuming a flow that's blocked on the request
 * is handled server-side by the approval/workflow service when present.
 */
export function useDecideApproval(): {
  approve: (req: ApprovalRequest, comment?: string) => Promise<DecisionResult>;
  reject: (req: ApprovalRequest, reason: string) => Promise<DecisionResult>;
  pendingId: string | null;
} {
  const client = useClient();
  const queryClient = useQueryClient();
  const [pendingId, setPendingId] = useState<string | null>(null);

  const decide = useCallback(
    async (
      req: ApprovalRequest,
      status: "approved" | "rejected",
      note?: string,
    ): Promise<DecisionResult> => {
      setPendingId(req.id);
      try {
        const patch: Record<string, unknown> = { status };
        if (note) {
          patch.submitter_comment = req.submitter_comment
            ? `${req.submitter_comment}\n— ${note}`
            : note;
        }
        await client.data.update("sys_approval_request", req.id, patch);
        return { ok: true };
      } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : "Decision failed" };
      } finally {
        setPendingId(null);
        void queryClient.invalidateQueries({ queryKey: PENDING_KEY });
        void queryClient.invalidateQueries({ queryKey: ["approval"] });
      }
    },
    [client, queryClient],
  );

  const approve = useCallback(
    (req: ApprovalRequest, comment?: string) => decide(req, "approved", comment),
    [decide],
  );
  const reject = useCallback(
    (req: ApprovalRequest, reason: string) => decide(req, "rejected", reason),
    [decide],
  );

  return { approve, reject, pendingId };
}
