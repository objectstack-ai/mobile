import { useCallback, useState } from "react";
import { useClient } from "@objectstack/client-react";

/**
 * Self-service identity management backed by the platform v7 auth plugin
 * (`client.auth.*` → better-auth). Powers the Account screen: update profile,
 * change password, begin a change-email flow, and resend email verification.
 *
 * The ObjectStack client is created with the active better-auth session token
 * (see `app/_layout.tsx`), so these calls run authenticated as the current user.
 */
export interface UseAccountResult {
  updateProfile: (name: string) => Promise<void>;
  changePassword: (
    currentPassword: string,
    newPassword: string,
    revokeOtherSessions?: boolean,
  ) => Promise<void>;
  changeEmail: (newEmail: string) => Promise<void>;
  resendVerification: (email: string) => Promise<void>;
  isSaving: boolean;
  error: Error | null;
}

export function useAccount(): UseAccountResult {
  const client = useClient();
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const run = useCallback(async (op: () => Promise<unknown>, fallback: string) => {
    setIsSaving(true);
    setError(null);
    try {
      await op();
    } catch (err: unknown) {
      const e = err instanceof Error ? err : new Error(fallback);
      setError(e);
      throw e;
    } finally {
      setIsSaving(false);
    }
  }, []);

  const updateProfile = useCallback(
    (name: string) => run(() => client.auth.updateUser({ name }), "Failed to update profile"),
    [client, run],
  );

  const changePassword = useCallback(
    (currentPassword: string, newPassword: string, revokeOtherSessions = false) =>
      run(
        () => client.auth.changePassword({ currentPassword, newPassword, revokeOtherSessions }),
        "Failed to change password",
      ),
    [client, run],
  );

  const changeEmail = useCallback(
    (newEmail: string) =>
      run(() => client.auth.changeEmail({ newEmail }), "Failed to change email"),
    [client, run],
  );

  const resendVerification = useCallback(
    (email: string) =>
      run(() => client.auth.sendVerificationEmail({ email }), "Failed to send verification email"),
    [client, run],
  );

  return {
    updateProfile,
    changePassword,
    changeEmail,
    resendVerification,
    isSaving,
    error,
  };
}
