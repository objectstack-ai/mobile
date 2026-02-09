import { useCallback, useEffect, useState } from "react";
import { useClient } from "@objectstack/client-react";
import type {
  GetObjectPermissionsResponse,
  CheckPermissionResponse,
} from "@objectstack/client";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

export interface ObjectPermissions {
  allowCreate: boolean;
  allowRead: boolean;
  allowEdit: boolean;
  allowDelete: boolean;
  allowTransfer: boolean;
  allowRestore: boolean;
  allowPurge: boolean;
  viewAllRecords: boolean;
  modifyAllRecords: boolean;
}

export interface FieldPermission {
  readable: boolean;
  editable: boolean;
}

export interface UsePermissionsResult {
  /** Object-level permissions */
  permissions: ObjectPermissions | null;
  /** Per-field permissions (field name → readable/editable) */
  fieldPermissions: Record<string, FieldPermission>;
  /** Whether the permissions are still loading */
  isLoading: boolean;
  /** Error that occurred while fetching */
  error: Error | null;
  /** Check a specific action permission */
  checkPermission: (
    action: "create" | "read" | "edit" | "delete",
    recordId?: string,
    field?: string,
  ) => Promise<boolean>;
  /** Refetch permissions */
  refetch: () => Promise<void>;
}

/* ------------------------------------------------------------------ */
/*  Hook                                                                */
/* ------------------------------------------------------------------ */

/**
 * Hook for fetching object-level and field-level permissions via
 * `client.permissions.getObjectPermissions()`.
 */
export function usePermissions(objectName: string): UsePermissionsResult {
  const client = useClient();
  const [permissions, setPermissions] = useState<ObjectPermissions | null>(null);
  const [fieldPermissions, setFieldPermissions] = useState<
    Record<string, FieldPermission>
  >({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchPermissions = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result: GetObjectPermissionsResponse =
        await client.permissions.getObjectPermissions(objectName);
      setPermissions(result.permissions);
      setFieldPermissions(result.fieldPermissions ?? {});
    } catch (err) {
      setError(
        err instanceof Error ? err : new Error("Failed to fetch permissions"),
      );
    } finally {
      setIsLoading(false);
    }
  }, [client, objectName]);

  const checkPermission = useCallback(
    async (
      action: "create" | "read" | "edit" | "delete",
      recordId?: string,
      field?: string,
    ): Promise<boolean> => {
      try {
        const result: CheckPermissionResponse = await client.permissions.check({
          object: objectName,
          action,
          recordId,
          field,
        });
        return result.allowed;
      } catch {
        return false;
      }
    },
    [client, objectName],
  );

  useEffect(() => {
    void fetchPermissions();
  }, [fetchPermissions]);

  return {
    permissions,
    fieldPermissions,
    isLoading,
    error,
    checkPermission,
    refetch: fetchPermissions,
  };
}
