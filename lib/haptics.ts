import * as Haptics from "expo-haptics";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

export type HapticPattern =
  | "light"
  | "medium"
  | "heavy"
  | "success"
  | "warning"
  | "error"
  | "selection";

/* ------------------------------------------------------------------ */
/*  Public API                                                          */
/* ------------------------------------------------------------------ */

/**
 * Trigger a haptic feedback pattern.
 *
 * Maps semantic pattern names to `expo-haptics` calls:
 * - light / medium / heavy → `impactAsync`
 * - success / warning / error → `notificationAsync`
 * - selection → `selectionAsync`
 */
export async function triggerHaptic(pattern: HapticPattern): Promise<void> {
  switch (pattern) {
    case "light":
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      break;
    case "medium":
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      break;
    case "heavy":
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      break;
    case "success":
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      break;
    case "warning":
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      break;
    case "error":
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      break;
    case "selection":
      await Haptics.selectionAsync();
      break;
  }
}
