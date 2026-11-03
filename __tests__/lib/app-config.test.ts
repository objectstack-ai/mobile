/**
 * The native permission texts `app.config.ts` writes: every shell language
 * gets its own camera, photo-library and Face ID prompt, and the image picker
 * adds no microphone.
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
      expect(ios.NSFaceIDUsageDescription).toEqual(expect.any(String));
      if (lproj !== "en") {
        expect(ios.NSPhotoLibraryUsageDescription).not.toBe(en.permissions.photos);
        expect(ios.NSFaceIDUsageDescription).not.toBe(en.permissions.faceId);
      }
    }
    expect(locales["zh-Hant"].ios).toEqual({
      NSCameraUsageDescription: zh.permissions.camera,
      NSPhotoLibraryUsageDescription: zh.permissions.photos,
      NSFaceIDUsageDescription: zh.permissions.faceId,
    });
  });

  it("gives the app lock its Face ID text, and blocks only the screen-capture module's unused permissions", () => {
    const plugins = config.plugins as Plugin[];
    const auth = plugins.find((p) => Array.isArray(p) && p[0] === "expo-local-authentication");
    expect(auth).toEqual(["expo-local-authentication", { faceIDPermission: en.permissions.faceId }]);
    // READ_EXTERNAL_STORAGE stays: the image picker and the file system module declare it too.
    expect(config.android?.blockedPermissions).toEqual([
      "android.permission.READ_MEDIA_IMAGES",
      "android.permission.DETECT_SCREEN_CAPTURE",
    ]);
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
