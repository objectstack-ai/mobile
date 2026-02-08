import React, { useRef } from "react";
import { View, Text, Pressable, Animated } from "react-native";
import { Swipeable } from "react-native-gesture-handler";
import { Edit, Trash2 } from "lucide-react-native";

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

export interface SwipeableRowProps {
  /** Content rendered inside the swipeable row */
  children: React.ReactNode;
  /** Called when the Edit action is tapped */
  onEdit?: () => void;
  /** Called when the Delete action is tapped */
  onDelete?: () => void;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const ACTION_WIDTH = 80;

/* ------------------------------------------------------------------ */
/*  SwipeableRow                                                       */
/* ------------------------------------------------------------------ */

/**
 * Wraps children in a swipeable container that reveals Edit and Delete
 * action buttons on left-swipe.
 *
 * Actions are only rendered when at least one callback is provided.
 *
 * Usage:
 * ```tsx
 * <SwipeableRow onEdit={() => edit(id)} onDelete={() => remove(id)}>
 *   <MyListItem />
 * </SwipeableRow>
 * ```
 */
export function SwipeableRow({
  children,
  onEdit,
  onDelete,
}: SwipeableRowProps) {
  const swipeableRef = useRef<Swipeable>(null);

  const hasActions = !!(onEdit || onDelete);

  /* ---- Close helper ---- */
  const close = () => swipeableRef.current?.close();

  /* ---- Right actions ---- */
  const renderRightActions = (
    _progress: Animated.AnimatedInterpolation<number>,
    dragX: Animated.AnimatedInterpolation<number>,
  ) => {
    const actionCount = (onEdit ? 1 : 0) + (onDelete ? 1 : 0);
    const totalWidth = actionCount * ACTION_WIDTH;

    const translateX = dragX.interpolate({
      inputRange: [-totalWidth, 0],
      outputRange: [0, totalWidth],
      extrapolate: "clamp",
    });

    return (
      <Animated.View
        style={{ flexDirection: "row", transform: [{ translateX }] }}
      >
        {onEdit && (
          <Pressable
            onPress={() => {
              close();
              onEdit();
            }}
            className="items-center justify-center bg-blue-600"
            style={{ width: ACTION_WIDTH }}
          >
            <Edit size={20} color="#ffffff" />
            <Text className="mt-1 text-xs font-medium text-white">Edit</Text>
          </Pressable>
        )}

        {onDelete && (
          <Pressable
            onPress={() => {
              close();
              onDelete();
            }}
            className="items-center justify-center bg-red-600"
            style={{ width: ACTION_WIDTH }}
          >
            <Trash2 size={20} color="#ffffff" />
            <Text className="mt-1 text-xs font-medium text-white">Delete</Text>
          </Pressable>
        )}
      </Animated.View>
    );
  };

  /* ---- Render ---- */
  if (!hasActions) {
    return <View>{children}</View>;
  }

  return (
    <Swipeable
      ref={swipeableRef}
      friction={2}
      rightThreshold={40}
      renderRightActions={renderRightActions}
      overshootRight={false}
    >
      {children}
    </Swipeable>
  );
}
