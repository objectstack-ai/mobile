/**
 * Tests for useWorkflowState – validates workflow state
 * fetching and transition/approve/reject operations.
 */
import { renderHook, act, waitFor } from "@testing-library/react-native";

/* ---- Mock useClient from SDK ---- */
const mockGetState = jest.fn();
const mockTransition = jest.fn();
const mockApprove = jest.fn();
const mockReject = jest.fn();

const mockClient = {
  workflow: {
    getState: mockGetState,
    transition: mockTransition,
    approve: mockApprove,
    reject: mockReject,
  },
};

jest.mock("@objectstack/client-react", () => ({
  useClient: () => mockClient,
}));

import { useWorkflowState } from "~/hooks/useWorkflowState";

beforeEach(() => {
  mockGetState.mockReset();
  mockTransition.mockReset();
  mockApprove.mockReset();
  mockReject.mockReset();
});

const mockState = {
  object: "tasks",
  recordId: "rec-1",
  state: {
    currentState: "draft",
    availableTransitions: [
      {
        name: "submit",
        targetState: "pending_review",
        label: "Submit for Review",
        requiresApproval: true,
      },
    ],
    history: [
      {
        fromState: "new",
        toState: "draft",
        action: "create",
        userId: "user-1",
        timestamp: "2026-01-01T00:00:00Z",
      },
    ],
  },
};

describe("useWorkflowState", () => {
  it("fetches workflow state on mount", async () => {
    mockGetState.mockResolvedValue(mockState);

    const { result } = renderHook(() =>
      useWorkflowState("tasks", "rec-1"),
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.state).toEqual(mockState.state);
    expect(result.current.state?.currentState).toBe("draft");
    expect(result.current.state?.availableTransitions).toHaveLength(1);
    expect(result.current.state?.history).toHaveLength(1);
    expect(result.current.error).toBeNull();
  });

  it("handles error when fetching workflow state", async () => {
    mockGetState.mockRejectedValue(new Error("Not found"));

    const { result } = renderHook(() =>
      useWorkflowState("tasks", "rec-1"),
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.state).toBeNull();
    expect(result.current.error?.message).toBe("Not found");
  });

  it("performs transition and refetches state", async () => {
    mockGetState.mockResolvedValue(mockState);
    mockTransition.mockResolvedValue({
      object: "tasks",
      recordId: "rec-1",
      success: true,
      state: { currentState: "pending_review", availableTransitions: [] },
    });

    const { result } = renderHook(() =>
      useWorkflowState("tasks", "rec-1"),
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.transition("submit", "Ready for review");
    });

    expect(mockTransition).toHaveBeenCalledWith({
      object: "tasks",
      recordId: "rec-1",
      transition: "submit",
      comment: "Ready for review",
    });
    // Should have refetched state (getState called again)
    expect(mockGetState).toHaveBeenCalledTimes(2);
  });

  it("performs approve and refetches state", async () => {
    mockGetState.mockResolvedValue(mockState);
    mockApprove.mockResolvedValue({
      object: "tasks",
      recordId: "rec-1",
      success: true,
    });

    const { result } = renderHook(() =>
      useWorkflowState("tasks", "rec-1"),
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.approve("LGTM");
    });

    expect(mockApprove).toHaveBeenCalledWith({
      object: "tasks",
      recordId: "rec-1",
      comment: "LGTM",
    });
  });

  it("performs reject and refetches state", async () => {
    mockGetState.mockResolvedValue(mockState);
    mockReject.mockResolvedValue({
      object: "tasks",
      recordId: "rec-1",
      success: true,
    });

    const { result } = renderHook(() =>
      useWorkflowState("tasks", "rec-1"),
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.reject("Needs changes");
    });

    expect(mockReject).toHaveBeenCalledWith({
      object: "tasks",
      recordId: "rec-1",
      reason: "Needs changes",
    });
  });
});
