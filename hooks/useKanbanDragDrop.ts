import { useCallback, useState } from "react";
import { useClient } from "@objectstack/client-react";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

export interface KanbanCard {
  id: string;
  columnId: string;
  index: number;
  data: Record<string, unknown>;
}

export interface UseKanbanDragDropResult {
  draggedCard: KanbanCard | null;
  startDrag: (card: KanbanCard) => void;
  moveCard: (
    cardId: string,
    targetColumnId: string,
    targetIndex: number,
  ) => Promise<void>;
  endDrag: () => void;
  cancelDrag: () => void;
  isDragging: boolean;
  columns: Map<string, KanbanCard[]>;
  initColumns: (columns: Map<string, KanbanCard[]>) => void;
  isLoading: boolean;
  error: Error | null;
}

/* ------------------------------------------------------------------ */
/*  Hook                                                                */
/* ------------------------------------------------------------------ */

/**
 * Hook for Kanban drag-and-drop state management.
 *
 * ```ts
 * const { startDrag, moveCard, columns, isDragging } = useKanbanDragDrop();
 * startDrag({ id: "card-1", columnId: "todo", index: 0, data: {} });
 * await moveCard("card-1", "done", 0);
 * ```
 */
export function useKanbanDragDrop(): UseKanbanDragDropResult {
  const client = useClient();
  const [draggedCard, setDraggedCard] = useState<KanbanCard | null>(null);
  const [columns, setColumns] = useState<Map<string, KanbanCard[]>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const startDrag = useCallback((card: KanbanCard) => {
    setDraggedCard(card);
  }, []);

  const moveCard = useCallback(
    async (
      cardId: string,
      targetColumnId: string,
      targetIndex: number,
    ): Promise<void> => {
      setIsLoading(true);
      setError(null);
      try {
        setColumns((prev) => {
          const next = new Map(prev);
          let movedCard: KanbanCard | undefined;

          // Remove from source column
          for (const [colId, cards] of next) {
            const idx = cards.findIndex((c) => c.id === cardId);
            if (idx !== -1) {
              movedCard = cards[idx];
              const updated = [...cards];
              updated.splice(idx, 1);
              next.set(colId, updated);
              break;
            }
          }

          // Insert into target column
          if (movedCard) {
            const targetCards = [...(next.get(targetColumnId) ?? [])];
            const updatedCard = {
              ...movedCard,
              columnId: targetColumnId,
              index: targetIndex,
            };
            targetCards.splice(targetIndex, 0, updatedCard);
            next.set(targetColumnId, targetCards);
          }

          return next;
        });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (client as any).api?.update("cards", cardId, {
          columnId: targetColumnId,
          index: targetIndex,
        });
      } catch (err: unknown) {
        const moveError =
          err instanceof Error ? err : new Error("Failed to move card");
        setError(moveError);
        throw moveError;
      } finally {
        setIsLoading(false);
      }
    },
    [client],
  );

  const endDrag = useCallback(() => {
    setDraggedCard(null);
  }, []);

  const cancelDrag = useCallback(() => {
    setDraggedCard(null);
  }, []);

  const initColumns = useCallback((cols: Map<string, KanbanCard[]>) => {
    setColumns(new Map(cols));
  }, []);

  return {
    draggedCard,
    startDrag,
    moveCard,
    endDrag,
    cancelDrag,
    isDragging: draggedCard !== null,
    columns,
    initColumns,
    isLoading,
    error,
  };
}
