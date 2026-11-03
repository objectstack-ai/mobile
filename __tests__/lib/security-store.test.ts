/**
 * The app lock's state machine: the timeout, the overlay states, and what a
 * setting change does to them. Pure — `stepAppLock` — plus the store holding it.
 */
import {
  APP_LOCK_OFF,
  APP_LOCK_TIMEOUTS,
  DEFAULT_APP_LOCK_TIMEOUT,
  INITIAL_APP_LOCK_STATE,
  appLockSnapshot,
  isAppLockTimeout,
  isAppLocked,
  stepAppLock,
  useSecurityStore,
  type AppLockEvent,
  type AppLockSettings,
  type AppLockState,
} from "~/stores/security-store";

const ON_5_MIN: AppLockSettings = { enabled: true, timeoutSeconds: 300 };
const ON_IMMEDIATELY: AppLockSettings = { enabled: true, timeoutSeconds: 0 };

function run(state: AppLockState, ...events: AppLockEvent[]): AppLockState {
  return events.reduce(stepAppLock, state);
}

/** Unlocked with the lock on. */
const unlocked = (settings: AppLockSettings = ON_5_MIN): AppLockState => ({
  ...INITIAL_APP_LOCK_STATE,
  settings,
});

describe("app lock settings", () => {
  it("offers immediately, 1, 5, 15 and 60 minutes, and defaults to 5", () => {
    expect(APP_LOCK_TIMEOUTS).toEqual([0, 60, 300, 900, 3600]);
    expect(DEFAULT_APP_LOCK_TIMEOUT).toBe(300);
    expect(APP_LOCK_OFF).toEqual({ enabled: false, timeoutSeconds: 300 });
  });

  it("accepts only the offered timeouts", () => {
    for (const t of APP_LOCK_TIMEOUTS) expect(isAppLockTimeout(t)).toBe(true);
    for (const t of [-1, 1, 30, 301, "300", null, undefined, Number.NaN]) {
      expect(isAppLockTimeout(t)).toBe(false);
    }
  });
});

describe("stepAppLock", () => {
  describe("launch", () => {
    it("starts locked, prompting, when the lock is on", () => {
      const next = stepAppLock(INITIAL_APP_LOCK_STATE, { type: "hydrated", settings: ON_5_MIN });
      expect(next).toMatchObject({ phase: "locked", promptPending: true, settings: ON_5_MIN });
    });

    it("starts unlocked when the lock is off", () => {
      const next = stepAppLock(INITIAL_APP_LOCK_STATE, { type: "hydrated", settings: APP_LOCK_OFF });
      expect(next).toEqual({ ...INITIAL_APP_LOCK_STATE, settings: APP_LOCK_OFF });
    });
  });

  describe("the timeout", () => {
    it("covers the app as it goes to the background, before the timeout is judged", () => {
      const next = stepAppLock(unlocked(), { type: "background", at: 1_000 });
      expect(next).toMatchObject({ phase: "covered", backgroundAt: 1_000, promptPending: false });
      expect(isAppLocked(next)).toBe(true);
    });

    it("unlocks again on a return within the timeout", () => {
      const next = run(
        unlocked(),
        { type: "background", at: 1_000 },
        { type: "active", at: 1_000 + 299_999 }
      );
      expect(next).toMatchObject({ phase: "unlocked", backgroundAt: null });
    });

    it("locks on a return at the timeout or past it", () => {
      for (const away of [300_000, 300_001, 86_400_000]) {
        const next = run(
          unlocked(),
          { type: "background", at: 1_000 },
          { type: "active", at: 1_000 + away }
        );
        expect(next).toMatchObject({ phase: "locked", promptPending: true, backgroundAt: null });
      }
    });

    it("locks on any return with 'immediately'", () => {
      const next = run(
        unlocked(ON_IMMEDIATELY),
        { type: "background", at: 5 },
        { type: "active", at: 5 }
      );
      expect(next.phase).toBe("locked");
    });

    it("reads each timeout in seconds", () => {
      for (const seconds of APP_LOCK_TIMEOUTS.filter((s) => s > 0)) {
        const settings: AppLockSettings = { enabled: true, timeoutSeconds: seconds };
        const before = run(
          unlocked(settings),
          { type: "background", at: 0 },
          { type: "active", at: seconds * 1000 - 1 }
        );
        const after = run(
          unlocked(settings),
          { type: "background", at: 0 },
          { type: "active", at: seconds * 1000 }
        );
        expect(before.phase).toBe("unlocked");
        expect(after.phase).toBe("locked");
      }
    });

    it("measures from the first background, not a repeat", () => {
      const next = run(
        unlocked(),
        { type: "background", at: 0 },
        { type: "background", at: 299_000 },
        { type: "active", at: 300_000 }
      );
      expect(next.phase).toBe("locked");
    });

    it("never covers or locks while the lock is off", () => {
      const next = run(
        unlocked(APP_LOCK_OFF),
        { type: "background", at: 0 },
        { type: "active", at: 10 * 86_400_000 }
      );
      expect(next).toEqual(unlocked(APP_LOCK_OFF));
    });

    it("ignores a return that was not preceded by a background", () => {
      expect(stepAppLock(unlocked(), { type: "active", at: 1e12 })).toEqual(unlocked());
    });
  });

  describe("the overlay states", () => {
    const locked = () => stepAppLock(INITIAL_APP_LOCK_STATE, { type: "hydrated", settings: ON_5_MIN });

    it("goes locked → unlocking → unlocked on a successful prompt", () => {
      const unlocking = stepAppLock(locked(), { type: "unlockStarted" });
      expect(unlocking).toMatchObject({ phase: "unlocking", promptPending: false });
      const done = stepAppLock(unlocking, { type: "unlockFinished", ok: true });
      expect(done).toMatchObject({ phase: "unlocked", unlockError: null });
      expect(isAppLocked(done)).toBe(false);
    });

    it("stays locked, with the reason, on a failed prompt — and without one on a cancel", () => {
      const failed = run(locked(), { type: "unlockStarted" }, { type: "unlockFinished", ok: false, error: "failed" });
      expect(failed).toMatchObject({ phase: "locked", unlockError: "failed", promptPending: false });
      const noLock = run(
        locked(),
        { type: "unlockStarted" },
        { type: "unlockFinished", ok: false, error: "no-device-lock" }
      );
      expect(noLock.unlockError).toBe("no-device-lock");
      const cancelled = run(locked(), { type: "unlockStarted" }, { type: "unlockFinished", ok: false });
      expect(cancelled).toMatchObject({ phase: "locked", unlockError: null });
    });

    it("prompts again on a return from the background while still locked", () => {
      const cancelled = run(locked(), { type: "unlockStarted" }, { type: "unlockFinished", ok: false, error: "failed" });
      const back = run(cancelled, { type: "background", at: 1 }, { type: "active", at: 2 });
      expect(back).toMatchObject({ phase: "locked", promptPending: true, unlockError: null });
    });

    it("keeps the prompt's phase through a background (Android's passcode screen)", () => {
      const unlocking = stepAppLock(locked(), { type: "unlockStarted" });
      expect(stepAppLock(unlocking, { type: "background", at: 1 })).toBe(unlocking);
      expect(stepAppLock(unlocking, { type: "active", at: 2 })).toBe(unlocking);
    });

    it("ignores an unlock outside its phase", () => {
      expect(stepAppLock(unlocked(), { type: "unlockStarted" })).toEqual(unlocked());
      expect(stepAppLock(unlocked(), { type: "unlockFinished", ok: true })).toEqual(unlocked());
      const covered = stepAppLock(unlocked(), { type: "background", at: 0 });
      expect(stepAppLock(covered, { type: "unlockStarted" })).toBe(covered);
    });
  });

  describe("a committed setting", () => {
    it("turning the lock on, or a new timeout, waits for the next background", () => {
      const on = stepAppLock(unlocked(APP_LOCK_OFF), { type: "settingsCommitted", settings: ON_IMMEDIATELY });
      expect(on).toMatchObject({ phase: "unlocked", settings: ON_IMMEDIATELY });
      expect(stepAppLock(on, { type: "background", at: 0 }).phase).toBe("covered");
    });

    it("turning the lock off lifts whatever it holds", () => {
      const covered = stepAppLock(unlocked(), { type: "background", at: 0 });
      const off = stepAppLock(covered, { type: "settingsCommitted", settings: APP_LOCK_OFF });
      expect(off).toEqual(unlocked(APP_LOCK_OFF));
    });
  });
});

describe("appLockSnapshot", () => {
  it("is a copy of the setting, so a reader cannot change the store's", () => {
    useSecurityStore.setState({ ...INITIAL_APP_LOCK_STATE, settings: ON_5_MIN });
    const snapshot = appLockSnapshot(useSecurityStore.getState());
    expect(snapshot).toEqual(ON_5_MIN);
    (snapshot as { enabled: boolean }).enabled = false;
    expect(useSecurityStore.getState().settings.enabled).toBe(true);
  });
});

describe("useSecurityStore", () => {
  beforeEach(() => useSecurityStore.setState(INITIAL_APP_LOCK_STATE));

  it("starts unlocked with the lock off", () => {
    expect(useSecurityStore.getState()).toMatchObject(INITIAL_APP_LOCK_STATE);
  });

  it("applies events through the machine", () => {
    const { dispatch } = useSecurityStore.getState();
    dispatch({ type: "hydrated", settings: ON_5_MIN });
    expect(useSecurityStore.getState().phase).toBe("locked");
    dispatch({ type: "unlockStarted" });
    dispatch({ type: "unlockFinished", ok: true });
    expect(useSecurityStore.getState().phase).toBe("unlocked");
  });
});
