import { useCallback, useState } from "react";
import { useClient } from "@objectstack/client-react";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

export type CalendarViewMode = "month" | "week" | "day";

export interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  allDay?: boolean;
  color?: string;
  objectName?: string;
  recordId?: string;
}

export interface UseCalendarViewResult {
  viewMode: CalendarViewMode;
  setViewMode: (mode: CalendarViewMode) => void;
  currentDate: string;
  setCurrentDate: (date: string) => void;
  events: CalendarEvent[];
  addEvent: (event: Omit<CalendarEvent, "id">) => Promise<CalendarEvent>;
  updateEvent: (id: string, updates: Partial<CalendarEvent>) => Promise<void>;
  removeEvent: (id: string) => Promise<void>;
  navigateNext: () => void;
  navigatePrevious: () => void;
  isLoading: boolean;
  error: Error | null;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */

function shiftDate(iso: string, mode: CalendarViewMode, direction: number): string {
  const d = new Date(iso);
  if (mode === "month") {
    d.setMonth(d.getMonth() + direction);
  } else if (mode === "week") {
    d.setDate(d.getDate() + 7 * direction);
  } else {
    d.setDate(d.getDate() + direction);
  }
  return d.toISOString();
}

/* ------------------------------------------------------------------ */
/*  Hook                                                                */
/* ------------------------------------------------------------------ */

/**
 * Hook for calendar week/day views with event management.
 *
 * ```ts
 * const { events, addEvent, navigateNext, viewMode } = useCalendarView();
 * await addEvent({ title: "Meeting", start: "2026-01-01T09:00:00Z", end: "2026-01-01T10:00:00Z" });
 * navigateNext();
 * ```
 */
export function useCalendarView(): UseCalendarViewResult {
  const client = useClient();
  const [viewMode, setViewMode] = useState<CalendarViewMode>("month");
  const [currentDate, setCurrentDate] = useState<string>(
    new Date().toISOString(),
  );
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const addEvent = useCallback(
    async (event: Omit<CalendarEvent, "id">): Promise<CalendarEvent> => {
      setIsLoading(true);
      setError(null);
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result = await (client as any).api?.create("events", event);
        const created: CalendarEvent = result ?? { ...event, id: crypto.randomUUID() };
        setEvents((prev) => [...prev, created]);
        return created;
      } catch (err: unknown) {
        const addError =
          err instanceof Error ? err : new Error("Failed to add event");
        setError(addError);
        throw addError;
      } finally {
        setIsLoading(false);
      }
    },
    [client],
  );

  const updateEvent = useCallback(
    async (id: string, updates: Partial<CalendarEvent>): Promise<void> => {
      setIsLoading(true);
      setError(null);
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (client as any).api?.update("events", id, updates);
        setEvents((prev) =>
          prev.map((e) => (e.id === id ? { ...e, ...updates } : e)),
        );
      } catch (err: unknown) {
        const updateError =
          err instanceof Error ? err : new Error("Failed to update event");
        setError(updateError);
        throw updateError;
      } finally {
        setIsLoading(false);
      }
    },
    [client],
  );

  const removeEvent = useCallback(
    async (id: string): Promise<void> => {
      setIsLoading(true);
      setError(null);
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (client as any).api?.delete("events", id);
        setEvents((prev) => prev.filter((e) => e.id !== id));
      } catch (err: unknown) {
        const removeError =
          err instanceof Error ? err : new Error("Failed to remove event");
        setError(removeError);
        throw removeError;
      } finally {
        setIsLoading(false);
      }
    },
    [client],
  );

  const navigateNext = useCallback(() => {
    setCurrentDate((prev) => shiftDate(prev, viewMode, 1));
  }, [viewMode]);

  const navigatePrevious = useCallback(() => {
    setCurrentDate((prev) => shiftDate(prev, viewMode, -1));
  }, [viewMode]);

  return {
    viewMode,
    setViewMode,
    currentDate,
    setCurrentDate,
    events,
    addEvent,
    updateEvent,
    removeEvent,
    navigateNext,
    navigatePrevious,
    isLoading,
    error,
  };
}
