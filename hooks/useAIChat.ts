import { useCallback, useRef, useState } from "react";
import { streamAiChat, type AiChatMessage } from "~/lib/ai-chat";

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
  /** Re-send the message from the last failed turn (no-op if none). */
  retry: () => void;
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
  // The user text from the last turn that failed, so it can be retried.
  const lastFailed = useRef<string | null>(null);

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || inFlight.current) return;
      inFlight.current = true;

      const userMsg: AIChatMessage = { role: "user", content: trimmed };
      // Snapshot the history to send (current messages + this user turn).
      const history = [...messages, userMsg];
      const wire: AiChatMessage[] = history.map((m) => ({ role: m.role, content: m.content }));

      // Append the user turn plus an empty assistant placeholder that the
      // stream fills in live.
      setMessages([...history, { role: "assistant", content: "" }]);
      setIsLoading(true);
      setError(null);

      // Update only the trailing assistant placeholder as text streams in.
      const patchAssistant = (content: string, toolCalls: string[]) => {
        setMessages((prev) => {
          const next = [...prev];
          const last = next.length - 1;
          if (last >= 0 && next[last].role === "assistant") {
            next[last] = {
              role: "assistant",
              content,
              ...(toolCalls.length > 0 ? { toolCalls } : {}),
            };
          }
          return next;
        });
      };

      try {
        // Throttle live updates: re-rendering markdown on every token is
        // expensive, so coalesce to ~12 fps. The final patch after the await
        // always flushes the complete text, so nothing is lost.
        let lastPatch = 0;
        const result = await streamAiChat(wire, {
          onUpdate: (text, toolCalls) => {
            const now = Date.now();
            if (now - lastPatch >= 80) {
              lastPatch = now;
              patchAssistant(text, toolCalls);
            }
          },
        });
        const content =
          result.error ??
          (result.text.trim() !== "" ? result.text : "I couldn't generate a response.");
        patchAssistant(content, result.toolCalls);
        lastFailed.current = null;
      } catch (err) {
        setError(err instanceof Error ? err : new Error("Chat request failed"));
        // Roll back the optimistic user turn + assistant placeholder, and
        // remember the input so it can be retried.
        lastFailed.current = trimmed;
        setMessages((prev) => prev.slice(0, -2));
      } finally {
        setIsLoading(false);
        inFlight.current = false;
      }
    },
    [messages],
  );

  const retry = useCallback(() => {
    const text = lastFailed.current;
    if (text) {
      lastFailed.current = null;
      void send(text);
    }
  }, [send]);

  const clear = useCallback(() => {
    setMessages([]);
    setError(null);
    lastFailed.current = null;
  }, []);

  return { messages, isLoading, error, send, retry, clear };
}
