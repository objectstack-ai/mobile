import { useCallback, useState } from "react";
import { useClient } from "@objectstack/client-react";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

export interface SecurityPolicy {
  type: "password" | "session" | "network" | "audit";
  name: string;
  enabled: boolean;
  config: Record<string, unknown>;
}

export interface UseSecurityPoliciesResult {
  /** Cached security policies from the last fetch */
  policies: SecurityPolicy[];
  /** Fetch all security policies */
  getPolicies: () => Promise<SecurityPolicy[]>;
  /** Fetch a single security policy by type */
  getPolicy: (type: string) => Promise<SecurityPolicy | null>;
  /** Whether a security-policy operation is in progress */
  isLoading: boolean;
  /** Last error */
  error: Error | null;
}

/* ------------------------------------------------------------------ */
/*  Hook                                                                */
/* ------------------------------------------------------------------ */

/**
 * Hook for security policy display per spec/security PolicySchema
 * (password, session, network, audit).
 *
 * Wraps `client.security.policies.*` with React state management.
 *
 * ```ts
 * const { policies, getPolicies, getPolicy, isLoading } = useSecurityPolicies();
 * const all = await getPolicies();
 * const pw = await getPolicy("password");
 * ```
 */
export function useSecurityPolicies(): UseSecurityPoliciesResult {
  const client = useClient();
  const [policies, setPolicies] = useState<SecurityPolicy[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const getPolicies = useCallback(async (): Promise<SecurityPolicy[]> => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await (client as any).security?.policies?.list();
      const list: SecurityPolicy[] = result ?? [];
      setPolicies(list);
      return list;
    } catch (err: unknown) {
      const policyError =
        err instanceof Error ? err : new Error("Failed to fetch security policies");
      setError(policyError);
      throw policyError;
    } finally {
      setIsLoading(false);
    }
  }, [client]);

  const getPolicy = useCallback(
    async (type: string): Promise<SecurityPolicy | null> => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await (client as any).security?.policies?.get({ type });
        return (result as SecurityPolicy) ?? null;
      } catch (err: unknown) {
        const policyError =
          err instanceof Error ? err : new Error("Failed to fetch security policy");
        setError(policyError);
        throw policyError;
      } finally {
        setIsLoading(false);
      }
    },
    [client],
  );

  return { policies, getPolicies, getPolicy, isLoading, error };
}
