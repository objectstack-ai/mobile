import React, { useState } from "react";
import { View, Text, TextInput, Pressable, Modal } from "react-native";
import { X, Save } from "lucide-react-native";
import { cn } from "~/lib/utils";
import type { SaveViewInput } from "~/hooks/useViewStorage";

/* ------------------------------------------------------------------ */
/*  Props                                                               */
/* ------------------------------------------------------------------ */

export interface SaveViewDialogProps {
  visible: boolean;
  onClose: () => void;
  onSave: (input: SaveViewInput) => void | Promise<void>;
  /** Pre-populate for editing an existing view */
  initialValues?: Partial<SaveViewInput>;
  className?: string;
}

/* ------------------------------------------------------------------ */
/*  Component                                                           */
/* ------------------------------------------------------------------ */

export function SaveViewDialog({
  visible,
  onClose,
  onSave,
  initialValues,
}: SaveViewDialogProps) {
  const [name, setName] = useState(initialValues?.name ?? "");
  const [visibility, setVisibility] = useState<"private" | "shared">(
    initialValues?.visibility ?? "private",
  );
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) return;
    setIsSaving(true);
    try {
      await onSave({
        name: name.trim(),
        visibility,
        filters: initialValues?.filters,
        sort: initialValues?.sort,
        columns: initialValues?.columns,
      });
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 items-center justify-center bg-black/40 px-6">
        <View className="w-full max-w-sm rounded-2xl bg-card p-5 shadow-lg">
          {/* Header */}
          <View className="mb-4 flex-row items-center justify-between">
            <Text className="text-lg font-semibold text-foreground">Save View</Text>
            <Pressable onPress={onClose} className="rounded-full p-1">
              <X size={20} color="#64748b" />
            </Pressable>
          </View>

          {/* Name input */}
          <Text className="mb-1 text-xs font-medium text-muted-foreground">View Name</Text>
          <TextInput
            className="mb-4 rounded-xl border border-input bg-background px-4 py-3 text-base text-foreground"
            value={name}
            onChangeText={setName}
            placeholder="e.g. My Active Leads"
            placeholderTextColor="#94a3b8"
            autoFocus
          />

          {/* Visibility toggle */}
          <Text className="mb-2 text-xs font-medium text-muted-foreground">Visibility</Text>
          <View className="mb-5 flex-row gap-2">
            <Pressable
              onPress={() => setVisibility("private")}
              className={cn(
                "flex-1 rounded-xl border px-3 py-2.5 items-center",
                visibility === "private"
                  ? "border-primary bg-primary/10"
                  : "border-border bg-background",
              )}
            >
              <Text
                className={cn(
                  "text-sm font-medium",
                  visibility === "private" ? "text-primary" : "text-muted-foreground",
                )}
              >
                Private
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setVisibility("shared")}
              className={cn(
                "flex-1 rounded-xl border px-3 py-2.5 items-center",
                visibility === "shared"
                  ? "border-primary bg-primary/10"
                  : "border-border bg-background",
              )}
            >
              <Text
                className={cn(
                  "text-sm font-medium",
                  visibility === "shared" ? "text-primary" : "text-muted-foreground",
                )}
              >
                Shared
              </Text>
            </Pressable>
          </View>

          {/* Save button */}
          <Pressable
            onPress={handleSave}
            disabled={!name.trim() || isSaving}
            className={cn(
              "flex-row items-center justify-center rounded-xl bg-primary px-5 py-3",
              (!name.trim() || isSaving) && "opacity-50",
            )}
          >
            <Save size={16} color="#ffffff" />
            <Text className="ml-2 font-semibold text-primary-foreground">
              {isSaving ? "Saving…" : "Save View"}
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
