import { View, ActivityIndicator } from "react-native";

/**
 * Initial route — a no-fetch splash shown while the app hydrates the persisted
 * server URL and re-targets its clients. The root layout's protected-route
 * guard redirects away from here (to server-config / sign-in / tabs) once
 * `isReady`, so the data screens never mount against the pre-hydration default
 * host. Keeping a real route here (rather than swapping the whole navigator for
 * a bare splash View) means a navigator is always mounted — without it,
 * navigation hooks throw "Couldn't find a navigation context" during the async
 * hydration window on native.
 */
export default function Index() {
  return (
    <View className="flex-1 items-center justify-center bg-background">
      <ActivityIndicator size="large" />
    </View>
  );
}
