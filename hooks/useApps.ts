import { useCallback, useEffect, useState } from "react";
import { useClient } from "@objectstack/client-react";

/**
 * A single navigation entry published by an app (aligned with the web console's
 * `NavigationItem` / @objectstack/spec). The menu shown inside an app is a tree
 * of these — `group` items nest `children`; leaf items target an object,
 * dashboard, page, report, or url.
 */
export interface NavigationItem {
  id: string;
  type: "object" | "dashboard" | "page" | "report" | "url" | "group";
  label: string;
  icon?: string;
  /** type: 'object' — target object name. */
  objectName?: string;
  /** type: 'object' — open a specific named list view (e.g. a kanban). */
  viewName?: string;
  /** type: 'dashboard' */
  dashboardName?: string;
  /** type: 'page' */
  pageName?: string;
  /** type: 'url' */
  url?: string;
  /** type: 'group' — nested items. */
  children?: NavigationItem[];
}

/**
 * App metadata as published by `meta.getItems("app")` — the same source the web
 * console reads. Unlike a raw package manifest, this carries the curated
 * `navigation` tree (and optional `areas`) that drives the in-app menu.
 */
export interface AppMeta {
  /** App name — the route segment and the identifier nav targets resolve against. */
  name: string;
  label: string;
  icon?: string;
  description?: string;
  navigation: NavigationItem[];
  /** Owning package id (`_packageId`), needed for `packageId`-scoped meta queries. */
  packageId?: string;
  active?: boolean;
  hidden?: boolean;
  isDefault?: boolean;
}

interface UseAppsResult {
  apps: AppMeta[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

function normalizeApp(raw: Record<string, unknown>): AppMeta {
  return {
    name: raw.name as string,
    label: (raw.label ?? raw.name) as string,
    icon: raw.icon as string | undefined,
    description: raw.description as string | undefined,
    navigation: (Array.isArray(raw.navigation) ? raw.navigation : []) as NavigationItem[],
    packageId: (raw._packageId ?? raw.packageId) as string | undefined,
    active: raw.active as boolean | undefined,
    hidden: raw.hidden as boolean | undefined,
    isDefault: raw.isDefault as boolean | undefined,
  };
}

/**
 * Discover installed apps with their navigation, from `meta.getItems("app")` —
 * the same metadata the web console's AppSwitcher and sidebar consume. Hidden
 * and inactive apps are filtered out (they stay routable by name).
 *
 * This supersedes the package-manifest discovery (`useAppDiscovery`) for
 * navigation purposes: a manifest has no menu, whereas an App carries the
 * curated, grouped `navigation` tree.
 */
export function useApps(): UseAppsResult {
  const client = useClient();
  const [apps, setApps] = useState<AppMeta[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchApps = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await client.meta.getItems("app");
      const items = Array.isArray(result?.items) ? result.items : [];
      const mapped = items
        .map((item: unknown) => normalizeApp(item as Record<string, unknown>))
        .filter((app: AppMeta) => app.active !== false && app.hidden !== true);
      setApps(mapped);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to load apps"));
    } finally {
      setIsLoading(false);
    }
  }, [client]);

  useEffect(() => {
    void fetchApps();
  }, [fetchApps]);

  return { apps, isLoading, error, refetch: fetchApps };
}

interface UseAppResult {
  app: AppMeta | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

/**
 * Fetch a single app's metadata (including its navigation tree) by name, via
 * `meta.getItem("app", name)`. Used by the in-app menu screen.
 */
export function useApp(appName: string | undefined): UseAppResult {
  const client = useClient();
  const [app, setApp] = useState<AppMeta | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchApp = useCallback(async () => {
    if (!appName) return;
    setIsLoading(true);
    setError(null);
    try {
      // `getItem` returns an envelope `{ type, name, item: {...} }` — the app
      // entity (with its navigation) lives under `item`, not at the top level.
      const result = (await client.meta.getItem("app", appName)) as
        | Record<string, unknown>
        | undefined;
      const raw = (result?.item ?? result) as Record<string, unknown> | undefined;
      setApp(raw ? normalizeApp(raw) : null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to load app"));
    } finally {
      setIsLoading(false);
    }
  }, [client, appName]);

  useEffect(() => {
    void fetchApp();
  }, [fetchApp]);

  return { app, isLoading, error, refetch: fetchApp };
}
