import React, { useCallback, useEffect, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, Stack } from "expo-router";
import { useClient } from "@objectstack/client-react";
import { DashboardViewRenderer } from "~/components/renderers";
import type { DashboardMeta, DashboardWidgetMeta } from "~/components/renderers";
import type { WidgetDataPayload } from "~/components/renderers";
import { useWidgetQuery } from "~/hooks/useDashboardData";

/* ------------------------------------------------------------------ */
/*  Widget data fetcher (calls hook per-widget, reports via callback)  */
/* ------------------------------------------------------------------ */

function WidgetDataFetcher({
  widget,
  onData,
}: {
  widget: DashboardWidgetMeta;
  onData: (name: string, data: WidgetDataPayload) => void;
}) {
  const data = useWidgetQuery(widget);
  useEffect(() => {
    onData(widget.name, data);
  }, [data, widget.name, onData]);
  return null;
}

/* ------------------------------------------------------------------ */
/*  Dashboard Screen                                                   */
/* ------------------------------------------------------------------ */

export default function DashboardScreen() {
  const { dashboardName } = useLocalSearchParams<{
    appName: string;
    dashboardName: string;
  }>();
  const client = useClient();

  const [dashboard, setDashboard] = useState<DashboardMeta | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [widgetData, setWidgetData] = useState<Record<string, WidgetDataPayload>>({});

  /* ---- Fetch dashboard metadata ---- */
  useEffect(() => {
    if (!dashboardName) return;
    setIsLoading(true);
    (async () => {
      try {
        const result = await (client as any).views.get(dashboardName);
        const meta: DashboardMeta = result?.dashboard ?? result ?? {
          name: dashboardName,
          widgets: [],
        };
        setDashboard(meta);
      } catch {
        setDashboard({ name: dashboardName!, label: dashboardName, widgets: [] });
      } finally {
        setIsLoading(false);
      }
    })();
  }, [client, dashboardName]);

  const displayName =
    dashboard?.label ??
    dashboardName?.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase()) ??
    "Dashboard";

  /* ---- Collect widget data via callback ---- */
  const handleWidgetData = useCallback(
    (name: string, data: WidgetDataPayload) => {
      setWidgetData((prev) => {
        if (prev[name] === data) return prev;
        return { ...prev, [name]: data };
      });
    },
    [],
  );

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["left", "right"]}>
      <Stack.Screen options={{ title: displayName }} />

      {/* Invisible data fetchers — one per widget, each calls useWidgetQuery */}
      {dashboard?.widgets.map((w) => (
        <WidgetDataFetcher key={w.name} widget={w} onData={handleWidgetData} />
      ))}

      <DashboardViewRenderer
        dashboard={dashboard}
        widgetData={widgetData}
        isLoading={isLoading}
      />
    </SafeAreaView>
  );
}
