import React from "react";
import { BackHandler } from "react-native";
import { act, fireEvent, render, screen } from "@testing-library/react-native";
// Types for the matchers jest.config registers through setupFilesAfterEnv.
import type {} from "@testing-library/react-native/extend-expect";
import "~/lib/i18n";
import type { ProbedServer, ProbeResult } from "~/lib/server-probe";

const mockDismissTo = jest.fn();
const mockPush = jest.fn();
// Whether a screen sits behind the picker (pushed over the Console) or not
// (the app cold-started onto it from a connect link).
const mockCanGoBack = jest.fn(() => false);
// The screen's search params: what a connect link or the scanner hands over,
// or the switcher's "add" entry.
let mockParams: { server?: string; n?: string; add?: string } = {};
jest.mock("expo-router", () => ({
  useRouter: () => ({
    dismissTo: mockDismissTo,
    push: mockPush,
    replace: jest.fn(),
    canGoBack: mockCanGoBack,
  }),
  useLocalSearchParams: () => mockParams,
  Redirect: ({ href }: { href: string }) => {
    const { Text } = require("react-native");
    return <Text testID="redirect">{href}</Text>;
  },
}));

jest.mock("react-native-safe-area-context", () => {
  const { View } = require("react-native");
  return { SafeAreaView: View };
});

const mockProbeServer = jest.fn<Promise<ProbeResult>, [string, unknown]>();
jest.mock("~/lib/server-probe", () => ({
  ...jest.requireActual("~/lib/server-probe"),
  probeServer: (input: string, opts: unknown) => mockProbeServer(input, opts),
}));

import ServerConfigScreen from "~/app/server-config";
import { xhrFetch } from "~/lib/server-probe";
import { EMPTY_CONNECTIONS, addConnection, connectionFromProbe } from "~/lib/connections/model";
import { NO_MANAGED_CONFIG, type ManagedConfig } from "~/lib/managed-config/model";
import { useServerStore } from "~/stores/server-store";

const PROBED: ProbedServer = {
  serverUrl: "https://www.erp.example.com",
  secure: true,
  platformName: "ObjectOS",
  version: "17.4.0",
  productName: "Acme ERP",
  logoUrl: null,
  brandColor: null,
  signIn: null,
};
const OK: ProbeResult = { kind: "ok", server: PROBED };

const connect = jest.fn(async (server: ProbedServer) => {
  useServerStore.setState({ serverUrl: server.serverUrl });
});

/**
 * Cold-load cost, paid once outside any test's 5 s budget. react-native exports
 * its components through lazy getters, so the first render requires and
 * babel-transforms them. Measured with a cold transform cache (`--no-cache -w 1
 * --coverage`, as on a fresh CI runner): Text ~1.0 s, ScrollView ~2.2 s, Image
 * ~0.4 s, then ~1.4 s more for the first render's remaining requires. The second
 * render takes ~7 ms. Left inside the first test, that cost exceeded the 5 s
 * timeout on CI.
 */
const COLD_LOAD_TIMEOUT_MS = 30_000;
beforeAll(() => {
  render(<ServerConfigScreen />).unmount();
}, COLD_LOAD_TIMEOUT_MS);

beforeEach(() => {
  mockParams = {};
  mockProbeServer.mockReset();
  mockDismissTo.mockReset();
  mockPush.mockReset();
  mockCanGoBack.mockReset().mockReturnValue(false);
  connect.mockClear();
  useServerStore.setState({
    serverUrl: null,
    connect,
    connections: [],
    managed: NO_MANAGED_CONFIG,
    managedDeclined: null,
  });
});

/** Let a probe started by an effect settle. */
async function flush() {
  await act(async () => {});
}

async function submit(address: string) {
  fireEvent.changeText(screen.getByTestId("server-url-input"), address);
  await act(async () => {
    fireEvent.press(screen.getByTestId("server-connect"));
  });
}

describe("ServerConfigScreen", () => {
  it("probes with the XHR transport and saves nothing before the user confirms", async () => {
    mockProbeServer.mockResolvedValue(OK);
    render(<ServerConfigScreen />);
    await submit("erp.example.com");

    expect(mockProbeServer).toHaveBeenCalledWith(
      "erp.example.com",
      expect.objectContaining({ fetch: xhrFetch })
    );
    expect(screen.getByTestId("server-confirm-name")).toHaveTextContent("Acme ERP");
    expect(connect).not.toHaveBeenCalled();
    expect(useServerStore.getState().serverUrl).toBeNull();

    await act(async () => {
      fireEvent.press(screen.getByTestId("server-confirm"));
    });
    expect(connect).toHaveBeenCalledWith(PROBED);
    expect(mockDismissTo).toHaveBeenCalledWith("/console");
  });

  it("from the switcher's add entry, starts with an empty address, not the current server's", () => {
    useServerStore.setState({ serverUrl: "https://old.example.com" });
    mockParams = { add: "1" };
    mockCanGoBack.mockReturnValue(true);
    render(<ServerConfigScreen />);
    expect(screen.getByTestId("server-url-input").props.value).toBe("");
    expect(connect).not.toHaveBeenCalled();
  });

  it("without the add entry, starts with the current server's address", () => {
    useServerStore.setState({ serverUrl: "https://old.example.com" });
    mockCanGoBack.mockReturnValue(true);
    render(<ServerConfigScreen />);
    expect(screen.getByTestId("server-url-input").props.value).toBe("https://old.example.com");
  });

  it("'Not this server' returns to the address step with the address kept, saving nothing", async () => {
    mockProbeServer.mockResolvedValue(OK);
    render(<ServerConfigScreen />);
    await submit("erp.example.com");
    fireEvent.press(screen.getByTestId("server-reject"));

    expect(screen.getByTestId("server-url-input").props.value).toBe("erp.example.com");
    expect(connect).not.toHaveBeenCalled();
    expect(mockDismissTo).not.toHaveBeenCalled();
  });

  it.each<[ProbeResult, string]>([
    [{ kind: "not-objectos" }, "This isn't an ObjectOS server."],
    [{ kind: "tls" }, "The server's certificate is invalid"],
    [{ kind: "unreachable" }, "Could not reach the server."],
    [{ kind: "timeout" }, "The server took too long to answer."],
    [{ kind: "insecure-http" }, "Use an https:// address"],
    [{ kind: "server-error", status: 502 }, "(HTTP 502)"],
    [{ kind: "empty" }, "Please enter a server URL."],
    [{ kind: "invalid" }, "That doesn't look like a server address."],
  ])("shows its own message for %j", async (result, text) => {
    mockProbeServer.mockResolvedValue(result);
    render(<ServerConfigScreen />);
    await submit("erp.example.com");
    expect(screen.getByTestId("server-url-message")).toHaveTextContent(text, { exact: false });
    expect(connect).not.toHaveBeenCalled();
  });

  it("ignores a probe that finishes after the address was edited", async () => {
    let resolveProbe: (r: ProbeResult) => void = () => {};
    mockProbeServer.mockReturnValue(new Promise((r) => (resolveProbe = r)));
    render(<ServerConfigScreen />);
    fireEvent.changeText(screen.getByTestId("server-url-input"), "erp.example.com");
    fireEvent.press(screen.getByTestId("server-connect"));
    fireEvent.changeText(screen.getByTestId("server-url-input"), "other.example.com");
    await act(async () => resolveProbe(OK));

    expect(screen.queryByTestId("server-confirm")).toBeNull();
    expect(screen.getByTestId("server-url-input").props.value).toBe("other.example.com");
  });

  it("opens the scanner from the button in the address field", () => {
    render(<ServerConfigScreen />);
    const scan = screen.getByTestId("server-scan");
    expect(scan).toHaveProp("accessibilityLabel", "Scan QR code");
    fireEvent.press(scan);
    expect(mockPush).toHaveBeenCalledWith("/connect-scan");
  });

  it("probes a linked or scanned address and shows the confirm step, saving nothing", async () => {
    mockProbeServer.mockResolvedValue(OK);
    mockParams = { server: "https://erp.example.com", n: "1" };
    render(<ServerConfigScreen />);
    await flush();

    expect(mockProbeServer).toHaveBeenCalledTimes(1);
    expect(mockProbeServer).toHaveBeenCalledWith("https://erp.example.com", expect.anything());
    expect(screen.getByTestId("server-confirm-name")).toHaveTextContent("Acme ERP");
    expect(connect).not.toHaveBeenCalled();
  });

  it("with a server already saved, still asks; confirming adds the server and makes it current", async () => {
    useServerStore.setState({ serverUrl: "https://old.example.com" });
    mockProbeServer.mockResolvedValue(OK);
    mockParams = { server: "https://erp.example.com", n: "1" };
    render(<ServerConfigScreen />);
    await flush();
    expect(useServerStore.getState().serverUrl).toBe("https://old.example.com");

    await act(async () => {
      fireEvent.press(screen.getByTestId("server-confirm"));
    });
    expect(connect).toHaveBeenCalledWith(PROBED);
    expect(useServerStore.getState().serverUrl).toBe("https://www.erp.example.com");
  });

  it("shows an unusable linked address in the field with its error", async () => {
    mockProbeServer.mockResolvedValue({ kind: "insecure-http" });
    mockParams = { server: "http://erp.example.com", n: "1" };
    render(<ServerConfigScreen />);
    await flush();

    expect(screen.getByTestId("server-url-input").props.value).toBe("http://erp.example.com");
    expect(screen.getByTestId("server-url-message")).toHaveTextContent("Use an https:// address", {
      exact: false,
    });
    expect(screen.queryByTestId("server-confirm")).toBeNull();
  });

  it("probes again for each new request, even for the same address", async () => {
    mockProbeServer.mockResolvedValue({ kind: "unreachable" });
    mockParams = { server: "https://erp.example.com", n: "1" };
    const view = render(<ServerConfigScreen />);
    await flush();
    view.rerender(<ServerConfigScreen />);
    expect(mockProbeServer).toHaveBeenCalledTimes(1);

    mockProbeServer.mockResolvedValue(OK);
    mockParams = { server: "https://erp.example.com", n: "2" };
    view.rerender(<ServerConfigScreen />);
    await flush();
    expect(mockProbeServer).toHaveBeenCalledTimes(2);
    expect(screen.getByTestId("server-confirm")).toBeTruthy();
  });

  describe("way back to the saved server", () => {
    it("cold-started onto the picker with a server saved: offers it, and confirm's 'Not this server' keeps it", async () => {
      useServerStore.setState({ serverUrl: "https://old.example.com" });
      mockProbeServer.mockResolvedValue(OK);
      mockParams = { server: "https://erp.example.com", n: "1" };
      render(<ServerConfigScreen />);
      await flush();

      // Confirm step: no way back there, "Not this server" behaves as before.
      expect(screen.queryByTestId("server-back-to-saved")).toBeNull();
      fireEvent.press(screen.getByTestId("server-reject"));
      expect(screen.getByTestId("server-url-input").props.value).toBe("https://erp.example.com");

      const back = screen.getByTestId("server-back-to-saved");
      expect(back).toHaveTextContent("Back to old.example.com");
      fireEvent.press(back);
      expect(mockDismissTo).toHaveBeenCalledWith("/console");
      expect(connect).not.toHaveBeenCalled();
      expect(useServerStore.getState().serverUrl).toBe("https://old.example.com");
    });

    it("Android back on the address step does the same", () => {
      useServerStore.setState({ serverUrl: "https://old.example.com" });
      let handler: (() => boolean | null | undefined) | undefined;
      const spy = jest.spyOn(BackHandler, "addEventListener").mockImplementation((_e, h) => {
        handler = h;
        return { remove: jest.fn() };
      });
      try {
        render(<ServerConfigScreen />);
        expect(handler?.()).toBe(true);
        expect(mockDismissTo).toHaveBeenCalledWith("/console");
      } finally {
        spy.mockRestore();
      }
    });

    it("pushed over the Console (a screen to go back to): no extra way back", () => {
      useServerStore.setState({ serverUrl: "https://old.example.com" });
      mockCanGoBack.mockReturnValue(true);
      const spy = jest.spyOn(BackHandler, "addEventListener");
      try {
        render(<ServerConfigScreen />);
        expect(screen.queryByTestId("server-back-to-saved")).toBeNull();
        expect(spy).not.toHaveBeenCalled();
      } finally {
        spy.mockRestore();
      }
    });

    it("with no saved server, nothing changes", () => {
      const spy = jest.spyOn(BackHandler, "addEventListener");
      try {
        render(<ServerConfigScreen />);
        expect(screen.queryByTestId("server-back-to-saved")).toBeNull();
        expect(spy).not.toHaveBeenCalled();
      } finally {
        spy.mockRestore();
      }
    });
  });

  it("shows the where-to-find-it steps and the VPN hint", () => {
    render(<ServerConfigScreen />);
    expect(screen.getByText("Where do I find the address?")).toBeTruthy();
    expect(screen.getByText(/A server on a company network may need/)).toBeTruthy();
  });
});

describe("ServerConfigScreen — managed deployment (MDM)", () => {
  const MANAGED: ManagedConfig = { serverUrl: "https://erp.example.com", lockServer: false };
  const LOCKED: ManagedConfig = { ...MANAGED, lockServer: true };

  function managedBy(managed: ManagedConfig) {
    useServerStore.setState({ managed });
  }

  it("probes the managed address at once, with no address step or scanner, then confirms it", async () => {
    managedBy(MANAGED);
    mockProbeServer.mockResolvedValue(OK);
    render(<ServerConfigScreen />);
    expect(screen.queryByTestId("server-url-input")).toBeNull();
    expect(screen.queryByTestId("server-scan")).toBeNull();
    await flush();

    // The managed value never skips the probe or the confirm step.
    expect(mockProbeServer).toHaveBeenCalledWith(
      "https://erp.example.com",
      expect.objectContaining({ fetch: xhrFetch })
    );
    expect(screen.getByTestId("server-confirm-name")).toHaveTextContent("Acme ERP");
    expect(connect).not.toHaveBeenCalled();

    await act(async () => {
      fireEvent.press(screen.getByTestId("server-confirm"));
    });
    expect(connect).toHaveBeenCalledWith(PROBED, { managedFrom: "https://erp.example.com" });
    expect(mockDismissTo).toHaveBeenCalledWith("/console");
  });

  it("shows checking while the probe runs", () => {
    managedBy(MANAGED);
    mockProbeServer.mockReturnValue(new Promise(() => {}));
    render(<ServerConfigScreen />);
    expect(screen.getByText("Set up by your organization")).toBeTruthy();
    expect(screen.getByTestId("managed-address")).toHaveTextContent("erp.example.com");
    expect(screen.getByTestId("managed-checking")).toBeTruthy();
  });

  it("locked, a failed probe shows the error with 'contact your IT administrator' and no way to edit", async () => {
    managedBy(LOCKED);
    mockProbeServer.mockResolvedValue({ kind: "unreachable" });
    render(<ServerConfigScreen />);
    await flush();

    expect(screen.getByTestId("managed-error")).toHaveTextContent("Could not reach the server.", {
      exact: false,
    });
    expect(screen.getByTestId("managed-contact-it")).toHaveTextContent(
      "Please contact your IT administrator."
    );
    expect(screen.getByTestId("managed-locked")).toBeTruthy();
    expect(screen.queryByTestId("managed-edit")).toBeNull();
    expect(screen.queryByTestId("server-url-input")).toBeNull();

    mockProbeServer.mockResolvedValue(OK);
    await act(async () => {
      fireEvent.press(screen.getByTestId("managed-retry"));
    });
    expect(mockProbeServer).toHaveBeenCalledTimes(2);
    expect(screen.getByTestId("server-confirm-name")).toHaveTextContent("Acme ERP");
  });

  it("shows 「请联系 IT 管理员」 in Chinese", async () => {
    const i18n = require("~/lib/i18n").default;
    await act(async () => {
      await i18n.changeLanguage("zh");
    });
    try {
      managedBy(LOCKED);
      mockProbeServer.mockResolvedValue({ kind: "timeout" });
      render(<ServerConfigScreen />);
      await flush();
      expect(screen.getByTestId("managed-contact-it")).toHaveTextContent("请联系 IT 管理员。");
    } finally {
      await act(async () => {
        await i18n.changeLanguage("en");
      });
    }
  });

  it("locked, 'Not this server' offers nothing to edit, only contact IT and try again", async () => {
    managedBy(LOCKED);
    mockProbeServer.mockResolvedValue(OK);
    render(<ServerConfigScreen />);
    await flush();
    fireEvent.press(screen.getByTestId("server-reject"));

    expect(screen.getByTestId("managed-contact-it")).toBeTruthy();
    expect(screen.queryByTestId("managed-edit")).toBeNull();
    expect(screen.queryByTestId("server-url-input")).toBeNull();
    expect(useServerStore.getState().managedDeclined).toBeNull();
  });

  it("unlocked, 'Enter a different address' opens the address step with the managed address", async () => {
    managedBy(MANAGED);
    mockProbeServer.mockResolvedValue({ kind: "not-objectos" });
    render(<ServerConfigScreen />);
    await flush();
    expect(screen.getByTestId("managed-contact-it")).toBeTruthy();

    await act(async () => {
      fireEvent.press(screen.getByTestId("managed-edit"));
    });
    expect(useServerStore.getState().managedDeclined).toBe("https://erp.example.com");
    expect(screen.getByTestId("server-url-input").props.value).toBe("https://erp.example.com");
    expect(screen.getByTestId("server-url-message")).toHaveTextContent(
      "This isn't an ObjectOS server.",
      {
        exact: false,
      }
    );

    mockProbeServer.mockResolvedValue(OK);
    await submit("other.example.com");
    await act(async () => {
      fireEvent.press(screen.getByTestId("server-confirm"));
    });
    expect(connect).toHaveBeenCalledWith(PROBED);
  });

  it("unlocked, a connect link still opens the address flow for the linked server", async () => {
    managedBy(MANAGED);
    mockProbeServer.mockResolvedValue(OK);
    mockParams = { server: "https://other.example.com", n: "1" };
    render(<ServerConfigScreen />);
    await flush();
    expect(mockProbeServer).toHaveBeenCalledTimes(1);
    expect(mockProbeServer).toHaveBeenCalledWith("https://other.example.com", expect.anything());
  });

  it("locked and not yet saved, a connect link cannot bring another address in", async () => {
    managedBy(LOCKED);
    mockProbeServer.mockResolvedValue(OK);
    mockParams = { server: "https://other.example.com", n: "1" };
    render(<ServerConfigScreen />);
    await flush();
    expect(mockProbeServer).toHaveBeenCalledTimes(1);
    expect(mockProbeServer).toHaveBeenCalledWith("https://erp.example.com", expect.anything());
  });

  it("locked with the managed server saved, the picker goes back to the Console", () => {
    const saved = addConnection(
      EMPTY_CONNECTIONS,
      connectionFromProbe({ ...PROBED, serverUrl: "https://erp.example.com" }),
      1
    );
    useServerStore.setState({ connections: saved.list, serverUrl: "https://erp.example.com" });
    managedBy(LOCKED);
    mockParams = { add: "1" };
    render(<ServerConfigScreen />);
    expect(screen.getByTestId("redirect")).toHaveTextContent("/console");
    expect(mockProbeServer).not.toHaveBeenCalled();
  });

  it("unlocked with the managed server saved, the picker is the ordinary one", () => {
    const saved = addConnection(
      EMPTY_CONNECTIONS,
      connectionFromProbe({ ...PROBED, serverUrl: "https://erp.example.com" }),
      1
    );
    useServerStore.setState({ connections: saved.list, serverUrl: "https://erp.example.com" });
    managedBy(MANAGED);
    mockParams = { add: "1" };
    render(<ServerConfigScreen />);
    expect(screen.getByTestId("server-url-input").props.value).toBe("");
    expect(mockProbeServer).not.toHaveBeenCalled();
  });
});
