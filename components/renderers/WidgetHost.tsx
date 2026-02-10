import React, { useEffect, useRef } from "react";
import { View, Text } from "react-native";
import {
  getWidget,
  emitWidgetLifecycle,
  resolveWidgetDefaults,
} from "~/lib/widget-registry";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

export interface WidgetHostProps {
  /** Widget type identifier (must be registered in widget-registry) */
  type: string;
  /** Props to pass to the widget component */
  props?: Record<string, unknown>;
  /** Fallback when the widget type is not registered */
  fallback?: React.ReactNode;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

/**
 * WidgetHost – renders a registered widget by type, injecting resolved
 * default properties and emitting lifecycle events.
 *
 * Spec compliance: spec/ui → WidgetManifest lifecycle.
 */
export function WidgetHost({ type, props = {}, fallback }: WidgetHostProps) {
  const entry = getWidget(type);
  const mountedRef = useRef(false);

  useEffect(() => {
    if (!entry) return;
    if (!mountedRef.current) {
      mountedRef.current = true;
      emitWidgetLifecycle({
        type: "mount",
        widgetType: type,
        timestamp: Date.now(),
      });
    }
    return () => {
      emitWidgetLifecycle({
        type: "unmount",
        widgetType: type,
        timestamp: Date.now(),
      });
    };
  }, [entry, type]);

  if (!entry) {
    if (fallback) return <>{fallback}</>;
    return (
      <View className="bg-muted/30 rounded-lg px-3 py-2 m-2">
        <Text className="text-xs text-muted-foreground">
          Unknown widget: {type}
        </Text>
      </View>
    );
  }

  const resolvedProps = resolveWidgetDefaults(type, props);
  const WidgetComponent = entry.component;

  return <WidgetComponent {...resolvedProps} />;
}
