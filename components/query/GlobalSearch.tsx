import React from "react";
import { View, TextInput } from "react-native";
import { Search } from "lucide-react-native";
import { cn } from "~/lib/utils";

export interface GlobalSearchProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  className?: string;
}

/**
 * Global full-text search input.
 * Designed to sit above list views for cross-field filtering.
 */
export function GlobalSearch({
  value,
  onChangeText,
  placeholder = "Search across all fields…",
  className,
}: GlobalSearchProps) {
  return (
    <View
      className={cn(
        "flex-row items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-3",
        className,
      )}
    >
      <Search size={18} color="#1e40af" />
      <TextInput
        className="h-11 flex-1 text-sm text-foreground placeholder:text-muted-foreground"
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#94a3b8"
        returnKeyType="search"
      />
    </View>
  );
}
