import { useCallback, useState } from "react";
import { useClient } from "@objectstack/client-react";
import type {
  AiNlqRequest,
  AiNlqResponse,
  AiChatRequest,
  AiChatResponse,
  AiSuggestRequest,
  AiSuggestResponse,
  AiInsightsRequest,
  AiInsightsResponse,
} from "@objectstack/client";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  actions?: Array<{ type: string; label: string; data?: Record<string, unknown> }>;
}

export interface UseAIResult {
  /** Convert natural language to an ObjectQL query */
  nlq: (query: string, object?: string) => Promise<AiNlqResponse>;
  /** Send a chat message and receive an AI response */
  chat: (message: string, context?: Record<string, unknown>) => Promise<AiChatResponse>;
  /** Get AI-powered field value suggestions */
  suggest: (request: Omit<AiSuggestRequest, "object">) => Promise<AiSuggestResponse>;
  /** Get AI-powered data insights */
  insights: (type?: "summary" | "trends" | "anomalies" | "recommendations", recordId?: string) => Promise<AiInsightsResponse>;
  /** Full chat history for the current conversation */
  messages: ChatMessage[];
  /** Current conversation ID (set after first chat message) */
  conversationId: string | null;
  /** Clear the conversation history and start fresh */
  clearConversation: () => void;
  /** Whether an AI operation is in progress */
  isLoading: boolean;
  /** Last error */
  error: Error | null;
}

/* ------------------------------------------------------------------ */
/*  Hook                                                                */
/* ------------------------------------------------------------------ */

/**
 * Hook for AI-powered features via `client.ai.*`.
 *
 * Wraps the SDK AI API with React state management for:
 * - Natural language queries (`nlq`)
 * - Multi-turn chat conversations (`chat`)
 * - Smart suggestions (`suggest`)
 * - Data insights (`insights`)
 *
 * @param objectName - The default object context for AI operations
 */
export function useAI(objectName: string): UseAIResult {
  const client = useClient();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);

  const nlq = useCallback(
    async (query: string, object?: string): Promise<AiNlqResponse> => {
      setIsLoading(true);
      setError(null);
      try {
        const request: AiNlqRequest = {
          query,
          object: object ?? objectName,
          ...(conversationId ? { conversationId } : {}),
        };
        return await client.ai.nlq(request);
      } catch (err: unknown) {
        const aiError = err instanceof Error ? err : new Error("NLQ request failed");
        setError(aiError);
        throw aiError;
      } finally {
        setIsLoading(false);
      }
    },
    [client, objectName, conversationId],
  );

  const chat = useCallback(
    async (message: string, context?: Record<string, unknown>): Promise<AiChatResponse> => {
      setIsLoading(true);
      setError(null);

      // Add user message to history
      setMessages((prev) => [...prev, { role: "user", content: message }]);

      try {
        const request: AiChatRequest = {
          message,
          ...(conversationId ? { conversationId } : {}),
          ...(context ? { context } : {}),
        };
        const response = await client.ai.chat(request);

        // Track conversation ID
        if (response.conversationId) {
          setConversationId(response.conversationId);
        }

        // Add assistant message to history
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: response.message,
            actions: response.actions,
          },
        ]);

        return response;
      } catch (err: unknown) {
        const aiError = err instanceof Error ? err : new Error("Chat request failed");
        setError(aiError);
        // Remove the optimistic user message on failure
        setMessages((prev) => prev.slice(0, -1));
        throw aiError;
      } finally {
        setIsLoading(false);
      }
    },
    [client, conversationId],
  );

  const suggest = useCallback(
    async (request: Omit<AiSuggestRequest, "object">): Promise<AiSuggestResponse> => {
      setIsLoading(true);
      setError(null);
      try {
        return await client.ai.suggest({ ...request, object: objectName });
      } catch (err: unknown) {
        const aiError = err instanceof Error ? err : new Error("Suggest request failed");
        setError(aiError);
        throw aiError;
      } finally {
        setIsLoading(false);
      }
    },
    [client, objectName],
  );

  const insights = useCallback(
    async (
      type?: "summary" | "trends" | "anomalies" | "recommendations",
      recordId?: string,
    ): Promise<AiInsightsResponse> => {
      setIsLoading(true);
      setError(null);
      try {
        const request: AiInsightsRequest = {
          object: objectName,
          ...(type ? { type } : {}),
          ...(recordId ? { recordId } : {}),
        };
        return await client.ai.insights(request);
      } catch (err: unknown) {
        const aiError = err instanceof Error ? err : new Error("Insights request failed");
        setError(aiError);
        throw aiError;
      } finally {
        setIsLoading(false);
      }
    },
    [client, objectName],
  );

  const clearConversation = useCallback(() => {
    setMessages([]);
    setConversationId(null);
    setError(null);
  }, []);

  return {
    nlq,
    chat,
    suggest,
    insights,
    messages,
    conversationId,
    clearConversation,
    isLoading,
    error,
  };
}
