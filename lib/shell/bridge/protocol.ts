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

/** The global the shell calls to settle a pending call. */
export const BRIDGE_RESOLVE_GLOBAL = "__objectstackNativeResolve";

/** Largest message the shell will parse (bytes of JSON text). */
export const MAX_MESSAGE_LENGTH = 64 * 1024;

/** Callable methods, each announced as a capability of the same name. */
export const BRIDGE_METHODS = [
  "getPushToken",
  "haptic",
  "openExternal",
  "navigate",
  "resetServer",
] as const;
export type BridgeMethod = (typeof BRIDGE_METHODS)[number];

/** Fire-and-forget notifications from the Console. */
export const BRIDGE_EVENTS = ["ready", "routeChanged"] as const;
export type BridgeEventName = (typeof BRIDGE_EVENTS)[number];

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
