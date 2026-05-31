/**
 * Record-action execution engine.
 *
 * Mirrors the web `@object-ui/core` ActionRunner lifecycle for ObjectStack
 * object actions (the `actions[]` array on an object's metadata), adapted for
 * React Native. An action runs through:
 *
 *   1. confirm   — if `confirmText` is set, ask the user first
 *   2. params    — if `params[]` is defined, collect input via a dialog
 *   3. dispatch  — by `type`:
 *        • url            → open external link / in-app navigation
 *        • flow           → POST /api/v1/automation/{target}/trigger
 *        • api            → SDK `data.update`, or POST when target is a path
 *        • script | modal | form
 *                         → POST /api/v1/actions/{object}/{target}
 *   4. post      — toast success/error, reveal `resultDialog`, refresh record
 *
 * Side-effecting concerns (confirm, param collection, result reveal, toast,
 * navigation, refresh) are injected via {@link ActionRunContext} so this stays
 * UI-framework-agnostic and unit-testable.
 */
import { Linking } from "react-native";
import type { ObjectStackClient } from "@objectstack/client";
import { apiFetch } from "~/lib/objectstack";
import type { ActionMeta, ActionParamMeta } from "~/components/renderers/types";

export interface ActionResult {
  success: boolean;
  data?: unknown;
  error?: string;
  /** Whether the caller should re-fetch the record afterwards. */
  reload?: boolean;
}

export interface ActionRunContext {
  client: ObjectStackClient;
  objectName: string;
  recordId: string;
  record: Record<string, unknown> | null;
  /** Ask the user to confirm a destructive/irreversible action. */
  confirm: (message: string) => Promise<boolean>;
  /** Collect parameter values; resolves `null` when the user cancels. */
  collectParams: (
    params: ActionParamMeta[],
    action: ActionMeta,
  ) => Promise<Record<string, unknown> | null>;
  /** Reveal the action's response; resolves once acknowledged. */
  showResult: (action: ActionMeta, data: unknown) => Promise<void>;
  /** Surface a success/error toast. */
  toast: (message: string, variant: "success" | "error") => void;
  /** Navigate to an in-app route. */
  navigate: (url: string) => void;
  /** Re-fetch the current record (after a mutating action). */
  onRefresh: () => void;
}

/**
 * An action is hidden only when its `visible` expression is the literal
 * `"false"`. We can't safely evaluate arbitrary CEL/JS on-device, so anything
 * else is treated as visible (the server still enforces real permissions).
 */
export function isActionVisible(action: ActionMeta): boolean {
  return action.visible?.trim() !== "false";
}

/** Substitute `${record.x}`, `${param.x}`, `${recordId}`, `${objectName}`. */
function interpolate(
  template: string,
  params: Record<string, unknown>,
  ctx: ActionRunContext,
  encode: boolean,
): string {
  return template.replace(/\$\{([^}]+)\}/g, (_match, rawExpr: string) => {
    const expr = rawExpr.trim();
    let value: unknown;
    if (expr === "recordId") value = ctx.recordId;
    else if (expr === "objectName") value = ctx.objectName;
    else if (expr.startsWith("record.")) value = ctx.record?.[expr.slice(7)];
    else if (expr.startsWith("param.")) value = params[expr.slice(6)];
    else if (expr.startsWith("ctx.")) {
      value = expr === "ctx.recordId" ? ctx.recordId : undefined;
    }
    if (value == null) return "";
    const str = String(value);
    return encode ? encodeURIComponent(str) : str;
  });
}

function isUrlLike(value: string): boolean {
  return /^https?:\/\//.test(value);
}

async function readJson(res: Response): Promise<Record<string, unknown> | null> {
  try {
    return (await res.json()) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/* ---- Per-type dispatch ------------------------------------------------- */

async function dispatchUrl(
  action: ActionMeta,
  params: Record<string, unknown>,
  ctx: ActionRunContext,
): Promise<ActionResult> {
  const raw = action.target ?? action.execute;
  if (!raw) return { success: false, error: "No URL provided for url action" };
  const url = interpolate(raw, params, ctx, true);
  if (isUrlLike(url)) {
    await Linking.openURL(url);
  } else {
    ctx.navigate(url);
  }
  return { success: true };
}

async function dispatchFlow(
  action: ActionMeta,
  params: Record<string, unknown>,
  ctx: ActionRunContext,
): Promise<ActionResult> {
  const flowName = action.target ?? action.name;
  if (!flowName) return { success: false, error: "No flow target provided" };
  const res = await apiFetch(
    `/api/v1/automation/${encodeURIComponent(flowName)}/trigger`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        recordId: ctx.recordId,
        objectName: ctx.objectName,
        params,
      }),
    },
  );
  const json = await readJson(res);
  if (!res.ok || json?.success === false) {
    return {
      success: false,
      error: (json?.error as string) ?? `Flow "${flowName}" failed (HTTP ${res.status})`,
    };
  }
  return { success: true, data: json?.data, reload: action.refreshAfter !== false };
}

async function dispatchApi(
  action: ActionMeta,
  params: Record<string, unknown>,
  ctx: ActionRunContext,
): Promise<ActionResult> {
  const target = action.target ?? action.name;
  // A path/URL target is a raw endpoint; anything else updates the record.
  if (target && (target.startsWith("/") || isUrlLike(target))) {
    const url = interpolate(target, params, ctx, false);
    const res = await apiFetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });
    const json = await readJson(res);
    if (!res.ok || json?.success === false) {
      return {
        success: false,
        error: (json?.error as string) ?? `Request failed (HTTP ${res.status})`,
      };
    }
    return { success: true, data: json?.data, reload: action.refreshAfter !== false };
  }
  // Generic record mutation with the collected params.
  if (Object.keys(params).length > 0) {
    await ctx.client.data.update(ctx.objectName, ctx.recordId, params);
  }
  return { success: true, reload: action.refreshAfter !== false };
}

async function dispatchServerAction(
  action: ActionMeta,
  params: Record<string, unknown>,
  ctx: ActionRunContext,
): Promise<ActionResult> {
  const target = action.target ?? action.name;
  if (!target) return { success: false, error: "No action target provided" };
  const res = await apiFetch(
    `/api/v1/actions/${encodeURIComponent(ctx.objectName)}/${encodeURIComponent(target)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recordId: ctx.recordId, params }),
    },
  );
  const json = await readJson(res);
  if (!res.ok || json?.success === false) {
    return {
      success: false,
      error: (json?.error as string) ?? `Action "${target}" failed (HTTP ${res.status})`,
    };
  }
  return { success: true, data: json?.data, reload: action.refreshAfter === true };
}

/* ---- Lifecycle --------------------------------------------------------- */

/**
 * Run a single object action end-to-end. Returns the result; all user-facing
 * feedback (toasts, dialogs, refresh) is emitted through `ctx` along the way.
 */
export async function runRecordAction(
  action: ActionMeta,
  ctx: ActionRunContext,
): Promise<ActionResult> {
  // 1. Confirmation
  if (action.confirmText) {
    const ok = await ctx.confirm(action.confirmText);
    if (!ok) return { success: false, error: "cancelled" };
  }

  // 2. Param collection
  let params: Record<string, unknown> = {};
  if (action.params && action.params.length > 0) {
    const collected = await ctx.collectParams(action.params, action);
    if (collected === null) return { success: false, error: "cancelled" };
    params = collected;
  }

  // 3. Dispatch by type
  let result: ActionResult;
  try {
    switch (action.type) {
      case "url":
        result = await dispatchUrl(action, params, ctx);
        break;
      case "flow":
        result = await dispatchFlow(action, params, ctx);
        break;
      case "api":
        result = await dispatchApi(action, params, ctx);
        break;
      case "script":
      case "modal":
        result = await dispatchServerAction(action, params, ctx);
        break;
      default:
        // No explicit type: treat a path/URL target as navigation, else a
        // server-registered action.
        result = action.target && (action.target.startsWith("/") || isUrlLike(action.target))
          ? await dispatchUrl(action, params, ctx)
          : await dispatchServerAction(action, params, ctx);
    }
  } catch (error) {
    result = { success: false, error: (error as Error).message };
  }

  // 4. Post-execution
  if (result.error === "cancelled") return result;

  const hasResultDialog = !!(action.resultDialog && result.success);
  if (!result.success) {
    // Empty string → the toast layer substitutes a localized default.
    ctx.toast(result.error || "", "error");
  } else if (hasResultDialog) {
    await ctx.showResult(action, result.data);
  } else {
    ctx.toast(action.successMessage || "", "success");
  }

  if (result.success && result.reload) {
    ctx.onRefresh();
  }

  return result;
}
