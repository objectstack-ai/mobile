/**
 * Tests for useAccount — self-service identity management over client.auth.*.
 */
import { renderHook, act } from "@testing-library/react-native";

const mockUpdateUser = jest.fn();
const mockChangePassword = jest.fn();
const mockChangeEmail = jest.fn();
const mockSendVerificationEmail = jest.fn();

const mockClient = {
  auth: {
    updateUser: mockUpdateUser,
    changePassword: mockChangePassword,
    changeEmail: mockChangeEmail,
    sendVerificationEmail: mockSendVerificationEmail,
  },
};

jest.mock("@objectstack/client-react", () => ({
  useClient: () => mockClient,
}));

import { useAccount } from "~/hooks/useAccount";

beforeEach(() => {
  mockUpdateUser.mockReset().mockResolvedValue({});
  mockChangePassword.mockReset().mockResolvedValue({});
  mockChangeEmail.mockReset().mockResolvedValue({});
  mockSendVerificationEmail.mockReset().mockResolvedValue({});
});

describe("useAccount", () => {
  it("updates the profile name", async () => {
    const { result } = renderHook(() => useAccount());
    await act(async () => {
      await result.current.updateProfile("New Name");
    });
    expect(mockUpdateUser).toHaveBeenCalledWith({ name: "New Name" });
    expect(result.current.error).toBeNull();
  });

  it("changes the password and revokes other sessions", async () => {
    const { result } = renderHook(() => useAccount());
    await act(async () => {
      await result.current.changePassword("old", "newpassword", true);
    });
    expect(mockChangePassword).toHaveBeenCalledWith({
      currentPassword: "old",
      newPassword: "newpassword",
      revokeOtherSessions: true,
    });
  });

  it("begins a change-email flow", async () => {
    const { result } = renderHook(() => useAccount());
    await act(async () => {
      await result.current.changeEmail("new@example.com");
    });
    expect(mockChangeEmail).toHaveBeenCalledWith({ newEmail: "new@example.com" });
  });

  it("resends the verification email", async () => {
    const { result } = renderHook(() => useAccount());
    await act(async () => {
      await result.current.resendVerification("me@example.com");
    });
    expect(mockSendVerificationEmail).toHaveBeenCalledWith({ email: "me@example.com" });
  });

  it("captures and rethrows errors", async () => {
    mockChangePassword.mockRejectedValueOnce(new Error("Wrong password"));
    const { result } = renderHook(() => useAccount());
    await act(async () => {
      await expect(result.current.changePassword("x", "yyyyyyyy")).rejects.toThrow(
        "Wrong password",
      );
    });
    expect(result.current.error?.message).toBe("Wrong password");
    expect(result.current.isSaving).toBe(false);
  });
});
