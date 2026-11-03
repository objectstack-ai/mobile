/**
 * Native side of the bridge: validates an inbound message, checks it came from
 * the configured server, and dispatches it to the shell's capabilities.
 *
 * The trust list is the configured server's origin and nothing else. A sign-in
 * excursion (`lib/shell/sign-in-excursion.ts`) never adds its origin to it. While
 * an excursion is on screen the bridge is closed altogether.
 *
 * Kept free of React and of native modules — everything platform-specific is
 * injected through `BridgeDeps`, so the policy is unit-testable.
 */
import { originOf, safeConsoleRoute } from "../console-url";
import {
  BRIDGE_EVENTS,
  FILE_TOO_LARGE_MESSAGE,
  HAPTIC_KINDS,
  MAX_FILE_BYTES,
  MAX_SHARE_TEXT_LENGTH,
  PICK_IMAGE_DEFAULTS,
  PICK_IMAGE_MAX_WIDTH,
  SCAN_FORMATS,
  base64ByteLength,
  parseInbound,
  type BridgeErrorCode,
  type BridgeEventName,
  type BridgeFile,
  type BridgeResult,
  type HapticKind,
  type PickImageOptions,
  type PushTokenResult,
  type ScanFormat,
  type ShareContent,
} from "./protocol";

export interface BridgeDeps {
  /** The configured server; only pages on its origin may use the bridge. */
  serverUrl: string;
  getPushToken: () => Promise<PushTokenResult | null>;
  haptic: (kind: HapticKind) => void | Promise<void>;
  openExternal: (url: string) => Promise<void>;
  /** Move to a Console route (the shell applies route ownership). */
  navigate: (route: string) => void;
  /** Forget the server and return to the server picker. */
  resetServer: () => Promise<void>;
  /**
   * Open the native scanner for `formats` (never empty). Resolves the decoded
   * text, or `null` when the user cancels; rejects when the scan cannot run
   * (camera permission refused, another scan already open).
   */
  scan: (formats: readonly ScanFormat[]) => Promise<string | null>;
  /** Open the native connection switcher (screen 8). */
  showConnectionSwitcher: () => void | Promise<void>;
  /**
   * Take a photo or choose one from the library, downscaled to `maxWidth`.
   * Resolves the image, or `null` when the user cancels; rejects when it
   * cannot run (camera permission refused, a picker already open).
   */
  pickImage: (options: PickImageOptions) => Promise<BridgeFile | null>;
  /** Open the OS share sheet with a link and/or a text. */
  share: (content: ShareContent) => Promise<void>;
  /**
   * Preview or open the file with the OS. It gets the bytes, already checked:
   * the Console fetched the file with its own session. The shell holds no
   * credential, so this never fetches anything (docs/HYBRID-SHELL.md, "Files").
   */
  openFile: (file: BridgeFile) => Promise<void>;
  onEvent?: (name: BridgeEventName, payload: unknown) => void;
  /**
   * `true` while a sign-in excursion is on screen. The main frame is then an
   * off-server page, and a reply runs in the main frame, so no call is answered
   * and no event is accepted, whatever origin the message names. On iOS a
   * sub-frame reports its own URL, so a server-origin frame inside the
   * provider's page would otherwise pass the origin check.
   */
  inExcursion?: () => boolean;
}

const EXTERNAL_SCHEMES = /^(https?|mailto|tel|sms):/i;

const SCAN_ARGS_MESSAGE = `scan takes { formats?: string[] } with formats from ${SCAN_FORMATS.join(", ")}`;

/**
 * The formats a `scan` call asks for: every format when it names none, `null`
 * when the arguments are not `{ formats?: ScanFormat[] }` with at least one
 * format. Unknown keys are refused rather than ignored.
 */
function scanFormatsOf(args: unknown): readonly ScanFormat[] | null {
  if (args === undefined || args === null) return SCAN_FORMATS;
  if (typeof args !== "object" || Array.isArray(args)) return null;
  const keys = Object.keys(args);
  if (keys.some((key) => key !== "formats")) return null;
  const formats = (args as { formats?: unknown }).formats;
  if (formats === undefined) return SCAN_FORMATS;
  if (!Array.isArray(formats) || formats.length === 0) return null;
  const known = SCAN_FORMATS as readonly unknown[];
  if (!formats.every((f) => known.includes(f))) return null;
  return SCAN_FORMATS.filter((f) => formats.includes(f));
}

const MIB = 1024 * 1024;

export const PICK_IMAGE_ARGS_MESSAGE = `pickImage takes { camera?: boolean, maxWidth?: integer 1-${PICK_IMAGE_MAX_WIDTH}, quality?: number 0-1 }`;
export const SHARE_ARGS_MESSAGE = `share takes { url?: http(s) URL, text?: string of at most ${MAX_SHARE_TEXT_LENGTH} characters }, with at least one`;
export const OPEN_FILE_ARGS_MESSAGE =
  "openFile takes { base64, name, mime }: base64 bytes, a file name without a path, a MIME type";
export const IMAGE_TOO_LARGE_MESSAGE = `The image is over ${MAX_FILE_BYTES / MIB} MB after downscaling; ask for a smaller maxWidth or quality`;

/** Own keys of a plain object, or `null` when `args` is not one. */
function keysOf(args: unknown): string[] | null {
  if (typeof args !== "object" || args === null || Array.isArray(args)) return null;
  return Object.keys(args);
}

/**
 * The options of a `pickImage` call with defaults applied, or `null` when the
 * arguments are not `{ camera?, maxWidth?, quality? }` with values in range.
 * Unknown keys are refused rather than ignored.
 */
function pickImageOptionsOf(args: unknown): PickImageOptions | null {
  if (args === undefined || args === null) return { ...PICK_IMAGE_DEFAULTS };
  const keys = keysOf(args);
  if (keys === null) return null;
  if (keys.some((key) => key !== "camera" && key !== "maxWidth" && key !== "quality")) return null;
  const { camera, maxWidth, quality } = args as Record<string, unknown>;
  if (camera !== undefined && typeof camera !== "boolean") return null;
  if (
    maxWidth !== undefined &&
    (typeof maxWidth !== "number" ||
      !Number.isInteger(maxWidth) ||
      maxWidth < 1 ||
      maxWidth > PICK_IMAGE_MAX_WIDTH)
  ) {
    return null;
  }
  if (
    quality !== undefined &&
    (typeof quality !== "number" || !Number.isFinite(quality) || quality < 0 || quality > 1)
  ) {
    return null;
  }
  return {
    camera: camera ?? PICK_IMAGE_DEFAULTS.camera,
    maxWidth: maxWidth ?? PICK_IMAGE_DEFAULTS.maxWidth,
    quality: quality ?? PICK_IMAGE_DEFAULTS.quality,
  };
}

/** The content of a `share` call, or `null` when it is not `{ url?, text? }` with one of them. */
function shareContentOf(args: unknown): ShareContent | null {
  const keys = keysOf(args);
  if (keys === null || keys.some((key) => key !== "url" && key !== "text")) return null;
  const { url, text } = args as Record<string, unknown>;
  if (url === undefined && text === undefined) return null;
  if (url !== undefined && (typeof url !== "string" || !isWebUrl(url))) return null;
  if (
    text !== undefined &&
    (typeof text !== "string" || text.length === 0 || text.length > MAX_SHARE_TEXT_LENGTH)
  ) {
    return null;
  }
  const content: ShareContent = {};
  if (url !== undefined) content.url = url as string;
  if (text !== undefined) content.text = text as string;
  return content;
}

function isWebUrl(value: string): boolean {
  if (value.length > 4096 || !/^https?:\/\//i.test(value)) return false;
  try {
    return new URL(value).host.length > 0;
  } catch {
    return false;
  }
}

// A separator of either platform, a C0 control, DEL or a C1 control.
// eslint-disable-next-line no-control-regex
const FILE_NAME_REFUSED_RE = /[/\\\u0000-\u001f\u007f-\u009f]/;

/** A file name with no path in it: what the shell may write in its own folder. */
export function isSafeFileName(name: string): boolean {
  if (name.length === 0 || name.length > 255 || name === "." || name === "..") return false;
  return !FILE_NAME_REFUSED_RE.test(name);
}

const MIME = /^[a-z0-9][a-z0-9!#$&^_.+-]{0,126}\/[a-z0-9][a-z0-9!#$&^_.+-]{0,126}$/i;

/** How an `openFile` call's arguments fail, or the file when they do not. */
function openFileOf(args: unknown): BridgeFile | "bad_args" | "too_large" {
  const keys = keysOf(args);
  if (keys === null || keys.some((key) => key !== "base64" && key !== "name" && key !== "mime")) {
    return "bad_args";
  }
  const { base64, name, mime } = args as Record<string, unknown>;
  if (typeof base64 !== "string" || typeof name !== "string" || typeof mime !== "string") {
    return "bad_args";
  }
  if (!isSafeFileName(name) || !MIME.test(mime)) return "bad_args";
  const size = base64ByteLength(base64);
  if (size === null || size === 0) return "bad_args";
  if (size > MAX_FILE_BYTES) return "too_large";
  return { base64, name, mime: mime.toLowerCase() };
}

function fail(id: string, code: BridgeErrorCode, message: string): BridgeResult {
  return { id, ok: false, error: { code, message } };
}

function argOf(args: unknown, key: string): unknown {
  return typeof args === "object" && args !== null
    ? (args as Record<string, unknown>)[key]
    : undefined;
}

export type BridgeMessageHandler = (
  raw: unknown,
  sourceUrl: string
) => Promise<BridgeResult | null>;

export function createBridgeHandler(deps: BridgeDeps): BridgeMessageHandler {
  const serverOrigin = originOf(deps.serverUrl);

  return async (raw, sourceUrl) => {
    if (deps.inExcursion?.()) return null;
    const trusted = serverOrigin !== null && originOf(sourceUrl) === serverOrigin;
    // File bytes are parsed only from a trusted page.
    const msg = parseInbound(raw, { allowFile: trusted });
    if (!msg) return null;

    if (msg.type === "event") {
      if (!trusted) return null;
      if ((BRIDGE_EVENTS as readonly string[]).includes(msg.name)) {
        deps.onEvent?.(msg.name as BridgeEventName, msg.payload);
      }
      return null;
    }

    // An untrusted caller gets no answer at all: the reply would run in the
    // main frame (the Console), where its id could settle one of the
    // Console's own pending calls.
    if (!trusted) return null;

    const { id, method, args } = msg;

    try {
      switch (method) {
        case "getPushToken":
          return { id, ok: true, value: await deps.getPushToken() };

        case "haptic": {
          const kind = argOf(args, "kind");
          if (typeof kind !== "string" || !(HAPTIC_KINDS as readonly string[]).includes(kind)) {
            return fail(id, "bad_args", `haptic kind must be one of ${HAPTIC_KINDS.join(", ")}`);
          }
          await deps.haptic(kind as HapticKind);
          return { id, ok: true, value: null };
        }

        case "openExternal": {
          const url = argOf(args, "url");
          if (typeof url !== "string" || !EXTERNAL_SCHEMES.test(url)) {
            return fail(id, "bad_args", "openExternal takes an http(s), mailto, tel or sms URL");
          }
          await deps.openExternal(url);
          return { id, ok: true, value: null };
        }

        case "navigate": {
          const route = safeConsoleRoute(argOf(args, "route"));
          if (route === null) {
            return fail(id, "bad_args", "navigate takes a Console path starting with '/'");
          }
          deps.navigate(route);
          return { id, ok: true, value: null };
        }

        case "resetServer":
          await deps.resetServer();
          return { id, ok: true, value: null };

        case "scan": {
          const formats = scanFormatsOf(args);
          if (formats === null) return fail(id, "bad_args", SCAN_ARGS_MESSAGE);
          return { id, ok: true, value: await deps.scan(formats) };
        }

        case "showConnectionSwitcher":
          await deps.showConnectionSwitcher();
          return { id, ok: true, value: null };

        case "pickImage": {
          const options = pickImageOptionsOf(args);
          if (options === null) return fail(id, "bad_args", PICK_IMAGE_ARGS_MESSAGE);
          const image = await deps.pickImage(options);
          if (image === null) return { id, ok: true, value: null };
          const size = base64ByteLength(image.base64);
          if (size === null || size > MAX_FILE_BYTES) {
            return fail(id, "failed", IMAGE_TOO_LARGE_MESSAGE);
          }
          return {
            id,
            ok: true,
            value: { base64: image.base64, name: image.name, mime: image.mime },
          };
        }

        case "share": {
          const content = shareContentOf(args);
          if (content === null) return fail(id, "bad_args", SHARE_ARGS_MESSAGE);
          await deps.share(content);
          return { id, ok: true, value: null };
        }

        case "openFile": {
          const file = openFileOf(args);
          if (file === "bad_args") return fail(id, "bad_args", OPEN_FILE_ARGS_MESSAGE);
          if (file === "too_large") return fail(id, "bad_args", FILE_TOO_LARGE_MESSAGE);
          await deps.openFile(file);
          return { id, ok: true, value: null };
        }

        default:
          return fail(id, "unknown_method", `Unknown bridge method: ${method}`);
      }
    } catch (err) {
      return fail(id, "failed", err instanceof Error ? err.message : String(err));
    }
  };
}
