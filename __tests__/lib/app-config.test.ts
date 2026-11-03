/**
 * The native permission texts `app.config.ts` writes: every shell language
 * gets its own camera and photo-library prompt, and the image picker adds no
 * microphone.
 */
import appConfig from "~/app.config";
import en from "~/locales/en.json";
import zh from "~/locales/zh.json";

type Plugin = string | [string, Record<string, unknown>];

const config = appConfig({ config: {} } as never);

describe("app.config permissions", () => {
  it("writes the camera and photo-library prompts for every shell language", () => {
    const locales = config.locales as Record<string, { ios: Record<string, string> }>;
    expect(Object.keys(locales).sort()).toEqual(
      ["ar", "de", "en", "es", "fr", "ja", "ko", "pt", "ru", "zh-Hans", "zh-Hant"].sort()
    );
    for (const [lproj, { ios }] of Object.entries(locales)) {
      expect(ios.NSCameraUsageDescription).toEqual(expect.any(String));
      expect(ios.NSPhotoLibraryUsageDescription).toEqual(expect.any(String));
      if (lproj !== "en") expect(ios.NSPhotoLibraryUsageDescription).not.toBe(en.permissions.photos);
    }
    expect(locales["zh-Hant"].ios).toEqual({
      NSCameraUsageDescription: zh.permissions.camera,
      NSPhotoLibraryUsageDescription: zh.permissions.photos,
    });
  });

  it("configures the image picker for photos only, with the same camera text as the scanner", () => {
    const plugins = config.plugins as Plugin[];
    const options = (name: string) =>
      (plugins.find((p) => Array.isArray(p) && p[0] === name) as [string, Record<string, unknown>])[1];
    expect(options("expo-image-picker")).toEqual({
      cameraPermission: en.permissions.camera,
      photosPermission: en.permissions.photos,
      microphonePermission: false,
    });
    expect(options("expo-camera").cameraPermission).toBe(en.permissions.camera);
  });
});
