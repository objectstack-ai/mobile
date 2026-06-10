jest.mock("~/lib/ai-chat", () => ({ streamAiChat: jest.fn() }));
import { streamAiChat } from "~/lib/ai-chat";
import { useAIChatStore } from "~/stores/ai-chat-store";

const mockStream = streamAiChat as jest.Mock;

function reset() {
  // clear() also wipes the persisted (MMKV) thread, which is module-level and
  // would otherwise leak between tests.
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
    mockStream.mockImplementation(async (_msgs, opts) => {
      opts?.onUpdate?.("Hel", []);
      opts?.onUpdate?.("Hello", ["query_data"]);
      return { text: "Hello", toolCalls: ["query_data"] };
    });

    await get().send("hi there");

    const { messages, isLoading } = get();
    expect(isLoading).toBe(false);
    expect(messages).toHaveLength(2);
    expect(messages[0]).toEqual({ role: "user", content: "hi there" });
    expect(messages[1]).toEqual({ role: "assistant", content: "Hello", toolCalls: ["query_data"] });
  });

  it("persists messages across hook instances (module-level store)", async () => {
    mockStream.mockResolvedValue({ text: "saved", toolCalls: [] });
    await get().send("remember this");
    // A fresh read of the store (as a remounted screen would do) still sees it.
    expect(useAIChatStore.getState().messages.map((m) => m.content)).toEqual([
      "remember this",
      "saved",
    ]);
  });

  it("ignores empty input and concurrent sends", async () => {
    mockStream.mockResolvedValue({ text: "ok", toolCalls: [] });
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
    mockStream.mockResolvedValueOnce({ text: "recovered", toolCalls: [] });
    get().retry();
    await Promise.resolve();
    await new Promise((r) => setTimeout(r, 0));
    expect(get().messages.map((m) => m.content)).toEqual(["will fail", "recovered"]);
  });

  it("marks a stopped reply and keeps partial text", async () => {
    mockStream.mockImplementation(async (_msgs, opts) => {
      opts?.onUpdate?.("partial", []);
      get().stop(); // user stops mid-stream
      return { text: "partial", toolCalls: [] };
    });
    await get().send("long answer");
    expect(get().messages[1].content).toContain("partial");
    expect(get().messages[1].content).toContain("stopped");
  });

  it("clear() empties the conversation", async () => {
    mockStream.mockResolvedValue({ text: "hi", toolCalls: [] });
    await get().send("hello");
    expect(get().messages.length).toBe(2);
    get().clear();
    expect(get().messages).toEqual([]);
    expect(get().error).toBeNull();
  });

  describe("disk persistence (survives restart)", () => {
    it("persists the thread and restores it via hydrate()", async () => {
      mockStream.mockResolvedValue({ text: "saved reply", toolCalls: ["query_data"] });
      await get().send("persist me");

      // Simulate an app restart: drop the in-memory state, then re-hydrate from
      // disk (reads the same MMKV instance the send wrote to).
      useAIChatStore.setState({ messages: [] });
      expect(get().messages).toEqual([]);

      get().hydrate();
      const restored = get().messages;
      expect(restored.map((m) => m.content)).toEqual(["persist me", "saved reply"]);
      expect(restored[1].toolCalls).toEqual(["query_data"]);
    });

    it("clear() wipes the persisted thread too", async () => {
      mockStream.mockResolvedValue({ text: "hi", toolCalls: [] });
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
});
