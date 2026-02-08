/**
 * Tests for app-lock — AppState lifecycle monitoring and biometric lock
 */
import { unlockApp } from "~/lib/app-lock";
import { useSecurityStore } from "~/stores/security-store";

describe("unlockApp", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset security store
    useSecurityStore.setState({
      biometricEnabled: true,
      isLocked: true,
      inactivityTimeout: 60,
      lastActiveAt: Date.now(),
    });
  });

  it("unlocks the app when biometric auth succeeds", async () => {
    const result = await unlockApp();
    expect(result).toBe(true);
    expect(useSecurityStore.getState().isLocked).toBe(false);
  });

  it("returns false when auth fails", async () => {
    const LocalAuth = require("expo-local-authentication");
    LocalAuth.authenticateAsync.mockResolvedValueOnce({ success: false });

    const result = await unlockApp();
    expect(result).toBe(false);
  });
});
