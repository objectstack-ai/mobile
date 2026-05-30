import { useCallback, useEffect, useState } from "react";
import { useClient } from "@objectstack/client-react";
import type { FieldDefinition } from "~/components/renderers";

export interface ObjectMeta {
  name: string;
  label?: string;
  pluralLabel?: string;
  description?: string;
  icon?: string;
  fields?: Record<string, Record<string, unknown>>;
  [key: string]: unknown;
}

interface UseObjectMetaResult {
  meta: ObjectMeta | null;
  fields: FieldDefinition[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

/**
 * Fetch an object's metadata (label, fields, …) once per object.
 *
 * Replaces the SDK's `useFields`/`useObject`, whose fetch callback lists the
 * fetched `data` and `etag` in its dependency array while also calling
 * `setData`/`setEtag` — so a 200 response (new object reference) re-arms the
 * effect and the hook hammers `GET /meta/object/<name>` in a tight loop. We
 * read the non-cached `meta.getItem` with stable `[client, objectName]` deps,
 * so it fires exactly once per object.
 */
export function useObjectMeta(objectName: string | undefined): UseObjectMetaResult {
  const client = useClient();
  const [meta, setMeta] = useState<ObjectMeta | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchMeta = useCallback(async () => {
    if (!objectName) return;
    setIsLoading(true);
    setError(null);
    try {
      const result = (await client.meta.getItem("object", objectName)) as ObjectMeta;
      setMeta(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to fetch object metadata"));
    } finally {
      setIsLoading(false);
    }
  }, [client, objectName]);

  useEffect(() => {
    void fetchMeta();
  }, [fetchMeta]);

  const fields: FieldDefinition[] = meta?.fields
    ? Object.entries(meta.fields).map(
        ([name, field]) => ({ name, ...field }) as FieldDefinition,
      )
    : [];

  return { meta, fields, isLoading, error, refetch: fetchMeta };
}
