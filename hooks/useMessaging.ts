import { useCallback, useState } from "react";
import { useClient } from "@objectstack/client-react";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

export interface Message {
  id: string;
  channelId: string;
  threadId?: string;
  senderId: string;
  content: string;
  timestamp: string;
  editedAt?: string;
  reactions?: Array<{ emoji: string; userIds: string[] }>;
  attachments?: Array<{ id: string; name: string; url: string; type: string }>;
}

export interface Thread {
  id: string;
  channelId: string;
  parentMessageId: string;
  messageCount: number;
  lastMessageAt: string;
  participants: string[];
}

export interface UseMessagingResult {
  /** Messages in the active channel/thread */
  messages: Message[];
  /** Active threads */
  threads: Thread[];
  /** Send a message */
  sendMessage: (channelId: string, content: string, threadId?: string) => Promise<Message>;
  /** Edit a message */
  editMessage: (messageId: string, content: string) => Promise<Message>;
  /** Delete a message */
  deleteMessage: (messageId: string) => Promise<void>;
  /** Get messages for a channel */
  getMessages: (channelId: string, options?: { limit?: number; before?: string }) => Promise<Message[]>;
  /** Get threads for a channel */
  getThreads: (channelId: string) => Promise<Thread[]>;
  /** Add a reaction to a message */
  addReaction: (messageId: string, emoji: string) => Promise<void>;
  /** Whether an operation is in progress */
  isLoading: boolean;
  /** Last error */
  error: Error | null;
}

/* ------------------------------------------------------------------ */
/*  Hook                                                                */
/* ------------------------------------------------------------------ */

/**
 * Hook for real-time messaging — DMs, threads, reactions
 * via `client.realtime.messaging.*`.
 *
 * Implements v1.5 Messaging & Channels (Slack/Teams pattern).
 *
 * ```ts
 * const { messages, sendMessage, getMessages } = useMessaging();
 * await getMessages("channel-1");
 * await sendMessage("channel-1", "Hello!");
 * ```
 */
export function useMessaging(): UseMessagingResult {
  const client = useClient();
  const [messages, setMessages] = useState<Message[]>([]);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const sendMessage = useCallback(
    async (channelId: string, content: string, threadId?: string): Promise<Message> => {
      setIsLoading(true);
      setError(null);
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result = await (client as any).realtime.messaging.send({ channelId, content, threadId });
        setMessages((prev) => [...prev, result]);
        return result;
      } catch (err: unknown) {
        const e = err instanceof Error ? err : new Error("Failed to send message");
        setError(e);
        throw e;
      } finally {
        setIsLoading(false);
      }
    },
    [client],
  );

  const editMessage = useCallback(
    async (messageId: string, content: string): Promise<Message> => {
      setIsLoading(true);
      setError(null);
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result = await (client as any).realtime.messaging.edit({ messageId, content });
        setMessages((prev) =>
          prev.map((m) => (m.id === messageId ? result : m)),
        );
        return result;
      } catch (err: unknown) {
        const e = err instanceof Error ? err : new Error("Failed to edit message");
        setError(e);
        throw e;
      } finally {
        setIsLoading(false);
      }
    },
    [client],
  );

  const deleteMessage = useCallback(
    async (messageId: string): Promise<void> => {
      setIsLoading(true);
      setError(null);
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (client as any).realtime.messaging.delete(messageId);
        setMessages((prev) => prev.filter((m) => m.id !== messageId));
      } catch (err: unknown) {
        const e = err instanceof Error ? err : new Error("Failed to delete message");
        setError(e);
        throw e;
      } finally {
        setIsLoading(false);
      }
    },
    [client],
  );

  const getMessages = useCallback(
    async (channelId: string, options?: { limit?: number; before?: string }): Promise<Message[]> => {
      setIsLoading(true);
      setError(null);
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result = await (client as any).realtime.messaging.list({ channelId, ...options });
        setMessages(result);
        return result;
      } catch (err: unknown) {
        const e = err instanceof Error ? err : new Error("Failed to get messages");
        setError(e);
        throw e;
      } finally {
        setIsLoading(false);
      }
    },
    [client],
  );

  const getThreads = useCallback(
    async (channelId: string): Promise<Thread[]> => {
      setIsLoading(true);
      setError(null);
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result = await (client as any).realtime.messaging.threads(channelId);
        setThreads(result);
        return result;
      } catch (err: unknown) {
        const e = err instanceof Error ? err : new Error("Failed to get threads");
        setError(e);
        throw e;
      } finally {
        setIsLoading(false);
      }
    },
    [client],
  );

  const addReaction = useCallback(
    async (messageId: string, emoji: string): Promise<void> => {
      setError(null);
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (client as any).realtime.messaging.react({ messageId, emoji });
      } catch (err: unknown) {
        const e = err instanceof Error ? err : new Error("Failed to add reaction");
        setError(e);
        throw e;
      }
    },
    [client],
  );

  return { messages, threads, sendMessage, editMessage, deleteMessage, getMessages, getThreads, addReaction, isLoading, error };
}
