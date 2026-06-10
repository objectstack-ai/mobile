import { Platform, type ViewStyle } from "react-native";

/**
 * Reading-column width cap for wide web viewports.
 *
 * On the web the app runs in a full-width browser window, so lists, cards, and
 * chat bubbles stretch edge-to-edge and become hard to scan. Spreading this
 * into a scroll view's `contentContainerStyle` (or a wrapping View's `style`)
 * caps the content column and centers it.
 *
 * It is a deliberate **no-op on native** (and on narrow web, where `maxWidth`
 * simply never binds) — the device viewport is already width-constrained, so
 * this never changes the phone layout.
 */
export const webContentMaxWidth: ViewStyle | undefined =
  Platform.OS === "web"
    ? { width: "100%", maxWidth: 820, alignSelf: "center" }
    : undefined;
