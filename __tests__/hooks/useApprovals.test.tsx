/**
 * Tests for useApprovals / useDecideApproval — pending-inbox fetch and the
 * approve/reject decision (records status on the request row).
 */
import React from "react";
import { renderHook, waitFor, act } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const mockFind = jest.fn();
const mockUpdate = jest.fn();
const mockGet = jest.fn();
jest.mock("@objectstack/client-react", () => ({
  useClient: () => ({ data: { find: mockFind, update: mockUpdate, get: mockGet } }),
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
  mockFind.mockReset();
  mockUpdate.mockReset().mockResolvedValue({});
  mockGet.mockReset();
});

describe("useApprovals", () => {
  it("queries pending requests and returns the rows", async () => {
    mockFind.mockResolvedValue({ records: [REQ] });
    const { result } = renderHook(() => useApprovals(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockFind).toHaveBeenCalledWith("sys_approval_request", {
      filter: ["status", "=", "pending"],
      sort: "created_at desc",
      top: 50,
    });
    expect(result.current.data).toEqual([REQ]);
  });

  it("returns an empty list when there are no records", async () => {
    mockFind.mockResolvedValue({});
    const { result } = renderHook(() => useApprovals(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([]);
  });
});

describe("useApproval", () => {
  it("fetches a single request by id", async () => {
    mockGet.mockResolvedValue({ record: REQ });
    const { result } = renderHook(() => useApproval("ar1"), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockGet).toHaveBeenCalledWith("sys_approval_request", "ar1");
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
  it("approve sets status=approved on the request row", async () => {
    const { result } = renderHook(() => useDecideApproval(), { wrapper });
    let res: { ok: boolean } = { ok: false };
    await act(async () => {
      res = await result.current.approve(REQ);
    });
    expect(res.ok).toBe(true);
    expect(mockUpdate).toHaveBeenCalledWith("sys_approval_request", "ar1", { status: "approved" });
  });

  it("reject sets status=rejected and appends the reason to the comment", async () => {
    const { result } = renderHook(() => useDecideApproval(), { wrapper });
    await act(async () => {
      await result.current.reject(REQ, "Over budget");
    });
    expect(mockUpdate).toHaveBeenCalledWith("sys_approval_request", "ar1", {
      status: "rejected",
      submitter_comment: "Please approve.\n— Over budget",
    });
  });

  it("reports an error when the update fails", async () => {
    mockUpdate.mockRejectedValue(new Error("nope"));
    const { result } = renderHook(() => useDecideApproval(), { wrapper });
    let res: { ok: boolean; error?: string } = { ok: true };
    await act(async () => {
      res = await result.current.approve(REQ);
    });
    expect(res.ok).toBe(false);
    expect(res.error).toBe("nope");
  });
});
