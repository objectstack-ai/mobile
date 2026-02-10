/**
 * Tests for widget-registry – validates widget registration,
 * lookup, lifecycle events, and default resolution.
 */
import {
  registerWidget,
  unregisterWidget,
  getWidget,
  listWidgets,
  onWidgetLifecycle,
  emitWidgetLifecycle,
  resolveWidgetDefaults,
  clearWidgetRegistry,
  type WidgetManifest,
} from "~/lib/widget-registry";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const React = require("react");

const MockComponent = () => React.createElement("div", null, "mock");

beforeEach(() => {
  clearWidgetRegistry();
});

describe("widget registration", () => {
  const manifest: WidgetManifest = {
    type: "metric-card",
    label: "Metric Card",
    description: "Displays a single metric value",
    icon: "activity",
    properties: [
      { name: "title", type: "string", required: true },
      { name: "value", type: "number", default: 0 },
      { name: "color", type: "string", default: "#1e40af" },
    ],
    defaultSpan: 1,
  };

  it("registers and retrieves a widget", () => {
    registerWidget(manifest, MockComponent);
    const entry = getWidget("metric-card");

    expect(entry).toBeDefined();
    expect(entry?.manifest.type).toBe("metric-card");
    expect(entry?.manifest.label).toBe("Metric Card");
    expect(entry?.component).toBe(MockComponent);
  });

  it("returns undefined for unregistered widget", () => {
    expect(getWidget("nonexistent")).toBeUndefined();
  });

  it("unregisters a widget", () => {
    registerWidget(manifest, MockComponent);
    expect(getWidget("metric-card")).toBeDefined();

    const removed = unregisterWidget("metric-card");
    expect(removed).toBe(true);
    expect(getWidget("metric-card")).toBeUndefined();
  });

  it("returns false when unregistering non-existent widget", () => {
    expect(unregisterWidget("nonexistent")).toBe(false);
  });

  it("lists all registered widgets", () => {
    registerWidget(manifest, MockComponent);
    registerWidget(
      { type: "chart-sparkline", label: "Sparkline" },
      MockComponent,
    );

    const widgets = listWidgets();
    expect(widgets).toHaveLength(2);
    expect(widgets.map((w) => w.type)).toContain("metric-card");
    expect(widgets.map((w) => w.type)).toContain("chart-sparkline");
  });
});

describe("widget lifecycle events", () => {
  it("emits and receives lifecycle events", () => {
    const events: Array<{ type: string; widgetType: string }> = [];
    const unsub = onWidgetLifecycle((event) => {
      events.push({ type: event.type, widgetType: event.widgetType });
    });

    emitWidgetLifecycle({
      type: "mount",
      widgetType: "metric-card",
      timestamp: Date.now(),
    });
    emitWidgetLifecycle({
      type: "unmount",
      widgetType: "metric-card",
      timestamp: Date.now(),
    });

    expect(events).toHaveLength(2);
    expect(events[0].type).toBe("mount");
    expect(events[1].type).toBe("unmount");

    unsub();
  });

  it("unsubscribes from lifecycle events", () => {
    const events: string[] = [];
    const unsub = onWidgetLifecycle((event) => {
      events.push(event.type);
    });

    emitWidgetLifecycle({
      type: "mount",
      widgetType: "test",
      timestamp: Date.now(),
    });
    expect(events).toHaveLength(1);

    unsub();

    emitWidgetLifecycle({
      type: "unmount",
      widgetType: "test",
      timestamp: Date.now(),
    });
    // Should not receive after unsubscribe
    expect(events).toHaveLength(1);
  });
});

describe("resolveWidgetDefaults", () => {
  it("fills in default values for missing props", () => {
    const manifest: WidgetManifest = {
      type: "metric-card",
      label: "Metric Card",
      properties: [
        { name: "title", type: "string", required: true },
        { name: "value", type: "number", default: 0 },
        { name: "color", type: "string", default: "#1e40af" },
      ],
    };

    registerWidget(manifest, MockComponent);

    const resolved = resolveWidgetDefaults("metric-card", {
      title: "Revenue",
    });

    expect(resolved.title).toBe("Revenue");
    expect(resolved.value).toBe(0);
    expect(resolved.color).toBe("#1e40af");
  });

  it("preserves provided values over defaults", () => {
    const manifest: WidgetManifest = {
      type: "metric-card",
      label: "Metric Card",
      properties: [
        { name: "value", type: "number", default: 0 },
      ],
    };

    registerWidget(manifest, MockComponent);

    const resolved = resolveWidgetDefaults("metric-card", { value: 42 });
    expect(resolved.value).toBe(42);
  });

  it("includes extra props not in manifest", () => {
    const manifest: WidgetManifest = {
      type: "simple",
      label: "Simple",
      properties: [{ name: "a", type: "string" }],
    };

    registerWidget(manifest, MockComponent);

    const resolved = resolveWidgetDefaults("simple", {
      a: "hello",
      extraProp: "world",
    });
    expect(resolved.a).toBe("hello");
    expect(resolved.extraProp).toBe("world");
  });

  it("returns original props for unregistered widget", () => {
    const props = { foo: "bar" };
    const resolved = resolveWidgetDefaults("unregistered", props);
    expect(resolved).toEqual({ foo: "bar" });
  });
});
