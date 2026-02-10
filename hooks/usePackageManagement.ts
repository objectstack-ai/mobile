import { useCallback, useEffect, useState } from "react";
import { useClient } from "@objectstack/client-react";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

export interface PackageInfo {
  id: string;
  name: string;
  label: string;
  description?: string;
  icon?: string;
  version?: string;
  enabled: boolean;
  status?: string;
}

export interface UsePackageManagementResult {
  /** List of installed packages */
  packages: PackageInfo[];
  /** Whether the package list is loading */
  isLoading: boolean;
  /** Last error */
  error: Error | null;
  /** Refresh the package list */
  refetch: () => Promise<void>;
  /** Install a new package from its manifest */
  install: (
    manifest: Record<string, unknown>,
    options?: { settings?: Record<string, unknown>; enableOnInstall?: boolean },
  ) => Promise<void>;
  /** Uninstall a package by ID */
  uninstall: (id: string) => Promise<void>;
  /** Enable a disabled package */
  enable: (id: string) => Promise<void>;
  /** Disable an installed package */
  disable: (id: string) => Promise<void>;
}

/* ------------------------------------------------------------------ */
/*  Hook                                                                */
/* ------------------------------------------------------------------ */

/**
 * Hook for full package lifecycle management via
 * `client.packages.list/install/uninstall/enable/disable`.
 *
 * Satisfies spec/api: PackageManifest + PackageInstallOptions protocol.
 *
 * ```ts
 * const { packages, install, uninstall, enable, disable } = usePackageManagement();
 * ```
 */
export function usePackageManagement(
  filters?: { status?: string; type?: string; enabled?: boolean },
): UsePackageManagementResult {
  const client = useClient();
  const [packages, setPackages] = useState<PackageInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchPackages = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await client.packages.list(filters);
      const pkgs: PackageInfo[] = (result.packages ?? []).map(
        (pkg: Record<string, unknown>) => ({
          id: (pkg.id ?? pkg.name) as string,
          name: pkg.name as string,
          label: (pkg.label ?? pkg.name) as string,
          description: pkg.description as string | undefined,
          icon: pkg.icon as string | undefined,
          version: pkg.version as string | undefined,
          enabled: (pkg.enabled as boolean | undefined) ?? true,
          status: pkg.status as string | undefined,
        }),
      );
      setPackages(pkgs);
    } catch (err) {
      setError(
        err instanceof Error ? err : new Error("Failed to fetch packages"),
      );
    } finally {
      setIsLoading(false);
    }
  }, [client, filters]);

  const install = useCallback(
    async (
      manifest: Record<string, unknown>,
      options?: {
        settings?: Record<string, unknown>;
        enableOnInstall?: boolean;
      },
    ): Promise<void> => {
      setError(null);
      try {
        await client.packages.install(manifest, options);
        await fetchPackages();
      } catch (err) {
        const installError =
          err instanceof Error ? err : new Error("Package install failed");
        setError(installError);
        throw installError;
      }
    },
    [client, fetchPackages],
  );

  const uninstall = useCallback(
    async (id: string): Promise<void> => {
      setError(null);
      try {
        await client.packages.uninstall(id);
        await fetchPackages();
      } catch (err) {
        const uninstallError =
          err instanceof Error ? err : new Error("Package uninstall failed");
        setError(uninstallError);
        throw uninstallError;
      }
    },
    [client, fetchPackages],
  );

  const enable = useCallback(
    async (id: string): Promise<void> => {
      setError(null);
      try {
        await client.packages.enable(id);
        await fetchPackages();
      } catch (err) {
        const enableError =
          err instanceof Error ? err : new Error("Package enable failed");
        setError(enableError);
        throw enableError;
      }
    },
    [client, fetchPackages],
  );

  const disable = useCallback(
    async (id: string): Promise<void> => {
      setError(null);
      try {
        await client.packages.disable(id);
        await fetchPackages();
      } catch (err) {
        const disableError =
          err instanceof Error ? err : new Error("Package disable failed");
        setError(disableError);
        throw disableError;
      }
    },
    [client, fetchPackages],
  );

  useEffect(() => {
    fetchPackages();
  }, [fetchPackages]);

  return {
    packages,
    isLoading,
    error,
    refetch: fetchPackages,
    install,
    uninstall,
    enable,
    disable,
  };
}
