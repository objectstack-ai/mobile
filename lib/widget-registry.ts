/**
 * Widget Registry – manages registration, lookup, and lifecycle
 * of widget components for the ObjectStack widget system.
 *
 * Spec compliance: spec/ui → WidgetManifest.
 */
import React from "react";

/* ------------------------------------------------------------------ */
/*  Spec-aligned types                                                 */
/* ------------------------------------------------------------------ */

export interface WidgetProperty {
  name: string;
  type: "string" | "number" | "boolean" | "object" | "array";
  required?: boolean;
  default?: unknown;
  description?: string;
}

export interface WidgetManifest {
  /** Unique widget type identifier (e.g. "metric-card", "chart-sparkline") */
  type: string;
  /** Human-readable display name */
  label: string;
  /** Description of what this widget does */
  description?: string;
  /** Icon identifier (Lucide icon name) */
  icon?: string;
  /** Configurable properties the widget accepts */
  properties?: WidgetProperty[];
  /** Default width span in grid columns */
  defaultSpan?: number;
}

export interface WidgetLifecycleEvent {
  type: "mount" | "unmount" | "refresh" | "configure";
  widgetType: string;
  timestamp: number;
}

/* ------------------------------------------------------------------ */
/*  Registry                                                           */
/* ------------------------------------------------------------------ */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type WidgetComponent = React.ComponentType<any>;

interface WidgetEntry {
  manifest: WidgetManifest;
  component: WidgetComponent;
}

const widgetRegistry = new Map<string, WidgetEntry>();
const lifecycleListeners: Array<(event: WidgetLifecycleEvent) => void> = [];

/**
 * Register a widget component with its manifest.
 */
export function registerWidget(
  manifest: WidgetManifest,
  component: WidgetComponent,
): void {
  widgetRegistry.set(manifest.type, { manifest, component });
}

/**
 * Unregister a widget by type.
 */
export function unregisterWidget(type: string): boolean {
  return widgetRegistry.delete(type);
}

/**
 * Look up a registered widget by type.
 */
export function getWidget(type: string): WidgetEntry | undefined {
  return widgetRegistry.get(type);
}

/**
 * Get all registered widget manifests.
 */
export function listWidgets(): WidgetManifest[] {
  return Array.from(widgetRegistry.values()).map((e) => e.manifest);
}

/**
 * Subscribe to widget lifecycle events.
 * Returns an unsubscribe function.
 */
export function onWidgetLifecycle(
  listener: (event: WidgetLifecycleEvent) => void,
): () => void {
  lifecycleListeners.push(listener);
  return () => {
    const idx = lifecycleListeners.indexOf(listener);
    if (idx >= 0) lifecycleListeners.splice(idx, 1);
  };
}

/**
 * Emit a widget lifecycle event.
 */
export function emitWidgetLifecycle(event: WidgetLifecycleEvent): void {
  for (const listener of lifecycleListeners) {
    listener(event);
  }
}

/**
 * Resolve default property values for a widget.
 */
export function resolveWidgetDefaults(
  type: string,
  props: Record<string, unknown>,
): Record<string, unknown> {
  const entry = widgetRegistry.get(type);
  if (!entry?.manifest.properties) return { ...props };
  const resolved: Record<string, unknown> = {};
  for (const prop of entry.manifest.properties) {
    resolved[prop.name] =
      props[prop.name] !== undefined ? props[prop.name] : prop.default;
  }
  // Include extra props not in manifest
  for (const [key, value] of Object.entries(props)) {
    if (!(key in resolved)) resolved[key] = value;
  }
  return resolved;
}

/**
 * Clear all registered widgets. Useful for testing.
 */
export function clearWidgetRegistry(): void {
  widgetRegistry.clear();
  lifecycleListeners.length = 0;
}
