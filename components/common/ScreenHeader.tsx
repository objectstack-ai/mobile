import React from "react";
import { View, Text, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ChevronLeft } from "lucide-react-native";
import { useRouter } from "expo-router";

export interface ScreenHeaderProps {
  /** Primary title shown in the bar. */
  title: string;
  /** Optional secondary line under the title (e.g. parent app / record count). */
  subtitle?: string;
  /**
   * Where to go when there's nothing on the navigation stack to pop back to
   * (e.g. the app home, which is the root of the (app) stack). Defaults to the
   * Apps tab so the user is never stranded.
   */
  backFallback?: string;
  /** Hide the back affordance entirely (rare — only for true roots). */
  hideBack?: boolean;
  /** Optional action(s) pinned to the right (e.g. a create "+" button). */
  right?: React.ReactNode;
  /** Override the default back behaviour. */
  onBack?: () => void;
}

/**
 * A cross-platform top app bar with a back button, title, and optional right
 * actions.
 *
 * Why this exists: react-navigation's native-stack header does NOT render on
 * React Native Web (it produces no header element at all), and the (app) stack
 * root has no native back button even on device. Relying on the stack header
 * therefore left every drill-down screen with no title and no way back. This
 * in-screen header renders identically on web and native and guarantees a back
 * affordance everywhere.
 */
export function ScreenHeader({
  title,
  subtitle,
  backFallback = "/(tabs)/apps",
  hideBack = false,
  right,
  onBack,
}: ScreenHeaderProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const handleBack = () => {
    if (onBack) {
      onBack();
      return;
    }
    if (router.canGoBack()) {
      router.back();
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      router.replace(backFallback as any);
    }
  };

  return (
    <View
      style={{ paddingTop: insets.top }}
      className="border-b border-border bg-background"
    >
      <View className="h-14 flex-row items-center px-1">
        {hideBack ? (
          <View className="w-11" />
        ) : (
          <Pressable
            onPress={handleBack}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            className="h-11 w-11 items-center justify-center rounded-full active:bg-muted"
          >
            <ChevronLeft size={26} color="#1e40af" />
          </Pressable>
        )}

        <View className="flex-1 px-1">
          <Text
            className="text-[17px] font-bold text-foreground"
            numberOfLines={1}
          >
            {title}
          </Text>
          {subtitle ? (
            <Text className="text-xs text-muted-foreground" numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>

        {right ? (
          <View className="flex-row items-center pr-1">{right}</View>
        ) : (
          <View className="w-2" />
        )}
      </View>
    </View>
  );
}
