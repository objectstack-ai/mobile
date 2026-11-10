import { act, renderHook, waitFor } from "@testing-library/react-native";
import * as Notifications from "expo-notifications";
import {
  usePushRouting,
  usePushTokenChanges,
  _resetRoutedNotifications,
} from "~/hooks/usePushRouting";
import { EMPTY_CONNECTIONS, addConnection } from "~/lib/connections/model";
import { NO_MANAGED_CONFIG, type ManagedConfig } from "~/lib/managed-config/model";
import { useServerStore } from "~/stores/server-store";
import { INITIAL_APP_LOCK_STATE, useSecurityStore } from "~/stores/security-store";

// The shared manual mock predates token events; add the one listener used here.
jest.mock("expo-notifications", () => ({
  ...jest.requireActual("../../__mocks__/expo-notifications"),
  addPushTokenListener: jest.fn(() => ({ remove: jest.fn() })),
}));

// The store persists a switch; the write itself is server-url's own tests'.
jest.mock("~/lib/server-url", () => ({
  loadConnections: jest.fn(),
  saveConnections: jest.fn(async () => undefined),
}));

const mockListen = Notifications.addNotificationResponseReceivedListener as jest.Mock;
const mockLast = Notifications.getLastNotificationResponseAsync as jest.Mock;
const ERP = "https://erp.example.com";
const ACME = "https://acme.objectos.ai";
const ERP_HOST = "erp.example.com";
const ACME_HOST = "acme.objectos.ai";

const response = (id: string, data: Record<string, unknown>) => ({
  notification: { request: { identifier: id, content: { data } } },
});

/** Saved connections (the first one current), loaded unless `isReady: false`. */
function seed(
  serverUrls: string[],
  opts: { isReady?: boolean; managed?: ManagedConfig } = {}
) {
  let state = EMPTY_CONNECTIONS;
  serverUrls.forEach((serverUrl, i) => {
    state = addConnection(
      state,
      { kind: "server", label: serverUrl, serverUrl, brandColor: "#000000", initial: "X" },
      i + 1
    );
  });
  const current = state.list[0] ?? null;
  useServerStore.setState({
    connections: state.list,
    currentHost: current?.host ?? null,
    pushLeftRegistered: [],
    serverUrl: current?.serverUrl ?? null,
    isReady: opts.isReady ?? true,
    managed: opts.managed ?? NO_MANAGED_CONFIG,
    managedDeclined: null,
  });
}

/** The tap listener the hook installed. */
function tap(id: string, data: Record<string, unknown>) {
  act(() => mockListen.mock.calls[0][0](response(id, data)));
}

/** The app lock as a return past the timeout leaves it. */
function lockApp() {
  act(() => {
    const { dispatch } = useSecurityStore.getState();
    dispatch({ type: "hydrated", settings: { enabled: true, timeoutSeconds: 300 } });
  });
}

function unlockApp() {
  act(() => {
    const { dispatch } = useSecurityStore.getState();
    dispatch({ type: "unlockStarted" });
    dispatch({ type: "unlockFinished", ok: true });
  });
}

/**
 * Renders the hook with an `onRoute` that records, with each route, the
 * connection that was current when it arrived.
 */
function renderRouting() {
  const routes: { route: string; current: string | null; serverUrl: string | null }[] = [];
  const onRoute = jest.fn((route: string) => {
    const { currentHost, serverUrl } = useServerStore.getState();
    routes.push({ route, current: currentHost, serverUrl });
  });
  const rendered = renderHook(() => usePushRouting(onRoute));
  return { onRoute, routes, ...rendered };
}

/** Lets the hook's async switch (the store's queued write) settle. */
async function settle() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

beforeEach(() => {
  _resetRoutedNotifications();
  mockListen.mockReset();
  mockListen.mockReturnValue({ remove: jest.fn() });
  mockLast.mockReset();
  mockLast.mockResolvedValue(null);
  useSecurityStore.setState(INITIAL_APP_LOCK_STATE);
  seed([ERP, ACME]);
});

describe("usePushRouting", () => {
  it("configures foreground presentation", () => {
    renderRouting();
    expect(Notifications.setNotificationHandler).toHaveBeenCalled();
  });

  it("rule 1: a push from the current connection routes there, with no switch", async () => {
    const { routes } = renderRouting();
    tap("n1", { route: "/apps/crm/lead/1", origin: ERP });
    await settle();
    expect(routes).toEqual([{ route: "/apps/crm/lead/1", current: ERP_HOST, serverUrl: ERP }]);
  });

  it("rule 2: a push from another saved connection switches to it, then routes", async () => {
    const { routes } = renderRouting();
    tap("n2", { route: "/apps/hr/leave/4", origin: ACME });
    await settle();
    // The route arrives only once the store's current connection is the sender.
    expect(routes).toEqual([{ route: "/apps/hr/leave/4", current: ACME_HOST, serverUrl: ACME }]);
    expect(useServerStore.getState().currentHost).toBe(ACME_HOST);
  });

  it("rule 2: a url key is checked against the sender's Console, not the current one", async () => {
    const { routes } = renderRouting();
    tap("n3", { url: `${ACME}/_console/apps/hr`, origin: ACME });
    await settle();
    expect(routes).toEqual([{ route: "/apps/hr", current: ACME_HOST, serverUrl: ACME }]);
  });

  it("rule 3: a push from a server that is not saved opens nothing and switches nothing", async () => {
    const { onRoute } = renderRouting();
    tap("n4", { route: "/apps/crm/lead/1", origin: "https://removed.example.com" });
    tap("n5", { route: "/apps/crm/lead/1", origin: "https://ACME.objectos.ai" });
    await settle();
    expect(onRoute).not.toHaveBeenCalled();
    expect(useServerStore.getState().currentHost).toBe(ERP_HOST);
  });

  it("rule 4: without origin, one saved connection routes there; two or more drop the route", async () => {
    const { onRoute, routes } = renderRouting();
    tap("n6", { route: "/apps/crm/lead/1" });
    await settle();
    expect(onRoute).not.toHaveBeenCalled();

    act(() => seed([ACME]));
    tap("n7", { route: "/apps/crm/lead/2" });
    await settle();
    expect(routes).toEqual([{ route: "/apps/crm/lead/2", current: ACME_HOST, serverUrl: ACME }]);
  });

  it("a push without a Console route switches nothing", async () => {
    const { onRoute } = renderRouting();
    tap("n8", { url: "https://evil.example.com/x", origin: ACME });
    await settle();
    expect(onRoute).not.toHaveBeenCalled();
    expect(useServerStore.getState().currentHost).toBe(ERP_HOST);
  });

  it("MDM lock: a push for a connection the lock does not allow is dropped, never switched to", async () => {
    seed([ERP, ACME], { managed: { serverUrl: ERP, lockServer: true } });
    const { routes } = renderRouting();
    tap("n9", { route: "/apps/hr", origin: ACME });
    await settle();
    expect(routes).toEqual([]);
    expect(useServerStore.getState().currentHost).toBe(ERP_HOST);

    tap("n10", { route: "/apps/crm", origin: ERP });
    await settle();
    expect(routes).toEqual([{ route: "/apps/crm", current: ERP_HOST, serverUrl: ERP }]);
  });

  it("app lock: a tap is held while the app is locked, then switches and routes once unlocked", async () => {
    lockApp();
    const { routes } = renderRouting();
    tap("n11", { route: "/apps/hr/leave/4", origin: ACME });
    await settle();
    expect(routes).toEqual([]);
    expect(useServerStore.getState().currentHost).toBe(ERP_HOST);

    unlockApp();
    await settle();
    expect(routes).toEqual([{ route: "/apps/hr/leave/4", current: ACME_HOST, serverUrl: ACME }]);
  });

  it("app lock: only the latest tap held under the lock is opened", async () => {
    lockApp();
    const { routes } = renderRouting();
    tap("n12", { route: "/apps/hr/leave/4", origin: ACME });
    tap("n13", { route: "/apps/crm/lead/9", origin: ERP });
    unlockApp();
    await settle();
    expect(routes).toEqual([{ route: "/apps/crm/lead/9", current: ERP_HOST, serverUrl: ERP }]);
  });

  it("waits for the saved connections to load before choosing one", async () => {
    seed([], { isReady: false });
    const { routes } = renderRouting();
    tap("n14", { route: "/apps/hr", origin: ACME });
    await settle();
    expect(routes).toEqual([]);

    act(() => seed([ERP, ACME]));
    await settle();
    expect(routes).toEqual([{ route: "/apps/hr", current: ACME_HOST, serverUrl: ACME }]);
  });

  it("cold start: the launching tap follows the same rules, and is routed once across the switch", async () => {
    seed([], { isReady: false });
    lockApp();
    mockLast.mockResolvedValue(response("cold", { route: "/apps/hr/leave/4", origin: ACME }));
    const { routes, rerender } = renderRouting();
    await settle();
    act(() => seed([ERP, ACME]));
    await settle();
    expect(routes).toEqual([]);

    unlockApp();
    await waitFor(() => expect(routes).toHaveLength(1));
    expect(routes[0]).toEqual({ route: "/apps/hr/leave/4", current: ACME_HOST, serverUrl: ACME });

    // The same response, delivered again by the listener or read again: not routed twice.
    tap("cold", { route: "/apps/hr/leave/4", origin: ACME });
    rerender({});
    await settle();
    expect(routes).toHaveLength(1);
  });

  it("cold start: a launching tap from a server no longer saved opens nothing", async () => {
    mockLast.mockResolvedValue(
      response("cold-gone", { route: "/apps/hr", origin: "https://removed.example.com" })
    );
    const { onRoute } = renderRouting();
    await settle();
    expect(mockLast).toHaveBeenCalledTimes(1);
    expect(onRoute).not.toHaveBeenCalled();
    expect(useServerStore.getState().currentHost).toBe(ERP_HOST);
  });

  it("stops listening on unmount", () => {
    const remove = jest.fn();
    mockListen.mockReturnValue({ remove });
    const { unmount } = renderRouting();
    unmount();
    expect(remove).toHaveBeenCalled();
  });
});

describe("usePushTokenChanges", () => {
  const mockAddToken = Notifications.addPushTokenListener as jest.Mock;

  beforeEach(() => {
    mockAddToken.mockReset();
    mockAddToken.mockReturnValue({ remove: jest.fn() });
  });

  it("reports a rotated token to the latest callback, subscribing once", () => {
    const first = jest.fn();
    const second = jest.fn();
    const { rerender } = renderHook(({ cb }) => usePushTokenChanges(cb), {
      initialProps: { cb: first },
    });
    rerender({ cb: second });
    expect(mockAddToken).toHaveBeenCalledTimes(1);

    mockAddToken.mock.calls[0][0]({ type: "ios", data: "apns-2" });
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledWith({ token: "apns-2", vendor: "apns" });
  });

  it("unsubscribes on unmount", () => {
    const remove = jest.fn();
    mockAddToken.mockReturnValue({ remove });
    const { unmount } = renderHook(() => usePushTokenChanges(jest.fn()));
    unmount();
    expect(remove).toHaveBeenCalledTimes(1);
  });
});
