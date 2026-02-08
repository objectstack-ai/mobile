import { useCallback, useEffect, useState } from "react";
import { useClient } from "@objectstack/client-react";

export interface AppManifest {
  id: string;
  name: string;
  label: string;
  description?: string;
  icon?: string;
  version?: string;
  enabled?: boolean;
}

interface UseAppDiscoveryResult {
  apps: AppManifest[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

/**
 * Hook for discovering installed apps/packages from the ObjectStack server.
 * Uses the packages API to fetch installed and enabled packages.
 */
export function useAppDiscovery(): UseAppDiscoveryResult {
  const client = useClient();
  const [apps, setApps] = useState<AppManifest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchApps = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await client.packages.list({ enabled: true });
      const manifests: AppManifest[] = (result.packages ?? []).map((pkg: any) => ({
        id: pkg.id ?? pkg.name,
        name: pkg.name,
        label: pkg.label ?? pkg.name,
        description: pkg.description,
        icon: pkg.icon,
        version: pkg.version,
        enabled: pkg.enabled ?? true,
      }));
      setApps(manifests);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to fetch apps"));
    } finally {
      setIsLoading(false);
    }
  }, [client]);

  useEffect(() => {
    fetchApps();
  }, [fetchApps]);

  return { apps, isLoading, error, refetch: fetchApps };
}
