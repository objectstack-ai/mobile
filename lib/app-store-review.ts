/**
 * App Store review preparation — checklist and configuration validation
 * for Apple App Store and Google Play Store submission.
 *
 * This module defines a structured review checklist and provides a
 * validator that inspects the Expo app config (app.json / app.config.ts)
 * to flag missing or misconfigured fields before submission.
 */

/** A single review checklist item */
export interface ReviewCheckItem {
  /** Unique identifier */
  id: string;
  /** Human-readable description */
  description: string;
  /** Which store(s) this check applies to */
  platform: "ios" | "android" | "both";
  /** Category of the check */
  category: "metadata" | "assets" | "privacy" | "configuration" | "compliance";
  /** Whether this item has been satisfied */
  passed: boolean;
  /** Additional detail when the check fails */
  detail?: string;
}

/** App config shape (subset of Expo app.json) */
export interface AppConfig {
  name?: string;
  slug?: string;
  version?: string;
  orientation?: string;
  icon?: string;
  scheme?: string;
  splash?: {
    image?: string;
    resizeMode?: string;
    backgroundColor?: string;
  };
  ios?: {
    supportsTablet?: boolean;
    bundleIdentifier?: string;
    buildNumber?: string;
    infoPlist?: Record<string, unknown>;
  };
  android?: {
    package?: string;
    versionCode?: number;
    adaptiveIcon?: {
      foregroundImage?: string;
      backgroundColor?: string;
    };
    permissions?: string[];
  };
  plugins?: string[];
}

/** Aggregate review report */
export interface ReviewReport {
  checks: ReviewCheckItem[];
  passedCount: number;
  failedCount: number;
  readiness: number; // 0–100
  generatedAt: string;
}

/**
 * Validate the app config against App Store / Google Play requirements
 * and return a structured review report.
 */
export function validateAppStoreReadiness(config: AppConfig): ReviewReport {
  const checks: ReviewCheckItem[] = [
    // ---- Metadata ----
    {
      id: "app-name",
      description: "App name is set",
      platform: "both",
      category: "metadata",
      passed: Boolean(config.name && config.name.length > 0),
      detail: config.name ? undefined : "Set a display name in app.json.",
    },
    {
      id: "app-version",
      description: "App version is set",
      platform: "both",
      category: "metadata",
      passed: Boolean(config.version),
      detail: config.version
        ? undefined
        : "Set a semantic version string in app.json.",
    },
    {
      id: "app-slug",
      description: "App slug is set",
      platform: "both",
      category: "metadata",
      passed: Boolean(config.slug),
      detail: config.slug
        ? undefined
        : "Set a unique slug for OTA and EAS.",
    },
    {
      id: "url-scheme",
      description: "Deep link URL scheme is configured",
      platform: "both",
      category: "configuration",
      passed: Boolean(config.scheme),
      detail: config.scheme
        ? undefined
        : "Configure a custom URL scheme for deep linking.",
    },

    // ---- Assets ----
    {
      id: "app-icon",
      description: "App icon asset is configured",
      platform: "both",
      category: "assets",
      passed: Boolean(config.icon),
      detail: config.icon
        ? undefined
        : "Provide a 1024×1024 app icon in app.json.",
    },
    {
      id: "splash-screen",
      description: "Splash screen is configured",
      platform: "both",
      category: "assets",
      passed: Boolean(config.splash?.image),
      detail: config.splash?.image
        ? undefined
        : "Provide a splash screen image.",
    },
    {
      id: "android-adaptive-icon",
      description: "Android adaptive icon is configured",
      platform: "android",
      category: "assets",
      passed: Boolean(config.android?.adaptiveIcon?.foregroundImage),
      detail: config.android?.adaptiveIcon?.foregroundImage
        ? undefined
        : "Provide an adaptive icon foreground image for Android.",
    },

    // ---- iOS specific ----
    {
      id: "ios-bundle-id",
      description: "iOS bundle identifier is set",
      platform: "ios",
      category: "configuration",
      passed: Boolean(config.ios?.bundleIdentifier),
      detail: config.ios?.bundleIdentifier
        ? undefined
        : "Set ios.bundleIdentifier (e.g. com.objectstack.mobile).",
    },
    {
      id: "ios-build-number",
      description: "iOS build number is set",
      platform: "ios",
      category: "configuration",
      passed: Boolean(config.ios?.buildNumber),
      detail: config.ios?.buildNumber
        ? undefined
        : "Set ios.buildNumber for App Store submission.",
    },

    // ---- Android specific ----
    {
      id: "android-package",
      description: "Android package name is set",
      platform: "android",
      category: "configuration",
      passed: Boolean(config.android?.package),
      detail: config.android?.package
        ? undefined
        : "Set android.package (e.g. com.objectstack.mobile).",
    },
    {
      id: "android-version-code",
      description: "Android versionCode is set",
      platform: "android",
      category: "configuration",
      passed: Boolean(
        config.android?.versionCode && config.android.versionCode > 0,
      ),
      detail: config.android?.versionCode
        ? undefined
        : "Set android.versionCode (integer) for Play Store submission.",
    },

    // ---- Privacy ----
    {
      id: "orientation",
      description: "Screen orientation is specified",
      platform: "both",
      category: "configuration",
      passed: Boolean(config.orientation),
      detail: config.orientation
        ? undefined
        : "Set orientation to 'portrait', 'landscape', or 'default'.",
    },
  ];

  const passedCount = checks.filter((c) => c.passed).length;
  const failedCount = checks.length - passedCount;
  const readiness =
    checks.length > 0 ? Math.round((passedCount / checks.length) * 100) : 100;

  return {
    checks,
    passedCount,
    failedCount,
    readiness,
    generatedAt: new Date().toISOString(),
  };
}
