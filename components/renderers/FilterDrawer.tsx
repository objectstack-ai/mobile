import React, { useCallback } from "react";
import { View, Text, Pressable, Modal } from "react-native";
import { Filter, X } from "lucide-react-native";
import { cn } from "~/lib/utils";
import { QueryBuilder } from "~/components/query";
import { useQueryBuilder } from "~/hooks/useQueryBuilder";
import type { FieldDefinition } from "~/components/renderers/types";

/* ------------------------------------------------------------------ */
/*  FilterDrawer Props                                                  */
/* ------------------------------------------------------------------ */

export interface FilterDrawerProps {
  /** Available field definitions for filtering */
  fields: FieldDefinition[];
  /** Whether the drawer is visible */
  visible: boolean;
  /** Called when the drawer should close */
  onClose: () => void;
  /** Called with the serialised filter when the user taps Apply */
  onApply: (filter: unknown) => void;
}

/* ------------------------------------------------------------------ */
/*  FilterDrawer                                                        */
/* ------------------------------------------------------------------ */

/**
 * Modal overlay that wraps the QueryBuilder, providing Apply / Clear
 * actions and a header with a close button.
 */
export function FilterDrawer({
  fields,
  visible,
  onClose,
  onApply,
}: FilterDrawerProps) {
  const {
    root,
    addFilter,
    updateFilter,
    removeFilter,
    toggleRootLogic,
    clearFilters,
    serialize,
    hasFilters: _hasFilters,
  } = useQueryBuilder();

  /* ---- Active filter count ---- */
  const filterCount = root.filters.length;

  /* ---- Handlers ---- */
  const handleApply = useCallback(() => {
    onApply(serialize());
    onClose();
  }, [onApply, onClose, serialize]);

  const handleClear = useCallback(() => {
    clearFilters();
    onApply(null);
    onClose();
  }, [clearFilters, onApply, onClose]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-end bg-black/40">
        <View className="max-h-[85%] rounded-t-2xl bg-background">
          {/* ---- Header ---- */}
          <View className="flex-row items-center justify-between border-b border-border px-4 py-3">
            <View className="flex-row items-center">
              <Filter size={18} color="#1e40af" />
              <Text className="ml-2 text-lg font-semibold text-foreground">
                Filters
              </Text>
              {filterCount > 0 && (
                <View className="ml-2 min-w-[20px] items-center rounded-full bg-primary px-1.5 py-0.5">
                  <Text className="text-[10px] font-bold text-primary-foreground">
                    {filterCount}
                  </Text>
                </View>
              )}
            </View>

            <Pressable
              onPress={onClose}
              className="rounded-lg p-1.5 active:bg-muted"
            >
              <X size={20} color="#64748b" />
            </Pressable>
          </View>

          {/* ---- Query builder ---- */}
          <View className="flex-1 px-4 py-4">
            <QueryBuilder
              root={root}
              fields={fields}
              onAddFilter={addFilter}
              onUpdateFilter={updateFilter}
              onRemoveFilter={removeFilter}
              onToggleLogic={toggleRootLogic}
              onClear={clearFilters}
            />
          </View>

          {/* ---- Footer actions ---- */}
          <View className="flex-row gap-3 border-t border-border px-4 py-4">
            <Pressable
              onPress={handleClear}
              className="flex-1 items-center rounded-xl border border-border bg-card py-3 active:bg-muted/50"
            >
              <Text className="text-sm font-semibold text-muted-foreground">
                Clear
              </Text>
            </Pressable>

            <Pressable
              onPress={handleApply}
              className="flex-1 items-center rounded-xl bg-primary py-3 active:bg-primary/80"
            >
              <Text className="text-sm font-semibold text-primary-foreground">
                Apply
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

/* ------------------------------------------------------------------ */
/*  FilterButton                                                        */
/* ------------------------------------------------------------------ */

export interface FilterButtonProps {
  /** Number of currently active filters */
  count?: number;
  /** Press handler (typically toggles the FilterDrawer) */
  onPress: () => void;
  className?: string;
}

/**
 * Compact filter icon button with an optional active-filter badge.
 */
export function FilterButton({ count = 0, onPress, className }: FilterButtonProps) {
  const isActive = count > 0;

  return (
    <Pressable
      onPress={onPress}
      className={cn(
        "relative flex-row items-center rounded-lg border px-3 py-2",
        isActive ? "border-primary bg-primary/10" : "border-border bg-card",
        className,
      )}
    >
      <Filter size={16} color={isActive ? "#1e40af" : "#64748b"} />
      <Text
        className={cn(
          "ml-1.5 text-xs font-medium",
          isActive ? "text-primary" : "text-muted-foreground",
        )}
      >
        Filter
      </Text>

      {isActive && (
        <View className="absolute -right-1.5 -top-1.5 min-w-[18px] items-center rounded-full bg-primary px-1 py-0.5">
          <Text className="text-[10px] font-bold text-primary-foreground">
            {count}
          </Text>
        </View>
      )}
    </Pressable>
  );
}
