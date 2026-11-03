/**
 * Files between the Console and the OS, for the bridge's `pickImage`, `share`
 * and `openFile` (docs/HYBRID-SHELL.md, "Files").
 *
 * The shell holds no credential and makes no request here: `openFile` gets the
 * bytes from the Console, which fetched them with its own session, and only
 * writes them to the app's cache to hand them to the OS. Nothing in this module
 * reads a cookie, calls the platform API or downloads a URL.
 *
 * The bridge handler has already checked every argument and the size limit;
 * the handler also checks the size of the image this module resolves.
 */
import { Platform, Share } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { ImageManipulator, SaveFormat, type ImageRef } from "expo-image-manipulator";
import { Directory, File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import * as IntentLauncher from "expo-intent-launcher";
import { isSafeFileName } from "./bridge/handler";
import type { BridgeFile, PickImageOptions, ShareContent } from "./bridge/protocol";

export const PICKER_BUSY_MESSAGE = "A picker is already open";
export const CAMERA_DENIED_MESSAGE = "Camera permission denied";
export const FILE_BUSY_MESSAGE = "A file is already open";

/** The folder under the app's cache that holds the file handed to the OS. */
export const HANDOFF_DIRECTORY = "bridge-files";

/** `Intent.FLAG_GRANT_READ_URI_PERMISSION`: the viewer may read the content URI. */
const FLAG_GRANT_READ_URI_PERMISSION = 1;

let picking = false;
let opening = false;

/** The picked image's name with a `.jpg` extension, the format it is saved in. */
export function jpegName(fileName: string | null | undefined, camera: boolean): string {
  const base = (fileName ?? "").replace(/\.[^.]*$/, "");
  const name = `${base || (camera ? "photo" : "image")}.jpg`;
  return isSafeFileName(name) ? name : "image.jpg";
}

function release(ref: { release?: () => void } | null): void {
  try {
    ref?.release?.();
  } catch {
    // Already released; nothing holds it.
  }
}

/**
 * Take a photo (`camera`) or choose one from the library, downscale it to
 * `maxWidth` and save it as JPEG at `quality`. Resolves `null` when the user
 * cancels. One picker at a time.
 *
 * The library needs no permission: the system picker (iOS PHPicker, the
 * Android photo picker) hands over only what the user chose. The camera asks
 * for its permission first.
 */
export async function pickImage(options: PickImageOptions): Promise<BridgeFile | null> {
  if (picking) throw new Error(PICKER_BUSY_MESSAGE);
  picking = true;
  try {
    if (options.camera) {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) throw new Error(CAMERA_DENIED_MESSAGE);
    }
    const pickerOptions: ImagePicker.ImagePickerOptions = {
      mediaTypes: ["images"],
      allowsMultipleSelection: false,
      base64: false,
      exif: false,
      quality: 1,
    };
    const result = options.camera
      ? await ImagePicker.launchCameraAsync(pickerOptions)
      : await ImagePicker.launchImageLibraryAsync(pickerOptions);
    if (result.canceled || !result.assets || result.assets.length === 0) return null;
    const asset = result.assets[0];

    const context = ImageManipulator.manipulate(asset.uri);
    let image: ImageRef | null = null;
    try {
      // The picker can report a width of 0; the rendered image always has one.
      let width = asset.width;
      if (!(width > 0)) {
        image = await context.renderAsync();
        width = image.width;
      }
      if (width > options.maxWidth) {
        release(image);
        context.resize({ width: options.maxWidth });
        image = await context.renderAsync();
      } else if (image === null) {
        image = await context.renderAsync();
      }
      const saved = await image.saveAsync({
        base64: true,
        compress: options.quality,
        format: SaveFormat.JPEG,
      });
      try {
        new File(saved.uri).delete();
      } catch {
        // The cache copy is the OS's to purge.
      }
      if (typeof saved.base64 !== "string") throw new Error("The image could not be encoded");
      return {
        base64: saved.base64,
        name: jpegName(asset.fileName, options.camera),
        mime: "image/jpeg",
      };
    } finally {
      release(image);
      release(context);
    }
  } finally {
    picking = false;
  }
}

/**
 * The OS share sheet with a link and/or a text. iOS shares the link as a URL
 * beside the text; Android's share intent carries one text, so the link goes
 * on its own line after it.
 */
export async function shareContent({ url, text }: ShareContent): Promise<void> {
  if (Platform.OS === "ios") {
    await Share.share(url !== undefined ? { url, message: text } : { message: text ?? "" });
    return;
  }
  await Share.share({ message: [text, url].filter((part) => part !== undefined).join("\n") });
}

/**
 * Hand a file the Console sent to the OS: written to the app's cache, then
 * opened in the app that views its type (Android `ACTION_VIEW`), else offered
 * in the share sheet, which previews it and offers apps that open it (iOS
 * always). One file at a time; writing the next one removes the last.
 */
export async function openFileBytes(file: BridgeFile): Promise<void> {
  if (opening) throw new Error(FILE_BUSY_MESSAGE);
  opening = true;
  try {
    const directory = new Directory(Paths.cache, HANDOFF_DIRECTORY);
    if (directory.exists) directory.delete();
    directory.create({ intermediates: true, idempotent: true });
    const target = new File(directory, file.name);
    target.create();
    target.write(file.base64, { encoding: "base64" });

    if (Platform.OS === "android") {
      try {
        await IntentLauncher.startActivityAsync("android.intent.action.VIEW", {
          data: target.contentUri,
          type: file.mime,
          flags: FLAG_GRANT_READ_URI_PERMISSION,
        });
        return;
      } catch {
        // No app views this type: the share sheet still offers what takes it.
      }
    }
    await Sharing.shareAsync(target.uri, { mimeType: file.mime, dialogTitle: file.name });
  } finally {
    opening = false;
  }
}
