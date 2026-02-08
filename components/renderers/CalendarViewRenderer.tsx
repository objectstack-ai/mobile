import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { ChevronLeft, ChevronRight } from "lucide-react-native";
import { cn } from "~/lib/utils";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

export interface CalendarEvent {
  /** Record ID */
  id: string;
  /** Event title */
  title: string;
  /** Start date (ISO 8601 or Date) */
  date: string | Date;
  /** Optional end date */
  endDate?: string | Date;
  /** Dot color (hex) */
  color?: string;
  /** The full record data */
  record?: Record<string, unknown>;
}

export interface CalendarViewRendererProps {
  /** Events to display */
  events: CalendarEvent[];
  /** Loading */
  isLoading?: boolean;
  /** Called when an event is pressed */
  onEventPress?: (event: CalendarEvent) => void;
  /** Called when the visible month changes (ISO date string of first day) */
  onMonthChange?: (yearMonth: string) => void;
  /** Initial year (default: current year) */
  initialYear?: number;
  /** Initial month (default: current month, 0-indexed) */
  initialMonth?: number;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const DEFAULT_EVENT_COLORS = [
  "#3b82f6", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981",
];

function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function parseDate(d: string | Date): Date {
  return d instanceof Date ? d : new Date(d);
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

/**
 * Calendar view renderer.
 *
 * Displays a month grid with event dots.  Events for the selected day
 * are listed below the calendar.  Navigation arrows move between months.
 */
export function CalendarViewRenderer({
  events,
  isLoading = false,
  onEventPress,
  onMonthChange,
  initialYear,
  initialMonth,
}: CalendarViewRendererProps) {
  const now = new Date();
  const [year, setYear] = useState(initialYear ?? now.getFullYear());
  const [month, setMonth] = useState(initialMonth ?? now.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(toDateKey(now));

  /* ---- Group events by date ---- */
  const eventsByDate = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};
    events.forEach((ev, idx) => {
      const d = parseDate(ev.date);
      const key = toDateKey(d);
      if (!map[key]) map[key] = [];
      map[key].push({
        ...ev,
        color: ev.color ?? DEFAULT_EVENT_COLORS[idx % DEFAULT_EVENT_COLORS.length],
      });
    });
    return map;
  }, [events]);

  /* ---- Navigation ---- */
  const goToPrevMonth = useCallback(() => {
    setMonth((m) => {
      if (m === 0) {
        setYear((y) => y - 1);
        const newMonth = 11;
        onMonthChange?.(`${year - 1}-${String(newMonth + 1).padStart(2, "0")}`);
        return newMonth;
      }
      onMonthChange?.(`${year}-${String(m).padStart(2, "0")}`);
      return m - 1;
    });
  }, [year, onMonthChange]);

  const goToNextMonth = useCallback(() => {
    setMonth((m) => {
      if (m === 11) {
        setYear((y) => y + 1);
        const newMonth = 0;
        onMonthChange?.(`${year + 1}-${String(newMonth + 1).padStart(2, "0")}`);
        return newMonth;
      }
      onMonthChange?.(`${year}-${String(m + 2).padStart(2, "0")}`);
      return m + 1;
    });
  }, [year, onMonthChange]);

  /* ---- Build calendar grid ---- */
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfWeek(year, month);
  const todayKey = toDateKey(now);

  const calendarDays: (number | null)[] = useMemo(() => {
    const days: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let d = 1; d <= daysInMonth; d++) days.push(d);
    return days;
  }, [daysInMonth, firstDay]);

  /* ---- Events for selected date ---- */
  const selectedEvents = selectedDate ? eventsByDate[selectedDate] ?? [] : [];

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" color="#1e40af" />
      </View>
    );
  }

  return (
    <ScrollView className="flex-1" contentContainerStyle={{ padding: 16 }}>
      {/* Month navigation */}
      <View className="mb-4 flex-row items-center justify-between">
        <Pressable onPress={goToPrevMonth} className="rounded-lg p-2 active:bg-muted">
          <ChevronLeft size={20} color="#1e40af" />
        </Pressable>
        <Text className="text-lg font-bold text-foreground">
          {MONTH_NAMES[month]} {year}
        </Text>
        <Pressable onPress={goToNextMonth} className="rounded-lg p-2 active:bg-muted">
          <ChevronRight size={20} color="#1e40af" />
        </Pressable>
      </View>

      {/* Weekday header */}
      <View className="mb-1 flex-row">
        {WEEKDAYS.map((d) => (
          <View key={d} className="flex-1 items-center">
            <Text className="text-xs font-medium text-muted-foreground">{d}</Text>
          </View>
        ))}
      </View>

      {/* Day grid */}
      <View className="flex-row flex-wrap">
        {calendarDays.map((day, idx) => {
          if (day === null) {
            return <View key={`empty-${idx}`} className="h-12 flex-1 min-w-[14.28%]" />;
          }
          const dateKey = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const hasEvents = !!eventsByDate[dateKey];
          const isToday = dateKey === todayKey;
          const isSelected = dateKey === selectedDate;

          return (
            <Pressable
              key={dateKey}
              className={cn(
                "h-12 flex-1 min-w-[14.28%] items-center justify-center rounded-lg",
                isSelected && "bg-primary/10",
                isToday && !isSelected && "bg-muted/50",
              )}
              onPress={() => setSelectedDate(dateKey)}
            >
              <Text
                className={cn(
                  "text-sm",
                  isSelected ? "font-bold text-primary" : "text-foreground",
                  isToday && !isSelected && "font-semibold text-primary",
                )}
              >
                {day}
              </Text>
              {hasEvents && (
                <View className="mt-0.5 flex-row gap-0.5">
                  {(eventsByDate[dateKey] ?? []).slice(0, 3).map((ev, i) => (
                    <View
                      key={i}
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ backgroundColor: ev.color ?? "#3b82f6" }}
                    />
                  ))}
                </View>
              )}
            </Pressable>
          );
        })}
      </View>

      {/* Selected date events */}
      {selectedDate && (
        <View className="mt-4">
          <Text className="mb-2 text-sm font-semibold text-muted-foreground">
            Events for {selectedDate}
          </Text>
          {selectedEvents.length === 0 ? (
            <Text className="text-sm text-muted-foreground">No events</Text>
          ) : (
            selectedEvents.map((ev) => (
              <Pressable
                key={ev.id}
                className="mb-2 flex-row items-center rounded-lg border border-border bg-card p-3 active:bg-muted/50"
                onPress={() => onEventPress?.(ev)}
              >
                <View
                  className="mr-3 h-3 w-3 rounded-full"
                  style={{ backgroundColor: ev.color ?? "#3b82f6" }}
                />
                <Text className="flex-1 text-sm font-medium text-card-foreground" numberOfLines={1}>
                  {ev.title}
                </Text>
              </Pressable>
            ))
          )}
        </View>
      )}
    </ScrollView>
  );
}
