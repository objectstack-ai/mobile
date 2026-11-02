import { ExpoConfig, ConfigContext } from "expo/config";

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "ObjectOS",
  slug: "objectos-mobile",
  version: "2.0.0",
  orientation: "portrait",
  icon: "./assets/icon.png",
  scheme: process.env.EXPO_PUBLIC_APP_SCHEME ?? "objectos",
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
    bundleIdentifier: "ai.objectos.mobile",
  },
  android: {
    adaptiveIcon: {
      foregroundImage: "./assets/adaptive-icon.png",
      backgroundColor: "#ffffff",
    },
    // SDK 55 removed `edgeToEdgeEnabled` — edge-to-edge is always on now.
    package: "ai.objectos.mobile",
  },
  web: {
    favicon: "./assets/favicon.png",
    bundler: "metro",
  },
  plugins: [
    "expo-router",
    "expo-web-browser",
    [
      "@sentry/react-native/expo",
      {
        organization: process.env.SENTRY_ORG ?? "objectstack",
        project: process.env.SENTRY_PROJECT ?? "mobile",
      },
    ],
  ],
  extra: {
    // Pre-filled on the server picker (white-label builds point it at their host).
    defaultServerUrl: process.env.EXPO_PUBLIC_DEFAULT_SERVER_URL ?? "",
    // Comma-separated hosts that may load inside the WebView besides the
    // configured server — typically the SSO identity provider.
    trustedHosts: process.env.EXPO_PUBLIC_TRUSTED_HOSTS ?? "",
    sentryDsn: process.env.EXPO_PUBLIC_SENTRY_DSN ?? "",
  },
});
