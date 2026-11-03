/**
 * The bridge's file handoff with the native modules stubbed: the picker and its
 * downscale, the share sheet, and handing the Console's bytes to the OS — which
 * never fetches anything.
 */
import { readFileSync } from "fs";
import { join } from "path";
import { Platform, Share } from "react-native";

const mockPicker = {
  requestCameraPermissionsAsync: jest.fn(),
  launchCameraAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
};
jest.mock("expo-image-picker", () => mockPicker);

const mockManipulator = {
  contexts: [] as any[],
  rendered: [] as any[],
  saved: { uri: "file:///cache/manip/out.jpg", width: 2048, height: 1536, base64: "QUJD" } as any,
};
jest.mock("expo-image-manipulator", () => ({
  SaveFormat: { JPEG: "jpeg", PNG: "png" },
  ImageManipulator: {
    manipulate: jest.fn((uri: string) => {
      const context: any = {
        uri,
        resizes: [] as unknown[],
        released: false,
        resize: jest.fn((size: unknown) => {
          context.resizes.push(size);
          return context;
        }),
        renderAsync: jest.fn(async () => {
          const last = context.resizes[context.resizes.length - 1] as { width: number } | undefined;
          const image: any = {
            width: last ? last.width : 4032,
            released: false,
            saveAsync: jest.fn(async () => mockManipulator.saved),
            release: jest.fn(() => (image.released = true)),
          };
          mockManipulator.rendered.push(image);
          return image;
        }),
        release: jest.fn(() => (context.released = true)),
      };
      mockManipulator.contexts.push(context);
      return context;
    }),
  },
}));

const mockFs = {
  entries: new Map<string, string>(),
  directories: new Set<string>(),
  deletedFiles: [] as string[],
  downloadFileAsync: jest.fn(),
};
jest.mock("expo-file-system", () => {
  const join = (...parts: any[]) =>
    parts.map((p) => (typeof p === "string" ? p : p.uri)).join("/");
  class Directory {
    uri: string;
    constructor(...parts: any[]) {
      this.uri = join(...parts);
    }
    get exists() {
      return mockFs.directories.has(this.uri);
    }
    delete() {
      mockFs.directories.delete(this.uri);
      for (const key of [...mockFs.entries.keys()]) {
        if (key.startsWith(`${this.uri}/`)) mockFs.entries.delete(key);
      }
    }
    create() {
      mockFs.directories.add(this.uri);
    }
  }
  class File {
    uri: string;
    constructor(...parts: any[]) {
      this.uri = join(...parts);
    }
    get contentUri() {
      return this.uri.replace("file:///cache", "content://ai.objectos.mobile.FileSystemFileProvider/cached_expo_files");
    }
    create() {
      mockFs.entries.set(this.uri, "");
    }
    write(content: string, options?: { encoding?: string }) {
      if (options?.encoding !== "base64") throw new Error("expected a base64 write");
      mockFs.entries.set(this.uri, content);
    }
    delete() {
      mockFs.deletedFiles.push(this.uri);
    }
    static downloadFileAsync = mockFs.downloadFileAsync;
  }
  return { Directory, File, Paths: { cache: { uri: "file:///cache" } } };
});

const mockSharing = { shareAsync: jest.fn() };
jest.mock("expo-sharing", () => mockSharing);

const mockIntent = { startActivityAsync: jest.fn() };
jest.mock("expo-intent-launcher", () => mockIntent);

import { PICK_IMAGE_DEFAULTS } from "~/lib/shell/bridge/protocol";

// Required, not imported: an import is hoisted above the stand-ins it reads.
const {
  CAMERA_DENIED_MESSAGE,
  FILE_BUSY_MESSAGE,
  HANDOFF_DIRECTORY,
  PICKER_BUSY_MESSAGE,
  jpegName,
  openFileBytes,
  pickImage,
  shareContent,
} = require("~/lib/shell/file-handoff") as typeof import("~/lib/shell/file-handoff");

const originalOS = Platform.OS;
function onPlatform(os: "ios" | "android") {
  Object.defineProperty(Platform, "OS", { configurable: true, get: () => os });
}

const asset = (over: Record<string, unknown> = {}) => ({
  uri: "file:///cache/ImagePicker/IMG_0001.HEIC",
  width: 4032,
  height: 3024,
  fileName: "IMG_0001.HEIC",
  ...over,
});

beforeEach(() => {
  jest.clearAllMocks();
  mockManipulator.contexts = [];
  mockManipulator.rendered = [];
  mockFs.entries.clear();
  mockFs.directories.clear();
  mockFs.deletedFiles = [];
  mockPicker.requestCameraPermissionsAsync.mockResolvedValue({ granted: true });
  mockPicker.launchImageLibraryAsync.mockResolvedValue({ canceled: false, assets: [asset()] });
  mockPicker.launchCameraAsync.mockResolvedValue({
    canceled: false,
    assets: [asset({ fileName: null })],
  });
  mockSharing.shareAsync.mockResolvedValue(undefined);
  mockIntent.startActivityAsync.mockResolvedValue({ resultCode: 0 });
});

afterEach(() => onPlatform(originalOS as "ios" | "android"));

describe("pickImage", () => {
  it("chooses from the library without asking for any permission, and saves a JPEG", async () => {
    await expect(pickImage(PICK_IMAGE_DEFAULTS)).resolves.toEqual({
      base64: "QUJD",
      name: "IMG_0001.jpg",
      mime: "image/jpeg",
    });
    expect(mockPicker.requestCameraPermissionsAsync).not.toHaveBeenCalled();
    expect(mockPicker.launchCameraAsync).not.toHaveBeenCalled();
    expect(mockPicker.launchImageLibraryAsync).toHaveBeenCalledWith(
      expect.objectContaining({ mediaTypes: ["images"], allowsMultipleSelection: false })
    );
    const [image] = mockManipulator.rendered.slice(-1);
    expect(image.saveAsync).toHaveBeenCalledWith({ base64: true, compress: 0.8, format: "jpeg" });
  });

  it("downscales to maxWidth before the bytes cross the bridge", async () => {
    await pickImage({ camera: false, maxWidth: 1024, quality: 0.5 });
    const [context] = mockManipulator.contexts;
    expect(context.resize).toHaveBeenCalledWith({ width: 1024 });
    const saved = mockManipulator.rendered[mockManipulator.rendered.length - 1];
    expect(saved.width).toBe(1024);
    expect(saved.saveAsync).toHaveBeenCalledWith({ base64: true, compress: 0.5, format: "jpeg" });
  });

  it("never upscales a smaller image", async () => {
    mockPicker.launchImageLibraryAsync.mockResolvedValue({
      canceled: false,
      assets: [asset({ width: 800 })],
    });
    await pickImage(PICK_IMAGE_DEFAULTS);
    expect(mockManipulator.contexts[0].resize).not.toHaveBeenCalled();
  });

  it("measures the rendered image when the picker reports no width", async () => {
    mockPicker.launchImageLibraryAsync.mockResolvedValue({
      canceled: false,
      assets: [asset({ width: 0 })],
    });
    await pickImage(PICK_IMAGE_DEFAULTS);
    expect(mockManipulator.contexts[0].resize).toHaveBeenCalledWith({ width: 2048 });
  });

  it("releases what it rendered and deletes its own cache copy", async () => {
    await pickImage(PICK_IMAGE_DEFAULTS);
    expect(mockManipulator.contexts[0].released).toBe(true);
    expect(mockManipulator.rendered.every((image) => image.released)).toBe(true);
    expect(mockFs.deletedFiles).toEqual(["file:///cache/manip/out.jpg"]);
  });

  it("takes a photo after the camera permission is granted", async () => {
    await expect(pickImage({ ...PICK_IMAGE_DEFAULTS, camera: true })).resolves.toMatchObject({
      name: "photo.jpg",
      mime: "image/jpeg",
    });
    expect(mockPicker.requestCameraPermissionsAsync).toHaveBeenCalled();
    expect(mockPicker.launchCameraAsync).toHaveBeenCalled();
  });

  it("fails when the camera permission is refused, and opens no camera", async () => {
    mockPicker.requestCameraPermissionsAsync.mockResolvedValue({ granted: false });
    await expect(pickImage({ ...PICK_IMAGE_DEFAULTS, camera: true })).rejects.toThrow(
      CAMERA_DENIED_MESSAGE
    );
    expect(mockPicker.launchCameraAsync).not.toHaveBeenCalled();
  });

  it("resolves null when the user cancels", async () => {
    mockPicker.launchImageLibraryAsync.mockResolvedValue({ canceled: true, assets: null });
    await expect(pickImage(PICK_IMAGE_DEFAULTS)).resolves.toBeNull();
    expect(mockManipulator.contexts).toHaveLength(0);
  });

  it("refuses a second picker while one is open, and frees the slot when it settles", async () => {
    let settle: (value: unknown) => void = () => {};
    mockPicker.launchImageLibraryAsync.mockReturnValueOnce(
      new Promise((resolve) => (settle = resolve))
    );
    const first = pickImage(PICK_IMAGE_DEFAULTS);
    await expect(pickImage(PICK_IMAGE_DEFAULTS)).rejects.toThrow(PICKER_BUSY_MESSAGE);
    settle({ canceled: true, assets: null });
    await expect(first).resolves.toBeNull();
    await expect(pickImage(PICK_IMAGE_DEFAULTS)).resolves.not.toBeNull();
  });

  it("fails when the encoder returns no bytes", async () => {
    const saved = mockManipulator.saved;
    mockManipulator.saved = { ...saved, base64: undefined };
    try {
      await expect(pickImage(PICK_IMAGE_DEFAULTS)).rejects.toThrow("could not be encoded");
    } finally {
      mockManipulator.saved = saved;
    }
  });
});

describe("jpegName", () => {
  it.each([
    ["IMG_0001.HEIC", false, "IMG_0001.jpg"],
    ["scan.final.png", false, "scan.final.jpg"],
    [null, true, "photo.jpg"],
    [undefined, false, "image.jpg"],
    [".png", false, "image.jpg"],
    ["a/b.png", false, "image.jpg"],
  ])("%s (camera %s) → %s", (fileName, camera, expected) => {
    expect(jpegName(fileName, camera)).toBe(expected);
  });
});

describe("shareContent", () => {
  beforeEach(() => {
    jest.spyOn(Share, "share").mockResolvedValue({ action: "sharedAction" });
  });

  it("iOS: shares the link as a URL beside the text", async () => {
    onPlatform("ios");
    await shareContent({ url: "https://acme.example.com/r/1", text: "Lead 1" });
    expect(Share.share).toHaveBeenCalledWith({
      url: "https://acme.example.com/r/1",
      message: "Lead 1",
    });
    await shareContent({ text: "Lead 1" });
    expect(Share.share).toHaveBeenLastCalledWith({ message: "Lead 1" });
  });

  it("Android: one text, with the link on its own line", async () => {
    onPlatform("android");
    await shareContent({ url: "https://acme.example.com/r/1", text: "Lead 1" });
    expect(Share.share).toHaveBeenCalledWith({ message: "Lead 1\nhttps://acme.example.com/r/1" });
    await shareContent({ url: "https://acme.example.com/r/1" });
    expect(Share.share).toHaveBeenLastCalledWith({ message: "https://acme.example.com/r/1" });
  });
});

describe("openFileBytes", () => {
  const PDF = { base64: "JVBERi0xLjQK", name: "Quote 42.pdf", mime: "application/pdf" };
  const DIR = `file:///cache/${HANDOFF_DIRECTORY}`;

  it("writes the Console's bytes to the app's cache", async () => {
    onPlatform("ios");
    await openFileBytes(PDF);
    expect(mockFs.entries.get(`${DIR}/Quote 42.pdf`)).toBe(PDF.base64);
  });

  it("iOS: offers the file in the share sheet, which previews it", async () => {
    onPlatform("ios");
    await openFileBytes(PDF);
    expect(mockSharing.shareAsync).toHaveBeenCalledWith(`${DIR}/Quote 42.pdf`, {
      mimeType: "application/pdf",
      dialogTitle: "Quote 42.pdf",
    });
    expect(mockIntent.startActivityAsync).not.toHaveBeenCalled();
  });

  it("Android: opens it in the app that views its type, through a readable content URI", async () => {
    onPlatform("android");
    await openFileBytes(PDF);
    expect(mockIntent.startActivityAsync).toHaveBeenCalledWith("android.intent.action.VIEW", {
      data: "content://ai.objectos.mobile.FileSystemFileProvider/cached_expo_files/bridge-files/Quote 42.pdf",
      type: "application/pdf",
      flags: 1,
    });
    expect(mockSharing.shareAsync).not.toHaveBeenCalled();
  });

  it("Android: falls back to the share sheet when no app views the type", async () => {
    onPlatform("android");
    mockIntent.startActivityAsync.mockRejectedValue(new Error("ActivityNotFoundException"));
    await openFileBytes(PDF);
    expect(mockSharing.shareAsync).toHaveBeenCalledWith(`${DIR}/Quote 42.pdf`, expect.anything());
  });

  it("keeps one file: writing the next removes the last", async () => {
    onPlatform("ios");
    await openFileBytes(PDF);
    await openFileBytes({ base64: "iVBORw==", name: "chart.png", mime: "image/png" });
    expect([...mockFs.entries.keys()]).toEqual([`${DIR}/chart.png`]);
  });

  it("refuses a second file while one is open", async () => {
    onPlatform("ios");
    let settle: () => void = () => {};
    mockSharing.shareAsync.mockReturnValueOnce(new Promise<void>((resolve) => (settle = resolve)));
    const first = openFileBytes(PDF);
    await Promise.resolve();
    await expect(openFileBytes(PDF)).rejects.toThrow(FILE_BUSY_MESSAGE);
    settle();
    await first;
    await expect(openFileBytes(PDF)).resolves.toBeUndefined();
  });

  it("never fetches: no request, no download, on either platform", async () => {
    // The shell holds no credential (docs/HYBRID-SHELL.md, "Session and auth"):
    // the Console fetched the file with its own session and sent the bytes.
    const fetchSpy = jest.fn();
    const xhrSpy = jest.fn();
    const realFetch = global.fetch;
    const realXhr = global.XMLHttpRequest;
    (global as any).fetch = fetchSpy;
    (global as any).XMLHttpRequest = xhrSpy;
    try {
      for (const os of ["ios", "android"] as const) {
        onPlatform(os);
        await openFileBytes(PDF);
      }
    } finally {
      (global as any).fetch = realFetch;
      (global as any).XMLHttpRequest = realXhr;
    }
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(xhrSpy).not.toHaveBeenCalled();
    expect(mockFs.downloadFileAsync).not.toHaveBeenCalled();
  });

  it("has no network or cookie path in its source", () => {
    // A structural pin beside the runtime one: the handoff module imports no
    // network or cookie API and names no download.
    const source = readFileSync(join(__dirname, "../../../lib/shell/file-handoff.ts"), "utf8");
    const code = source.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, "");
    for (const forbidden of [
      /\bfetch\s*\(/,
      /XMLHttpRequest/,
      /downloadFileAsync/,
      /createDownloadResumable/,
      /cookie/i,
      /\/api\//,
    ]) {
      expect(code).not.toMatch(forbidden);
    }
  });
});
