import { create } from "zustand";

export interface SecurityState {
  /** Whether biometric lock is enabled by the user */
  biometricEnabled: boolean;
  /** Whether the app is currently locked */
  isLocked: boolean;
  /** Inactivity timeout in seconds (0 = disabled) */
  inactivityTimeout: number;
  /** Timestamp when app was last active (foreground interaction) */
  lastActiveAt: number;

  /** Toggle biometric lock */
  setBiometricEnabled: (enabled: boolean) => void;
  /** Lock / unlock the app */
  setLocked: (locked: boolean) => void;
  /** Set inactivity timeout in seconds */
  setInactivityTimeout: (seconds: number) => void;
  /** Record user activity (reset inactivity timer) */
  recordActivity: () => void;
}

export const useSecurityStore = create<SecurityState>((set) => ({
  biometricEnabled: false,
  isLocked: false,
  inactivityTimeout: 300, // default 5 minutes
  lastActiveAt: Date.now(),

  setBiometricEnabled: (enabled) => set({ biometricEnabled: enabled }),
  setLocked: (locked) => set({ isLocked: locked }),
  setInactivityTimeout: (seconds) => set({ inactivityTimeout: seconds }),
  recordActivity: () => set({ lastActiveAt: Date.now() }),
}));
