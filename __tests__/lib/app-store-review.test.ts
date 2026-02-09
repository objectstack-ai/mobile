/**
 * Tests for lib/app-store-review — App Store / Google Play review preparation
 */
import {
  validateAppStoreReadiness,
  type AppConfig,
} from "~/lib/app-store-review";

describe("validateAppStoreReadiness", () => {
  const completeConfig: AppConfig = {
    name: "ObjectStack Mobile",
    slug: "objectstack-mobile",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    scheme: "objectstack",
    splash: {
      image: "./assets/splash-icon.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff",
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.objectstack.mobile",
      buildNumber: "1",
    },
    android: {
      package: "com.objectstack.mobile",
      versionCode: 1,
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#ffffff",
      },
    },
  };

  it("returns 100% readiness for a complete config", () => {
    const report = validateAppStoreReadiness(completeConfig);

    expect(report.readiness).toBe(100);
    expect(report.failedCount).toBe(0);
    expect(report.passedCount).toBe(report.checks.length);
    expect(report.generatedAt).toBeTruthy();
  });

  it("flags missing app name", () => {
    const report = validateAppStoreReadiness({ ...completeConfig, name: "" });
    const check = report.checks.find((c) => c.id === "app-name")!;

    expect(check.passed).toBe(false);
    expect(check.detail).toBeTruthy();
  });

  it("flags missing version", () => {
    const report = validateAppStoreReadiness({
      ...completeConfig,
      version: undefined,
    });
    const check = report.checks.find((c) => c.id === "app-version")!;

    expect(check.passed).toBe(false);
  });

  it("flags missing app icon", () => {
    const report = validateAppStoreReadiness({
      ...completeConfig,
      icon: undefined,
    });
    const check = report.checks.find((c) => c.id === "app-icon")!;

    expect(check.passed).toBe(false);
    expect(check.detail).toContain("icon");
  });

  it("flags missing splash screen", () => {
    const report = validateAppStoreReadiness({
      ...completeConfig,
      splash: {},
    });
    const check = report.checks.find((c) => c.id === "splash-screen")!;

    expect(check.passed).toBe(false);
  });

  it("flags missing iOS bundle identifier", () => {
    const report = validateAppStoreReadiness({
      ...completeConfig,
      ios: { supportsTablet: true },
    });
    const check = report.checks.find((c) => c.id === "ios-bundle-id")!;

    expect(check.passed).toBe(false);
    expect(check.detail).toContain("bundleIdentifier");
  });

  it("flags missing iOS build number", () => {
    const report = validateAppStoreReadiness({
      ...completeConfig,
      ios: {
        supportsTablet: true,
        bundleIdentifier: "com.test.app",
      },
    });
    const check = report.checks.find((c) => c.id === "ios-build-number")!;

    expect(check.passed).toBe(false);
  });

  it("flags missing Android package name", () => {
    const report = validateAppStoreReadiness({
      ...completeConfig,
      android: {
        versionCode: 1,
        adaptiveIcon: {
          foregroundImage: "./icon.png",
          backgroundColor: "#fff",
        },
      },
    });
    const check = report.checks.find((c) => c.id === "android-package")!;

    expect(check.passed).toBe(false);
    expect(check.detail).toContain("android.package");
  });

  it("flags missing Android versionCode", () => {
    const report = validateAppStoreReadiness({
      ...completeConfig,
      android: {
        package: "com.test.app",
        adaptiveIcon: {
          foregroundImage: "./icon.png",
          backgroundColor: "#fff",
        },
      },
    });
    const check = report.checks.find((c) => c.id === "android-version-code")!;

    expect(check.passed).toBe(false);
  });

  it("flags missing Android adaptive icon", () => {
    const report = validateAppStoreReadiness({
      ...completeConfig,
      android: {
        package: "com.test.app",
        versionCode: 1,
      },
    });
    const check = report.checks.find(
      (c) => c.id === "android-adaptive-icon",
    )!;

    expect(check.passed).toBe(false);
  });

  it("flags missing URL scheme", () => {
    const report = validateAppStoreReadiness({
      ...completeConfig,
      scheme: undefined,
    });
    const check = report.checks.find((c) => c.id === "url-scheme")!;

    expect(check.passed).toBe(false);
    expect(check.detail).toContain("URL scheme");
  });

  it("flags missing orientation", () => {
    const report = validateAppStoreReadiness({
      ...completeConfig,
      orientation: undefined,
    });
    const check = report.checks.find((c) => c.id === "orientation")!;

    expect(check.passed).toBe(false);
  });

  it("returns 0% readiness for an empty config", () => {
    const report = validateAppStoreReadiness({});

    expect(report.readiness).toBeLessThan(50);
    expect(report.failedCount).toBeGreaterThan(0);
  });

  it("each check has required fields", () => {
    const report = validateAppStoreReadiness(completeConfig);

    for (const check of report.checks) {
      expect(check.id).toBeTruthy();
      expect(check.description).toBeTruthy();
      expect(["ios", "android", "both"]).toContain(check.platform);
      expect([
        "metadata",
        "assets",
        "privacy",
        "configuration",
        "compliance",
      ]).toContain(check.category);
      expect(typeof check.passed).toBe("boolean");
    }
  });
});
