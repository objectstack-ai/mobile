/**
 * E2E test — App Navigation
 *
 * Validates the 5-tab layout renders all tabs correctly and each
 * tab screen displays its expected content.
 */
import React from "react";
import { render } from "@testing-library/react-native";

/* ---- Mocks ---- */

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
  useSegments: () => [],
  useLocalSearchParams: () => ({}),
  Link: ({ children }: { children: React.ReactNode }) => children,
  Stack: { Screen: () => null },
  Tabs: Object.assign(
    ({ children }: { children: React.ReactNode }) => children,
    { Screen: () => null },
  ),
}));

jest.mock("~/lib/auth-client", () => ({
  authClient: {
    useSession: () => ({ data: { user: { name: "Test User", email: "test@example.com" } } }),
    signOut: jest.fn().mockResolvedValue(undefined),
  },
  reinitializeAuthClient: jest.fn(),
  getAuthBaseURL: () => "http://localhost:3000",
}));

// Stable singletons: returning fresh objects per render would change the
// `apps`/`client` references each render and re-trigger Home's fetch effect
// in a loop, leaving it stuck on the loading spinner.
jest.mock("~/hooks/useApps", () => {
  const appsResult = {
    apps: [
      { name: "CRM", label: "CRM", description: "Customer Relationship Management", packageId: "app.crm", navigation: [] },
      { name: "Inventory", label: "Inventory", description: "Inventory Management", packageId: "app.inv", navigation: [] },
    ],
    isLoading: false,
    error: null,
    refetch: jest.fn(),
  };
  return { useApps: () => appsResult };
});

jest.mock("@objectstack/client-react", () => {
  const client = { meta: { getItems: jest.fn().mockResolvedValue({ items: [] }) } };
  return { useClient: () => client };
});

jest.mock("~/hooks/useNotifications", () => ({
  useNotifications: () => ({
    notifications: [],
    unreadCount: 0,
    isLoading: false,
    error: null,
    fetchMore: jest.fn(),
    hasMore: false,
    markRead: jest.fn(),
    markAllRead: jest.fn(),
    registerDevice: jest.fn(),
    getPreferences: jest.fn(),
    updatePreferences: jest.fn(),
    refetch: jest.fn(),
  }),
}));

import HomeScreen from "~/app/(tabs)/index";
import SearchScreen from "~/app/(tabs)/search";
import AppsScreen from "~/app/(tabs)/apps";
import NotificationsScreen from "~/app/(tabs)/notifications";
import MoreScreen from "~/app/(tabs)/more";

describe("E2E: App Navigation — Tab Screens", () => {
  it("renders Home tab header and empty dashboards state", async () => {
    const { getByText, findByText } = render(<HomeScreen />);

    expect(getByText("Dashboard")).toBeTruthy();
    expect(getByText("Welcome back. Here's your overview.")).toBeTruthy();
    // Apps publish no dashboards in this mock, so Home shows its empty state.
    expect(await findByText("No Dashboards")).toBeTruthy();
  });

  it("renders Search tab with search input", () => {
    const { getByPlaceholderText, getByText } = render(<SearchScreen />);

    expect(
      getByPlaceholderText("Search objects, records..."),
    ).toBeTruthy();
    expect(
      getByText("Search across all your objects and records"),
    ).toBeTruthy();
    expect(getByText("Type to start searching")).toBeTruthy();
  });

  it("renders Apps tab with installed apps", () => {
    const { getByText } = render(<AppsScreen />);

    expect(getByText("Apps")).toBeTruthy();
    expect(getByText("2 apps installed")).toBeTruthy();
    expect(getByText("CRM")).toBeTruthy();
    expect(getByText("Customer Relationship Management")).toBeTruthy();
    expect(getByText("Inventory")).toBeTruthy();
  });

  it("renders Notifications tab with empty state", () => {
    const { getByText } = render(<NotificationsScreen />);

    expect(getByText("No Notifications")).toBeTruthy();
    expect(
      getByText(
        "You're all caught up. New notifications will appear here.",
      ),
    ).toBeTruthy();
  });

  it("renders More tab with menu sections", () => {
    const { getByText } = render(<MoreScreen />);

    expect(getByText("Test User")).toBeTruthy();
    expect(getByText("test@example.com")).toBeTruthy();
    expect(getByText("Preferences")).toBeTruthy();
    expect(getByText("Appearance")).toBeTruthy();
    expect(getByText("Language")).toBeTruthy();
    expect(getByText("Security")).toBeTruthy();
    expect(getByText("Security & Privacy")).toBeTruthy();
    expect(getByText("Settings")).toBeTruthy();
    expect(getByText("Support")).toBeTruthy();
    expect(getByText("Help & Support")).toBeTruthy();
    expect(getByText("About")).toBeTruthy();
    expect(getByText("Sign Out")).toBeTruthy();
  });
});
