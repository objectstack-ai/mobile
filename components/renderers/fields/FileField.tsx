import React, { useCallback, useState } from "react";
import { View, Text, Pressable, ActivityIndicator, Alert } from "react-native";
import {
  Camera,
  Upload,
  FileText,
  Image as ImageIcon,
  X,
  Download,
  Share2,
} from "lucide-react-native";
import { cn } from "~/lib/utils";
import type { FieldDefinition } from "../types";
import type { FileUploadResult } from "~/hooks/useFileUpload";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

export interface FileFieldProps {
  /** Field definition */
  field: FieldDefinition;
  /** Current value — may be a file ID, URL, or FileUploadResult */
  value: unknown;
  /** Change handler (emits FileUploadResult) */
  onChange?: (value: FileUploadResult | null) => void;
  /** Read-only mode */
  readonly?: boolean;
  /** Upload a file from the photo library */
  onPickImage?: () => Promise<FileUploadResult | null>;
  /** Upload a photo from the camera */
  onCapturePhoto?: () => Promise<FileUploadResult | null>;
  /** Upload an arbitrary document */
  onPickDocument?: () => Promise<FileUploadResult | null>;
  /** Download handler */
  onDownload?: (fileId: string, fileName: string) => void;
  /** Share handler */
  onShare?: (fileId: string, fileName: string) => void;
  /** Validation error */
  error?: string;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function resolveFileInfo(value: unknown): { id?: string; name?: string; url?: string } | null {
  if (!value) return null;
  if (typeof value === "string") return { id: value, name: value, url: undefined };
  if (typeof value === "object") {
    const v = value as Record<string, unknown>;
    return {
      id: (v.id ?? v.fileId ?? v.key) as string | undefined,
      name: (v.name ?? v.fileName) as string | undefined,
      url: (v.downloadUrl ?? v.url) as string | undefined,
    };
  }
  return null;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

/**
 * File attachment field for record forms.
 *
 * Shows upload buttons when editable, and file info with download/share
 * actions when read-only.
 */
export function FileField({
  field,
  value,
  onChange,
  readonly = false,
  onPickImage,
  onCapturePhoto,
  onPickDocument,
  onDownload,
  onShare,
  error,
}: FileFieldProps) {
  const [isUploading, setIsUploading] = useState(false);
  const fileInfo = resolveFileInfo(value);

  const handleUpload = useCallback(
    async (picker: (() => Promise<FileUploadResult | null>) | undefined) => {
      if (!picker) return;
      setIsUploading(true);
      try {
        const result = await picker();
        if (result) {
          onChange?.(result);
        }
      } catch {
        Alert.alert("Upload Failed", "Could not upload the file. Please try again.");
      } finally {
        setIsUploading(false);
      }
    },
    [onChange],
  );

  /* ---- Read-only ---- */
  if (readonly) {
    if (!fileInfo) {
      return (
        <Text className="text-base text-muted-foreground">—</Text>
      );
    }

    return (
      <View className="flex-row items-center gap-2 rounded-lg border border-border bg-card px-3 py-2">
        <FileText size={16} color="#64748b" />
        <Text className="flex-1 text-sm text-foreground" numberOfLines={1}>
          {fileInfo.name ?? fileInfo.id ?? "File"}
        </Text>
        {onDownload && fileInfo.id && (
          <Pressable onPress={() => onDownload(fileInfo.id!, fileInfo.name ?? "file")}>
            <Download size={16} color="#1e40af" />
          </Pressable>
        )}
        {onShare && fileInfo.id && (
          <Pressable onPress={() => onShare(fileInfo.id!, fileInfo.name ?? "file")}>
            <Share2 size={16} color="#1e40af" />
          </Pressable>
        )}
      </View>
    );
  }

  /* ---- Editable ---- */
  return (
    <View className="gap-2">
      {/* Current file */}
      {fileInfo && (
        <View className="flex-row items-center gap-2 rounded-lg border border-border bg-card px-3 py-2">
          <FileText size={16} color="#64748b" />
          <Text className="flex-1 text-sm text-foreground" numberOfLines={1}>
            {fileInfo.name ?? "Attached file"}
          </Text>
          <Pressable onPress={() => onChange?.(null)}>
            <X size={16} color="#ef4444" />
          </Pressable>
        </View>
      )}

      {/* Upload buttons */}
      {isUploading ? (
        <View className="items-center py-4">
          <ActivityIndicator size="small" color="#1e40af" />
          <Text className="mt-2 text-xs text-muted-foreground">Uploading…</Text>
        </View>
      ) : (
        <View className="flex-row flex-wrap gap-2">
          {(field.type === "image" || field.type === "file") && onPickImage && (
            <Pressable
              className="flex-row items-center gap-1.5 rounded-lg border border-border px-3 py-2 active:bg-muted/50"
              onPress={() => handleUpload(onPickImage)}
            >
              <ImageIcon size={14} color="#64748b" />
              <Text className="text-xs font-medium text-foreground">Gallery</Text>
            </Pressable>
          )}
          {(field.type === "image" || field.type === "file") && onCapturePhoto && (
            <Pressable
              className="flex-row items-center gap-1.5 rounded-lg border border-border px-3 py-2 active:bg-muted/50"
              onPress={() => handleUpload(onCapturePhoto)}
            >
              <Camera size={14} color="#64748b" />
              <Text className="text-xs font-medium text-foreground">Camera</Text>
            </Pressable>
          )}
          {onPickDocument && (
            <Pressable
              className="flex-row items-center gap-1.5 rounded-lg border border-border px-3 py-2 active:bg-muted/50"
              onPress={() => handleUpload(onPickDocument)}
            >
              <Upload size={14} color="#64748b" />
              <Text className="text-xs font-medium text-foreground">File</Text>
            </Pressable>
          )}
        </View>
      )}

      {/* Error */}
      {error && <Text className="text-xs text-destructive">{error}</Text>}
    </View>
  );
}
