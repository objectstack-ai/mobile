import { useCallback, useEffect, useState } from "react";
import { useClient } from "@objectstack/client-react";
import type {
  ListViewsResponse,
} from "@objectstack/client";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

/** A single view entry from the SDK's ListViewsResponse */
export interface SavedView {
  id: string;
  name: string;
  objectName: string;
  /** View type – list or form */
  viewType?: "list" | "form";
  /** List view configuration (columns, filter, sort, etc.) */
  list?: Record<string, unknown>;
  /** Form view configuration (sections, fields, etc.) */
  form?: Record<string, unknown>;
  /** "private" = only the creator; "shared" = all users */
  visibility: "private" | "shared";
  createdBy?: string;
  updatedAt?: string;
}

export interface SaveViewInput {
  name: string;
  visibility: "private" | "shared";
  viewType?: "list" | "form";
  /** List view config data */
  list?: Record<string, unknown>;
  /** Form view config data */
  form?: Record<string, unknown>;
  /** Legacy: flat filters (mapped into list config) */
  filters?: unknown;
  sort?: string | string[];
  columns?: string[];
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */

function resolveViewType(v: Record<string, unknown>): "list" | "form" | undefined {
  if (v.viewType === "list" || v.viewType === "form") return v.viewType;
  if (v.list) return "list";
  if (v.form) return "form";
  return undefined;
}

/**
 * Map a raw view entry from the SDK into our SavedView shape.
 */
function toSavedView(
  v: Record<string, unknown>,
  objectName: string,
): SavedView {
  return {
    id: (v.id as string) ?? (v.name as string),
    name: (v.name as string) ?? (v.label as string) ?? "Untitled",
    objectName,
    viewType: resolveViewType(v),
    list: v.list as Record<string, unknown> | undefined,
    form: v.form as Record<string, unknown> | undefined,
    visibility: (v.visibility as "private" | "shared") ?? "private",
    createdBy: (v.createdBy as string) ?? (v.created_by as string),
    updatedAt: (v.updatedAt as string) ?? (v.updated_at as string),
  };
}

/**
 * Build the data payload for create/update matching SDK's CreateViewRequest.
 */
function toViewPayload(input: Partial<SaveViewInput>): Record<string, unknown> {
  const payload: Record<string, unknown> = {};
  if (input.name !== undefined) payload.name = input.name;
  if (input.visibility !== undefined) payload.visibility = input.visibility;
  if (input.list !== undefined) payload.list = input.list;
  if (input.form !== undefined) payload.form = input.form;

  // Support legacy flat filters/sort/columns by wrapping into list config
  if (input.filters !== undefined || input.sort !== undefined || input.columns !== undefined) {
    const existing = (payload.list as Record<string, unknown>) ?? {};
    const listConfig: Record<string, unknown> = { ...existing };
    if (input.filters !== undefined) listConfig.filter = input.filters;
    if (input.sort !== undefined) listConfig.sort = input.sort;
    if (input.columns !== undefined) listConfig.columns = input.columns;
    payload.list = listConfig;
  }

  return payload;
}

/* ------------------------------------------------------------------ */
/*  Hook                                                                */
/* ------------------------------------------------------------------ */

/**
 * Hook for managing saved (custom) user views via the typed `client.views.*` API.
 *
 * Aligned with SDK v2.0.1 typed views API (list/form view configs).
 */
export function useViewStorage(objectName: string) {
  const client = useClient();
  const [views, setViews] = useState<SavedView[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [activeViewId, setActiveViewId] = useState<string | null>(null);

  /** Fetch all saved views for this object */
  const fetchViews = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result: ListViewsResponse = await client.views.list(objectName);
      const items: SavedView[] = (result?.views ?? []).map(
        (v: Record<string, unknown>) => toSavedView(v, objectName),
      );
      setViews(items);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to fetch views"));
    } finally {
      setIsLoading(false);
    }
  }, [client, objectName]);

  /** Save a new view */
  const saveView = useCallback(
    async (input: SaveViewInput) => {
      try {
        await client.views.create(objectName, toViewPayload(input));
        await fetchViews();
      } catch (err) {
        throw err instanceof Error ? err : new Error("Failed to save view");
      }
    },
    [client, objectName, fetchViews],
  );

  /** Update an existing view */
  const updateView = useCallback(
    async (viewId: string, input: Partial<SaveViewInput>) => {
      try {
        await client.views.update(objectName, viewId, toViewPayload(input));
        await fetchViews();
      } catch (err) {
        throw err instanceof Error ? err : new Error("Failed to update view");
      }
    },
    [client, objectName, fetchViews],
  );

  /** Delete a saved view */
  const deleteView = useCallback(
    async (viewId: string) => {
      try {
        await client.views.delete(objectName, viewId);
        if (activeViewId === viewId) setActiveViewId(null);
        await fetchViews();
      } catch (err) {
        throw err instanceof Error ? err : new Error("Failed to delete view");
      }
    },
    [client, objectName, activeViewId, fetchViews],
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
