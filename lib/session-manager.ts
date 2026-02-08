/**
 * Session management utilities.
 *
 * Provides helpers to retrieve the current session and perform
 * remote sign-out using `client.auth.me()` and `authClient`.
 */
import type { ObjectStackClient } from "@objectstack/client";
import { authClient } from "~/lib/auth-client";

export interface SessionInfo {
  /** Unique session id */
  id: string;
  /** User email or identifier */
  userEmail: string;
  /** Device or user-agent description */
  deviceName: string;
  /** Whether this is the current session */
  isCurrent: boolean;
  /** Session creation timestamp */
  createdAt: string;
}

/**
 * Fetch the current authenticated user profile via the ObjectStack client.
 */
export async function getCurrentUser(
  client: ObjectStackClient,
): Promise<{ id: string; email: string; name?: string } | null> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const me = await (client as any).auth.me();
    if (!me) return null;
    return { id: me.id, email: me.email, name: me.name };
  } catch {
    return null;
  }
}

/**
 * List active sessions for the current user.
 *
 * Uses the better-auth client to retrieve sessions.
 * Actual session listing depends on the server supporting the
 * `listSessions` endpoint; returns an empty array when unavailable.
 */
export async function listSessions(): Promise<SessionInfo[]> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response = await (authClient as any).listSessions?.();
    if (!response?.data) return [];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (response.data as any[]).map((s) => ({
      id: s.id ?? s.token,
      userEmail: s.userEmail ?? "",
      deviceName: s.userAgent ?? s.deviceName ?? "Unknown device",
      isCurrent: Boolean(s.isCurrent),
      createdAt: s.createdAt ?? new Date().toISOString(),
    }));
  } catch {
    return [];
  }
}

/**
 * Sign out of the current session.
 */
export async function signOut(): Promise<void> {
  await authClient.signOut();
}

/**
 * Revoke a specific session by id (remote sign-out).
 *
 * Falls back to a no-op if the server does not support session revocation.
 */
export async function revokeSession(sessionId: string): Promise<boolean> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (authClient as any).revokeSession?.({ id: sessionId });
    return true;
  } catch {
    return false;
  }
}
