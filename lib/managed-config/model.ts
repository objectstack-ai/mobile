/**
 * Managed deployment — the server an organization's MDM configures for the
 * app, and whether the user may change it.
 *
 * The values come from the platform's standard managed app configuration
 * (iOS: the `com.apple.configuration.managed` dictionary; Android: app
 * restrictions through `RestrictionsManager`), read by the local native module
 * in `modules/managed-config/` (`./native.ts`).
 *
 * Precedence of the server the picker offers: managed config > the build's
 * `EXPO_PUBLIC_DEFAULT_SERVER_URL` > what the user enters. A managed server is
 * still probed and confirmed like any other (`app/server-config.tsx`): it is
 * saved only from the confirm step, and never without the probe.
 *
 * Pure: no native code, storage or React.
 */
import { normalizeServerUrl } from "~/lib/shell/console-url";
import type { Connection } from "~/lib/connections/model";

/**
 * The keys the shell reads. `modules/managed-config/app.plugin.js` declares the
 * same keys for Android (`app_restrictions.xml`); a test pins the two equal.
 * `trustedHosts` is deliberately not read (see docs/DEPLOYMENT.md, "MDM").
 */
export const MANAGED_CONFIG_KEYS = ["serverUrl", "lockServer"] as const;

export interface ManagedConfig {
  /** The managed server address as configured (trimmed), or `null` when none is set. */
  serverUrl: string | null;
  /**
   * The user may not add servers or remove the managed one. Meaningful only
   * with {@link serverUrl}.
   */
  lockServer: boolean;
}

export const NO_MANAGED_CONFIG: ManagedConfig = { serverUrl: null, lockServer: false };

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/**
 * `lockServer`: a boolean, or the strings `"true"` / `"false"` (some consoles
 * only offer string values). Any other value that is present locks: a lock the
 * admin meant to set is not silently dropped.
 */
function parseLock(value: unknown): boolean {
  if (value === undefined || value === null) return false;
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const text = value.trim().toLowerCase();
    if (text === "false") return false;
    return true;
  }
  return true;
}

/** Read the native module's dictionary. Anything that is not one reads as no managed config. */
export function parseManagedConfig(raw: unknown): ManagedConfig {
  if (!isRecord(raw)) return NO_MANAGED_CONFIG;
  const serverUrl =
    typeof raw.serverUrl === "string" && raw.serverUrl.trim().length > 0
      ? raw.serverUrl.trim()
      : null;
  return { serverUrl, lockServer: parseLock(raw.lockServer) };
}

export function sameManagedConfig(a: ManagedConfig, b: ManagedConfig): boolean {
  return a.serverUrl === b.serverUrl && a.lockServer === b.lockServer;
}

/**
 * The identity of a managed address: its normalized server URL, or the text
 * itself when it does not normalize (it then never matches a saved
 * connection, and the probe reports why).
 */
export function managedServerKey(serverUrl: string): string {
  const normalized = normalizeServerUrl(serverUrl, { allowInsecure: true });
  return normalized.ok ? normalized.serverUrl : serverUrl;
}

/**
 * The saved connection the managed address set up: one confirmed from it
 * (`managedFrom`, which survives the probe adopting a redirect), or one saved
 * at exactly that server URL. `null` without a managed address or before it
 * was confirmed.
 */
export function findManagedConnection(
  list: readonly Connection[],
  managed: ManagedConfig
): Connection | null {
  if (managed.serverUrl === null) return null;
  const key = managedServerKey(managed.serverUrl);
  return list.find((c) => c.managedFrom === key) ?? list.find((c) => c.serverUrl === key) ?? null;
}

/** The host the user may not remove: the managed connection, while locked. */
export function lockedHost(list: readonly Connection[], managed: ManagedConfig): string | null {
  if (!managed.lockServer) return null;
  return findManagedConnection(list, managed)?.host ?? null;
}

/** Whether the server is locked to the managed one (a managed address and `lockServer`). */
export function isLocked(managed: ManagedConfig): boolean {
  return managed.lockServer && managed.serverUrl !== null;
}

/**
 * The managed address still waits for its probe and confirm step: it is set
 * and no saved connection came from it. Unlocked, the user may decline it for
 * the session (`declined`, its {@link managedServerKey}) and enter another
 * address; locked, declining is not offered.
 */
export function managedPending(
  list: readonly Connection[],
  managed: ManagedConfig,
  declined: string | null
): boolean {
  if (managed.serverUrl === null) return false;
  if (findManagedConnection(list, managed)) return false;
  return isLocked(managed) || declined !== managedServerKey(managed.serverUrl);
}

/**
 * The address the picker's address step starts with, by precedence:
 *
 * 1. an address a connect link or the scanner handed over (the user asked for it);
 * 2. the managed address, while no saved connection came from it;
 * 3. the current connection's, unless adding another;
 * 4. the build's default server;
 * 5. empty, for the user to enter.
 */
export function initialAddress(opts: {
  linked: string | null;
  adding: boolean;
  current: string | null;
  managed: ManagedConfig;
  managedSaved: boolean;
  buildDefault: string;
}): string {
  if (opts.linked !== null) return opts.linked;
  if (opts.managed.serverUrl !== null && !opts.managedSaved) return opts.managed.serverUrl;
  if (!opts.adding && opts.current) return opts.current;
  return opts.buildDefault;
}
