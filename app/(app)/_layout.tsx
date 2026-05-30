import { Stack } from "expo-router";

/**
 * Every (app) screen renders its own `ScreenHeader` (back button + title +
 * actions). The native-stack header is disabled because it does not render at
 * all on React Native Web and leaves the stack root with no back button — see
 * components/common/ScreenHeader.tsx.
 */
export default function AppLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
