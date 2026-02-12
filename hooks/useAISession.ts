import { useCallback, useState } from "react";
import { useClient } from "@objectstack/client-react";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

export interface AISession {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
  tokenUsage: number;
}

export interface UseAISessionResult {
  /** All loaded sessions */
  sessions: AISession[];
  /** Currently active session */
  activeSession: AISession | null;
  /** Create a new conversation session */
  createSession: (title?: string) => Promise<AISession>;
  /** Resume an existing session by ID */
  resumeSession: (sessionId: string) => Promise<AISession>;
  /** Delete a session by ID */
  deleteSession: (sessionId: string) => Promise<void>;
  /** List all sessions */
  listSessions: () => Promise<AISession[]>;
  /** Whether a session operation is in progress */
  isLoading: boolean;
  /** Last error */
  error: Error | null;
}

/* ------------------------------------------------------------------ */
/*  Hook                                                                */
/* ------------------------------------------------------------------ */

/**
 * Hook for AI conversation session persistence via `client.ai.sessions.*`.
 *
 * Satisfies spec/ai: ConversationSession schema – create, resume,
 * list, and delete AI chat sessions.
 *
 * ```ts
 * const { createSession, resumeSession, listSessions, isLoading } = useAISession();
 * const session = await createSession("My Chat");
 * ```
 */
export function useAISession(): UseAISessionResult {
  const client = useClient();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [sessions, setSessions] = useState<AISession[]>([]);
  const [activeSession, setActiveSession] = useState<AISession | null>(null);

  const createSession = useCallback(
    async (title?: string): Promise<AISession> => {
      setIsLoading(true);
      setError(null);
      try {
        const session = await (client as any).ai.sessions.create({ title });
        setActiveSession(session);
        setSessions((prev) => [session, ...prev]);
        return session;
      } catch (err: unknown) {
        const sessionError =
          err instanceof Error ? err : new Error("Failed to create session");
        setError(sessionError);
        throw sessionError;
      } finally {
        setIsLoading(false);
      }
    },
    [client],
  );

  const resumeSession = useCallback(
    async (sessionId: string): Promise<AISession> => {
      setIsLoading(true);
      setError(null);
      try {
        const session = await (client as any).ai.sessions.get(sessionId);
        setActiveSession(session);
        return session;
      } catch (err: unknown) {
        const sessionError =
          err instanceof Error ? err : new Error("Failed to resume session");
        setError(sessionError);
        throw sessionError;
      } finally {
        setIsLoading(false);
      }
    },
    [client],
  );

  const deleteSession = useCallback(
    async (sessionId: string): Promise<void> => {
      setIsLoading(true);
      setError(null);
      try {
        await (client as any).ai.sessions.delete(sessionId);
        setSessions((prev) => prev.filter((s) => s.id !== sessionId));
        setActiveSession((prev) => (prev?.id === sessionId ? null : prev));
      } catch (err: unknown) {
        const sessionError =
          err instanceof Error ? err : new Error("Failed to delete session");
        setError(sessionError);
        throw sessionError;
      } finally {
        setIsLoading(false);
      }
    },
    [client],
  );

  const listSessions = useCallback(async (): Promise<AISession[]> => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await (client as any).ai.sessions.list();
      setSessions(result);
      return result;
    } catch (err: unknown) {
      const sessionError =
        err instanceof Error ? err : new Error("Failed to list sessions");
      setError(sessionError);
      throw sessionError;
    } finally {
      setIsLoading(false);
    }
  }, [client]);

  return {
    sessions,
    activeSession,
    createSession,
    resumeSession,
    deleteSession,
    listSessions,
    isLoading,
    error,
  };
}
