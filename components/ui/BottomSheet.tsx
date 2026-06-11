import React from "react";
import { Modal, Pressable, Text, View } from "react-native";
import Animated, { SlideInDown } from "react-native-reanimated";
import { useTranslation } from "react-i18next";
import { cn } from "~/lib/utils";

export interface BottomSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  children?: React.ReactNode;
  className?: string;
}

export function BottomSheet({
  open,
  onOpenChange,
  title,
  children,
  className,
}: BottomSheetProps) {
  const { t } = useTranslation();
  return (
    // animationType="fade" cross-fades the dimmed backdrop on open/close; the
    // panel additionally springs up from the bottom via reanimated, so it
    // arrives with the soft physical rise top-tier sheets use rather than a
    // flat OS slide.
    <Modal
      visible={open}
      transparent
      animationType="fade"
      onRequestClose={() => onOpenChange(false)}
    >
      <Pressable
        className="flex-1 bg-black/50"
        accessibilityRole="button"
        accessibilityLabel={t("common.close")}
        onPress={() => onOpenChange(false)}
      />

      <Animated.View
        entering={SlideInDown.springify().damping(22).stiffness(220).mass(0.6)}
        className={cn(
          "rounded-t-2xl border-t border-border bg-background pb-8 px-6 pt-4",
          className
        )}
      >
        <View className="mb-3 h-1 w-10 self-center rounded-full bg-muted" />

        {title ? (
          <Text className="pb-4 text-lg font-semibold text-foreground">
            {title}
          </Text>
        ) : null}

        {children}
      </Animated.View>
    </Modal>
  );
}
