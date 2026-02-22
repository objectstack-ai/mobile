import { useCallback, useMemo, useState } from "react";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

export interface PathSegment {
  id: string;
  label: string;
  route?: string;
}

export interface RecordPathProps {
  path?: PathSegment[];
  currentIndex?: number;
}

export interface UseRecordPathResult {
  /** Breadcrumb path segments */
  path: PathSegment[];
  /** Current active index */
  currentIndex: number;
  /** Whether backward navigation is possible */
  canGoBack: boolean;
  /** Whether forward navigation is possible */
  canGoForward: boolean;
  /** Set the full path */
  setPath: (segments: PathSegment[]) => void;
  /** Navigate to a specific index */
  navigateTo: (index: number) => void;
  /** Go back one segment */
  goBack: () => void;
  /** Go forward one segment */
  goForward: () => void;
}

/* ------------------------------------------------------------------ */
/*  Hook                                                                */
/* ------------------------------------------------------------------ */

/**
 * Hook for managing navigation breadcrumb paths on SDUI record
 * pages — forward, back, and direct index navigation.
 *
 * Implements Phase 23 SDUI Record Page Protocol.
 *
 * ```ts
 * const { path, canGoBack, goBack, navigateTo } = useRecordPath();
 * setPath([{ id: "home", label: "Home" }, { id: "acct", label: "Account" }]);
 * navigateTo(1);
 * goBack();
 * ```
 */
export function useRecordPath(
  _props?: RecordPathProps,
): UseRecordPathResult {
  const [path, setPathState] = useState<PathSegment[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);

  const canGoBack = useMemo(() => currentIndex > 0, [currentIndex]);
  const canGoForward = useMemo(
    () => currentIndex < path.length - 1,
    [currentIndex, path.length],
  );

  const setPath = useCallback((segments: PathSegment[]) => {
    setPathState(segments);
    setCurrentIndex(segments.length > 0 ? segments.length - 1 : 0);
  }, []);

  const navigateTo = useCallback(
    (index: number) => {
      if (index >= 0 && index < path.length) {
        setCurrentIndex(index);
      }
    },
    [path.length],
  );

  const goBack = useCallback(() => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : prev));
  }, []);

  const goForward = useCallback(() => {
    setCurrentIndex((prev) =>
      prev < path.length - 1 ? prev + 1 : prev,
    );
  }, [path.length]);

  return {
    path,
    currentIndex,
    canGoBack,
    canGoForward,
    setPath,
    navigateTo,
    goBack,
    goForward,
  };
}
