import React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react-native";
import "~/lib/i18n";
import type { ProbeResult } from "~/lib/server-probe";

const mockDismissTo = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({ dismissTo: mockDismissTo, push: jest.fn(), replace: jest.fn() }),
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
import { useServerStore } from "~/stores/server-store";

const OK: ProbeResult = {
  kind: "ok",
  server: {
    serverUrl: "https://www.erp.example.com",
    secure: true,
    platformName: "ObjectOS",
    version: "17.4.0",
    productName: "Acme ERP",
    logoUrl: null,
    brandColor: null,
    signIn: null,
  },
};

const connect = jest.fn(async (url: string) => {
  useServerStore.setState({ serverUrl: url });
});

beforeEach(() => {
  mockProbeServer.mockReset();
  mockDismissTo.mockReset();
  connect.mockClear();
  useServerStore.setState({ serverUrl: null, connect });
});

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
    expect(connect).toHaveBeenCalledWith("https://www.erp.example.com");
    expect(mockDismissTo).toHaveBeenCalledWith("/console");
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

  it("shows the where-to-find-it steps and the VPN hint", () => {
    render(<ServerConfigScreen />);
    expect(screen.getByText("Where do I find the address?")).toBeTruthy();
    expect(screen.getByText(/A server on a company network may need/)).toBeTruthy();
  });
});
