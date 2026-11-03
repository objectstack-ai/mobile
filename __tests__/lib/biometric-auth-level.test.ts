/**
 * What the device can unlock with, and how a failed prompt is read — the two
 * questions the app lock asks of expo-local-authentication beyond `authenticate`.
 */
jest.mock("expo-local-authentication", () => ({
  __esModule: true,
  getEnrolledLevelAsync: jest.fn(),
  SecurityLevel: { NONE: 0, SECRET: 1, BIOMETRIC_WEAK: 2, BIOMETRIC_STRONG: 3 },
}));

import { authFailureKind, getDeviceLockLevel } from "~/lib/biometric-auth";

const LocalAuth = jest.requireMock("expo-local-authentication") as Record<string, jest.Mock>;

describe("getDeviceLockLevel", () => {
  it.each([
    [0, "none"],
    [1, "passcode"],
    [2, "biometric"],
    [3, "biometric"],
  ])("reads security level %i as %s", async (level, expected) => {
    LocalAuth.getEnrolledLevelAsync.mockResolvedValueOnce(level);
    await expect(getDeviceLockLevel()).resolves.toBe(expected);
  });
});

describe("authFailureKind", () => {
  it("reads a dismissed prompt as cancelled", () => {
    for (const error of ["user_cancel", "system_cancel", "app_cancel"]) {
      expect(authFailureKind(error)).toBe("cancelled");
    }
  });

  it("reads a device with nothing to authenticate with as no-device-lock", () => {
    for (const error of ["not_enrolled", "passcode_not_set", "not_available"]) {
      expect(authFailureKind(error)).toBe("no-device-lock");
    }
  });

  it("reads everything else, and no code, as failed", () => {
    for (const error of ["lockout", "authentication_failed", "unknown", "timeout", undefined]) {
      expect(authFailureKind(error)).toBe("failed");
    }
  });
});
