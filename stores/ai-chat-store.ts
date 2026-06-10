import { create } from "zustand";
import { createMMKV } from "react-native-mmkv";
import { streamAiChat, type AiChatMessage, type ToolInvocation } from "~/lib/ai-chat";
import {
  conversationsAvailable,
  listConversations,
  createConversation,
  getConversation,
  deleteConversation,
  addMessage,
  deriveConversationTitle,
  renameConversation as renameConversationApi,
  type ConversationSummary,
} from "~/lib/ai-conversations";

/** A chat message plus the tool activity that produced an assistant reply. */
export interface AIChatMessage {
  role: "user" | "assistant";
  content: string;
  /** Structured tool invocations the agent ran (assistant messages only). */
  tools?: ToolInvocation[];
  /** The model's reasoning/thinking text, if it streamed any. */
  reasoning?: string;
}

/* ------------------------------------------------------------------ */
/*  Local cache (MMKV)                                                 */
/* ------------------------------------------------------------------ */

/**
 * Two-tier persistence:
 *  - **Server-backed** (`conversationsAvailable()` true): conversations live on
 *    the server under the user — multi-conversation, cross-device — mirroring
 *    the web. The active conversation id is cached locally so the thread
 *    resumes on app open.
 *  - **Local fallback** (server lacks `/conversations`, e.g. service-ai 8.0.1):
 *    the single active thread is cached to MMKV so it survives a restart.
 */
const storage = createMMKV({ id: "objectstack-ai-chat" });
const MESSAGES_KEY = "messages";
const ACTIVE_ID_KEY = "active-conversation-id";
const MAX_PERSISTED = 200;

function loadPersistedMessages(): AIChatMessage[] {
  try {
    const raw = storage.getString(MESSAGES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (m): m is AIChatMessage =>
        Boolean(m) &&
        typeof m === "object" &&
        ((m as AIChatMessage).role === "user" || (m as AIChatMessage).role === "assistant") &&
        typeof (m as AIChatMessage).content === "string",
    );
  } catch {
    return [];
  }
}

function persistMessages(messages: AIChatMessage[]): void {
  try {
    if (messages.length === 0) storage.remove(MESSAGES_KEY);
    else storage.set(MESSAGES_KEY, JSON.stringify(messages.slice(-MAX_PERSISTED)));
  } catch {
    /* ignore — storage unavailable (e.g. web) shouldn't break chat */
  }
}

function rememberActiveId(id: string | null): void {
  try {
    if (id) storage.set(ACTIVE_ID_KEY, id);
    else storage.remove(ACTIVE_ID_KEY);
  } catch {
    /* ignore */
  }
}

function recallActiveId(): string | null {
  try {
    return storage.getString(ACTIVE_ID_KEY) ?? null;
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/*  Store                                                              */
/* ------------------------------------------------------------------ */

interface AIChatState {
  messages: AIChatMessage[];
  isLoading: boolean;
  error: Error | null;
  /** True once the server is known to expose the conversation API. */
  serverBacked: boolean;
  /** The active server conversation id (server-backed mode), else null. */
  conversationId: string | null;
  /** All of the user's conversations (server-backed mode). */
  conversations: ConversationSummary[];

  /** Probe the server + restore the last thread. Idempotent. */
  init: () => Promise<void>;
  send: (text: string) => Promise<void>;
  retry: () => void;
  stop: () => void;
  /** Clear the active thread (server-backed: just unloads; local: wipes cache). */
  clear: () => void;
  /** Start a brand-new conversation. */
  newConversation: () => Promise<void>;
  /** Load an existing server conversation by id. */
  loadConversation: (id: string) => Promise<void>;
  /** Delete a server conversation; resets the view if it was active. */
  removeConversation: (id: string) => Promise<void>;
  /** Rename a server conversation. */
  renameConversation: (id: string, title: string) => Promise<void>;
  /** Refresh the conversation list from the server. */
  refreshConversations: () => Promise<void>;
  /** Reload the local cached thread (cold-start restore in local mode). */
  hydrate: () => void;
}

// Non-reactive internals.
let inFlight = false;
let lastFailed: string | null = null;
let controller: AbortController | null = null;
let initialized = false;

export const useAIChatStore = create<AIChatState>((set, get) => ({
  // In local mode this restores the cached thread immediately; in server mode
  // `init()` replaces it with the resumed conversation.
  messages: loadPersistedMessages(),
  isLoading: false,
  error: null,
  serverBacked: false,
  conversationId: null,
  conversations: [],

  init: async () => {
    if (initialized) return;
    initialized = true;
    let available = false;
    try {
      available = await conversationsAvailable();
    } catch {
      available = false;
    }
    set({ serverBacked: available });
    if (!available) return; // local-cache mode keeps the MMKV-restored thread

    // Server mode: don't show a stale local thread.
    set({ messages: [] });
    try {
      const list = await listConversations();
      set({ conversations: list });
      // Resume the cached active conversation if it still exists.
      const cached = recallActiveId();
      const resume = cached && list.some((c) => c.id === cached) ? cached : undefined;
      if (resume) await get().loadConversation(resume);
    } catch {
      /* best-effort; an empty list is fine */
    }
  },

  send: async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || inFlight) return;
    inFlight = true;

    const serverBacked = get().serverBacked;
    const history = [...get().messages, { role: "user" as const, content: trimmed }];
    const wire: AiChatMessage[] = history.map((m) => ({ role: m.role, content: m.content }));

    set({ messages: [...history, { role: "assistant", content: "" }], isLoading: true, error: null });

    const patchAssistant = (content: string, tools: ToolInvocation[], reasoning = "") => {
      set((state) => {
        const next = [...state.messages];
        const last = next.length - 1;
        if (last >= 0 && next[last].role === "assistant") {
          next[last] = {
            role: "assistant",
            content,
            ...(tools.length > 0 ? { tools } : {}),
            ...(reasoning.trim() !== "" ? { reasoning } : {}),
          };
        }
        return { messages: next };
      });
    };

    // Ensure a server conversation exists before the turn (server mode).
    let conversationId = get().conversationId;
    if (serverBacked && !conversationId) {
      try {
        // Title the conversation from its first message (the server's LLM
        // auto-titling only runs on its own persist path, which we bypass).
        const conv = await createConversation(deriveConversationTitle(trimmed));
        conversationId = conv.id;
        set({ conversationId });
        rememberActiveId(conversationId);
      } catch {
        /* fall back to a non-persisted turn */
      }
    }

    controller = new AbortController();
    try {
      let lastPatch = 0;
      const result = await streamAiChat(wire, {
        signal: controller.signal,
        conversationId: conversationId ?? undefined,
        onUpdate: (t, tools, reasoning) => {
          const now = Date.now();
          if (now - lastPatch >= 80) {
            lastPatch = now;
            patchAssistant(t, tools, reasoning);
          }
        },
      });
      const stopped = controller.signal.aborted;
      const content =
        result.error ??
        (result.text.trim() !== ""
          ? result.text + (stopped ? " …(stopped)" : "")
          : stopped
            ? "(stopped)"
            : "I couldn't generate a response.");
      patchAssistant(content, result.tools, result.reasoning);
      lastFailed = null;

      if (serverBacked && conversationId) {
        // Explicit persistence (reliable across server builds).
        await addMessage(conversationId, { role: "user", content: trimmed }).catch(() => {});
        if (!result.error) {
          await addMessage(conversationId, { role: "assistant", content }).catch(() => {});
        }
        void get().refreshConversations();
      } else {
        persistMessages(get().messages);
      }
    } catch (err) {
      set({ error: err instanceof Error ? err : new Error("Chat request failed") });
      lastFailed = trimmed;
      set((state) => ({ messages: state.messages.slice(0, -2) }));
      if (!serverBacked) persistMessages(get().messages);
    } finally {
      set({ isLoading: false });
      inFlight = false;
      controller = null;
    }
  },

  retry: () => {
    const text = lastFailed;
    if (text) {
      lastFailed = null;
      void get().send(text);
    }
  },

  stop: () => {
    controller?.abort();
  },

  clear: () => {
    controller?.abort();
    lastFailed = null;
    set({ messages: [], error: null });
    if (get().serverBacked) {
      set({ conversationId: null });
      rememberActiveId(null);
    } else {
      persistMessages([]);
    }
  },

  newConversation: async () => {
    controller?.abort();
    lastFailed = null;
    set({ messages: [], error: null, conversationId: null });
    rememberActiveId(null);
    // The conversation row is created lazily on the first message (send()).
  },

  loadConversation: async (id: string) => {
    try {
      const conv = await getConversation(id);
      if (!conv) {
        // Gone on the server — drop it from the list.
        set((s) => ({ conversations: s.conversations.filter((c) => c.id !== id) }));
        return;
      }
      set({
        conversationId: conv.id,
        messages: conv.messages.map((m) => ({ role: m.role, content: m.content })),
        error: null,
      });
      rememberActiveId(conv.id);
    } catch {
      /* leave the current view as-is on a transient error */
    }
  },

  removeConversation: async (id: string) => {
    await deleteConversation(id);
    set((s) => ({ conversations: s.conversations.filter((c) => c.id !== id) }));
    if (get().conversationId === id) {
      set({ messages: [], conversationId: null });
      rememberActiveId(null);
    }
  },

  renameConversation: async (id: string, title: string) => {
    const trimmed = title.trim();
    if (trimmed === "") return;
    // Optimistic local update, then persist.
    set((s) => ({
      conversations: s.conversations.map((c) => (c.id === id ? { ...c, title: trimmed } : c)),
    }));
    await renameConversationApi(id, trimmed);
  },

  refreshConversations: async () => {
    if (!get().serverBacked) return;
    try {
      set({ conversations: await listConversations() });
    } catch {
      /* ignore */
    }
  },

  hydrate: () => set({ messages: loadPersistedMessages() }),
}));
