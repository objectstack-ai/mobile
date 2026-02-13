/**
 * E2E test — Authentication Flow
 *
 * Validates the sign-in screen renders correctly, handles form
 * validation, and triggers authentication on submit.
 */
import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react-native";
import { Alert } from "react-native";

/* ---- Mocks ---- */

const mockReplace = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: jest.fn(), replace: mockReplace, back: jest.fn() }),
  useSegments: () => [],
  useLocalSearchParams: () => ({}),
  Link: ({ children }: { children: React.ReactNode }) => children,
  Stack: { Screen: () => null },
}));

const mockSignInEmail = jest.fn();
const mockSignInSocial = jest.fn();
const mockSignOut = jest.fn();
jest.mock("~/lib/auth-client", () => ({
  authClient: {
    signIn: {
      email: (...args: unknown[]) => mockSignInEmail(...args),
      social: (...args: unknown[]) => mockSignInSocial(...args),
    },
    signOut: () => mockSignOut(),
    useSession: () => ({ data: null }),
  },
  reinitializeAuthClient: jest.fn(),
  getAuthBaseURL: () => "http://localhost:3000",
}));

jest.spyOn(Alert, "alert");

import SignInScreen from "~/app/(auth)/sign-in";

describe("E2E: Authentication Flow", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders the sign-in form with all required elements", () => {
    const { getByText, getByPlaceholderText } = render(<SignInScreen />);

    expect(getByText("Welcome back")).toBeTruthy();
    expect(getByText("Sign in to your account to continue.")).toBeTruthy();
    expect(getByText("Email")).toBeTruthy();
    expect(getByText("Password")).toBeTruthy();
    expect(getByPlaceholderText("you@company.com")).toBeTruthy();
    expect(getByPlaceholderText("Enter your password")).toBeTruthy();
    expect(getByText("Sign In")).toBeTruthy();
    expect(getByText("Continue with Google")).toBeTruthy();
  });

  it("shows validation error when fields are empty", () => {
    const { getByText } = render(<SignInScreen />);

    fireEvent.press(getByText("Sign In"));

    expect(Alert.alert).toHaveBeenCalledWith(
      "Error",
      "Please fill in all fields.",
    );
    expect(mockSignInEmail).not.toHaveBeenCalled();
  });

  it("submits credentials and navigates on success", async () => {
    mockSignInEmail.mockResolvedValueOnce({ error: null });

    const { getByText, getByPlaceholderText } = render(<SignInScreen />);

    fireEvent.changeText(
      getByPlaceholderText("you@company.com"),
      "test@example.com",
    );
    fireEvent.changeText(
      getByPlaceholderText("Enter your password"),
      "password123",
    );
    fireEvent.press(getByText("Sign In"));

    await waitFor(() => {
      expect(mockSignInEmail).toHaveBeenCalledWith({
        email: "test@example.com",
        password: "password123",
      });
    });

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith("/(tabs)");
    });
  });

  it("shows error alert when sign-in fails", async () => {
    mockSignInEmail.mockResolvedValueOnce({
      error: { message: "Invalid credentials" },
    });

    const { getByText, getByPlaceholderText } = render(<SignInScreen />);

    fireEvent.changeText(
      getByPlaceholderText("you@company.com"),
      "bad@example.com",
    );
    fireEvent.changeText(
      getByPlaceholderText("Enter your password"),
      "wrongpass",
    );
    fireEvent.press(getByText("Sign In"));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        "Sign In Failed",
        "Invalid credentials",
      );
    });
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("shows generic error on network failure", async () => {
    mockSignInEmail.mockRejectedValueOnce(new Error("Network error"));

    const { getByText, getByPlaceholderText } = render(<SignInScreen />);

    fireEvent.changeText(
      getByPlaceholderText("you@company.com"),
      "test@example.com",
    );
    fireEvent.changeText(
      getByPlaceholderText("Enter your password"),
      "password123",
    );
    fireEvent.press(getByText("Sign In"));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        "Error",
        "Something went wrong. Please try again.",
      );
    });
  });

  it("triggers social sign-in for Google", async () => {
    mockSignInSocial.mockResolvedValueOnce({});

    const { getByText } = render(<SignInScreen />);

    fireEvent.press(getByText("Continue with Google"));

    await waitFor(() => {
      expect(mockSignInSocial).toHaveBeenCalledWith({
        provider: "google",
        callbackURL: "/(tabs)",
      });
    });
  });

  it("has a link to the sign-up screen", () => {
    const { getByText } = render(<SignInScreen />);

    expect(getByText("Don't have an account?")).toBeTruthy();
    expect(getByText("Sign Up")).toBeTruthy();
  });
});
