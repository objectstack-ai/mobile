import { useCallback, useEffect, useState } from "react";
import { useClient } from "@objectstack/client-react";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

export interface SavedView {
  id: string;
  name: string;
  objectName: string;
  /** "private" = only the creator; "shared" = all users */
  visibility: "private" | "shared";
  filters?: unknown;
  sort?: string | string[];
  columns?: string[];
  createdBy?: string;
  updatedAt?: string;
}

export interface SaveViewInput {
  name: string;
  visibility: "private" | "shared";
  filters?: unknown;
  sort?: string | string[];
  columns?: string[];
}

/**
 * Helper to access the views namespace on the client.
 * The `client.views` API may not yet be typed in the current SDK version,
 * so we access it via a safe cast.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function viewsApi(client: any) {
  return client.views as {
    list: (objectName: string) => Promise<{ views?: any[] }>;
    create: (objectName: string, data: Record<string, unknown>) => Promise<unknown>;
    update: (objectName: string, viewId: string, data: Record<string, unknown>) => Promise<unknown>;
    delete: (objectName: string, viewId: string) => Promise<unknown>;
  };
}

/* ------------------------------------------------------------------ */
/*  Hook                                                                */
/* ------------------------------------------------------------------ */

/**
 * Hook for managing saved (custom) user views via `client.views.*`.
 */
export function useViewStorage(objectName: string) {
  const client = useClient();
  const [views, setViews] = useState<SavedView[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [activeViewId, setActiveViewId] = useState<string | null>(null);

  const api = viewsApi(client);

  /** Fetch all saved views for this object */
  const fetchViews = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await api.list(objectName);
      const items: SavedView[] = (result?.views ?? []).map((v: any) => ({
        id: v.id ?? v.name,
        name: v.name ?? v.label ?? "Untitled",
        objectName,
        visibility: v.visibility ?? "private",
        filters: v.filters ?? v.filter,
        sort: v.sort,
        columns: v.columns,
        createdBy: v.createdBy ?? v.created_by,
        updatedAt: v.updatedAt ?? v.updated_at,
      }));
      setViews(items);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to fetch views"));
    } finally {
      setIsLoading(false);
    }
  }, [api, objectName]);

  /** Save a new view */
  const saveView = useCallback(
    async (input: SaveViewInput) => {
      try {
        await api.create(objectName, {
          name: input.name,
          visibility: input.visibility,
          filter: input.filters,
          sort: input.sort,
          columns: input.columns,
        });
        await fetchViews();
      } catch (err) {
        throw err instanceof Error ? err : new Error("Failed to save view");
      }
    },
    [api, objectName, fetchViews],
  );

  /** Update an existing view */
  const updateView = useCallback(
    async (viewId: string, input: Partial<SaveViewInput>) => {
      try {
        await api.update(objectName, viewId, {
          name: input.name,
          visibility: input.visibility,
          filter: input.filters,
          sort: input.sort,
          columns: input.columns,
        });
        await fetchViews();
      } catch (err) {
        throw err instanceof Error ? err : new Error("Failed to update view");
      }
    },
    [api, objectName, fetchViews],
  );

  /** Delete a saved view */
  const deleteView = useCallback(
    async (viewId: string) => {
      try {
        await api.delete(objectName, viewId);
        if (activeViewId === viewId) setActiveViewId(null);
        await fetchViews();
      } catch (err) {
        throw err instanceof Error ? err : new Error("Failed to delete view");
      }
    },
    [api, objectName, activeViewId, fetchViews],
  );

  // Fetch on mount
  useEffect(() => {
    void fetchViews();
  }, [fetchViews]);

  return {
    views,
    isLoading,
    error,
    activeViewId,
    setActiveViewId,
    fetchViews,
    saveView,
    updateView,
    deleteView,
  };
}
