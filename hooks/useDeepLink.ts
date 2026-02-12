import { useCallback, useState } from "react";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

export interface DeepLinkRoute {
  path: string;
  params: Record<string, string>;
  objectName?: string;
  recordId?: string;
}

export interface UseDeepLinkResult {
  /** Last deep link that was handled */
  lastDeepLink: DeepLinkRoute | null;
  /** Parse a URL into a DeepLinkRoute */
  parseDeepLink: (url: string) => DeepLinkRoute | null;
  /** Generate a deep link URL for an object / record */
  generateDeepLink: (objectName: string, recordId?: string) => string;
  /** Parse and store an incoming deep link */
  handleIncomingLink: (url: string) => DeepLinkRoute | null;
  /** Generate an HTTPS share URL */
  generateShareUrl: (objectName: string, recordId: string, title?: string) => string;
  /** Whether a link is currently being processed */
  isProcessing: boolean;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                           */
/* ------------------------------------------------------------------ */

const SCHEME = "objectstack://";
const WEB_BASE = "https://app.objectstack.com";

/* ------------------------------------------------------------------ */
/*  Hook                                                                */
/* ------------------------------------------------------------------ */

/**
 * Hook for deep link and share extension handling.
 *
 * ```ts
 * const { parseDeepLink, generateDeepLink, handleIncomingLink } = useDeepLink();
 * const route = handleIncomingLink("objectstack://objects/tasks/task-123");
 * ```
 */
export function useDeepLink(): UseDeepLinkResult {
  const [lastDeepLink, setLastDeepLink] = useState<DeepLinkRoute | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const parseDeepLink = useCallback((url: string): DeepLinkRoute | null => {
    try {
      let path: string;

      if (url.startsWith(SCHEME)) {
        path = url.slice(SCHEME.length);
      } else if (url.startsWith(WEB_BASE)) {
        path = url.slice(WEB_BASE.length + 1); // +1 for the /
      } else {
        return null;
      }

      // Remove trailing slash
      path = path.replace(/\/+$/, "");

      const segments = path.split("/").filter(Boolean);
      const params: Record<string, string> = {};
      let objectName: string | undefined;
      let recordId: string | undefined;

      // Expected format: objects/{objectName}/{recordId?}
      if (segments[0] === "objects" && segments.length >= 2) {
        objectName = segments[1];
        params.objectName = objectName;
        if (segments[2]) {
          recordId = segments[2];
          params.recordId = recordId;
        }
      }

      return { path, params, objectName, recordId };
    } catch {
      return null;
    }
  }, []);

  const generateDeepLink = useCallback(
    (objectName: string, recordId?: string): string => {
      const base = `${SCHEME}objects/${objectName}`;
      return recordId ? `${base}/${recordId}` : base;
    },
    [],
  );

  const handleIncomingLink = useCallback(
    (url: string): DeepLinkRoute | null => {
      setIsProcessing(true);
      const route = parseDeepLink(url);
      setLastDeepLink(route);
      setIsProcessing(false);
      return route;
    },
    [parseDeepLink],
  );

  const generateShareUrl = useCallback(
    (objectName: string, recordId: string, title?: string): string => {
      const base = `${WEB_BASE}/objects/${objectName}/${recordId}`;
      return title ? `${base}?title=${encodeURIComponent(title)}` : base;
    },
    [],
  );

  return {
    lastDeepLink,
    parseDeepLink,
    generateDeepLink,
    handleIncomingLink,
    generateShareUrl,
    isProcessing,
  };
}
