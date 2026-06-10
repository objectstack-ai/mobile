import React, { useCallback, useEffect, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams } from "expo-router";
import { useClient } from "@objectstack/client-react";
import { ScreenHeader } from "~/components/common/ScreenHeader";
import { DashboardViewRenderer } from "~/components/renderers";
import type {
  DashboardMeta,
  DashboardWidgetMeta,
  DatasetMeta,
} from "~/components/renderers";
import type { WidgetDataPayload } from "~/components/renderers";
import { resolveDatasetWidget, useWidgetQuery } from "~/hooks/useDashboardData";

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
        // Dashboards are metadata items at `/meta/dashboard/<name>`, not data
        // views — `views.get` would hit the wrong route and yield no widgets.
        const result = (await client.meta.getItem("dashboard", dashboardName)) as
          | (DashboardMeta & { dashboard?: DashboardMeta })
          | undefined;
        const raw: DashboardMeta = result?.dashboard ??
          result ?? {
            name: dashboardName,
            widgets: [],
          };
        // Spec dashboards key each widget by `id`; the renderer/data-fetcher key
        // off `name`, so normalize once here.
        const widgets = (raw.widgets ?? []).map((w) => ({
          ...w,
          name: w.name ?? w.id ?? "",
        }));

        // 8.0-spec widgets reference an analytics `dataset` instead of a raw
        // `object`. Fetch each distinct dataset's metadata (an analytics view
        // over a base object) once, then resolve every widget into the
        // object-query shape the data hook understands.
        const datasetNames = [
          ...new Set(
            widgets
              .map((w) => w.dataset)
              .filter((d): d is string => typeof d === "string" && d.length > 0),
          ),
        ];
        const datasets = new Map<string, DatasetMeta>();
        await Promise.all(
          datasetNames.map(async (name) => {
            try {
              const ds = (await client.meta.getItem("dataset", name)) as
                | (DatasetMeta & { dataset?: DatasetMeta })
                | undefined;
              const resolved = ds?.dataset ?? ds;
              if (resolved?.object) datasets.set(name, resolved);
            } catch {
              // Dataset metadata unavailable — widget falls back to empty state.
            }
          }),
        );

        const meta: DashboardMeta = {
          ...raw,
          widgets: widgets.map((w) =>
            resolveDatasetWidget(w, w.dataset ? datasets.get(w.dataset) : undefined),
          ),
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
      <ScreenHeader title={displayName} />

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
