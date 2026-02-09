/**
 * Tests for useAI – validates AI integration hooks wrapping client.ai.*.
 */
import { renderHook, act, waitFor } from "@testing-library/react-native";

/* ---- Mock useClient from SDK ---- */
const mockNlq = jest.fn();
const mockChat = jest.fn();
const mockSuggest = jest.fn();
const mockInsights = jest.fn();

const mockClient = {
  ai: {
    nlq: mockNlq,
    chat: mockChat,
    suggest: mockSuggest,
    insights: mockInsights,
  },
};

jest.mock("@objectstack/client-react", () => ({
  useClient: () => mockClient,
}));

import { useAI } from "~/hooks/useAI";

beforeEach(() => {
  mockNlq.mockReset();
  mockChat.mockReset();
  mockSuggest.mockReset();
  mockInsights.mockReset();
});

describe("useAI", () => {
  it("calls client.ai.nlq() with correct params", async () => {
    const nlqResponse = {
      query: { object: "tasks", select: ["*"] },
      explanation: "Find all tasks",
      confidence: 0.95,
      suggestions: ["Show open tasks"],
    };
    mockNlq.mockResolvedValue(nlqResponse);

    const { result } = renderHook(() => useAI("tasks"));

    let response: any;
    await act(async () => {
      response = await result.current.nlq("show all tasks");
    });

    expect(mockNlq).toHaveBeenCalledWith({
      query: "show all tasks",
      object: "tasks",
    });
    expect(response).toEqual(nlqResponse);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("nlq allows overriding the object context", async () => {
    mockNlq.mockResolvedValue({ query: {}, explanation: "", confidence: 0 });

    const { result } = renderHook(() => useAI("tasks"));

    await act(async () => {
      await result.current.nlq("show all orders", "orders");
    });

    expect(mockNlq).toHaveBeenCalledWith({
      query: "show all orders",
      object: "orders",
    });
  });

  it("handles nlq errors", async () => {
    mockNlq.mockRejectedValue(new Error("NLQ service unavailable"));

    const { result } = renderHook(() => useAI("tasks"));

    await act(async () => {
      await expect(result.current.nlq("bad query")).rejects.toThrow("NLQ service unavailable");
    });

    expect(result.current.error?.message).toBe("NLQ service unavailable");
    expect(result.current.isLoading).toBe(false);
  });

  it("calls client.ai.chat() and maintains conversation history", async () => {
    const chatResponse = {
      message: "Here are your open tasks.",
      conversationId: "conv-123",
      actions: [{ type: "navigate", label: "View Tasks" }],
    };
    mockChat.mockResolvedValue(chatResponse);

    const { result } = renderHook(() => useAI("tasks"));

    expect(result.current.messages).toHaveLength(0);
    expect(result.current.conversationId).toBeNull();

    await act(async () => {
      await result.current.chat("Show me open tasks");
    });

    expect(mockChat).toHaveBeenCalledWith({
      message: "Show me open tasks",
    });
    expect(result.current.conversationId).toBe("conv-123");
    expect(result.current.messages).toHaveLength(2);
    expect(result.current.messages[0]).toEqual({
      role: "user",
      content: "Show me open tasks",
    });
    expect(result.current.messages[1]).toEqual({
      role: "assistant",
      content: "Here are your open tasks.",
      actions: [{ type: "navigate", label: "View Tasks" }],
    });
  });

  it("chat removes optimistic user message on error", async () => {
    mockChat.mockRejectedValue(new Error("Chat failed"));

    const { result } = renderHook(() => useAI("tasks"));

    await act(async () => {
      await expect(result.current.chat("hello")).rejects.toThrow("Chat failed");
    });

    expect(result.current.messages).toHaveLength(0);
    expect(result.current.error?.message).toBe("Chat failed");
  });

  it("clearConversation resets state", async () => {
    mockChat.mockResolvedValue({
      message: "Hello!",
      conversationId: "conv-456",
    });

    const { result } = renderHook(() => useAI("tasks"));

    await act(async () => {
      await result.current.chat("Hi");
    });

    expect(result.current.messages).toHaveLength(2);
    expect(result.current.conversationId).toBe("conv-456");

    act(() => {
      result.current.clearConversation();
    });

    expect(result.current.messages).toHaveLength(0);
    expect(result.current.conversationId).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it("calls client.ai.suggest() with object context", async () => {
    const suggestResponse = {
      suggestions: [
        { value: "High", label: "High Priority", confidence: 0.9, reason: "Most common" },
        { value: "Medium", label: "Medium Priority", confidence: 0.7 },
      ],
    };
    mockSuggest.mockResolvedValue(suggestResponse);

    const { result } = renderHook(() => useAI("tasks"));

    let response: any;
    await act(async () => {
      response = await result.current.suggest({ field: "priority", partial: "Hi" });
    });

    expect(mockSuggest).toHaveBeenCalledWith({
      object: "tasks",
      field: "priority",
      partial: "Hi",
    });
    expect(response.suggestions).toHaveLength(2);
  });

  it("calls client.ai.insights() with type and recordId", async () => {
    const insightsResponse = {
      insights: [
        {
          type: "summary",
          title: "Task Summary",
          description: "You have 5 overdue tasks",
          confidence: 0.85,
        },
      ],
    };
    mockInsights.mockResolvedValue(insightsResponse);

    const { result } = renderHook(() => useAI("tasks"));

    let response: any;
    await act(async () => {
      response = await result.current.insights("summary", "rec-1");
    });

    expect(mockInsights).toHaveBeenCalledWith({
      object: "tasks",
      type: "summary",
      recordId: "rec-1",
    });
    expect(response.insights).toHaveLength(1);
    expect(response.insights[0].title).toBe("Task Summary");
  });

  it("calls client.ai.insights() without optional params", async () => {
    mockInsights.mockResolvedValue({ insights: [] });

    const { result } = renderHook(() => useAI("tasks"));

    await act(async () => {
      await result.current.insights();
    });

    expect(mockInsights).toHaveBeenCalledWith({
      object: "tasks",
    });
  });
});
