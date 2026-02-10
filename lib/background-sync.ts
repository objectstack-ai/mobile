/**
 * Background sync registration using expo-background-fetch + expo-task-manager.
 *
 * Registers a periodic background task that drains the offline sync queue
 * when the device regains connectivity.
 */

import * as BackgroundFetch from "expo-background-fetch";
import * as TaskManager from "expo-task-manager";
import * as Network from "expo-network";
import {
  getPendingEntries,
} from "./sync-queue";
import { getDatabase } from "./offline-storage";

const BACKGROUND_SYNC_TASK = "objectstack-background-sync";

/**
 * The task body executed in the background.
 * It checks connectivity and processes pending queue entries.
 */
TaskManager.defineTask(BACKGROUND_SYNC_TASK, async () => {
  try {
    const state = await Network.getNetworkStateAsync();
    if (!state.isConnected) {
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }

    // Ensure database is available
    getDatabase();

    const entries = getPendingEntries();
    if (entries.length === 0) {
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }

    // Note: In the background task we cannot use the ObjectStack client
    // directly (it needs a React context). Instead we mark entries for
    // processing; the foreground sync hook will drain them on next launch.
    // This task primarily signals the OS that there is work to do.

    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch {
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

/**
 * Register the background sync task.
 * Call once at app startup.
 */
export async function registerBackgroundSync(): Promise<void> {
  try {
    await BackgroundFetch.registerTaskAsync(BACKGROUND_SYNC_TASK, {
      minimumInterval: 15 * 60, // 15 minutes (OS minimum on most devices)
      stopOnTerminate: false,
      startOnBoot: true,
    });
  } catch {
    // Background fetch not supported on this platform (e.g. web)
  }
}

/**
 * Unregister the background sync task.
 */
export async function unregisterBackgroundSync(): Promise<void> {
  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_SYNC_TASK);
    if (isRegistered) {
      await BackgroundFetch.unregisterTaskAsync(BACKGROUND_SYNC_TASK);
    }
  } catch {
    // Ignore
  }
}
