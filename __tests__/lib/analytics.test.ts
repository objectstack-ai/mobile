/**
 * Tests for lib/analytics — page view and event tracking
 */
import { createAnalyticsTracker } from "~/lib/analytics";

describe("analytics", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("createAnalyticsTracker", () => {
    it("starts with an empty queue", () => {
      const tracker = createAnalyticsTracker();
      expect(tracker.getQueue()).toEqual([]);
    });

    it("track adds an event to the queue", () => {
      const tracker = createAnalyticsTracker();
      tracker.track("button_click", { buttonId: "save" });

      const queue = tracker.getQueue();
      expect(queue).toHaveLength(1);
      expect(queue[0].name).toBe("button_click");
      expect(queue[0].properties).toMatchObject({ buttonId: "save" });
      expect(queue[0].timestamp).toBeDefined();
    });

    it("trackPageView creates a page_view event", () => {
      const tracker = createAnalyticsTracker();
      tracker.trackPageView("HomeScreen");

      const queue = tracker.getQueue();
      expect(queue).toHaveLength(1);
      expect(queue[0].name).toBe("page_view");
      expect(queue[0].properties).toMatchObject({ screenName: "HomeScreen" });
    });

    it("trackAction creates a user_action event", () => {
      const tracker = createAnalyticsTracker();
      tracker.trackAction("delete_record", { recordId: "r1" });

      const queue = tracker.getQueue();
      expect(queue).toHaveLength(1);
      expect(queue[0].name).toBe("user_action");
      expect(queue[0].properties).toMatchObject({
        action: "delete_record",
        recordId: "r1",
      });
    });

    it("includes userId in event properties when set", () => {
      const tracker = createAnalyticsTracker({ userId: "u1" });
      tracker.track("test");

      expect(tracker.getQueue()[0].properties).toMatchObject({ userId: "u1" });
    });

    it("setUserId updates userId for subsequent events", () => {
      const tracker = createAnalyticsTracker();
      tracker.setUserId("u2");
      tracker.track("test");

      expect(tracker.getQueue()[0].properties).toMatchObject({ userId: "u2" });
    });

    it("auto-flushes when batchSize is reached", async () => {
      global.fetch = jest.fn().mockResolvedValue({ ok: true }) as jest.Mock;

      const tracker = createAnalyticsTracker({
        endpoint: "https://api.example.com/events",
        batchSize: 2,
      });

      tracker.track("event1");
      tracker.track("event2"); // Should trigger flush

      // Wait a tick for the flush
      await new Promise((r) => setTimeout(r, 0));

      expect(global.fetch).toHaveBeenCalledWith(
        "https://api.example.com/events",
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
        }),
      );
    });

    it("flush sends events and clears queue", async () => {
      global.fetch = jest.fn().mockResolvedValue({ ok: true }) as jest.Mock;

      const tracker = createAnalyticsTracker({
        endpoint: "https://api.example.com/events",
      });

      tracker.track("e1");
      tracker.track("e2");

      await tracker.flush();

      expect(tracker.getQueue()).toEqual([]);
      expect(global.fetch).toHaveBeenCalledTimes(1);

      const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
      expect(body.events).toHaveLength(2);
    });

    it("flush re-enqueues events on failure", async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error("offline")) as jest.Mock;

      const tracker = createAnalyticsTracker({
        endpoint: "https://api.example.com/events",
      });

      tracker.track("e1");
      await tracker.flush();

      // Events should be re-enqueued
      expect(tracker.getQueue()).toHaveLength(1);
    });

    it("flush is no-op without endpoint", async () => {
      const tracker = createAnalyticsTracker();
      tracker.track("e1");
      await tracker.flush();
      // Queue is cleared even without endpoint (events are discarded)
      expect(tracker.getQueue()).toEqual([]);
    });

    it("subscribe receives tracked events", () => {
      const tracker = createAnalyticsTracker();
      const listener = jest.fn();
      tracker.subscribe(listener);

      tracker.track("test_event");

      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({ name: "test_event" }),
      );
    });

    it("unsubscribe stops notifications", () => {
      const tracker = createAnalyticsTracker();
      const listener = jest.fn();
      const unsub = tracker.subscribe(listener);
      unsub();

      tracker.track("test_event");
      expect(listener).not.toHaveBeenCalled();
    });

    it("destroy clears queue and stops auto-flush", () => {
      const tracker = createAnalyticsTracker();
      tracker.track("e1");
      tracker.destroy();
      expect(tracker.getQueue()).toEqual([]);
    });
  });
});
