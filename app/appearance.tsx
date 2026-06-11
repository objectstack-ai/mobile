import { ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { ScreenHeader } from "~/components/common/ScreenHeader";
import { ThemeSelector } from "~/components/common/ThemeSelector";

/**
 * Appearance — switch the app's color scheme (light / dark / system). Backed by
 * `useUIStore.setTheme` → NativeWind, applied live across every screen.
 */
export default function AppearanceScreen() {
  const { t } = useTranslation();
  return (
    <SafeAreaView className="flex-1 bg-background" edges={["left", "right"]}>
      <ScreenHeader title={t("appearance.title")} />
      <ScrollView className="flex-1" contentContainerClassName="px-5 pt-4">
        <ThemeSelector />
      </ScrollView>
    </SafeAreaView>
  );
}
