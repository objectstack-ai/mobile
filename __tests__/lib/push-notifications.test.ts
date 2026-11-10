import {
  acquireDeviceToken,
  addPushTokenChangeListener,
  ensurePermission,
  pushSenderFromResponse,
  pushTapTarget,
  pushTokenFromDevice,
  routeFromPushData,
  routeFromResponse,
  ANDROID_DEFAULT_CHANNEL_ID,
} from "~/lib/push-notifications";
import * as Notifications from "expo-notifications";
import { EMPTY_CONNECTIONS, addConnection } from "~/lib/connections/model";
import { NO_MANAGED_CONFIG } from "~/lib/managed-config/model";

// The shared manual mock predates token events; add the one listener used here.
jest.mock("expo-notifications", () => ({
  ...jest.requireActual("../../__mocks__/expo-notifications"),
  addPushTokenListener: jest.fn(() => ({ remove: jest.fn() })),
}));
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

  it("rejects a route or url that would escape the Console", () => {
    expect(routeFromPushData({ route: "/../../api/v1/me" }, SERVER)).toBeNull();
    expect(routeFromPushData({ route: "/%2e%2e/api/v1/me" }, SERVER)).toBeNull();
    expect(routeFromPushData({ route: "/..\\api" }, SERVER)).toBeNull();
    expect(routeFromPushData({ url: `${SERVER}/_console/../api/v1/me` }, SERVER)).toBeNull();
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

  // expo-notifications on iOS sets content.data = userInfo["body"] for a remote
  // notification, and exposes the full userInfo as trigger.payload.
  const iosResponse = (userInfo: Record<string, unknown>) =>
    ({
      notification: {
        request: {
          content: { data: (userInfo.body as Record<string, unknown>) ?? null },
          trigger: { type: "push", payload: userInfo },
        },
      },
    }) as unknown as Notifications.NotificationResponse;

  it("reads an APNs route beside aps from trigger.payload (iOS)", () => {
    const response = iosResponse({ aps: { alert: "New lead" }, route: "/apps/crm/lead/1" });
    expect(routeFromResponse(response, SERVER)).toBe("/apps/crm/lead/1");
  });

  it("reads an APNs route nested in body (iOS content.data)", () => {
    const response = iosResponse({ aps: { alert: "x" }, body: { route: "/apps/crm/lead/2" } });
    expect(routeFromResponse(response, SERVER)).toBe("/apps/crm/lead/2");
  });

  it("reads an APNs url beside aps (iOS)", () => {
    const response = iosResponse({ aps: {}, url: `${SERVER}/_console/apps/hr` });
    expect(routeFromResponse(response, SERVER)).toBe("/apps/hr");
  });

  it("reads an FCM data route from content.data (Android)", () => {
    const response = {
      notification: {
        request: {
          content: { data: { route: "/apps/crm/lead/3" } },
          trigger: { type: "push", remoteMessage: { data: { route: "/apps/crm/lead/3" } } },
        },
      },
    } as unknown as Notifications.NotificationResponse;
    expect(routeFromResponse(response, SERVER)).toBe("/apps/crm/lead/3");
  });

  it("rejects an escaping route in trigger.payload too", () => {
    const response = iosResponse({ aps: {}, route: "/%2e%2e/api/v1/me" });
    expect(routeFromResponse(response, SERVER)).toBeNull();
  });

  it("falls back to userInfo.data.route (iOS, keys nested under data)", () => {
    const response = iosResponse({ aps: {}, data: { route: "/apps/crm/lead/4" } });
    expect(routeFromResponse(response, SERVER)).toBe("/apps/crm/lead/4");
  });

  it("reads userInfo.data only after the other three candidates", () => {
    const data = { route: "/from/data" };
    // Each of the three earlier candidates wins over userInfo.data.
    expect(
      routeFromResponse(
        {
          notification: {
            request: {
              content: { data: { route: "/from/content" } },
              trigger: { type: "push", payload: { aps: {}, data } },
            },
          },
        } as unknown as Notifications.NotificationResponse,
        SERVER
      )
    ).toBe("/from/content");
    expect(routeFromResponse(iosResponse({ aps: {}, route: "/from/top", data }), SERVER)).toBe(
      "/from/top"
    );
    // No content.data and no top-level route: `body`, the third, still wins.
    expect(
      routeFromResponse(
        {
          notification: {
            request: {
              content: { data: null },
              trigger: { type: "push", payload: { aps: {}, body: { route: "/from/body" }, data } },
            },
          },
        } as unknown as Notifications.NotificationResponse,
        SERVER
      )
    ).toBe("/from/body");
  });

  it("skips an invalid earlier candidate and still reads userInfo.data", () => {
    const response = iosResponse({
      aps: {},
      route: "/%2e%2e/api/v1/me",
      data: { route: "/apps/crm/lead/5" },
    });
    expect(routeFromResponse(response, SERVER)).toBe("/apps/crm/lead/5");
  });

  it("refuses an escaping route under userInfo.data", () => {
    const response = iosResponse({ aps: {}, data: { route: "//evil.example/x" } });
    expect(routeFromResponse(response, SERVER)).toBeNull();
  });
});

describe("pushSenderFromResponse", () => {
  const android = (data: Record<string, unknown>) =>
    ({
      notification: { request: { content: { data }, trigger: { type: "push" } } },
    }) as unknown as Notifications.NotificationResponse;
  const ios = (userInfo: Record<string, unknown>) =>
    ({
      notification: {
        request: {
          content: { data: (userInfo.body as Record<string, unknown>) ?? null },
          trigger: { type: "push", payload: userInfo },
        },
      },
    }) as unknown as Notifications.NotificationResponse;

  it("reads origin from the FCM data map and from beside aps (APNs)", () => {
    expect(pushSenderFromResponse(android({ route: "/home", origin: SERVER }))).toEqual({
      named: true,
      origin: SERVER,
    });
    expect(pushSenderFromResponse(ios({ aps: {}, route: "/home", origin: SERVER }))).toEqual({
      named: true,
      origin: SERVER,
    });
  });

  it("names no sender when no dictionary carries origin, or carries it as null", () => {
    expect(pushSenderFromResponse(android({ route: "/home" }))).toEqual({ named: false });
    expect(pushSenderFromResponse(android({ route: "/home", origin: null }))).toEqual({
      named: false,
    });
    expect(pushSenderFromResponse(null)).toEqual({ named: false });
  });

  it("keeps a present value as sent, whatever its shape", () => {
    expect(pushSenderFromResponse(android({ origin: 42 }))).toEqual({ named: true, origin: 42 });
    expect(pushSenderFromResponse(android({ origin: "" }))).toEqual({ named: true, origin: "" });
  });
});

describe("pushTapTarget", () => {
  const ERP = "https://erp.example.com";
  const ACME = "https://acme.objectos.ai:8443";
  const DEV = "http://localhost:3000";
  const input = (serverUrl: string) => ({
    kind: "server" as const,
    label: serverUrl,
    serverUrl,
    brandColor: "#000000",
    initial: "X",
  });
  let state = addConnection(EMPTY_CONNECTIONS, input(ERP), 1);
  state = addConnection(state, input(ACME), 2);
  state = addConnection(state, input(`${DEV}/os`), 3);
  const three = state.list;
  const one = addConnection(EMPTY_CONNECTIONS, input(ERP), 1).list;
  const named = (origin: unknown) => ({ named: true as const, origin });
  const target = (sender: Parameters<typeof pushTapTarget>[0], connections = three, managed = NO_MANAGED_CONFIG) =>
    pushTapTarget(sender, { connections, managed });
  const hostOf = (t: ReturnType<typeof pushTapTarget>) =>
    t.kind === "open" ? t.connection.host : t.reason;

  it("opens on the saved connection whose origin the push names, current or not", () => {
    expect(hostOf(target(named(ERP)))).toBe("erp.example.com");
    expect(hostOf(target(named(ACME)))).toBe("acme.objectos.ai:8443");
    // A base path is not part of the origin.
    expect(hostOf(target(named(DEV)))).toBe("localhost:3000");
  });

  it("matches byte for byte: no case folding, port guessing, path or host-only match", () => {
    for (const origin of [
      "HTTPS://erp.example.com",
      "https://ERP.example.com",
      "https://erp.example.com:443",
      "https://erp.example.com/",
      "erp.example.com",
      "http://erp.example.com",
      "https://acme.objectos.ai",
      `${DEV}/os`,
      "",
      42,
    ]) {
      expect(target(named(origin))).toEqual({ kind: "drop", reason: "unsaved-origin" });
    }
  });

  it("drops a push from a server that is not saved, even with one connection", () => {
    expect(target(named("https://gone.example.com"), one)).toEqual({
      kind: "drop",
      reason: "unsaved-origin",
    });
  });

  it("without origin, opens on the only saved connection and drops with two or more", () => {
    expect(hostOf(target({ named: false }, one))).toBe("erp.example.com");
    expect(target({ named: false })).toEqual({ kind: "drop", reason: "unnamed-sender" });
    expect(target({ named: false }, [])).toEqual({ kind: "drop", reason: "no-connection" });
  });

  it("locked by the organization, opens only on the managed connection", () => {
    const locked = { serverUrl: ERP, lockServer: true };
    expect(hostOf(target(named(ERP), three, locked))).toBe("erp.example.com");
    expect(target(named(ACME), three, locked)).toEqual({ kind: "drop", reason: "server-locked" });
    // Locked to an address with no saved connection yet: nothing is open to a tap.
    const pending = { serverUrl: "https://mdm.example.com", lockServer: true };
    expect(target(named(ERP), three, pending)).toEqual({ kind: "drop", reason: "server-locked" });
    expect(target({ named: false }, one, pending)).toEqual({
      kind: "drop",
      reason: "server-locked",
    });
    // A managed address without the lock restricts nothing.
    expect(hostOf(target(named(ACME), three, { serverUrl: ERP, lockServer: false }))).toBe(
      "acme.objectos.ai:8443"
    );
  });
});

describe("pushTokenFromDevice", () => {
  it("maps a native token to the bridge shape", () => {
    expect(pushTokenFromDevice({ type: "ios", data: "apns-tok" })).toEqual({
      token: "apns-tok",
      vendor: "apns",
    });
    expect(pushTokenFromDevice({ type: "android", data: "fcm-tok" })).toEqual({
      token: "fcm-tok",
      vendor: "fcm",
    });
  });

  it("refuses anything that is not a native APNs / FCM string", () => {
    expect(pushTokenFromDevice(null)).toBeNull();
    expect(pushTokenFromDevice({ type: "ios", data: "" })).toBeNull();
    expect(
      pushTokenFromDevice({ type: "web", data: { endpoint: "x" } } as unknown as Notifications.DevicePushToken)
    ).toBeNull();
  });
});

describe("addPushTokenChangeListener", () => {
  const mockAdd = Notifications.addPushTokenListener as jest.Mock;

  beforeEach(() => {
    mockAdd.mockReset();
  });

  it("reports each rotated native token as { token, vendor }", () => {
    const remove = jest.fn();
    mockAdd.mockReturnValue({ remove });
    const seen: unknown[] = [];
    const sub = addPushTokenChangeListener((token) => seen.push(token));

    const osListener = mockAdd.mock.calls[0][0];
    osListener({ type: "android", data: "fcm-1" });
    osListener({ type: "android", data: "fcm-2" });
    osListener({ type: "android", data: "" });
    expect(seen).toEqual([
      { token: "fcm-1", vendor: "fcm" },
      { token: "fcm-2", vendor: "fcm" },
    ]);

    sub.remove();
    expect(remove).toHaveBeenCalledTimes(1);
  });

  it("is a no-op subscription where token events are unavailable", () => {
    mockAdd.mockImplementation(() => {
      throw new Error("removed from Expo Go");
    });
    const sub = addPushTokenChangeListener(jest.fn());
    expect(() => sub.remove()).not.toThrow();
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
