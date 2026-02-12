/**
 * Tests for useRAG – validates Retrieval-Augmented Generation
 * query operations and source retrieval.
 */
import { renderHook, act } from "@testing-library/react-native";

/* ---- Mock useClient from SDK ---- */
const mockQuery = jest.fn();

const mockClient = {
  ai: { rag: { query: mockQuery } },
};

jest.mock("@objectstack/client-react", () => ({
  useClient: () => mockClient,
}));

import { useRAG } from "~/hooks/useRAG";

beforeEach(() => {
  mockQuery.mockReset();
});

describe("useRAG", () => {
  it("queries RAG pipeline and stores sources", async () => {
    const ragResult = {
      answer: "The Q4 target is $1M.",
      sources: [
        { id: "src-1", title: "Q4 Report", content: "Target is $1M", score: 0.95 },
      ],
      confidence: 0.92,
    };
    mockQuery.mockResolvedValue(ragResult);

    const { result } = renderHook(() => useRAG());

    let queryResult: unknown;
    await act(async () => {
      queryResult = await result.current.query("What are our Q4 targets?");
    });

    expect(mockQuery).toHaveBeenCalledWith({
      question: "What are our Q4 targets?",
    });
    expect(queryResult).toEqual(ragResult);
    expect(result.current.sources).toEqual(ragResult.sources);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("queries with options (pipelineId, topK, minScore)", async () => {
    const ragResult = {
      answer: "Revenue grew 20%.",
      sources: [
        { id: "src-2", title: "Finance Doc", content: "Revenue grew 20%", score: 0.88 },
        { id: "src-3", title: "Quarterly Review", content: "Growth was strong", score: 0.85 },
      ],
      confidence: 0.9,
      pipelineId: "finance-pipe",
    };
    mockQuery.mockResolvedValue(ragResult);

    const { result } = renderHook(() => useRAG());

    await act(async () => {
      await result.current.query("How did revenue grow?", {
        pipelineId: "finance-pipe",
        topK: 5,
        minScore: 0.8,
      });
    });

    expect(mockQuery).toHaveBeenCalledWith({
      question: "How did revenue grow?",
      pipelineId: "finance-pipe",
      topK: 5,
      minScore: 0.8,
    });
    expect(result.current.sources).toHaveLength(2);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("handles query error", async () => {
    mockQuery.mockRejectedValue(new Error("RAG query failed"));

    const { result } = renderHook(() => useRAG());

    await act(async () => {
      await expect(
        result.current.query("Bad question"),
      ).rejects.toThrow("RAG query failed");
    });

    expect(result.current.error?.message).toBe("RAG query failed");
  });
});
