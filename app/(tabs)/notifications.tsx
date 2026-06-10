import React from "react";
import { View, Text, ScrollView, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Bell, CheckCheck, Circle } from "lucide-react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { cn } from "~/lib/utils";
import { EmptyState } from "~/components/ui/EmptyState";
import { ListSkeleton } from "~/components/ui/ListSkeleton";
import { useNotifications, type NotificationItem } from "~/hooks/useNotifications";

/* ------------------------------------------------------------------ */
/*  Notification Row                                                    */
/* ------------------------------------------------------------------ */

function NotificationRow({
  notification,
  onPress,
}: {
  notification: NotificationItem;
  onPress: (n: NotificationItem) => void;
}) {
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
          {new Date(notification.createdAt).toLocaleDateString()}
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
    markRead,
    markAllRead,
  } = useNotifications();
  const router = useRouter();
  const { t } = useTranslation();

  const handlePress = (n: NotificationItem) => {
    if (!n.read) {
      void markRead([n.id]);
    }
    // Deep link to the record/view if actionUrl is provided
    if (n.actionUrl) {
      router.push(n.actionUrl);
    }
  };

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

      {/* Empty state */}
      {!isLoading && notifications.length === 0 && (
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
        >
          {notifications.map((n) => (
            <NotificationRow key={n.id} notification={n} onPress={handlePress} />
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
