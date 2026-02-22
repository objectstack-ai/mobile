import { useCallback, useMemo, useState } from "react";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

export interface EmbedConfig {
  viewId: string;
  width: number;
  height: number;
  theme: string;
  allowInteraction: boolean;
  showToolbar: boolean;
  showHeader: boolean;
  responsive: boolean;
}

export interface EmbedPermission {
  canView: boolean;
  canEdit: boolean;
  canShare: boolean;
  canExport: boolean;
}

export interface UseEmbedConfigResult {
  /** Current embed configuration */
  config: EmbedConfig;
  /** Current embed permissions */
  permissions: EmbedPermission;
  /** Whether the view is currently embedded */
  isEmbedded: boolean;
  /** Set the embed configuration */
  setConfig: (config: EmbedConfig) => void;
  /** Set the embed permissions */
  setPermissions: (permissions: EmbedPermission) => void;
  /** Set whether the view is embedded */
  setIsEmbedded: (embedded: boolean) => void;
  /** Computed embed URL from config */
  getEmbedUrl: string;
  /** Whether interaction is allowed */
  isInteractive: boolean;
}

/* ------------------------------------------------------------------ */
/*  Hook                                                                */
/* ------------------------------------------------------------------ */

/**
 * Hook for embeddable views from `EmbedConfigSchema`.
 *
 * Implements Phase 25 Embed Protocol.
 *
 * ```ts
 * const { config, getEmbedUrl, isInteractive, setConfig } =
 *   useEmbedConfig();
 * setConfig({
 *   viewId: "v1", width: 800, height: 600, theme: "light",
 *   allowInteraction: true, showToolbar: false, showHeader: true, responsive: true,
 * });
 * console.log(getEmbedUrl);
 * ```
 */
export function useEmbedConfig(): UseEmbedConfigResult {
  const [config, setConfigState] = useState<EmbedConfig>({
    viewId: "",
    width: 0,
    height: 0,
    theme: "light",
    allowInteraction: true,
    showToolbar: true,
    showHeader: true,
    responsive: false,
  });
  const [permissions, setPermissionsState] = useState<EmbedPermission>({
    canView: true,
    canEdit: false,
    canShare: false,
    canExport: false,
  });
  const [isEmbedded, setIsEmbeddedState] = useState<boolean>(false);

  /* ---- computed --------------------------------------------------- */

  const getEmbedUrl = useMemo(() => {
    const params = new URLSearchParams({
      viewId: config.viewId,
      width: String(config.width),
      height: String(config.height),
      theme: config.theme,
      interactive: String(config.allowInteraction),
      toolbar: String(config.showToolbar),
      header: String(config.showHeader),
      responsive: String(config.responsive),
    });
    return `/embed?${params.toString()}`;
  }, [config]);

  const isInteractive = useMemo(
    () => config.allowInteraction,
    [config.allowInteraction],
  );

  /* ---- setters ---------------------------------------------------- */

  const setConfig = useCallback((cfg: EmbedConfig) => {
    setConfigState(cfg);
  }, []);

  const setPermissions = useCallback((perms: EmbedPermission) => {
    setPermissionsState(perms);
  }, []);

  const setIsEmbedded = useCallback((embedded: boolean) => {
    setIsEmbeddedState(embedded);
  }, []);

  return {
    config,
    permissions,
    isEmbedded,
    setConfig,
    setPermissions,
    setIsEmbedded,
    getEmbedUrl,
    isInteractive,
  };
}
