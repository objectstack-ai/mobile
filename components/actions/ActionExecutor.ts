import { Linking } from "react-native";
import { router } from "expo-router";
import type { ObjectStackClient } from "@objectstack/client";
import type { ActionMeta } from "../renderers/types";

/* ------------------------------------------------------------------ */
/*  Action Execution Result                                            */
/* ------------------------------------------------------------------ */

export interface ActionResult {
  success: boolean;
  message?: string;
  data?: unknown;
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
  const { client, objectName, recordId, record, appName, onComplete } = context;

  try {
    let result: ActionResult;

    switch (action.type) {
      case "url": {
        const target = resolveTarget(action.target, record);
        if (target) {
          await Linking.openURL(target);
        }
        result = { success: true };
        break;
      }

      case "api": {
        const endpoint = action.execute ?? action.target;
        if (!endpoint) {
          result = { success: false, message: "No API endpoint specified" };
          break;
        }
        const data = await client.automation.trigger(endpoint, {
          object: objectName,
          recordId,
          record,
        });
        result = {
          success: true,
          data,
          message: action.successMessage ?? "Action completed",
        };
        break;
      }

      case "flow": {
        const flowName = action.execute ?? action.name;
        const data = await client.automation.trigger(flowName, {
          object: objectName,
          recordId,
          record,
        });
        result = {
          success: true,
          data,
          message: action.successMessage ?? "Flow triggered",
        };
        break;
      }

      case "modal": {
        // Navigate to the target route
        const route = action.target ?? `/(app)/${appName}/${objectName}/${recordId}`;
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
      message: err instanceof Error ? err.message : "Action failed",
    };
    onComplete?.(result);
    return result;
  }
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

/**
 * Resolve template variables in a target string.
 * Supports simple `{fieldName}` placeholders.
 */
function resolveTarget(
  target: string | undefined,
  record?: Record<string, unknown>,
): string | undefined {
  if (!target) return undefined;
  if (!record) return target;

  return target.replace(/\{(\w+)\}/g, (_, key) => {
    const val = record[key];
    return val != null ? String(val) : "";
  });
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
