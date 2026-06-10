import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { webContentMaxWidth } from "~/lib/responsive";
import {
  UserCircle,
  Bell,
  Globe,
  LogOut,
  ChevronRight,
  Workflow,
  Inbox,
  Sparkles,
} from "lucide-react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();
  const { toastError } = useToast();
  const confirm = useConfirm();

  const performSignOut = async () => {
    try {
      await authClient.signOut();
      router.replace("/(auth)/sign-in");
    } catch {
      toastError(t("more.signOutFailed"));
    }
  };

  const handleSignOut = async () => {
    const ok = await confirm({
      title: t("more.signOutTitle"),
      message: t("more.signOutConfirm"),
      confirmLabel: t("more.signOutTitle"),
      destructive: true,
    });
    if (ok) void performSignOut();
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top", "left", "right"]}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={webContentMaxWidth}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Header */}
        <TouchableOpacity
          className="flex-row items-center px-5 py-5 border-b border-border/30"
          onPress={() => router.push("/account")}
          accessibilityLabel={t("more.viewProfile")}
          accessibilityRole="button"
        >
          <View className="rounded-full bg-muted p-3">
            <UserCircle size={32} color="#94a3b8" />
          </View>
          <View className="ml-3 flex-1">
            <Text className="text-lg font-bold text-foreground">
              {session?.user.name ?? t("more.profileFallbackName")}
            </Text>
            <Text className="text-sm text-muted-foreground">
              {session?.user.email ?? t("more.viewProfile")}
            </Text>
          </View>
          <ChevronRight size={18} color="#94a3b8" />
        </TouchableOpacity>

        {/* Account */}
        <SectionHeader title={t("more.sectionAccount")} />
        <MenuItem
          icon={<UserCircle size={20} color="#64748b" />}
          label={t("more.accountSecurity")}
          onPress={() => router.push("/account")}
        />
        <MenuItem
          icon={<Bell size={20} color="#64748b" />}
          label={t("more.notifications")}
          onPress={() => router.push("/(tabs)/notifications")}
        />

        {/* Assistant */}
        <SectionHeader title={t("more.sectionAssistant")} />
        <MenuItem
          icon={<Sparkles size={20} color="#64748b" />}
          label={t("more.aiAssistant")}
          onPress={() => router.push("/ai")}
        />

        {/* Automation */}
        <SectionHeader title={t("more.sectionAutomation")} />
        <MenuItem
          icon={<Inbox size={20} color="#64748b" />}
          label={t("more.approvals")}
          onPress={() => router.push("/approvals")}
        />
        <MenuItem
          icon={<Workflow size={20} color="#64748b" />}
          label={t("more.flows")}
          onPress={() => router.push("/flows")}
        />

        {/* Preferences */}
        <SectionHeader title={t("more.sectionPreferences")} />
        <MenuItem
          icon={<Globe size={20} color="#64748b" />}
          label={t("more.language")}
          onPress={() => router.push("/language")}
        />

        {/* Sign Out */}
        <View className="mt-4 border-t border-border/30">
          <MenuItem
            icon={<LogOut size={20} color="#dc2626" />}
            label={t("more.signOut")}
            onPress={handleSignOut}
            showChevron={false}
            destructive
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
