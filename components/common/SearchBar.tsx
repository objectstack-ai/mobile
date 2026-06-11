import React from "react";
import { Pressable, TextInput, View } from "react-native";
import { Search, X } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { cn } from "~/lib/utils";

export interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  debounceMs?: number;
  className?: string;
}

export function SearchBar({
  value,
  onChangeText,
  placeholder = "Search…",
  debounceMs = 300,
  className,
}: SearchBarProps) {
  const { t } = useTranslation();
  const [localValue, setLocalValue] = React.useState(value);
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync external value changes
  React.useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleChange = React.useCallback(
    (text: string) => {
      setLocalValue(text);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => onChangeText(text), debounceMs);
    },
    [onChangeText, debounceMs]
  );

  React.useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const handleClear = React.useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setLocalValue("");
    onChangeText("");
  }, [onChangeText]);

  return (
    <View
      className={cn(
        "flex-row items-center gap-2 rounded-xl border border-input bg-background px-3",
        className
      )}
    >
      <Search size={18} className="text-muted-foreground" />
      <TextInput
        className="h-12 flex-1 text-base text-foreground placeholder:text-muted-foreground"
        value={localValue}
        onChangeText={handleChange}
        placeholder={placeholder}
        placeholderTextColor="#94a3b8"
        returnKeyType="search"
        clearButtonMode="never"
        accessibilityLabel={placeholder}
      />
      {localValue.length > 0 ? (
        <Pressable
          onPress={handleClear}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={t("a11y.clearSearch")}
          className="rounded-full p-1 active:opacity-60"
        >
          <X size={16} className="text-muted-foreground" />
        </Pressable>
      ) : null}
    </View>
  );
}
