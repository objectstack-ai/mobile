import React from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { ChevronDown, Check } from "lucide-react-native";
import { cn } from "~/lib/utils";

export interface SelectOption {
  label: string;
  value: string;
}

export interface SelectProps {
  value: string;
  onValueChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  className?: string;
}

export function Select({
  value,
  onValueChange,
  options,
  placeholder = "Select…",
  className,
}: SelectProps) {
  const [open, setOpen] = React.useState(false);
  const selectedLabel = options.find((o) => o.value === value)?.label;

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        className={cn(
          "h-12 flex-row items-center justify-between rounded-xl border border-input bg-background px-4",
          className
        )}
      >
        <Text
          className={cn(
            "text-base",
            selectedLabel ? "text-foreground" : "text-muted-foreground"
          )}
        >
          {selectedLabel ?? placeholder}
        </Text>
        <ChevronDown size={16} className="text-muted-foreground" />
      </Pressable>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable
          className="flex-1 items-center justify-center bg-black/50"
          onPress={() => setOpen(false)}
        >
          <View className="w-4/5 max-h-80 rounded-2xl border border-border bg-background p-2">
            <ScrollView>
              {options.map((option) => (
                <Pressable
                  key={option.value}
                  onPress={() => {
                    onValueChange(option.value);
                    setOpen(false);
                  }}
                  className="flex-row items-center justify-between rounded-lg px-3 py-3 active:bg-accent"
                >
                  <Text className="text-base text-foreground">
                    {option.label}
                  </Text>
                  {option.value === value && (
                    <Check size={16} className="text-primary" />
                  )}
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}
