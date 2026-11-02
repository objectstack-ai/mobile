import React from "react";
import { BackHandler } from "react-native";
import { fireEvent, render, screen } from "@testing-library/react-native";
// Types for the matchers jest.config registers through setupFilesAfterEnv.
import type {} from "@testing-library/react-native/extend-expect";
import "~/lib/i18n";
import { ServerConfirm } from "~/components/shell/ServerConfirm";
import { DEFAULT_BRAND_COLOR, type ProbedServer } from "~/lib/server-probe";

const SERVER: ProbedServer = {
  serverUrl: "https://erp.example.com",
  secure: true,
  platformName: "ObjectOS",
  version: "17.4.0",
  productName: "Acme ERP",
  logoUrl: "https://cdn.example.com/acme.png",
  brandColor: "#0f766e",
  signIn: { emailPassword: true, sso: true, ssoEnforced: false, providers: ["GitHub"] },
};

function renderConfirm(server: Partial<ProbedServer> = {}, props: Record<string, unknown> = {}) {
  const onConfirm = jest.fn();
  const onReject = jest.fn();
  render(
    <ServerConfirm
      server={{ ...SERVER, ...server }}
      onConfirm={onConfirm}
      onReject={onReject}
      {...props}
    />
  );
  return { onConfirm, onReject };
}

describe("ServerConfirm", () => {
  it("shows the logo, product name, full URL, lock row, sign-in methods and version", () => {
    renderConfirm();
    expect(screen.getByTestId("server-confirm-logo").props.source).toEqual({
      uri: "https://cdn.example.com/acme.png",
    });
    expect(screen.queryByTestId("server-confirm-initial")).toBeNull();
    expect(screen.getByTestId("server-confirm-name")).toHaveTextContent("Acme ERP");
    expect(screen.getByTestId("server-confirm-url")).toHaveTextContent("https://erp.example.com");
    expect(screen.getByTestId("server-confirm-secure")).toHaveTextContent(
      "Secure connection (HTTPS)"
    );
    expect(screen.getByTestId("server-confirm-sign-in")).toHaveTextContent(
      "Sign in withSingle sign-on (SSO) · Email and password · GitHub"
    );
    expect(screen.getByTestId("server-confirm-version")).toHaveTextContent(
      "Platform versionObjectOS 17.4.0"
    );
  });

  it("falls back to the initial on the brand colour when there is no logo", () => {
    renderConfirm({ logoUrl: null });
    const initial = screen.getByTestId("server-confirm-initial");
    expect(initial).toHaveTextContent("A");
    expect(initial).toHaveStyle({ backgroundColor: "#0f766e" });
  });

  it("falls back to the initial when the logo fails to load", () => {
    renderConfirm();
    fireEvent(screen.getByTestId("server-confirm-logo"), "error");
    expect(screen.getByTestId("server-confirm-initial")).toHaveTextContent("A");
  });

  it("without branding shows the platform name and its initial on the default colour", () => {
    renderConfirm({ productName: null, logoUrl: null, brandColor: null });
    expect(screen.getByTestId("server-confirm-name")).toHaveTextContent("ObjectOS");
    const initial = screen.getByTestId("server-confirm-initial");
    expect(initial).toHaveTextContent("O");
    expect(initial).toHaveStyle({ backgroundColor: DEFAULT_BRAND_COLOR });
  });

  it("has no lock row for plain http", () => {
    renderConfirm({ serverUrl: "http://192.168.1.20:3000", secure: false });
    expect(screen.queryByTestId("server-confirm-secure")).toBeNull();
  });

  it("hides the sign-in row when the methods are unknown", () => {
    renderConfirm({ signIn: null });
    expect(screen.queryByTestId("server-confirm-sign-in")).toBeNull();
  });

  it("confirms and rejects through its two actions", () => {
    const { onConfirm, onReject } = renderConfirm();
    expect(screen.getByTestId("server-confirm")).toHaveTextContent("Connect and sign in");
    expect(screen.getByTestId("server-reject")).toHaveTextContent("Not this server");
    fireEvent.press(screen.getByTestId("server-confirm"));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    fireEvent.press(screen.getByTestId("server-reject"));
    expect(onReject).toHaveBeenCalledTimes(1);
  });

  it("treats Android back as 'not this server'", () => {
    const remove = jest.fn();
    let handler: (() => boolean) | undefined;
    const spy = jest.spyOn(BackHandler, "addEventListener").mockImplementation((_e, h) => {
      handler = h as () => boolean;
      return { remove };
    });
    const { onReject } = renderConfirm();
    expect(handler?.()).toBe(true);
    expect(onReject).toHaveBeenCalledTimes(1);
    spy.mockRestore();
  });

  it("shows a save error", () => {
    renderConfirm({}, { error: "Something went wrong. Please try again." });
    expect(screen.getByTestId("server-confirm-error")).toHaveTextContent(
      "Something went wrong. Please try again."
    );
  });
});
