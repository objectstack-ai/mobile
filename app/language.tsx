import { ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { ScreenHeader } from "~/components/common/ScreenHeader";
import { LanguageSelector } from "~/components/common/LanguageSelector";

/**
 * Language — switch the app's display language. Backed by `useUIStore`
 * (`setLanguage` → i18next), so the change applies live across every screen.
 */
export default function LanguageScreen() {
  const { t } = useTranslation();
  return (
    <SafeAreaView className="flex-1 bg-background" edges={["left", "right"]}>
      <ScreenHeader title={t("common.language")} />
      <ScrollView className="flex-1" contentContainerClassName="px-5 pt-4">
        <LanguageSelector />
      </ScrollView>
    </SafeAreaView>
  );
}
