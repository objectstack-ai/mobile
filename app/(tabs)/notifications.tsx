import React, { useMemo } from "react";
import { View, Text, ScrollView, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { webContentMaxWidth } from "~/lib/responsive";
import { Bell, CheckCheck, Circle, WifiOff } from "lucide-react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { cn } from "~/lib/utils";
import { dateGroup, relativeTime, type DateGroup } from "~/lib/relative-time";
import { EmptyState } from "~/components/ui/EmptyState";
import { ListSkeleton } from "~/components/ui/ListSkeleton";
import { useNotifications, type NotificationItem } from "~/hooks/useNotifications";

/** Localized compact relative-time label for a notification timestamp. */
function relLabel(createdAt: string, now: number, t: TFunction): string {
  const rel = relativeTime(new Date(createdAt).getTime(), now);
  switch (rel.kind) {
    case "justNow":
      return t("time.justNow");
    case "minutes":
      return t("time.minutesShort", { n: rel.n });
    case "hours":
      return t("time.hoursShort", { n: rel.n });
    case "yesterday":
      return t("time.yesterday");
    case "date":
      return new Date(rel.ts).toLocaleDateString();
  }
}

const GROUP_ORDER: DateGroup[] = ["today", "yesterday", "week", "earlier"];
const GROUP_LABEL_KEY: Record<DateGroup, string> = {
  today: "notifications.groupToday",
  yesterday: "notifications.groupYesterday",
  week: "notifications.groupThisWeek",
  earlier: "notifications.groupEarlier",
};

/* ------------------------------------------------------------------ */
/*  Notification Row                                                    */
/* ------------------------------------------------------------------ */

function NotificationRow({
  notification,
  now,
  onPress,
}: {
  notification: NotificationItem;
  now: number;
  onPress: (n: NotificationItem) => void;
}) {
  const { t } = useTranslation();
  return (
    <Pressable
      className={cn(
        "flex-row items-start gap-3 rounded-xl px-4 py-3 active:bg-muted",
        !notification.read && "bg-primary/5",
      )}
      onPress={() => onPress(notification)}
      accessibilityRole="button"
      accessibilityLabel={notification.title}
    >
      <View className="mt-1">
        {notification.read ? (
          <Circle size={8} color="#94a3b8" fill="#94a3b8" />
        ) : (
          <Circle size={8} color="#3b82f6" fill="#3b82f6" />
        )}
      </View>
      <View className="flex-1">
        <Text
          className={cn(
            "text-sm",
            notification.read
              ? "text-muted-foreground"
              : "font-semibold text-foreground",
          )}
        >
          {notification.title}
        </Text>
        <Text className="mt-0.5 text-xs text-muted-foreground" numberOfLines={2}>
          {notification.body}
        </Text>
        <Text className="mt-1 text-xs text-muted-foreground/60">
          {relLabel(notification.createdAt, now, t)}
        </Text>
      </View>
    </Pressable>
  );
}

/* ------------------------------------------------------------------ */
/*  Screen                                                              */
/* ------------------------------------------------------------------ */

export default function NotificationsScreen() {
  const {
    notifications,
    unreadCount,
    isLoading,
    error,
    markRead,
    markAllRead,
    refetch,
  } = useNotifications();
  const router = useRouter();
  const { t } = useTranslation();

  const handlePress = (n: NotificationItem) => {
    void Haptics.selectionAsync();
    if (!n.read) {
      void markRead([n.id]);
    }
    // Deep link to the record/view if actionUrl is provided
    if (n.actionUrl) {
      router.push(n.actionUrl);
    }
  };

  // Bucket notifications into Today / Yesterday / This Week / Earlier, keeping
  // the server's within-group order. `now` is read once per render.
  const now = Date.now();
  const sections = useMemo(() => {
    const buckets: Record<DateGroup, NotificationItem[]> = {
      today: [],
      yesterday: [],
      week: [],
      earlier: [],
    };
    for (const n of notifications) {
      buckets[dateGroup(new Date(n.createdAt).getTime(), now)].push(n);
    }
    return GROUP_ORDER.map((group) => ({ group, items: buckets[group] })).filter(
      (s) => s.items.length > 0,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notifications, now]);

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top", "left", "right"]}>
      {/* Title header */}
      <View className="flex-row items-end justify-between px-5 pb-2 pt-4">
        <View>
          <Text className="text-2xl font-bold text-foreground">{t("notifications.title")}</Text>
          {unreadCount > 0 && (
            <Text className="mt-1 text-sm text-muted-foreground">
              {t("notifications.unread", { count: unreadCount })}
            </Text>
          )}
        </View>
        {unreadCount > 0 && (
          <Pressable
            className="flex-row items-center gap-1.5 rounded-lg px-3 py-1.5 active:bg-muted"
            onPress={() => void markAllRead()}
            accessibilityRole="button"
            accessibilityLabel={t("notifications.markAllReadA11y")}
          >
            <CheckCheck size={14} color="#3b82f6" />
            <Text className="text-sm font-medium text-primary">{t("notifications.markAllRead")}</Text>
          </Pressable>
        )}
      </View>

      {/* Loading */}
      {isLoading && notifications.length === 0 && (
        <View className="px-5 pt-4">
          <ListSkeleton count={6} />
        </View>
      )}

      {/* Service-unavailable state — distinct from a genuinely empty inbox so a
          failed fetch (e.g. the notifications service isn't mounted) doesn't
          masquerade as "you're all caught up". */}
      {!isLoading && notifications.length === 0 && error && (
        <EmptyState
          icon={WifiOff}
          variant="error"
          title={t("notifications.unavailableTitle")}
          description={t("notifications.unavailableDesc")}
          actionLabel={t("common.retry")}
          onAction={() => void refetch()}
        />
      )}

      {/* Empty state — genuinely no notifications */}
      {!isLoading && notifications.length === 0 && !error && (
        <EmptyState
          icon={Bell}
          title={t("notifications.emptyTitle")}
          description={t("notifications.emptyDesc")}
        />
      )}

      {/* Notification list */}
      {notifications.length > 0 && (
        <ScrollView
          className="flex-1"
          contentContainerClassName="px-1 pb-8 pt-2"
        contentContainerStyle={webContentMaxWidth}
        >
          {sections.map(({ group, items }) => (
            <View key={group} className="mb-2">
              <Text className="px-4 pb-1 pt-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {t(GROUP_LABEL_KEY[group])}
              </Text>
              {items.map((n) => (
                <NotificationRow
                  key={n.id}
                  notification={n}
                  now={now}
                  onPress={handlePress}
                />
              ))}
            </View>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
