import React from "react";
import { TextInput, View } from "react-native";
import { Search } from "lucide-react-native";
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
      />
    </View>
  );
}
