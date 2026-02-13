/**
 * Tests for useMessaging – validates message CRUD,
 * thread listing, and reaction operations.
 */
import { renderHook, act } from "@testing-library/react-native";

/* ---- Mock useClient from SDK ---- */
const mockSend = jest.fn();
const mockEdit = jest.fn();
const mockDelete = jest.fn();
const mockList = jest.fn();
const mockThreads = jest.fn();
const mockReact = jest.fn();

const mockClient = {
  realtime: {
    messaging: {
      send: mockSend,
      edit: mockEdit,
      delete: mockDelete,
      list: mockList,
      threads: mockThreads,
      react: mockReact,
    },
  },
};

jest.mock("@objectstack/client-react", () => ({
  useClient: () => mockClient,
}));

import { useMessaging } from "~/hooks/useMessaging";

beforeEach(() => {
  mockSend.mockReset();
  mockEdit.mockReset();
  mockDelete.mockReset();
  mockList.mockReset();
  mockThreads.mockReset();
  mockReact.mockReset();
});

describe("useMessaging", () => {
  it("sends a message and adds to list", async () => {
    const msg = { id: "msg-1", channelId: "ch-1", senderId: "user-1", content: "Hello!", timestamp: "2026-01-01T00:00:00Z" };
    mockSend.mockResolvedValue(msg);

    const { result } = renderHook(() => useMessaging());

    let sent: unknown;
    await act(async () => {
      sent = await result.current.sendMessage("ch-1", "Hello!");
    });

    expect(mockSend).toHaveBeenCalledWith({ channelId: "ch-1", content: "Hello!", threadId: undefined });
    expect(sent).toEqual(msg);
    expect(result.current.messages).toContainEqual(msg);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("sends a threaded message", async () => {
    const msg = { id: "msg-2", channelId: "ch-1", threadId: "thread-1", senderId: "user-1", content: "Reply!", timestamp: "2026-01-01T00:01:00Z" };
    mockSend.mockResolvedValue(msg);

    const { result } = renderHook(() => useMessaging());

    await act(async () => {
      await result.current.sendMessage("ch-1", "Reply!", "thread-1");
    });

    expect(mockSend).toHaveBeenCalledWith({ channelId: "ch-1", content: "Reply!", threadId: "thread-1" });
    expect(result.current.messages).toContainEqual(msg);
  });

  it("edits a message", async () => {
    const original = { id: "msg-1", channelId: "ch-1", senderId: "user-1", content: "Hello!", timestamp: "2026-01-01T00:00:00Z" };
    const edited = { ...original, content: "Hello World!", editedAt: "2026-01-01T00:02:00Z" };
    mockSend.mockResolvedValue(original);
    mockEdit.mockResolvedValue(edited);

    const { result } = renderHook(() => useMessaging());

    await act(async () => {
      await result.current.sendMessage("ch-1", "Hello!");
    });

    let updated: unknown;
    await act(async () => {
      updated = await result.current.editMessage("msg-1", "Hello World!");
    });

    expect(mockEdit).toHaveBeenCalledWith({ messageId: "msg-1", content: "Hello World!" });
    expect(updated).toEqual(edited);
    expect(result.current.messages.find((m) => m.id === "msg-1")?.content).toBe("Hello World!");
  });

  it("deletes a message", async () => {
    const msg = { id: "msg-1", channelId: "ch-1", senderId: "user-1", content: "Delete me", timestamp: "2026-01-01T00:00:00Z" };
    mockSend.mockResolvedValue(msg);
    mockDelete.mockResolvedValue(undefined);

    const { result } = renderHook(() => useMessaging());

    await act(async () => {
      await result.current.sendMessage("ch-1", "Delete me");
    });
    expect(result.current.messages).toHaveLength(1);

    await act(async () => {
      await result.current.deleteMessage("msg-1");
    });

    expect(mockDelete).toHaveBeenCalledWith("msg-1");
    expect(result.current.messages).toHaveLength(0);
  });

  it("gets messages for a channel", async () => {
    const msgs = [
      { id: "msg-1", channelId: "ch-1", senderId: "user-1", content: "Hi", timestamp: "2026-01-01T00:00:00Z" },
      { id: "msg-2", channelId: "ch-1", senderId: "user-2", content: "Hey", timestamp: "2026-01-01T00:01:00Z" },
    ];
    mockList.mockResolvedValue(msgs);

    const { result } = renderHook(() => useMessaging());

    let listed: unknown;
    await act(async () => {
      listed = await result.current.getMessages("ch-1", { limit: 50 });
    });

    expect(mockList).toHaveBeenCalledWith({ channelId: "ch-1", limit: 50 });
    expect(listed).toEqual(msgs);
    expect(result.current.messages).toEqual(msgs);
  });

  it("gets threads for a channel", async () => {
    const threadList = [
      { id: "thread-1", channelId: "ch-1", parentMessageId: "msg-1", messageCount: 5, lastMessageAt: "2026-01-01T00:10:00Z", participants: ["user-1", "user-2"] },
    ];
    mockThreads.mockResolvedValue(threadList);

    const { result } = renderHook(() => useMessaging());

    let fetched: unknown;
    await act(async () => {
      fetched = await result.current.getThreads("ch-1");
    });

    expect(mockThreads).toHaveBeenCalledWith("ch-1");
    expect(fetched).toEqual(threadList);
    expect(result.current.threads).toEqual(threadList);
  });

  it("adds a reaction", async () => {
    mockReact.mockResolvedValue(undefined);

    const { result } = renderHook(() => useMessaging());

    await act(async () => {
      await result.current.addReaction("msg-1", "👍");
    });

    expect(mockReact).toHaveBeenCalledWith({ messageId: "msg-1", emoji: "👍" });
    expect(result.current.error).toBeNull();
  });

  it("handles send error", async () => {
    mockSend.mockRejectedValue(new Error("Failed to send message"));

    const { result } = renderHook(() => useMessaging());

    await act(async () => {
      await expect(result.current.sendMessage("ch-1", "bad")).rejects.toThrow("Failed to send message");
    });

    expect(result.current.error?.message).toBe("Failed to send message");
  });

  it("handles delete error", async () => {
    mockDelete.mockRejectedValue(new Error("Failed to delete message"));

    const { result } = renderHook(() => useMessaging());

    await act(async () => {
      await expect(result.current.deleteMessage("msg-1")).rejects.toThrow("Failed to delete message");
    });

    expect(result.current.error?.message).toBe("Failed to delete message");
  });
});
