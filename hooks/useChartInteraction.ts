import { useCallback, useState } from "react";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

export interface ChartDataPoint {
  label: string;
  value: number;
  metadata?: Record<string, unknown>;
}

export interface UseChartInteractionResult {
  selectedPoint: ChartDataPoint | null;
  selectPoint: (point: ChartDataPoint | null) => void;
  drillDown: (point: ChartDataPoint) => void;
  drillDownStack: ChartDataPoint[];
  goBack: () => void;
  zoomLevel: number;
  setZoomLevel: (level: number) => void;
  isAnimating: boolean;
  setIsAnimating: (animating: boolean) => void;
}

/* ------------------------------------------------------------------ */
/*  Hook                                                                */
/* ------------------------------------------------------------------ */

/**
 * Hook for chart interaction state management.
 *
 * ```ts
 * const { selectPoint, drillDown, goBack, zoomLevel } = useChartInteraction();
 * selectPoint({ label: "Q1", value: 100 });
 * drillDown({ label: "Q1", value: 100 });
 * goBack();
 * ```
 */
export function useChartInteraction(): UseChartInteractionResult {
  const [selectedPoint, setSelectedPoint] = useState<ChartDataPoint | null>(
    null,
  );
  const [drillDownStack, setDrillDownStack] = useState<ChartDataPoint[]>([]);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isAnimating, setIsAnimating] = useState(false);

  const selectPoint = useCallback((point: ChartDataPoint | null) => {
    setSelectedPoint(point);
  }, []);

  const drillDown = useCallback((point: ChartDataPoint) => {
    setDrillDownStack((prev) => [...prev, point]);
    setSelectedPoint(point);
  }, []);

  const goBack = useCallback(() => {
    setDrillDownStack((prev) => {
      if (prev.length === 0) return prev;
      const next = prev.slice(0, -1);
      setSelectedPoint(next.length > 0 ? next[next.length - 1] : null);
      return next;
    });
  }, []);

  return {
    selectedPoint,
    selectPoint,
    drillDown,
    drillDownStack,
    goBack,
    zoomLevel,
    setZoomLevel,
    isAnimating,
    setIsAnimating,
  };
}
