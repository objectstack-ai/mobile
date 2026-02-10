/**
 * Tests for useAutomation – validates automation trigger
 * and approval/rejection operations.
 */
import { renderHook, act } from "@testing-library/react-native";

/* ---- Mock useClient from SDK ---- */
const mockTrigger = jest.fn();
const mockApprove = jest.fn();
const mockReject = jest.fn();

const mockClient = {
  automation: { trigger: mockTrigger },
  workflow: { approve: mockApprove, reject: mockReject },
};

jest.mock("@objectstack/client-react", () => ({
  useClient: () => mockClient,
}));

import { useAutomation } from "~/hooks/useAutomation";

beforeEach(() => {
  mockTrigger.mockReset();
  mockApprove.mockReset();
  mockReject.mockReset();
});

describe("useAutomation", () => {
  it("triggers an automation flow with payload", async () => {
    mockTrigger.mockResolvedValue({
      executionId: "exec-1",
      message: "Started",
      data: { status: "ok" },
    });

    const { result } = renderHook(() => useAutomation());

    let triggerResult: unknown;
    await act(async () => {
      triggerResult = await result.current.trigger("onboard-user", {
        userId: "123",
      });
    });

    expect(mockTrigger).toHaveBeenCalledWith("onboard-user", {
      userId: "123",
    });
    expect(triggerResult).toEqual({
      success: true,
      executionId: "exec-1",
      message: "Started",
      data: { status: "ok" },
    });
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("triggers without payload", async () => {
    mockTrigger.mockResolvedValue({});

    const { result } = renderHook(() => useAutomation());

    await act(async () => {
      await result.current.trigger("daily-report");
    });

    expect(mockTrigger).toHaveBeenCalledWith("daily-report", {});
  });

  it("handles trigger error", async () => {
    mockTrigger.mockRejectedValue(new Error("Flow not found"));

    const { result } = renderHook(() => useAutomation());

    await act(async () => {
      await expect(
        result.current.trigger("nonexistent"),
      ).rejects.toThrow("Flow not found");
    });

    expect(result.current.error?.message).toBe("Flow not found");
  });

  it("approves a workflow step", async () => {
    mockApprove.mockResolvedValue({ success: true });

    const { result } = renderHook(() => useAutomation());

    await act(async () => {
      await result.current.approve("tasks", "rec-1", "LGTM");
    });

    expect(mockApprove).toHaveBeenCalledWith({
      object: "tasks",
      recordId: "rec-1",
      comment: "LGTM",
    });
    expect(result.current.error).toBeNull();
  });

  it("handles approval error", async () => {
    mockApprove.mockRejectedValue(new Error("Not authorized"));

    const { result } = renderHook(() => useAutomation());

    await act(async () => {
      await expect(
        result.current.approve("tasks", "rec-1"),
      ).rejects.toThrow("Not authorized");
    });

    expect(result.current.error?.message).toBe("Not authorized");
  });

  it("rejects a workflow step with reason", async () => {
    mockReject.mockResolvedValue({ success: true });

    const { result } = renderHook(() => useAutomation());

    await act(async () => {
      await result.current.reject("tasks", "rec-1", "Needs changes", "See comments");
    });

    expect(mockReject).toHaveBeenCalledWith({
      object: "tasks",
      recordId: "rec-1",
      reason: "Needs changes",
      comment: "See comments",
    });
    expect(result.current.error).toBeNull();
  });

  it("handles rejection error", async () => {
    mockReject.mockRejectedValue(new Error("Rejection failed"));

    const { result } = renderHook(() => useAutomation());

    await act(async () => {
      await expect(
        result.current.reject("tasks", "rec-1", "Bad"),
      ).rejects.toThrow("Rejection failed");
    });

    expect(result.current.error?.message).toBe("Rejection failed");
  });
});
