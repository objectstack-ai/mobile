import React from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { cn } from "~/lib/utils";

export interface TabsProps {
  value: string;
  onValueChange: (value: string) => void;
  children: React.ReactNode;
  className?: string;
}

export interface TabItemProps {
  value: string;
  label: string;
  children?: React.ReactNode;
}

interface TabsContextValue {
  value: string;
  onValueChange: (value: string) => void;
}

const TabsContext = React.createContext<TabsContextValue | null>(null);

export function Tabs({
  value,
  onValueChange,
  children,
  className,
}: TabsProps) {
  const items = React.Children.toArray(children).filter(
    (child): child is React.ReactElement<TabItemProps> =>
      React.isValidElement(child)
  );

  return (
    <TabsContext.Provider value={{ value, onValueChange }}>
      <View className={cn("gap-3", className)}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="border-b border-border"
          contentContainerClassName="gap-2 px-1"
        >
          {items.map((item) => {
            const isActive = item.props.value === value;
            return (
              <Pressable
                key={item.props.value}
                onPress={() => onValueChange(item.props.value)}
                className={cn(
                  "px-3 pb-2",
                  isActive && "border-b-2 border-primary"
                )}
              >
                <Text
                  className={cn(
                    "text-sm font-medium",
                    isActive
                      ? "text-foreground"
                      : "text-muted-foreground"
                  )}
                >
                  {item.props.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {items.map((item) =>
          item.props.value === value ? (
            <View key={item.props.value}>{item.props.children}</View>
          ) : null
        )}
      </View>
    </TabsContext.Provider>
  );
}

export function TabItem(_props: TabItemProps) {
  // Rendered by Tabs parent; this is a config-only component.
  return null;
}
