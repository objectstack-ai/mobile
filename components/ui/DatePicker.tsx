import React from "react";
import { Modal, Pressable, Text, View } from "react-native";
import {
  Calendar as CalendarIcon,
  Clock,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
} from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { cn } from "~/lib/utils";
import { formatDate, formatDateTime } from "~/lib/formatting";

export type DatePickerMode = "date" | "datetime" | "time";

export interface DatePickerProps {
  /** Current value: epoch-ms number, ISO/parseable string, Date, or null. */
  value?: unknown;
  /**
   * Change handler. For `date`/`datetime` the emitted value is an epoch-ms
   * number (matching how the platform stores date fields); for `time` it is a
   * `"HH:MM"` string. `null` is emitted when the value is cleared.
   */
  onChange: (value: number | string | null) => void;
  mode?: DatePickerMode;
  placeholder?: string;
  className?: string;
  error?: boolean;
}

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/** Parse an arbitrary stored value into a `Date`, or `null` if unparseable. */
export function parseDateValue(v: unknown): Date | null {
  if (v == null || v === "") return null;
  if (v instanceof Date) return isNaN(v.getTime()) ? null : v;
  if (typeof v === "number") {
    const d = new Date(v);
    return isNaN(d.getTime()) ? null : d;
  }
  if (typeof v === "string") {
    const trimmed = v.trim();
    // "HH:MM" time string → today at that time.
    const t = /^(\d{1,2}):(\d{2})$/.exec(trimmed);
    if (t) {
      const d = new Date();
      d.setHours(Number(t[1]), Number(t[2]), 0, 0);
      return d;
    }
    // Numeric epoch string.
    if (/^\d+$/.test(trimmed)) {
      const d = new Date(Number(trimmed));
      return isNaN(d.getTime()) ? null : d;
    }
    const d = new Date(trimmed);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** Days-in-month grid (leading blanks as `null`) for a given year/month. */
function buildMonthGrid(year: number, month: number): (number | null)[] {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export function DatePicker({
  value,
  onChange,
  mode = "date",
  placeholder,
  className,
  error,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false);

  const selected = React.useMemo(() => parseDateValue(value), [value]);

  // Calendar view position + working time, seeded from the value (or now).
  const seed = selected ?? new Date();
  const [viewYear, setViewYear] = React.useState(seed.getFullYear());
  const [viewMonth, setViewMonth] = React.useState(seed.getMonth());
  const [hour, setHour] = React.useState(seed.getHours());
  const [minute, setMinute] = React.useState(seed.getMinutes());
  const [draftDay, setDraftDay] = React.useState<Date | null>(selected);

  // Re-seed when (re)opening so the modal reflects the current value.
  const openPicker = () => {
    const base = parseDateValue(value) ?? new Date();
    setViewYear(base.getFullYear());
    setViewMonth(base.getMonth());
    setHour(base.getHours());
    setMinute(base.getMinutes());
    setDraftDay(parseDateValue(value));
    setOpen(true);
  };

  const triggerLabel = (() => {
    if (!selected) return placeholder ?? "Select…";
    if (mode === "time") return `${pad2(selected.getHours())}:${pad2(selected.getMinutes())}`;
    if (mode === "datetime") return formatDateTime(selected, { style: "medium" });
    return formatDate(selected, { style: "medium" });
  })();

  const emit = (day: Date | null) => {
    if (!day) {
      onChange(null);
      return;
    }
    if (mode === "time") {
      onChange(`${pad2(hour)}:${pad2(minute)}`);
      return;
    }
    const out = new Date(
      day.getFullYear(),
      day.getMonth(),
      day.getDate(),
      mode === "datetime" ? hour : 0,
      mode === "datetime" ? minute : 0,
      0,
      0,
    );
    onChange(out.getTime());
  };

  const confirm = () => {
    if (mode === "time") {
      onChange(`${pad2(hour)}:${pad2(minute)}`);
    } else {
      emit(draftDay);
    }
    setOpen(false);
  };

  const grid = buildMonthGrid(viewYear, viewMonth);
  const today = new Date();
  const Icon = mode === "time" ? Clock : CalendarIcon;

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else setViewMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else setViewMonth((m) => m + 1);
  };

  const stepHour = (delta: number) => setHour((h) => (h + delta + 24) % 24);
  const stepMinute = (delta: number) => setMinute((m) => (m + delta + 60) % 60);

  const isSameDay = (a: Date | null, y: number, mo: number, d: number) =>
    !!a && a.getFullYear() === y && a.getMonth() === mo && a.getDate() === d;

  return (
    <>
      <Pressable
        onPress={openPicker}
        accessibilityRole="button"
        accessibilityLabel={triggerLabel}
        className={cn(
          "h-12 flex-row items-center justify-between rounded-xl border bg-background px-4 active:opacity-70",
          error ? "border-destructive" : "border-input",
          className,
        )}
      >
        <Text className={cn("text-base", selected ? "text-foreground" : "text-muted-foreground")}>
          {triggerLabel}
        </Text>
        <Icon size={18} className="text-muted-foreground" />
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable
          className="flex-1 items-center justify-center bg-black/50 px-6"
          onPress={() => setOpen(false)}
        >
          {/* Stop propagation so taps inside the card don't dismiss. */}
          <Pressable
            className="w-full max-w-sm rounded-2xl border border-border bg-background p-4"
            onPress={(e) => e.stopPropagation()}
          >
            {mode !== "time" && (
              <>
                {/* Month navigation */}
                <View className="mb-3 flex-row items-center justify-between">
                  <Pressable onPress={prevMonth} className="h-9 w-9 items-center justify-center rounded-lg active:bg-accent">
                    <ChevronLeft size={20} className="text-foreground" />
                  </Pressable>
                  <Text className="text-base font-semibold text-foreground">
                    {MONTHS[viewMonth]} {viewYear}
                  </Text>
                  <Pressable onPress={nextMonth} className="h-9 w-9 items-center justify-center rounded-lg active:bg-accent">
                    <ChevronRight size={20} className="text-foreground" />
                  </Pressable>
                </View>

                {/* Weekday header */}
                <View className="flex-row">
                  {WEEKDAYS.map((w) => (
                    <View key={w} className="flex-1 items-center py-1">
                      <Text className="text-xs font-medium text-muted-foreground">{w}</Text>
                    </View>
                  ))}
                </View>

                {/* Day grid */}
                <View className="flex-row flex-wrap">
                  {grid.map((d, i) => {
                    const isSel = d != null && isSameDay(draftDay, viewYear, viewMonth, d);
                    const isToday =
                      d != null && isSameDay(today, viewYear, viewMonth, d);
                    return (
                      <View key={i} className="items-center justify-center" style={{ width: `${100 / 7}%` }}>
                        {d == null ? (
                          <View className="h-10 w-10" />
                        ) : (
                          <Pressable
                            accessibilityRole="button"
                            accessibilityState={{ selected: isSel }}
                            onPress={() => {
                              void Haptics.selectionAsync();
                              const picked = new Date(viewYear, viewMonth, d);
                              setDraftDay(picked);
                              if (mode === "date") {
                                emit(picked);
                                setOpen(false);
                              }
                            }}
                            className={cn(
                              "my-0.5 h-10 w-10 items-center justify-center rounded-full",
                              isSel ? "bg-primary" : isToday ? "bg-accent" : "active:bg-accent",
                            )}
                          >
                            <Text
                              className={cn(
                                "text-sm",
                                isSel ? "font-semibold text-primary-foreground" : "text-foreground",
                              )}
                            >
                              {d}
                            </Text>
                          </Pressable>
                        )}
                      </View>
                    );
                  })}
                </View>
              </>
            )}

            {/* Time steppers (datetime + time modes) */}
            {(mode === "datetime" || mode === "time") && (
              <View className={cn("flex-row items-center justify-center gap-4", mode === "datetime" && "mt-3 border-t border-border pt-3")}>
                <TimeStepper value={hour} onStep={stepHour} />
                <Text className="text-2xl font-semibold text-foreground">:</Text>
                <TimeStepper value={minute} onStep={stepMinute} />
              </View>
            )}

            {/* Footer actions */}
            <View className="mt-4 flex-row items-center justify-between">
              <Pressable
                onPress={() => {
                  onChange(null);
                  setDraftDay(null);
                  setOpen(false);
                }}
                className="rounded-lg px-3 py-2 active:bg-accent"
              >
                <Text className="text-sm font-medium text-muted-foreground">Clear</Text>
              </Pressable>
              <View className="flex-row gap-2">
                <Pressable
                  onPress={() => {
                    const n = new Date();
                    setViewYear(n.getFullYear());
                    setViewMonth(n.getMonth());
                    setDraftDay(n);
                    if (mode === "date") {
                      emit(n);
                      setOpen(false);
                    } else {
                      setHour(n.getHours());
                      setMinute(n.getMinutes());
                    }
                  }}
                  className="rounded-lg px-3 py-2 active:bg-accent"
                >
                  <Text className="text-sm font-medium text-primary">Today</Text>
                </Pressable>
                {mode !== "date" && (
                  <Pressable onPress={confirm} className="rounded-lg bg-primary px-4 py-2">
                    <Text className="text-sm font-semibold text-primary-foreground">Done</Text>
                  </Pressable>
                )}
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

/** A vertical +/- stepper for a zero-padded time component. */
function TimeStepper({
  value,
  onStep,
}: {
  value: number;
  onStep: (delta: number) => void;
}) {
  return (
    <View className="items-center">
      <Pressable onPress={() => onStep(1)} className="h-8 w-12 items-center justify-center rounded-lg active:bg-accent">
        <ChevronUp size={18} className="text-muted-foreground" />
      </Pressable>
      <View className="my-1 w-14 items-center rounded-lg border border-input bg-background py-2">
        <Text className="text-xl font-semibold text-foreground">{pad2(value)}</Text>
      </View>
      <Pressable onPress={() => onStep(-1)} className="h-8 w-12 items-center justify-center rounded-lg active:bg-accent">
        <ChevronDown size={18} className="text-muted-foreground" />
      </Pressable>
    </View>
  );
}
