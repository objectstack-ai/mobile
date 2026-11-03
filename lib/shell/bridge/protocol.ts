/**
 * Native bridge protocol — the contract between the shell and the web Console.
 *
 * The Console sees one global, `window.ObjectStackNative` (its presence is how
 * the Console knows it runs inside the shell). Calls travel as JSON over
 * `window.ReactNativeWebView.postMessage`; results come back through
 * `window.__objectstackNativeResolve`. See docs/HYBRID-SHELL.md for the
 * Console-facing description.
 *
 * Versioning: `BRIDGE_PROTOCOL_VERSION` bumps only on a breaking change. New
 * methods are additive and announced through `capabilities`, so the Console
 * feature-detects (`ObjectStackNative.has('scan')`) instead of version-sniffing.
 */

export const BRIDGE_PROTOCOL_VERSION = 1;

/** The global the Console reads. */
export const BRIDGE_GLOBAL = "ObjectStackNative";

/**
 * The global the shell calls to settle a pending call — only in a page on the
 * configured server's origin.
 */
export const BRIDGE_RESOLVE_GLOBAL = "__objectstackNativeResolve";

/**
 * DOM event the shell dispatches on `window` to move the Console to a route
 * (`detail: { route }`, cancelable). A Console that handles it with its own
 * router calls `preventDefault()`; otherwise the shell falls back to a full
 * page load of the route. Only a page on the configured server's origin is
 * sent either.
 */
export const NAVIGATE_EVENT = "objectstack-native:navigate";

/**
 * Shell → Console events, each a DOM event `objectstack-native:<name>` on
 * `window` and announced as a capability of the same name, so the Console
 * feature-detects with `has(name)` before it listens.
 */
export const SHELL_EVENTS = ["pushTokenChanged", "connectionRemoved"] as const;
export type ShellEventName = (typeof SHELL_EVENTS)[number];

/** The DOM event type the shell dispatches for a {@link ShellEventName}. */
export function shellEventType(name: ShellEventName): string {
  return `objectstack-native:${name}`;
}

/**
 * DOM event the shell dispatches on `window` when the OS reports a push token
 * for this install (`detail: { token, vendor }`, not cancelable): on rotation,
 * and possibly again with an unchanged token. The Console re-registers the
 * token under the signed-in session; registration is idempotent.
 */
export const PUSH_TOKEN_CHANGED_EVENT = shellEventType("pushTokenChanged");

/**
 * DOM event the shell dispatches on `window` before it removes the current
 * connection and signs it out (cancelable, `detail: { waitUntil(promise) }`).
 * A Console that handles it calls `preventDefault()`, unregisters this
 * install's push token under its session, and hands that work to
 * `detail.waitUntil`; the shell clears the host's cookies only after it
 * settles. The shell's own script reports the outcome back as the
 * `connectionRemovedDone` event.
 */
export const CONNECTION_REMOVED_EVENT = shellEventType("connectionRemoved");

/** Largest message the shell will parse (bytes of JSON text). */
export const MAX_MESSAGE_LENGTH = 64 * 1024;

/** Callable methods, each announced as a capability of the same name. */
export const BRIDGE_METHODS = [
  "getPushToken",
  "haptic",
  "openExternal",
  "navigate",
  "resetServer",
  "scan",
  "showConnectionSwitcher",
] as const;
export type BridgeMethod = (typeof BRIDGE_METHODS)[number];

/**
 * Code formats `scan()` reads, named as `expo-camera`'s `BarcodeType`. A call
 * may narrow the set with `formats`; without it the scanner reads all of them.
 */
export const SCAN_FORMATS = [
  "qr",
  "aztec",
  "datamatrix",
  "pdf417",
  "ean13",
  "ean8",
  "upc_a",
  "upc_e",
  "code39",
  "code93",
  "code128",
  "codabar",
  "itf14",
] as const;
export type ScanFormat = (typeof SCAN_FORMATS)[number];

/** Everything the shell announces in `capabilities`: its methods and its events. */
export const BRIDGE_CAPABILITIES: readonly string[] = [...BRIDGE_METHODS, ...SHELL_EVENTS];

/**
 * Fire-and-forget notifications from the page. `ready` and `routeChanged` are
 * the Console's (bootstrap methods); `connectionRemovedDone` is posted by the
 * shell's own `connectionRemoved` script, with what the Console did.
 */
export const BRIDGE_EVENTS = ["ready", "routeChanged", "connectionRemovedDone"] as const;
export type BridgeEventName = (typeof BRIDGE_EVENTS)[number];

/** Payload of `connectionRemovedDone`: which request, and what the page did with it. */
export interface ConnectionRemovedDone {
  /** The id the shell put into that `connectionRemoved` script. */
  id: string;
  /** A listener called `preventDefault()`. */
  handled: boolean;
  /** Everything handed to `waitUntil` resolved. */
  ok: boolean;
}

/** A well-formed `connectionRemovedDone` payload, or `null`. */
export function parseConnectionRemovedDone(payload: unknown): ConnectionRemovedDone | null {
  if (typeof payload !== "object" || payload === null) return null;
  const { id, handled, ok } = payload as Record<string, unknown>;
  if (typeof id !== "string" || id.length === 0 || id.length > 64) return null;
  if (typeof handled !== "boolean" || typeof ok !== "boolean") return null;
  return { id, handled, ok };
}

export const HAPTIC_KINDS = [
  "light",
  "medium",
  "heavy",
  "selection",
  "success",
  "warning",
  "error",
] as const;
export type HapticKind = (typeof HAPTIC_KINDS)[number];

export type PushVendor = "apns" | "fcm";

export interface PushTokenResult {
  token: string;
  vendor: PushVendor;
}

export interface BridgeCall {
  type: "call";
  id: string;
  method: string;
  args?: unknown;
}

export interface BridgeEvent {
  type: "event";
  name: string;
  payload?: unknown;
}

export type BridgeInbound = BridgeCall | BridgeEvent;

export type BridgeErrorCode = "unknown_method" | "bad_args" | "failed";

export type BridgeResult =
  | { id: string; ok: true; value: unknown }
  | { id: string; ok: false; error: { code: BridgeErrorCode; message: string } };

/** What the shell tells the Console about itself at page start. */
export interface BridgeHostInfo {
  protocolVersion: number;
  platform: "ios" | "android";
  appVersion: string;
  /**
   * A random id for this install (UUID v4), kept in SecureStore so it survives
   * the WebView's storage being cleared. Not a hardware or advertising id.
   * `null` when secure storage could not be read or written at page start.
   * See `lib/install-id.ts`.
   */
  installId: string | null;
  capabilities: readonly string[];
  safeArea: { top: number; bottom: number; left: number; right: number };
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/**
 * Parse a raw WebView message. Anything that is not a well-formed bridge
 * message returns `null` and is ignored — the Console page may post unrelated
 * messages, and a hostile frame must not be able to crash the shell.
 */
export function parseInbound(raw: unknown): BridgeInbound | null {
  if (typeof raw !== "string" || raw.length === 0) return null;
  if (raw.length > MAX_MESSAGE_LENGTH) return null;
  let msg: unknown;
  try {
    msg = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!isRecord(msg)) return null;

  if (msg.type === "call") {
    if (typeof msg.id !== "string" || msg.id.length === 0 || msg.id.length > 64) {
      return null;
    }
    if (typeof msg.method !== "string" || msg.method.length === 0) return null;
    return { type: "call", id: msg.id, method: msg.method, args: msg.args };
  }
  if (msg.type === "event") {
    if (typeof msg.name !== "string" || msg.name.length === 0) return null;
    return { type: "event", name: msg.name, payload: msg.payload };
  }
  return null;
}
