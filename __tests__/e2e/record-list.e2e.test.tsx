/**
 * E2E test — Record List
 *
 * Validates that the Apps screen lists discovered apps and that
 * tapping an app navigates to the correct route.
 */
import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react-native";

/* ---- Mocks ---- */

const mockPush = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn(), back: jest.fn() }),
  useSegments: () => [],
  useLocalSearchParams: () => ({}),
  Link: ({ children }: { children: React.ReactNode }) => children,
  Stack: { Screen: () => null },
}));

const mockRefetch = jest.fn();

let mockAppDiscoveryReturn: {
  apps: Array<{ id: string; name: string; label: string; description?: string }>;
  isLoading: boolean;
  error: Error | null;
  refetch: jest.Mock;
};

jest.mock("~/hooks/useAppDiscovery", () => ({
  useAppDiscovery: () => mockAppDiscoveryReturn,
}));

import AppsScreen from "~/app/(tabs)/apps";

describe("E2E: Record List — App Discovery & Navigation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAppDiscoveryReturn = {
      apps: [
        { id: "app_1", name: "CRM", label: "CRM", description: "Customer Relationship Management" },
        { id: "app_2", name: "Inventory", label: "Inventory", description: "Inventory Management" },
        { id: "app_3", name: "Support", label: "Support" },
      ],
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    };
  });

  it("displays all discovered apps", () => {
    const { getByText } = render(<AppsScreen />);

    expect(getByText("Apps")).toBeTruthy();
    expect(getByText("3 apps installed")).toBeTruthy();
    expect(getByText("CRM")).toBeTruthy();
    expect(getByText("Inventory")).toBeTruthy();
    expect(getByText("Support")).toBeTruthy();
  });

  it("shows app descriptions when available", () => {
    const { getByText, queryByText } = render(<AppsScreen />);

    expect(getByText("Customer Relationship Management")).toBeTruthy();
    expect(getByText("Inventory Management")).toBeTruthy();
    // Support has no description
    expect(queryByText("Support Management")).toBeNull();
  });

  it("navigates to app when pressed", () => {
    const { getByText } = render(<AppsScreen />);

    fireEvent.press(getByText("CRM"));

    expect(mockPush).toHaveBeenCalledWith("/(app)/CRM");
  });

  it("navigates to second app when pressed", () => {
    const { getByText } = render(<AppsScreen />);

    fireEvent.press(getByText("Inventory"));

    expect(mockPush).toHaveBeenCalledWith("/(app)/Inventory");
  });

  it("shows loading state while fetching", () => {
    mockAppDiscoveryReturn = {
      apps: [],
      isLoading: true,
      error: null,
      refetch: mockRefetch,
    };

    const { getByText } = render(<AppsScreen />);

    expect(getByText("Loading apps…")).toBeTruthy();
  });

  it("shows error state with retry button", () => {
    mockAppDiscoveryReturn = {
      apps: [],
      isLoading: false,
      error: new Error("Network error"),
      refetch: mockRefetch,
    };

    const { getByText } = render(<AppsScreen />);

    expect(getByText("Unable to Load Apps")).toBeTruthy();
    expect(getByText("Retry")).toBeTruthy();
  });

  it("retries fetching when retry button is pressed", () => {
    mockAppDiscoveryReturn = {
      apps: [],
      isLoading: false,
      error: new Error("Network error"),
      refetch: mockRefetch,
    };

    const { getByText } = render(<AppsScreen />);

    fireEvent.press(getByText("Retry"));

    expect(mockRefetch).toHaveBeenCalledTimes(1);
  });

  it("shows empty state when no apps installed", () => {
    mockAppDiscoveryReturn = {
      apps: [],
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    };

    const { getByText } = render(<AppsScreen />);

    expect(getByText("No Apps")).toBeTruthy();
    expect(
      getByText(
        "Your enterprise applications will appear here once installed.",
      ),
    ).toBeTruthy();
  });

  it("handles singular app count", () => {
    mockAppDiscoveryReturn = {
      apps: [{ id: "app_1", name: "CRM", label: "CRM" }],
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    };

    const { getByText } = render(<AppsScreen />);

    expect(getByText("1 app installed")).toBeTruthy();
  });
});
