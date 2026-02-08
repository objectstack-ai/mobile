/**
 * Tests for background-sync — periodic background task registration
 */
import * as BackgroundFetch from "expo-background-fetch";
import * as TaskManager from "expo-task-manager";
import {
  registerBackgroundSync,
  unregisterBackgroundSync,
} from "~/lib/background-sync";

beforeEach(() => {
  jest.clearAllMocks();
});

describe("registerBackgroundSync", () => {
  it("registers the background task", async () => {
    await registerBackgroundSync();
    expect(BackgroundFetch.registerTaskAsync).toHaveBeenCalledWith(
      "objectstack-background-sync",
      expect.objectContaining({
        minimumInterval: 15 * 60,
        stopOnTerminate: false,
        startOnBoot: true,
      }),
    );
  });

  it("does not throw when registration fails", async () => {
    (BackgroundFetch.registerTaskAsync as jest.Mock).mockRejectedValueOnce(
      new Error("Not supported"),
    );
    await expect(registerBackgroundSync()).resolves.toBeUndefined();
  });
});

describe("unregisterBackgroundSync", () => {
  it("unregisters the task when it is registered", async () => {
    (TaskManager.isTaskRegisteredAsync as jest.Mock).mockResolvedValueOnce(true);
    await unregisterBackgroundSync();
    expect(BackgroundFetch.unregisterTaskAsync).toHaveBeenCalledWith(
      "objectstack-background-sync",
    );
  });

  it("does not unregister when task is not registered", async () => {
    (TaskManager.isTaskRegisteredAsync as jest.Mock).mockResolvedValueOnce(false);
    await unregisterBackgroundSync();
    expect(BackgroundFetch.unregisterTaskAsync).not.toHaveBeenCalled();
  });

  it("does not throw when unregistration fails", async () => {
    (TaskManager.isTaskRegisteredAsync as jest.Mock).mockRejectedValueOnce(
      new Error("fail"),
    );
    await expect(unregisterBackgroundSync()).resolves.toBeUndefined();
  });
});

describe("defineTask", () => {
  it("the background-sync module can be imported", () => {
    // defineTask is called at module load time; just verify
    // that the import doesn't throw.
    expect(TaskManager.defineTask).toBeDefined();
  });
});
