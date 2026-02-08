import React from "react";
import { Pressable, View } from "react-native";
import { Plus } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { cn } from "~/lib/utils";

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

export interface FloatingActionButtonProps {
  onPress: () => void;
  icon?: React.ReactNode;
  className?: string;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function FloatingActionButton({
  onPress,
  icon,
  className,
}: FloatingActionButtonProps) {
  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onPress();
  };

  return (
    <Pressable
      onPress={handlePress}
      className={cn(
        "absolute bottom-6 right-6 h-14 w-14 items-center justify-center rounded-full bg-primary shadow-lg",
        className,
      )}
    >
      {icon ?? <Plus size={24} color="#fff" />}
    </Pressable>
  );
}
