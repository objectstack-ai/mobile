import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  UserCircle,
  Bell,
  Globe,
  LogOut,
  ChevronRight,
  Workflow,
  Inbox,
} from "lucide-react-native";
import { useRouter } from "expo-router";
import { authClient } from "~/lib/auth-client";
import { useToast } from "~/components/ui/Toast";
import { useConfirm } from "~/components/ui/ConfirmDialog";

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
      className="flex-row items-center px-5 py-3.5 active:bg-muted"
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
  const { toastError } = useToast();
  const confirm = useConfirm();

  const performSignOut = async () => {
    try {
      await authClient.signOut();
      router.replace("/(auth)/sign-in");
    } catch {
      toastError("Failed to sign out. Please try again.");
    }
  };

  const handleSignOut = async () => {
    const ok = await confirm({
      title: "Sign Out",
      message: "Are you sure you want to sign out?",
      confirmLabel: "Sign Out",
      destructive: true,
    });
    if (ok) void performSignOut();
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top", "left", "right"]}>
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Profile Header */}
        <TouchableOpacity
          className="flex-row items-center px-5 py-5 border-b border-border/30"
          onPress={() => router.push("/account")}
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

        {/* Account */}
        <SectionHeader title="Account" />
        <MenuItem
          icon={<UserCircle size={20} color="#64748b" />}
          label="Account & Security"
          onPress={() => router.push("/account")}
        />
        <MenuItem
          icon={<Bell size={20} color="#64748b" />}
          label="Notifications"
          onPress={() => router.push("/(tabs)/notifications")}
        />

        {/* Automation */}
        <SectionHeader title="Automation" />
        <MenuItem
          icon={<Inbox size={20} color="#64748b" />}
          label="Approvals"
          onPress={() => router.push("/approvals")}
        />
        <MenuItem
          icon={<Workflow size={20} color="#64748b" />}
          label="Flows"
          onPress={() => router.push("/flows")}
        />

        {/* Preferences */}
        <SectionHeader title="Preferences" />
        <MenuItem
          icon={<Globe size={20} color="#64748b" />}
          label="Language"
          onPress={() => router.push("/language")}
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
