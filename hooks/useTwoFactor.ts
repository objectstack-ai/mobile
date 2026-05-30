import { useCallback, useState } from "react";
import { authClient } from "~/lib/auth-client";

/**
 * Two-factor (TOTP) enrolment, backed by the better-auth two-factor client
 * plugin (`authClient.twoFactor.*`) which maps to the server's
 * `/api/v1/auth/two-factor/*` routes.
 *
 * Enrolment flow:
 *   1. `enable(password)` → returns a `totpURI` (for a QR / authenticator app)
 *      and one-time `backupCodes`. 2FA is pending until a code is verified.
 *   2. `verifyTotp(code)` → confirms the authenticator and activates 2FA.
 *
 * Also supports `disable(password)` and regenerating `generateBackupCodes(password)`.
 */
export interface TwoFactorEnableResult {
  totpURI: string;
  backupCodes: string[];
}

export interface UseTwoFactorResult {
  enable: (password: string) => Promise<TwoFactorEnableResult>;
  verifyTotp: (code: string) => Promise<void>;
  disable: (password: string) => Promise<void>;
  generateBackupCodes: (password: string) => Promise<string[]>;
  isBusy: boolean;
  error: Error | null;
}

/** Unwrap better-auth's `{ data, error }` response envelope. */
async function unwrap<T>(p: Promise<{ data: T | null; error: { message?: string } | null }>): Promise<T> {
  const res = await p;
  if (res.error) {
    throw new Error(res.error.message ?? "Two-factor request failed");
  }
  return res.data as T;
}

export function useTwoFactor(): UseTwoFactorResult {
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const run = useCallback(async <T,>(op: () => Promise<T>): Promise<T> => {
    setIsBusy(true);
    setError(null);
    try {
      return await op();
    } catch (err: unknown) {
      const e = err instanceof Error ? err : new Error("Two-factor request failed");
      setError(e);
      throw e;
    } finally {
      setIsBusy(false);
    }
  }, []);

  const enable = useCallback(
    (password: string) =>
      run(async () => {
        const data = await unwrap(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (authClient as any).twoFactor.enable({ password }),
        );
        return {
          totpURI: (data as TwoFactorEnableResult).totpURI,
          backupCodes: (data as TwoFactorEnableResult).backupCodes ?? [],
        };
      }),
    [run],
  );

  const verifyTotp = useCallback(
    (code: string) =>
      run(async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await unwrap((authClient as any).twoFactor.verifyTotp({ code }));
      }),
    [run],
  );

  const disable = useCallback(
    (password: string) =>
      run(async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await unwrap((authClient as any).twoFactor.disable({ password }));
      }),
    [run],
  );

  const generateBackupCodes = useCallback(
    (password: string) =>
      run(async () => {
        const data = await unwrap(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (authClient as any).twoFactor.generateBackupCodes({ password }),
        );
        return ((data as { backupCodes?: string[] }).backupCodes ?? []) as string[];
      }),
    [run],
  );

  return { enable, verifyTotp, disable, generateBackupCodes, isBusy, error };
}
