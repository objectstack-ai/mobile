import { useCallback, useMemo, useState } from "react";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

export type DropEffect = "move" | "copy" | "link" | "none";

export interface DragItem {
  id: string;
  type: string;
  data?: Record<string, unknown>;
}

export interface DropZone {
  id: string;
  accepts: string[];
  config?: Record<string, unknown>;
}

export interface DragConstraint {
  axis?: "x" | "y" | "both";
  bounds?: { top?: number; right?: number; bottom?: number; left?: number };
}

export interface DndConfig {
  zones: DropZone[];
  constraints?: DragConstraint;
  defaultDropEffect?: DropEffect;
}

export interface UseDndProtocolResult {
  /** Current DnD configuration derived from DndConfigSchema */
  config: DndConfig | null;
  /** Item currently being dragged */
  activeItem: DragItem | null;
  /** ID of the drop zone the item is hovering over */
  activeZone: string | null;
  /** Whether a drag operation is in progress */
  isDragging: boolean;
  /** Replace the entire DnD configuration */
  setConfig: (config: DndConfig) => void;
  /** Begin a drag operation with the given item */
  startDrag: (item: DragItem) => void;
  /** End the current drag operation */
  endDrag: () => void;
  /** Set the currently hovered drop zone (or null) */
  setActiveZone: (zoneId: string | null) => void;
  /** Check whether an item type can be dropped on a zone */
  canDrop: (itemType: string, zoneId: string) => boolean;
  /** Determine the drop effect for an item type on a zone */
  getDropEffect: (itemType: string, zoneId: string) => DropEffect;
}

/* ------------------------------------------------------------------ */
/*  Hook                                                                */
/* ------------------------------------------------------------------ */

/**
 * Spec-driven drag-and-drop hook backed by a `DndConfigSchema`.
 *
 * Manages drag state, drop-zone validation, and drop-effect resolution
 * so UI layers only need to read declarative values.
 *
 * ```ts
 * const { setConfig, startDrag, endDrag, canDrop, isDragging } = useDndProtocol();
 * setConfig({ zones: [{ id: "trash", accepts: ["card"] }] });
 * startDrag({ id: "c1", type: "card" });
 * if (canDrop("card", "trash")) endDrag();
 * ```
 */
export function useDndProtocol(): UseDndProtocolResult {
  const [config, setConfigState] = useState<DndConfig | null>(null);
  const [activeItem, setActiveItem] = useState<DragItem | null>(null);
  const [activeZone, setActiveZoneState] = useState<string | null>(null);

  const isDragging = useMemo(() => activeItem !== null, [activeItem]);

  const setConfig = useCallback((cfg: DndConfig) => {
    setConfigState(cfg);
  }, []);

  const startDrag = useCallback((item: DragItem) => {
    setActiveItem(item);
  }, []);

  const endDrag = useCallback(() => {
    setActiveItem(null);
    setActiveZoneState(null);
  }, []);

  const setActiveZone = useCallback((zoneId: string | null) => {
    setActiveZoneState(zoneId);
  }, []);

  const canDrop = useCallback(
    (itemType: string, zoneId: string): boolean => {
      if (!config) return false;
      const zone = config.zones.find((z) => z.id === zoneId);
      if (!zone) return false;
      return zone.accepts.includes(itemType);
    },
    [config],
  );

  const getDropEffect = useCallback(
    (itemType: string, zoneId: string): DropEffect => {
      if (!config) return "none";
      const zone = config.zones.find((z) => z.id === zoneId);
      if (!zone || !zone.accepts.includes(itemType)) return "none";
      return config.defaultDropEffect ?? "move";
    },
    [config],
  );

  return {
    config,
    activeItem,
    activeZone,
    isDragging,
    setConfig,
    startDrag,
    endDrag,
    setActiveZone,
    canDrop,
    getDropEffect,
  };
}
