/**
 * Tests for useApprovals / useDecideApproval — pending-inbox fetch and the
 * approve/reject decision (records status on the request row).
 */
import React from "react";
import { renderHook, waitFor, act } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const mockListRequests = jest.fn();
const mockGetRequest = jest.fn();
const mockApprove = jest.fn();
const mockReject = jest.fn();
const mockGet = jest.fn();
jest.mock("@objectstack/client-react", () => ({
  useClient: () => ({
    approvals: {
      listRequests: mockListRequests,
      getRequest: mockGetRequest,
      approve: mockApprove,
      reject: mockReject,
    },
    data: { get: mockGet },
  }),
}));

import {
  useApprovals,
  useApproval,
  useApprovalTarget,
  useDecideApproval,
  type ApprovalRequest,
} from "~/hooks/useApprovals";

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

const REQ: ApprovalRequest = {
  id: "ar1",
  process_name: "Large Deal Approval",
  object_name: "crm_opportunity",
  record_id: "opp1",
  submitter_comment: "Please approve.",
  status: "pending",
};

beforeEach(() => {
  mockListRequests.mockReset();
  mockGetRequest.mockReset();
  mockApprove.mockReset().mockResolvedValue({ finalized: true, decision: "approve", resumed: true });
  mockReject.mockReset().mockResolvedValue({ finalized: true, decision: "reject", resumed: true });
  mockGet.mockReset();
});

describe("useApprovals", () => {
  it("lists pending requests via the approvals service", async () => {
    mockListRequests.mockResolvedValue([REQ]);
    const { result } = renderHook(() => useApprovals(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockListRequests).toHaveBeenCalledWith({ status: "pending" });
    expect(result.current.data).toEqual([REQ]);
  });

  it("returns an empty list when the service returns none", async () => {
    mockListRequests.mockResolvedValue([]);
    const { result } = renderHook(() => useApprovals(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([]);
  });
});

describe("useApproval", () => {
  it("fetches a single request by id", async () => {
    mockGetRequest.mockResolvedValue(REQ);
    const { result } = renderHook(() => useApproval("ar1"), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockGetRequest).toHaveBeenCalledWith("ar1");
    expect(result.current.data).toEqual(REQ);
  });
});

describe("useApprovalTarget", () => {
  it("fetches the business record named by the request", async () => {
    mockGet.mockResolvedValue({ record: { id: "opp1", name: "Acme Deal" } });
    const { result } = renderHook(() => useApprovalTarget(REQ), { wrapper });
    await waitFor(() => expect(result.current.record).toBeTruthy());
    expect(mockGet).toHaveBeenCalledWith("crm_opportunity", "opp1");
    expect(result.current.record).toEqual({ id: "opp1", name: "Acme Deal" });
  });

  it("does not fetch when the request has no target", async () => {
    const { result } = renderHook(() => useApprovalTarget({ id: "x", status: "pending" }), {
      wrapper,
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(mockGet).not.toHaveBeenCalled();
    expect(result.current.record).toBeNull();
  });
});

describe("useDecideApproval", () => {
  it("approve calls approvals.approve (which resumes the flow)", async () => {
    const { result } = renderHook(() => useDecideApproval(), { wrapper });
    let res: { ok: boolean } = { ok: false };
    await act(async () => {
      res = await result.current.approve(REQ);
    });
    expect(res.ok).toBe(true);
    expect(mockApprove).toHaveBeenCalledWith("ar1", undefined);
  });

  it("reject calls approvals.reject with the reason as comment", async () => {
    const { result } = renderHook(() => useDecideApproval(), { wrapper });
    await act(async () => {
      await result.current.reject(REQ, "Over budget");
    });
    expect(mockReject).toHaveBeenCalledWith("ar1", { comment: "Over budget" });
  });

  it("reports an error when the decision fails", async () => {
    mockApprove.mockRejectedValue(new Error("nope"));
    const { result } = renderHook(() => useDecideApproval(), { wrapper });
    let res: { ok: boolean; error?: string } = { ok: true };
    await act(async () => {
      res = await result.current.approve(REQ);
    });
    expect(res.ok).toBe(false);
    expect(res.error).toBe("nope");
  });
});
