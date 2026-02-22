import { useCallback, useState } from "react";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

export interface PageBlock {
  id: string;
  type: string;
  config: Record<string, unknown>;
  order: number;
}

export interface InterfacePageConfigSchema {
  id: string;
  title: string;
  description?: string;
  blocks: PageBlock[];
}

export interface UseInterfacePageConfigResult {
  /** Current page configuration */
  config: InterfacePageConfigSchema;
  /** Ordered blocks array */
  blocks: PageBlock[];
  /** Set the full page configuration */
  setConfig: (config: InterfacePageConfigSchema) => void;
  /** Add a block to the page */
  addBlock: (block: PageBlock) => void;
  /** Remove a block by id */
  removeBlock: (id: string) => void;
  /** Move a block to a new order index */
  moveBlock: (id: string, newOrder: number) => void;
  /** Update a block's configuration */
  updateBlock: (id: string, updates: Partial<PageBlock>) => void;
}

/* ------------------------------------------------------------------ */
/*  Hook                                                                */
/* ------------------------------------------------------------------ */

/**
 * Hook for managing Airtable-style interface page configuration —
 * add, remove, move, and update blocks on a page.
 *
 * Implements Phase 23 SDUI Record Page Protocol.
 *
 * ```ts
 * const { config, blocks, addBlock, moveBlock, updateBlock } =
 *   useInterfacePageConfig();
 * setConfig({ id: "p1", title: "Dashboard", blocks: [] });
 * addBlock({ id: "b1", type: "chart", config: {}, order: 0 });
 * moveBlock("b1", 2);
 * ```
 */
export function useInterfacePageConfig(
  _initial?: InterfacePageConfigSchema,
): UseInterfacePageConfigResult {
  const [config, setConfigState] = useState<InterfacePageConfigSchema>({
    id: "",
    title: "",
    blocks: [],
  });

  const blocks = config.blocks;

  const setConfig = useCallback((cfg: InterfacePageConfigSchema) => {
    setConfigState(cfg);
  }, []);

  const addBlock = useCallback((block: PageBlock) => {
    setConfigState((prev) => ({
      ...prev,
      blocks: [...prev.blocks, block].sort((a, b) => a.order - b.order),
    }));
  }, []);

  const removeBlock = useCallback((id: string) => {
    setConfigState((prev) => ({
      ...prev,
      blocks: prev.blocks.filter((b) => b.id !== id),
    }));
  }, []);

  const moveBlock = useCallback((id: string, newOrder: number) => {
    setConfigState((prev) => ({
      ...prev,
      blocks: prev.blocks
        .map((b) => (b.id === id ? { ...b, order: newOrder } : b))
        .sort((a, b) => a.order - b.order),
    }));
  }, []);

  const updateBlock = useCallback((id: string, updates: Partial<PageBlock>) => {
    setConfigState((prev) => ({
      ...prev,
      blocks: prev.blocks.map((b) =>
        b.id === id ? { ...b, ...updates } : b,
      ),
    }));
  }, []);

  return {
    config,
    blocks,
    setConfig,
    addBlock,
    removeBlock,
    moveBlock,
    updateBlock,
  };
}
