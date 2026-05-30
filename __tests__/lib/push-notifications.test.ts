import {
  deepLinkFromData,
  deepLinkFromResponse,
  currentPushPlatform,
  acquirePushToken,
  ensurePermission,
  ANDROID_DEFAULT_CHANNEL_ID,
} from "~/lib/push-notifications";
import * as Notifications from "expo-notifications";

// The lib reads `Device.isDevice` through the Babel ESM-interop namespace,
// whose properties are getters onto the underlying mock. Mutate the raw mock
// object (via requireMock) so changes are visible to the code under test.
const DeviceMock = jest.requireMock("expo-device") as { isDevice: boolean };

describe("deepLinkFromData", () => {
  it("returns an explicit url when present", () => {
    expect(deepLinkFromData({ url: "objectstack://objects/tasks/1" })).toBe(
      "objectstack://objects/tasks/1",
    );
  });

  it("builds an object+record link from structured fields", () => {
    expect(deepLinkFromData({ objectName: "tasks", recordId: "42" })).toBe(
      "objectstack://objects/tasks/42",
    );
  });

  it("builds an object-only link when recordId is absent", () => {
    expect(deepLinkFromData({ objectName: "tasks" })).toBe(
      "objectstack://objects/tasks",
    );
  });

  it("prefers url over structured fields", () => {
    expect(
      deepLinkFromData({ url: "objectstack://x", objectName: "tasks", recordId: "1" }),
    ).toBe("objectstack://x");
  });

  it("returns null for empty / missing payloads", () => {
    expect(deepLinkFromData(null)).toBeNull();
    expect(deepLinkFromData(undefined)).toBeNull();
    expect(deepLinkFromData({})).toBeNull();
    expect(deepLinkFromData({ url: "" })).toBeNull();
  });
});

describe("deepLinkFromResponse", () => {
  it("reads the data payload off a notification response", () => {
    const response = {
      notification: {
        request: { content: { data: { objectName: "leads", recordId: "9" } } },
      },
    } as unknown as Notifications.NotificationResponse;
    expect(deepLinkFromResponse(response)).toBe("objectstack://objects/leads/9");
  });

  it("returns null for nullish response", () => {
    expect(deepLinkFromResponse(null)).toBeNull();
  });
});

describe("currentPushPlatform", () => {
  it("maps the RN platform to a backend platform string", () => {
    // jest-expo defaults Platform.OS to ios.
    expect(["ios", "android", "web"]).toContain(currentPushPlatform());
  });
});

describe("ensurePermission", () => {
  const mockGet = Notifications.getPermissionsAsync as jest.Mock;
  const mockReq = Notifications.requestPermissionsAsync as jest.Mock;

  beforeEach(() => {
    mockGet.mockReset();
    mockReq.mockReset();
  });

  it("returns granted without prompting when already granted", async () => {
    mockGet.mockResolvedValue({ granted: true, status: "granted", canAskAgain: true });
    expect(await ensurePermission()).toBe("granted");
    expect(mockReq).not.toHaveBeenCalled();
  });

  it("prompts when undetermined and returns the outcome", async () => {
    mockGet.mockResolvedValue({ granted: false, status: "undetermined", canAskAgain: true });
    mockReq.mockResolvedValue({ granted: true, status: "granted", canAskAgain: true });
    expect(await ensurePermission()).toBe("granted");
    expect(mockReq).toHaveBeenCalledTimes(1);
  });

  it("does not prompt when permanently denied", async () => {
    mockGet.mockResolvedValue({ granted: false, status: "denied", canAskAgain: false });
    expect(await ensurePermission()).toBe("denied");
    expect(mockReq).not.toHaveBeenCalled();
  });
});

describe("acquirePushToken", () => {
  const mockGet = Notifications.getPermissionsAsync as jest.Mock;
  const mockToken = Notifications.getExpoPushTokenAsync as jest.Mock;

  beforeEach(() => {
    mockGet.mockReset();
    mockToken.mockReset();
    DeviceMock.isDevice = true;
  });

  it("returns null on a non-physical device without requesting a token", async () => {
    DeviceMock.isDevice = false;
    expect(await acquirePushToken()).toBeNull();
    expect(mockToken).not.toHaveBeenCalled();
  });

  it("returns null when permission is not granted", async () => {
    mockGet.mockResolvedValue({ granted: false, status: "denied", canAskAgain: false });
    expect(await acquirePushToken()).toBeNull();
    expect(mockToken).not.toHaveBeenCalled();
  });

  it("returns a registration with token + platform when granted", async () => {
    mockGet.mockResolvedValue({ granted: true, status: "granted", canAskAgain: true });
    mockToken.mockResolvedValue({ type: "expo", data: "ExponentPushToken[abc]" });
    const result = await acquirePushToken("proj-1");
    expect(result?.token).toBe("ExponentPushToken[abc]");
    expect(["ios", "android", "web"]).toContain(result?.platform);
    expect(mockToken).toHaveBeenCalledWith({ projectId: "proj-1" });
  });

  it("returns null and does not throw when token acquisition fails", async () => {
    mockGet.mockResolvedValue({ granted: true, status: "granted", canAskAgain: true });
    mockToken.mockRejectedValue(new Error("network"));
    expect(await acquirePushToken()).toBeNull();
  });
});

describe("constants", () => {
  it("exposes the default android channel id", () => {
    expect(ANDROID_DEFAULT_CHANNEL_ID).toBe("default");
  });
});
