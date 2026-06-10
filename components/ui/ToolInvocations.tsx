import { useState } from "react";
import { View, Text, Pressable } from "react-native";
import { ChevronRight, ChevronDown, Wrench, Check, Loader } from "lucide-react-native";
import { cn } from "~/lib/utils";
import type { ToolInvocation } from "~/lib/ai-chat";

/**
 * Structured display of an assistant turn's tool calls — a React Native take on
 * Vercel AI Elements' `Tool` component (which is web/DOM-only). Each tool is a
 * collapsible row: name + status, expanding to show the input args and the
 * result. Helps users see *how* the agent answered (e.g. `query_data`).
 */

function humanizeTool(name: string): string {
  return name.replace(/[_-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatValue(value: unknown): string {
  if (value == null) return "—";
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function ToolRow({ tool }: { tool: ToolInvocation }) {
  const [open, setOpen] = useState(false);
  const done = tool.state === "done";
  return (
    <View className="overflow-hidden rounded-lg border border-border bg-muted/40">
      <Pressable
        className="flex-row items-center gap-2 px-2.5 py-2 active:bg-muted"
        onPress={() => setOpen((o) => !o)}
        accessibilityRole="button"
        accessibilityLabel={`Tool ${tool.name}, ${done ? "done" : "running"}`}
        accessibilityState={{ expanded: open }}
      >
        <Wrench size={13} color="#64748b" />
        <Text className="flex-1 text-xs font-medium text-foreground" numberOfLines={1}>
          {humanizeTool(tool.name)}
        </Text>
        {done ? (
          <Check size={13} color="#16a34a" />
        ) : (
          <Loader size={13} color="#d97706" />
        )}
        {open ? (
          <ChevronDown size={14} color="#94a3b8" />
        ) : (
          <ChevronRight size={14} color="#94a3b8" />
        )}
      </Pressable>
      {open && (
        <View className="gap-2 border-t border-border px-2.5 py-2">
          {tool.input != null && (
            <View className="gap-0.5">
              <Text className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Input
              </Text>
              <Text className="font-mono text-[11px] leading-4 text-muted-foreground">
                {formatValue(tool.input)}
              </Text>
            </View>
          )}
          {done && tool.output != null && (
            <View className="gap-0.5">
              <Text className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Result
              </Text>
              <Text className="font-mono text-[11px] leading-4 text-card-foreground" numberOfLines={12}>
                {formatValue(tool.output)}
              </Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

export function ToolInvocations({
  tools,
  className,
}: {
  tools: ToolInvocation[];
  className?: string;
}) {
  if (!tools || tools.length === 0) return null;
  return (
    <View className={cn("mb-1 gap-1", className)} accessibilityLabel="Tool activity">
      {tools.map((t) => (
        <ToolRow key={t.id} tool={t} />
      ))}
    </View>
  );
}
