jest.mock("~/lib/ai-chat", () => ({ streamAiChat: jest.fn() }));
jest.mock("~/lib/ai-conversations", () => ({
  // Keep the pure helpers (deriveConversationTitle) real; stub the network ones.
  ...jest.requireActual("~/lib/ai-conversations"),
  conversationsAvailable: jest.fn(),
  listConversations: jest.fn(),
  createConversation: jest.fn(),
  getConversation: jest.fn(),
  deleteConversation: jest.fn(),
  addMessage: jest.fn(),
}));
import { streamAiChat } from "~/lib/ai-chat";
import * as conv from "~/lib/ai-conversations";
import { useAIChatStore } from "~/stores/ai-chat-store";

const mockStream = streamAiChat as jest.Mock;

function reset() {
  // Reset to local mode first, then clear() wipes the persisted (MMKV) thread,
  // which is module-level and would otherwise leak between tests.
  useAIChatStore.setState({ serverBacked: false, conversationId: null, conversations: [] });
  useAIChatStore.getState().clear();
  useAIChatStore.setState({ isLoading: false, error: null });
}

beforeEach(() => {
  jest.clearAllMocks();
  reset();
});

const get = () => useAIChatStore.getState();

describe("ai-chat-store", () => {
  it("appends the user turn and the streamed assistant reply", async () => {
    const tools = [{ id: "t1", name: "query_data", state: "done" as const }];
    mockStream.mockImplementation(async (_msgs, opts) => {
      opts?.onUpdate?.("Hel", []);
      opts?.onUpdate?.("Hello", tools);
      return { text: "Hello", tools };
    });

    await get().send("hi there");

    const { messages, isLoading } = get();
    expect(isLoading).toBe(false);
    expect(messages).toHaveLength(2);
    expect(messages[0]).toEqual({ role: "user", content: "hi there" });
    expect(messages[1]).toEqual({ role: "assistant", content: "Hello", tools });
  });

  it("persists messages across hook instances (module-level store)", async () => {
    mockStream.mockResolvedValue({ text: "saved", tools: [] });
    await get().send("remember this");
    // A fresh read of the store (as a remounted screen would do) still sees it.
    expect(useAIChatStore.getState().messages.map((m) => m.content)).toEqual([
      "remember this",
      "saved",
    ]);
  });

  it("ignores empty input and concurrent sends", async () => {
    mockStream.mockResolvedValue({ text: "ok", tools: [] });
    await get().send("   ");
    expect(mockStream).not.toHaveBeenCalled();
    expect(get().messages).toEqual([]);
  });

  it("rolls back and remembers the input for retry on error", async () => {
    mockStream.mockRejectedValueOnce(new Error("boom"));
    await get().send("will fail");
    expect(get().error?.message).toBe("boom");
    expect(get().messages).toEqual([]);

    // retry re-sends the failed input
    mockStream.mockResolvedValueOnce({ text: "recovered", tools: [] });
    get().retry();
    await Promise.resolve();
    await new Promise((r) => setTimeout(r, 0));
    expect(get().messages.map((m) => m.content)).toEqual(["will fail", "recovered"]);
  });

  it("marks a stopped reply and keeps partial text", async () => {
    mockStream.mockImplementation(async (_msgs, opts) => {
      opts?.onUpdate?.("partial", []);
      get().stop(); // user stops mid-stream
      return { text: "partial", tools: [] };
    });
    await get().send("long answer");
    expect(get().messages[1].content).toContain("partial");
    expect(get().messages[1].content).toContain("stopped");
  });

  it("clear() empties the conversation", async () => {
    mockStream.mockResolvedValue({ text: "hi", tools: [] });
    await get().send("hello");
    expect(get().messages.length).toBe(2);
    get().clear();
    expect(get().messages).toEqual([]);
    expect(get().error).toBeNull();
  });

  describe("disk persistence (survives restart)", () => {
    it("persists the thread and restores it via hydrate()", async () => {
      mockStream.mockResolvedValue({
        text: "saved reply",
        tools: [{ id: "t1", name: "query_data", state: "done" }],
      });
      await get().send("persist me");

      // Simulate an app restart: drop the in-memory state, then re-hydrate from
      // disk (reads the same MMKV instance the send wrote to).
      useAIChatStore.setState({ messages: [] });
      expect(get().messages).toEqual([]);

      get().hydrate();
      const restored = get().messages;
      expect(restored.map((m) => m.content)).toEqual(["persist me", "saved reply"]);
      expect(restored[1].tools).toEqual([{ id: "t1", name: "query_data", state: "done" }]);
    });

    it("clear() wipes the persisted thread too", async () => {
      mockStream.mockResolvedValue({ text: "hi", tools: [] });
      await get().send("hello");
      get().clear();
      // Nothing left to restore after a clear.
      useAIChatStore.setState({ messages: [{ role: "user", content: "stale" }] });
      get().hydrate();
      expect(get().messages).toEqual([]);
    });

    it("does not persist a failed turn", async () => {
      mockStream.mockRejectedValueOnce(new Error("boom"));
      await get().send("will fail");
      get().hydrate();
      expect(get().messages).toEqual([]);
    });
  });

  describe("server-backed mode (conversations)", () => {
    beforeEach(() => useAIChatStore.setState({ serverBacked: true }));

    it("creates a conversation on the first send and persists both messages", async () => {
      (conv.createConversation as jest.Mock).mockResolvedValue({ id: "c1", messages: [] });
      (conv.addMessage as jest.Mock).mockResolvedValue(undefined);
      (conv.listConversations as jest.Mock).mockResolvedValue([{ id: "c1", title: undefined }]);
      mockStream.mockResolvedValue({ text: "the answer", tools: [] });

      await get().send("a question");

      expect(conv.createConversation).toHaveBeenCalledTimes(1);
      // titled from the first message
      expect(conv.createConversation).toHaveBeenCalledWith("a question");
      expect(get().conversationId).toBe("c1");
      // user + assistant persisted to the server
      expect(conv.addMessage).toHaveBeenCalledWith("c1", { role: "user", content: "a question" });
      expect(conv.addMessage).toHaveBeenCalledWith("c1", { role: "assistant", content: "the answer" });
      // the chat turn carried the conversationId
      expect(mockStream).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ conversationId: "c1" }),
      );
    });

    it("reuses the active conversation on later sends", async () => {
      useAIChatStore.setState({ conversationId: "existing" });
      (conv.addMessage as jest.Mock).mockResolvedValue(undefined);
      (conv.listConversations as jest.Mock).mockResolvedValue([]);
      mockStream.mockResolvedValue({ text: "reply", tools: [] });

      await get().send("hi again");
      expect(conv.createConversation).not.toHaveBeenCalled();
      expect(conv.addMessage).toHaveBeenCalledWith("existing", { role: "user", content: "hi again" });
    });

    it("loadConversation hydrates messages from the server", async () => {
      (conv.getConversation as jest.Mock).mockResolvedValue({
        id: "c2",
        title: "Old chat",
        messages: [
          { role: "user", content: "earlier q" },
          { role: "assistant", content: "earlier a" },
        ],
      });
      await get().loadConversation("c2");
      expect(get().conversationId).toBe("c2");
      expect(get().messages.map((m) => m.content)).toEqual(["earlier q", "earlier a"]);
    });

    it("removeConversation drops it and resets when active", async () => {
      useAIChatStore.setState({
        conversationId: "c3",
        messages: [{ role: "user", content: "x" }],
        conversations: [{ id: "c3", title: "Doomed" }],
      });
      (conv.deleteConversation as jest.Mock).mockResolvedValue(undefined);
      await get().removeConversation("c3");
      expect(conv.deleteConversation).toHaveBeenCalledWith("c3");
      expect(get().conversations).toEqual([]);
      expect(get().conversationId).toBeNull();
      expect(get().messages).toEqual([]);
    });

    it("newConversation clears the active thread + id", async () => {
      useAIChatStore.setState({ conversationId: "c4", messages: [{ role: "user", content: "x" }] });
      await get().newConversation();
      expect(get().conversationId).toBeNull();
      expect(get().messages).toEqual([]);
    });
  });
});
