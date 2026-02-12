import React from "react";
import { View, Text, TouchableOpacity } from "react-native";

export interface UndoSnackbarProps {
  message: string;
  onUndo: () => void;
  duration?: number;
  visible: boolean;
  testID?: string;
}

export function UndoSnackbar({
  message,
  onUndo,
  duration = 5000,
  visible,
  testID = "undo-snackbar",
}: UndoSnackbarProps) {
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const [show, setShow] = React.useState(visible);

  React.useEffect(() => {
    if (visible) {
      setShow(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        setShow(false);
      }, duration);
    } else {
      setShow(false);
      if (timerRef.current) clearTimeout(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [visible, duration]);

  if (!show) return null;

  return (
    <View
      testID={testID}
      accessibilityLabel={message}
      accessibilityRole="alert"
      className="absolute bottom-8 left-4 right-4 flex-row items-center justify-between rounded-lg bg-foreground px-4 py-3 shadow-lg"
    >
      <Text testID={`${testID}-message`} className="flex-1 text-sm text-background">
        {message}
      </Text>
      <TouchableOpacity
        testID={`${testID}-undo`}
        onPress={onUndo}
        accessibilityLabel="Undo"
        accessibilityRole="button"
      >
        <Text className="ml-3 text-sm font-bold text-primary">Undo</Text>
      </TouchableOpacity>
    </View>
  );
}
