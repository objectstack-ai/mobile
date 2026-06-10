import { create } from "zustand";
import { createMMKV } from "react-native-mmkv";
import { streamAiChat, type AiChatMessage } from "~/lib/ai-chat";

/** A chat message plus the tool activity that produced an assistant reply. */
export interface AIChatMessage {
  role: "user" | "assistant";
  content: string;
  /** Tools the agent ran to produce this reply (assistant messages only). */
  toolCalls?: string[];
}

/* ------------------------------------------------------------------ */
/*  Disk persistence (MMKV)                                            */
/* ------------------------------------------------------------------ */

/**
 * The conversation is persisted to MMKV so it **survives an app restart**, not
 * just navigation. (Server-backed multi-conversation history — the objectui
 * `/api/v1/ai/conversations` model — is a follow-up that needs the server to
 * expose that API; published service-ai 8.0.1 does not.)
 */
const storage = createMMKV({ id: "objectstack-ai-chat" });
const MESSAGES_KEY = "messages";
/** Don't let an unbounded thread bloat storage. */
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

interface AIChatState {
  messages: AIChatMessage[];
  isLoading: boolean;
  error: Error | null;
  /** Send a user message; appends the user turn then the streamed reply. */
  send: (text: string) => Promise<void>;
  /** Re-send the message from the last failed turn (no-op if none). */
  retry: () => void;
  /** Stop the in-flight generation, keeping whatever streamed so far. */
  stop: () => void;
  /** Reset the conversation. */
  clear: () => void;
  /** Reload the persisted thread from disk (used on cold start / restore). */
  hydrate: () => void;
}

// Non-reactive internals (don't belong in render state).
let inFlight = false;
let lastFailed: string | null = null;
let controller: AbortController | null = null;

/**
 * Conversation state for the AI assistant, kept in a module-level store so the
 * thread **survives screen navigation** (leaving `/ai` and returning keeps the
 * conversation) — addressing the "lose my chat on exit" gap. Backed by the
 * `/api/v1/ai/chat` streaming agent (see `lib/ai-chat`).
 */
export const useAIChatStore = create<AIChatState>((set, get) => ({
  // Restore the persisted thread on cold start.
  messages: loadPersistedMessages(),
  isLoading: false,
  error: null,

  send: async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || inFlight) return;
    inFlight = true;

    const history = [...get().messages, { role: "user" as const, content: trimmed }];
    const wire: AiChatMessage[] = history.map((m) => ({ role: m.role, content: m.content }));

    // Append the user turn + an empty assistant placeholder the stream fills in.
    set({ messages: [...history, { role: "assistant", content: "" }], isLoading: true, error: null });

    const patchAssistant = (content: string, toolCalls: string[]) => {
      set((state) => {
        const next = [...state.messages];
        const last = next.length - 1;
        if (last >= 0 && next[last].role === "assistant") {
          next[last] = { role: "assistant", content, ...(toolCalls.length > 0 ? { toolCalls } : {}) };
        }
        return { messages: next };
      });
    };

    controller = new AbortController();
    try {
      let lastPatch = 0;
      const result = await streamAiChat(wire, {
        signal: controller.signal,
        onUpdate: (t, tools) => {
          const now = Date.now();
          if (now - lastPatch >= 80) {
            lastPatch = now;
            patchAssistant(t, tools);
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
      patchAssistant(content, result.toolCalls);
      lastFailed = null;
      persistMessages(get().messages);
    } catch (err) {
      set({ error: err instanceof Error ? err : new Error("Chat request failed") });
      lastFailed = trimmed;
      // Roll back the optimistic user turn + assistant placeholder.
      set((state) => ({ messages: state.messages.slice(0, -2) }));
      persistMessages(get().messages);
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
    persistMessages([]);
  },

  hydrate: () => set({ messages: loadPersistedMessages() }),
}));
