import { Linking } from "react-native";
import { router } from "expo-router";
import type { ObjectStackClient } from "@objectstack/client";
import type { ActionMeta } from "../renderers/types";

/* ------------------------------------------------------------------ */
/*  Action Execution Result                                            */
/* ------------------------------------------------------------------ */

/** Spec v7 `Action.resultDialog` — reveal an action's response (TOTP URIs, OAuth
 *  secrets, backup codes) after it runs. */
export interface ActionResultDialog {
  title?: string;
  description?: string;
  acknowledge?: string;
  format?: "text" | "secret" | "json" | "qrcode" | "code-list";
  fields?: Array<{
    path: string;
    label?: string;
    format?: "text" | "secret" | "json" | "qrcode" | "code-list";
  }>;
}

export interface ActionResult {
  success: boolean;
  message?: string;
  data?: unknown;
  /** Present when the action declares a `resultDialog`; callers should render it. */
  resultDialog?: ActionResultDialog;
}

/* ------------------------------------------------------------------ */
/*  Action Executor                                                    */
/* ------------------------------------------------------------------ */

export interface ActionExecutorContext {
  client: ObjectStackClient;
  /** Current object name */
  objectName?: string;
  /** Current record ID */
  recordId?: string;
  /** Current record data */
  record?: Record<string, unknown>;
  /** Current app name (for routing) */
  appName?: string;
  /** Current user id (for `${ctx.userId}` interpolation) */
  userId?: string;
  /** Resolved action parameters (for `${param.X}` interpolation) */
  params?: Record<string, unknown>;
  /** Callback after action completes */
  onComplete?: (result: ActionResult) => void;
}

/**
 * Execute an ObjectUI Action based on its metadata.
 *
 * Supports the core action types:
 * - `url`  — Open a URL in the browser
 * - `api`  — Call a server API endpoint
 * - `flow` — Trigger an automation flow
 * - `modal` — Navigate to a modal route (maps to Expo Router push)
 * - `script` — Client-side JS is not supported on mobile; falls back to no-op
 */
export async function executeAction(
  action: ActionMeta,
  context: ActionExecutorContext,
): Promise<ActionResult> {
  const { client, objectName, recordId, record, appName, userId, params, onComplete } =
    context;

  // Spec v7: `execute` is auto-migrated to `target`.
  const rawTarget = action.target ?? action.execute;
  const interp = (s: string | undefined) =>
    interpolate(s, { objectName, recordId, record, appName, userId, params });

  // The execution context forwarded to server-side handlers (flows/apis).
  const execContext = {
    object: objectName,
    recordId,
    record,
    ...(params ? { params } : {}),
  };

  // Attach the action's resultDialog config (if any) to a result.
  const withDialog = (r: ActionResult): ActionResult =>
    action.resultDialog ? { ...r, resultDialog: action.resultDialog } : r;

  try {
    let result: ActionResult;

    switch (action.type) {
      case "url": {
        const target = interp(rawTarget);
        if (target) {
          await Linking.openURL(target);
        }
        result = { success: true };
        break;
      }

      case "api": {
        const endpoint = interp(rawTarget);
        if (!endpoint) {
          result = { success: false, message: "No API endpoint specified" };
          break;
        }
        const data = await client.automation.trigger(endpoint, execContext);
        result = withDialog({
          success: true,
          data,
          message: action.successMessage ?? "Action completed",
        });
        break;
      }

      case "flow": {
        // v7 canonical flow runner is `client.automation.execute(name, ctx)`.
        const flowName = interp(rawTarget) ?? action.name;
        const data = await client.automation.execute(flowName, execContext);
        result = withDialog({
          success: true,
          data,
          message: action.successMessage ?? "Flow triggered",
        });
        break;
      }

      case "modal": {
        // Navigate to the target route
        const route = interp(rawTarget) ?? `/(app)/${appName}/${objectName}/${recordId}`;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        router.push(route as any);
        result = { success: true };
        break;
      }

      default:
        result = {
          success: false,
          message: `Unsupported action type: ${action.type ?? "unknown"}`,
        };
    }

    onComplete?.(result);
    return result;
  } catch (err) {
    const result: ActionResult = {
      success: false,
      message: `Action "${action.name}" failed: ${err instanceof Error ? err.message : "Unknown error"}`,
    };
    onComplete?.(result);
    return result;
  }
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

interface InterpolationContext {
  objectName?: string;
  recordId?: string;
  record?: Record<string, unknown>;
  appName?: string;
  userId?: string;
  params?: Record<string, unknown>;
}

/**
 * Resolve template variables in an action `target` per the spec v7 contract:
 *
 *   - `${param.X}` — value of action parameter `X`
 *   - `${ctx.X}`   — value from the execution context: `recordId`, `objectName`,
 *                    `appName`, `userId`, or a field of the current record
 *                    (`${ctx.email}` → `record.email`, `${ctx.record.email}` too)
 *
 * Legacy `{fieldName}` placeholders (pre-v3.1) are still resolved against the
 * record for backward compatibility. Unknown references resolve to an empty string.
 */
export function interpolate(
  target: string | undefined,
  ctx: InterpolationContext,
): string | undefined {
  if (!target) return undefined;

  const ctxValue = (path: string): unknown => {
    const key = path.startsWith("record.") ? path.slice("record.".length) : path;
    switch (key) {
      case "recordId":
        return ctx.recordId;
      case "objectName":
        return ctx.objectName;
      case "appName":
        return ctx.appName;
      case "userId":
        return ctx.userId;
      default:
        return ctx.record?.[key];
    }
  };

  return (
    target
      // ${param.X} and ${ctx.X[.Y]}
      .replace(/\$\{(param|ctx)\.([\w.]+)\}/g, (_, scope, path) => {
        const val = scope === "param" ? ctx.params?.[path] : ctxValue(path);
        return val != null ? String(val) : "";
      })
      // legacy {field}
      .replace(/\{(\w+)\}/g, (_, key) => {
        const val = ctx.record?.[key];
        return val != null ? String(val) : "";
      })
  );
}

/* ------------------------------------------------------------------ */
/*  Helpers to filter actions by location                              */
/* ------------------------------------------------------------------ */

export function getActionsForLocation(
  actions: ActionMeta[],
  location:
    | "list_toolbar"
    | "list_item"
    | "record_header"
    | "record_more"
    | "record_related"
    | "global_nav",
): ActionMeta[] {
  return actions.filter((a) => a.locations?.includes(location));
}
