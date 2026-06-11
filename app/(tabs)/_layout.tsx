import { Tabs } from "expo-router";
import { useTranslation } from "react-i18next";
import { useColorScheme } from "nativewind";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Home,
  Search,
  LayoutGrid,
  Bell,
  MoreHorizontal,
} from "lucide-react-native";

export default function TabLayout() {
  const { t } = useTranslation();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const insets = useSafeAreaInsets();
  // Without a bottom safe-area inset (web, or a device with no home indicator)
  // the labels sit flush against the bottom edge and get clipped. Reserve a
  // floor of bottom padding so the descenders always clear the edge.
  const bottomPad = Math.max(insets.bottom, 12);
  return (
    <Tabs
      screenOptions={{
        // The native tab header does not render on React Native Web and would
        // double up with each screen's in-body title on native. Every tab
        // screen renders its own large title instead (iOS-style root header).
        headerShown: false,
        // Theme-aware: the tab bar's hardcoded white background stayed light in
        // dark mode, leaving a glaring white bar under a dark app.
        tabBarActiveTintColor: isDark ? "#60a5fa" : "#1e40af",
        tabBarInactiveTintColor: isDark ? "#64748b" : "#94a3b8",
        tabBarStyle: {
          borderTopColor: isDark ? "#1e293b" : "#e2e8f0",
          backgroundColor: isDark ? "#0b1120" : "#ffffff",
          height: 56 + bottomPad,
          paddingBottom: bottomPad,
          paddingTop: 6,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
          lineHeight: 14,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t("nav.home"),
          tabBarIcon: ({ color, size }) => <Home size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: t("nav.search"),
          tabBarIcon: ({ color, size }) => (
            <Search size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="apps"
        options={{
          title: t("nav.apps"),
          tabBarIcon: ({ color, size }) => (
            <LayoutGrid size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: t("nav.notifications"),
          tabBarIcon: ({ color, size }) => <Bell size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: t("nav.more"),
          tabBarIcon: ({ color, size }) => (
            <MoreHorizontal size={size} color={color} />
          ),
        }}
      />
      {/* Keep profile route but hide from tab bar (accessible via More) */}
      <Tabs.Screen
        name="profile"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}
