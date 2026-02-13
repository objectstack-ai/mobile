import { View, Text, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Search as SearchIcon, Clock, X } from "lucide-react-native";
import { Input } from "~/components/ui/Input";
import { useState, useCallback } from "react";

export default function SearchScreen() {
  const [query, setQuery] = useState("");
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  const clearRecent = useCallback(() => {
    setRecentSearches([]);
  }, []);

  const removeRecent = useCallback((term: string) => {
    setRecentSearches((prev) => prev.filter((s) => s !== term));
  }, []);

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["left", "right"]}>
      <View className="px-5 pt-4">
        <View className="flex-row items-center rounded-xl bg-muted px-4 py-3">
          <SearchIcon size={20} color="#94a3b8" />
          <Input
            className="ml-2 flex-1 border-0 bg-transparent p-0 text-base"
            placeholder="Search objects, records..."
            value={query}
            onChangeText={setQuery}
            accessibilityLabel="Global search input"
            autoFocus
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery("")} accessibilityLabel="Clear search">
              <X size={18} color="#94a3b8" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {query.length === 0 && recentSearches.length > 0 && (
        <View className="px-5 pt-6">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-sm font-semibold text-muted-foreground">
              Recent Searches
            </Text>
            <TouchableOpacity onPress={clearRecent}>
              <Text className="text-xs text-primary">Clear All</Text>
            </TouchableOpacity>
          </View>
          {recentSearches.map((term) => (
            <View key={term} className="flex-row items-center py-2.5">
              <Clock size={16} color="#94a3b8" />
              <Text className="ml-3 flex-1 text-base text-foreground">{term}</Text>
              <TouchableOpacity onPress={() => removeRecent(term)}>
                <X size={16} color="#94a3b8" />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {query.length === 0 && recentSearches.length === 0 && (
        <View className="flex-1 items-center justify-center px-10">
          <SearchIcon size={48} color="#cbd5e1" />
          <Text className="mt-4 text-center text-base font-medium text-muted-foreground">
            Search across all your objects and records
          </Text>
          <Text className="mt-2 text-center text-sm text-muted-foreground">
            Type to start searching
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
}
