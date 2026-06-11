import { useState } from "react";
import { View, Text, Pressable } from "react-native";
import { ChevronRight, ChevronDown, Brain } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { cn } from "~/lib/utils";

/**
 * Collapsible "thinking" block for a model's reasoning trace — a React Native
 * take on Vercel AI Elements' `Reasoning` component (web/DOM-only). Collapsed
 * by default (reasoning is secondary to the answer); tap to expand.
 *
 * Only renders when the agent actually streamed reasoning; the current
 * ObjectStack agent does not, so this stays invisible until a reasoning-capable
 * model is wired up server-side.
 */
export function Reasoning({
  reasoning,
  className,
}: {
  reasoning: string;
  className?: string;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  if (!reasoning || reasoning.trim() === "") return null;
  return (
    <View className={cn("mb-1 overflow-hidden rounded-lg border border-border bg-muted/40", className)}>
      <Pressable
        className="flex-row items-center gap-2 px-2.5 py-2 active:bg-muted"
        onPress={() => setOpen((o) => !o)}
        accessibilityRole="button"
        accessibilityLabel={t("ai.reasoning")}
        accessibilityState={{ expanded: open }}
      >
        <Brain size={13} color="#64748b" />
        <Text className="flex-1 text-xs font-medium text-muted-foreground">{t("ai.reasoning")}</Text>
        {open ? (
          <ChevronDown size={14} color="#94a3b8" />
        ) : (
          <ChevronRight size={14} color="#94a3b8" />
        )}
      </Pressable>
      {open && (
        <View className="border-t border-border px-2.5 py-2">
          <Text className="text-xs leading-5 text-muted-foreground">{reasoning.trim()}</Text>
        </View>
      )}
    </View>
  );
}
