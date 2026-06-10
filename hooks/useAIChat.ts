import { useAIChatStore, type AIChatMessage } from "~/stores/ai-chat-store";

export type { AIChatMessage } from "~/stores/ai-chat-store";

export interface UseAIChatResult {
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
}

/**
 * Conversational AI chat backed by the ObjectStack 8.0 `/api/v1/ai/chat`
 * tool-using agent. State lives in a module-level zustand store
 * (`stores/ai-chat-store`) so the thread survives navigating away from and
 * back to the assistant screen.
 */
export function useAIChat(): UseAIChatResult {
  const messages = useAIChatStore((s) => s.messages);
  const isLoading = useAIChatStore((s) => s.isLoading);
  const error = useAIChatStore((s) => s.error);
  const send = useAIChatStore((s) => s.send);
  const retry = useAIChatStore((s) => s.retry);
  const stop = useAIChatStore((s) => s.stop);
  const clear = useAIChatStore((s) => s.clear);
  return { messages, isLoading, error, send, retry, stop, clear };
}
