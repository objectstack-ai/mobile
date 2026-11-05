import { ExpoConfig, ConfigContext } from "expo/config";
import ar from "./locales/ar.json";
import de from "./locales/de.json";
import en from "./locales/en.json";
import es from "./locales/es.json";
import fr from "./locales/fr.json";
import ja from "./locales/ja.json";
import ko from "./locales/ko.json";
import ptBR from "./locales/pt-BR.json";
import ru from "./locales/ru.json";
import zhHans from "./locales/zh-Hans.json";
import zhHant from "./locales/zh-Hant.json";

// System permission prompts, localized from the app's own bundles (keys
// `permissions.camera`, `permissions.photos` and `permissions.faceId`) so one
// file holds each language's copy. iOS reads them
// from `<lproj>/InfoPlist.strings`; Android's camera prompt is the system's own
// text. Keys are iOS localization names, written verbatim as `<key>.lproj`:
// one per shell language (lib/i18n.ts), each with its own bundle's text —
// Simplified Chinese is `zh-Hans` and Traditional Chinese is `zh-Hant`. The
// Portuguese bundle is `pt-BR`, written as the unqualified `pt` so every
// Portuguese variant falls back to it, as the shell's own `pt-*` → `pt-BR`
// rule does; `es` stays unqualified for the same reason.
const PERMISSION_LOCALES: Record<
  string,
  { permissions: { camera: string; photos: string; faceId: string } }
> = {
  en,
  "zh-Hans": zhHans,
  "zh-Hant": zhHant,
  es,
  ar,
  fr,
  pt: ptBR,
  ru,
  de,
  ja,
  ko,
};

// The EAS project this app builds and publishes under: `@objectstack/objectos`.
// `owner`, `slug` and this ID must name the same project, and neither the slug
// nor the ID can change without moving to a new EAS project.
const EAS_PROJECT_ID = "40edd17e-752e-4062-a404-5eb8892ce47f";

const APP_ID = "ai.objectos.mobile";

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "ObjectOS",
  owner: "objectstack",
  slug: "objectos",
  version: "2.0.0",
  // An over-the-air update only reaches a binary with the same native modules:
  // the fingerprint changes whenever the native side does.
  runtimeVersion: { policy: "fingerprint" },
  updates: { url: `https://u.expo.dev/${EAS_PROJECT_ID}` },
  orientation: "portrait",
  icon: "./assets/icon.png",
  // App links, and the sign-in hand-off's callback (HANDOFF_APP_SCHEME in
  // lib/shell/system-sign-in.ts), which must be a reverse-domain scheme.
  scheme: [process.env.EXPO_PUBLIC_APP_SCHEME ?? "objectos", APP_ID],
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
          NSFaceIDUsageDescription: bundle.permissions.faceId,
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
    bundleIdentifier: APP_ID,
  },
  android: {
    adaptiveIcon: {
      foregroundImage: "./assets/adaptive-icon.png",
      backgroundColor: "#ffffff",
    },
    // SDK 55 removed `edgeToEdgeEnabled` — edge-to-edge is always on now.
    package: APP_ID,
    // expo-screen-capture (the app lock's FLAG_SECURE) declares these for its
    // screenshot listener, which the shell does not use: the app detects no
    // screenshots, and pickImage() goes through the system photo picker, which
    // needs no media permission. Its READ_EXTERNAL_STORAGE (API 32 and below)
    // is not blocked: expo-image-picker and expo-file-system declare it too.
    blockedPermissions: [
      "android.permission.READ_MEDIA_IMAGES",
      "android.permission.DETECT_SCREEN_CAPTURE",
    ],
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
    // The app lock (lib/app-lock.ts): Face ID needs its usage string; the
    // biometric permissions on Android come from the same plugin.
    [
      "expo-local-authentication",
      { faceIDPermission: en.permissions.faceId },
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
    eas: { projectId: EAS_PROJECT_ID },
  },
});
