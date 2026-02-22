import { useCallback, useState } from "react";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

export interface LayoutItem {
  id: string;
  type: string;
  config: Record<string, unknown>;
  order: number;
}

export type TemplateType = "blank" | "form" | "dashboard" | "list" | "custom";

export interface BlankPageLayoutSchema {
  id: string;
  title: string;
  template: TemplateType;
  items: LayoutItem[];
}

export interface UseBlankPageLayoutResult {
  /** Layout items */
  items: LayoutItem[];
  /** Current template type */
  template: TemplateType;
  /** Set all layout items */
  setItems: (items: LayoutItem[]) => void;
  /** Add a layout item */
  addItem: (item: LayoutItem) => void;
  /** Remove a layout item by id */
  removeItem: (id: string) => void;
  /** Move a layout item to a new order index */
  moveItem: (id: string, newOrder: number) => void;
  /** Update a layout item's configuration */
  updateItem: (id: string, updates: Partial<LayoutItem>) => void;
  /** Set the template type */
  setTemplate: (template: TemplateType) => void;
}

/* ------------------------------------------------------------------ */
/*  Hook                                                                */
/* ------------------------------------------------------------------ */

/**
 * Hook for managing custom blank page templates on SDUI pages —
 * add, remove, move, and update layout items with template selection.
 *
 * Implements Phase 23 SDUI Record Page Protocol.
 *
 * ```ts
 * const { items, template, addItem, moveItem, setTemplate } =
 *   useBlankPageLayout();
 * setTemplate("dashboard");
 * addItem({ id: "i1", type: "text", config: { content: "Hello" }, order: 0 });
 * moveItem("i1", 3);
 * ```
 */
export function useBlankPageLayout(
  _schema?: BlankPageLayoutSchema,
): UseBlankPageLayoutResult {
  const [items, setItemsState] = useState<LayoutItem[]>([]);
  const [template, setTemplateState] = useState<TemplateType>("blank");

  const setItems = useCallback((newItems: LayoutItem[]) => {
    setItemsState(newItems);
  }, []);

  const addItem = useCallback((item: LayoutItem) => {
    setItemsState((prev) =>
      [...prev, item].sort((a, b) => a.order - b.order),
    );
  }, []);

  const removeItem = useCallback((id: string) => {
    setItemsState((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const moveItem = useCallback((id: string, newOrder: number) => {
    setItemsState((prev) =>
      prev
        .map((i) => (i.id === id ? { ...i, order: newOrder } : i))
        .sort((a, b) => a.order - b.order),
    );
  }, []);

  const updateItem = useCallback((id: string, updates: Partial<LayoutItem>) => {
    setItemsState((prev) =>
      prev.map((i) => (i.id === id ? { ...i, ...updates } : i)),
    );
  }, []);

  const setTemplate = useCallback((t: TemplateType) => {
    setTemplateState(t);
  }, []);

  return {
    items,
    template,
    setItems,
    addItem,
    removeItem,
    moveItem,
    updateItem,
    setTemplate,
  };
}
