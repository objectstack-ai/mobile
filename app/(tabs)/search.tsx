import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { webContentMaxWidth } from "~/lib/responsive";
import { Search as SearchIcon, X, ChevronRight, FileText, SearchX, Clock } from "lucide-react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { tCount } from "~/lib/i18n";
import { Input } from "~/components/ui/Input";
import { EmptyState } from "~/components/ui/EmptyState";
import { useGlobalSearch } from "~/hooks/useGlobalSearch";
import { useSearchHistoryStore } from "~/stores/search-history-store";

export default function SearchScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { query, setQuery, groups, isSearching, hasSearched, totalCount, objectCount } =
    useGlobalSearch();
  const recentQueries = useSearchHistoryStore((s) => s.queries);
  const recordSearch = useSearchHistoryStore((s) => s.record);
  const removeSearch = useSearchHistoryStore((s) => s.remove);
  const clearSearches = useSearchHistoryStore((s) => s.clear);

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

      {/* Idle: recent searches if any, else the empty hint. */}
      {!showResults &&
        (recentQueries.length > 0 ? (
          <ScrollView
            className="flex-1"
            contentContainerClassName="px-5 pb-8 pt-4"
            contentContainerStyle={webContentMaxWidth}
            keyboardShouldPersistTaps="handled"
          >
            <View className="mb-2 flex-row items-center justify-between">
              <Text className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {t("search.recentTitle")}
              </Text>
              <TouchableOpacity
                onPress={clearSearches}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={t("search.recentClear")}
              >
                <Text className="text-xs font-medium text-primary">
                  {t("search.recentClear")}
                </Text>
              </TouchableOpacity>
            </View>
            <View className="overflow-hidden rounded-xl border border-border bg-card">
              {recentQueries.map((q, idx) => (
                <View
                  key={q}
                  className={`flex-row items-center px-4 py-3 ${
                    idx > 0 ? "border-t border-border/50" : ""
                  }`}
                >
                  <TouchableOpacity
                    className="flex-1 flex-row items-center"
                    onPress={() => {
                      void Haptics.selectionAsync();
                      setQuery(q);
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={q}
                  >
                    <Clock size={16} color="#94a3b8" />
                    <Text className="ml-3 flex-1 text-base text-foreground" numberOfLines={1}>
                      {q}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => removeSearch(q)}
                    hitSlop={8}
                    accessibilityLabel={t("search.recentClear")}
                  >
                    <X size={16} color="#94a3b8" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </ScrollView>
        ) : (
          <EmptyState
            icon={SearchIcon}
            title={t("search.emptyTitle")}
            description={
              objectCount > 0
                ? tCount("search.lookingAcross", objectCount)
                : t("search.emptyHint")
            }
          />
        ))}

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
        contentContainerStyle={webContentMaxWidth}
          keyboardShouldPersistTaps="handled"
        >
          <Text className="mb-3 text-xs font-medium text-muted-foreground">
            {tCount("search.resultCount", totalCount)}
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
                    onPress={() => {
                      // Tapping a result is a strong signal the query was
                      // useful — remember it for one-tap re-run.
                      recordSearch(query);
                      router.push(
                        `/(app)/${rec.appName}/${rec.objectName}/${rec.id}` as never,
                      );
                    }}
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
