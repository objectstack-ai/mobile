import { useCallback, useState } from "react";
import { useClient } from "@objectstack/client-react";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

export interface ShareRecipient {
  type: "user" | "role" | "group" | "public";
  id: string;
  name?: string;
  accessLevel: "read" | "write" | "full";
}

export interface SharingInfo {
  objectName: string;
  recordId: string;
  owner: string;
  shares: ShareRecipient[];
}

export interface UseSharingResult {
  /** Fetch sharing info for a specific record */
  getSharingInfo: (object: string, recordId: string) => Promise<SharingInfo>;
  /** Share a record with a recipient */
  share: (object: string, recordId: string, recipient: Omit<ShareRecipient, "name">) => Promise<void>;
  /** Revoke sharing from a recipient */
  revoke: (object: string, recordId: string, recipientId: string) => Promise<void>;
  /** Cached sharing info from the last fetch */
  sharingInfo: SharingInfo | null;
  /** Whether a sharing operation is in progress */
  isLoading: boolean;
  /** Last error */
  error: Error | null;
}

/* ------------------------------------------------------------------ */
/*  Hook                                                                */
/* ------------------------------------------------------------------ */

/**
 * Hook for record-level sharing per spec/security SharingRule,
 * CriteriaSharingRule, and OwnerSharingRule schemas.
 *
 * Wraps `client.security.sharing.*` with React state management.
 *
 * ```ts
 * const { getSharingInfo, share, revoke, isLoading } = useSharing();
 * const info = await getSharingInfo("Account", "001");
 * await share("Account", "001", { type: "user", id: "u1", accessLevel: "read" });
 * await revoke("Account", "001", "u1");
 * ```
 */
export function useSharing(): UseSharingResult {
  const client = useClient();
  const [sharingInfo, setSharingInfo] = useState<SharingInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const getSharingInfo = useCallback(
    async (object: string, recordId: string): Promise<SharingInfo> => {
      setIsLoading(true);
      setError(null);
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result = await (client as any).security?.sharing?.get({
          object,
          recordId,
        });
        const info: SharingInfo = result;
        setSharingInfo(info);
        return info;
      } catch (err: unknown) {
        const sharingError =
          err instanceof Error ? err : new Error("Failed to fetch sharing info");
        setError(sharingError);
        throw sharingError;
      } finally {
        setIsLoading(false);
      }
    },
    [client],
  );

  const share = useCallback(
    async (
      object: string,
      recordId: string,
      recipient: Omit<ShareRecipient, "name">,
    ): Promise<void> => {
      setIsLoading(true);
      setError(null);
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (client as any).security?.sharing?.share({
          object,
          recordId,
          recipient,
        });
      } catch (err: unknown) {
        const shareError =
          err instanceof Error ? err : new Error("Share operation failed");
        setError(shareError);
        throw shareError;
      } finally {
        setIsLoading(false);
      }
    },
    [client],
  );

  const revoke = useCallback(
    async (
      object: string,
      recordId: string,
      recipientId: string,
    ): Promise<void> => {
      setIsLoading(true);
      setError(null);
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (client as any).security?.sharing?.revoke({
          object,
          recordId,
          recipientId,
        });
      } catch (err: unknown) {
        const revokeError =
          err instanceof Error ? err : new Error("Revoke operation failed");
        setError(revokeError);
        throw revokeError;
      } finally {
        setIsLoading(false);
      }
    },
    [client],
  );

  return { getSharingInfo, share, revoke, sharingInfo, isLoading, error };
}
