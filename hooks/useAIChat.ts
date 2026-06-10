import { useCallback, useRef, useState } from "react";
import { sendAiChat, type AiChatMessage } from "~/lib/ai-chat";

/** A chat message with the tool activity that produced an assistant reply. */
export interface AIChatMessage {
  role: "user" | "assistant";
  content: string;
  /** Tools the agent ran to produce this reply (assistant messages only). */
  toolCalls?: string[];
}

export interface UseAIChatResult {
  messages: AIChatMessage[];
  isLoading: boolean;
  error: Error | null;
  /** Send a user message; appends the user turn then the assistant reply. */
  send: (text: string) => Promise<void>;
  /** Reset the conversation. */
  clear: () => void;
}

/**
 * Conversational AI chat backed by the ObjectStack 8.0 `/api/v1/ai/chat`
 * tool-using agent (see `lib/ai-chat`). The full message history is sent each
 * turn (the endpoint is stateless + object-agnostic), and the streamed reply is
 * parsed into a single assistant message.
 */
export function useAIChat(): UseAIChatResult {
  const [messages, setMessages] = useState<AIChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  // Guard against overlapping sends (double-tap / rapid submit).
  const inFlight = useRef(false);

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || inFlight.current) return;
      inFlight.current = true;

      const userMsg: AIChatMessage = { role: "user", content: trimmed };
      // Snapshot the history to send (current messages + this user turn).
      const history = [...messages, userMsg];
      const wire: AiChatMessage[] = history.map((m) => ({ role: m.role, content: m.content }));

      setMessages(history);
      setIsLoading(true);
      setError(null);

      try {
        const result = await sendAiChat(wire);
        const content =
          result.error ??
          (result.text.trim() !== "" ? result.text : "I couldn't generate a response.");
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content,
            ...(result.toolCalls.length > 0 ? { toolCalls: result.toolCalls } : {}),
          },
        ]);
      } catch (err) {
        setError(err instanceof Error ? err : new Error("Chat request failed"));
        // Roll the optimistic user message back so they can retry.
        setMessages((prev) => prev.slice(0, -1));
      } finally {
        setIsLoading(false);
        inFlight.current = false;
      }
    },
    [messages],
  );

  const clear = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  return { messages, isLoading, error, send, clear };
}
