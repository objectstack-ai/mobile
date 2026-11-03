/**
 * The sign-in excursion bar (design screen 3) and the notice shown when an
 * excursion ends without returning.
 */
import React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { StyleSheet } from "react-native";
// Types for the matchers jest.config registers through setupFilesAfterEnv.
import type {} from "@testing-library/react-native/extend-expect";
import i18n from "~/lib/i18n";
import { SignInExcursionBar, SignInExcursionNotice } from "~/components/shell/SignInExcursionBar";

afterEach(async () => {
  await act(async () => {
    await i18n.changeLanguage("en");
  });
});

describe("SignInExcursionBar", () => {
  it("shows the lock, the exact host, which server the sign-in is for, and Cancel", () => {
    const onCancel = jest.fn();
    render(
      <SignInExcursionBar
        host="login.idp-corp.example:8443"
        serverLabel="Acme ERP"
        onCancel={onCancel}
      />
    );
    expect(screen.getByTestId("shell-excursion-lock")).toHaveProp(
      "accessibilityLabel",
      "Secure connection"
    );
    expect(screen.getByTestId("shell-excursion-host")).toHaveTextContent(
      "login.idp-corp.example:8443"
    );
    expect(screen.getByText("Signing in on an external page · Acme ERP")).toBeTruthy();
    fireEvent.press(screen.getByTestId("shell-excursion-cancel"));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("reads 正在外部页面登录 · <server label> and 取消 in Chinese", async () => {
    await act(async () => {
      await i18n.changeLanguage("zh");
    });
    render(
      <SignInExcursionBar host="sso.corp.example" serverLabel="Acme ERP" onCancel={jest.fn()} />
    );
    expect(screen.getByText("正在外部页面登录 · Acme ERP")).toBeTruthy();
    expect(screen.getByText("取消")).toBeTruthy();
  });

  it("keeps the end of a long host visible, left to right even under Arabic", async () => {
    await act(async () => {
      await i18n.changeLanguage("ar");
    });
    render(
      <SignInExcursionBar
        host="login.microsoftonline.com.attacker.example"
        serverLabel="Acme"
        onCancel={jest.fn()}
      />
    );
    const host = screen.getByTestId("shell-excursion-host");
    expect(host).toHaveProp("ellipsizeMode", "head");
    expect(host).toHaveProp("numberOfLines", 1);
    expect(StyleSheet.flatten(host.props.style)).toMatchObject({ writingDirection: "ltr" });
    expect(StyleSheet.flatten(screen.getByTestId("shell-excursion-bar").props.style)).toMatchObject(
      { direction: "rtl" }
    );
  });
});

describe("SignInExcursionNotice", () => {
  it.each([
    [
      "redirects",
      "The sign-in page redirected too many times. Try again, or ask your administrator.",
    ],
    ["timeout", "Sign-in took longer than 10 minutes. Start again."],
    [
      "insecure",
      "The sign-in page tried to continue over an insecure (http) connection, so it was stopped.",
    ],
    [
      "unsupported",
      "This sign-in method isn't supported in the app yet. Choose another way to sign in.",
    ],
  ] as const)("explains %s", (reason, text) => {
    render(<SignInExcursionNotice reason={reason} onDismiss={jest.fn()} />);
    expect(screen.getByText("Sign-in didn't finish")).toBeTruthy();
    expect(screen.getByTestId(`shell-excursion-notice-${reason}`)).toHaveTextContent(text);
  });

  it("can be dismissed", () => {
    const onDismiss = jest.fn();
    render(<SignInExcursionNotice reason="timeout" onDismiss={onDismiss} />);
    fireEvent.press(screen.getByTestId("shell-excursion-notice-dismiss"));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
