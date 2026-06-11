import React from "react";
import { TouchableOpacity, View, Text } from "react-native";
import * as Haptics from "expo-haptics";

export interface FABAction {
  id: string;
  label: string;
  icon?: string;
  onPress: () => void;
}

export interface FloatingActionButtonProps {
  actions?: FABAction[];
  onPress?: () => void;
  testID?: string;
}

export function FloatingActionButton({
  actions,
  onPress,
  testID = "fab",
}: FloatingActionButtonProps) {
  const [expanded, setExpanded] = React.useState(false);

  const handlePress = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (actions && actions.length > 0) {
      setExpanded((prev) => !prev);
    } else if (onPress) {
      onPress();
    }
  };

  return (
    <View testID={testID} className="absolute bottom-6 end-6 items-end">
      {/* Expanded action items */}
      {expanded && actions && actions.map((action) => (
        <TouchableOpacity
          key={action.id}
          testID={`${testID}-action-${action.id}`}
          onPress={() => {
            void Haptics.selectionAsync();
            action.onPress();
            setExpanded(false);
          }}
          accessibilityLabel={action.label}
          accessibilityRole="button"
          className="mb-2 flex-row items-center rounded-full bg-card px-4 py-2 shadow active:opacity-80"
        >
          <Text className="text-sm text-foreground">{action.label}</Text>
        </TouchableOpacity>
      ))}

      {/* Primary FAB button */}
      <TouchableOpacity
        testID={`${testID}-button`}
        onPress={handlePress}
        accessibilityLabel={expanded ? "Close actions" : "Open actions"}
        accessibilityRole="button"
        className="h-14 w-14 items-center justify-center rounded-full bg-primary shadow-lg"
      >
        <Text className="text-2xl text-primary-foreground">{expanded ? "×" : "+"}</Text>
      </TouchableOpacity>
    </View>
  );
}
