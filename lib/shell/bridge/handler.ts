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
  HAPTIC_KINDS,
  LOCKED_REFUSED_METHODS,
  SCAN_FORMATS,
  parseInbound,
  type AppLockInfo,
  type BridgeErrorCode,
  type BridgeEventName,
  type BridgeResult,
  type HapticKind,
  type PushTokenResult,
  type ScanFormat,
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
  /** The app-lock setting, read-only. */
  getAppLock: () => AppLockInfo;
  /** Open the native app-lock settings screen, where a change asks for biometrics. */
  openAppLockSettings: () => void | Promise<void>;
  /**
   * `true` while the app lock holds the screen (the overlay is up). Methods
   * that bring up native UI ({@link LOCKED_REFUSED_METHODS}) are then refused.
   */
  isLocked?: () => boolean;
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
    const msg = parseInbound(raw);
    if (!msg) return null;
    if (deps.inExcursion?.()) return null;

    const trusted = serverOrigin !== null && originOf(sourceUrl) === serverOrigin;

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

    if ((LOCKED_REFUSED_METHODS as readonly string[]).includes(method) && deps.isLocked?.()) {
      return fail(id, "failed", "The app is locked");
    }

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

        case "getAppLock": {
          const { enabled, timeoutSeconds } = deps.getAppLock();
          return { id, ok: true, value: { enabled, timeoutSeconds } };
        }

        case "openAppLockSettings":
          await deps.openAppLockSettings();
          return { id, ok: true, value: null };

        default:
          return fail(id, "unknown_method", `Unknown bridge method: ${method}`);
      }
    } catch (err) {
      return fail(id, "failed", err instanceof Error ? err.message : String(err));
    }
  };
}
