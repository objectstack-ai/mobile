/**
 * Tests for useRecordReview – validates review workflow management,
 * reviewer addition/removal, approval, rejection, and status transitions.
 */
import { renderHook, act } from "@testing-library/react-native";
import { useRecordReview } from "~/hooks/useRecordReview";

describe("useRecordReview", () => {
  it("returns default state initially", () => {
    const { result } = renderHook(() => useRecordReview());

    expect(result.current.reviewConfig).toEqual({ requiredApprovals: 1, allowSelfApproval: false });
    expect(result.current.reviewers).toEqual([]);
    expect(result.current.status).toBe("draft");
  });

  it("sets review configuration", () => {
    const { result } = renderHook(() => useRecordReview());

    act(() => {
      result.current.setConfig({ requiredApprovals: 2, allowSelfApproval: true });
    });

    expect(result.current.reviewConfig.requiredApprovals).toBe(2);
    expect(result.current.reviewConfig.allowSelfApproval).toBe(true);
  });

  it("adds a reviewer with pending decision", () => {
    const { result } = renderHook(() => useRecordReview());

    act(() => {
      result.current.addReviewer({ id: "r1", name: "Alice", role: "manager" });
    });

    expect(result.current.reviewers).toHaveLength(1);
    expect(result.current.reviewers[0].decision).toBe("pending");
  });

  it("removes a reviewer by id", () => {
    const { result } = renderHook(() => useRecordReview());

    act(() => {
      result.current.addReviewer({ id: "r1", name: "Alice", role: "manager" });
      result.current.addReviewer({ id: "r2", name: "Bob", role: "director" });
    });

    act(() => {
      result.current.removeReviewer("r1");
    });

    expect(result.current.reviewers).toHaveLength(1);
    expect(result.current.reviewers[0].id).toBe("r2");
  });

  it("submits review and transitions to pending", () => {
    const { result } = renderHook(() => useRecordReview());

    act(() => {
      result.current.addReviewer({ id: "r1", name: "Alice", role: "manager" });
    });

    act(() => {
      result.current.submitReview();
    });

    expect(result.current.status).toBe("pending");
    expect(result.current.reviewers[0].decision).toBe("pending");
  });

  it("approves and transitions to approved when threshold met", () => {
    const { result } = renderHook(() => useRecordReview());

    act(() => {
      result.current.addReviewer({ id: "r1", name: "Alice", role: "manager" });
    });

    act(() => {
      result.current.submitReview();
    });

    act(() => {
      result.current.approve("r1", "Looks good");
    });

    expect(result.current.reviewers[0].decision).toBe("approved");
    expect(result.current.reviewers[0].comment).toBe("Looks good");
    expect(result.current.status).toBe("approved");
  });

  it("rejects and transitions to rejected", () => {
    const { result } = renderHook(() => useRecordReview());

    act(() => {
      result.current.addReviewer({ id: "r1", name: "Alice", role: "manager" });
    });

    act(() => {
      result.current.submitReview();
    });

    act(() => {
      result.current.reject("r1", "Needs changes");
    });

    expect(result.current.reviewers[0].decision).toBe("rejected");
    expect(result.current.reviewers[0].comment).toBe("Needs changes");
    expect(result.current.status).toBe("rejected");
  });

  it("stays pending when not enough approvals", () => {
    const { result } = renderHook(() => useRecordReview());

    act(() => {
      result.current.setConfig({ requiredApprovals: 2, allowSelfApproval: false });
    });

    act(() => {
      result.current.addReviewer({ id: "r1", name: "Alice", role: "manager" });
      result.current.addReviewer({ id: "r2", name: "Bob", role: "director" });
    });

    act(() => {
      result.current.submitReview();
    });

    act(() => {
      result.current.approve("r1");
    });

    expect(result.current.status).toBe("pending");
  });
});
