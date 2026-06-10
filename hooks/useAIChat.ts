import { useAIChatStore, type AIChatMessage } from "~/stores/ai-chat-store";
import type { ConversationSummary } from "~/lib/ai-conversations";

export type { AIChatMessage } from "~/stores/ai-chat-store";

export interface UseAIChatResult {
  messages: AIChatMessage[];
  isLoading: boolean;
  error: Error | null;
  /** True when the server exposes the conversation API (multi-conversation). */
  serverBacked: boolean;
  /** Active server conversation id, or null. */
  conversationId: string | null;
  /** The user's saved conversations (server-backed mode). */
  conversations: ConversationSummary[];
  /** Probe the server + restore the last thread. Call once on mount. */
  init: () => Promise<void>;
  /** Send a user message; appends the user turn then the streamed reply. */
  send: (text: string) => Promise<void>;
  /** Re-send the message from the last failed turn (no-op if none). */
  retry: () => void;
  /** Stop the in-flight generation, keeping whatever streamed so far. */
  stop: () => void;
  /** Clear / unload the active thread. */
  clear: () => void;
  /** Start a brand-new conversation. */
  newConversation: () => Promise<void>;
  /** Load a saved conversation by id. */
  loadConversation: (id: string) => Promise<void>;
  /** Delete a saved conversation. */
  removeConversation: (id: string) => Promise<void>;
  /** Rename a saved conversation. */
  renameConversation: (id: string, title: string) => Promise<void>;
}

/**
 * Conversational AI chat backed by the ObjectStack `/api/v1/ai/chat` agent.
 * State lives in a module-level zustand store (`stores/ai-chat-store`) so the
 * thread survives navigation; when the server exposes `/ai/conversations` the
 * store persists conversations server-side (multi-conversation, cross-device),
 * otherwise it falls back to an on-device MMKV cache.
 */
export function useAIChat(): UseAIChatResult {
  const messages = useAIChatStore((s) => s.messages);
  const isLoading = useAIChatStore((s) => s.isLoading);
  const error = useAIChatStore((s) => s.error);
  const serverBacked = useAIChatStore((s) => s.serverBacked);
  const conversationId = useAIChatStore((s) => s.conversationId);
  const conversations = useAIChatStore((s) => s.conversations);
  const init = useAIChatStore((s) => s.init);
  const send = useAIChatStore((s) => s.send);
  const retry = useAIChatStore((s) => s.retry);
  const stop = useAIChatStore((s) => s.stop);
  const clear = useAIChatStore((s) => s.clear);
  const newConversation = useAIChatStore((s) => s.newConversation);
  const loadConversation = useAIChatStore((s) => s.loadConversation);
  const removeConversation = useAIChatStore((s) => s.removeConversation);
  const renameConversation = useAIChatStore((s) => s.renameConversation);
  return {
    messages,
    isLoading,
    error,
    serverBacked,
    conversationId,
    conversations,
    init,
    send,
    retry,
    stop,
    clear,
    newConversation,
    loadConversation,
    removeConversation,
    renameConversation,
  };
}
