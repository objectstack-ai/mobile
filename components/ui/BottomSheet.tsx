import React from "react";
import { Modal, Pressable, Text, View } from "react-native";
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
  return (
    <Modal
      visible={open}
      transparent
      animationType="slide"
      onRequestClose={() => onOpenChange(false)}
    >
      <Pressable
        className="flex-1 bg-black/50"
        onPress={() => onOpenChange(false)}
      />

      <View
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
      </View>
    </Modal>
  );
}
