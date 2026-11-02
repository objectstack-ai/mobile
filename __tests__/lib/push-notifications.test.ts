import {
  acquireDeviceToken,
  ensurePermission,
  routeFromPushData,
  routeFromResponse,
  ANDROID_DEFAULT_CHANNEL_ID,
} from "~/lib/push-notifications";
import * as Notifications from "expo-notifications";
// The mock is `__esModule: true`, so this namespace is the same object the lib
// imports (`import * as Device`) — mutating `Device.isDevice` here is observed
// by the code under test. (`jest.requireMock` returns a *different* object.)
import * as Device from "expo-device";

const DeviceMock = Device as { isDevice: boolean };
const SERVER = "https://acme.example.com";

describe("routeFromPushData", () => {
  it("returns an explicit route", () => {
    expect(routeFromPushData({ route: "/apps/crm/opportunity/1" }, SERVER)).toBe(
      "/apps/crm/opportunity/1"
    );
  });

  it("rejects a route that is not a Console path", () => {
    expect(routeFromPushData({ route: "apps/crm" }, SERVER)).toBeNull();
    expect(routeFromPushData({ route: "//evil.example.com/x" }, SERVER)).toBeNull();
  });

  it("accepts a url that points into this server's Console", () => {
    expect(routeFromPushData({ url: `${SERVER}/_console/apps/crm?tab=1` }, SERVER)).toBe(
      "/apps/crm?tab=1"
    );
  });

  it("ignores a url on another site", () => {
    expect(routeFromPushData({ url: "https://evil.example.com/_console/apps" }, SERVER)).toBeNull();
  });

  it("ignores a url when no server is configured", () => {
    expect(routeFromPushData({ url: `${SERVER}/_console/home` }, null)).toBeNull();
  });

  it("prefers route over url", () => {
    expect(routeFromPushData({ route: "/a", url: `${SERVER}/_console/b` }, SERVER)).toBe("/a");
  });

  it("returns null for empty payloads", () => {
    expect(routeFromPushData(null, SERVER)).toBeNull();
    expect(routeFromPushData(undefined, SERVER)).toBeNull();
    expect(routeFromPushData({}, SERVER)).toBeNull();
  });
});

describe("routeFromResponse", () => {
  it("reads the data payload off a notification response", () => {
    const response = {
      notification: { request: { content: { data: { route: "/home" } } } },
    } as unknown as Notifications.NotificationResponse;
    expect(routeFromResponse(response, SERVER)).toBe("/home");
  });

  it("returns null for a nullish response", () => {
    expect(routeFromResponse(null, SERVER)).toBeNull();
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

describe("acquireDeviceToken", () => {
  const mockGet = Notifications.getPermissionsAsync as jest.Mock;
  const mockToken = Notifications.getDevicePushTokenAsync as jest.Mock;

  beforeEach(() => {
    mockGet.mockReset();
    mockToken.mockReset();
    DeviceMock.isDevice = true;
  });

  it("returns null on a non-physical device without requesting a token", async () => {
    DeviceMock.isDevice = false;
    expect(await acquireDeviceToken()).toBeNull();
    expect(mockToken).not.toHaveBeenCalled();
  });

  it("returns null when permission is not granted", async () => {
    mockGet.mockResolvedValue({ granted: false, status: "denied", canAskAgain: false });
    expect(await acquireDeviceToken()).toBeNull();
    expect(mockToken).not.toHaveBeenCalled();
  });

  it("returns the native token with its vendor when granted", async () => {
    mockGet.mockResolvedValue({ granted: true, status: "granted", canAskAgain: true });
    mockToken.mockResolvedValue({ type: "ios", data: "a1b2c3" });
    expect(await acquireDeviceToken()).toEqual({ token: "a1b2c3", vendor: "apns" });
    expect(Notifications.getExpoPushTokenAsync).not.toHaveBeenCalled();
  });

  it("returns null for an empty token", async () => {
    mockGet.mockResolvedValue({ granted: true, status: "granted", canAskAgain: true });
    mockToken.mockResolvedValue({ type: "ios", data: "" });
    expect(await acquireDeviceToken()).toBeNull();
  });

  it("returns null and does not throw when token acquisition fails", async () => {
    mockGet.mockResolvedValue({ granted: true, status: "granted", canAskAgain: true });
    mockToken.mockRejectedValue(new Error("no FCM"));
    expect(await acquireDeviceToken()).toBeNull();
  });
});

describe("constants", () => {
  it("exposes the default android channel id", () => {
    expect(ANDROID_DEFAULT_CHANNEL_ID).toBe("default");
  });
});
