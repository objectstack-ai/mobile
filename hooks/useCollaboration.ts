import { useCallback, useState } from "react";
import { useClient } from "@objectstack/client-react";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

export interface CollaborationParticipant {
  userId: string;
  name?: string;
  cursor?: { x: number; y: number; field?: string };
  status: "active" | "idle" | "disconnected";
  color: string;
  lastSeen: string;
}

export interface UseCollaborationResult {
  /** Current participants in the collaboration session */
  participants: CollaborationParticipant[];
  /** Join a collaboration session for a specific object/record */
  join: (object: string, recordId: string) => Promise<void>;
  /** Leave the current collaboration session */
  leave: () => Promise<void>;
  /** Update your cursor position */
  updateCursor: (cursor: {
    x: number;
    y: number;
    field?: string;
  }) => Promise<void>;
  /** Whether the collaboration connection is active */
  isConnected: boolean;
  /** Whether a collaboration operation is in progress */
  isLoading: boolean;
  /** Last error */
  error: Error | null;
}

/* ------------------------------------------------------------------ */
/*  Hook                                                                */
/* ------------------------------------------------------------------ */

/**
 * Hook for real-time collaboration sessions with cursor awareness
 * via `client.realtime.collaboration`.
 *
 * Satisfies spec/system: CollaborationSession, AwarenessSession, CRDTState schemas.
 *
 * ```ts
 * const { participants, join, leave, updateCursor } = useCollaboration();
 * await join("tasks", "task-123");
 * ```
 */
export function useCollaboration(): UseCollaborationResult {
  const client = useClient();
  const [participants, setParticipants] = useState<CollaborationParticipant[]>(
    [],
  );
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const join = useCallback(
    async (object: string, recordId: string): Promise<void> => {
      setIsLoading(true);
      setError(null);
      try {
        await (client as any).realtime?.collaboration?.join(object, recordId);
        const members =
          (await (client as any).realtime?.collaboration?.getParticipants()) ??
          [];
        setParticipants(members);
        setIsConnected(true);
      } catch (err: unknown) {
        const joinError =
          err instanceof Error ? err : new Error("Failed to join collaboration");
        setError(joinError);
        throw joinError;
      } finally {
        setIsLoading(false);
      }
    },
    [client],
  );

  const leave = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError(null);
    try {
      await (client as any).realtime?.collaboration?.leave();
      setParticipants([]);
      setIsConnected(false);
    } catch (err: unknown) {
      const leaveError =
        err instanceof Error
          ? err
          : new Error("Failed to leave collaboration");
      setError(leaveError);
      throw leaveError;
    } finally {
      setIsLoading(false);
    }
  }, [client]);

  const updateCursor = useCallback(
    async (cursor: {
      x: number;
      y: number;
      field?: string;
    }): Promise<void> => {
      setError(null);
      try {
        await (client as any).realtime?.collaboration?.updateCursor(cursor);
      } catch (err: unknown) {
        const cursorError =
          err instanceof Error ? err : new Error("Failed to update cursor");
        setError(cursorError);
        throw cursorError;
      }
    },
    [client],
  );

  return { participants, join, leave, updateCursor, isConnected, isLoading, error };
}
