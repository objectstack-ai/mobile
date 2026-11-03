import { ExpoConfig, ConfigContext } from "expo/config";
import ar from "./locales/ar.json";
import de from "./locales/de.json";
import en from "./locales/en.json";
import es from "./locales/es.json";
import fr from "./locales/fr.json";
import ja from "./locales/ja.json";
import ko from "./locales/ko.json";
import pt from "./locales/pt.json";
import ru from "./locales/ru.json";
import zh from "./locales/zh.json";

// System permission prompts, localized from the app's own bundles (keys
// `permissions.camera` and `permissions.photos`) so one file holds each
// language's copy. iOS reads them
// from `<lproj>/InfoPlist.strings`; Android's camera prompt is the system's own
// text. Keys are iOS localization names, written verbatim as `<key>.lproj`:
// one per shell language (lib/i18n.ts). `zh` is Simplified Chinese, so it is
// `zh-Hans`; Traditional Chinese (`zh-Hant`) gets the same `zh` copy, because
// the shell resolves `zh-TW`/`zh-HK` to `zh` as the Console does. `pt` and `es`
// stay unqualified so every regional variant falls back to them.
const PERMISSION_LOCALES: Record<string, { permissions: { camera: string; photos: string } }> = {
  en,
  "zh-Hans": zh,
  "zh-Hant": zh,
  ja,
  ko,
  de,
  fr,
  es,
  pt,
  ru,
  ar,
};

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
  locales: Object.fromEntries(
    Object.entries(PERMISSION_LOCALES).map(([lproj, bundle]) => [
      lproj,
      {
        ios: {
          NSCameraUsageDescription: bundle.permissions.camera,
          NSPhotoLibraryUsageDescription: bundle.permissions.photos,
        },
      },
    ])
  ),
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
      // The QR scanners (screen 6, the bridge's scan()). Camera only: no
      // recording, so no microphone prompt and no RECORD_AUDIO permission.
      "expo-camera",
      {
        cameraPermission: en.permissions.camera,
        microphonePermission: false,
        recordAudioAndroid: false,
      },
    ],
    [
      // The bridge's pickImage(). The camera text is the same as expo-camera's
      // above: both plugins write NSCameraUsageDescription. Photos only, so no
      // microphone prompt and RECORD_AUDIO is blocked. The library itself
      // needs no permission (system photo picker); iOS still requires the
      // photo-library text for the module's API.
      "expo-image-picker",
      {
        cameraPermission: en.permissions.camera,
        photosPermission: en.permissions.photos,
        microphonePermission: false,
      },
    ],
    // Cookie manager (removing a connection clears that host's cookies,
    // lib/connections/cookies.ts). Autolinking links the TurboModule; the
    // plugin only pins `androidx.webkit` when given `androidWebkitVersion`,
    // and the module's default (1.16.0) covers `GET_COOKIE_INFO` (>= 1.6.0).
    "@preeternal/react-native-cookie-manager",
    // MDM managed configuration (docs/DEPLOYMENT.md, "MDM"): the local module
    // in modules/managed-config/ is autolinked; its plugin declares the Android
    // restrictions schema (res/xml/app_restrictions.xml) for EMM consoles.
    "./modules/managed-config/app.plugin.js",
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
