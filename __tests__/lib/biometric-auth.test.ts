import * as LocalAuthentication from "expo-local-authentication";
import {
  getBiometricStatus,
  authenticate,
} from "~/lib/biometric-auth";

describe("biometric-auth", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getBiometricStatus", () => {
    it("returns hardware available and enrolled status", async () => {
      const status = await getBiometricStatus();
      expect(status.isHardwareAvailable).toBe(true);
      expect(status.isEnrolled).toBe(true);
      expect(status.biometricTypes).toEqual(
        expect.arrayContaining(["fingerprint", "facial"]),
      );
    });

    it("handles no hardware", async () => {
      (LocalAuthentication.hasHardwareAsync as jest.Mock).mockResolvedValueOnce(
        false,
      );
      (LocalAuthentication.isEnrolledAsync as jest.Mock).mockResolvedValueOnce(
        false,
      );
      (
        LocalAuthentication.supportedAuthenticationTypesAsync as jest.Mock
      ).mockResolvedValueOnce([]);

      const status = await getBiometricStatus();
      expect(status.isHardwareAvailable).toBe(false);
      expect(status.isEnrolled).toBe(false);
      expect(status.biometricTypes).toEqual([]);
    });
  });

  describe("authenticate", () => {
    it("returns success on successful auth", async () => {
      const result = await authenticate();
      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it("returns error on failure", async () => {
      (LocalAuthentication.authenticateAsync as jest.Mock).mockResolvedValueOnce(
        { success: false, error: "user_cancel" },
      );
      const result = await authenticate({ promptMessage: "Test" });
      expect(result.success).toBe(false);
      expect(result.error).toBe("user_cancel");
    });

    it("passes options to the native API", async () => {
      await authenticate({
        promptMessage: "Unlock",
        cancelLabel: "Abort",
        fallbackToPasscode: false,
      });
      expect(LocalAuthentication.authenticateAsync).toHaveBeenCalledWith({
        promptMessage: "Unlock",
        cancelLabel: "Abort",
        disableDeviceFallback: true,
      });
    });
  });
});
