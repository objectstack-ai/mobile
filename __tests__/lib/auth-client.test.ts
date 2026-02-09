/**
 * Tests for lib/auth-client – validates auth client creation
 * and re-initialization.
 */

/* ---- Mock external dependencies ---- */
jest.mock("better-auth/react", () => ({
  createAuthClient: jest.fn(({ baseURL }: { baseURL: string }) => ({
    __baseURL: baseURL,
    signIn: jest.fn(),
    signUp: jest.fn(),
    signOut: jest.fn(),
  })),
}));

jest.mock("@better-auth/expo/client", () => ({
  expoClient: jest.fn(({ scheme }: { scheme: string }) => ({
    __plugin: "expo",
    scheme,
  })),
}));

jest.mock("expo-secure-store", () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

import {
  authClient,
  reinitializeAuthClient,
  getAuthBaseURL,
} from "~/lib/auth-client";
import { createAuthClient } from "better-auth/react";

describe("auth-client", () => {
  it("creates auth client with default base URL", () => {
    // authClient should be created on module load
    expect(createAuthClient).toHaveBeenCalled();
    expect(authClient).toBeDefined();
  });

  it("getAuthBaseURL returns the current URL", () => {
    const url = getAuthBaseURL();
    expect(typeof url).toBe("string");
    expect(url.length).toBeGreaterThan(0);
  });

  it("reinitializeAuthClient updates the base URL", () => {
    const callsBefore = (createAuthClient as jest.Mock).mock.calls.length;

    reinitializeAuthClient("https://new-server.example.com");

    expect(getAuthBaseURL()).toBe("https://new-server.example.com");
    expect((createAuthClient as jest.Mock).mock.calls.length).toBe(
      callsBefore + 1,
    );
  });

  it("reinitializeAuthClient creates new client with expo plugin", () => {
    reinitializeAuthClient("https://another.example.com");

    const lastCall = (createAuthClient as jest.Mock).mock.calls.at(-1)![0];
    expect(lastCall.baseURL).toBe("https://another.example.com");
    expect(lastCall.plugins).toBeDefined();
    expect(lastCall.plugins).toHaveLength(1);
  });
});
