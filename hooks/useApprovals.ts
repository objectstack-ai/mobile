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
      // `approvals` service returns `[]` when no approvals plugin is loaded.
      const rows = await client.approvals.listRequests({ status: "pending" });
      return (rows ?? []) as ApprovalRequest[];
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
      const row = await client.approvals.getRequest(id!);
      return (row ?? null) as ApprovalRequest | null;
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
 * Approve / reject a pending request via the approvals service
 * (`client.approvals.approve|reject`). The server records the decision AND
 * resumes the owning flow run down the matching `approve` / `reject` edge
 * (ADR-0019) — unlike a bare `status` write, which would leave the flow blocked.
 * The pending list + single-request caches are refreshed afterwards.
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
      decision: "approve" | "reject",
      comment?: string,
    ): Promise<DecisionResult> => {
      setPendingId(req.id);
      try {
        if (decision === "approve") {
          await client.approvals.approve(req.id, comment ? { comment } : undefined);
        } else {
          await client.approvals.reject(req.id, comment ? { comment } : undefined);
        }
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
    (req: ApprovalRequest, comment?: string) => decide(req, "approve", comment),
    [decide],
  );
  const reject = useCallback(
    (req: ApprovalRequest, reason: string) => decide(req, "reject", reason),
    [decide],
  );

  return { approve, reject, pendingId };
}
