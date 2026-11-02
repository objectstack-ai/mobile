/**
 * Native screens lay out right-to-left under `ar`, as the Console does, and
 * left-to-right under every other shell language. The direction is Yoga's
 * `direction` style on each screen root, so it applies on first render and
 * follows a language change without a restart.
 */
import React from "react";
import { act, render, screen } from "@testing-library/react-native";
import { StyleSheet } from "react-native";
// Types for the matchers jest.config registers through setupFilesAfterEnv.
import type {} from "@testing-library/react-native/extend-expect";
import i18n from "~/lib/i18n";
import { layoutDirection } from "~/lib/rtl";

jest.mock("expo-router", () => ({
  useRouter: () => ({ dismissTo: jest.fn(), push: jest.fn(), replace: jest.fn() }),
}));

jest.mock("react-native-safe-area-context", () => {
  const { View } = require("react-native");
  return { SafeAreaView: View };
});

import ServerConfigScreen from "~/app/server-config";
import { OfflineFallback } from "~/components/shell/OfflineFallback";

/** The direction on the outermost host view the screen renders. */
function rootDirection(): unknown {
  const tree = screen.toJSON();
  const root = Array.isArray(tree) ? tree[0] : tree;
  return StyleSheet.flatten(root?.props.style)?.direction;
}

const offline = (
  <OfflineFallback
    failure={{ kind: "network" }}
    serverUrl="https://erp.example.com"
    onRetry={jest.fn()}
    onChangeServer={jest.fn()}
  />
);

/**
 * Cold-load cost, paid once outside any test's 5 s budget — the same warm-up as
 * ServerConfigScreen.test.tsx: react-native's lazy component getters are
 * required and transformed on the first render, which on a cold CI transform
 * cache exceeded the per-test timeout.
 */
const COLD_LOAD_TIMEOUT_MS = 30_000;
beforeAll(() => {
  render(<ServerConfigScreen />).unmount();
  render(offline).unmount();
}, COLD_LOAD_TIMEOUT_MS);

afterEach(async () => {
  await act(async () => {
    await i18n.changeLanguage("en");
  });
});

describe("layoutDirection", () => {
  it("is rtl for Arabic and ltr for the other nine shell languages", () => {
    expect(layoutDirection("ar")).toBe("rtl");
    for (const code of ["en", "zh", "ja", "ko", "de", "fr", "es", "pt", "ru"]) {
      expect(layoutDirection(code)).toBe("ltr");
    }
  });
});

describe("server picker", () => {
  it("renders left-to-right under en", () => {
    render(<ServerConfigScreen />);
    expect(rootDirection()).toBe("ltr");
  });

  it("renders right-to-left, in Arabic, under ar", async () => {
    await act(async () => {
      await i18n.changeLanguage("ar");
    });
    render(<ServerConfigScreen />);
    expect(rootDirection()).toBe("rtl");
    expect(screen.getByText("الاتصال بالخادم")).toBeTruthy();
  });

  it("flips direction live when the language changes while mounted", async () => {
    render(<ServerConfigScreen />);
    expect(rootDirection()).toBe("ltr");
    await act(async () => {
      await i18n.changeLanguage("ar");
    });
    expect(rootDirection()).toBe("rtl");
    await act(async () => {
      await i18n.changeLanguage("ja");
    });
    expect(rootDirection()).toBe("ltr");
    expect(screen.getByText("サーバーに接続")).toBeTruthy();
  });
});

describe("offline page", () => {
  it("renders right-to-left under ar and left-to-right under en", async () => {
    render(offline);
    expect(rootDirection()).toBe("ltr");
    await act(async () => {
      await i18n.changeLanguage("ar");
    });
    expect(rootDirection()).toBe("rtl");
    expect(screen.getByText("أنت غير متصل")).toBeTruthy();
  });
});
