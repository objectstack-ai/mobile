/**
 * Tests for useTwoFactor — TOTP enrolment over authClient.twoFactor.*.
 */
import { renderHook, act } from "@testing-library/react-native";

const mockEnable = jest.fn();
const mockVerifyTotp = jest.fn();
const mockDisable = jest.fn();
const mockGenerateBackupCodes = jest.fn();

jest.mock("~/lib/auth-client", () => ({
  authClient: {
    twoFactor: {
      enable: (...a: unknown[]) => mockEnable(...a),
      verifyTotp: (...a: unknown[]) => mockVerifyTotp(...a),
      disable: (...a: unknown[]) => mockDisable(...a),
      generateBackupCodes: (...a: unknown[]) => mockGenerateBackupCodes(...a),
    },
  },
}));

import { useTwoFactor } from "~/hooks/useTwoFactor";

beforeEach(() => {
  mockEnable.mockReset();
  mockVerifyTotp.mockReset();
  mockDisable.mockReset();
  mockGenerateBackupCodes.mockReset();
});

describe("useTwoFactor", () => {
  it("enable() returns totpURI and backup codes", async () => {
    mockEnable.mockResolvedValue({
      data: { totpURI: "otpauth://totp/x?secret=ABC", backupCodes: ["a", "b"] },
      error: null,
    });

    const { result } = renderHook(() => useTwoFactor());
    let res: any;
    await act(async () => {
      res = await result.current.enable("pw");
    });

    expect(mockEnable).toHaveBeenCalledWith({ password: "pw" });
    expect(res.totpURI).toBe("otpauth://totp/x?secret=ABC");
    expect(res.backupCodes).toEqual(["a", "b"]);
    expect(result.current.error).toBeNull();
  });

  it("verifyTotp() forwards the code", async () => {
    mockVerifyTotp.mockResolvedValue({ data: { token: "t" }, error: null });
    const { result } = renderHook(() => useTwoFactor());
    await act(async () => {
      await result.current.verifyTotp("123456");
    });
    expect(mockVerifyTotp).toHaveBeenCalledWith({ code: "123456" });
  });

  it("disable() forwards the password", async () => {
    mockDisable.mockResolvedValue({ data: { status: true }, error: null });
    const { result } = renderHook(() => useTwoFactor());
    await act(async () => {
      await result.current.disable("pw");
    });
    expect(mockDisable).toHaveBeenCalledWith({ password: "pw" });
  });

  it("generateBackupCodes() returns the codes", async () => {
    mockGenerateBackupCodes.mockResolvedValue({
      data: { backupCodes: ["x", "y", "z"] },
      error: null,
    });
    const { result } = renderHook(() => useTwoFactor());
    let codes: string[] = [];
    await act(async () => {
      codes = await result.current.generateBackupCodes("pw");
    });
    expect(codes).toEqual(["x", "y", "z"]);
  });

  it("surfaces the better-auth error envelope", async () => {
    mockEnable.mockResolvedValue({ data: null, error: { message: "Invalid password" } });
    const { result } = renderHook(() => useTwoFactor());
    await act(async () => {
      await expect(result.current.enable("bad")).rejects.toThrow("Invalid password");
    });
    expect(result.current.error?.message).toBe("Invalid password");
    expect(result.current.isBusy).toBe(false);
  });
});
