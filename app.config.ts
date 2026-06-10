import { ExpoConfig, ConfigContext } from "expo/config";

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "ObjectStack Mobile",
  slug: "objectstack-mobile",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/icon.png",
  scheme: process.env.EXPO_PUBLIC_APP_SCHEME ?? "objectstack",
  userInterfaceStyle: "automatic",
  // SDK 55 dropped legacy architecture — New Architecture is always on, so the
  // `newArchEnabled` flag was removed from ExpoConfig.
  splash: {
    image: "./assets/splash-icon.png",
    resizeMode: "contain",
    backgroundColor: "#ffffff",
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: "com.objectstack.mobile",
  },
  android: {
    adaptiveIcon: {
      foregroundImage: "./assets/adaptive-icon.png",
      backgroundColor: "#ffffff",
    },
    // SDK 55 removed `edgeToEdgeEnabled` — edge-to-edge is always on now.
    package: "com.objectstack.mobile",
  },
  web: {
    favicon: "./assets/favicon.png",
    bundler: "metro",
  },
  plugins: [
    "expo-router",
    [
      "@sentry/react-native/expo",
      {
        organization: process.env.SENTRY_ORG ?? "objectstack",
        project: process.env.SENTRY_PROJECT ?? "mobile",
      },
    ],
  ],
  extra: {
    apiUrl: process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3100",
    sentryDsn: process.env.EXPO_PUBLIC_SENTRY_DSN ?? "",
  },
});
