import { View, Text, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { webContentMaxWidth } from "~/lib/responsive";
import { UserCircle } from "lucide-react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Button } from "~/components/ui/Button";
import { authClient } from "~/lib/auth-client";
import { useToast } from "~/components/ui/Toast";
import { useConfirm } from "~/components/ui/ConfirmDialog";

export default function ProfileScreen() {
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
    <SafeAreaView className="flex-1 bg-background" edges={["left", "right"]}>
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-5 pb-8 pt-4"
        contentContainerStyle={webContentMaxWidth}
      >
        <View className="items-center pt-10">
          <View className="rounded-full bg-muted p-5">
            <UserCircle size={56} color="#94a3b8" />
          </View>
          <Text className="mt-4 text-xl font-bold text-foreground">
            {session?.user.name ?? t("more.profileFallback")}
          </Text>
          <Text className="mt-1 text-sm text-muted-foreground">
            {session?.user.email ?? ""}
          </Text>
        </View>

        <View className="mt-8 gap-3">
          <Button variant="outline">{t("more.editProfile")}</Button>
          <Button variant="outline">{t("more.settings")}</Button>
          <Button variant="ghost">{t("more.helpSupport")}</Button>
          <Button variant="destructive" onPress={handleSignOut}>
            {t("more.signOut")}
          </Button>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
