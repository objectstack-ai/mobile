/**
 * Native side of the bridge: validates an inbound message, checks it came from
 * the configured server, and dispatches it to the shell's capabilities.
 *
 * Kept free of React and of native modules — everything platform-specific is
 * injected through `BridgeDeps`, so the policy is unit-testable.
 */
import { originOf } from "../console-url";
import {
  HAPTIC_KINDS,
  parseInbound,
  type BridgeErrorCode,
  type BridgeEventName,
  type BridgeResult,
  type HapticKind,
  type PushTokenResult,
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
  onEvent?: (name: BridgeEventName, payload: unknown) => void;
}

const EXTERNAL_SCHEMES = /^(https?|mailto|tel|sms):/i;

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

    const trusted = serverOrigin !== null && originOf(sourceUrl) === serverOrigin;

    if (msg.type === "event") {
      if (!trusted) return null;
      if (msg.name === "ready" || msg.name === "routeChanged") {
        deps.onEvent?.(msg.name, msg.payload);
      }
      return null;
    }

    const { id, method, args } = msg;
    if (!trusted) {
      return fail(id, "forbidden_origin", "The bridge only answers the configured server.");
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
          const route = argOf(args, "route");
          if (typeof route !== "string" || !route.startsWith("/") || route.startsWith("//")) {
            return fail(id, "bad_args", "navigate takes a Console route starting with '/'");
          }
          deps.navigate(route);
          return { id, ok: true, value: null };
        }

        case "resetServer":
          await deps.resetServer();
          return { id, ok: true, value: null };

        default:
          return fail(id, "unknown_method", `Unknown bridge method: ${method}`);
      }
    } catch (err) {
      return fail(id, "failed", err instanceof Error ? err.message : String(err));
    }
  };
}
