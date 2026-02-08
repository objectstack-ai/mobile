/**
 * Tests for lib/sentry — Sentry crash reporting & performance monitoring
 */
import * as Sentry from "@sentry/react-native";
import {
  initSentry,
  captureException,
  captureMessage,
  setUser,
  addBreadcrumb,
  startSpan,
  _resetForTesting,
} from "~/lib/sentry";

describe("sentry", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    _resetForTesting();
  });

  describe("initSentry", () => {
    it("calls Sentry.init with merged config", () => {
      initSentry({ dsn: "https://test@sentry.io/123" });

      expect(Sentry.init).toHaveBeenCalledTimes(1);
      expect(Sentry.init).toHaveBeenCalledWith(
        expect.objectContaining({
          dsn: "https://test@sentry.io/123",
          sampleRate: 1.0,
          enableAutoSessionTracking: true,
          attachStacktrace: true,
        }),
      );
    });

    it("respects custom tracesSampleRate and environment", () => {
      initSentry({
        dsn: "https://test@sentry.io/123",
        tracesSampleRate: 0.5,
        environment: "staging",
      });

      expect(Sentry.init).toHaveBeenCalledWith(
        expect.objectContaining({
          tracesSampleRate: 0.5,
          environment: "staging",
        }),
      );
    });

    it("sets tracesSampleRate to 0 when performance is disabled", () => {
      initSentry({
        dsn: "https://test@sentry.io/123",
        enablePerformance: false,
      });

      expect(Sentry.init).toHaveBeenCalledWith(
        expect.objectContaining({
          tracesSampleRate: 0,
        }),
      );
    });

    it("only initialises once", () => {
      initSentry({ dsn: "https://test@sentry.io/123" });
      initSentry({ dsn: "https://test@sentry.io/456" });

      expect(Sentry.init).toHaveBeenCalledTimes(1);
    });
  });

  describe("captureException", () => {
    it("delegates to Sentry.captureException", () => {
      const err = new Error("test error");
      const result = captureException(err);

      expect(Sentry.captureException).toHaveBeenCalledWith(err, undefined);
      expect(result).toBe("mock-event-id");
    });

    it("passes extra context when provided", () => {
      const err = new Error("test");
      captureException(err, { screen: "Home" });

      expect(Sentry.captureException).toHaveBeenCalledWith(err, {
        extra: { screen: "Home" },
      });
    });
  });

  describe("captureMessage", () => {
    it("delegates to Sentry.captureMessage", () => {
      const result = captureMessage("hello");
      expect(Sentry.captureMessage).toHaveBeenCalledWith("hello", "info");
      expect(result).toBe("mock-event-id");
    });

    it("supports custom severity level", () => {
      captureMessage("warn!", "warning");
      expect(Sentry.captureMessage).toHaveBeenCalledWith("warn!", "warning");
    });
  });

  describe("setUser", () => {
    it("delegates to Sentry.setUser", () => {
      setUser({ id: "u1", email: "test@example.com" });
      expect(Sentry.setUser).toHaveBeenCalledWith({
        id: "u1",
        email: "test@example.com",
      });
    });

    it("clears user with null", () => {
      setUser(null);
      expect(Sentry.setUser).toHaveBeenCalledWith(null);
    });
  });

  describe("addBreadcrumb", () => {
    it("delegates to Sentry.addBreadcrumb", () => {
      addBreadcrumb({ category: "navigation", message: "Home → Settings" });
      expect(Sentry.addBreadcrumb).toHaveBeenCalledWith({
        category: "navigation",
        message: "Home → Settings",
      });
    });
  });

  describe("startSpan", () => {
    it("delegates to Sentry.startSpan", () => {
      const callback = jest.fn().mockReturnValue("result");
      const result = startSpan({ name: "test-span", op: "task" }, callback);

      expect(Sentry.startSpan).toHaveBeenCalledWith(
        { name: "test-span", op: "task" },
        callback,
      );
      expect(result).toBe("result");
    });
  });
});
