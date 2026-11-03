import "react-native-gesture-handler/jestSetup";
import React from "react";
import { StyleSheet } from "react-native";
import { act, fireEvent, render, screen } from "@testing-library/react-native";
// Types for the matchers jest.config registers through setupFilesAfterEnv.
import type {} from "@testing-library/react-native/extend-expect";
import i18n from "~/lib/i18n";

const mockClose = jest.fn();

// The swipe itself is native (gesture handler + reanimated). The stand-in
// renders the row and the actions a left swipe reveals, so the sheet's own
// wiring — what the revealed Remove does, whether a row can be swiped — is
// what these tests read.
jest.mock("react-native-gesture-handler/ReanimatedSwipeable", () => {
  const React = require("react");
  const { View } = require("react-native");
  const MockSwipeable = React.forwardRef(function MockSwipeable(props: any, ref: any) {
    React.useImperativeHandle(ref, () => ({
      close: mockClose,
      openLeft: jest.fn(),
      openRight: jest.fn(),
      reset: jest.fn(),
    }));
    return (
      <View testID="swipeable" accessibilityState={{ disabled: props.enabled === false }}>
        {props.children}
        {props.renderRightActions?.({ value: 0 }, { value: 0 }, mockClose)}
      </View>
    );
  });
  return { __esModule: true, default: MockSwipeable };
});

import { ConnectionSwitcher, type ConnectionSwitcherProps } from "~/components/shell/ConnectionSwitcher";
import { EMPTY_CONNECTIONS, addConnection, type Connections } from "~/lib/connections/model";

function saved(): Connections {
  let state = addConnection(
    EMPTY_CONNECTIONS,
    {
      kind: "server",
      label: "Example ERP",
      serverUrl: "https://erp.example.com",
      brandColor: "#0f766e",
      initial: "E",
    },
    1
  );
  state = addConnection(
    state,
    {
      kind: "cloud",
      label: "Acme",
      serverUrl: "https://acme.objectos.ai",
      brandColor: "#4f46e5",
      initial: "A",
    },
    2
  );
  return { ...state, current: "erp.example.com" };
}

function renderSwitcher(overrides: Partial<ConnectionSwitcherProps> = {}) {
  const state = saved();
  const props: ConnectionSwitcherProps = {
    open: true,
    connections: state.list,
    currentHost: state.current,
    onClose: jest.fn(),
    onSelect: jest.fn(),
    onRemove: jest.fn(),
    onAdd: jest.fn(),
    onOpenSettings: jest.fn(),
    ...overrides,
  };
  render(<ConnectionSwitcher {...props} />);
  return props;
}

/**
 * Cold-load cost, paid once outside any test's 5 s budget — the same warm-up as
 * ServerConfigScreen.test.tsx: react-native's lazy component getters (Modal,
 * ScrollView, Pressable, ActivityIndicator) are required and transformed on
 * the first render, which on a cold CI transform cache can exceed the
 * per-test timeout.
 */
const COLD_LOAD_TIMEOUT_MS = 30_000;
beforeAll(() => {
  render(
    <ConnectionSwitcher
      open
      connections={saved().list}
      currentHost="erp.example.com"
      removingHost="acme.objectos.ai"
      onClose={() => {}}
      onSelect={() => {}}
      onRemove={() => {}}
      onAdd={() => {}}
      onOpenSettings={() => {}}
    />
  ).unmount();
}, COLD_LOAD_TIMEOUT_MS);

beforeEach(() => mockClose.mockClear());

afterEach(async () => {
  await act(async () => {
    await i18n.changeLanguage("en");
  });
});

describe("ConnectionSwitcher", () => {
  it("lists each connection with its initial, label, kind badge and host, and checks the current one", () => {
    renderSwitcher();
    expect(screen.getByText("Switch organization")).toBeTruthy();

    const erp = screen.getByTestId("switcher-row-erp.example.com");
    expect(erp).toHaveTextContent("Example ERP", { exact: false });
    expect(erp).toHaveTextContent("erp.example.com", { exact: false });
    expect(screen.getByTestId("switcher-kind-erp.example.com")).toHaveTextContent("Private");
    expect(screen.getByTestId("switcher-initial-erp.example.com")).toHaveTextContent("E");
    expect(screen.getByTestId("switcher-initial-erp.example.com")).toHaveStyle({
      backgroundColor: "#0f766e",
    });
    expect(erp).toHaveProp("accessibilityState", expect.objectContaining({ selected: true }));
    expect(screen.getByTestId("switcher-current-erp.example.com")).toBeTruthy();

    expect(screen.getByTestId("switcher-kind-acme.objectos.ai")).toHaveTextContent("Cloud");
    expect(screen.queryByTestId("switcher-current-acme.objectos.ai")).toBeNull();
    expect(screen.getByTestId("switcher-row-acme.objectos.ai")).toHaveProp(
      "accessibilityLabel",
      "Acme, Cloud, acme.objectos.ai"
    );
  });

  it("switches to a connection when its row is tapped", () => {
    const props = renderSwitcher();
    fireEvent.press(screen.getByTestId("switcher-row-acme.objectos.ai"));
    expect(props.onSelect).toHaveBeenCalledWith("acme.objectos.ai");
  });

  it("removes a connection from the action a left swipe reveals", () => {
    const props = renderSwitcher();
    const remove = screen.getByTestId("switcher-remove-acme.objectos.ai");
    expect(remove).toHaveTextContent("Remove");
    expect(remove).toHaveProp("accessibilityLabel", "Remove Acme");
    fireEvent.press(remove);
    expect(mockClose).toHaveBeenCalled();
    expect(props.onRemove).toHaveBeenCalledWith("acme.objectos.ai");
    expect(props.onSelect).not.toHaveBeenCalled();
  });

  it("offers Remove to screen readers as an action on the row", () => {
    const props = renderSwitcher();
    const row = screen.getByTestId("switcher-row-erp.example.com");
    expect(row).toHaveProp("accessibilityActions", [{ name: "remove", label: "Remove" }]);
    fireEvent(row, "accessibilityAction", { nativeEvent: { actionName: "remove" } });
    expect(props.onRemove).toHaveBeenCalledWith("erp.example.com");
    fireEvent(row, "accessibilityAction", { nativeEvent: { actionName: "activate" } });
    expect(props.onRemove).toHaveBeenCalledTimes(1);
  });

  it("while a removal runs: shows progress on that row and locks every row", () => {
    const props = renderSwitcher({ removingHost: "acme.objectos.ai" });
    expect(screen.getByTestId("switcher-removing-acme.objectos.ai")).toBeTruthy();
    expect(screen.queryByTestId("switcher-current-acme.objectos.ai")).toBeNull();
    for (const swipeable of screen.getAllByTestId("swipeable")) {
      expect(swipeable).toHaveProp("accessibilityState", { disabled: true });
    }
    fireEvent.press(screen.getByTestId("switcher-row-erp.example.com"));
    fireEvent.press(screen.getByTestId("switcher-remove-erp.example.com"));
    fireEvent(screen.getByTestId("switcher-row-erp.example.com"), "accessibilityAction", {
      nativeEvent: { actionName: "remove" },
    });
    expect(props.onSelect).not.toHaveBeenCalled();
    expect(props.onRemove).not.toHaveBeenCalled();
  });

  it("adds a connection through the address step, and links to app settings", () => {
    const props = renderSwitcher();
    const add = screen.getByTestId("switcher-add");
    expect(add).toHaveTextContent("Add an organization or company server");
    fireEvent.press(add);
    expect(props.onAdd).toHaveBeenCalled();

    expect(screen.getByTestId("switcher-footnote")).toHaveTextContent(
      "Each organization keeps its own sign-in. Swipe left to remove one and sign out of it."
    );
    const settings = screen.getByTestId("switcher-settings");
    expect(settings).toHaveTextContent("App settings");
    fireEvent.press(settings);
    expect(props.onOpenSettings).toHaveBeenCalled();
  });

  it("while the organization locks the server: no add, and no Remove on the managed connection", async () => {
    const props = renderSwitcher({ lockedHost: "erp.example.com" });
    expect(screen.queryByTestId("switcher-add")).toBeNull();
    expect(screen.queryByTestId("switcher-remove-erp.example.com")).toBeNull();
    const [erpSwipe, acmeSwipe] = screen.getAllByTestId("swipeable");
    expect(erpSwipe).toHaveProp("accessibilityState", { disabled: true });
    expect(acmeSwipe).toHaveProp("accessibilityState", { disabled: false });

    const erp = screen.getByTestId("switcher-row-erp.example.com");
    expect(erp).toHaveProp("accessibilityActions", []);
    fireEvent(erp, "accessibilityAction", { nativeEvent: { actionName: "remove" } });
    expect(props.onRemove).not.toHaveBeenCalled();

    // The managed row still switches; the other connections stay removable.
    fireEvent.press(erp);
    expect(props.onSelect).toHaveBeenCalledWith("erp.example.com");
    fireEvent.press(screen.getByTestId("switcher-remove-acme.objectos.ai"));
    expect(props.onRemove).toHaveBeenCalledWith("acme.objectos.ai");

    expect(screen.getByTestId("switcher-footnote")).toHaveTextContent(
      "Each organization keeps its own sign-in. Example ERP is set up by your organization and can't be removed."
    );

    await act(async () => {
      await i18n.changeLanguage("zh");
    });
    expect(screen.queryByText("添加组织或公司服务器")).toBeNull();
  });

  it("shows only the add action when nothing is saved", () => {
    renderSwitcher({ connections: [], currentHost: null });
    expect(screen.queryAllByTestId(/^switcher-row-/)).toEqual([]);
    expect(screen.getByTestId("switcher-add")).toBeTruthy();
  });

  it("offers App lock with its state, which opens the native settings screen", () => {
    const onOpenAppLock = jest.fn();
    renderSwitcher({ onOpenAppLock, appLockEnabled: false });
    expect(screen.getByTestId("switcher-app-lock")).toHaveTextContent(/App lock/);
    expect(screen.getByTestId("switcher-app-lock-state")).toHaveTextContent("Off");
    expect(screen.getByLabelText("App lock, Off")).toBeTruthy();
    fireEvent.press(screen.getByTestId("switcher-app-lock"));
    expect(onOpenAppLock).toHaveBeenCalledTimes(1);
  });

  it("reads On while the app lock is on", () => {
    renderSwitcher({ onOpenAppLock: jest.fn(), appLockEnabled: true });
    expect(screen.getByTestId("switcher-app-lock-state")).toHaveTextContent("On");
  });

  it("has no App lock row without a way to open it", () => {
    renderSwitcher();
    expect(screen.queryByTestId("switcher-app-lock")).toBeNull();
  });

  it("keeps App lock while the organization locks the server (the two locks are unrelated)", () => {
    renderSwitcher({ onOpenAppLock: jest.fn(), lockedHost: "erp.example.com" });
    expect(screen.queryByTestId("switcher-add")).toBeNull();
    expect(screen.getByTestId("switcher-app-lock")).toBeTruthy();
  });

  it("renders nothing while closed", () => {
    renderSwitcher({ open: false });
    expect(screen.queryByTestId("connection-switcher")).toBeNull();
  });

  it("closes from the backdrop", () => {
    const props = renderSwitcher();
    fireEvent.press(screen.getByLabelText("Close"));
    expect(props.onClose).toHaveBeenCalled();
  });

  it("lays out right-to-left, in Arabic, under ar", async () => {
    await act(async () => {
      await i18n.changeLanguage("ar");
    });
    renderSwitcher();
    const root = screen.getByTestId("connection-switcher");
    expect(StyleSheet.flatten(root.props.style)?.direction).toBe("rtl");
    expect(screen.getByText("تبديل المؤسسة")).toBeTruthy();
    expect(screen.getByTestId("switcher-kind-erp.example.com")).toHaveTextContent("خاص");
  });
});
