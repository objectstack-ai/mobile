import { useCallback, useEffect, useState } from "react";
import type { ObjectStackClient } from "@objectstack/client";
import {
  discoverRelatedLists,
  relatedListQuery,
  type ScannableObjectMeta,
  type RelatedListDescriptor,
} from "~/lib/related-lists";
import type { RelatedListConfig } from "~/components/renderers/DetailViewRenderer";

/**
 * Resolve the related lists to show on a record's detail page (ObjectStack
 * 8.0). Discovers child objects that reference `parentObjectName` with
 * `relatedList: true` (one `meta.getItems('object')` request), then queries
 * each child's records filtered by the relationship field = `recordId`.
 *
 * Best-effort: any failure resolves to an empty list rather than breaking the
 * detail page. On a schema with no such relationships it returns `[]` and the
 * detail page is unchanged.
 */
export interface UseRelatedListsResult {
  relatedLists: RelatedListConfig[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

/** Pull the object array out of the various shapes getItems may return. */
function extractObjects(resp: unknown): ScannableObjectMeta[] {
  if (Array.isArray(resp)) return resp as ScannableObjectMeta[];
  if (resp && typeof resp === "object") {
    const r = resp as Record<string, unknown>;
    const arr = r.items ?? r.objects ?? r.data ?? r.entries;
    if (Array.isArray(arr)) return arr as ScannableObjectMeta[];
  }
  return [];
}

export function useRelatedLists(
  client: Pick<ObjectStackClient, "meta" | "data"> | null | undefined,
  parentObjectName: string | undefined,
  recordId: string | undefined,
  limit = 20,
): UseRelatedListsResult {
  const [relatedLists, setRelatedLists] = useState<RelatedListConfig[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const load = useCallback(async () => {
    if (!client || !parentObjectName || !recordId) {
      setRelatedLists([]);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const resp = await client.meta.getItems("object");
      const objects = extractObjects(resp);
      const descriptors = discoverRelatedLists(parentObjectName, objects);

      const lists = await Promise.all(
        descriptors.map(async (d: RelatedListDescriptor) => {
          const q = relatedListQuery(d, recordId, limit);
          try {
            const result = await client.data.find(q.object, q.options);
            const records =
              (result as { records?: Record<string, unknown>[] })?.records ??
              (Array.isArray(result) ? (result as Record<string, unknown>[]) : []);
            return {
              label: d.title,
              objectName: d.childObject,
              records,
              columns: d.columns.length > 0 ? d.columns : undefined,
            } satisfies RelatedListConfig;
          } catch {
            // A single failed child query shouldn't drop the whole page.
            return {
              label: d.title,
              objectName: d.childObject,
              records: [],
              columns: d.columns.length > 0 ? d.columns : undefined,
            } satisfies RelatedListConfig;
          }
        }),
      );
      setRelatedLists(lists);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to load related lists"));
      setRelatedLists([]);
    } finally {
      setIsLoading(false);
    }
  }, [client, parentObjectName, recordId, limit]);

  useEffect(() => {
    void load();
  }, [load]);

  return { relatedLists, isLoading, error, refetch: load };
}
