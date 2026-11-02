/**
 * Persistence of the saved connections (`lib/connections/model.ts`) in
 * expo-secure-store. Probing a server before it is saved is
 * `lib/server-probe.ts`.
 *
 * Builds before saved connections kept one server URL under
 * {@link LEGACY_SERVER_URL_KEY}. The first {@link loadConnections} that finds
 * no connections document migrates that URL into the list as its only (and
 * current) connection, then deletes the old key — so its value is read by
 * exactly one migration.
 */
import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import {
  EMPTY_CONNECTIONS,
  addConnection,
  connectionFromLegacyUrl,
  parseConnections,
  serializeConnections,
  type Connections,
} from "~/lib/connections/model";

/** The connections document (JSON, see `serializeConnections`). */
export const CONNECTIONS_KEY = "objectstack_connections";

/** Where builds before saved connections kept the one server URL. */
export const LEGACY_SERVER_URL_KEY = "objectstack_server_url";

/**
 * expo-secure-store has no web backend (its native module resolves to an empty
 * object), so any call there throws. On web we fall back to `localStorage`,
 * which is sufficient for the non-secret connection list.
 */
const isWeb = Platform.OS === "web";

async function readKey(key: string): Promise<string | null> {
  if (isWeb) return globalThis.localStorage?.getItem(key) ?? null;
  return SecureStore.getItemAsync(key);
}

async function writeKey(key: string, value: string): Promise<void> {
  if (isWeb) {
    globalThis.localStorage?.setItem(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

async function deleteKey(key: string): Promise<void> {
  if (isWeb) {
    globalThis.localStorage?.removeItem(key);
    return;
  }
  await SecureStore.deleteItemAsync(key);
}

/** A read that cannot fail: storage that cannot be read reads as nothing saved. */
async function readOrNull(key: string): Promise<string | null> {
  try {
    return await readKey(key);
  } catch {
    return null;
  }
}

async function deleteQuietly(key: string): Promise<void> {
  try {
    await deleteKey(key);
  } catch {
    // Left for the next launch to delete.
  }
}

/**
 * The saved connections. Never throws.
 *
 * - A connections document is there: it is the answer. A legacy URL still
 *   beside it (a migration interrupted between its write and its delete) is
 *   deleted, never migrated a second time.
 * - No document, a legacy URL (an upgrade): the URL becomes the first
 *   connection, the document is written, and the legacy key is deleted. If the
 *   write fails, the legacy key stays for the next launch to migrate.
 * - Neither (a fresh install): no connections, and nothing is written.
 */
export async function loadConnections(now: number = Date.now()): Promise<Connections> {
  const stored = await readOrNull(CONNECTIONS_KEY);
  if (stored !== null) {
    const parsed = parseConnections(stored);
    if (parsed) {
      await deleteQuietly(LEGACY_SERVER_URL_KEY);
      return parsed;
    }
  }

  const legacy = await readOrNull(LEGACY_SERVER_URL_KEY);
  if (legacy === null) return EMPTY_CONNECTIONS;
  const input = connectionFromLegacyUrl(legacy);
  if (!input) {
    await deleteQuietly(LEGACY_SERVER_URL_KEY);
    return EMPTY_CONNECTIONS;
  }
  const migrated = addConnection(EMPTY_CONNECTIONS, input, now);
  try {
    await writeKey(CONNECTIONS_KEY, serializeConnections(migrated));
  } catch {
    return migrated;
  }
  await deleteQuietly(LEGACY_SERVER_URL_KEY);
  return migrated;
}

/** Persist the connections. Throws when storage refuses the write. */
export async function saveConnections(state: Connections): Promise<void> {
  await writeKey(CONNECTIONS_KEY, serializeConnections(state));
}
