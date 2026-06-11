import { View, Text, ScrollView, Pressable, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useColorScheme } from "nativewind";
import { webContentMaxWidth } from "~/lib/responsive";
import {
  LayoutDashboard,
  ChevronRight,
  Inbox,
  AlertCircle,
  Sparkles,
  Plus,
  Clock,
} from "lucide-react-native";
import { useClient } from "@objectstack/client-react";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useCallback, useEffect, useState } from "react";
import { authClient } from "~/lib/auth-client";
import { PressableCard } from "~/components/ui/PressableCard";
import { EmptyState } from "~/components/ui/EmptyState";
import { ListSkeleton } from "~/components/ui/ListSkeleton";
import { QuickCreateSheet } from "~/components/home/QuickCreateSheet";
import { useApps } from "~/hooks/useApps";
import { useRecentStore } from "~/stores/recent-store";

/** Pick a time-of-day greeting i18n key from the local hour. */
function greetingKey(hour: number): "greetingMorning" | "greetingAfternoon" | "greetingEvening" {
  if (hour < 12) return "greetingMorning";
  if (hour < 18) return "greetingAfternoon";
  return "greetingEvening";
}

interface DashboardEntry {
  /** App name — the route segment dashboards open under. */
  appId: string;
  appLabel: string;
  name: string;
  label: string;
  description?: string;
}

/**
 * Home surfaces the real dashboards published by every installed app, fetched
 * from `meta.getItems("dashboard", { packageId })`. Tapping a card opens the
 * live dashboard route, whose widgets query real records. (Previously this
 * screen rendered hardcoded sample metrics.)
 */
export default function HomeScreen() {
  const client = useClient();
  const router = useRouter();
  const { t } = useTranslation();
  const { colorScheme } = useColorScheme();
  const accent = colorScheme === "dark" ? "#60a5fa" : "#1e40af";
  const { data: session } = authClient.useSession();
  const { apps, isLoading: appsLoading, refetch: refetchApps } = useApps();
  const recents = useRecentStore((s) => s.records);
  const clearRecents = useRecentStore((s) => s.clear);
  const [quickCreateOpen, setQuickCreateOpen] = useState(false);

  const firstName = (session?.user?.name ?? "").trim().split(/\s+/)[0];
  const greeting = t(`home.${greetingKey(new Date().getHours())}`);
  const heading = firstName ? `${greeting}, ${firstName}` : greeting;

  const [dashboards, setDashboards] = useState<DashboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchDashboards = useCallback(async () => {
    if (appsLoading) return;
    if (apps.length === 0) {
      setDashboards([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const perApp = await Promise.all(
        apps.map(async (app) => {
          try {
            const result = await client.meta.getItems("dashboard", {
              packageId: app.packageId,
            });
            const items = Array.isArray(result?.items) ? result.items : [];
            return items.map((rawItem: unknown) => {
              const item = rawItem as Record<string, unknown>;
              const name = item.name as string;
              return {
                appId: app.name,
                appLabel: app.label,
                name,
                label: (item.label ?? name) as string,
                description: item.description as string | undefined,
              } satisfies DashboardEntry;
            });
          } catch {
            return [] as DashboardEntry[];
          }
        }),
      );
      setDashboards(perApp.flat());
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to load dashboards"));
    } finally {
      setIsLoading(false);
    }
  }, [client, apps, appsLoading]);

  useEffect(() => {
    void fetchDashboards();
  }, [fetchDashboards]);

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await Promise.all([refetchApps(), fetchDashboards()]);
    setIsRefreshing(false);
  }, [refetchApps, fetchDashboards]);

  // Only the initial load shows the full-screen spinner; pull-to-refresh keeps
  // the existing content in place behind the refresh indicator.
  const loading = (appsLoading || isLoading) && !isRefreshing;

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top", "left", "right"]}>
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-5 pb-8 pt-4"
        contentContainerStyle={webContentMaxWidth}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={accent} />
        }
      >
        <View className="mb-5 flex-row items-start justify-between">
          <View className="flex-1 pr-3">
            <Text className="text-2xl font-bold text-foreground">{heading}</Text>
            <Text className="mt-1 text-sm text-muted-foreground">
              {t("home.subtitle")}
            </Text>
          </View>
          {/* Global quick-create — pick any object and open its blank form. */}
          <Pressable
            className="h-11 w-11 items-center justify-center rounded-full bg-primary active:opacity-80"
            onPress={() => setQuickCreateOpen(true)}
            accessibilityRole="button"
            accessibilityLabel={t("home.quickCreate")}
          >
            <Plus size={24} color="#ffffff" />
          </Pressable>
        </View>

        {/* AI Assistant quick entry — surfaces the assistant on the home screen
            instead of burying it two levels deep under More. */}
        <PressableCard
          className="mb-5 flex-row items-center p-4"
          onPress={() => router.push("/ai")}
          accessibilityRole="button"
          accessibilityLabel={t("home.assistantTitle")}
        >
          <View className="rounded-xl bg-primary/10 p-3">
            <Sparkles size={24} color={accent} />
          </View>
          <View className="ml-4 flex-1">
            <Text className="text-base font-semibold text-card-foreground">
              {t("home.assistantTitle")}
            </Text>
            <Text className="mt-0.5 text-sm text-muted-foreground">
              {t("home.assistantSubtitle")}
            </Text>
          </View>
          <ChevronRight size={20} color="#94a3b8" />
        </PressableCard>

        {/* Recently viewed records — quick re-entry to what you were working on. */}
        {recents.length > 0 && (
          <View className="mb-5">
            <View className="mb-2 flex-row items-center justify-between">
              <Text className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {t("home.recentTitle")}
              </Text>
              <Pressable
                onPress={clearRecents}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={t("home.recentClear")}
              >
                <Text className="text-xs font-medium text-primary">
                  {t("home.recentClear")}
                </Text>
              </Pressable>
            </View>
            <View className="gap-2">
              {recents.slice(0, 5).map((r) => (
                <PressableCard
                  key={`${r.appId}/${r.object}/${r.recordId}`}
                  className="flex-row items-center p-3.5"
                  onPress={() =>
                    // Dynamic route — cast, matching the other record links.
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    router.push(`/(app)/${r.appId}/${r.object}/${r.recordId}` as any)
                  }
                  accessibilityRole="button"
                  accessibilityLabel={r.title}
                >
                  <View className="rounded-xl bg-primary/10 p-2.5">
                    <Clock size={18} color={accent} />
                  </View>
                  <View className="ml-3 flex-1">
                    <Text
                      className="text-base font-medium text-card-foreground"
                      numberOfLines={1}
                    >
                      {r.title}
                    </Text>
                    {r.subtitle ? (
                      <Text className="text-xs text-muted-foreground" numberOfLines={1}>
                        {r.subtitle}
                      </Text>
                    ) : null}
                  </View>
                  <ChevronRight size={18} color="#94a3b8" />
                </PressableCard>
              ))}
            </View>
          </View>
        )}

        {loading ? (
          <ListSkeleton count={4} />
        ) : error ? (
          <View className="pt-16">
            <EmptyState
              icon={AlertCircle}
              variant="error"
              title={t("home.loadErrorTitle")}
              description={error.message}
              actionLabel={t("common.retry")}
              onAction={() => void fetchDashboards()}
            />
          </View>
        ) : dashboards.length === 0 ? (
          <View className="pt-16">
            <EmptyState
              icon={Inbox}
              title={t("home.noDashboardsTitle")}
              description={t("home.noDashboardsDesc")}
            />
          </View>
        ) : (
          <View className="gap-3">
            <Text className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t("home.dashboardsTitle")}
            </Text>
            {dashboards.map((d) => (
              <PressableCard
                key={`${d.appId}:${d.name}`}
                className="flex-row items-center p-4"
                onPress={() =>
                  router.push(`/(app)/${d.appId}/dashboard/${d.name}`)
                }
                accessibilityRole="button"
                accessibilityLabel={`Open ${d.label} dashboard`}
              >
                <View className="rounded-xl bg-primary/10 p-3">
                  <LayoutDashboard size={24} color={accent} />
                </View>
                <View className="ml-4 flex-1">
                  <Text className="text-base font-semibold text-card-foreground">
                    {d.label}
                  </Text>
                  <Text className="mt-0.5 text-xs font-medium text-muted-foreground">
                    {d.appLabel}
                  </Text>
                  {d.description ? (
                    <Text
                      className="mt-1 text-sm text-muted-foreground"
                      numberOfLines={2}
                    >
                      {d.description}
                    </Text>
                  ) : null}
                </View>
                <ChevronRight size={20} color="#94a3b8" />
              </PressableCard>
            ))}
          </View>
        )}
      </ScrollView>

      <QuickCreateSheet
        open={quickCreateOpen}
        onOpenChange={setQuickCreateOpen}
        apps={apps}
      />
    </SafeAreaView>
  );
}
