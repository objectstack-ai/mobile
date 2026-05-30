import { useCallback, useEffect, useState } from "react";
import { useClient } from "@objectstack/client-react";

export interface AppManifest {
  id: string;
  name: string;
  label: string;
  description?: string;
  icon?: string;
  version?: string;
  /** Manifest kind: `app` for business apps, `plugin` for platform plugins. */
  type?: string;
  /** Package scope: `system` for platform infrastructure, `project` for user apps. */
  scope?: string;
  enabled?: boolean;
  /** Spec v7 `App.hidden` — hidden from the app switcher (still routable by name). */
  hidden?: boolean;
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
      const manifests: AppManifest[] = (result.packages ?? [])
        .map((pkg: Record<string, unknown>) => {
          // ObjectStack v7 nests the real fields under `manifest`; the package
          // record itself only carries status/installedAt. Fall back to the
          // package object for older/flat shapes.
          const m = ((pkg.manifest as Record<string, unknown>) ?? pkg) ?? {};
          // Routing + meta queries key off the package id (e.g.
          // `app.objectstack.hotcrm`), which `meta.getItems({ packageId })`
          // resolves — not the human name.
          const id = (m.id ?? pkg.id ?? m.name) as string;
          return {
            id,
            name: id,
            label: (m.label ?? m.name ?? id) as string,
            description: m.description as string | undefined,
            icon: m.icon as string | undefined,
            version: m.version as string | undefined,
            type: m.type as string | undefined,
            scope: m.scope as string | undefined,
            enabled: (pkg.enabled as boolean | undefined) ?? true,
            hidden: (m.hidden as boolean | undefined) ?? false,
          };
        })
        // Show only business apps in the switcher: platform plugins/services
        // (scope `system` / type `plugin`) are infrastructure, not something a
        // user "opens". Spec v7 `hidden` apps stay routable but off the list.
        .filter(
          (app: AppManifest) =>
            !app.hidden &&
            app.scope !== "system" &&
            app.type !== "plugin",
        );
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
