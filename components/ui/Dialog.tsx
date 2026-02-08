import React from "react";
import { Modal, Pressable, Text, View } from "react-native";
import { X } from "lucide-react-native";
import { cn } from "~/lib/utils";

export interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children?: React.ReactNode;
  className?: string;
}

export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  className,
}: DialogProps) {
  return (
    <Modal
      visible={open}
      transparent
      animationType="fade"
      onRequestClose={() => onOpenChange(false)}
    >
      <Pressable
        className="flex-1 items-center justify-center bg-black/50"
        onPress={() => onOpenChange(false)}
      >
        <Pressable
          className={cn(
            "w-5/6 rounded-2xl border border-border bg-background p-6",
            className
          )}
        >
          <View className="flex-row items-center justify-between pb-3">
            <Text className="text-lg font-semibold text-foreground">
              {title}
            </Text>
            <Pressable
              onPress={() => onOpenChange(false)}
              className="rounded-full p-1 active:bg-accent"
              hitSlop={8}
            >
              <X size={18} className="text-muted-foreground" />
            </Pressable>
          </View>

          {description ? (
            <Text className="pb-4 text-sm text-muted-foreground">
              {description}
            </Text>
          ) : null}

          {children}
        </Pressable>
      </Pressable>
    </Modal>
  );
}
