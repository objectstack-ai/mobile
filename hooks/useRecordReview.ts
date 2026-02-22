import { useCallback, useState } from "react";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

export interface Reviewer {
  id: string;
  name: string;
  role: string;
  decision?: "approved" | "rejected" | "pending";
  comment?: string;
  decidedAt?: string;
}

export interface RecordReviewConfigSchema {
  requiredApprovals: number;
  allowSelfApproval: boolean;
  autoApproveRules?: Record<string, unknown>;
}

export type ReviewStatus =
  | "draft"
  | "pending"
  | "approved"
  | "rejected"
  | "cancelled";

export interface UseRecordReviewResult {
  /** Review configuration */
  reviewConfig: RecordReviewConfigSchema;
  /** Current reviewers */
  reviewers: Reviewer[];
  /** Current review status */
  status: ReviewStatus;
  /** Set review configuration */
  setConfig: (config: RecordReviewConfigSchema) => void;
  /** Add a reviewer */
  addReviewer: (reviewer: Reviewer) => void;
  /** Remove a reviewer by id */
  removeReviewer: (id: string) => void;
  /** Submit the review for approval */
  submitReview: () => void;
  /** Approve the review as a specific reviewer */
  approve: (reviewerId: string, comment?: string) => void;
  /** Reject the review as a specific reviewer */
  reject: (reviewerId: string, comment?: string) => void;
}

/* ------------------------------------------------------------------ */
/*  Hook                                                                */
/* ------------------------------------------------------------------ */

/**
 * Hook for managing the approval / review workflow on SDUI record
 * pages — add reviewers, approve, reject, and track status.
 *
 * Implements Phase 23 SDUI Record Page Protocol.
 *
 * ```ts
 * const { reviewers, status, addReviewer, submitReview, approve } =
 *   useRecordReview();
 * addReviewer({ id: "r1", name: "Alice", role: "manager" });
 * submitReview();
 * approve("r1", "Looks good");
 * ```
 */
export function useRecordReview(
  _config?: RecordReviewConfigSchema,
): UseRecordReviewResult {
  const [reviewConfig, setReviewConfigState] =
    useState<RecordReviewConfigSchema>({
      requiredApprovals: 1,
      allowSelfApproval: false,
    });
  const [reviewers, setReviewersState] = useState<Reviewer[]>([]);
  const [status, setStatus] = useState<ReviewStatus>("draft");

  const setConfig = useCallback((config: RecordReviewConfigSchema) => {
    setReviewConfigState(config);
  }, []);

  const addReviewer = useCallback((reviewer: Reviewer) => {
    setReviewersState((prev) => [...prev, { ...reviewer, decision: "pending" }]);
  }, []);

  const removeReviewer = useCallback((id: string) => {
    setReviewersState((prev) => prev.filter((r) => r.id !== id));
  }, []);

  const submitReview = useCallback(() => {
    setStatus("pending");
    setReviewersState((prev) =>
      prev.map((r) => ({ ...r, decision: "pending" as const })),
    );
  }, []);

  const approve = useCallback(
    (reviewerId: string, comment?: string) => {
      setReviewersState((prev) => {
        const updated = prev.map((r) =>
          r.id === reviewerId
            ? {
                ...r,
                decision: "approved" as const,
                comment,
                decidedAt: new Date().toISOString(),
              }
            : r,
        );
        const approvedCount = updated.filter(
          (r) => r.decision === "approved",
        ).length;
        if (approvedCount >= reviewConfig.requiredApprovals) {
          setStatus("approved");
        }
        return updated;
      });
    },
    [reviewConfig.requiredApprovals],
  );

  const reject = useCallback((reviewerId: string, comment?: string) => {
    setReviewersState((prev) =>
      prev.map((r) =>
        r.id === reviewerId
          ? {
              ...r,
              decision: "rejected" as const,
              comment,
              decidedAt: new Date().toISOString(),
            }
          : r,
      ),
    );
    setStatus("rejected");
  }, []);

  return {
    reviewConfig,
    reviewers,
    status,
    setConfig,
    addReviewer,
    removeReviewer,
    submitReview,
    approve,
    reject,
  };
}
