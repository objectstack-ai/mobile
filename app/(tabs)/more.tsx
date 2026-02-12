import { View, Text, ScrollView, TouchableOpacity, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  UserCircle,
  Settings,
  HelpCircle,
  Shield,
  Bell,
  Globe,
  Palette,
  Info,
  LogOut,
  ChevronRight,
} from "lucide-react-native";
import { useRouter } from "expo-router";
import { authClient } from "~/lib/auth-client";

interface MenuItemProps {
  icon: React.ReactNode;
  label: string;
  onPress?: () => void;
  showChevron?: boolean;
  destructive?: boolean;
}

function MenuItem({ icon, label, onPress, showChevron = true, destructive = false }: MenuItemProps) {
  return (
    <TouchableOpacity
      className="flex-row items-center px-5 py-3.5"
      onPress={onPress}
      accessibilityLabel={label}
      accessibilityRole="button"
    >
      <View className="mr-3">{icon}</View>
      <Text
        className={`flex-1 text-base ${
          destructive ? "text-red-600" : "text-foreground"
        }`}
      >
        {label}
      </Text>
      {showChevron && <ChevronRight size={18} color="#94a3b8" />}
    </TouchableOpacity>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <Text className="px-5 pb-2 pt-5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
      {title}
    </Text>
  );
}

export default function MoreScreen() {
  const { data: session } = authClient.useSession();
  const router = useRouter();

  const handleSignOut = async () => {
    try {
      await authClient.signOut();
      router.replace("/(auth)/sign-in");
    } catch {
      Alert.alert("Error", "Failed to sign out. Please try again.");
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["left", "right"]}>
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Profile Header */}
        <TouchableOpacity
          className="flex-row items-center px-5 py-5 border-b border-border/30"
          onPress={() => router.push("/(tabs)/profile")}
          accessibilityLabel="View profile"
          accessibilityRole="button"
        >
          <View className="rounded-full bg-muted p-3">
            <UserCircle size={32} color="#94a3b8" />
          </View>
          <View className="ml-3 flex-1">
            <Text className="text-lg font-bold text-foreground">
              {session?.user.name ?? "User"}
            </Text>
            <Text className="text-sm text-muted-foreground">
              {session?.user.email ?? "View profile"}
            </Text>
          </View>
          <ChevronRight size={18} color="#94a3b8" />
        </TouchableOpacity>

        {/* Preferences */}
        <SectionHeader title="Preferences" />
        <MenuItem
          icon={<Palette size={20} color="#64748b" />}
          label="Appearance"
        />
        <MenuItem
          icon={<Globe size={20} color="#64748b" />}
          label="Language"
        />
        <MenuItem
          icon={<Bell size={20} color="#64748b" />}
          label="Notifications"
        />

        {/* Security */}
        <SectionHeader title="Security" />
        <MenuItem
          icon={<Shield size={20} color="#64748b" />}
          label="Security & Privacy"
        />
        <MenuItem
          icon={<Settings size={20} color="#64748b" />}
          label="Settings"
        />

        {/* Support */}
        <SectionHeader title="Support" />
        <MenuItem
          icon={<HelpCircle size={20} color="#64748b" />}
          label="Help & Support"
        />
        <MenuItem
          icon={<Info size={20} color="#64748b" />}
          label="About"
        />

        {/* Sign Out */}
        <View className="mt-4 border-t border-border/30">
          <MenuItem
            icon={<LogOut size={20} color="#dc2626" />}
            label="Sign Out"
            onPress={handleSignOut}
            showChevron={false}
            destructive
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
