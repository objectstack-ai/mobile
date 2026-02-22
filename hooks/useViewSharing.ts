import { useCallback, useMemo, useState } from "react";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

export interface ViewSharingConfig {
  viewId: string;
  shareType: "public" | "private" | "restricted";
  accessLevel: "view" | "edit" | "admin";
  expiresAt?: string;
  password?: string;
}

export interface ShareRecipient {
  id: string;
  type: "user" | "group" | "role";
  accessLevel: "view" | "edit" | "admin";
}

export interface UseViewSharingResult {
  /** Current view sharing configuration */
  config: ViewSharingConfig;
  /** Current list of share recipients */
  recipients: ShareRecipient[];
  /** Whether the view is currently shared */
  isShared: boolean;
  /** Set the view sharing config */
  setConfig: (config: ViewSharingConfig) => void;
  /** Add a share recipient */
  addRecipient: (recipient: ShareRecipient) => void;
  /** Remove a share recipient by id */
  removeRecipient: (id: string) => void;
  /** Update an existing recipient */
  updateRecipient: (id: string, updates: Partial<ShareRecipient>) => void;
  /** Set whether the view is shared */
  setIsShared: (shared: boolean) => void;
  /** Recipients that have not expired */
  activeRecipients: ShareRecipient[];
  /** Whether the view is publicly shared */
  isPublic: boolean;
}

/* ------------------------------------------------------------------ */
/*  Hook                                                                */
/* ------------------------------------------------------------------ */

/**
 * Hook for spec-driven view sharing from `ViewSharingSchema`.
 *
 * Implements Phase 25 View Sharing Protocol.
 *
 * ```ts
 * const { setConfig, addRecipient, activeRecipients, isPublic } =
 *   useViewSharing();
 * setConfig({
 *   viewId: "v1", shareType: "restricted", accessLevel: "view",
 * });
 * addRecipient({ id: "u1", type: "user", accessLevel: "edit" });
 * ```
 */
export function useViewSharing(): UseViewSharingResult {
  const [config, setConfigState] = useState<ViewSharingConfig>({
    viewId: "",
    shareType: "private",
    accessLevel: "view",
  });
  const [recipients, setRecipients] = useState<ShareRecipient[]>([]);
  const [isShared, setIsSharedState] = useState<boolean>(false);

  /* ---- computed --------------------------------------------------- */

  const activeRecipients = useMemo(() => {
    if (!config.expiresAt) return recipients;
    const expiry = new Date(config.expiresAt).getTime();
    if (Date.now() > expiry) return [];
    return recipients;
  }, [recipients, config.expiresAt]);

  const isPublic = useMemo(
    () => config.shareType === "public",
    [config.shareType],
  );

  /* ---- methods ---------------------------------------------------- */

  const setConfig = useCallback((cfg: ViewSharingConfig) => {
    setConfigState(cfg);
  }, []);

  const addRecipient = useCallback((recipient: ShareRecipient) => {
    setRecipients((prev) => [...prev, recipient]);
  }, []);

  const removeRecipient = useCallback((id: string) => {
    setRecipients((prev) => prev.filter((r) => r.id !== id));
  }, []);

  const updateRecipient = useCallback(
    (id: string, updates: Partial<ShareRecipient>) => {
      setRecipients((prev) =>
        prev.map((r) => (r.id === id ? { ...r, ...updates } : r)),
      );
    },
    [],
  );

  const setIsShared = useCallback((shared: boolean) => {
    setIsSharedState(shared);
  }, []);

  return {
    config,
    recipients,
    isShared,
    setConfig,
    addRecipient,
    removeRecipient,
    updateRecipient,
    setIsShared,
    activeRecipients,
    isPublic,
  };
}
