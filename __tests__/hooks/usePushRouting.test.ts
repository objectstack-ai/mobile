import { renderHook, waitFor } from "@testing-library/react-native";
import * as Notifications from "expo-notifications";
import {
  usePushRouting,
  usePushTokenChanges,
  _resetRoutedNotifications,
} from "~/hooks/usePushRouting";

// The shared manual mock predates token events; add the one listener used here.
jest.mock("expo-notifications", () => ({
  ...jest.requireActual("../../__mocks__/expo-notifications"),
  addPushTokenListener: jest.fn(() => ({ remove: jest.fn() })),
}));

const mockListen = Notifications.addNotificationResponseReceivedListener as jest.Mock;
const mockLast = Notifications.getLastNotificationResponseAsync as jest.Mock;
const SERVER = "https://acme.example.com";

const response = (id: string, data: Record<string, unknown>) => ({
  notification: { request: { identifier: id, content: { data } } },
});

beforeEach(() => {
  _resetRoutedNotifications();
  mockListen.mockReset();
  mockListen.mockReturnValue({ remove: jest.fn() });
  mockLast.mockReset();
  mockLast.mockResolvedValue(null);
});

describe("usePushRouting", () => {
  it("configures foreground presentation", () => {
    renderHook(() => usePushRouting(null, jest.fn()));
    expect(Notifications.setNotificationHandler).toHaveBeenCalled();
  });

  it("does not listen until a server is configured", () => {
    renderHook(() => usePushRouting(null, jest.fn()));
    expect(mockListen).not.toHaveBeenCalled();
  });

  it("routes a tapped notification", () => {
    const onRoute = jest.fn();
    renderHook(() => usePushRouting(SERVER, onRoute));
    mockListen.mock.calls[0][0](response("n1", { route: "/apps/crm/lead/1" }));
    expect(onRoute).toHaveBeenCalledWith("/apps/crm/lead/1");
  });

  it("routes the cold-start notification once", async () => {
    const onRoute = jest.fn();
    mockLast.mockResolvedValue(response("n2", { route: "/home" }));
    const { rerender } = renderHook(({ s }) => usePushRouting(s, onRoute), {
      initialProps: { s: SERVER },
    });
    await waitFor(() => expect(onRoute).toHaveBeenCalledTimes(1));
    rerender({ s: `${SERVER}/` });
    await waitFor(() => expect(mockLast).toHaveBeenCalledTimes(2));
    expect(onRoute).toHaveBeenCalledTimes(1);
  });

  it("ignores payloads without a Console route", () => {
    const onRoute = jest.fn();
    renderHook(() => usePushRouting(SERVER, onRoute));
    mockListen.mock.calls[0][0](response("n3", { url: "https://evil.example.com/x" }));
    expect(onRoute).not.toHaveBeenCalled();
  });

  it("stops listening on unmount", () => {
    const remove = jest.fn();
    mockListen.mockReturnValue({ remove });
    const { unmount } = renderHook(() => usePushRouting(SERVER, jest.fn()));
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
