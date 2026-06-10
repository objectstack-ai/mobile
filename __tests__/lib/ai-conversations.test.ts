jest.mock("~/lib/objectstack", () => ({ apiFetch: jest.fn() }));
import { apiFetch } from "~/lib/objectstack";
import {
  conversationsAvailable,
  resetConversationsAvailability,
  listConversations,
  createConversation,
  getConversation,
  deleteConversation,
  addMessage,
  renameConversation,
  deriveConversationTitle,
} from "~/lib/ai-conversations";

const mockApiFetch = apiFetch as jest.Mock;

const res = (init: { status?: number; ok?: boolean; json?: unknown }) => ({
  ok: init.ok ?? (init.status ?? 200) < 400,
  status: init.status ?? 200,
  json: async () => init.json ?? {},
});

beforeEach(() => {
  jest.clearAllMocks();
  resetConversationsAvailability();
});

describe("conversationsAvailable", () => {
  it("is true when the list endpoint responds, false on 404, cached after first probe", async () => {
    mockApiFetch.mockResolvedValueOnce(res({ status: 200 }));
    expect(await conversationsAvailable()).toBe(true);
    expect(await conversationsAvailable()).toBe(true); // cached, no 2nd call
    expect(mockApiFetch).toHaveBeenCalledTimes(1);

    resetConversationsAvailability();
    mockApiFetch.mockResolvedValueOnce(res({ status: 404 }));
    expect(await conversationsAvailable()).toBe(false);
  });

  it("degrades to false on a network error", async () => {
    mockApiFetch.mockRejectedValueOnce(new Error("offline"));
    expect(await conversationsAvailable()).toBe(false);
  });
});

describe("conversation CRUD", () => {
  it("lists conversations, dropping placeholder titles", async () => {
    mockApiFetch.mockResolvedValueOnce(
      res({
        json: {
          conversations: [
            { id: "c1", title: "Real title", updatedAt: "t1" },
            { id: "c2", title: "   ", updatedAt: "t2" },
          ],
        },
      }),
    );
    const list = await listConversations();
    expect(list).toEqual([
      { id: "c1", title: "Real title", updatedAt: "t1" },
      { id: "c2", title: undefined, updatedAt: "t2" },
    ]);
  });

  it("creates a conversation and normalizes the shape", async () => {
    mockApiFetch.mockResolvedValueOnce(
      res({ status: 201, json: { id: "c9", title: "New", messages: [] } }),
    );
    const conv = await createConversation("New");
    expect(conv).toEqual({ id: "c9", title: "New", messages: [], updatedAt: undefined });
    expect(mockApiFetch).toHaveBeenCalledWith(
      "/api/v1/ai/conversations",
      expect.objectContaining({ method: "POST", body: JSON.stringify({ title: "New" }) }),
    );
  });

  it("loads a conversation with its messages", async () => {
    mockApiFetch.mockResolvedValueOnce(
      res({
        json: {
          id: "c1",
          title: "Chat",
          messages: [
            { role: "user", content: "hi" },
            { role: "assistant", content: "hello" },
            { role: "system", content: "ignored" },
          ],
        },
      }),
    );
    const conv = await getConversation("c1");
    expect(conv?.messages).toEqual([
      { role: "user", content: "hi" },
      { role: "assistant", content: "hello" },
    ]);
  });

  it("returns null for a missing conversation (404/403)", async () => {
    mockApiFetch.mockResolvedValueOnce(res({ status: 404 }));
    expect(await getConversation("gone")).toBeNull();
  });

  it("appends a message and deletes a conversation", async () => {
    mockApiFetch.mockResolvedValue(res({ status: 200 }));
    await addMessage("c1", { role: "user", content: "yo" });
    expect(mockApiFetch).toHaveBeenCalledWith(
      "/api/v1/ai/conversations/c1/messages",
      expect.objectContaining({ method: "POST", body: JSON.stringify({ role: "user", content: "yo" }) }),
    );
    await deleteConversation("c1");
    expect(mockApiFetch).toHaveBeenCalledWith(
      "/api/v1/ai/conversations/c1",
      expect.objectContaining({ method: "DELETE" }),
    );
  });

  it("renames a conversation via PATCH", async () => {
    mockApiFetch.mockResolvedValue(res({ status: 200 }));
    await renameConversation("c1", "Renamed");
    expect(mockApiFetch).toHaveBeenCalledWith(
      "/api/v1/ai/conversations/c1",
      expect.objectContaining({ method: "PATCH", body: JSON.stringify({ title: "Renamed" }) }),
    );
  });
});

describe("deriveConversationTitle", () => {
  it("uses a short first message verbatim, collapsing whitespace", () => {
    expect(deriveConversationTitle("  How many   orders? ")).toBe("How many orders?");
  });

  it("truncates long messages at a word boundary with an ellipsis", () => {
    const msg = "Show me everything that happened across all of the projects this past quarter please";
    const title = deriveConversationTitle(msg);
    expect(title.length).toBeLessThanOrEqual(49);
    expect(title.endsWith("…")).toBe(true);
    const stem = title.slice(0, -1); // drop the ellipsis
    expect(msg.startsWith(stem)).toBe(true); // a real prefix of the message
    // the very next char in the message is whitespace → we cut on a word boundary
    expect(/\s/.test(msg[stem.length])).toBe(true);
  });

  it("falls back for empty input", () => {
    expect(deriveConversationTitle("   ")).toBe("New conversation");
  });
});
