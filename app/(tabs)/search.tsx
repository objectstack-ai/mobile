import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Search as SearchIcon, X, ChevronRight, FileText, SearchX } from "lucide-react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Input } from "~/components/ui/Input";
import { EmptyState } from "~/components/ui/EmptyState";
import { useGlobalSearch } from "~/hooks/useGlobalSearch";

export default function SearchScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { query, setQuery, groups, isSearching, hasSearched, totalCount, objectCount } =
    useGlobalSearch();

  const showResults = query.trim().length > 0;

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top", "left", "right"]}>
      <View className="px-5 pt-4">
        <Text className="mb-3 text-2xl font-bold text-foreground">{t("search.title")}</Text>
        <View className="flex-row items-center rounded-xl bg-muted px-4 py-3">
          <SearchIcon size={20} color="#94a3b8" />
          <Input
            className="ml-2 flex-1 border-0 bg-transparent p-0 text-base"
            placeholder={t("search.placeholder")}
            value={query}
            onChangeText={setQuery}
            accessibilityLabel={t("search.inputLabel")}
            autoFocus
            autoCapitalize="none"
            autoCorrect={false}
          />
          {isSearching ? (
            <ActivityIndicator size="small" color="#94a3b8" />
          ) : query.length > 0 ? (
            <TouchableOpacity onPress={() => setQuery("")} accessibilityLabel={t("search.clearLabel")}>
              <X size={18} color="#94a3b8" />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* Idle empty state */}
      {!showResults && (
        <EmptyState
          icon={SearchIcon}
          title={t("search.emptyTitle")}
          description={
            objectCount > 0
              ? t("search.lookingAcross", { count: objectCount })
              : t("search.emptyHint")
          }
        />
      )}

      {/* No matches */}
      {showResults && !isSearching && hasSearched && totalCount === 0 && (
        <EmptyState
          icon={SearchX}
          title={t("search.noResultsTitle")}
          description={t("search.noResultsBody", { query: query.trim() })}
        />
      )}

      {/* Results */}
      {showResults && totalCount > 0 && (
        <ScrollView
          className="flex-1"
          contentContainerClassName="px-5 pb-8 pt-4"
          keyboardShouldPersistTaps="handled"
        >
          <Text className="mb-3 text-xs font-medium text-muted-foreground">
            {t("search.resultCount", { count: totalCount })}
          </Text>
          {groups.map((group) => (
            <View key={`${group.appName}:${group.objectName}`} className="mb-5">
              <Text className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {group.objectLabel}
              </Text>
              <View className="overflow-hidden rounded-xl border border-border bg-card">
                {group.records.map((rec, idx) => (
                  <TouchableOpacity
                    key={`${rec.objectName}:${rec.id}`}
                    className={`flex-row items-center px-4 py-3 ${
                      idx > 0 ? "border-t border-border/50" : ""
                    }`}
                    onPress={() =>
                      router.push(
                        `/(app)/${rec.appName}/${rec.objectName}/${rec.id}` as never,
                      )
                    }
                    accessibilityRole="button"
                    accessibilityLabel={t("search.openLabel", { title: rec.title })}
                  >
                    <View className="mr-3 rounded-lg bg-primary/10 p-2">
                      <FileText size={16} color="#1e40af" />
                    </View>
                    <View className="flex-1">
                      <Text className="text-base text-foreground" numberOfLines={1}>
                        {rec.title}
                      </Text>
                      {rec.subtitle ? (
                        <Text
                          className="mt-0.5 text-sm text-muted-foreground"
                          numberOfLines={1}
                        >
                          {rec.subtitle}
                        </Text>
                      ) : null}
                    </View>
                    <ChevronRight size={18} color="#94a3b8" />
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
