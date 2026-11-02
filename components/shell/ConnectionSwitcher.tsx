import React, { useRef } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { GestureHandlerRootView, ScrollView } from "react-native-gesture-handler";
import ReanimatedSwipeable, {
  type SwipeableMethods,
} from "react-native-gesture-handler/ReanimatedSwipeable";
import { Check, ChevronLeft, ChevronRight, Plus } from "lucide-react-native";
import { BottomSheet } from "~/components/ui/BottomSheet";
import type { Connection } from "~/lib/connections/model";
import { useLayoutDirection } from "~/lib/rtl";
import { useThemeColors } from "~/lib/theme-colors";
import { cn } from "~/lib/utils";

export interface ConnectionSwitcherProps {
  open: boolean;
  connections: readonly Connection[];
  currentHost: string | null;
  /** The host being removed: its row shows progress, and nothing else can be removed meanwhile. */
  removingHost?: string | null;
  onClose: () => void;
  /** Make a connection current (the Console switches to it). */
  onSelect: (host: string) => void;
  /** Remove a connection and sign it out. */
  onRemove: (host: string) => void;
  /** "Add an organization or company server": back to the address step. */
  onAdd: () => void;
  /** App settings. */
  onOpenSettings: () => void;
}

/** Height of the scrolling list: about five rows. */
const LIST_MAX_HEIGHT = 400;

/**
 * The "Switch organization" sheet (design screen 8): the saved connections,
 * each with its initial on the brand colour, label, kind badge and host, and a
 * check on the current one. Tapping a row switches to it; swiping a row left
 * reveals Remove (screen readers get the same as a "Remove" action on the
 * row). Below: add a connection, which never saves by
 * itself — it goes back to the address step and its confirm step — and app
 * settings.
 */
export function ConnectionSwitcher({
  open,
  connections,
  currentHost,
  removingHost = null,
  onClose,
  onSelect,
  onRemove,
  onAdd,
  onOpenSettings,
}: ConnectionSwitcherProps) {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const direction = useLayoutDirection();
  const Chevron = direction === "rtl" ? ChevronLeft : ChevronRight;

  return (
    <BottomSheet open={open} onOpenChange={(next) => (next ? undefined : onClose())}>
      {/* A Modal is its own native root: gestures need their own root view
          there, and the layout direction does not reach it from the screen. */}
      <GestureHandlerRootView style={{ direction }} testID="connection-switcher">
        <Text accessibilityRole="header" className="pb-4 text-2xl font-bold text-foreground">
          {t("switcher.title")}
        </Text>

        {/* Room for about five rows; more scroll, so the actions below stay on screen. */}
        <ScrollView
          testID="switcher-list"
          style={{ maxHeight: LIST_MAX_HEIGHT }}
          className="rounded-2xl border border-border"
          bounces={false}
        >
          {connections.map((connection, index) => (
            <ConnectionRow
              key={connection.host}
              connection={connection}
              first={index === 0}
              current={connection.host === currentHost}
              removing={connection.host === removingHost}
              locked={removingHost !== null}
              onSelect={onSelect}
              onRemove={onRemove}
            />
          ))}
        </ScrollView>

        <Pressable
          testID="switcher-add"
          accessibilityRole="button"
          onPress={onAdd}
          className="mt-4 flex-row items-center gap-3 rounded-2xl border border-dashed border-border px-5 py-4"
        >
          <Plus size={20} color={colors.accent} />
          <Text className="flex-1 text-base font-semibold text-primary">{t("switcher.add")}</Text>
        </Pressable>

        <Text testID="switcher-footnote" className="mt-4 text-sm text-muted-foreground">
          {t("switcher.footnote")}
        </Text>

        <Pressable
          testID="switcher-settings"
          accessibilityRole="button"
          onPress={onOpenSettings}
          className="mt-4 flex-row items-center gap-3 border-t border-border pt-4"
        >
          <Text className="flex-1 text-base text-foreground">{t("switcher.appSettings")}</Text>
          <Chevron size={20} color={colors.muted} />
        </Pressable>
      </GestureHandlerRootView>
    </BottomSheet>
  );
}

interface ConnectionRowProps {
  connection: Connection;
  first: boolean;
  current: boolean;
  removing: boolean;
  /** A removal is running: no row can be switched to or removed. */
  locked: boolean;
  onSelect: (host: string) => void;
  onRemove: (host: string) => void;
}

function ConnectionRow({
  connection,
  first,
  current,
  removing,
  locked,
  onSelect,
  onRemove,
}: ConnectionRowProps) {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const swipeable = useRef<SwipeableMethods>(null);
  const { host, label, kind, brandColor, initial } = connection;
  const kindLabel = t(kind === "cloud" ? "switcher.kind.cloud" : "switcher.kind.server");

  const remove = () => {
    swipeable.current?.close();
    if (!locked) onRemove(host);
  };

  return (
    <ReanimatedSwipeable
      ref={swipeable}
      enabled={!locked}
      friction={2}
      rightThreshold={40}
      overshootRight={false}
      renderRightActions={() => (
        <Pressable
          testID={`switcher-remove-${host}`}
          accessibilityRole="button"
          accessibilityLabel={t("switcher.removeNamed", { label })}
          onPress={remove}
          className="w-24 items-center justify-center bg-destructive"
        >
          <Text className="font-semibold text-destructive-foreground">{t("switcher.remove")}</Text>
        </Pressable>
      )}
    >
      <Pressable
        testID={`switcher-row-${host}`}
        accessibilityRole="button"
        accessibilityLabel={`${label}, ${kindLabel}, ${host}`}
        accessibilityState={{ selected: current, busy: removing, disabled: locked }}
        accessibilityActions={[{ name: "remove", label: t("switcher.remove") }]}
        onAccessibilityAction={(event) => {
          if (event.nativeEvent.actionName === "remove") remove();
        }}
        disabled={locked}
        onPress={() => onSelect(host)}
        className={cn(
          "flex-row items-center gap-4 bg-background px-5 py-4",
          !first && "border-t border-border",
          current && "bg-muted"
        )}
      >
        <View
          testID={`switcher-initial-${host}`}
          className="h-12 w-12 items-center justify-center rounded-xl"
          style={{ backgroundColor: brandColor }}
        >
          <Text className="text-xl font-semibold text-white">{initial}</Text>
        </View>
        <View className="flex-1 gap-1">
          <Text numberOfLines={1} className="text-base font-semibold text-foreground">
            {label}
          </Text>
          <View className="flex-row items-center gap-2">
            <View
              testID={`switcher-kind-${host}`}
              className={cn(
                "rounded-md px-2 py-0.5",
                kind === "cloud" ? "bg-primary/10" : "bg-amber-100"
              )}
            >
              <Text
                className={cn(
                  "text-xs font-semibold",
                  kind === "cloud" ? "text-primary" : "text-amber-800"
                )}
              >
                {kindLabel}
              </Text>
            </View>
            <Text numberOfLines={1} className="flex-shrink text-sm text-muted-foreground">
              {host}
            </Text>
          </View>
        </View>
        {removing ? (
          <ActivityIndicator testID={`switcher-removing-${host}`} />
        ) : current ? (
          <View testID={`switcher-current-${host}`}>
            <Check size={22} color={colors.accent} />
          </View>
        ) : null}
      </Pressable>
    </ReanimatedSwipeable>
  );
}
