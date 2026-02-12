/**
 * Tests for useCalendarView – validates calendar navigation,
 * view modes, and event CRUD operations.
 */
import { renderHook, act } from "@testing-library/react-native";

/* ---- Mock useClient from SDK ---- */
const mockCreate = jest.fn();
const mockUpdate = jest.fn();
const mockDelete = jest.fn();

const mockClient = {
  api: { create: mockCreate, update: mockUpdate, delete: mockDelete },
};

jest.mock("@objectstack/client-react", () => ({
  useClient: () => mockClient,
}));

import { useCalendarView } from "~/hooks/useCalendarView";

beforeEach(() => {
  mockCreate.mockReset();
  mockUpdate.mockReset();
  mockDelete.mockReset();
});

describe("useCalendarView", () => {
  it("starts with default state", () => {
    const { result } = renderHook(() => useCalendarView());
    expect(result.current.viewMode).toBe("month");
    expect(result.current.events).toEqual([]);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.currentDate).toBeDefined();
  });

  it("setViewMode changes view mode", () => {
    const { result } = renderHook(() => useCalendarView());

    act(() => {
      result.current.setViewMode("week");
    });
    expect(result.current.viewMode).toBe("week");

    act(() => {
      result.current.setViewMode("day");
    });
    expect(result.current.viewMode).toBe("day");
  });

  it("navigateNext increments date by month", () => {
    const { result } = renderHook(() => useCalendarView());

    act(() => {
      result.current.setCurrentDate("2026-06-15T00:00:00.000Z");
    });

    act(() => {
      result.current.navigateNext();
    });

    const nextDate = new Date(result.current.currentDate);
    expect(nextDate.getMonth()).toBe(6); // July (0-indexed)
  });

  it("navigatePrevious decrements date by month", () => {
    const { result } = renderHook(() => useCalendarView());

    act(() => {
      result.current.setCurrentDate("2026-06-15T00:00:00.000Z");
    });

    act(() => {
      result.current.navigatePrevious();
    });

    const prevDate = new Date(result.current.currentDate);
    expect(prevDate.getMonth()).toBe(4); // May (0-indexed)
  });

  it("navigateNext increments date by week in week mode", () => {
    const { result } = renderHook(() => useCalendarView());

    act(() => {
      result.current.setViewMode("week");
    });
    act(() => {
      result.current.setCurrentDate("2026-06-15T00:00:00.000Z");
    });

    act(() => {
      result.current.navigateNext();
    });

    const nextDate = new Date(result.current.currentDate);
    expect(nextDate.getDate()).toBe(22);
  });

  it("navigateNext increments date by day in day mode", () => {
    const { result } = renderHook(() => useCalendarView());

    act(() => {
      result.current.setViewMode("day");
    });
    act(() => {
      result.current.setCurrentDate("2026-06-15T00:00:00.000Z");
    });

    act(() => {
      result.current.navigateNext();
    });

    const nextDate = new Date(result.current.currentDate);
    expect(nextDate.getDate()).toBe(16);
  });

  it("addEvent creates and stores an event", async () => {
    const newEvent = {
      id: "evt-1",
      title: "Meeting",
      start: "2026-01-01T09:00:00Z",
      end: "2026-01-01T10:00:00Z",
    };
    mockCreate.mockResolvedValue(newEvent);

    const { result } = renderHook(() => useCalendarView());

    let returned: unknown;
    await act(async () => {
      returned = await result.current.addEvent({
        title: "Meeting",
        start: "2026-01-01T09:00:00Z",
        end: "2026-01-01T10:00:00Z",
      });
    });

    expect(mockCreate).toHaveBeenCalledWith("events", {
      title: "Meeting",
      start: "2026-01-01T09:00:00Z",
      end: "2026-01-01T10:00:00Z",
    });
    expect(returned).toEqual(newEvent);
    expect(result.current.events).toEqual([newEvent]);
    expect(result.current.isLoading).toBe(false);
  });

  it("updateEvent updates an existing event", async () => {
    const event = {
      id: "evt-1",
      title: "Meeting",
      start: "2026-01-01T09:00:00Z",
      end: "2026-01-01T10:00:00Z",
    };
    mockCreate.mockResolvedValue(event);
    mockUpdate.mockResolvedValue(undefined);

    const { result } = renderHook(() => useCalendarView());

    await act(async () => {
      await result.current.addEvent({
        title: "Meeting",
        start: "2026-01-01T09:00:00Z",
        end: "2026-01-01T10:00:00Z",
      });
    });

    await act(async () => {
      await result.current.updateEvent("evt-1", { title: "Updated Meeting" });
    });

    expect(mockUpdate).toHaveBeenCalledWith("events", "evt-1", {
      title: "Updated Meeting",
    });
    expect(result.current.events[0].title).toBe("Updated Meeting");
  });

  it("removeEvent deletes an event", async () => {
    const event = {
      id: "evt-1",
      title: "Meeting",
      start: "2026-01-01T09:00:00Z",
      end: "2026-01-01T10:00:00Z",
    };
    mockCreate.mockResolvedValue(event);
    mockDelete.mockResolvedValue(undefined);

    const { result } = renderHook(() => useCalendarView());

    await act(async () => {
      await result.current.addEvent({
        title: "Meeting",
        start: "2026-01-01T09:00:00Z",
        end: "2026-01-01T10:00:00Z",
      });
    });

    await act(async () => {
      await result.current.removeEvent("evt-1");
    });

    expect(mockDelete).toHaveBeenCalledWith("events", "evt-1");
    expect(result.current.events).toEqual([]);
  });

  it("handles addEvent error", async () => {
    mockCreate.mockRejectedValue(new Error("Create failed"));

    const { result } = renderHook(() => useCalendarView());

    await act(async () => {
      await expect(
        result.current.addEvent({
          title: "Meeting",
          start: "2026-01-01T09:00:00Z",
          end: "2026-01-01T10:00:00Z",
        }),
      ).rejects.toThrow("Create failed");
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error?.message).toBe("Create failed");
  });
});
