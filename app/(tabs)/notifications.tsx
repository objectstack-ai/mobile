import React from "react";
import { View, Text, ScrollView, Pressable, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Bell, CheckCheck, Circle } from "lucide-react-native";
import { useRouter } from "expo-router";
import { cn } from "~/lib/utils";
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
        "flex-row items-start gap-3 rounded-xl px-4 py-3",
        !notification.read && "bg-primary/5",
      )}
      onPress={() => onPress(notification)}
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
    <SafeAreaView className="flex-1 bg-background" edges={["left", "right"]}>
      {/* Header */}
      {notifications.length > 0 && unreadCount > 0 && (
        <View className="flex-row items-center justify-between border-b border-border px-5 py-3">
          <Text className="text-sm text-muted-foreground">
            {unreadCount} unread
          </Text>
          <Pressable
            className="flex-row items-center gap-1.5 rounded-lg px-3 py-1.5"
            onPress={() => void markAllRead()}
          >
            <CheckCheck size={14} color="#3b82f6" />
            <Text className="text-sm font-medium text-primary">Mark all read</Text>
          </Pressable>
        </View>
      )}

      {/* Loading */}
      {isLoading && notifications.length === 0 && (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#1e40af" />
        </View>
      )}

      {/* Empty state */}
      {!isLoading && notifications.length === 0 && (
        <ScrollView
          className="flex-1"
          contentContainerClassName="px-5 pb-8 pt-4"
        >
          <View className="flex-1 items-center justify-center pt-20">
            <View className="rounded-2xl bg-muted p-6">
              <Bell size={40} color="#94a3b8" />
            </View>
            <Text className="mt-5 text-lg font-semibold text-foreground">
              No Notifications
            </Text>
            <Text className="mt-2 text-center text-sm text-muted-foreground">
              You&apos;re all caught up. New notifications will appear here.
            </Text>
          </View>
        </ScrollView>
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
