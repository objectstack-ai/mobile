import { useSecurityStore } from "~/stores/security-store";

describe("security-store", () => {
  beforeEach(() => {
    useSecurityStore.setState({
      biometricEnabled: false,
      isLocked: false,
      inactivityTimeout: 300,
      lastActiveAt: Date.now(),
    });
  });

  it("has correct default state", () => {
    const state = useSecurityStore.getState();
    expect(state.biometricEnabled).toBe(false);
    expect(state.isLocked).toBe(false);
    expect(state.inactivityTimeout).toBe(300);
    expect(typeof state.lastActiveAt).toBe("number");
  });

  it("toggles biometric enabled", () => {
    useSecurityStore.getState().setBiometricEnabled(true);
    expect(useSecurityStore.getState().biometricEnabled).toBe(true);
    useSecurityStore.getState().setBiometricEnabled(false);
    expect(useSecurityStore.getState().biometricEnabled).toBe(false);
  });

  it("locks and unlocks the app", () => {
    useSecurityStore.getState().setLocked(true);
    expect(useSecurityStore.getState().isLocked).toBe(true);
    useSecurityStore.getState().setLocked(false);
    expect(useSecurityStore.getState().isLocked).toBe(false);
  });

  it("sets inactivity timeout", () => {
    useSecurityStore.getState().setInactivityTimeout(600);
    expect(useSecurityStore.getState().inactivityTimeout).toBe(600);
  });

  it("sets timeout to zero (disabled)", () => {
    useSecurityStore.getState().setInactivityTimeout(0);
    expect(useSecurityStore.getState().inactivityTimeout).toBe(0);
  });

  it("records activity with a fresh timestamp", () => {
    const before = Date.now();
    useSecurityStore.getState().recordActivity();
    const after = Date.now();
    const { lastActiveAt } = useSecurityStore.getState();
    expect(lastActiveAt).toBeGreaterThanOrEqual(before);
    expect(lastActiveAt).toBeLessThanOrEqual(after);
  });
});
