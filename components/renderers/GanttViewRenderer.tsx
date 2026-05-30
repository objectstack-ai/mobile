import React, { useMemo, useCallback } from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import { EmptyState } from "~/components/common/EmptyState";
import { GanttChartSquare } from "lucide-react-native";

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

export interface GanttViewRendererProps {
  /** The records to display as task bars */
  records: Record<string, unknown>[];
  /** Field providing the task label (default: name/title/label). */
  labelField?: string;
  /** Field providing the task start date (spec gantt `startField`). */
  startField?: string;
  /** Field providing the task end date (spec gantt `endField`). */
  endField?: string;
  /** Field providing a bar colour (optional). */
  colorField?: string;
  /** Loading indicator */
  isLoading?: boolean;
  /** Bar press handler */
  onTaskPress?: (record: Record<string, unknown>) => void;
  /** Empty-state message */
  emptyMessage?: string;
}

/* ------------------------------------------------------------------ */
/*  Domain model                                                       */
/* ------------------------------------------------------------------ */

export interface GanttTask {
  id: string;
  label: string;
  start: number; // epoch ms
  end: number; // epoch ms
  color?: string;
  record: Record<string, unknown>;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** Parse a date-ish value to epoch ms, or null if unparseable. */
export function toEpoch(value: unknown): number | null {
  if (value == null) return null;
  if (value instanceof Date) return value.getTime();
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const t = Date.parse(value);
    return Number.isNaN(t) ? null : t;
  }
  return null;
}

/**
 * Normalise records into Gantt tasks with a valid start/end span. Records
 * missing a start are skipped; a missing end defaults to start + 1 day.
 *
 * Exported for unit testing.
 */
export function buildGanttTasks(
  records: Record<string, unknown>[],
  opts: {
    labelField?: string;
    startField?: string;
    endField?: string;
    colorField?: string;
  },
): GanttTask[] {
  const startKey = opts.startField ?? "start";
  const endKey = opts.endField ?? "end";
  const labelKeys = [opts.labelField, "name", "title", "label", "subject"].filter(
    Boolean,
  ) as string[];

  const tasks: GanttTask[] = [];
  records.forEach((record, index) => {
    const start = toEpoch(record[startKey] ?? record.startDate ?? record.start_date);
    if (start == null) return;
    const endRaw = toEpoch(record[endKey] ?? record.endDate ?? record.end_date);
    const end = endRaw != null && endRaw > start ? endRaw : start + DAY_MS;

    let label = "Untitled";
    for (const key of labelKeys) {
      const v = record[key];
      if (v != null && v !== "") {
        label = String(v);
        break;
      }
    }

    const color =
      opts.colorField && typeof record[opts.colorField] === "string"
        ? (record[opts.colorField] as string)
        : undefined;

    tasks.push({
      id: String(record.id ?? record._id ?? index),
      label,
      start,
      end,
      color,
      record,
    });
  });
  return tasks;
}

/** Compute the [min, max] epoch span across tasks (padded to whole days). */
export function ganttBounds(tasks: GanttTask[]): { min: number; max: number } {
  if (tasks.length === 0) {
    const now = Date.now();
    return { min: now, max: now + DAY_MS };
  }
  let min = Infinity;
  let max = -Infinity;
  for (const t of tasks) {
    if (t.start < min) min = t.start;
    if (t.end > max) max = t.end;
  }
  // Pad so single-point spans remain visible.
  if (max <= min) max = min + DAY_MS;
  return { min, max };
}

function formatDay(epoch: number): string {
  return new Date(epoch).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

const ROW_HEIGHT = 36;
const TRACK_WIDTH = 320; // logical width of the time track

/**
 * Gantt view — renders records as horizontal task bars on a shared timeline.
 *
 * Mirrors the spec `ListView` `gantt` visualization: each task spans from its
 * start to end date, positioned proportionally across the overall date range.
 */
export function GanttViewRenderer({
  records,
  labelField,
  startField,
  endField,
  colorField,
  isLoading,
  onTaskPress,
  emptyMessage = "No scheduled items",
}: GanttViewRendererProps) {
  const tasks = useMemo(
    () => buildGanttTasks(records, { labelField, startField, endField, colorField }),
    [records, labelField, startField, endField, colorField],
  );

  const { min, max } = useMemo(() => ganttBounds(tasks), [tasks]);
  const span = Math.max(max - min, DAY_MS);

  const barGeometry = useCallback(
    (task: GanttTask) => {
      const left = ((task.start - min) / span) * TRACK_WIDTH;
      const width = Math.max(((task.end - task.start) / span) * TRACK_WIDTH, 6);
      return { left, width };
    },
    [min, span],
  );

  if (!isLoading && tasks.length === 0) {
    return (
      <EmptyState
        icon={<GanttChartSquare size={40} color="#94a3b8" />}
        title="Nothing Scheduled"
        description={emptyMessage}
      />
    );
  }

  return (
    <View className="flex-1">
      {/* Date range header */}
      <View className="flex-row items-center justify-between border-b border-border px-4 py-2">
        <Text className="text-xs text-muted-foreground">{formatDay(min)}</Text>
        <Text className="text-xs text-muted-foreground">{formatDay(max)}</Text>
      </View>

      <ScrollView>
        {tasks.map((task) => {
          const { left, width } = barGeometry(task);
          return (
            <Pressable
              key={task.id}
              className="flex-row items-center border-b border-border/50 px-4"
              style={{ height: ROW_HEIGHT }}
              onPress={() => onTaskPress?.(task.record)}
            >
              <View style={{ width: TRACK_WIDTH, height: ROW_HEIGHT }} className="justify-center">
                <View
                  className="absolute justify-center rounded-md px-2"
                  style={{
                    left,
                    width,
                    height: ROW_HEIGHT - 12,
                    backgroundColor: task.color ?? "#3b82f6",
                  }}
                >
                  <Text className="text-xs font-medium text-white" numberOfLines={1}>
                    {task.label}
                  </Text>
                </View>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}
